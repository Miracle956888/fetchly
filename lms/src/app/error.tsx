"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-[14px] text-ink-500">
        An unexpected error occurred. Our team has been notified — please try again.
      </p>
      <Button className="mt-7" onClick={() => reset()}>
        Try again
      </Button>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-ink-400">Reference: {error.digest}</p>
      )}
    </div>
  );
}
