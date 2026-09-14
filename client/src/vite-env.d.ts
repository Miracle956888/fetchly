/// <reference types="vite/client" />

/**
 * Build-time environment for the client. Only variables prefixed with VITE_
 * are exposed to the browser bundle — never put a secret here.
 */
interface ImportMetaEnv {
  /**
   * API origin, e.g. `https://api.yourdomain.com`.
   * Leave UNSET when the frontend and API share an origin (Vite dev proxy,
   * Nginx/Docker, cPanel reverse proxy) so requests stay relative.
   */
  readonly VITE_API_ORIGIN?: string;
  /**
   * Canonical public site URL, e.g. `https://yourdomain.com`. Used to build
   * the canonical link, Open Graph/Twitter tags, robots.txt and sitemap.xml.
   * Leave unset for a local build: absolute SEO tags are then omitted rather
   * than emitted with a wrong domain.
   */
  readonly VITE_SITE_URL?: string;
  /** Public contact address shown on the DMCA page. */
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
