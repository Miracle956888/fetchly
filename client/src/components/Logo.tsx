export function Logo({ className = 'h-8' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-full w-auto" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="#00C9A7" />
        <path d="M32 14v24" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M21 30l11 11 11-11"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M16 48h32" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-ink">
        Fetch<span className="text-primary-dark">ly</span>
      </span>
    </span>
  );
}
