import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-[14px] text-ink-500">
            Enter the email you registered with and we&apos;ll issue a one-time reset link.
          </p>
        </div>
        <div className="mt-8 rounded-card border border-ink-200/80 bg-surface p-6 shadow-card sm:p-8">
          <ForgotPasswordForm />
        </div>
        <p className="mt-5 text-center text-[13px] text-ink-500">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
