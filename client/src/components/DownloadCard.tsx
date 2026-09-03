import {
  Ban,
  CircleCheck,
  Download,
  Hourglass,
  ImageOff,
  RefreshCw,
  Trash2,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useJobPolling } from '../hooks/useJobPolling';
import { api } from '../lib/api';
import type { JobStatus, TrackedDownload } from '../types';
import { formatFileSize } from '../utils/format';
import { PlatformIcon } from './PlatformIcon';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';

interface DownloadCardProps {
  item: TrackedDownload;
  onRetry?: (sourceUrl: string) => void;
  onRemove: (jobId: string) => void;
  showThumbnail?: boolean;
}

/** Friendly mapping of backend states (no invented steps). */
function statusLabel(status: JobStatus, progress: number, delivering: boolean): string {
  if (delivering) return 'Downloading to device';
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'analyzing':
      return 'Analyzing';
    case 'downloading':
      return 'Downloading';
    case 'processing':
      return progress >= 95 ? 'Finalizing' : 'Processing';
    case 'completed':
      return 'Ready';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
  }
}

/**
 * Live status card for one download job. All numbers (percent, bytes, speed,
 * final size) come from the server — nothing is simulated on the client.
 */
export function DownloadCard({ item, onRetry, onRemove, showThumbnail = false }: DownloadCardProps) {
  const { data: job, isError, refetch } = useJobPolling(item.jobId);
  const [delivering, setDelivering] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleRemove = async () => {
    try {
      await api.removeJob(item.jobId);
    } catch {
      /* record may already be gone */
    }
    onRemove(item.jobId);
  };

  // The job record was deleted (e.g. expired cleanup or admin removal) —
  // fail gracefully instead of rendering stale data.
  if (isError) {
    return (
      <Card className="!p-4 sm:!p-5">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-soft">
            <PlatformIcon slug={item.platform} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink" title={item.title}>
              {item.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              This job record no longer exists on the server.
            </p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={() => onRetry(item.sourceUrl)} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
                Download Again
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleRemove} icon={<Trash2 className="size-4" aria-hidden="true" />}>
              Remove
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const status = job?.status ?? 'queued';
  const active = ['queued', 'analyzing', 'downloading', 'processing'].includes(status);

  /** Trigger the real device download through the signed delivery URL. */
  const downloadToDevice = async () => {
    let url = job?.downloadUrl ?? null;
    if (!url) {
      // Token may have expired — ask the server for a fresh one.
      const fresh = await refetch();
      url = fresh.data?.downloadUrl ?? null;
    }
    if (!url) return;
    setDelivering(true);
    // Honest client event; the server keeps its own authoritative record.
    void api.reportDownloadEvent(item.jobId, 'download_started');
    const a = document.createElement('a');
    a.href = url;
    a.download = job?.fileName ?? '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setDeliveryNote(true), 400);
  };

  const handleCancel = async () => {
    try {
      await api.cancelJob(item.jobId);
    } catch {
      /* polling reflects the truth */
    }
  };

  const downloaded = job?.downloadedBytes ?? null;
  const total = job?.fileSize ?? null;
  const speed = job?.speedBps ?? null;

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start gap-3.5">
        {showThumbnail ? (
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
            {item.thumbnail && !imgFailed ? (
              <img
                src={item.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImgFailed(true)}
                loading="lazy"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-ink-soft/50">
                <ImageOff className="size-5" aria-hidden="true" />
              </span>
            )}
          </div>
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
            <PlatformIcon slug={item.platform} className="size-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink" title={item.title}>
            {item.title}
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {item.platform} · {item.format} · {item.quality}
          </p>

          <div className="mt-3" aria-live="polite">
            {status === 'queued' && (
              <div className="space-y-2">
                <ProgressBar value={0} indeterminate label="Waiting in queue" />
                <StatusLine icon={<Hourglass className="size-3.5" />} text="Queued — waiting for a worker slot…" />
              </div>
            )}

            {status === 'downloading' && (
              <div className="space-y-2">
                <ProgressBar value={job?.progress ?? 0} label="Download progress" />
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                  <StatusLine
                    icon={<Download className="size-3.5" />}
                    text={`Downloading ${job?.progress ?? 0}%`}
                  />
                  <span className="tabular-nums text-ink-soft">
                    {downloaded != null &&
                      (total != null
                        ? `${formatFileSize(downloaded)} / ${formatFileSize(total)}`
                        : `${formatFileSize(downloaded)} downloaded`)}
                    {speed ? ` · ${formatFileSize(speed)}/s` : ''}
                  </span>
                </div>
              </div>
            )}

            {status === 'analyzing' && (
              <div className="space-y-2">
                <ProgressBar value={5} indeterminate label="Analyzing source" />
                <StatusLine icon={<RefreshCw className="size-3.5" />} text="Verifying source media…" />
              </div>
            )}

            {status === 'processing' && (
              <div className="space-y-2">
                <ProgressBar value={85} indeterminate label="Processing" />
                <StatusLine
                  icon={<RefreshCw className="size-3.5" />}
                  text={(job?.progress ?? 0) >= 95 ? 'Finalizing your file…' : 'Preparing your file…'}
                />
              </div>
            )}

            {status === 'completed' && (
              <div className="space-y-3">
                <StatusLine
                  icon={<CircleCheck className="size-3.5 text-success" />}
                  tone="text-success"
                  text={
                    delivering
                      ? 'Your browser has started downloading the file.'
                      : `Ready · ${formatFileSize(job?.fileSize)}`
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={downloadToDevice}
                    icon={<Download className="size-4" aria-hidden="true" />}
                  >
                    {deliveryNote ? 'Download Again' : 'Download to device'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleRemove} icon={<Trash2 className="size-4" aria-hidden="true" />}>
                    Remove
                  </Button>
                </div>
                {deliveryNote && (
                  <p className="text-xs text-ink-soft">
                    Files expire after a short window — use Download Again to regenerate if needed.
                  </p>
                )}
              </div>
            )}

            {status === 'failed' && (
              <div className="space-y-3">
                <StatusLine
                  icon={<TriangleAlert className="size-3.5 text-danger" />}
                  tone="text-danger"
                  text={job?.errorMessage ?? 'Unable to process this video.'}
                />
                <div className="flex flex-wrap gap-2">
                  {onRetry && (
                    <Button size="sm" variant="secondary" onClick={() => onRetry(item.sourceUrl)} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
                      Try Again
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleRemove}>
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {status === 'cancelled' && (
              <div className="space-y-3">
                <StatusLine icon={<Ban className="size-3.5" />} text="Download cancelled." />
                <Button size="sm" variant="ghost" onClick={handleRemove}>
                  Remove
                </Button>
              </div>
            )}

            {status === 'expired' && (
              <div className="space-y-3">
                <StatusLine
                  icon={<XCircle className="size-3.5" />}
                  text="Original file expired. Download again will reprocess the media."
                />
                <div className="flex flex-wrap gap-2">
                  {onRetry && (
                    <Button size="sm" variant="secondary" onClick={() => onRetry(item.sourceUrl)} icon={<RefreshCw className="size-4" aria-hidden="true" />}>
                      Download Again
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleRemove}>
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              status === 'completed'
                ? 'bg-success/10 text-success'
                : status === 'failed'
                  ? 'bg-danger/10 text-danger'
                  : active
                    ? 'bg-primary-light text-primary-dark'
                    : 'bg-surface text-ink-soft'
            }`}
          >
            {statusLabel(status, job?.progress ?? 0, delivering)}
          </span>
          {active && (
            <Button size="sm" variant="danger" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusLine({
  icon,
  text,
  tone = 'text-ink-soft',
}: {
  icon: React.ReactNode;
  text: string;
  tone?: string;
}) {
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}>
      {icon}
      {text}
    </p>
  );
}
