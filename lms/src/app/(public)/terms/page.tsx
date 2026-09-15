export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold">Terms of service</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-7 text-ink-700">
        <p>By creating an account on Learnly you agree to the following. The short version: learn hard, be decent, don&apos;t cheat the checks.</p>
        <section aria-labelledby="account-h">
          <h2 id="account-h" className="pt-2 text-xl font-semibold text-ink-900">
            Accounts
          </h2>
          <p>
            Keep your credentials secure — we can&apos;t recover a leaked password on your behalf.
            One account per learner; you&apos;re responsible for activity on your account.
          </p>
        </section>
        <section aria-labelledby="content-h">
          <h2 id="content-h" className="pt-2 text-xl font-semibold text-ink-900">
            Course content
          </h2>
          <p>
            All course material (lessons, exercises, quizzes) is original content written for this
            platform. You may use it to learn; you may not republish, resell or scrape it. The
            assistant&apos;s explanations are for your personal learning use.
          </p>
        </section>
        <section aria-labelledby="assessment-h">
          <h2 id="assessment-h" className="pt-2 text-xl font-semibold text-ink-900">
            Assessments & certificates
          </h2>
          <p>
            Quizzes verify your own understanding. Answers to active graded quizzes are protected —
            using the Learning Assistant to extract quiz answers, or otherwise circumventing an
            assessment, is grounds for removing the affected progress and certificate.
          </p>
        </section>
        <section aria-labelledby="conduct-h">
          <h2 id="conduct-h" className="pt-2 text-xl font-semibold text-ink-900">
            Acceptable use
          </h2>
          <p>
            Don&apos;t abuse the platform: automated abuse, scraping, probing for vulnerabilities,
            or attempting to access other people&apos;s data (including via the assistant) is
            prohibited. We may rate-limit or suspend accounts that do.
          </p>
        </section>
        <section aria-labelledby="availability-h">
          <h2 id="availability-h" className="pt-2 text-xl font-semibold text-ink-900">
            Availability
          </h2>
          <p>
            The platform is provided as-is. Features are rolled out in phases — if something shows a
            “reserved for the next phase” note, it&apos;s on the roadmap, not a defect.
          </p>
        </section>
        <p className="pt-2 text-[13px] text-ink-500">
          This is a demonstration platform; these terms summarize how the product is intended to be used.
        </p>
      </div>
    </div>
  );
}
