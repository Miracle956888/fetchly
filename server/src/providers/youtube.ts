import { YtDlpProvider } from './base.js';

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export class YouTubeProvider extends YtDlpProvider {
  slug = 'youtube';
  name = 'YouTube';

  matches(hostname: string): boolean {
    return HOSTS.has(hostname);
  }
}
