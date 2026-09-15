import { clsx } from "../../lib/clsx";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-ink-200/80 bg-surface shadow-card">
      <table className={clsx("w-full min-w-[560px] border-collapse text-left", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-ink-100 bg-ink-50/70">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx("px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500", className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={clsx("transition-colors hover:bg-ink-50/50", className)}>{children}</tr>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={clsx("px-4 py-3 text-[13px] text-ink-700", className)}>{children}</td>;
}
