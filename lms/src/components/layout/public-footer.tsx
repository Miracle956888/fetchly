import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/courses", label: "Browse courses" },
      { href: "/categories", label: "Categories" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Courses",
    links: [
      { href: "/courses/html", label: "HTML" },
      { href: "/courses/css", label: "CSS" },
      { href: "/courses/javascript", label: "JavaScript" },
      { href: "/courses/python", label: "Python" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
      { href: "/student", label: "Student portal" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-ink-950 text-ink-300">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-[13px] leading-6 text-ink-400">
            Structured, code-first courses for programming. Learn by reading, practicing and being
            tested — then track every step.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-ink-300 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-[12px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Learnly. Built as a demonstration LMS — all course content is original.</p>
          <p>Phase 01 foundation · Learnly LMS</p>
        </div>
      </div>
    </footer>
  );
}
