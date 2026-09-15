"use client";

import * as React from "react";
import { requestPasswordResetSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = requestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/request-reset", { method: "POST", body: parsed.data });
      setSent(true);
    } catch (err) {
      const fields = fieldErrors(err);
      setError(fields ? fields.email ?? errorMessage(err) : errorMessage(err, "Could not send the reset request."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" title="Check your email">
        If an account exists for that address, a password-reset link has been issued. It is valid for 1 hour.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" error={error ?? undefined} required hint="We'll send a one-time reset link to this address.">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
        />
      </Field>
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
