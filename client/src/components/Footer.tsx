import { Link } from 'react-router-dom';
import { Logo } from './Logo';

const COLUMNS: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  {
    title: 'Product',
    links: [
      { to: '/#how-it-works', label: 'How it works' },
      { to: '/#platforms', label: 'Supported platforms' },
      { to: '/#faq', label: 'FAQ' },
      { to: '/downloads', label: 'My downloads' },
    ],
  },
  {
    title: 'Downloaders',
    links: [
      { to: '/youtube-downloader', label: 'YouTube downloader' },
      { to: '/tiktok-downloader', label: 'TikTok downloader' },
      { to: '/instagram-downloader', label: 'Instagram downloader' },
      { to: '/youtube-to-mp3', label: 'YouTube to MP3' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/responsible-use', label: 'Responsible use' },
      { to: '/terms', label: 'Terms of service' },
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/dmca', label: 'DMCA' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-8" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
            Fetchly helps you keep the media you love or own — paste a link, choose a format,
            download. Built for public content you have the right to save.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="text-sm text-ink-soft transition-colors hover:text-primary-dark">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Fetchly. All rights reserved.</p>
          <p>
            You are responsible for ensuring you have permission to download any content.
          </p>
        </div>
      </div>
    </footer>
  );
}
