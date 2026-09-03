import { YtDlpProvider } from './base.js';

const HOSTS = new Set(['instagram.com', 'www.instagram.com']);

export class InstagramProvider extends YtDlpProvider {
  slug = 'instagram';
  name = 'Instagram';

  matches(hostname: string): boolean {
    return HOSTS.has(hostname);
  }
}
