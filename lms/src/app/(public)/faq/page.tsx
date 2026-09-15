import { FaqItem } from "@/components/ui/faq-item";

export const metadata = { title: "FAQ" };

const faqs: { q: string; a: string }[] = [
  {
    q: "Is Learnly free?",
    a: "Yes. Browsing the catalog and enrolling in courses is free. This phase of the platform focuses on the learning experience — pricing and paid tiers are a later decision.",
  },
  {
    q: "Do I need an account to browse courses?",
    a: "No. Anyone can browse the catalog, read course descriptions and inspect full curricula without logging in. You only need an account to enroll, save progress and take quizzes.",
  },
  {
    q: "How are courses structured?",
    a: "Each course is organized into modules, and each module into lessons. A lesson explains one concept with working code examples. Key lessons include a hands-on exercise, and modules end with a quiz that checks your understanding.",
  },
  {
    q: "How does progress tracking work?",
    a: "Progress is measured per lesson. Completing a lesson updates your module state (Not started → In progress → Complete) and your overall course percentage. Everything is saved to your account and visible in the student dashboard.",
  },
  {
    q: "What are learning paths?",
    a: "A learning path is an ordered set of courses that build on each other — for example, HTML → CSS → JavaScript for front-end foundations. They're a guide, not a requirement; you can take any course in any order.",
  },
  {
    q: "Will I get a certificate?",
    a: "Yes — when you complete a course's requirements (lesson completion and passing its quizzes), a certificate is issued with a unique, verifiable code. The certificate engine ships in the next phase.",
  },
  {
    q: "Can I teach on the platform?",
    a: "Instructors are assigned to courses by the platform team and get a dedicated portal: curriculum management, enrolled-student lists, and per-student progress and quiz results — scoped to the courses they teach.",
  },
  {
    q: "Is my data private?",
    a: "Your progress and activity are visible to you, and (in the relevant course) to the instructors of that course and to platform administrators who operate it. We don't share learner data with third parties.",
  },
  {
    q: "Which technologies are covered?",
    a: "The current catalog covers HTML, CSS, JavaScript, Python and Node.js, with MySQL in development. New categories and courses are added over time by the platform team.",
  },
];

export default function FaqPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">FAQ</p>
      <h1 className="mt-2 text-3xl font-semibold">Frequently asked questions</h1>
      <div className="mt-8 space-y-3">
        {faqs.map((f, i) => (
          <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
