export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold">Privacy policy</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-7 text-ink-700">
        <p>
          This policy describes what Learnly stores about you, why, and how it is used. Keep it short:
          you&apos;re here to learn, not to audit a data processor.
        </p>
        <section aria-labelledby="data-h">
          <h2 id="data-h" className="pt-2 text-xl font-semibold text-ink-900">
            What we store
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Account data</strong> — name, username, email, and an Argon2id password hash
              (plaintext passwords are never stored).
            </li>
            <li>
              <strong>Learning data</strong> — enrollments, lesson completion, quiz attempts and
              scores. This is the core purpose of the platform.
            </li>
            <li>
              <strong>Learning Assistant conversations</strong> — questions you ask and the
              assistant&apos;s replies, tied to your account and the lesson you were studying. We send
              only the learning context needed to answer (course, lesson content, your progress) —
              not passwords, session tokens or unrelated personal data. Conversations are eligible
              for deletion after 90 days of inactivity.
            </li>
            <li>
              <strong>Session data</strong> — an opaque session token (stored hashed server-side) that
              keeps you signed in for up to 30 days.
            </li>
          </ul>
        </section>
        <section aria-labelledby="use-h">
          <h2 id="use-h" className="pt-2 text-xl font-semibold text-ink-900">
            How it&apos;s used
          </h2>
          <p>
            Your learning data is visible to you, to the instructors of the courses you are enrolled
            in (for those courses only), and to platform administrators who operate the platform. We
            do not sell or share learner data with third parties, and we do not run ads.
          </p>
        </section>
        <section aria-labelledby="controls-h">
          <h2 id="controls-h" className="pt-2 text-xl font-semibold text-ink-900">
            Your controls
          </h2>
          <p>
            You can update your profile details at any time, sign out of a session from your account,
            and contact us about deleting your account and its data.
          </p>
        </section>
        <p className="pt-2 text-[13px] text-ink-500">Questions? Use the contact page — a person reads it.</p>
      </div>
    </div>
  );
}
