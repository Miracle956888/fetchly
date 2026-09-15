import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-[14px] text-ink-500">Log in to continue learning.</p>
        </div>
        <div className="mt-8 rounded-card border border-ink-200/80 bg-surface p-6 shadow-card sm:p-8">
          <LoginForm next={next} />
        </div>
        <p className="mt-5 text-center text-[13px] text-ink-500">
          New to Learnly?{" "}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
