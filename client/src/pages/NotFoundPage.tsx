import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <Compass className="size-10 text-primary" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to homepage</Button>
      </Link>
    </main>
  );
}
