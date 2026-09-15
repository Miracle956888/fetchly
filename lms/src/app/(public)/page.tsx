import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Code2, GraduationCap, Layers, ListChecks, Play, Target } from "lucide-react";
import { listPublishedCourses } from "@/services/course.service";
import { listCategoriesWithCounts } from "@/services/category.service";
import { getDb } from "@/db/client";
import { learningPathCourses, learningPaths } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [popular, categories, paths] = await Promise.all([
    listPublishedCourses({ sort: "popular", page: 1, perPage: 3 }),
    listCategoriesWithCounts(),
    getPaths(),
  ]);

  return (
    <>
      <Hero />
      <HowItWorks />
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

      <section className="border-y border-ink-100 bg-surface/60" aria-labelledby="categories-heading">
        <div className="container-page py-16">
          <p className="eyebrow">Explore</p>
          <h2 id="categories-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
            Course categories
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?category=${encodeURIComponent(cat.slug)}`}
                className="group rounded-card border border-ink-200/80 bg-surface p-4 shadow-card transition-colors hover:border-brand-300"
              >
                <p className="text-[14px] font-semibold text-ink-900 group-hover:text-brand-700">{cat.name}</p>
                <p className="mt-1 text-[12px] text-ink-500">
                  {cat.courseCount > 0 ? `${cat.courseCount} course${cat.courseCount === 1 ? "" : "s"}` : "Coming soon"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
            Learn to code by writing real code.
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-ink-600">
            Learnly is a structured learning platform for programming. Every course follows a
            deliberate curriculum: short explanations, hands-on practice, and quizzes that check you
            actually understand — with progress tracked at every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/courses" size="lg">
              Browse courses
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
      <div className="flex items-center gap-1.5 border-b border-ink-800 bg-ink-900 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
        <span className="ml-3 font-mono text-[11px] text-ink-400">welcome.html</span>
      </div>
      <pre className="overflow-x-auto bg-code-bg p-5 font-mono text-[13px] leading-6 text-code-text">
        <code>
          <span className="text-code-muted">&lt;!-- Your first lesson --&gt;</span>
          {"\n"}
          <span className="text-brand-300">&lt;h1&gt;</span>Hello, future developer.<span className="text-brand-300">&lt;/h1&gt;</span>
          {"\n\n"}
          <span className="text-brand-300">&lt;script&gt;</span>
          {"\n"}
          {"  "}
          <span className="text-warning-100">const</span> course = <span className="text-success-100">&quot;HTML Basics&quot;</span>;
          {"\n"}
          {"  "}
          <span className="text-warning-100">const</span> step = <span className="text-success-100">&quot;read → practice → quiz&quot;</span>;
          {"\n"}
          {"  "}console.<span className="text-brand-300">log</span>(<span className="text-success-100">&quot;</span>${"{course}"}: ${"{step}"}<span className="text-success-100">&quot;</span>);
          {"\n"}
          <span className="text-brand-300">&lt;/script&gt;</span>
        </code>
      </pre>
      <div className="border-t border-ink-800 bg-ink-900/60 px-5 py-3">
        <p className="font-mono text-[12px] text-ink-400">
          HTML Basics · Module 1 · Lesson 1 <span className="text-success-100">✓ completed</span>
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: BookOpen,
      title: "Learn the concept",
      body: "Short, focused lessons explain one idea at a time — with working examples you can read and study.",
    },
    {
      icon: Code2,
      title: "Practice it",
      body: "Each key lesson has a hands-on exercise. Read the brief, work with real code, and check your approach.",
    },
    {
      icon: ListChecks,
      title: "Prove it",
      body: "Module quizzes verify understanding with instant scoring and explanations for every answer.",
    },
  ];
  return (
    <section className="container-page py-16" aria-labelledby="how-heading">
      <div className="max-w-xl">
        <p className="eyebrow">How it works</p>
        <h2 id="how-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
          Three steps, repeated until it sticks
        </h2>
      </div>
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-card border border-ink-200/80 bg-surface p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <s.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="font-mono text-[12px] text-ink-400">0{i + 1}</span>
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-ink-600">{s.body}</p>
          </li>
        ))}
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
      title: "Curriculum, not chaos",
      body: "Topics are sequenced the way they're actually taught — fundamentals first, confidence built incrementally.",
    },
    {
      icon: Code2,
      title: "Code-first explanations",
      body: "Every concept is shown in real, runnable code. You learn by reading working examples, not abstract prose.",
    },
    {
      icon: Layers,
      title: "Progress you can see",
      body: "Lesson completion, module state and course percentage — always scoped to you, always honest.",
    },
    {
      icon: GraduationCap,
      title: "Certificates on completion",
      body: "Finish a course, pass its checks, and earn a verifiable certificate to share.",
    },
  ];
  return (
    <section className="border-y border-ink-100 bg-surface/60" aria-labelledby="why-heading">
      <div className="container-page py-16">
        <p className="eyebrow">Why Learnly</p>
        <h2 id="why-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">
          Built like a serious education platform
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.title} className="flex gap-4 rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <it.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-ink-900">{it.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-ink-600">{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstructorSection() {
  return (
    <section className="container-page py-16" aria-labelledby="instructors-heading">
      <div className="grid items-center gap-8 rounded-card border border-ink-200/80 bg-ink-900 p-8 text-white shadow-card lg:grid-cols-[1fr_auto] lg:p-10">
        <div>
          <p className="eyebrow !text-ink-400">For instructors</p>
          <h2 id="instructors-heading" className="mt-2 max-w-lg text-2xl font-semibold text-white">
            Teach your course, see your students
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-ink-300">
            Instructors manage assigned courses, review curriculum structure, and follow every
            enrolled student&apos;s progress, quiz results and activity — scoped to the courses they teach.
          </p>
        </div>
        <Button href="/login" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:border-white/40">
          Instructor login
        </Button>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page pb-4 pt-8">
      <div className="flex flex-col items-center rounded-card border border-ink-200/80 bg-surface px-6 py-12 text-center shadow-card">
        <Play className="h-6 w-6 text-brand-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">Start learning today</h2>
        <p className="mt-2 max-w-md text-[14px] text-ink-600">
          Create a free account, enroll in a course, and make your first lesson count.
        </p>
        <div className="mt-6 flex gap-3">
          <Button href="/register" size="lg">
            Get started
          </Button>
          <Button href="/courses" variant="outline" size="lg">
            Explore courses
          </Button>
        </div>
      </div>
    </section>
  );
}
