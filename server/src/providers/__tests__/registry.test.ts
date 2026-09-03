import { describe, expect, it } from 'vitest';
import { ApiError } from '../../utils/errors.js';
import { detectProvider, listPlatformCatalog, requireProvider } from '../registry.js';

describe('provider registry', () => {
  it('detects YouTube variants', () => {
    expect(detectProvider('https://www.youtube.com/watch?v=abc')?.provider.slug).toBe('youtube');
    expect(detectProvider('https://youtu.be/abc')?.provider.slug).toBe('youtube');
    expect(detectProvider('https://m.youtube.com/watch?v=abc')?.provider.slug).toBe('youtube');
  });

  it('detects TikTok including short-link hosts', () => {
    expect(detectProvider('https://www.tiktok.com/@user/video/123')?.provider.slug).toBe('tiktok');
    expect(detectProvider('https://vm.tiktok.com/ZM123/')?.provider.slug).toBe('tiktok');
  });

  it('detects Instagram', () => {
    expect(detectProvider('https://www.instagram.com/reel/abc/')?.provider.slug).toBe('instagram');
  });

  it('returns null for unknown hosts', () => {
    expect(detectProvider('https://example.com/video')).toBeNull();
  });

  it('rejects unsupported platforms with UNSUPPORTED_PLATFORM', () => {
    expect(() => requireProvider('https://example.com/video')).toThrowError(ApiError);
    try {
      requireProvider('https://example.com/video');
    } catch (err) {
      expect((err as ApiError).code).toBe('UNSUPPORTED_PLATFORM');
    }
  });

  it('rejects registered-but-unimplemented providers with PLATFORM_DISABLED', () => {
    try {
      requireProvider('https://www.facebook.com/watch?v=1');
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).code).toBe('PLATFORM_DISABLED');
    }
  });

  it('exposes an honest catalog: only implemented providers may be enabled', () => {
    const catalog = listPlatformCatalog();
    const youtube = catalog.find((p) => p.slug === 'youtube');
    const reddit = catalog.find((p) => p.slug === 'reddit');
    expect(youtube?.implemented).toBe(true);
    expect(reddit?.implemented).toBe(false);
    expect(reddit?.enabled).toBe(false);
    expect(catalog.length).toBeGreaterThanOrEqual(8);
  });
});
