import { useMutation } from '@tanstack/react-query';
import {
  ClipboardPaste,
  Download,
  Gauge,
  LayoutGrid,
  Lock,
  MonitorSmartphone,
  Music2,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Video,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnalysisSkeleton } from '../components/AnalysisSkeleton';
import { DownloadCard } from '../components/DownloadCard';
import { MediaPreview } from '../components/MediaPreview';
import { PlatformIcon } from '../components/PlatformIcon';
import { UrlInput } from '../components/UrlInput';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useDownloads } from '../contexts/DownloadsContext';
import { useAutoAnalyze } from '../hooks/useAutoAnalyze';
import { usePlatforms } from '../hooks/usePlatforms';
import { api, ApiClientError } from '../lib/api';
import type { FormatOption, TrackedDownload } from '../types';

export default function HomePage() {
  const location = useLocation();
  const { addDownload, removeDownload } = useDownloads();
  const resultRef = useRef<HTMLDivElement>(null);

  const auto = useAutoAnalyze();
  const [activeJob, setActiveJob] = useState<TrackedDownload | null>(null);
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const platforms = usePlatforms();

  const downloadMutation = useMutation({
    mutationFn: (option: FormatOption) =>
      api.createDownload(auto.analysis!.id, option.container, option.quality),
    onMutate: (option) => {
      setBusyFormat(option.quality);
      setDownloadError(null);
    },
    onSuccess: (data, option) => {
      const analysis = auto.analysis;
      if (!analysis) return;
      const item: TrackedDownload = {
        jobId: data.jobId,
        title: analysis.title,
        platform: analysis.platform,
        format: option.container,
        quality: option.quality,
        thumbnail: analysis.thumbnail,
        sourceUrl: analysis.webpageUrl,
        createdAt: Date.now(),
      };
      addDownload(item);
      setActiveJob(item);
    },
    onError: (err: unknown) => {
      setDownloadError(
        err instanceof ApiClientError ? err.message : 'Could not start the download. Please try again.',
      );
    },
    onSettled: () => setBusyFormat(null),
  });

  // Scroll the result into view when analysis completes.
  useEffect(() => {
    if (auto.phase === 'ready' || auto.phase === 'analyzing') {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, [auto.phase]);

  // Support navbar deep-links like /#faq from other routes.
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!target) return;
    if (target === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [location.state]);

  const activePlatforms = (platforms.data ?? []).filter((p) => p.enabled && p.implemented);
  const analyzing = auto.phase === 'analyzing' || auto.phase === 'debouncing';

  return (
    <main id="top">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-light/70 to-transparent"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pt-20">
          <Badge tone="primary" className="mb-5">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> No account · Automatic analysis
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Save your media.
            <br />
            <span className="text-primary-dark">Simple. Fast. Yours.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Paste a link from a supported platform — Fetchly analyzes it automatically. Pick the
            format and quality you want and download MP4 or MP3 in seconds.
          </p>

          <div className="mt-8 text-left">
            <UrlInput
              value={auto.value}
              onChange={auto.setValue}
              onSubmit={auto.submitNow}
              phase={auto.phase}
              error={auto.error}
              platform={auto.platform}
              autoFocus
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label="Supported platforms">
            {(activePlatforms.length > 0 ? activePlatforms : (platforms.data ?? []).slice(0, 3)).map((p) => (
              <span
                key={p.slug}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink"
              >
                <PlatformIcon slug={p.slug} className="size-3.5 text-primary-dark" />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Result area ──────────────────────────────────────────────── */}
      <section ref={resultRef} aria-label="Analysis result" className="mx-auto max-w-3xl scroll-mt-24 px-4 sm:px-6">
        {analyzing && (
          <div className="pb-4">
            <AnalysisSkeleton />
          </div>
        )}

        {auto.analysis && auto.phase === 'ready' && (
          <div className="space-y-4 pb-4">
            <MediaPreview
              analysis={auto.analysis}
              busyFormat={busyFormat}
              onDownload={(option) => downloadMutation.mutate(option)}
            />
            {downloadError && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
                {downloadError}
              </p>
            )}
          </div>
        )}

        {activeJob && (
          <div className="space-y-3 pb-10">
            <DownloadCard
              item={activeJob}
              onRetry={(url) => auto.setValue(url, { immediate: true })}
              onRemove={(jobId) => {
                removeDownload(jobId);
                setActiveJob(null);
              }}
            />
          </div>
        )}
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-surface/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading kicker="How it works" title="Paste. That's most of it." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-extrabold text-ink-soft" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Supported platforms ──────────────────────────────────────── */}
      <section id="platforms" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            kicker="Supported platforms"
            title="Works where your videos live"
            subtitle="Platform support is managed centrally — a platform only appears as active when its connector is implemented and verified."
          />
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(platforms.data ?? []).map((p) => {
              const active = p.enabled && p.implemented;
              return (
                <li key={p.slug}>
                  <div
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-4 ${
                      active ? 'border-line bg-card shadow-[var(--shadow-card)]' : 'border-dashed border-line bg-surface/50'
                    }`}
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary-light text-primary-dark' : 'bg-card text-ink-soft/50'}`}>
                      <PlatformIcon slug={p.slug} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                      <p className={`text-xs font-medium ${active ? 'text-success' : 'text-ink-soft'}`}>
                        {active ? 'Active' : 'Coming soon'}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            {(platforms.data ?? []).length === 0 && (
              <li className="col-span-full text-sm text-ink-soft">Platform list is loading…</li>
            )}
          </ul>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 bg-surface/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading kicker="Features" title="Built like a proper tool, not a gimmick" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formats explained ────────────────────────────────────────── */}
      <section id="formats" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading kicker="Formats" title="MP4 or MP3 — you choose" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card className="h-full">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-ink">
                  <Video className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold">MP4 · Video</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Keeps picture and sound together. Fetchly lists every resolution the source
                actually provides — 480p, 720p, 1080p or more — and never invents options that do
                not exist.
              </p>
            </Card>
            <Card className="h-full">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-bg">
                  <Music2 className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold">MP3 · Audio only</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Perfect for music, talks and podcasts. We extract the audio stream and convert it
                to MP3 at the bitrate you pick — 128, 192 or 320 kbps.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 bg-surface/60 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading kicker="FAQ" title="Answers before you ask" />
          <div className="mt-10 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-line bg-card px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-primary-dark transition-transform group-open:rotate-45" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Responsible use ──────────────────────────────────────────── */}
      <section id="responsibility" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Card className="border-warning/40 bg-warning/5">
            <div className="flex gap-3.5">
              <Lock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <h2 className="font-bold text-ink">Use Fetchly responsibly</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  Only download content you own, that is in the public domain, or that you have
                  explicit permission to save. Respect each platform&rsquo;s terms and copyright law.
                  Fetchly does not access private, restricted or DRM-protected media — and never
                  will.{' '}
                  <a href="/responsible-use" className="font-semibold text-primary-dark underline-offset-2 hover:underline">
                    Read our responsible-use policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-widest text-primary-dark">{kicker}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}
    </div>
  );
}

const STEPS = [
  { icon: ClipboardPaste, title: 'Paste your link', text: 'Drop a video URL into the box — analysis starts automatically, no button needed.' },
  { icon: SlidersHorizontal, title: 'Choose your format', text: 'MP4 to keep the video, MP3 to keep just the audio.' },
  { icon: Gauge, title: 'Select quality', text: 'Pick from the resolutions and bitrates the source actually offers.' },
  { icon: Download, title: 'Download', text: 'Real progress, real file sizes — then the file lands in your Downloads folder.' },
];

const FEATURES = [
  { icon: Zap, title: 'Automatic analysis', text: 'Paste a link and Fetchly detects the platform and inspects the media instantly — with smart de-bouncing and no duplicate requests.' },
  { icon: LayoutGrid, title: 'Queue-based engine', text: 'Downloads run on a job queue with dedicated workers, so the site stays fast under load.' },
  { icon: Timer, title: 'Automatic cleanup', text: 'Files live only long enough for you to grab them, then they are deleted for good — analytics are kept.' },
  { icon: ShieldCheck, title: 'Privacy by design', text: 'No account needed. We do not collect personal data to process a download.' },
  { icon: MonitorSmartphone, title: 'Works everywhere', text: 'Designed mobile-first and fully responsive — phones, tablets, laptops and desktops, in light or dark mode.' },
  { icon: Music2, title: 'Honest file sizes', text: 'Sizes come from the real generated file — never an estimate presented as fact.' },
];

const FAQS = [
  {
    q: 'Is Fetchly free to use?',
    a: 'Yes. Paste a link, choose a format and download — no account, subscription or payment required.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'YouTube, TikTok and Instagram are active today. Facebook, X, Reddit, Vimeo, Twitch, Dailymotion and Pinterest are on the roadmap and appear as "coming soon" until their connectors are verified.',
  },
  {
    q: 'Why is a quality option missing?',
    a: 'Fetchly only lists formats the source actually provides. If a resolution is not shown, the source does not offer it.',
  },
  {
    q: 'Do you keep my files on your servers?',
    a: 'Only briefly. Completed files are stored temporarily so you can download them, then automatically deleted after a short expiration window.',
  },
  {
    q: 'Is downloading videos legal?',
    a: 'It depends on the content and your jurisdiction. You may download content you own, content in the public domain, or content where you have permission. Downloading other people’s copyrighted work without permission can violate the law and platform terms. See our responsible-use policy.',
  },
  {
    q: 'Can I download private or age-restricted videos?',
    a: 'No. Fetchly only works with publicly accessible media and will never bypass authentication, DRM, paywalls or access controls.',
  },
];
