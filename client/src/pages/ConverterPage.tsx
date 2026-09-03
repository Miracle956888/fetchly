import { Music2, Video } from 'lucide-react';
import { useEffect } from 'react';
import PlatformPage from './PlatformPage';

/**
 * SEO pages /youtube-to-mp3 and /youtube-to-mp4. The flow is identical to
 * the YouTube downloader; users simply pick the corresponding tab after
 * analysis. Copy is tuned per conversion direction.
 */
export default function ConverterPage({ kind }: { kind: 'mp3' | 'mp4' }) {
  useEffect(() => {
    document.title =
      kind === 'mp3' ? 'YouTube to MP3 — Fetchly' : 'YouTube to MP4 — Fetchly';
  }, [kind]);

  return (
    <>
      <section className="border-b border-line bg-surface/60">
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-10 sm:px-6">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-card text-primary-dark shadow-[var(--shadow-card)]">
            {kind === 'mp3' ? (
              <Music2 className="size-6" aria-hidden="true" />
            ) : (
              <Video className="size-6" aria-hidden="true" />
            )}
          </span>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest text-primary-dark">
            {kind === 'mp3' ? 'Audio extraction' : 'Video download'}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            YouTube to {kind.toUpperCase()}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {kind === 'mp3'
              ? 'Paste a YouTube link below and choose an MP3 bitrate after analysis — 128, 192 or 320 kbps. The audio is extracted and converted on the fly.'
              : 'Paste a YouTube link below and choose the MP4 resolution you want. Fetchly only lists qualities the video actually offers.'}
          </p>
        </div>
      </section>
      <PlatformPage slug="youtube" />
    </>
  );
}
