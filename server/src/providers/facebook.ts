import { YtDlpProvider } from './base.js';

const HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'fb.com',
]);

/**
 * Registered but not yet enabled: `implemented` stays false until the
 * provider has been verified end-to-end. The registry refuses analysis for
 * unimplemented providers with a clear PLATFORM_DISABLED error.
 */
export class FacebookProvider extends YtDlpProvider {
  slug = 'facebook';
  name = 'Facebook';
  override implemented = false;

  matches(hostname: string): boolean {
    return HOSTS.has(hostname);
  }
}
