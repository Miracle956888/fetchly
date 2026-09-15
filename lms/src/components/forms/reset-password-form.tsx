"use client";

import * as React from "react";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    if (password !== confirm) {
      setErrors({ confirm: "Passwords do not match." });
      return;
    }
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setErrors({ password: parsed.error.issues[0]?.message ?? "Invalid input." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: parsed.data });
      setDone(true);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors({ password: fields.password ?? errorMessage(err) });
      else setTopError(errorMessage(err, "Could not reset the password."));
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="warning" title="Invalid reset link">
        This reset link is missing its token. Please request a new one.
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert variant="success" title="Password updated">
        Your password has been changed. You can now log in with your new password.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      <Field label="New password" error={errors.password} required>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />
      </Field>
      <Field label="Confirm new password" error={errors.confirm} required>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Reset password
      </Button>
    </form>
  );
}
