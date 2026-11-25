import { YtDlpProvider } from './base.js';
import { isYouTubeHostname } from './youtubeHosts.js';

export class YouTubeProvider extends YtDlpProvider {
  slug = 'youtube';
  name = 'YouTube';

  matches(hostname: string): boolean {
    return isYouTubeHostname(hostname);
  }
}
