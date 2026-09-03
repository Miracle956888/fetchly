import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { requireProvider } from '../providers/registry.js';
import type { AnalysisRecord } from '../types/index.js';
import { ApiError } from '../utils/errors.js';
import { checkIncomingUrl } from '../utils/url.js';

/**
 * URL → platform detection → engine probe → cached analysis result.
 * This service never downloads media; it only inspects metadata.
 */
export async function analyzeUrl(rawUrl: unknown): Promise<AnalysisRecord> {
  const check = checkIncomingUrl(rawUrl);
  if (!check.ok || !check.normalized) {
    throw new ApiError('INVALID_URL', check.reason ?? 'Invalid URL.');
  }

  const { provider } = requireProvider(check.normalized);

  const overrides = await db().getPlatformOverrides();
  if (overrides[provider.slug] === false) {
    throw new ApiError(
      'PLATFORM_DISABLED',
      `${provider.name} support is currently disabled by the administrator.`,
    );
  }

  const { info, plans } = await provider.analyzeWithPlans(check.normalized);

  if (info.formats.length === 0) {
    throw new ApiError('CONTENT_UNAVAILABLE', 'No downloadable media information was returned by the source.');
  }

  const record: AnalysisRecord = {
    id: randomUUID(),
    url: check.normalized,
    info,
    plans,
    createdAt: new Date(),
  };
  await db().saveAnalysis(record);
  await db().track('analyze', provider.slug).catch(() => undefined);
  return record;
}
