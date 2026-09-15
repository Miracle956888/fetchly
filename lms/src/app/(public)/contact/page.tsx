import { Mail } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page py-12">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 text-3xl font-semibold">Get in touch</h1>
          <p className="mt-3 max-w-sm text-[14px] leading-6 text-ink-600">
            Questions about a course, a feature, or teaching on the platform? Send a message and the
            team will reply by email.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-card border border-ink-200/80 bg-surface p-4 shadow-card">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Mail className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-medium text-ink-900">support@learnly.example</p>
              <p className="text-[12px] text-ink-500">We usually reply within two working days.</p>
            </div>
          </div>
        </div>
        <div className="rounded-card border border-ink-200/80 bg-surface p-6 shadow-card">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
