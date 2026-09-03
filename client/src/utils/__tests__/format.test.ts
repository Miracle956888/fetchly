import { describe, expect, it } from 'vitest';
import { formatDuration, formatFileSize } from '../format';
import { looksLikeUrl, normalizeMediaUrl } from '../url';

describe('formatFileSize (canonical formatter)', () => {
  it('handles edge cases', () => {
    expect(formatFileSize(null)).toBe('—');
    expect(formatFileSize(undefined)).toBe('—');
    expect(formatFileSize(-5)).toBe('—');
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1)).toBe('1 B');
  });

  it('uses 1024-based units with trimmed zeros', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('matches the spec examples', () => {
    expect(formatFileSize(1228)).toBe('1.2 KB');
    expect(formatFileSize(865075)).toBe('845 KB');
    expect(formatFileSize(13210000)).toBe('12.6 MB');
    expect(formatFileSize(1524000000)).toBe('1.42 GB');
  });

  it('rolls over to the next unit instead of showing 1024 MB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatFileSize(1024 ** 4)).toBe('1 TB');
  });
});

describe('formatDuration', () => {
  it('formats seconds as m:ss and h:mm:ss', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(10)).toBe('0:10');
    expect(formatDuration(320)).toBe('5:20');
    expect(formatDuration(3671)).toBe('1:01:11');
  });
});

describe('looksLikeUrl', () => {
  it('accepts http(s) URLs with a dotted host', () => {
    expect(looksLikeUrl('https://youtube.com/watch?v=x')).toBe(true);
    expect(looksLikeUrl('http://vm.tiktok.com/abc')).toBe(true);
  });
  it('rejects non-URLs and non-http schemes', () => {
    expect(looksLikeUrl('hello')).toBe(false);
    expect(looksLikeUrl('')).toBe(false);
    expect(looksLikeUrl('javascript:alert(1)')).toBe(false);
    expect(looksLikeUrl('ftp://example.com/x')).toBe(false);
  });
});

describe('normalizeMediaUrl (duplicate-request prevention)', () => {
  it('treats www/m-prefixed variants as the same media', () => {
    expect(normalizeMediaUrl('https://youtube.com/watch?v=123')).toBe(
      normalizeMediaUrl('https://www.youtube.com/watch?v=123'),
    );
    expect(normalizeMediaUrl('https://m.youtube.com/watch?v=123')).toBe(
      normalizeMediaUrl('https://www.youtube.com/watch?v=123'),
    );
  });
  it('strips tracking params but keeps meaningful ones', () => {
    expect(normalizeMediaUrl('https://www.youtube.com/watch?v=123&utm_source=share&fbclid=abc')).toBe(
      normalizeMediaUrl('https://youtube.com/watch?v=123'),
    );
  });
  it('ignores trailing slashes', () => {
    expect(normalizeMediaUrl('https://www.tiktok.com/@u/video/1/')).toBe(
      normalizeMediaUrl('https://tiktok.com/@u/video/1'),
    );
  });
  it('keeps different videos distinct', () => {
    expect(normalizeMediaUrl('https://youtube.com/watch?v=1')).not.toBe(
      normalizeMediaUrl('https://youtube.com/watch?v=2'),
    );
  });
  it('returns null for invalid input', () => {
    expect(normalizeMediaUrl('not a url')).toBeNull();
  });
});
