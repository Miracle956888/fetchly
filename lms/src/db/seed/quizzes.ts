/**
 * DEVELOPMENT SEED DATA — quizzes.
 *
 * Original questions written for Learnly. Each quiz attaches to a lesson
 * (identified by course slug + lesson title) and is scored by the same
 * service that will power Phase 02's interactive quiz UI.
 */

export interface QuestionSeed {
  type: "multiple_choice" | "true_false";
  prompt: string;
  explanation: string;
  options: { text: string; correct: boolean }[];
}

export interface QuizSeed {
  courseSlug: string;
  lessonTitle: string; // attached lesson (identified within the course)
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  questions: QuestionSeed[];
}

export const devQuizzes: QuizSeed[] = [
  {
    courseSlug: "html",
    lessonTitle: "Practice: build a profile page",
    title: "HTML Fundamentals Check",
    description: "Covers the first two modules: document structure, text, links, images and accessibility.",
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        type: "multiple_choice",
        prompt: "Which element should appear exactly once per page and carry the page's main heading?",
        explanation: "A page has one h1 — the document's primary heading. h2–h6 structure the content beneath it.",
        options: [
          { text: "<h1>", correct: true },
          { text: "<head>", correct: false },
          { text: "<title>", correct: false },
          { text: "<main>", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "What is the purpose of the alt attribute on an <img> element?",
        explanation: "alt provides a text alternative for screen readers and when the image fails to load — it describes what the image conveys.",
        options: [
          { text: "A tooltip shown on hover", correct: false },
          { text: "A text alternative for accessibility and fallback", correct: true },
          { text: "The image's file name", correct: false },
          { text: "An alternative image source", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "Which attribute makes a label text a click target for its input and tells screen readers what the field is for?",
        explanation: "The for attribute (matched to the input's id) links label and input — the core of accessible forms.",
        options: [
          { text: "for", correct: true },
          { text: "name", correct: false },
          { text: "label-for", correct: false },
          { text: "bind", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "What does <nav> describe in a page?",
        explanation: "nav marks a block of primary navigation — a landmark screen readers can jump to.",
        options: [
          { text: "A navigation block of primary links", correct: true },
          { text: "The page title", correct: false },
          { text: "A navigation history list", correct: false },
          { text: "Metadata about navigation", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "A <table> element is the correct way to lay out a two-column marketing section (text beside an image).",
        explanation: "Tables are for tabular data. Side-by-side layout is a CSS problem (Flexbox/Grid) — misusing tables hurts accessibility and maintenance.",
        options: [
          { text: "True", correct: false },
          { text: "False", correct: true },
        ],
      },
      {
        type: "true_false",
        prompt: "An <a> element without an href attribute still behaves as a functional link in all browsers.",
        explanation: "Without href the anchor is not a link — no navigation, no keyboard focus, no screen-reader role. It's just a styled span.",
        options: [
          { text: "True", correct: false },
          { text: "False", correct: true },
        ],
      },
    ],
  },
  {
    courseSlug: "css",
    lessonTitle: "Course review",
    title: "CSS Layout Check",
    description: "Covers selectors, the box model, Flexbox, Grid and responsive design.",
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        type: "multiple_choice",
        prompt: "With box-sizing: border-box, the width property includes…",
        explanation: "border-box makes width the total of content + padding + border, which is why it's the sane global default.",
        options: [
          { text: "content only", correct: false },
          { text: "content + padding + border", correct: true },
          { text: "content + margin", correct: false },
          { text: "everything including margin", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "Which Flexbox container property controls spacing between items without margin hacks?",
        explanation: "gap sets the space between flex (and grid) items directly — the modern replacement for the old last-child-margin-zero hack.",
        options: [
          { text: "gap", correct: true },
          { text: "spacing", correct: false },
          { text: "justify-content", correct: false },
          { text: "item-separation", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "grid-template-columns: repeat(3, 1fr) creates…",
        explanation: "1fr is a share of the free space; repeat(3, 1fr) splits the container into three equal columns.",
        options: [
          { text: "three equal-width columns", correct: true },
          { text: "three 1px columns", correct: false },
          { text: "a column that repeats infinitely", correct: false },
          { text: "three rows of one column", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "In a mobile-first workflow, base styles target small screens and media queries ADD features at larger widths (min-width).",
        explanation: "Mobile-first means the default CSS is the small-screen design; min-width queries layer on complexity as space allows.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "An #id selector has higher specificity than a .class selector in CSS.",
        explanation: "Specificity ranking: inline (1000) > #id (100) > .class/[attr]/:pseudo-class (10) > element (1).",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
    ],
  },
  {
    courseSlug: "javascript",
    lessonTitle: "Course review",
    title: "JavaScript Logic Check",
    description: "Covers types, operators, control flow, functions, arrays and the DOM.",
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        type: "multiple_choice",
        prompt: "What does \"5\" + 1 evaluate to in JavaScript?",
        explanation: "+ concatenates when either operand is a string, so this is string concatenation: \"51\". Use - or Number() when you mean math.",
        options: [
          { text: "6", correct: false },
          { text: "\"51\"", correct: true },
          { text: "NaN", correct: false },
          { text: "TypeError", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "Which comparison operator checks both type and value (no coercion)?",
        explanation: "=== (strict equality) never coerces: 5 === \"5\" is false, while 5 == \"5\" is true.",
        options: [
          { text: "==", correct: false },
          { text: "===", correct: true },
          { text: "===", correct: false },
          { text: "strictEq", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "An array of student scores is [72, 88, 65, 95]. What does scores.filter(s => s >= 70) return?",
        explanation: "filter returns a NEW array of the elements that pass the test — the original array is unchanged.",
        options: [
          { text: "[72, 88, 95]", correct: true },
          { text: "[65]", correct: false },
          { text: "true", correct: false },
          { text: "It mutates the original array", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "A function with no explicit return statement returns undefined.",
        explanation: "Any code path that finishes without hitting return yields undefined. Design functions to always return something meaningful.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "element.classList.toggle(\"hidden\") adds the class if it's missing and removes it if it's present.",
        explanation: "toggle is the standard way to flip a class on each call — perfect for collapsible sections and active states.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
    ],
  },
  {
    courseSlug: "python",
    lessonTitle: "Course review",
    title: "Python Fundamentals Check",
    description: "Covers types, control flow, loops, lists, dicts and functions.",
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        type: "multiple_choice",
        prompt: "What is the output of: print(type(3.0))",
        explanation: "3.0 is a float even though its value is whole — Python distinguishes int from float by the literal (or by conversion).",
        options: [
          { text: "<class 'int'>", correct: false },
          { text: "<class 'float'>", correct: true },
          { text: "<class 'number'>", correct: false },
          { text: "<class 'decimal'>", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "In Python, code blocks are defined by…",
        explanation: "Indentation is syntax in Python — the indented lines under if/for/def belong to that block. Braces don't exist.",
        options: [
          { text: "curly braces { }", correct: false },
          { text: "indentation", correct: true },
          { text: "begin/end keywords", correct: false },
          { text: "parentheses ( )", correct: false },
        ],
      },
      {
        type: "multiple_choice",
        prompt: "counts = {} ; counts[\"apple\"] = counts.get(\"apple\", 0) + 1 — what is counts[\"apple\"] after one execution?",
        explanation: "get(key, 0) returns 0 when the key is missing, so the first count starts from 0 and becomes 1. This is the classic safe-count pattern.",
        options: [
          { text: "0", correct: false },
          { text: "1", correct: true },
          { text: "KeyError is raised", correct: false },
          { text: "None", correct: false },
        ],
      },
      {
        type: "true_false",
        prompt: "for i in range(3): iterates with i taking the values 1, 2, 3.",
        explanation: "range(3) produces 0, 1, 2 — range is end-exclusive (and starts at 0 by default).",
        options: [
          { text: "True", correct: false },
          { text: "False", correct: true },
        ],
      },
      {
        type: "true_false",
        prompt: "A list comprehension like [s * 2 for s in scores] returns a new list without modifying the original.",
        explanation: "Comprehensions build new lists from the source iterable; the source is left untouched — a core reason they're preferred over manual loops.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
    ],
  },
];
