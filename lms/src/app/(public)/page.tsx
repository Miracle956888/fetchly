import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  GraduationCap,
  ListChecks,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { listPublishedCourses } from "@/services/course.service";
import { listCategorySections } from "@/services/category.service";
import { getDb } from "@/db/client";
import { learningPathCourses, learningPaths } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { PhaseNote } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [popular, sections, paths] = await Promise.all([
    listPublishedCourses({ sort: "popular", page: 1, perPage: 3 }),
    listCategorySections(),
    getPaths(),
  ]);

  return (
    <>
      <Hero />
      <InteractiveLearningSection />
      <section className="container-page py-16" aria-labelledby="popular-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 id="popular-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
              Popular courses
            </h2>
          </div>
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            Browse all courses <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popular.rows.map((c) => (
            <CourseCard
              key={c.id}
              title={c.title}
              slug={c.slug}
              description={c.description}
              difficulty={c.difficulty}
              durationHours={c.durationHours}
              lessonsCount={c.lessonsCount}
              enrollmentsCount={c.enrollmentsCount}
              category={c.category}
              instructorNames={c.instructorNames}
            />
          ))}
        </div>
      </section>

      <CategoriesSection sections={sections} />
      <AiAssistantSection />
      <HowItWorks />
      <LearningPathsSection paths={paths} />
      <WhySection />
      <InstructorSection />
      <FinalCta />
    </>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="border-b border-ink-100">
      <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="eyebrow">Programming, taught properly</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">
            Learn to code. Practice. Build. Grow.
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-ink-600">
            Learn programming through structured courses, hands-on practice, quizzes — and a
            Learning Assistant that explains the hard parts in context, right inside your lesson.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/courses" size="lg">
              Start learning
            </Button>
            <Button href="/register" variant="outline" size="lg">
              Create free account
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-500">
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> Structured curricula
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> Practice & quizzes
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> Progress tracking
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> AI learning assistant
            </li>
          </ul>
        </div>
        <HeroCodeCard />
      </div>
    </section>
  );
}

/** Static, hand-authored code window (no interactivity claimed). */
function HeroCodeCard() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200/80 shadow-pop" aria-hidden>
      <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-900 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        <span className="ml-2 font-mono text-[11px] text-ink-400">first-steps.js</span>
      </div>
      <pre className="overflow-x-auto bg-code-bg p-5 font-mono text-[13px] leading-7 text-code-text">
        <code>{`function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("developer"));
// → Hello, developer!`}</code>
      </pre>
      <div className="border-t border-ink-800 bg-ink-900 px-4 py-2.5">
        <span className="font-mono text-[11.5px] text-success-400">✓ understood · lesson 1 of 11</span>
      </div>
    </div>
  );
}

function InteractiveLearningSection() {
  const steps = [
    { icon: BookOpen, title: "Learn the concept", body: "Short lessons explain one idea at a time." },
    { icon: Play, title: "Study the example", body: "Working code you can read, line by line." },
    { icon: Code2, title: "Write your own", body: "Practice exercises with a brief and starter code." },
    { icon: ListChecks, title: "Get checked", body: "Quizzes verify understanding — with explanations." },
  ];
  return (
    <section className="border-b border-ink-100 bg-surface/60" aria-labelledby="interactive-heading">
      <div className="container-page py-16">
        <div className="max-w-xl">
          <p className="eyebrow">Interactive learning</p>
          <h2 id="interactive-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
            You learn programming by doing programming
          </h2>
          <p className="mt-3 text-[14.5px] leading-6 text-ink-600">
            Every lesson follows the same loop: understand, imitate, build, verify. No wall of text —
            just the next smallest step.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2.5">
                <s.icon className="h-4.5 w-4.5 text-brand-600" aria-hidden />
                <span className="font-mono text-[11.5px] text-ink-400">0{i + 1}</span>
              </div>
              <h3 className="mt-3 text-[14.5px] font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-5.5 text-ink-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <PhaseNote feature="Code runner" />
        </div>
      </div>
    </section>
  );
}

function CategoriesSection({
  sections,
}: {
  sections: Awaited<ReturnType<typeof listCategorySections>>;
}) {
  if (sections.length === 0) return null;
  return (
    <section className="container-page py-16" aria-labelledby="what-heading">
      <div className="max-w-xl">
        <p className="eyebrow">What you can learn</p>
        <h2 id="what-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
          From first markup to full-stack
        </h2>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((g) => (
          <div key={g.section} className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
            <h3 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-500">{g.label}</h3>
            <ul className="mt-3 space-y-1.5">
              {g.categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/courses?category=${encodeURIComponent(c.slug)}`}
                    className="inline-flex items-center gap-2 rounded-btn px-1 py-0.5 text-[14px] font-medium text-ink-800 transition-colors hover:text-brand-700"
                  >
                    {c.name}
                    <span className="text-[11.5px] font-normal text-ink-400">
                      {c.courseCount > 0 ? `${c.courseCount} course${c.courseCount === 1 ? "" : "s"}` : "soon"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex flex-col justify-center rounded-card border border-dashed border-ink-200 bg-ink-50/50 p-5">
          <p className="text-[13.5px] leading-6 text-ink-600">
            New categories and courses are added by the platform team over time — the catalog is
            data-driven, so what you see here is always the live catalog.
          </p>
          <Link href="/categories" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
            All categories <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AiAssistantSection() {
  const examples = [
    "“Why isn't my form submitting?”",
    "“Can you explain Flexbox in simpler words?”",
    "“Give me a practice question on this lesson.”",
    "“I'm getting a ReferenceError — what's wrong?”",
  ];
  return (
    <section className="border-y border-ink-100 bg-ink-950 text-ink-200" aria-labelledby="ai-heading">
      <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow text-brand-300">Learning Assistant</p>
          <h2 id="ai-heading" className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Stuck on a concept? Ask in the moment
          </h2>
          <p className="mt-4 max-w-md text-[14.5px] leading-7 text-ink-300">
            Inside every lesson, your Learning Assistant knows exactly what you&apos;re studying —
            the course, the module, the lesson, your progress. It explains concepts, shows
            examples, sets practice questions, and helps you debug code. It teaches; it doesn&apos;t
            do the homework for you.
          </p>
          <div className="mt-7">
            <Button href="/courses" size="lg">
              Try it in a course
            </Button>
          </div>
        </div>
        <div className="rounded-card border border-ink-800 bg-ink-900/70 p-5" aria-label="Example questions for the Learning Assistant">
          <div className="flex items-center gap-2 border-b border-ink-800 pb-3">
            <Sparkles className="h-4 w-4 text-brand-400" aria-hidden />
            <span className="text-[13px] font-semibold text-ink-100">Ask your Learning Assistant</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {examples.map((q) => (
              <li key={q} className="flex justify-end">
                <span className="max-w-[85%] rounded-card rounded-br-sm bg-brand-600/25 px-3.5 py-2 text-[13px] leading-5 text-ink-100 ring-1 ring-inset ring-brand-500/30">
                  {q}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-ink-800 pt-3 text-[12px] leading-5 text-ink-400">
            Available in the student portal, inside every lesson.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Create an account", body: "Free, in under a minute — no card, no friction." },
    { title: "Choose a course", body: "Start where you are: a first course, or a full path." },
    { title: "Learn the lessons", body: "Short explanations with working examples, in teaching order." },
    { title: "Practice", body: "Hands-on exercises on the key lessons of every course." },
    { title: "Take the quizzes", body: "Check your understanding — with instant scoring and explanations." },
    { title: "Track your progress", body: "Lesson-level progress on your dashboard, every course." },
    { title: "Complete the course", body: "Finish the requirements and earn your certificate." },
  ];
  return (
    <section className="container-page py-16" aria-labelledby="how-heading">
      <div className="max-w-xl">
        <p className="eyebrow">How it works</p>
        <h2 id="how-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
          Seven steps from zero to done
        </h2>
      </div>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
            <span className="font-mono text-[12px] text-brand-600">0{i + 1}</span>
            <h3 className="mt-2 text-[14.5px] font-semibold text-ink-900">{s.title}</h3>
            <p className="mt-1.5 text-[13px] leading-5.5 text-ink-600">{s.body}</p>
          </li>
        ))}
        <li className="flex items-center justify-center rounded-card border border-dashed border-ink-200 p-5">
          <Link href="/register" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700 hover:underline">
            Start step 1 now <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </li>
      </ol>
    </section>
  );
}

async function getPaths() {
  const db = await getDb();
  const paths = await db
    .select()
    .from(learningPaths)
    .orderBy(asc(learningPaths.sortOrder))
    .limit(2);
  if (paths.length === 0) return [];
  const out: { id: string; title: string; slug: string; description: string | null; courseCount: number }[] = [];
  for (const p of paths) {
    const entries = await db
      .select()
      .from(learningPathCourses)
      .where(eq(learningPathCourses.learningPathId, p.id))
      .orderBy(asc(learningPathCourses.sortOrder));
    out.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      courseCount: entries.length,
    });
  }
  return out;
}

function LearningPathsSection({
  paths,
}: {
  paths: { id: string; title: string; slug: string; description: string | null; courseCount: number }[];
}) {
  if (paths.length === 0) return null;
  return (
    <section className="container-page py-16" aria-labelledby="paths-heading">
      <p className="eyebrow">Learning paths</p>
      <h2 id="paths-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
        Follow a path, not a pile of courses
      </h2>
      <div className="mt-8 space-y-5">
        {paths.map((p) => (
          <div key={p.id} className="rounded-card border border-ink-200/80 bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-ink-900">{p.title}</h3>
              <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[11.5px] font-medium text-ink-600 ring-1 ring-inset ring-ink-200/70">{p.courseCount} courses</span>
            </div>
            {p.description && <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-ink-600">{p.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function WhySection() {
  const items = [
    {
      icon: Target,
      title: "Structured learning",
      body: "Every course is a deliberate curriculum — topics arrive in teaching order, not a random pile of videos.",
    },
    {
      icon: Code2,
      title: "Interactive practice",
      body: "Key lessons come with hands-on exercises: a brief, starter code and the behavior you're aiming for.",
    },
    {
      icon: ListChecks,
      title: "Quizzes that explain",
      body: "Instant scoring with an explanation for every answer — you learn from the check itself.",
    },
    {
      icon: BookOpen,
      title: "Self-paced",
      body: "Your progress is saved at the lesson level. Stop and come back exactly where you were.",
    },
    {
      icon: Sparkles,
      title: "AI assistance",
      body: "A Learning Assistant that knows your course, lesson and progress — for when a concept resists.",
    },
    {
      icon: Trophy,
      title: "Proof of progress",
      body: "Finish a course's requirements and a verifiable certificate marks it. No vague badges.",
    },
  ];
  return (
    <section className="border-t border-ink-100 bg-surface/60" aria-labelledby="why-heading">
      <div className="container-page py-16">
        <div className="max-w-xl">
          <p className="eyebrow">Why Learnly</p>
          <h2 id="why-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
            Built for people who want to actually get good
          </h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-card border border-ink-200/80 bg-surface p-6 shadow-card">
              <it.icon className="h-5 w-5 text-brand-600" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold text-ink-900">{it.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-6 text-ink-600">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstructorSection() {
  return (
    <section className="container-page py-16" aria-labelledby="instructor-heading">
      <div className="grid items-center gap-8 rounded-card border border-ink-200/80 bg-surface p-8 shadow-card lg:grid-cols-[1fr_auto] sm:p-10">
        <div>
          <p className="eyebrow">For instructors</p>
          <h2 id="instructor-heading" className="mt-2 text-xl font-semibold sm:text-2xl">
            Teaching on Learnly
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-ink-600">
            Instructors get a dedicated portal: the courses they teach, their enrolled students,
            per-student progress and quiz results — scoped strictly to their assignments.
            Platform administrators manage the catalog, categories and users.
          </p>
        </div>
        <GraduationCap className="hidden h-16 w-16 text-brand-200 lg:block" aria-hidden />
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-ink-100">
      <div className="container-page flex flex-col items-center py-16 text-center sm:py-20">
        <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">Start your learning journey</h2>
        <p className="mt-4 max-w-md text-[15px] leading-7 text-ink-600">
          Pick a course, create a free account, and finish your first lesson today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/courses" size="lg">
            Explore courses
          </Button>
          <Button href="/register" variant="outline" size="lg">
            Create free account
          </Button>
        </div>
      </div>
    </section>
  );
}
