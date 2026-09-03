import { Clapperboard, Film, Gamepad2, MessageCircle, Pin } from 'lucide-react';

/**
 * Platform glyphs. These are original, abstract marks drawn on a common
 * 24px stroke grid — intentionally NOT replicas of any platform's logo.
 */
export function PlatformIcon({ slug, className = 'size-5' }: { slug: string; className?: string }) {
  switch (slug) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
          <path d="M10.2 9.4l4.6 2.6-4.6 2.6z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M14 3v10.5" />
          <path d="M14 3c.5 2.5 2.5 4 5 4.2" />
          <circle cx="10.5" cy="16.5" r="3.5" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M14.5 21v-7h3l.5-3.5h-3.5V8.2c0-1 .6-1.7 1.8-1.7H18V3.3c-.6-.1-1.5-.2-2.4-.2-2.5 0-4.1 1.5-4.1 4.3v3.1H8.5V14h3v7" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden="true">
          <path d="M5 4l14 16" />
          <path d="M19 4L5 20" />
        </svg>
      );
    case 'reddit':
      return <MessageCircle className={className} aria-hidden="true" />;
    case 'vimeo':
      return <Film className={className} aria-hidden="true" />;
    case 'twitch':
      return <Gamepad2 className={className} aria-hidden="true" />;
    case 'dailymotion':
      return <Clapperboard className={className} aria-hidden="true" />;
    case 'pinterest':
      return <Pin className={className} aria-hidden="true" />;
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
