import Link from "next/link";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { Button } from "../ui/button";

const publicNavLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-paper/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {publicNavLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-btn px-3 py-2 text-[14px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="/login" variant="ghost" size="sm">
            Log in
          </Button>
          <Button href="/register" size="sm">
            Get started
          </Button>
        </div>
        <MobileNav links={publicNavLinks} />
      </div>
    </header>
  );
}
