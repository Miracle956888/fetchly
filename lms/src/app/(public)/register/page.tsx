import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Create your account</h1>
          <p className="mt-2 text-[14px] text-ink-500">
            Free forever. Enroll in courses and start tracking your progress.
          </p>
        </div>
        <div className="mt-8 rounded-card border border-ink-200/80 bg-surface p-6 shadow-card sm:p-8">
          <RegisterForm />
        </div>
        <p className="mt-5 text-center text-[13px] text-ink-500">
          Already have an account?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
