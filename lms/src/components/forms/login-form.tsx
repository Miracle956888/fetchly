"use client";

import * as React from "react";
import Link from "next/link";
import { loginSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";
import { safeNextPath } from "@/lib/utils";

export function LoginForm({ next }: { next?: string }) {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const target = safeNextPath(next) ?? undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    const parsed = loginSchema.safeParse({ identifier, password, next: target });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "form", i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api<{ next: string }>("/api/auth/login", { method: "POST", body: parsed.data });
      window.location.href = res.next ?? "/";
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setTopError(errorMessage(err, "Could not log in. Check your credentials and try again."));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      <Field label="Email or username" error={errors.identifier} required>
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          autoFocus
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password" error={errors.password} required>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <Link href="/forgot-password" className="text-[13px] font-medium text-brand-700 hover:underline">
          Forgot password?
        </Link>
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none sm:px-8">
          Log in
        </Button>
      </div>
    </form>
  );
}
