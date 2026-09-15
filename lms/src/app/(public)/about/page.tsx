export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">About Learnly</p>
      <h1 className="mt-2 text-3xl font-semibold">A place to actually learn programming</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-7 text-ink-700">
        <p>
          Learnly is a learning platform for programming education. The idea is simple: most
          programming tutorials either drown you in theory or throw code at you without context.
          Learnly sits between the two — short explanations grounded in real code, followed by
          practice, followed by a check that you understood.
        </p>
        <p>
          Every course is built around a deliberate curriculum. Topics are ordered the way they&apos;re
          actually taught: you meet a concept when you&apos;re ready for it, you use it immediately, and
          you&apos;re tested before you move on. Progress is tracked at the lesson level, so you always
          know exactly where you are in a course.
        </p>
        <h2 className="pt-4 text-xl font-semibold">Who it&apos;s for</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Complete beginners</strong> — start with HTML, CSS or Python and build from zero
            to confident, step by step.
          </li>
          <li>
            <strong>Self-taught developers</strong> — fill the gaps in your knowledge with structured
            review and checks.
          </li>
          <li>
            <strong>Students and career changers</strong> — follow a learning path end-to-end and
            finish with a certificate.
          </li>
        </ul>
        <h2 className="pt-4 text-xl font-semibold">How the platform works</h2>
        <p>
          Students enroll in courses and learn at their own pace. Instructors are assigned to
          courses and follow their students&apos; progress, quiz results and activity. Administrators
          manage the catalog, categories, users and platform health. Each role sees only what its
          responsibilities require — by design, at the database and API level, not just in the UI.
        </p>
        <h2 className="pt-4 text-xl font-semibold">Our content policy</h2>
        <p>
          All course content on Learnly — explanations, examples, exercises and quizzes — is
          originally written for the platform. We take curriculum inspiration from well-known
          teaching progressions, but we never reproduce other sites&apos; lessons.
        </p>
      </div>
    </div>
  );
}
