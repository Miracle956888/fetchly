// Keep the engine's opt-in YouTube settings aligned with the provider's
// strict host allow-list. This module has no dependencies on the provider or
// engine, so it can safely be used by both.
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function isYouTubeHostname(hostname: string): boolean {
  return YOUTUBE_HOSTS.has(hostname.toLowerCase());
}

export function isYouTubeUrl(url: string): boolean {
  try {
    return isYouTubeHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}
