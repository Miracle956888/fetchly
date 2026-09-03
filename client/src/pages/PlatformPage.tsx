import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AnalysisSkeleton } from '../components/AnalysisSkeleton';
import { DownloadCard } from '../components/DownloadCard';
import { MediaPreview } from '../components/MediaPreview';
import { PlatformIcon } from '../components/PlatformIcon';
import { UrlInput } from '../components/UrlInput';
import { Badge } from '../components/ui/Badge';
import { useDownloads } from '../contexts/DownloadsContext';
import { useAutoAnalyze } from '../hooks/useAutoAnalyze';
import { api, ApiClientError } from '../lib/api';
import type { FormatOption, TrackedDownload } from '../types';

interface PlatformCopy {
  name: string;
  title: string;
  description: string;
  placeholder: string;
  tips: string[];
}

const COPY: Record<string, PlatformCopy> = {
  youtube: {
    name: 'YouTube',
    title: 'YouTube downloader',
    description:
      'Save public YouTube videos as MP4 in the highest quality the video offers, or extract the audio as MP3.',
    placeholder: 'Paste a YouTube link, e.g. https://youtube.com/watch?v=…',
    tips: [
      'Works with regular watch links and short youtu.be links.',
      'Playlists are not supported — paste a single video link.',
      'Private or members-only videos cannot be downloaded.',
    ],
  },
  tiktok: {
    name: 'TikTok',
    title: 'TikTok downloader',
    description: 'Save public TikTok videos as MP4, or keep just the sound as MP3.',
    placeholder: 'Paste a TikTok link, e.g. https://tiktok.com/@user/video/…',
    tips: [
      'Use the “Copy link” option on any public TikTok.',
      'Short vm.tiktok.com links work too.',
      'Private accounts cannot be downloaded.',
    ],
  },
  instagram: {
    name: 'Instagram',
    title: 'Instagram downloader',
    description:
      'Save public Instagram Reels and video posts as MP4, or extract the audio as MP3.',
    placeholder: 'Paste an Instagram link, e.g. https://instagram.com/reel/…',
    tips: [
      'Reels, video posts and IGTV links are supported.',
      'Stories behind login walls cannot be downloaded.',
      'Only public accounts work.',
    ],
  },
};

/** SEO landing page per platform — only exists for supported platforms. */
export default function PlatformPage({ slug }: { slug: string }) {
  const copy = COPY[slug];
  const { addDownload, removeDownload } = useDownloads();
  const resultRef = useRef<HTMLDivElement>(null);

  const auto = useAutoAnalyze();
  const [activeJob, setActiveJob] = useState<TrackedDownload | null>(null);
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    onError: (err: unknown) =>
      setDownloadError(err instanceof ApiClientError ? err.message : 'Could not start the download.'),
    onSettled: () => setBusyFormat(null),
  });

  useEffect(() => {
    if (auto.phase === 'ready' || auto.phase === 'analyzing') {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [auto.phase]);

  useEffect(() => {
    document.title = `${copy.title} — Fetchly`;
  }, [copy.title]);

  const analyzing = auto.phase === 'analyzing' || auto.phase === 'debouncing';

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Badge tone="primary" className="mb-4">
        <PlatformIcon slug={slug} className="size-3.5" aria-hidden="true" /> {copy.name}
      </Badge>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{copy.title}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{copy.description}</p>

      <div className="mt-8 text-left">
        <UrlInput
          value={auto.value}
          onChange={auto.setValue}
          onSubmit={auto.submitNow}
          phase={auto.phase}
          error={auto.error}
          platform={auto.platform}
          placeholder={copy.placeholder}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {copy.tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-sm text-ink-soft">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            {tip}
          </li>
        ))}
      </ul>

      <div ref={resultRef} className="mt-8 scroll-mt-24 space-y-4">
        {analyzing && <AnalysisSkeleton />}
        {auto.analysis && auto.phase === 'ready' && (
          <MediaPreview
            analysis={auto.analysis}
            busyFormat={busyFormat}
            onDownload={(option) => downloadMutation.mutate(option)}
          />
        )}
        {downloadError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
            {downloadError}
          </p>
        )}
        {activeJob && (
          <DownloadCard
            item={activeJob}
            onRetry={(url) => auto.setValue(url, { immediate: true })}
            onRemove={(jobId) => {
              removeDownload(jobId);
              setActiveJob(null);
            }}
          />
        )}
      </div>
    </main>
  );
}
