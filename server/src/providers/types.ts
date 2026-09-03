import type { MediaInfo, MediaKind } from '../types/index.js';

/**
 * Server-side execution plan for one format option. Never sent to clients —
 * the yt-dlp selector is derived from ids we received from our own probe.
 */
export interface FormatPlan {
  kind: MediaKind;
  container: 'mp4' | 'mp3';
  /** yt-dlp -f expression built only from probed format ids. */
  selector?: string;
  /** Target bitrate for MP3 conversions. */
  bitrate?: number;
  height?: number;
}

/**
 * Common contract every media source provider implements. New platforms are
 * added by implementing this interface and registering the provider in the
 * registry — no other part of the app needs to change.
 */
export interface MediaProvider {
  /** Stable platform slug, e.g. "youtube". */
  slug: string;
  /** Display name, e.g. "YouTube". */
  name: string;
  /** True once the provider is fully implemented and wired to the engine. */
  implemented: boolean;
  /** Returns true when this provider claims the given (already safety-checked) URL. */
  matches(hostname: string, url: URL): boolean;
  /** Analyze the URL and return available media information + formats. */
  analyze(url: string): Promise<MediaInfo>;
  /** Same as analyze, but also returns the server-side execution plans. */
  analyzeWithPlans(url: string): Promise<{ info: MediaInfo; plans: Record<string, FormatPlan> }>;
}
