import { Download, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDownloads } from '../contexts/DownloadsContext';
import { Button } from './ui/Button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const SECTION_LINKS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'platforms', label: 'Supported Platforms' },
  { id: 'faq', label: 'FAQ' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { downloads } = useDownloads();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const goToSection = (id: string) => {
    setOpen(false);
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-card/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Fetchly home" className="shrink-0">
          <Logo className="h-8" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => goToSection(link.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/downloads"
            className="relative rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
          >
            Downloads
            {downloads.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {downloads.length}
              </span>
            )}
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button
            size="sm"
            onClick={() => {
              if (location.pathname === '/') {
                document.getElementById('url-input')?.focus();
              } else {
                navigate('/', { state: { scrollTo: 'top' } });
              }
            }}
            icon={<Download className="size-4" aria-hidden="true" />}
          >
            Start Download
          </Button>
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-ink hover:bg-surface"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-card px-4 pb-4 pt-2 md:hidden">
          {SECTION_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => goToSection(link.id)}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-ink hover:bg-surface"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/downloads"
            className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-surface"
          >
            Downloads {downloads.length > 0 ? `(${downloads.length})` : ''}
          </Link>
          <Button full className="mt-2" onClick={() => goToSection('top')}>
            Start Download
          </Button>
        </div>
      )}
    </header>
  );
}
