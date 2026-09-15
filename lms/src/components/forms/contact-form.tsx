"use client";

import * as React from "react";
import { contactSchema } from "@/lib/validation/schemas";
import { Button } from "../ui/button";
import { Field, Input, Textarea } from "../ui/field";
import { Alert } from "../ui/alert";
import { api, errorMessage, fieldErrors } from "./client-api";

export function ContactForm() {
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "form", i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/contact", { method: "POST", body: parsed.data });
      setSent(true);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setTopError(errorMessage(err, "Could not send your message. Please try again later."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" title="Message sent">
        Thanks for reaching out — the team will get back to you by email.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {topError && <Alert variant="danger">{topError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name} required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email} required>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
        </Field>
      </div>
      <Field label="Subject (optional)">
        <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Question about a course" />
      </Field>
      <Field label="Message" error={errors.message} required>
        <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="How can we help?" />
      </Field>
      <Button type="submit" loading={loading} size="lg">
        Send message
      </Button>
    </form>
  );
}
