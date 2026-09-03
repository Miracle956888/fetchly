/**
 * Safe download file names. Titles come from third-party metadata and must
 * never be trusted: strip control characters (prevents header injection),
 * keep a conservative charset, and cap the length.
 */
export function buildFileName(title: string | null | undefined, ext: string): string {
  const cleanExtension = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const base = (title ?? 'media')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '') // control chars (\r \n etc.)
    .replace(/[\\/:*?"<>|]/g, '') // filesystem/hostile chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'media';
  return `${base}.${cleanExtension}`;
}
