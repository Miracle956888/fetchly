/**
 * Built-in rule-based tutor provider ("learnly-tutor").
 *
 * A deterministic, dependency-free tutor that grounds every answer in the
 * student's actual lesson content (course → module → lesson), adapts to the
 * course difficulty level, and follows the teaching policy:
 *
 *   - explain concepts, then give a small example, then a tiny question
 *   - give hints instead of full answers; break problems into steps
 *   - help debug code WITHOUT claiming anything was executed
 *   - never reveal answers for an active graded quiz
 *
 * This module is PURE (no DB, no network) so it is fully unit-testable and
 * swappable for a hosted-model provider behind the same interface.
 */
import type { AiTutorProvider, LearningContext, TutorRequest, TutorResponse } from "./provider";

const MAX_CONTENT_CHARS = 6000;

// ─── Content extraction ────────────────────────────────────────────────────

interface LessonDigest {
  topic: string;
  headings: string[];
  intro: string | null;
  codeBlocks: string[];
  keySentences: string[];
}

function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr.length === 0 ? (undefined as unknown as T) : arr[seed % arr.length];
}

function extractDigest(context: LearningContext): LessonDigest | null {
  const lesson = context.lesson;
  if (!lesson || !lesson.content.trim()) return null;
  const content = lesson.content.slice(0, MAX_CONTENT_CHARS);
  const lines = content.split("\n");

  const headings: string[] = [];
  const codeBlocks: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        codeBlocks.push(codeBuf.join("\n").trim());
        codeBuf = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      headings.push(h[1].trim());
    }
  }

  // Intro: first plain paragraph after the first heading (fallback: first paragraph).
  let intro: string | null = null;
  let sawHeading = false;
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      sawHeading = true;
      continue;
    }
    if (sawHeading && line.trim() && !line.startsWith(">") && !line.startsWith("-") && !line.startsWith("1.") && !line.startsWith("`")) {
      intro = line.trim();
      break;
    }
  }
  if (!intro) {
    for (const line of lines) {
      if (line.trim() && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("-") && !line.startsWith("```")) {
        intro = line.trim();
        break;
      }
    }
  }

  // Key sentences: shortish, information-bearing lines (not headings, lists, quotes, code).
  const keySentences: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.length >= 40 && t.length <= 260 && !t.startsWith("#") && !t.startsWith(">") && !t.startsWith("-") && !t.startsWith("```") && !/^\d+\.\s/.test(t)) {
      keySentences.push(t.replace(/\*\*/g, "").replace(/`/g, ""));
    }
    if (keySentences.length >= 6) break;
  }

  return {
    topic: lesson.title,
    headings,
    intro,
    codeBlocks: codeBlocks.slice(0, 2),
    keySentences,
  };
}

// ─── Intent detection ──────────────────────────────────────────────────────

export type TutorIntent =
  | "explain"
  | "example"
  | "hint"
  | "practice"
  | "practice-followup"
  | "solution-request"
  | "debug"
  | "what-next"
  | "quiz-help"
  | "greeting"
  | "general";

export function detectIntent(message: string, historyHasPracticeQuestion: boolean): TutorIntent {
  const m = message.toLowerCase();

  if (/(quiz).*(answer|correct option|solution)|answer.*(quiz)|which (is|one is) (correct|right)/.test(m)) return "quiz-help";
  if (/(full|complete|entire).*(answer|solution|code)|just (give|do) (me )?(the )?(answer|solution|code)|solve it for me|do it for me|write the whole/.test(m)) return "solution-request";
  if (/\b(hint|nudge|small push)\b/.test(m)) return "hint";
  if (/(practice question|test me|quiz me|give me (a|some) question|another question)/.test(m)) return "practice";
  if (historyHasPracticeQuestion && /(solution|show me the answer|how (do|would) i solve)/.test(m)) return "practice-followup";
  if (/```|error|exception|traceback|not working|doesn'?t work|isn'?t working|why (is|am i) (my|it|this)|getting this|stack (overflow|trace)/.test(m)) return "debug";
  if (/(what (should i|do i) learn (next|before)|what'?s next|what comes next|where do i go from)/.test(m)) return "what-next";
  if (/(another )?example|show me (how|an example)|demonstrate/.test(m)) return "example";
  if (/(^|\s)(hi|hello|hey|thanks?|thank you|ok(ay)?|good)\b/.test(m) && m.length < 30) return "greeting";
  if (/(explain|what is|what are|what does|why (do|does|is|are)|how (does|do|is|are)|simpler|confused|don'?t understand|doesn'?t make sense)/.test(m)) return "explain";
  return "general";
}

// ─── Reply builders ────────────────────────────────────────────────────────

function codeFence(lang: string | null, code: string): string {
  return `\n\`\`\`${lang ?? ""}\n${code.trim()}\n\`\`\``;
}

function firstCodeExample(digest: LessonDigest): { lang: string | null; code: string } | null {
  if (digest.codeBlocks.length === 0) return null;
  return { lang: null, code: digest.codeBlocks[0] };
}

function buildExplain(context: LearningContext, digest: LessonDigest | null, seed: number): string {
  const lesson = context.lesson;
  const difficulty = context.course?.difficulty ?? "beginner";
  const parts: string[] = [];

  if (digest) {
    parts.push(`Let's break down **${digest.topic}**${context.course ? ` from the ${context.course.title} course` : ""}.`);
    if (digest.intro) parts.push(digest.intro);
    if (digest.keySentences.length > 0) parts.push(pick(digest.keySentences, seed));
    const ex = firstCodeExample(digest);
    if (ex && ex.code) {
      parts.push("Here's the core pattern from the lesson:");
      parts.push(codeFence(context.lesson?.language ?? null, ex.code));
    }
  } else if (lesson) {
    parts.push(`Here's the short version of **${lesson.title}**:`);
    parts.push(`This lesson is part of ${context.module ? `the "${context.module.title}" module` : "the course"}. Read the lesson panel and try the example — the concept sticks when you build it once yourself.`);
  } else if (context.course) {
    parts.push(`You're in **${context.course.title}**. Tell me which lesson or concept you want to work through and I'll explain it step by step.`);
  } else {
    parts.push("I'm your Learning Assistant. Open a lesson and ask me to explain anything you read — the more specific, the better I can help.");
  }

  // Beginner level → analogy + check-in question.
  if (difficulty === "beginner") {
    const checks = [
      "In your own words, what do you think the main idea is? Even a rough guess is fine.",
      "Quick check: if you had to explain this to a friend in one sentence, what would you say?",
      "One small question for you: what part of this do you feel least confident about?",
    ];
    parts.push(pick(checks, seed));
  } else if (difficulty === "advanced") {
    parts.push("Now stress-test it: what breaks this approach at scale, and how would you design around that?");
  } else {
    parts.push("Try applying it: write a few lines using this idea, and I'll check your approach.");
  }
  return parts.join("\n\n");
}

function buildExample(context: LearningContext, digest: LessonDigest | null, seed: number): string {
  const parts: string[] = [];
  const ex = digest ? firstCodeExample(digest) : null;
  if (digest && ex && ex.code) {
    parts.push(`Here's a working example from the **${digest.topic}** lesson:`);
    parts.push(codeFence(context.lesson?.language ?? null, ex.code));
    const explainers = [
      "Notice how small the example is — start there, change one thing, and see what happens.",
      "This is the minimal shape. Your version can start exactly here and grow from it.",
    ];
    parts.push(pick(explainers, seed));
    parts.push("Want me to walk through what each line does?");
  } else if (digest) {
    const h = pick(digest.headings.length > 0 ? digest.headings : [digest.topic], seed);
    parts.push(`A quick ${context.lesson?.language ?? "code"} example around **${h.toLowerCase()}**: start with the smallest thing that works, run it, then extend it by one step.`);
    if (digest.intro) parts.push(`Key idea from the lesson: ${digest.intro}`);
    parts.push("Tell me what you build and I'll review your approach.");
  } else if (context.lesson) {
    parts.push(`For **${context.lesson.title}**, the lesson itself contains a hands-on example — scroll to the code block and type it out. That's the fastest way to build the mental model.`);
    parts.push("Paste your version here and I'll help you improve it.");
  } else {
    parts.push("Open a lesson and I'll pull a concrete example from its content to work through with you.");
  }
  return parts.join("\n\n");
}

function buildPracticeQuestion(context: LearningContext, digest: LessonDigest | null, seed: number): string {
  const lesson = context.lesson;
  const topic = digest?.topic ?? lesson?.title ?? context.course?.title ?? "today's topic";
  const topicLower = topic.toLowerCase();
  const templates: string[] = [];

  if (digest?.codeBlocks.length) {
    const ex = firstCodeExample(digest);
    if (ex) {
      templates.push(
        `**Practice question**\n\nRebuild the pattern from this lesson from memory, then change it in one small way (add a value, rename something, tweak one rule) and predict what changes before you run it.\n\nReference shape:\n${codeFence(context.lesson?.language ?? null, ex.code)}\n\nTry it yourself before asking for a hint.`,
      );
    }
  }
  if (context.course) {
    templates.push(
      `**Practice question**\n\nWrite a small example that uses **${topicLower}** in a brand-new project (don't copy the lesson's code). Give it a different name and one extra element. Run it, then tell me what you had to change and why.`,
    );
    templates.push(
      `**Practice question**\n\nTake the **${topicLower}** example from the lesson and break it on purpose — remove one part. Explain, in one sentence, what broke and why that part was necessary.`,
    );
    templates.push(
      `**Practice question**\n\nExplain **${topicLower}** as if I'm a beginner who has only seen the first half of this course. Then write 3–5 lines of code that prove your explanation is right.`,
    );
  }
  if (templates.length === 0) {
    templates.push(
      `**Practice question**\n\nOpen a lesson in **${context.course?.title ?? "your course"}** and pick one concept from it. Write a tiny example that demonstrates it without looking at the lesson's code. Tell me when you're done and I'll ask you two follow-up questions.`,
    );
  }
  return pick(templates, seed);
}

function buildHint(context: LearningContext, digest: LessonDigest | null, seed: number): string {
  const topic = digest?.topic ?? context.lesson?.title ?? "the problem";
  const hints = [
    `**Hint (small)**\n\nStart by writing the *structure* first — don't worry about the details yet. For **${topic.toLowerCase()}**, what is the one thing that has to exist for anything else to work?`,
    `**Hint**\n\nIgnore the full problem for a moment. Write the smallest possible version that runs — even if it does almost nothing. Then add one feature at a time and test after each one. Which single piece are you stuck on?`,
    `**Hint**\n\nRead the lesson's example line by line and mark each line with *what it does in plain words*. Usually the missing piece is the line you'd skip. Which line doesn't make sense yet?`,
  ];
  const base = pick(hints, seed);
  if (digest?.headings.length) {
    const h = pick(digest.headings, seed);
    return `${base}\n\n(If you're lost, the "${h}" section of the lesson is the one to re-read first.)`;
  }
  return base;
}

function buildSolutionRequest(context: LearningContext, digest: LessonDigest | null, _seed: number): string {
  const topic = digest?.topic ?? context.lesson?.title ?? "this exercise";
  const parts: string[] = [
    `I'm not going to hand you the finished answer — typing it out yourself is where the learning actually happens. Here's a path instead:`,
  ];
  if (digest) {
    parts.push(`**Step 1 — concept.** ${digest.intro ?? `Re-read the "${topic}" lesson until the main idea is clear.`}`);
    const ex = firstCodeExample(digest);
    if (ex) {
      parts.push(`**Step 2 — the shape.** Study the pattern, don't copy it yet:\n${codeFence(context.lesson?.language ?? null, ex.code)}`);
    }
    parts.push("**Step 3 — your turn.** Write the first *quarter* of your solution — just the skeleton that runs. Paste it here and I'll check it and give you the next hint.");
  } else {
    parts.push(`**Step 1.** Re-read the **${topic.toLowerCase()}** lesson and write down, in your own words, the one idea you must use.`);
    parts.push("**Step 2.** Write the skeleton — the smallest runnable version. Paste it here and I'll check it, then you build the rest.");
  }
  parts.push("That's the deal: I'll check every step and nudge you when you're stuck — but the typing is yours.");
  return parts.join("\n\n");
}

function buildPracticeFollowup(context: LearningContext, digest: LessonDigest | null, _seed: number): string {
  // "Appropriate learning interaction" has happened (they engaged with the
  // practice question). Now show the solution WITH explanation.
  const ex = digest ? firstCodeExample(digest) : null;
  const topic = digest?.topic ?? context.lesson?.title ?? "the exercise";
  const parts: string[] = [
    `Good — you gave it a real try, so here's a worked example for **${topic.toLowerCase()}**, with the *why* attached:`,
  ];
  if (ex) {
    parts.push(codeFence(context.lesson?.language ?? null, ex.code));
    parts.push("Line-by-line, that's what's happening: " + (digest?.keySentences[0] ?? "each piece has one job — identify the job of each line in your version."));
  } else {
    parts.push("Compare the lesson's example against yours: what was the first difference, and what did it change?");
  }
  parts.push("Now do one small variation of your own — that's the step that makes it yours.");
  return parts.join("\n\n");
}

interface DebugFinding {
  match: string;
  explain: string;
  fix: string;
  avoid: string;
}

const JS_DEBUG: { pattern: RegExp; f: DebugFinding }[] = [
  {
    pattern: /is not defined/i,
    f: {
      match: "ReferenceError: something is not defined",
      explain: "Your code uses a name that doesn't exist yet — usually a typo, the wrong case, or using a variable before declaring it.",
      fix: "Check the exact spelling and capitalization, and make sure the `const`/`let`/`function` line appears before you use it.",
      avoid: "When you see 'not defined', search the file for the name — you'll find zero declarations. That's your clue.",
    },
  },
  {
    pattern: /is not a function/i,
    f: {
      match: "TypeError: something is not a function",
      explain: "You called `something()` but that value isn't a function — often a typo of a method name, or you're calling the result of a function instead of the function itself.",
      fix: "Log the value right before the call (`console.log(typeof x)`) to see what it actually is, then fix the name.",
      avoid: "Method names are case-sensitive in JS: `push` works, `Push` does not.",
    },
  },
  {
    pattern: /cannot read propert|of undefined|of null/i,
    f: {
      match: "Cannot read properties of undefined/null",
      explain: "You reached into an object that was empty at that moment — a typo in a property name, or you used the value before it was assigned.",
      fix: "Add a guard before the access: `if (data?.items) { ... }`, or log the object to see its real shape.",
      avoid: "Optional chaining (`obj?.prop`) prevents this whole class of crashes.",
    },
  },
  {
    pattern: /unexpected token|unterminated|missing ( )?(;|}|\)|')/i,
    f: {
      match: "SyntaxError (unexpected token / missing bracket)",
      explain: "The code can't be parsed — an unbalanced bracket, a missing quote, or a stray character.",
      fix: "The error line points near (not always at) the problem. Count your `{ }` `( )` and quotes from the top of the function.",
      avoid: "An editor with bracket matching catches this before you run it — use one.",
    },
  },
];

const HTML_DEBUG: { pattern: RegExp; f: DebugFinding }[] = [
  {
    pattern: /form.*(submit|send)/i,
    f: {
      match: "form not submitting",
      explain: "A form submits only when it has somewhere to go and a real submit trigger: `action` + `method` on the `<form>`, and a `<button type=\"submit\">` (or a plain submit button) *inside* the form.",
      fix: "Check all three: the form tag has action and method, the button is INSIDE the form tags, and its type is `submit`.",
      avoid: "A `<button>` outside the form — or with `type=\"button\"` — never submits it.",
    },
  },
  {
    pattern: /img|image.*(show|load|appear)/i,
    f: {
      match: "image not showing",
      explain: "Browsers load `src` relative to the page — if the file isn't at that path (or the extension is wrong), nothing appears, and usually no error shows.",
      fix: "Open the image URL directly in a new tab (right-click → open image in new tab). If it 404s, fix the path — check spelling and capitalization.",
      avoid: "Relative paths are the #1 image bug. Make the path explicit and test it in the tab first.",
    },
  },
  {
    pattern: /page|html|markup.*(look|broken|wrong)/i,
    f: {
      match: "markup not rendering as expected",
      explain: "Browsers are forgiving and silently 'fix' broken nesting — a missing closing tag usually shifts everything below it.",
      fix: "Validate the nesting: every opening tag has exactly one matching closing tag, and elements are inside elements (not broken across each other).",
      avoid: "Use the browser's Elements panel — the outline view shows broken nesting instantly.",
    },
  },
];

const CSS_DEBUG: { pattern: RegExp; f: DebugFinding }[] = [
  {
    pattern: /not (applying|working|showing)|no( thing)? happens|style.*(ignore|apply)/i,
    f: {
      match: "CSS rule not applying",
      explain: "Three usual suspects: the selector doesn't match the element, a more specific rule wins, or the stylesheet isn't loaded at all.",
      fix: "Open DevTools → Elements, select the element, and look at which rules are listed and which are crossed out. That tells you exactly which selector won.",
      avoid: "Don't fight specificity with `!important` first — understand which selector wins, then pick a precise one.",
    },
  },
  {
    pattern: /center|middle|align/i,
    f: {
      match: "centering not working",
      explain: "Centering depends on *which* box model you're in: flexbox centers with `justify-content`/`align-items`; plain block flow needs `margin: 0 auto` (and a width).",
      fix: "Make the parent a flex container (`display: flex`) and set `justify-content: center` (horizontal) and `align-items: center` (vertical) — that's the modern default answer.",
      avoid: "Pick one centering strategy per layout — mixing margin tricks with flexbox confuses both of you.",
    },
  },
];

const PYTHON_DEBUG: { pattern: RegExp; f: DebugFinding }[] = [
  {
    pattern: /indentationerror/i,
    f: {
      match: "IndentationError",
      explain: "Python uses indentation as syntax — mixed tabs and spaces, or an inconsistent indent level, breaks the file.",
      fix: "Select the block and re-indent it with spaces only (4 per level). Most editors can 'convert tabs to spaces'.",
      avoid: "Set your editor to 'insert spaces on tab' for Python files once — then the error can't appear.",
    },
  },
  {
    pattern: /nameerror|is not defined/i,
    f: {
      match: "NameError: name is not defined",
      explain: "The name doesn't exist in the current scope — a typo, a variable defined in a different function, or code that runs before the assignment.",
      fix: "Check the spelling, and check the line order: in Python, a name exists only *after* its line has run.",
      avoid: "If you reference a value before computing it, that's the bug — move the assignment up.",
    },
  },
  {
    pattern: /modulenotfounderror|no module named/i,
    f: {
      match: "ModuleNotFoundError",
      explain: "Python can't find that module — it isn't installed in this environment, or the name is wrong (case matters).",
      fix: "Run `pip install <module>` in the same environment you're running the script from.",
      avoid: "Match the environment: the same venv that runs the code is the one you install into.",
    },
  },
  {
    pattern: /typeerror/i,
    f: {
      match: "TypeError",
      explain: "An operation got the wrong kind of value — the classic Python case is mixing strings and numbers (`\"3\" + 3` fails).",
      fix: "Print the type of each value around the failing line (`type(x)`) and convert explicitly: `int(x)` or `str(x)`.",
      avoid: "Convert at the boundary (when data arrives) so the rest of the code deals with one type.",
    },
  },
];

function detectDebugLanguage(context: LearningContext, message: string): "js" | "html" | "css" | "python" | null {
  const lang = context.lesson?.language;
  if (lang === "javascript" || lang === "node") return "js";
  if (lang === "html") return "html";
  if (lang === "css") return "css";
  if (lang === "python") return "python";
  if (/console\.log|function |=>|undefined/i.test(message)) return "js";
  if (/<form|<div|<img|<html/i.test(message)) return "html";
  if (/\{ *margin|display:|:hover|class=/i.test(message)) return "css";
  if (/def |print\(|import /i.test(message)) return "python";
  return null;
}

function buildDebug(context: LearningContext, message: string, _seed: number): string {
  const lang = detectDebugLanguage(context, message);
  const tables: Record<string, { pattern: RegExp; f: DebugFinding }[]> = {
    js: JS_DEBUG,
    html: HTML_DEBUG,
    css: CSS_DEBUG,
    python: PYTHON_DEBUG,
  };
  const table = tables[lang ?? ""];
  const hit = table?.find((t) => t.pattern.test(message));

  if (hit) {
    const parts = [
      `**Most likely problem:** ${hit.f.match}`,
      `**Why:** ${hit.f.explain}`,
      `**Fix:** ${hit.f.fix}`,
      `**Avoid it next time:** ${hit.f.avoid}`,
      "I haven't run your code — I'm reading the description and the snippet you pasted. If this isn't the fix, paste the exact error text and I'll look again.",
    ];
    return parts.join("\n\n");
  }

  // No known pattern → generic debugging method (still honest: no fake execution).
  const method = [
    "Let's debug this properly. I'm working from the code and error text you paste — I haven't run anything, so the error message you see is the real evidence.",
    "**Try these in order:**",
    "1. Paste the **exact** error text (the red line in the console).",
    "2. Find the line it points to — and look at the line *before* it, because the cause is usually one step earlier.",
    "3. Add a check right before that line that prints the values you're about to use.",
    "4. Tell me what it prints and I'll help you read it.",
    "Send me the error text and the relevant code and we'll crack it.",
  ];
  return method.join("\n");
}

function buildQuizHelp(context: LearningContext, _seed: number): string {
  const lesson = context.lesson;
  const topic = lesson?.title ?? "the current lesson";
  if (lesson?.activeGradedQuiz) {
    return [
      `While that lesson's quiz is active I can't give you the answers — that would defeat the point of the check.`,
      `What I *can* do is make the underlying concept click: tell me which topic in **${topic}** you're least sure about, and I'll explain it with examples (not quiz questions).`,
      `Strategy: answer from what you know, mark the ones you'd guess, and after submitting I'll walk through why each answer is right or wrong.`,
    ].join("\n\n");
  }
  // No active graded quiz (or lesson context missing) → conceptual help is fine.
  return [
    `There's no active graded quiz I need to protect here, so I'll help with concepts.`,
    `Tell me which part of **${topic}** the question is really about and I'll explain it — then you'll be able to answer any question on that idea.`,
  ].join("\n\n");
}

function buildWhatNext(context: LearningContext, _seed: number): string {
  const progress = context.progress;
  if (context.lesson && progress && progress.total > 0) {
    if (progress.percent >= 100) {
      return `You've completed every lesson in **${context.course?.title ?? "this course"}** 🎉 The natural next step is the next course on the same path (check the catalog for courses that build on ${context.course?.title ?? "this"}), or a related course to go wider.`;
    }
    const remaining = progress.total - progress.completed;
    return [
      `You're at ${progress.percent}% of **${context.course?.title ?? "this course"}** — ${remaining} lesson${remaining === 1 ? "" : "s"} to go.`,
      `For now: finish the rest of the current module so the ideas chain together, and make sure you actually did the practice exercise for **${context.lesson.title}** — that's the part that sticks.`,
      context.course?.difficulty === "beginner"
        ? "Once this course is done, the usual next step is the course that adds behavior to what you just built (check your learning path)."
        : "Once this course is done, pick a small project that combines its ideas — projects are where courses become skills.",
    ].join("\n\n");
  }
  if (context.course) {
    return `Open the lesson you're about to start in **${context.course.title}** and I'll give you a focused plan for it: what to read, what to build, and what to watch out for.`;
  }
  return "Pick a course from the catalog — ideally one that matches where you are (first course? start with HTML or Python). Then open its first lesson and I'll plan your first session with you.";
}

function buildGreeting(seed: number): string {
  const greetings = [
    "Hey! I'm here to help you understand what you're learning. Ask me to explain a concept, give you an example, or set you a practice question.",
    "Hi! What are you working on? Point me at a concept from your current lesson and we'll dig in.",
  ];
  return pick(greetings, seed);
}

function buildGeneral(context: LearningContext, digest: LessonDigest | null, _seed: number): string {
  const parts: string[] = [];
  if (context.lesson) {
    parts.push(`You're reading **${context.lesson.title}**${context.module ? ` in "${context.module.title}"` : ""}.`);
  }
  if (digest) {
    parts.push(`In one line: ${digest.intro ?? digest.keySentences[0] ?? "this lesson builds one core idea — read the headings to see the shape of it."}`);
  }
  parts.push(
    "How can I help? I can **explain** something, give you an **example**, set a **practice question**, help **debug code**, or give a **hint**.",
  );
  return parts.join("\n\n");
}

// ─── Suggested follow-ups ──────────────────────────────────────────────────

export function buildFollowups(context: LearningContext, digest: LessonDigest | null, intent: TutorIntent, seed: number): string[] {
  const topic = digest?.topic ?? context.lesson?.title ?? null;
  const base: string[] = [];
  if (topic) base.push(`Explain ${topic.toLowerCase()} in simpler words`);
  base.push("Show me an example");
  if (topic && !context.lesson?.hasQuiz) base.push(`Give me a practice question on ${topic.toLowerCase()}`);
  if (context.lesson?.hasExercise) base.push("Give me a hint");
  if (context.progress && context.progress.percent < 100) base.push("What should I learn next?");
  else if (topic) base.push("What should I learn after this course?");

  // Rotate the set a little per seed so chips aren't identical every time,
  // while staying context-sensitive (all derived from THIS lesson/course).
  const ordered = [...base.slice(seed % base.length), ...base.slice(0, seed % base.length)];
  return ordered.slice(0, 4);
}

// ─── Provider ──────────────────────────────────────────────────────────────

export class LearnlyTutorProvider implements AiTutorProvider {
  readonly id = "learnly-tutor";

  async complete(req: TutorRequest): Promise<TutorResponse> {
    const message = req.userMessage.trim();
    const seed = hashText(message);
    const digest = extractDigest(req.context);
    const historyHasPractice = req.history.some(
      (h) => h.role === "assistant" && h.content.startsWith("**Practice question**"),
    );

    const intent = detectIntent(message, historyHasPractice);

    let reply: string;
    switch (intent) {
      case "explain":
        reply = buildExplain(req.context, digest, seed);
        break;
      case "example":
        reply = buildExample(req.context, digest, seed);
        break;
      case "hint":
        reply = buildHint(req.context, digest, seed);
        break;
      case "practice":
        reply = buildPracticeQuestion(req.context, digest, seed);
        break;
      case "practice-followup":
        reply = buildPracticeFollowup(req.context, digest, seed);
        break;
      case "solution-request":
        reply = buildSolutionRequest(req.context, digest, seed);
        break;
      case "debug":
        reply = buildDebug(req.context, message, seed);
        break;
      case "quiz-help":
        reply = buildQuizHelp(req.context, seed);
        break;
      case "what-next":
        reply = buildWhatNext(req.context, seed);
        break;
      case "greeting":
        reply = buildGreeting(seed);
        break;
      default:
        reply = buildGeneral(req.context, digest, seed);
    }

    return {
      reply,
      suggestedFollowups: buildFollowups(req.context, digest, intent, seed),
      tokensIn: Math.ceil(message.length / 4),
      tokensOut: Math.ceil(reply.length / 4),
    };
  }

  /** Used only for timing accounting. */
  static latencyMs(started: number): number {
    return Date.now() - started;
  }
}
