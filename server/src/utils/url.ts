/**
 * URL intake safety.
 *
 * SSRF strategy: the server never fetches an arbitrary user-supplied URL.
 * A URL is only handed to the media engine after a provider in the registry
 * claims it via a strict hostname allow-list. In addition we reject:
 *  - non http(s) schemes
 *  - literal IP hosts (IPv4/IPv6), which bypass DNS-based allow-lists
 *  - localhost / private / link-local / reserved hostnames
 *  - embedded credentials, unusual ports, and oversized URLs
 */

const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  '0.0.0.0',
  '[::]',
  '::',
]);

const PRIVATE_SUFFIXES = [
  '.local',
  '.internal',
  '.localhost',
  '.invalid',
  '.example',
  '.test',
  '.home.arpa',
];

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a >= 224
  );
}

export interface UrlCheck {
  ok: boolean;
  reason?: string;
  normalized?: string;
  hostname?: string;
}

export function checkIncomingUrl(raw: unknown): UrlCheck {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, reason: 'URL is required.' };
  }
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, reason: 'URL is too long.' };
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'This does not look like a valid URL.' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'Only http(s) URLs are supported.' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed.' };
  }
  if (url.port && !['80', '443'].includes(url.port)) {
    return { ok: false, reason: 'Unusual ports are not allowed.' };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(hostname)) {
    return { ok: false, reason: 'This URL points to a restricted host.' };
  }
  // Literal IPv4 / IPv6 hosts are rejected outright.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && isPrivateIPv4(hostname)) {
      return { ok: false, reason: 'This URL points to a restricted network.' };
    }
    return { ok: false, reason: 'IP-address URLs are not allowed; use a domain name.' };
  }
  if (!hostname.includes('.')) {
    return { ok: false, reason: 'This does not look like a public domain.' };
  }
  if (PRIVATE_SUFFIXES.some((s) => hostname.endsWith(s))) {
    return { ok: false, reason: 'This URL points to a restricted network.' };
  }

  return { ok: true, normalized: url.toString(), hostname };
}
