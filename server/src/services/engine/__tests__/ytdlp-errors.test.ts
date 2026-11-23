import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../config/logger.js';
import { runGuarded } from '../process.js';
import { downloadStreams, probeUrl } from '../ytdlp.js';

vi.mock('../process.js', () => ({ runGuarded: vi.fn() }));

const guarded = vi.mocked(runGuarded);
const publicUrl = 'https://www.youtube.com/watch?v=abcdefghijk';

beforeEach(() => {
  guarded.mockReset();
});

function failWith(stderr: string): void {
  guarded.mockResolvedValue({ code: 1, stdout: '', stderr });
}

describe('yt-dlp failure classification', () => {
  it.each([
    [
      'a YouTube bot check',
      'ERROR: [youtube] abcdefghijk: Sign in to confirm you’re not a bot. Use --cookies for authentication.',
      'SOURCE_UNAVAILABLE',
      /bot|verification/i,
    ],
    [
      'an explicit private video',
      'ERROR: [youtube] abcdefghijk: Private video. Sign in if you have been granted access.',
      'PRIVATE_CONTENT',
      /private/i,
    ],
    [
      'an explicit private-content sentence',
      'ERROR: [youtube] abcdefghijk: This video is private.',
      'PRIVATE_CONTENT',
      /private/i,
    ],
    [
      'a generic sign-in requirement',
      'ERROR: [youtube] abcdefghijk: LOGIN_REQUIRED. Sign in to continue.',
      'SOURCE_UNAVAILABLE',
      /sign in/i,
    ],
    [
      'an age restriction',
      'ERROR: [youtube] abcdefghijk: Sign in to confirm your age.',
      'CONTENT_UNAVAILABLE',
      /restricted/i,
    ],
    [
      'a rate limit',
      'ERROR: [youtube] abcdefghijk: HTTP Error 429: Too Many Requests',
      'SOURCE_UNAVAILABLE',
      /rate limit/i,
    ],
    [
      'a blocked webpage request',
      'ERROR: [youtube] abcdefghijk: Unable to download webpage: HTTP Error 403: Forbidden',
      'SOURCE_UNAVAILABLE',
      /source|platform/i,
    ],
    [
      'an extractor failure mentioning a webpage',
      'ERROR: [youtube] abcdefghijk: Unable to extract player data from webpage',
      'SOURCE_UNAVAILABLE',
      /engine|source/i,
    ],
  ])('maps %s accurately during analysis', async (_description, stderr, code, message) => {
    failWith(stderr);
    await expect(probeUrl(publicUrl)).rejects.toMatchObject({ code, message: expect.stringMatching(message) });
  });

  it('applies the same bot-check classification during downloads', async () => {
    failWith("ERROR: [youtube] abcdefghijk: Sign in to confirm you're not a bot.");
    await expect(downloadStreams(
      publicUrl,
      'best',
      '/tmp/fetchly-test/source.%(ext)s',
      () => undefined,
      { cancelled: false },
    )).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE',
      message: expect.stringMatching(/bot|verification/i),
    });
  });

  it('does not mistake an error message or webpage for an age restriction', async () => {
    failWith('ERROR: The source returned an unexpected response. Please report this issue.');
    await expect(probeUrl(publicUrl)).rejects.toMatchObject({ code: 'SOURCE_UNAVAILABLE' });
  });

  it('does not mistake digits in a video ID for an HTTP 429 rate limit', async () => {
    failWith('ERROR: [youtube] abc429defgh: An unknown error occurred.');
    await expect(probeUrl(publicUrl)).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });

  it('redacts URLs in diagnostics and never exposes raw stderr to the user', async () => {
    const errorLog = vi.spyOn(logger, 'error');
    try {
      failWith("ERROR: Sign in to confirm you're not a bot. https://example.com/media?token=secret-value");
      await expect(probeUrl(publicUrl)).rejects.toMatchObject({
        code: 'SOURCE_UNAVAILABLE',
        message: expect.not.stringContaining('secret-value'),
      });
      expect(errorLog).toHaveBeenCalledWith(
        expect.objectContaining({ stderr: expect.stringContaining('[url]') }),
        'yt-dlp exited non-zero',
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('secret-value');
    } finally {
      errorLog.mockRestore();
    }
  });

  it('keeps successful metadata responses unchanged', async () => {
    guarded.mockResolvedValue({ code: 0, stdout: '{"id":"abcdefghijk"}', stderr: '' });
    await expect(probeUrl(publicUrl)).resolves.toEqual({ id: 'abcdefghijk' });
  });
});
