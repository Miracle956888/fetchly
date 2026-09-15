import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-mono text-[13px] uppercase tracking-widest text-ink-400">404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 max-w-sm text-[14px] text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist, or it may have been unpublished.
      </p>
      <div className="mt-7 flex gap-3">
        <Button href="/" variant="outline">
          Go home
        </Button>
        <Button href="/courses">Browse courses</Button>
      </div>
    </div>
  );
}
