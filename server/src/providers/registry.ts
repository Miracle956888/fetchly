import { ApiError } from '../utils/errors.js';
import type { PlatformInfo } from '../types/index.js';
import type { MediaProvider } from './types.js';
import { YouTubeProvider } from './youtube.js';
import { TikTokProvider } from './tiktok.js';
import { InstagramProvider } from './instagram.js';
import { FacebookProvider } from './facebook.js';
import { XProvider } from './x.js';

/**
 * Provider registry. The catalog also lists platforms planned for the
 * future (implemented=false) so the frontend can show an honest roadmap
 * instead of hardcoding anything.
 */
const providers: MediaProvider[] = [
  new YouTubeProvider(),
  new TikTokProvider(),
  new InstagramProvider(),
  new FacebookProvider(),
  new XProvider(),
];

const catalog: Array<{ slug: string; name: string }> = [
  ...providers.map((p) => ({ slug: p.slug, name: p.name })),
  { slug: 'reddit', name: 'Reddit' },
  { slug: 'vimeo', name: 'Vimeo' },
  { slug: 'twitch', name: 'Twitch' },
  { slug: 'dailymotion', name: 'Dailymotion' },
  { slug: 'pinterest', name: 'Pinterest' },
];

export interface DetectedProvider {
  provider: MediaProvider;
  hostname: string;
}

export function detectProvider(normalizedUrl: string): DetectedProvider | null {
  let url: URL;
  try {
    url = new URL(normalizedUrl);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  for (const provider of providers) {
    if (provider.matches(hostname, url)) return { provider, hostname };
  }
  return null;
}

/** Resolve a provider for analysis or throw domain-specific errors. */
export function requireProvider(normalizedUrl: string): DetectedProvider {
  const detected = detectProvider(normalizedUrl);
  if (!detected) {
    throw new ApiError('UNSUPPORTED_PLATFORM', 'This platform is currently not supported.');
  }
  if (!detected.provider.implemented) {
    throw new ApiError(
      'PLATFORM_DISABLED',
      `${detected.provider.name} support is coming soon. It is not available yet.`,
    );
  }
  return detected;
}

export function getProvider(slug: string): MediaProvider | undefined {
  return providers.find((p) => p.slug === slug);
}

export function listPlatformCatalog(): PlatformInfo[] {
  return catalog.map((entry) => {
    const provider = providers.find((p) => p.slug === entry.slug);
    return {
      slug: entry.slug,
      name: entry.name,
      implemented: provider?.implemented ?? false,
      enabled: provider?.implemented ?? false, // DB overrides applied by platform service
    };
  });
}
