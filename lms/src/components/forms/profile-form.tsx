"use client";

import * as React from "react";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import type { SafeUser } from "@/types";
import { Button } from "../ui/button";
import { Field, Input, Textarea } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";

const COUNTRIES = [
  "Australia", "Brazil", "Canada", "China", "Germany", "India", "Indonesia", "Italy", "Japan", "Mexico",
  "Netherlands", "New Zealand", "Nigeria", "Poland", "Saudi Arabia", "Singapore", "Spain", "Sweden",
  "Thailand", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
];

export function ProfileForm({ user }: { user: SafeUser }) {
  const [form, setForm] = React.useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    country: user.country ?? "",
    bio: user.bio ?? "",
    timezone: user.timezone ?? "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "form", i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/users/me", { method: "PATCH", body: parsed.data });
      setSaved(true);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setTopError(errorMessage(err, "Could not save your profile."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      {saved && <Alert variant="success">Profile saved.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName} required>
          <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name" error={errors.lastName} required>
          <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" error={errors.phone}>
          <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Country (optional)">
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} list="profile-countries" />
        </Field>
      </div>
      <datalist id="profile-countries">
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Field label="Timezone (optional)" hint="e.g. Europe/Warsaw, America/New_York">
        <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
      </Field>
      <Field label="Bio (optional)" error={errors.bio}>
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="A sentence or two about what you're learning." />
      </Field>
      <Button type="submit" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}
