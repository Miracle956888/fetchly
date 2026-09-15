/**
 * DEVELOPMENT SEED DATA — course content.
 *
 * All text below is ORIGINAL content written for Learnly. Curriculum
 * *progression* follows the well-known teaching order of fundamental
 * web development (structure → presentation → behavior → data), but no
 * wording is taken from any other site.
 */

export interface ExerciseSeed {
  title: string;
  instructions: string;
  language: string;
  starterCode?: string;
  expectedBehavior?: string;
}

export interface LessonSeed {
  title: string;
  summary?: string;
  minutes?: number;
  language?: string;
  content: string;
  exercise?: ExerciseSeed;
}

export interface ModuleSeed {
  title: string;
  description?: string;
  lessons: LessonSeed[];
}

export interface CourseSeed {
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  categorySlug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationHours: number;
  status: "draft" | "published";
  objectives: string[];
  prerequisites: string[];
  modules: ModuleSeed[];
}

export const htmlCourse: CourseSeed = {
  title: "HTML Basics",
  slug: "html",
  description:
    "Learn the structure of the web. Build real documents with elements, links, images, forms and semantics — no experience needed.",
  longDescription:
    "Every website, no matter how visually complex, is built on HTML. This course takes you from an empty document to a complete, accessible page: structure, text, links, images, forms, tables and semantic layout. Each lesson is short and code-first, with practice at the end of every module.",
  categorySlug: "html",
  difficulty: "beginner",
  durationHours: 12,
  status: "published",
  objectives: [
    "Write valid HTML documents from scratch",
    "Structure content with headings, lists and sections",
    "Create links and embed accessible images",
    "Build forms with proper labels and validation",
    "Use semantic elements to describe page structure",
  ],
  prerequisites: ["No prior experience required", "A computer and a text editor"],
  modules: [
    {
      title: "HTML Fundamentals",
      description: "What HTML is, how documents are built, and the elements you'll use every day.",
      lessons: [
        {
          title: "What is HTML?",
          summary: "Markup, elements and the mental model for web documents.",
          minutes: 12,
          language: "html",
          content: `## HTML is a description of content

HTML (HyperText Markup Language) is not a programming language — it's a *markup* language. It describes what something **is**: a heading, a paragraph, a link, an image. Browsers read that description and draw the page.

An HTML **element** is written with an opening tag, its content, and a closing tag:

\`\`\`html
<p>This is a paragraph.</p>
<h1>This is a heading.</h1>
\`\`\`

A few rules to keep in mind from day one:

- Tags are written in angle brackets: \`<p>\`, \`</p>\`
- Elements can be nested inside other elements
- Some elements are self-contained, like \`<img>\` — they have no closing tag
- Browsers are forgiving, but always write complete, well-formed markup

> Think of HTML as the skeleton of a page: it defines the structure and meaning. Styling and behavior come later with CSS and JavaScript.`,
        },
        {
          title: "Anatomy of a document",
          summary: "Doctype, the html element, head and body.",
          minutes: 15,
          language: "html",
          content: `## The basic skeleton

Every HTML document has the same outer shape:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My first page</title>
  </head>
  <body>
    <h1>Hello, world</h1>
  </body>
</html>
\`\`\`

What each part does:

- \`<!DOCTYPE html>\` — tells the browser this is an HTML5 document
- \`<html lang="en">\` — the root element; \`lang\` helps screen readers and search engines
- \`<head>\` — metadata *about* the page (not shown on screen): character set, title, links to styles
- \`<body>\` — everything the visitor actually sees

The \`<title>\` text appears in the browser tab. The \`charset\` meta tag ensures text like \`é\` or \`—\` renders correctly.

Keep \`<head>\` for machine-readable facts and \`<body>\` for human-visible content — that single habit prevents most early confusion.`,
        },
        {
          title: "Text: headings, paragraphs and lists",
          summary: "The core text elements and when to use each one.",
          minutes: 18,
          language: "html",
          content: `## Headings tell the page's structure apart

There are six heading levels, \`<h1>\` through \`<h6>\`. Use them by *importance*, not by how big you want text to look (that's CSS's job):

\`\`\`html
<h1>Recipe: Tomato Soup</h1>
<h2>Ingredients</h2>
<h3>Dairy</h2>
\`\`\`

A page should have exactly one \`<h1>\`, and levels should not skip (no \`<h2>\` straight after \`<h1>\` without purpose).

## Paragraphs and lists

\`\`\`html
<p>A plain block of text.</p>

<ul>
  <li>Unordered items — a list without ranking</li>
  <li>Like ingredients or features</li>
</ul>

<ol>
  <li>Ordered items — where sequence matters</li>
  <li>Like steps in a recipe</li>
</ol>
\`\`\`

- \`<ul>\` = bullet list, \`<ol>\` = numbered list
- Each item is wrapped in \`<li>\`
- Use lists, not paragraphs with manual "1. 2. 3." — lists carry meaning

> Screen readers can jump between headings and list items. Well-structured text is automatically more accessible.`,
        },
      ],
    },
    {
      title: "Links, Images and Media",
      description: "Connecting pages and adding visuals the right way.",
      lessons: [
        {
          title: "Hyperlinks",
          summary: "The 'hyper' in hyperText: navigating between pages.",
          minutes: 14,
          language: "html",
          content: `## Links are elements with a destination

The \`<a>\` (anchor) element creates a link. Its \`href\` attribute holds the destination:

\`\`\`html
<a href="https://developer.mozilla.org">MDN Web Docs</a>
<a href="/courses/css">The CSS course</a>
<a href="contact.html">Contact us</a>
\`\`\`

Common destinations:

- **Absolute** — full URL: \`https://example.com/page\`
- **Relative** — path from the current page: \`/about\`, \`./photos/index.html\`
- **Anchor** — jump to a section: \`<a href="#faq">FAQ</a>\` with \`<section id="faq">\`

Two practical attributes:

- \`target="_blank"\` opens in a new tab — pair it with care, and always keep the link text descriptive
- Link text should say where it goes: *"View the CSS course"*, never *"click here"*

> A link with no \`href\` is not a link — it's a styled span. Don't fake navigation with buttons in HTML; that's JavaScript's territory.`,
        },
        {
          title: "Images and media",
          summary: "Embedding images accessibly with img and figure.",
          minutes: 16,
          language: "html",
          content: `## The img element

\`\`\`html
<img src="cat.jpg" alt="A ginger cat sitting on a windowsill" width="640" height="400" />
\`\`\`

- \`src\` — where the file lives
- \`alt\` — a text alternative. Describe what the image *conveys*, not just what it shows. Decorative images get an empty \`alt=""\`
- \`width\`/\`height\` — prevents layout shift while the image loads

## Grouping with figure

When an image has a caption, wrap both in \`<figure>\`:

\`\`\`html
<figure>
  <img src="chart.png" alt="Monthly signups rising from 120 to 480 over six months" />
  <figcaption>Signups per month, January–June</figcaption>
</figure>
\`\`\`

## Audio and video

\`\`\`html
<video controls width="640">
  <source src="demo.mp4" type="video/mp4" />
  Your browser doesn't support video.
</video>
\`\`\`

The text inside \`<video>\` is the fallback for browsers that can't play it. Always provide \`controls\` unless you're building a custom player.`,
        },
      ],
    },
    {
      title: "Forms and Inputs",
      description: "Getting data from users: forms, fields, labels and validation.",
      lessons: [
        {
          title: "Forms 101",
          summary: "The form element, inputs and the label connection.",
          minutes: 20,
          language: "html",
          content: `## A form is a container with a destination

\`\`\`html
<form action="/register" method="post">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />

  <button type="submit">Create account</button>
</form>
\`\`\`

Key attributes:

- \`action\` — where submitted data goes
- \`method\` — \`get\` (data in the URL, for searches) or \`post\` (data in the request body, for changes)
- Each \`<input>\` needs a \`name\` — that's how the server identifies it

## Labels matter

The \`<label for="..."> \` + \`<input id="..."> \` pairing makes the whole label text a click target and tells screen readers what a field is for. No \`for\` attribute is the single most common accessibility mistake in forms.

> When you submit, each field is sent as \`name=value\`. Test by submitting and reading the URL (for GET) — it's the fastest way to learn what a form actually sends.`,
          exercise: {
            title: "Build a sign-up form",
            instructions:
              "Create a form that posts to /register with three fields: full name (text, required), email (email, required) and country (text, optional). Every field needs a proper label and a name attribute.",
            language: "html",
            starterCode: `<form action="/register" method="post">\n  <!-- Add name, email and country fields with labels -->\n  <button type="submit">Sign up</button>\n</form>`,
            expectedBehavior:
              "Submitting with all fields filled sends three name=value pairs in the POST body; submitting with name or email empty is blocked by the browser before it reaches the server.",
          },
        },
        {
          title: "Input types and validation",
          summary: "Let the browser do the first line of validation for you.",
          minutes: 18,
          language: "html",
          content: `## Choose the right input type

\`\`\`html
<input type="text" />
<input type="email" />
<input type="password" />
<input type="number" min="0" max="100" />
<input type="date" />
<input type="checkbox" />
<select name="topic">
  <option value="html">HTML</option>
  <option value="css">CSS</option>
</select>
<textarea name="message" rows="4"></textarea>
\`\`\`

The right type gives you the right keyboard on phones (digits for numbers, @-friendly for email) and free validation.

## Built-in validation attributes

\`\`\`html
<input type="email" required />
<input type="number" min="1" max="10" step="1" />
<input type="text" pattern="[A-Z]{3}-[0-9]{4}" title="Format: ABC-1234" />
\`\`\`

- \`required\` — field can't be empty
- \`min\`/\`max\`/\`step\` — numeric bounds
- \`pattern\` — a regular expression the value must match

> Browser validation is a UX convenience, never a security boundary. The server must validate everything again — anyone can skip the browser entirely.`,
        },
      ],
    },
    {
      title: "Structure, Tables and Semantics",
      description: "Organizing complex content and describing what the page really is.",
      lessons: [
        {
          title: "Tables for tabular data",
          summary: "Rows, columns, headers — and when NOT to use a table.",
          minutes: 15,
          language: "html",
          content: `## Tables are for data, not layout

\`\`\`html
<table>
  <caption>Course enrollment, by month</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Enrolled</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>120</td>
    </tr>
    <tr>
      <th scope="row">February</th>
      <td>185</td>
    </tr>
  </tbody>
</table>
\`\`\`

- \`<th scope="col"> \` — column header; \`scope="row"\` — row header
- \`<thead>\`, \`<tbody>\`, \`<tfoot>\` group sections
- \`<caption>\` describes the whole table for screen readers

The golden rule: if you're using a table to position two side-by-side text blocks, you're doing it wrong — that's a layout problem (CSS's job). Tables are for things that genuinely *are* rows and columns.`,
        },
        {
          title: "Semantic elements",
          summary: "header, nav, main, article, aside, footer — structure with meaning.",
          minutes: 18,
          language: "html",
          content: `## divs vs semantic elements

A page made entirely of \`<div>\` is a wall of bricks with no blueprint. Semantic elements describe *what a region is*:

\`\`\`html
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/courses">Courses</a>
    </nav>
  </header>

  <main>
    <article>
      <h1>Why semantic HTML matters</h1>
      <p>The main content of the page…</p>
    </article>
    <aside>Related reading and extras.</aside>
  </main>

  <footer>© 2026 Learnly</footer>
</body>
\`\`\`

- \`<header>\` / \`<footer>\` — page or section intro/outro
- \`<nav>\` — a block of primary navigation
- \`<main>\` — the unique primary content (one per page)
- \`<article>\` — a self-contained piece (a post, a lesson, a product)
- \`<aside>\` — tangential content

> Screen readers offer "jump to main content" and landmark navigation. Semantic markup gives users those shortcuts for free.`,
        },
        {
          title: "Accessibility basics",
          summary: "The small habits that make your pages work for everyone.",
          minutes: 16,
          language: "html",
          content: `## Accessibility is structure, first

Before any ARIA or advanced techniques, these fundamentals matter most:

1. **Set the language** — \`<html lang="en">\`
2. **One h1, no skipped levels** — headings are the page's outline
3. **Images need meaningful alt text** — or \`alt=""\` if purely decorative
4. **Every form field has a label** — the \`for\`/\`id\` pairing
5. **Links say where they go** — "View the CSS course", not "click here"
6. **Native elements over fakes** — a real \`<button>\` beats a \`<div>\` styled like one

## Check contrast and focus

Text should be readable at normal sizes without squinting (roughly 4.5:1 contrast for body text), and every interactive element should show a clear focus outline when navigated with the keyboard.

> You can test a page today: turn off your mouse and try to use it with Tab, Enter and arrows only. Everything should be reachable and operable.`,
        },
        {
          title: "Practice: build a profile page",
          summary: "Put the whole module together in one real document.",
          minutes: 25,
          language: "html",
          content: `## Your task

Build a personal profile page using everything from this module:

- A complete document skeleton with a title and \`lang\`
- A \`<header>\` with your name (h1) and a short nav
- An \`<article>\` containing: a bio (paragraphs), a skills list (\`<ul>\`), and a photo with proper \`alt\` text
- A contact \`<form>\` with name, email and message fields — all labeled, name required
- A \`<footer>\`

## Quality bar

- No skipped heading levels
- Every input has a label with matching \`for\`/\`id\`
- The form uses \`method="post"\` and a real \`action\`
- Validate your markup in your browser's developer tools — zero errors

> When in doubt, describe the element to a stranger: "what IS this part of the page?" If you can't answer, pick a different element.`,
          exercise: {
            title: "Profile page checkpoint",
            instructions:
              "Write the complete HTML for a profile page following the task brief. Include at least: header+nav, article with bio/skills/photo, a labeled contact form, and a footer. Paste your full document below.",
            language: "html",
            starterCode: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <title>Your name — Profile</title>\n</head>\n<body>\n  <!-- header, article, form, footer -->\n</body>\n</html>",
            expectedBehavior:
              "The document parses with no console errors, has exactly one h1, every input has an associated label, and the form submits via POST.",
          },
        },
      ],
    },
  ],
};

export const cssCourse: CourseSeed = {
  title: "CSS Essentials",
  slug: "css",
  description:
    "From selectors to responsive layouts. Style with confidence using the box model, Flexbox and Grid — with practical projects at every step.",
  longDescription:
    "CSS turns raw structure into design. You'll learn how selectors target elements, how the box model creates space, and how modern layout systems — Flexbox and Grid — let you build anything from a card to a full responsive site. Practice projects at the end of each module.",
  categorySlug: "css",
  difficulty: "beginner",
  durationHours: 14,
  status: "published",
  objectives: [
    "Select and style elements with confidence",
    "Master the box model: margin, border, padding",
    "Build one-dimensional layouts with Flexbox",
    "Build two-dimensional layouts with Grid",
    "Make pages responsive with media queries",
  ],
  prerequisites: ["Basic HTML (the HTML Basics course or equivalent)"],
  modules: [
    {
      title: "CSS Fundamentals",
      description: "How CSS attaches to HTML, and how rules and specificity work.",
      lessons: [
        {
          title: "What is CSS and how it connects",
          summary: "Style rules, properties, and the three ways to link CSS.",
          minutes: 14,
          language: "css",
          content: `## A rule targets an element and sets properties

\`\`\`css
h1 {
  color: #17222f;
  font-size: 32px;
}
\`\`\`

The \`h1\` part is the **selector** (what to style); the braces hold **declarations** of \`property: value\`.

## Three ways to connect CSS

1. **External stylesheet** (the right default):

\`\`\`html
<link rel="stylesheet" href="styles.css" />
\`\`\`

2. **Style element** — \`<style>\` in the head, for tiny pages
3. **Inline** — \`style="..."\` on an element, avoid: it can't be maintained

External stylesheets are cached by browsers, shared across pages, and keep content separate from presentation. That separation is the entire reason CSS exists.`,
        },
        {
          title: "Selectors and specificity",
          summary: "Targeting exactly what you mean — and why things stop working.",
          minutes: 18,
          language: "css",
          content: `## The selector toolbox

\`\`\`css
p              /* element selector */
.card           /* class — the workhorse */
#header         /* id — use sparingly */
a:hover         /* pseudo-class: state */
nav a            /* descendant: a links inside nav */
li:first-child  /* structural pseudo-class */
\`\`\`

Classes are your primary tool. Use them for styling, reserve ids for the handful of unique anchors on a page.

## Specificity: why your rule loses

When two rules target the same element, the more specific one wins:

- Inline style: 1000
- \`#id\`: 100
- \`.class\`, \`[attr]\`, \`:hover\`: 10
- \`p\`, \`*\": 1

\`\`\`css
.card p        /* 10 + 1 */
main p         /* 1 + 1 — loses to .card p */
\`\`\`

> Fighting specificity is a sign to rethink the structure — reach for \`!important\` only as a last resort, and then document why.`,
        },
        {
          title: "The box model",
          summary: "Every element is a box: content, padding, border, margin.",
          minutes: 20,
          language: "css",
          content: `## Every element is a box

\`\`\`
┌──────────────────────── margin ────────────────────────┐
│  ┌────────────────── border ────────────────────┐      │
│  │  ┌────────────── padding ───────────────┐    │      │
│  │  │              content                 │    │      │
│  └───────────────────────────────────────────┘    │      │
└───────────────────────────────────────────────────┘
\`\`\`

\`\`\`css
.card {
  width: 300px;
  padding: 16px;    /* space inside the border */
  border: 1px solid #d5dbe2;
  margin: 24px;     /* space outside the border */
}
\`\`\`

By default \`width\` sets the *content* width — the box ends up 336px wide. With:

\`\`\`css
* { box-sizing: border-box; }
\`\`\`

\`width\` includes padding and border. This one rule makes layout math sane — adopt it globally, immediately.

- **Padding** — inner space
- **Margin** — outer space (vertical margins between blocks collapse to the larger one; horizontal margins never do)`,
        },
      ],
    },
    {
      title: "Layout Systems",
      description: "Flexbox for one dimension, Grid for two — the modern layout story.",
      lessons: [
        {
          title: "Display and positioning",
          summary: "block, inline, flex, grid, and where things move.",
          minutes: 18,
          language: "css",
          content: `## Display: how elements occupy space

\`\`\`css
.block      { display: block; }     /* own line, full width */
.inline     { display: inline; }    /* flows with text */
.hidden     { display: none; }      /* removed from layout */
\`\`\`

Headings and divs are block by default; spans and links are inline. Switching an element's display changes how it behaves — \`<span style="display:block">\` now takes a full line.

## Positioning

\`\`\`css
.element {
  position: relative;   /* default, but enables offsets */
}
.badge {
  position: absolute;   /* out of flow, placed relative to nearest positioned ancestor */
  top: 8px;
  right: 8px;
}
.sticky-nav {
  position: sticky;     /* sticks when scrolled past */
  top: 0;
}
\`\`\`

- \`static\` — the default; ignores \`top/left\`
- \`relative\` — offset from its normal spot; makes children's "anchor"
- \`absolute\` — out of flow; anchored to nearest positioned ancestor
- \`fixed\` — anchored to the viewport
- \`sticky\` — becomes fixed after scrolling past its threshold`,
        },
        {
          title: "Flexbox",
          summary: "One-dimensional layout: rows and columns that flex.",
          minutes: 25,
          language: "css",
          content: `## Flexbox solves one dimension at a time

\`\`\`css
.toolbar {
  display: flex;
  gap: 12px;          /* space between items */
  align-items: center; /* cross-axis: vertical centering */
  justify-content: space-between; /* main axis: spread out */
}
\`\`\`

The parent becomes a **flex container**; its children become **flex items** laid out on a main axis (row by default, or \`flex-direction: column\`).

## The properties you'll actually use

**On the container:**

- \`flex-direction\` — row / column
- \`justify-content\` — main-axis alignment: \`flex-start\`, \`center\`, \`space-between\`, \`space-around\`
- \`align-items\` — cross-axis alignment
- \`gap\` — spacing between items (no more margin hacks)
- \`flex-wrap\` — allow items to wrap to new lines

**On items:**

\`\`\`css
.grow { flex: 1; }        /* take all free space */
.shrink { flex-shrink: 0; } /* keep its size */
.center-me { margin: auto; } /* center on both axes */
\`\`\`

> Classic uses: centering things, a navbar (logo left, links right), equal-height cards, and a "push to the end" item with \`margin-left: auto\`.`,
        },
        {
          title: "Grid",
          summary: "Two-dimensional layout: rows AND columns at once.",
          minutes: 25,
          language: "css",
          content: `## Grid thinks in tracks

\`\`\`css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* three equal columns */
  gap: 16px;
}
\`\`\`

\`1fr\` means "one share of the free space." So \`repeat(3, 1fr)\` splits the width into three equal columns, \`2fr 1fr\` gives the first column twice the width of the second.

## Placing items

\`\`\`css
.featured {
  grid-column: 1 / 3;  /* span columns 1 through 2 */
  grid-row: 1 / 3;     /* span rows 1 through 2 */
}
\`\`\`

Line-based: \`1 / 3\` means "from line 1 to line 3" — two columns' worth.

## The responsive superpower

\`\`\`css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
\`\`\`

"Fit as many 220px-minimum columns as you can, stretch the rest." A whole responsive card layout in two lines — no media queries needed.

> Rule of thumb: Flexbox for content-driven one-dimensional rows (toolbars, navs), Grid for page- and gallery-level two-dimensional structure.`,
        },
      ],
    },
    {
      title: "Designing with CSS",
      description: "Typography, color, and making it all responsive.",
      lessons: [
        {
          title: "Typography",
          summary: "Font stacks, sizes, line-height — the 80% of visual quality.",
          minutes: 16,
          language: "css",
          content: `## Set the base first

\`\`\`css
body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #273344;
}
\`\`\`

- **Line-height** 1.5–1.7 for body text is the single biggest readability lever
- **Max line length** around 60–75 characters — constrain with \`max-width: 65ch\`
- **Headings** get tighter line-height (1.2–1.3) and letter-spacing slightly negative

## A practical scale

\`\`\`css
h1 { font-size: 2.25rem; line-height: 1.15; }
h2 { font-size: 1.5rem;  line-height: 1.25; }
h3 { font-size: 1.125rem; line-height: 1.3; }
p  { margin-block: 1rem; }
\`\`\`

Using \`rem\` units keeps everything proportional to the root font size — and respects users who change their browser's default text size.

> Don't pick more than two font families. Weight and size contrast do the rest of the work.`,
        },
        {
          title: "Color and visual hierarchy",
          summary: "A restrained palette, semantic meaning, and contrast.",
          minutes: 16,
          language: "css",
          content: `## Build a token palette

\`\`\`css
:root {
  --ink-900: #17222f;   /* primary text */
  --ink-500: #67758a;   /* secondary text */
  --ink-200: #d5dbe2;   /* borders */
  --paper:   #fafaf8;   /* page background */
  --brand-600: #2b54ae; /* one accent, used with intent */
  --success: #2e7d4f;
  --danger:  #bf3b36;
}
\`\`\`

Custom properties (variables) keep the palette in one place. Style against the *tokens*, never raw hex values scattered through the codebase.

## Rules of thumb

- One accent color for interactive elements — consistency reads as quality
- Neutrals do 90% of the work; the accent does the other 10%
- Semantic colors carry meaning: green = success, red = error. Don't decorate with them
- **Contrast:** body text on its background should hit at least 4.5:1 — use a contrast checker, don't eyeball

> When a design feels flat, add hierarchy: bigger heading, bolder number, a darker surface. When it feels busy, remove a color.`,
        },
        {
          title: "Responsive design and media queries",
          summary: "Design for every screen: mobile-first, media queries, fluid units.",
          minutes: 22,
          language: "css",
          content: `## Mobile-first is a workflow, not a trend

Write the small-screen styles as your base, then layer on more at larger widths:

\`\`\`css
/* base: 1 column, stacked */
.layout { display: grid; gap: 16px; }

/* from 640px up: two columns */
@media (min-width: 640px) {
  .layout { grid-template-columns: 1fr 1fr; }
}

/* from 1024px up: sidebar + content */
@media (min-width: 1024px) {
  .layout { grid-template-columns: 260px 1fr; }
}
\`\`\`

Why mobile-first? You start simple and add complexity as space allows — and every rule you write is used by every phone on earth.

## Fluid helpers

\`\`\`css
h1 { font-size: clamp(1.75rem, 4vw + 1rem, 3rem); }
img { max-width: 100%; height: auto; }
.container { width: min(1100px, 100% - 2rem); margin-inline: auto; }
\`\`\`

- \`clamp(min, preferred, max)\` — fluid type without breakpoints
- \`max-width: 100%\` on media — never let images overflow
- \`vw\`/\`vh\` units — viewport-relative, with care

> Test at 360px, 768px and 1440px. If text is readable, buttons tappable, and nothing overflows, you're in good shape.`,
        },
      ],
    },
    {
      title: "Practice Projects",
      description: "Build two real layouts from scratch.",
      lessons: [
        {
          title: "Practice: card grid",
          summary: "A responsive grid of cards with header, body and footer.",
          minutes: 30,
          language: "css",
          content: `## The brief

Build a responsive grid of course cards:

- Each card: a colored top band (80px), a title, a two-line description, a footer row (meta on the left, price on the right)
- Cards use the box model correctly (padding, 1px border, 10px radius)
- The grid: 1 column on phones, 2 from 640px, 3 from 1024px
- Cards in a row have equal height

## Hints

- \`display: grid\` with \`auto-fit\`/\`minmax\` or explicit media queries
- Make each card \`display: flex; flex-direction: column;\` and push the footer down with \`margin-top: auto\`
- Equal heights come free from Grid — if they're not equal, check for extra margins

> Aim for clean spacing rhythm: 8/16/24px steps, consistent gap values, one accent color on hover.`,
          exercise: {
            title: "Card grid checkpoint",
            instructions:
              "Implement the card grid in HTML + CSS. Paste your CSS (the .gallery and .card rules) and a note on how you achieved equal-height cards.",
            language: "css",
            starterCode: `.gallery {\n  /* your grid rules */\n}\n\n.card {\n  /* your card rules */\n}\n\n@media (min-width: 640px) {\n  /* two columns */\n}`,
            expectedBehavior:
              "At 375px the cards stack; at 700px there are two per row; at 1100px there are three per row, all equal height with aligned footers.",
          },
        },
        {
          title: "Practice: sticky responsive header",
          summary: "A navbar that collapses gracefully on small screens.",
          minutes: 30,
          language: "css",
          content: `## The brief

Build a sticky header:

- Logo on the left, a row of links on the right (desktop)
- On screens under 768px: logo left, a "menu" placeholder button right (the actual drawer is a later phase)
- Header sticks to the top when scrolling, with a 1px bottom border and a solid background
- Links: hover state, visible focus outline, comfortable tap targets (min 44px tall)

## Hints

- \`position: sticky; top: 0;\` on the header
- Inner bar: \`display: flex; justify-content: space-between; align-items: center;\`
- Hide the link row with \`display: none\` under 768px, show the menu button
- \`gap\` between links — no margin acrobatics

> This exact pattern (logo + nav + CTA, collapsing to a menu button) is the skeleton of most commercial site headers — you're building a real pattern, not an exercise.`,
          exercise: {
            title: "Sticky header checkpoint",
            instructions:
              "Implement the header. Paste your CSS for the header bar and its media query, and confirm in a sentence what changes below 768px.",
            language: "css",
            starterCode: `.site-header {\n  /* sticky + border */\n}\n\n.header-bar {\n  /* flex bar */\n}\n\n@media (max-width: 767px) {\n  /* collapsed state */\n}`,
            expectedBehavior:
              "The header stays pinned at the top while scrolling; desktop shows logo + links + CTA; below 768px the links are replaced by a single menu button.",
          },
        },
        {
          title: "Course review",
          summary: "What you should be able to do now — and where to go next.",
          minutes: 10,
          language: "css",
          content: `## Check yourself

Can you, without looking:

- Write selectors for "a link inside nav, when hovered"?
- Explain why an element's width "isn't working" (box model, box-sizing)?
- Center a box both horizontally and vertically with Flexbox?
- Make a card grid responsive with auto-fit?
- Write a mobile-first media query that adds a second column at 640px?

If yes to all five, you're ready for real layout work.

## What's next

- **JavaScript Basics** — behavior: events, DOM, logic
- **Grid deep-dive** — named areas, auto-placement, subgrid (advanced)
- **CSS architecture** — naming systems, design tokens at scale (advanced)

> CSS rewards practice more than reading. Rebuild the two practice projects from memory — that's the fastest way to know it's yours.`,
        },
      ],
    },
  ],
};
