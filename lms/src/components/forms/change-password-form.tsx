"use client";

import * as React from "react";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";

export function ChangePasswordForm() {
  const [form, setForm] = React.useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setInfo(null);
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "form", i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/change-password", { method: "POST", body: parsed.data });
      // All sessions revoked — force re-login with the new password.
      window.location.href = "/login";
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setTopError(errorMessage(err, "Could not change your password."));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      {info && <Alert variant="info">{info}</Alert>}
      <Field label="Current password" error={errors.currentPassword} required>
        <Input
          type="password"
          value={form.currentPassword}
          onChange={(e) => set("currentPassword", e.target.value)}
          autoComplete="current-password"
        />
      </Field>
      <Field
        label="New password"
        error={errors.newPassword}
        required
        hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
      >
        <Input
          type="password"
          value={form.newPassword}
          onChange={(e) => set("newPassword", e.target.value)}
          autoComplete="new-password"
        />
      </Field>
      <Button type="submit" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
