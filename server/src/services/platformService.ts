import { db } from '../db/index.js';
import { listPlatformCatalog } from '../providers/registry.js';
import type { PlatformInfo } from '../types/index.js';

/**
 * Platform status = code registry (what is actually implemented) merged
 * with admin overrides (what is currently enabled). A platform is only ever
 * reported as active when BOTH are true.
 */
export async function listPlatforms(): Promise<PlatformInfo[]> {
  const overrides = await db().getPlatformOverrides();
  return listPlatformCatalog().map((p) => ({
    ...p,
    enabled: p.implemented && overrides[p.slug] !== false,
  }));
}

export async function setPlatformEnabled(slug: string, enabled: boolean): Promise<PlatformInfo[]> {
  const catalog = listPlatformCatalog();
  const entry = catalog.find((p) => p.slug === slug);
  if (!entry) return listPlatforms();
  if (!entry.implemented && enabled) {
    // Never allow enabling a provider that is not implemented yet.
    enabled = false;
  }
  await db().setPlatformEnabled(slug, enabled);
  await db().track(enabled ? 'platform_enabled' : 'platform_disabled', slug).catch(() => undefined);
  return listPlatforms();
}
