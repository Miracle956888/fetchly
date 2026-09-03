import { describe, expect, it } from 'vitest';
import { checkIncomingUrl } from '../url.js';

describe('checkIncomingUrl', () => {
  it('accepts a standard public video URL', () => {
    const res = checkIncomingUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.ok).toBe(true);
    expect(res.hostname).toBe('www.youtube.com');
  });

  it('rejects missing or empty input', () => {
    expect(checkIncomingUrl(undefined).ok).toBe(false);
    expect(checkIncomingUrl('').ok).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(checkIncomingUrl('javascript:alert(1)').ok).toBe(false);
    expect(checkIncomingUrl('file:///etc/passwd').ok).toBe(false);
    expect(checkIncomingUrl('ftp://example.com/video').ok).toBe(false);
  });

  it('rejects localhost and private networks (SSRF)', () => {
    expect(checkIncomingUrl('http://localhost/video').ok).toBe(false);
    expect(checkIncomingUrl('http://127.0.0.1/video').ok).toBe(false);
    expect(checkIncomingUrl('http://10.0.0.5/video').ok).toBe(false);
    expect(checkIncomingUrl('http://192.168.1.1/video').ok).toBe(false);
    expect(checkIncomingUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
    expect(checkIncomingUrl('http://[::1]/video').ok).toBe(false);
    expect(checkIncomingUrl('http://db.internal/video').ok).toBe(false);
    expect(checkIncomingUrl('http://printer.local/video').ok).toBe(false);
  });

  it('rejects literal IP hosts entirely', () => {
    expect(checkIncomingUrl('https://8.8.8.8/video').ok).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(checkIncomingUrl('https://user:pass@youtube.com/watch?v=x').ok).toBe(false);
  });

  it('rejects unusual ports', () => {
    expect(checkIncomingUrl('https://youtube.com:8080/watch?v=x').ok).toBe(false);
  });

  it('rejects oversized URLs', () => {
    expect(checkIncomingUrl(`https://youtube.com/watch?v=${'a'.repeat(3000)}`).ok).toBe(false);
  });

  it('rejects gibberish', () => {
    expect(checkIncomingUrl('not a url at all').ok).toBe(false);
  });
});
