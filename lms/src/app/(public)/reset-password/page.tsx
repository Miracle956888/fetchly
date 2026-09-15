import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
          <p className="mt-2 text-[14px] text-ink-500">
            After updating, you&apos;ll be able to log in with the new password.
          </p>
        </div>
        <div className="mt-8 rounded-card border border-ink-200/80 bg-surface p-6 shadow-card sm:p-8">
          <ResetPasswordForm token={token ?? null} />
        </div>
      </div>
    </div>
  );
}
