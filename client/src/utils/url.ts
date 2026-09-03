/** URL helpers for automatic analysis. */

export function looksLikeUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Hostname patterns a URL must match to be worth analyzing automatically. */
const SUPPORTED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'fb.watch',
  'x.com',
  'twitter.com',
];

export function isSupportedUrl(value: string): boolean {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase().replace(/^(www|m)\./, '');
    return SUPPORTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Canonical form of a media URL, used to de-duplicate analyses.
 * Normalizes scheme/host casing, strips tracking params (utm_*, fbclid…)
 * and trailing slashes, so e.g.
 *   https://youtube.com/watch?v=123  and  https://www.youtube.com/watch?v=123
 * compare equal, while meaningful params (v, list-independent) are kept.
 */
export function normalizeMediaUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
    const keep = new URLSearchParams();
    u.searchParams.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k.startsWith('utm_') || ['fbclid', 'gclid', 'igshid', 'si', 'ref', 'source'].includes(k)) return;
      keep.set(key, value);
    });
    const qs = keep.toString();
    return `${host}${u.pathname.replace(/\/+$/, '')}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}

/** Friendly platform name for status copy ("Analyzing YouTube video…"). */
export function platformFromUrl(raw: string): string | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    if (host.includes('youtu')) return 'YouTube';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
    if (host.includes('x.com') || host.includes('twitter')) return 'X';
    return null;
  } catch {
    return null;
  }
}
