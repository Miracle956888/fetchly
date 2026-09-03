import { describe, expect, it } from 'vitest';
import { buildFileName } from '../filename.js';

describe('buildFileName', () => {
  it('produces a simple sanitized name', () => {
    expect(buildFileName('My Video', 'mp4')).toBe('My Video.mp4');
  });

  it('strips header-injection control characters', () => {
    expect(buildFileName('evil\r\nSet-Cookie: x=1', 'mp4')).toBe('evilSet-Cookie x=1.mp4');
  });

  it('strips path separators and hostile chars', () => {
    expect(buildFileName('../etc/passwd', 'mp3')).toBe('..etcpasswd.mp3');
  });

  it('caps length and falls back for empty titles', () => {
    expect(buildFileName('x'.repeat(500), 'mp4').length).toBeLessThanOrEqual(85);
    expect(buildFileName('', 'mp4')).toBe('media.mp4');
    expect(buildFileName(null, 'mp3')).toBe('media.mp3');
  });

  it('sanitizes the extension too', () => {
    expect(buildFileName('song', '../../sh')).toBe('song.sh');
  });
});
