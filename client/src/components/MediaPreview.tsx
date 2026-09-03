import { CheckCircle2, Clock, Download, Film, ImageOff, Music2, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnalysisResult, FormatOption } from '../types';
import { formatDuration, formatFileSize } from '../utils/format';
import { PlatformBadge } from './PlatformBadge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tabs } from './ui/Tabs';
import { Tooltip } from './ui/Tooltip';

interface MediaPreviewProps {
  analysis: AnalysisResult;
  busyFormat: string | null; // quality label currently starting a job
  onDownload: (option: FormatOption) => void;
}

function platformName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Analysis result panel. Every option shown was reported by the source —
 * nothing is invented. Sizes are estimates only where the source says so.
 */
export function MediaPreview({ analysis, busyFormat, onDownload }: MediaPreviewProps) {
  const videoOptions = useMemo(
    () => analysis.formats.filter((f) => f.kind === 'video'),
    [analysis.formats],
  );
  const audioOptions = useMemo(
    () => analysis.formats.filter((f) => f.kind === 'audio'),
    [analysis.formats],
  );
  const hasTabs = videoOptions.length > 0 && audioOptions.length > 0;
  const [tab, setTab] = useState<'video' | 'audio'>(videoOptions.length > 0 ? 'video' : 'audio');
  const options = tab === 'video' ? videoOptions : audioOptions;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full shrink-0 bg-surface md:aspect-auto md:w-72">
          {analysis.thumbnail && !imgFailed ? (
            <img
              src={analysis.thumbnail}
              alt={`Thumbnail of ${analysis.title}`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setImgFailed(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-light">
              <ImageOff className="size-8 text-primary-dark/60" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Meta + options */}
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PlatformBadge slug={analysis.platform} name={platformName(analysis.platform)} />
            {analysis.duration != null && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatDuration(analysis.duration)}
              </span>
            )}
            {analysis.uploader && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
                <User className="size-3.5" aria-hidden="true" />
                {analysis.uploader}
              </span>
            )}
          </div>

          <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-ink">
            {analysis.title}
          </h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Media information loaded
          </p>

          {hasTabs && (
            <div className="mt-4">
              <Tabs
                tabs={[
                  { id: 'video', label: `Video (${videoOptions.length})` },
                  { id: 'audio', label: `Audio (${audioOptions.length})` },
                ]}
                active={tab}
                onChange={(id) => setTab(id as 'video' | 'audio')}
              />
            </div>
          )}

          <div className="mt-4 space-y-4">
            {options.length === 0 && (
              <p className="rounded-xl bg-surface p-4 text-sm text-ink-soft">
                No media information available for this type.
              </p>
            )}
            {options.map((option) => {
              const Icon = option.kind === 'video' ? Film : Music2;
              const busy = busyFormat === option.quality;
              return (
                <div
                  key={option.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-soft">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                      {option.quality} {option.container.toUpperCase()}
                      {option.converted && (
                        <Tooltip text="Converted with FFmpeg after download">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                            Converted
                          </span>
                        </Tooltip>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {option.estimatedSize
                        ? `~${formatFileSize(option.estimatedSize)} (estimated)`
                        : 'Size calculated during processing'}
                    </p>
                  </div>
                  {/* Full-width tap target on phones, inline on larger screens */}
                  <Button
                    size="sm"
                    loading={busy}
                    onClick={() => onDownload(option)}
                    icon={!busy ? <Download className="size-4" aria-hidden="true" /> : undefined}
                    className="w-full sm:w-auto"
                  >
                    Download
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
