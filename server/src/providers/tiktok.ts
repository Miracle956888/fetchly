import { YtDlpProvider } from './base.js';

const HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);

export class TikTokProvider extends YtDlpProvider {
  slug = 'tiktok';
  name = 'TikTok';

  matches(hostname: string): boolean {
    return HOSTS.has(hostname) || hostname.endsWith('.tiktok.com');
  }
}
