import type { Plugin } from 'vite';

/**
 * Build-time site metadata.
 *
 * Search engines and social crawlers do NOT execute JavaScript, so the
 * canonical URL, Open Graph/Twitter tags, robots.txt and sitemap.xml must be
 * correct in the emitted HTML/files themselves. Every one of those values is
 * domain-specific, so they are generated from VITE_SITE_URL instead of having
 * a placeholder domain committed to the repository.
 *
 * When VITE_SITE_URL is not set (local build, CI smoke test) the absolute tags
 * are omitted entirely and no sitemap is emitted — an omitted tag is harmless,
 * a wrong one costs SEO.
 */

const MARKER = '<!--fetchly:site-meta-->';

/** Public routes that should appear in the sitemap. Mirrors client/src/App.tsx. */
const SITEMAP_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/youtube-downloader', changefreq: 'monthly', priority: '0.8' },
  { path: '/tiktok-downloader', changefreq: 'monthly', priority: '0.8' },
  { path: '/instagram-downloader', changefreq: 'monthly', priority: '0.8' },
  { path: '/youtube-to-mp3', changefreq: 'monthly', priority: '0.7' },
  { path: '/youtube-to-mp4', changefreq: 'monthly', priority: '0.7' },
  { path: '/responsible-use', changefreq: 'yearly', priority: '0.4' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/dmca', changefreq: 'yearly', priority: '0.3' },
];

function metaTags(siteUrl: string): string {
  const og = `${siteUrl}/og-cover.png`;
  return [
    `    <link rel="canonical" href="${siteUrl}/" />`,
    `    <meta property="og:url" content="${siteUrl}/" />`,
    `    <meta property="og:image" content="${og}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:image:alt" content="Fetchly — save videos as MP4 or MP3" />`,
    `    <meta name="twitter:image" content="${og}" />`,
  ].join('\n');
}

function robotsTxt(siteUrl: string): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '# The admin console and per-session download history are not indexable.',
    'Disallow: /admin',
    'Disallow: /downloads',
    '',
  ];
  if (siteUrl) lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  return lines.join('\n') + '\n';
}

function sitemapXml(siteUrl: string): string {
  const urls = SITEMAP_ROUTES.map(
    (r) =>
      `  <url><loc>${siteUrl}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function siteMetaPlugin(): Plugin {
  let siteUrl = '';

  return {
    name: 'fetchly:site-meta',

    configResolved(config) {
      siteUrl = (config.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
      if (!siteUrl) {
        config.logger.warn(
          '\n[fetchly] VITE_SITE_URL is not set — canonical/og/twitter tags and sitemap.xml will be omitted.\n' +
            '[fetchly] Set it for production builds, e.g. VITE_SITE_URL=https://yourdomain.com\n',
        );
      }
    },

    transformIndexHtml(html) {
      if (!html.includes(MARKER)) return html;
      return html.replace(MARKER, siteUrl ? metaTags(siteUrl) : '');
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt(siteUrl),
      });
      if (siteUrl) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemapXml(siteUrl),
        });
      }
    },
  };
}
