import { YtDlpProvider } from './base.js';

const HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 't.co']);

/** Registered but not yet enabled — see FacebookProvider note. */
export class XProvider extends YtDlpProvider {
  slug = 'x';
  name = 'X';
  override implemented = false;

  matches(hostname: string): boolean {
    return HOSTS.has(hostname);
  }
}
