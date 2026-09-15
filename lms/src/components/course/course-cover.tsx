import { clsx } from "@/lib/clsx";

/**
 * Deterministic flat "course cover" generated from the course title +
 * category. No binary assets, no remote images — a geometric composition in
 * the category's hue, consistent across the platform.
 */

const HUES: Record<string, [string, string]> = {
  // name → [bg, fg]
  html: ["#FBE9E7", "#BF3B36"],
  css: ["#E7F0FB", "#2B54AE"],
  "tailwind css": ["#EAF7F4", "#0F766E"],
  javascript: ["#FBF3E0", "#92600A"],
  "node.js": ["#EAF5EE", "#256A42"],
  "express.js": ["#EFEAFB", "#5B47A8"],
  apis: ["#E8F4FB", "#0E6E9E"],
  mysql: ["#FBEFF3", "#A83A5C"],
  mongodb: ["#EAF5EE", "#256A42"],
  postgresql: ["#E9EEF9", "#3450A8"],
  python: ["#E9F2FB", "#2456A0"],
  "c++": ["#EDEDF2", "#3C4A5D"],
  general: ["#F1F3F6", "#67758A"],
};

function hueFor(category: string | undefined): [string, string] {
  if (!category) return HUES.general;
  const key = Object.keys(HUES).find((k) => category.toLowerCase().includes(k) || k.includes(category.toLowerCase()));
  return key ? HUES[key] : HUES.general;
}

export function CourseCover({ title, category, className }: { title: string; category: string; className?: string }) {
  const [bg, fg] = hueFor(category);
  // Deterministic layout variant from the title so covers differ per course.
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const variant = hash % 3;

  return (
    <div className={clsx("flex h-full w-full items-center justify-center", className)} style={{ backgroundColor: bg }} aria-hidden>
      <svg viewBox="0 0 280 112" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {variant === 0 && (
          <g fill="none" stroke={fg} strokeWidth="1.5" opacity="0.35">
            <circle cx="40" cy="96" r="46" />
            <circle cx="40" cy="96" r="30" />
            <rect x="200" y="-18" width="56" height="56" transform="rotate(18 228 10)" />
          </g>
        )}
        {variant === 1 && (
          <g stroke={fg} strokeWidth="1.5" opacity="0.35">
            <path d="M-10 90 L 60 20 L 130 90 L 200 20 L 290 90" fill="none" />
            <circle cx="236" cy="30" r="26" fill="none" />
          </g>
        )}
        {variant === 2 && (
          <g fill={fg} opacity="0.18">
            <rect x="24" y="18" width="10" height="76" rx="2" />
            <rect x="44" y="34" width="10" height="60" rx="2" />
            <rect x="64" y="8" width="10" height="86" rx="2" />
            <rect x="196" y="40" width="10" height="54" rx="2" />
            <rect x="216" y="24" width="10" height="70" rx="2" />
            <rect x="236" y="52" width="10" height="42" rx="2" />
          </g>
        )}
        <text
          x="140"
          y="64"
          textAnchor="middle"
          fontFamily="Sora Variable, Inter Variable, sans-serif"
          fontSize="17"
          fontWeight="600"
          letterSpacing="0.08em"
          fill={fg}
          opacity="0.9"
        >
          {title.length > 18 ? title.slice(0, 17).toUpperCase() + "…" : title.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
