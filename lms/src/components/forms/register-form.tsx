"use client";

import * as React from "react";
import Link from "next/link";
import { registerSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input, Select } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, ApiRequestError, errorMessage, fieldErrors } from "./client-api";

const COUNTRIES = [
  "Afghanistan", "Albania", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahrain", "Bangladesh",
  "Belarus", "Belgium", "Bolivia", "Brazil", "Bulgaria", "Canada", "Chile", "China", "Colombia", "Croatia", "Czechia",
  "Denmark", "Egypt", "Estonia", "Finland", "France", "Georgia", "Germany", "Greece", "Hungary", "India", "Indonesia",
  "Ireland", "Israel", "Italy", "Japan", "Kazakhstan", "Latvia", "Lithuania", "Luxembourg", "Malaysia", "Mexico",
  "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland",
  "Portugal", "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Thailand", "Turkey", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uzbekistan", "Vietnam", "Zimbabwe",
];

export function RegisterForm() {
  const [form, setForm] = React.useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    country: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "form", i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/register", { method: "POST", body: parsed.data });
      window.location.href = "/student";
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else if (err instanceof ApiRequestError && err.apiError.code === "CONFLICT") setTopError(errorMessage(err));
      else setTopError(errorMessage(err, "Could not create your account. Please try again."));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      <Field label="Full name" error={errors.fullName} required>
        <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" placeholder="Sam Rivera" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" error={errors.username} required hint="3–30 chars: letters, numbers, - and _">
          <Input value={form.username} onChange={(e) => set("username", e.target.value)} autoComplete="username" placeholder="samr" />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
      </div>
      <Field
        label="Password"
        error={errors.password}
        required
        hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
      >
        <Input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          autoComplete="new-password"
          placeholder="Create a strong password"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" error={errors.phone}>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
            placeholder="+1 555 000 1234"
          />
        </Field>
        <Field label="Country (optional)">
          <Select value={form.country} onChange={(e) => set("country", e.target.value)}>
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Create account
      </Button>
      <p className="text-center text-[13px] text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
