import { randomUUID } from 'node:crypto';
import { probeUrl, type YtDlpFormat, type YtDlpInfo } from '../services/engine/ytdlp.js';
import type { MediaInfo, FormatOption } from '../types/index.js';
import type { FormatPlan, MediaProvider } from './types.js';

/**
 * Shared yt-dlp-backed implementation. Concrete providers only declare
 * identity + URL matching; analysis and format mapping live here.
 */
export abstract class YtDlpProvider implements MediaProvider {
  abstract slug: string;
  abstract name: string;
  implemented = true;
  abstract matches(hostname: string, url: URL): boolean;

  async analyze(url: string): Promise<MediaInfo> {
    return (await this.analyzeWithPlans(url)).info;
  }

  async analyzeWithPlans(url: string): Promise<{ info: MediaInfo; plans: Record<string, FormatPlan> }> {
    const raw = await probeUrl(url);
    return this.mapInfo(raw, url);
  }

  private mapInfo(raw: YtDlpInfo, url: string): { info: MediaInfo; plans: Record<string, FormatPlan> } {
    const formats: FormatOption[] = [];
    const plans: Record<string, FormatPlan> = {};

    const sources = raw.formats ?? [];

    // ── Video options: one MP4 option per available resolution ──────────
    const videoFormats = sources.filter(
      (f) => f.height && f.vcodec && f.vcodec !== 'none',
    );
    const byHeight = new Map<number, YtDlpFormat>();
    for (const f of videoFormats) {
      const h = f.height as number;
      const prev = byHeight.get(h);
      if (!prev || (f.tbr ?? 0) > (prev.tbr ?? 0)) byHeight.set(h, f);
    }
    const heights = [...byHeight.keys()].sort((a, b) => b - a).slice(0, 6);
    for (const h of heights) {
      const f = byHeight.get(h)!;
      const hasAudio = !!(f.acodec && f.acodec !== 'none');
      const id = `v${h}`;
      // Size estimate precedence: exact filesize from the source → filesize_approx
      // → bitrate × duration derived from source metadata (clearly an estimate,
      // never presented as exact). Never fabricated beyond what the source gives.
      const estimatedSize =
        f.filesize ??
        f.filesize_approx ??
        (raw.duration && f.tbr ? Math.round(raw.duration * f.tbr * (1000 / 8)) : undefined);
      formats.push({
        id,
        kind: 'video',
        container: 'mp4',
        quality: `${h}p`,
        height: h,
        estimatedSize: estimatedSize ?? undefined,
        converted: !hasAudio,
      });
      plans[id] = {
        kind: 'video',
        container: 'mp4',
        height: h,
        // When the best single format has no audio, merge best video+audio.
        selector: hasAudio ? f.format_id : `bestvideo[height=${h}]+bestaudio/best[height=${h}]`,
      };
    }

    // ── Audio options: MP3 conversions at standard bitrates ─────────────
    const audioFormats = sources.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
    const bestAudio = audioFormats.sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))[0];
    if (bestAudio || raw.duration) {
      const duration = raw.duration ?? 0;
      for (const kbps of [320, 192, 128]) {
        const id = `a${kbps}`;
        formats.push({
          id,
          kind: 'audio',
          container: 'mp3',
          quality: `${kbps} kbps`,
          bitrate: kbps,
          estimatedSize: duration ? Math.round((duration * kbps * 1000) / 8) : undefined,
          converted: true,
        });
        plans[id] = { kind: 'audio', container: 'mp3', bitrate: kbps, selector: bestAudio?.format_id ?? 'bestaudio/best' };
      }
    }

    return {
      info: {
        id: randomUUID(),
        platform: this.slug,
        title: raw.title ?? 'Untitled media',
        duration: raw.duration ?? null,
        thumbnail: raw.thumbnail ?? null,
        uploader: raw.uploader ?? raw.channel ?? null,
        webpageUrl: raw.webpage_url ?? url,
        formats,
      },
      plans,
    };
  }
}
