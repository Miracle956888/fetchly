/**
 * DEVELOPMENT SEED DATA — more course content (JS, Python, Node.js, MySQL).
 * All text is original Learnly content.
 */
import type { CourseSeed } from "./content-html-css";

export const javascriptCourse: CourseSeed = {
  title: "JavaScript Basics",
  slug: "javascript",
  description:
    "The language of the web, from variables to the DOM. Write real logic, build small interactive programs, and understand how browsers run code.",
  longDescription:
    "JavaScript makes pages respond. This course builds the core language step by step — variables, types, conditionals, loops, functions, arrays, objects — then connects you to the page through the DOM. Practice projects turn each module's theory into working code.",
  categorySlug: "javascript",
  difficulty: "beginner",
  durationHours: 18,
  status: "published",
  objectives: [
    "Write and run JavaScript in the browser",
    "Use variables, types and operators fluently",
    "Control flow with conditionals and loops",
    "Design functions with clear inputs and outputs",
    "Work with arrays and objects",
    "Select and update page elements and handle events",
  ],
  prerequisites: ["Basic HTML", "Basic CSS helpful but not required"],
  modules: [
    {
      title: "JavaScript Fundamentals",
      description: "Running code, variables, types and expressions.",
      lessons: [
        {
          title: "What is JavaScript and where it runs",
          summary: "The browser runtime, dev tools and your first script.",
          minutes: 12,
          language: "javascript",
          content: `## JavaScript is the browser's programming language

HTML structures the page, CSS styles it, and JavaScript makes it **respond**: validate a form, update a total, load content.

Three places to write it:

\`\`\`html
<!-- 1. external file (the right default) -->
<script src="app.js" defer></script>

<!-- 2. inline -->
<script>
  console.log("hello");
</script>
\`\`\`

\`defer\` runs the script after the page has parsed — use it for your app code.

## Your first tools

Open your browser's **developer tools** (F12 or right-click → Inspect) and go to the Console:

\`\`\`js
console.log(2 + 3);          // 5
console.log("Learnly".length); // 7
\`\`\`

The console is your scratchpad — type an expression and hit Enter. Most "why isn't it working" questions are answered in five seconds here.

> A mental model to keep: the browser runs your script once, top to bottom, and then waits for you to ask it to do more (events — coming up).`,
        },
        {
          title: "Variables and data types",
          summary: "let, const, and the primitives you'll meet daily.",
          minutes: 18,
          language: "javascript",
          content: `## Declare with let or const

\`\`\`js
const course = "JavaScript Basics"; // never reassigned
let lessonCount = 12;               // will change
lessonCount = 13;                   // fine
// course = "Python"; // TypeError
\`\`\`

Default to \`const\`; use \`let\` when the value changes. Avoid \`var\` in new code — its scoping is a legacy trap.

## The core types

\`\`\`js
"hello"        // string
42             // number (one type for all numbers)
true           // boolean
null           // intentional "nothing"
undefined      // declared but not set
[1, 2, 3]      // array (object)
{ name: "Sam" } // object
\`\`\`

Check types with \`typeof\`:

\`\`\`js
typeof "hi"    // "string"
typeof 42      // "number"
typeof null    // "object"  ← historical quirk, know it exists
\`\`\`

## Coercion: when strings meet numbers

\`\`\`js
"5" + 1   // "51"  (string wins)
"5" - 1   // 4     (number wins)
"5" * 2   // 10
\`\`\`

The \`+\` operator concatenates if either side is a string. Use \`Number("5")\` or \`parseInt\`/\`parseFloat\` when you *mean* to convert.`,
        },
        {
          title: "Operators and expressions",
          summary: "Math, comparison, logical operators, and the gotchas.",
          minutes: 16,
          language: "javascript",
          content: `## Math and assignment

\`\`\`js
let score = 10;
score += 5;     // score = 15
score %= 7;     // remainder: score = 8
score ** 2;     // exponent: 64
\`\`\`

## Comparison: == vs ===

\`\`\`js
5 == "5"     // true  (coerces, surprising)
5 === "5"    // false (type and value must match)
\`\`\`

Use \`===\` (strict equality) by default. It never coerces, so it does what you think.

## Logical operators

\`\`\`js
true && false   // false — AND
true || false   // true  — OR
!true           // false — NOT
\`\`\`

And the "short-circuit" values you'll use constantly:

\`\`\`js
const name = profile.name ?? "Friend";  // nullish coalescing: use "Friend" if null/undefined
const tag = label || "untitled";        // falls back on ANY falsy value
\`\`\`

\`??\` is the safer choice — it only falls back on \`null\`/\`undefined\`, so \`0\`, \`""\` and \`false\` pass through untouched.

> Operator precedence trips people up: \`&&\` binds tighter than \`||\`, and \`!\` binds tightest of all. When in doubt, add parentheses.`,
        },
      ],
    },
    {
      title: "Logic and Functions",
      description: "Making decisions, repeating work, and packaging behavior.",
      lessons: [
        {
          title: "Conditionals",
          summary: "if/else, switch, and writing readable branches.",
          minutes: 16,
          language: "javascript",
          content: `## The basic branch

\`\`\`js
const percent = 72;

if (percent >= 90) {
  console.log("Excellent — certificate eligible");
} else if (percent >= 70) {
  console.log("Passed");
} else {
  console.log("Keep practicing");
}
\`\`\`

Rules that keep branches readable:

- Test the most common/important case first
- Early-exit on the failure case:

\`\`\`js
function enroll(course, isPublished) {
  if (!isPublished) {
    throw new Error("Course is not published");
  }
  // happy path continues without nesting
  return { courseId: course.id, status: "active" };
}
\`\`\`

- For a fixed set of string values, \`switch\` can read better than chains:

\`\`\`js
switch (difficulty) {
  case "beginner": return "Start here";
  case "intermediate": return "Some experience needed";
  case "advanced": return "Advanced topics";
  default: return "Course";
}
\`\`\`

> If your if-chain has more than three branches, it's usually a lookup object or a data problem in disguise.`,
        },
        {
          title: "Loops",
          summary: "for, while, for...of — and when to stop looping.",
          minutes: 18,
          language: "javascript",
          content: `## The three loops you need

\`\`\`js
// 1. classic for — when you need the index
for (let i = 0; i < lessons.length; i++) {
  console.log(\`Lesson \${i + 1}: \${lessons[i]}\`);
}

// 2. for...of — iterate values (the modern default for arrays)
const scores = [72, 88, 95];
for (const score of scores) {
  console.log(score);
}

// 3. while — repeat until a condition fails
let attempts = 0;
let solved = false;
while (!solved && attempts < 3) {
  solved = trySolve();
  attempts++;
}
\`\`\`

\`for...of\` is the one you'll reach for most: it gives you each value directly, no index bookkeeping.

## Breaks and continues

\`\`\`js
for (const n of numbers) {
  if (n === 0) continue; // skip
  if (n > 100) break;    // stop entirely
}
\`\`\`

> Infinite loops are a rite of passage: a \`while\` whose condition never becomes false freezes the tab. If your page hangs, look for a loop that can't end.`,
        },
        {
          title: "Functions",
          summary: "Declarations, parameters, return values and arrow functions.",
          minutes: 22,
          language: "javascript",
          content: `## A function is a named recipe

\`\`\`js
function scoreQuiz(correct, total) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

scoreQuiz(5, 6); // 83
\`\`\`

- **Parameters** are the inputs; **return** is the single output
- A function with no \`return\` gives back \`undefined\`
- Code after a \`return\` in the same path never runs

## Default parameters and rest

\`\`\`js
function greet(name, greeting = "Hi") {
  return \`\${greeting}, \${name}!\`;
}
greet("Sam"); // "Hi, Sam!"

function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10
\`\`\`

## Arrow functions

\`\`\`js
const double = (n) => n * 2;
const byTitle = (a, b) => a.title.localeCompare(b.title);
\`\`\`

Arrows are shorter, and they inherit \`this\` from their surrounding scope — which is why they're the standard form for callbacks:

\`\`\`js
list.addEventListener("click", (event) => {
  handle(event); // 'this' is what you expect
});
\`\`\`

> Design rule: a function should do one thing and be nameable in a sentence. "computes course progress" is a function; "computes course progress and also sends an email" is two functions.`,
        },
      ],
    },
    {
      title: "Data and the DOM",
      description: "Arrays, objects, and talking to the page.",
      lessons: [
        {
          title: "Arrays and objects",
          summary: "The two data structures behind almost everything.",
          minutes: 22,
          language: "javascript",
          content: `## Arrays: ordered lists

\`\`\`js
const lessons = ["Intro", "Variables", "Loops"];

lessons.length;        // 3
lessons.push("Functions");   // add to end
lessons.shift();             // remove from start
lessons.includes("Loops");  // true

// The three methods you'll use most:
lessons.map((l) => l.toUpperCase());
lessons.filter((l) => l.length > 5);
lessons.find((l) => l === "Loops");
\`\`\`

\`map\` transforms every element, \`filter\` keeps the ones that pass a test, \`find\` returns the first match. They all return a *new* array — the original is untouched.

## Objects: labeled data

\`\`\`js
const course = {
  title: "JavaScript Basics",
  lessons: 12,
  tags: ["beginner", "web"],
  meta: { author: "John Carter" }, // nesting is fine
};

course.title;          // dot access
course["lessons"];     // bracket access (for computed names)
course.tags.push("logic"); // mutate a nested array

// modern: iterate entries
for (const [key, value] of Object.entries(course)) {
  console.log(key, value);
}
\`\`\`

Destructuring pulls values out in one line:

\`\`\`js
const { title, lessons: count } = course;
const [first, second] = lessons;
\`\`\`

> Rule of thumb: arrays for "a list of things", objects for "one thing with named facts".`,
        },
        {
          title: "The DOM: select, read, update",
          summary: "JavaScript meets the page: elements, text, attributes, events.",
          minutes: 25,
          language: "javascript",
          content: `## Select elements

\`\`\`js
const title = document.querySelector("h1");        // first match
const cards = document.querySelectorAll(".card");  // all matches
const byId = document.getElementById("total");
\`\`\`

## Read and update

\`\`\`js
title.textContent = "Updated title";
byId.textContent = "42";

// attributes and classes
const btn = document.querySelector(".enroll");
btn.setAttribute("disabled", "true");
btn.classList.add("is-loading");
btn.classList.toggle("hidden");

// an element's own data
const data = document.querySelector("[data-course-id]");
data.dataset.courseId; // "html-101"
\`\`\`

## Events: the page talking back

\`\`\`js
const button = document.querySelector(".enroll");

button.addEventListener("click", () => {
  button.textContent = "Enrolled!";
  button.disabled = true;
});
\`\`\`

- Events **fire** — click, input, submit, keydown…
- The handler receives an \`event\` object: \`event.target\` is the element
- Forms: listen for \`submit\` on the form and call \`event.preventDefault()\` to stop the page reload

> The whole interactive web is this loop: select element → attach handler → update state → update element. Everything else is scale.`,
        },
      ],
    },
    {
      title: "Practice and Beyond",
      description: "Build two interactive projects, then look ahead.",
      lessons: [
        {
          title: "Practice: number guessing game",
          summary: "A complete mini-game with input, logic and feedback.",
          minutes: 30,
          language: "javascript",
          content: `## The brief

A single page where the computer picks a number 1–100 and the player guesses:

1. On load, pick \`Math.floor(Math.random() * 100) + 1\`
2. A number input + "Guess" button
3. Feedback text: "Too high", "Too low", or "You got it in N tries"
4. Disable input after a win; a "Play again" button resets state
5. Validate: non-numbers and out-of-range get a friendly error, not a crash

## Architecture hints

\`\`\`js
let target, tries;

function newGame() { target = /* … */; tries = 0; reset UI; }
function makeGuess() {
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1 || value > 100) { /* error */ return; }
  tries++;
  // compare and update feedback
}
\`\`\`

- Keep game state in two variables; the DOM is just a view of it
- \`Number(input.value)\` + \`Number.isInteger\` handles the validation
- After finishing, count your functions — aim for three: newGame, makeGuess, and one helper

> Ship it, then extend: show the best (fewest tries) across rounds. That's the difference between a toy and a system.`,
          exercise: {
            title: "Guessing game checkpoint",
            instructions:
              "Paste your JavaScript for the guessing game. In two sentences, explain how you prevent invalid guesses from breaking the game.",
            language: "javascript",
            starterCode: "let target = 0;\nlet tries = 0;\n\nfunction newGame() {\n  // pick target, reset UI\n}\n\nfunction makeGuess() {\n  // validate, compare, update feedback\n}\n\nnewGame();",
            expectedBehavior:
              "Valid guesses give correct high/low feedback; the game ends exactly on the right number with a try count; invalid input shows an error without crashing; Play again fully resets state.",
          },
        },
        {
          title: "Practice: interactive checklist",
          summary: "Add/remove items, live progress — a real app pattern.",
          minutes: 35,
          language: "javascript",
          content: `## The brief

A mini checklist app:

1. An input + "Add" button appends items to a list
2. Each item has a checkbox; checking it strikes the item through (\`classList\`)
3. A progress line updates live: "3 of 8 done" + a bar whose width is the percentage
4. An "×" button removes an item
5. Empty input is rejected with a hint

## The pattern: state → render

\`\`\`js
let items = []; // [{ id, text, done }]

function render() {
  // rebuild the list + progress from \`items\`
}

function addItem() {
  items.push({ id: nextId++, text: input.value.trim(), done: false });
  input.value = "";
  render();
}
\`\`\`

Instead of sprinkling DOM edits across event handlers, mutate **state** and call **render()**. It's the same idea behind every frontend framework — you're learning the core loop early.

## Event delegation (stretch)

One listener on the list container handles clicks on all items (including future ones):

\`\`\`js
list.addEventListener("click", (e) => {
  const itemEl = e.target.closest("[data-id]");
  if (!itemEl) return;
  // toggle or remove by data-id
});
\`\`\`

> When you finish this, you've built the skeleton of a to-do app — the classic first "real" project, with the architecture that scales.`,
          exercise: {
            title: "Checklist checkpoint",
            instructions:
              "Paste your render() function and the list click handler. In one sentence, why does mutating state + re-rendering beat editing individual elements?",
            language: "javascript",
            starterCode: "let items = [];\n\nfunction render() {\n  // rebuild list + progress from items\n}\n\nfunction addItem() {\n  // validate, push, render\n}",
            expectedBehavior:
              "Adding items updates list and progress instantly; checking items strikes them through and updates the count; removing items works; invalid input is rejected.",
          },
        },
        {
          title: "Modern JavaScript you should know",
          summary: "Templates, spread, optional chaining, async — the working set.",
          minutes: 20,
          language: "javascript",
          content: `## Template literals

\`\`\`js
const course = { title: "CSS", hours: 14 };
\`You're enrolled in \${course.title} — about \${course.hours}h.\`
\`\`\`

## Spread and rest

\`\`\`js
const defaults = { theme: "light", pageSize: 9 };
const settings = { ...defaults, theme: "dark" }; // merge + override

const first = [...scores].sort((a, b) => a - b)[0]; // copy, don't mutate
\`\`\`

## Optional chaining and nullish

\`\`\`js
profile?.phone?.slice(0, 3);   // no crash if profile/phone missing
const name = user.firstName ?? user.username ?? "Anonymous";
\`\`\`

## A taste of async

\`\`\`js
async function loadCourse(slug) {
  const res = await fetch(\`/api/courses/\${slug}\`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
}
\`\`\`

\`async/await\` makes asynchronous code read like a straight-line recipe. Full deep-dive on promises and fetch is a later course — for now, recognize the pattern.

> These five features (templates, spread, optional chaining, nullish coalescing, async/await) cover most modern code you'll read. Everything else is vocabulary.`,
        },
        {
          title: "Course review",
          summary: "Self-check, next steps, and how to keep practicing.",
          minutes: 10,
          language: "javascript",
          content: `## The self-check

Can you, without notes:

- Write a function that returns 0–100 from correct/total, handling total = 0?
- Explain why \`===\` is safer than \`==\`?
- Use \`map\` + \`filter\` to transform a list of lesson objects?
- Build the guessing game from the brief?
- Attach a submit handler that prevents the page reload?

## Where to go next

1. **Node.js** — run JavaScript outside the browser, build a server
2. **APIs** — fetch, promises, error handling at depth
3. **TypeScript** — the type system that makes large codebases survive

## Practice habit

One small project a week beats reading for three hours. Good next builds: a live word counter for a textarea, a tab switcher, a clock that updates every second. Small, shipped, yours.`,
        },
      ],
    },
  ],
};

export const pythonCourse: CourseSeed = {
  title: "Python Fundamentals",
  slug: "python",
  description:
    "A gentle, practical introduction to Python: variables, logic, loops, data structures and functions — with small programs after every concept.",
  categorySlug: "python",
  difficulty: "beginner",
  durationHours: 10,
  status: "published",
  objectives: [
    "Write and run Python scripts",
    "Use variables, types and basic operators",
    "Structure code with conditionals and loops",
    "Work with lists, dicts and strings",
    "Write clean functions with clear contracts",
  ],
  prerequisites: ["No prior experience required"],
  modules: [
    {
      title: "Getting Started",
      description: "The language, the basics, and your first decisions.",
      lessons: [
        {
          title: "What is Python?",
          summary: "Why Python, how to run it, and reading your first script.",
          minutes: 12,
          language: "python",
          content: `## Python: readable by design

Python is a general-purpose language used for web apps, data, automation and scripting. Its signature trait is **readability** — the syntax forces structure:

\`\`\`python
name = "Sam"
print(f"Hello, {name}!")
\`\`\`

No semicolons, no braces — **indentation is the code's structure**. Four spaces per level (pick one, be consistent):

\`\`\`python
def greet(name):
    if name:
        print(f"Hi, {name}")
    else:
        print("Hi, stranger")
\`\`\`

## Running it

- Save as \`hello.py\` and run: \`python hello.py\`
- Or interactive mode: \`python\` in a terminal, type lines, hit Enter

\`\`\`python
>>> 6 * 7
42
>>> "learn".upper()
"LEARN"
\`\`\`

> Python's philosophy: there should be one obvious way to do it. The language fights against cleverness, which is exactly why beginners keep their sanity.`,
        },
        {
          title: "Variables and types",
          summary: "Names, values, and Python's dynamic typing.",
          minutes: 15,
          language: "python",
          content: `## Variables are names for values

\`\`\`python
course = "Python Fundamentals"   # str
lessons = 9                      # int
hours = 10.5                     # float
published = True                 # bool
\`\`\`

Python is **dynamically typed**: you don't declare types, and a name can even be rebound to a different type (though you shouldn't):

\`\`\`python
type(lessons)    # <class 'int'>
str(lessons)     # "9"
float("10.5")    # 10.5
\`\`\`

## Conversions you'll actually use

\`\`\`python
age = int("30")          # text → number (for input)
message = f"Age: {age}"  # f-strings: format values into text
\`\`\`

\`input()\` always returns a **string** — convert explicitly when you need math:

\`\`\`python
guess = int(input("Pick 1-10: "))
\`\`\`

## Naming rules

- \`snake_case\`: \`course_title\`, \`max_attempts\`
- Descriptive beats clever: \`num_enrolled\`, not \`n\` (in production code)
- Conventions are strong in Python: \`UPPER_SNAKE\` for constants, \`CamelCase\` for classes`,
        },
        {
          title: "Conditionals",
          summary: "if / elif / else and writing clean branches.",
          minutes: 15,
          language: "python",
          content: `## The branch

\`\`\`python
percent = 72

if percent >= 90:
    result = "excellent"
elif percent >= 70:
    result = "passed"
else:
    result = "keep practicing"

print(result)
\`\`\`

Indentation *is* the block — the lines under \`if\` belong to it.

## Comparison and logic

\`\`\`python
5 < x <= 10          # chained comparison (Pythonic!)
name == "sam"        # equality is ==
x != 0 and y > 1     # and / or / not — lowercase words
\`\`\`

## Truthiness

\`\`\`python
if user:        # non-empty string, list, etc. → True
if items:       # empty list → False
if score is not None:   # the precise None check
\`\`\`

> Pythonic style: test the condition you *want* to be true (\`if user:\`), not its negation wrapped in \`not\`. Readable branches are debuggable branches.`,
        },
      ],
    },
    {
      title: "Control Flow and Data",
      description: "Loops, lists, dicts, strings — the working set.",
      lessons: [
        {
          title: "Loops",
          summary: "for, range and while — repeating the right way.",
          minutes: 16,
          language: "python",
          content: `## for with range — the workhorse

\`\`\`python
for i in range(5):        # 0,1,2,3,4
    print(i)

for i in range(1, 10, 2): # 1,3,5,7,9
    print(i)
\`\`\`

## Iterating collections

\`\`\`python
lessons = ["Intro", "Variables", "Loops"]

for lesson in lessons:            # values
    print(lesson)

for index, lesson in enumerate(lessons):   # value + position
    print(index + 1, lesson)
\`\`\`

## while — repeat until done

\`\`\`python
attempts = 0
solved = False
while not solved and attempts < 3:
    solved = try_solve()
    attempts += 1    # += is the standard increment
\`\\"\`\`

\`break\` exits the loop; \`continue\` skips to the next iteration.

> If you find yourself managing a counter manually, ask whether you're iterating the wrong collection — Python's \`for\` handles the counting when you loop over the thing itself.`,
        },
        {
          title: "Lists and dictionaries",
          summary: "The two structures behind most Python programs.",
          minutes: 20,
          language: "python",
          content: `## Lists: ordered collections

\`\`\`python
scores = [72, 88, 95]
scores.append(91)
scores[0]          # 72
scores[-1]         # 91 (last element)
len(scores)        # 4
"95" in ["95", "80"]  # membership

# comprehensions — list + transformation in one line
doubled = [s * 2 for s in scores]
passed = [s for s in scores if s >= 70]
\`\`\`

## Dictionaries: labeled data

\`\`\`python
course = {
    "title": "Python Fundamentals",
    "lessons": 9,
    "tags": ["beginner"],
}

course["title"]               # lookup
course.get("instructor")      # None instead of an error
course["rating"] = 4.8        # add / update

for key, value in course.items():
    print(key, "=", value)
\`\`\`

## Which one?

- **List** — "a bunch of things in order": scores, steps, items
- **Dict** — "facts about one thing": a course, a user, a config
- **Tuple** (bonus) — fixed, immutable lists: \`point = (3, 4)\`

> The comprehension (\`[x for x in items if cond]\`) is the most Pythonic line you'll learn this month. Master it and half of your beginner code shrinks in half.`,
        },
        {
          title: "Strings and functions",
          summary: "Text tools, and packaging logic the Python way.",
          minutes: 20,
          language: "python",
          content: `## String tools

\`\`\`python
text = "  Learn Python  "
text.strip()            # "Learn Python"
text.lower()            # "learn python"
" and ".join(["HTML", "CSS"])  # "HTML and CSS"
"split".split("p")      # ["spl", "it"]
"bracket".replace("b", "c")
"python" in "let's learn python"
\`\`\`

f-strings for formatting (you've seen them — now the range):

\`\`\`python
price, qty = 19.9, 3
total = price * qty
print(f"{total:.2f}")        # 59.70
print(f"{title:^20}")        # center in 20 chars
\`\`\`

## Functions

\`\`\`python
def score_quiz(correct, total, passing=70):
    """Return the percent and whether it passed."""
    if total == 0:
        return 0, False
    percent = round(correct / total * 100)
    return percent, percent >= passing
\`\`\`

- Docstrings (the triple-quoted string) document the contract
- Default parameters make arguments optional
- **Multiple return values** are just a tuple — unpack them:

\`\`\`python
percent, passed = score_quiz(5, 6)
\`\`\`

- \`return\` immediately exits the function — use it to avoid deep nesting

> Python functions should read like documentation. If you can't name what a function does in one line of prose, split it.`,
        },
      ],
    },
    {
      title: "Practice",
      description: "Two small programs that use everything.",
      lessons: [
        {
          title: "Practice: temperature converter",
          summary: "A menu-driven tool with input, validation and output.",
          minutes: 25,
          language: "python",
          content: `## The brief

A script that converts temperatures:

1. Ask for a number and a scale (\`c\` or \`f\`)
2. Print the other scale, rounded to 1 decimal
3. Invalid input → friendly error, ask again (loop until valid)
4. Type \`q\` to quit

## Skeleton

\`\`\`python
def to_fahrenheit(c):
    return c * 9 / 5 + 32

def to_celsius(f):
    return (f - 32) * 5 / 9

while True:
    raw = input("Temperature (or 'q' to quit): ")
    if raw.strip().lower() == "q":
        break
    # parse, validate, convert, print
\`\`\`

## Design notes

- The two conversion functions are pure: same input, same output, no side effects — easy to test
- Keep parsing/validation in the loop, math in the functions
- \`float(raw)\` raises \`ValueError\` on junk — catch it: \`try: ... except ValueError: ...\`

> Exception handling (\`try\`/\`except\`) is your first taste of "the program survives bad input." That habit separates scripts that work from scripts that die.`,
          exercise: {
            title: "Converter checkpoint",
            instructions:
              "Paste your main loop and the two conversion functions. In one sentence, how does the program keep running after the user types a letter instead of a number?",
            language: "python",
            starterCode: "def to_fahrenheit(c):\n    return c * 9 / 5 + 32\n\n\ndef to_celsius(f):\n    return (f - 32) * 5 / 9\n\n\nwhile True:\n    raw = input(\"Temperature (or 'q' to quit): \")\n    # validate, convert, print\n",
            expectedBehavior:
              "Valid input converts correctly (0C → 32.0F); invalid input shows an error and prompts again; 'q' exits cleanly.",
          },
        },
        {
          title: "Practice: word frequency counter",
          summary: "Read text, count words, report the top 5.",
          minutes: 30,
          language: "python",
          content: `## The brief

Given a paragraph (paste or file), report the 5 most common words:

\`\`\`
and — 12
the — 9
python — 7
...
\`\`\`

## Steps

1. Normalize: lowercase, strip punctuation (a simple loop or \`str.translate\`)
2. Split into words
3. Count into a dictionary:

\`\`\`python
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
\`\`\`

(or the one-liner with \`collections.Counter\` — learn both)

4. Sort and show the top 5:

\`\\"\`\`python
top = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:5]
for word, n in top:
    print(f"{word} — {n}")
\`\`\`

## Stretch

- Skip a stopword list (the, and, is…) — real counting tools do this
- Read from a file: \`open("text.txt").read()\`

> This program contains the classic "etl" shape — extract, transform, aggregate, report — that appears in data work of every scale. You just built it in 20 lines.`,
          exercise: {
            title: "Counter checkpoint",
            instructions:
              "Paste your counting function and the top-5 reporting code. In one sentence, what does `sorted(..., key=lambda item: item[1])` sort by?",
            language: "python",
            starterCode: "def count_words(text):\n    # normalize, split, count → dict\n    pass\n\n\ndef top_words(counts, n=5):\n    # return list of (word, count) tuples\n    pass\n",
            expectedBehavior:
              "Counts are case-insensitive and punctuation-free; the top 5 print in descending count order; empty input produces no crash.",
          },
        },
        {
          title: "Course review",
          summary: "What you know now, and the path forward.",
          minutes: 10,
          language: "python",
          content: `## The self-check

Can you, without notes:

- Explain what indentation does in Python?
- Write a function with a default parameter that returns two values?
- Build a dict of word counts from a string?
- Loop until valid input using \`try\`/\`except\`?
- Write a list comprehension that filters and transforms?

## Where to go next

1. **Files and modules** — read/write data, import your own code
2. **Classes and objects** — model real things with state
3. **Virtual environments and packaging** — real projects, real dependencies
4. **SQL/MySQL** — the data layer behind most Python apps

## Keep the habit

Python's friendliness is a trap if you only read. Twenty minutes of building beats two hours of watching — the converter and the counter are both a weekend's distance from something genuinely useful.`,
        },
      ],
    },
  ],
};

export const nodeCourse: CourseSeed = {
  title: "Node.js Fundamentals",
  slug: "nodejs",
  description:
    "JavaScript on the server: the runtime, the event loop, modules, the filesystem, and your first HTTP server.",
  categorySlug: "nodejs",
  difficulty: "beginner",
  durationHours: 8,
  status: "published",
  objectives: [
    "Explain what Node.js is and where it runs",
    "Use modules to structure a project",
    "Read and write files asynchronously",
    "Build a plain HTTP server",
    "Install and use npm packages",
  ],
  prerequisites: ["JavaScript Basics (or equivalent)"],
  modules: [
    {
      title: "Node Fundamentals",
      description: "The runtime, its model, and project structure.",
      lessons: [
        {
          title: "What is Node.js?",
          summary: "The same language, a different machine.",
          minutes: 14,
          language: "node",
          content: `## Node.js: JavaScript beyond the browser

Node.js is a **runtime** — it runs JavaScript outside the browser, on servers, in CLI tools, in build systems. Same language you know (variables, functions, arrays), new environment:

- No DOM, no \`window\`
- New globals: \`process\`, \`__dirname\`, \`require\`/\`import\`
- New superpowers: files, network, child processes

\`\`\`bash
node app.js
\`\`\`

That's it — a .js file with no HTML becomes a program.

## Why servers love it

Browsers run code and wait. Servers handle **many** connections at once. Node's model (one thread, non-blocking I/O) handles thousands of waiting connections without spawning thousands of threads — which is why it's a default choice for APIs and real-time apps.

> You're not learning a new language. You're learning a new *place* for your existing language to live.`,
        },
        {
          title: "The event loop and modules",
          summary: "Async thinking, and how projects are split into files.",
          minutes: 18,
          language: "node",
          content: `## One thread, no blocking

Node executes your code, and when it hits I/O (file read, network call), it **registers a callback** and moves on. The event loop queues up finished work:

\`\`\`javascript
console.log("1: start");

setTimeout(() => console.log("3: later"), 100);

console.log("2: now");
// prints: 1, 2, 3
\`\`\`

Synchronous code runs in order; scheduled/async work waits its turn. This is why \`await\` (from promises) exists — to write async code without callback nesting.

## Modules: split your program

\`\`\`javascript
// math.js
export function score(correct, total) {
  return Math.round((correct / total) * 100);
}

// app.js
import { score } from "./math.js";
console.log(score(5, 6)); // 83
\`\`\`

- \`export\` publishes a name; \`import\` pulls it in (ES modules — the modern default)
- \`node --version\` + \`"type": "module"\` in package.json enables imports
- Organize by concern: one file per feature, small files, clear names

> The event loop is the single concept that explains why Node "feels different" from browser JS. Everything async you'll ever do — fetch, fs, databases — flows through it.`,
        },
        {
          title: "Working with the filesystem",
          summary: "Reading and writing files with the async fs API.",
          minutes: 18,
          language: "node",
          content: `## The fs module

\`\`\`javascript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// read
const text = await readFile(join(process.cwd(), "notes.txt"), "utf8");

// write (create missing directories first)
const dir = join(process.cwd(), "out");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "summary.txt"), text.toUpperCase());
\`\`\`

Key habits:

- **Always use the promises API** (\`node:fs/promises\`) with \`await\` — the callback style is legacy
- \`join()\` from \`node:path\` builds cross-platform paths (never hand-concatenate with \`/\`)
- \`process.cwd()\` is your starting directory; resolve relative to it

## Reading a directory

\`\`\`javascript
import { readdir } from "node:fs/promises";

const files = await readdir("src");
const modules = files.filter((f) => f.endsWith(".js"));
console.log(modules);
\`\`\`

> File I/O is the most common Node task after serving HTTP. Get fluent with \`readFile\`/\`writeFile\`/\`readdir\` and you can script half of your workflow.`,
        },
      ],
    },
    {
      title: "Practical Node",
      description: "A real server, and the package ecosystem.",
      lessons: [
        {
          title: "Your first HTTP server",
          summary: "The http module, requests, responses, status codes.",
          minutes: 25,
          language: "node",
          content: `## A server in 10 lines

\`\`\`javascript
import { createServer } from "node:http";

const server = createServer((req, res) => {
  const { method, url } = req;

  if (url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("Hello from Node");
    return;
  }

  if (url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
\`\`\`

Request in (\`req\`: method, url, headers, body stream), response out (\`res\`: status, headers, body). That's the whole contract — every web framework wraps this.

## Status codes you'll use

- \`200\` OK — success
- \`201\` Created — resource made
- \`400\` — bad input, \`404\` — not found, \`405\` — method not allowed
- \`500\` — your bug, be honest about it

> Run it, curl it (\`curl http://localhost:3000/api/health\`), break it on purpose (wrong URL → 404). You now own a server. Frameworks are just a nicer routing layer on top of this.`,
          exercise: {
            title: "Health endpoint challenge",
            instructions:
              "Extend the server with a GET /api/info endpoint returning JSON: { name, version (from package.json), startedAt (ISO date), uptimeSeconds }. Return 405 for any other method on that path.",
            language: "node",
            starterCode: "import { createServer } from \"node:http\";\n\nconst server = createServer((req, res) => {\n  // route / and /api/health and /api/info\n});\n\nserver.listen(3000);",
            expectedBehavior:
              "GET /api/info returns valid JSON with all four fields; POST /api/info returns 405; unknown paths return 404.",
          },
        },
        {
          title: "npm and packages",
          summary: "package.json, dependencies, and using others' code.",
          minutes: 16,
          language: "node",
          content: `## package.json: the project's manifest

\`\`\`json
{
  "name": "my-api",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "zod": "^3.25.0"
  }
}
\`\\"\`\`

- \`"type": "module"\` — enable import/export
- \`scripts\` — \`npm run dev\` runs the command without typing node
- \`--watch\` restarts on file changes: a zero-config dev loop

## Installing and using packages

\`\`\`bash
npm init -y
npm install zod
\`\`\`

\`\`\`javascript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(13),
});

const result = schema.safeParse({ email: "sam@x.com", age: 20 });
console.log(result.success); // true
\`\`\`

- \`npm install <pkg>\` adds to dependencies + node_modules
- \`npm install -D <pkg>\` for dev tools (linters, test runners)
- \`node_modules\` is disposable — never commit it; \`package-lock.json\` pins exact versions — always commit it

> The npm registry is the largest package ecosystem in the world. The skill isn't "writing everything yourself" — it's knowing what to trust, pinning versions, and reading docs.`,
        },
        {
          title: "Course review",
          summary: "Where Node goes next: Express, databases, testing.",
          minutes: 10,
          language: "node",
          content: `## The self-check

Can you:

- Explain what makes Node different from browser JavaScript?
- Describe what the event loop does in one sentence?
- Read a file and write one with the promises API?
- Build a server with two routes and a 404 fallback?
- Add a dependency and a dev script?

## The natural next steps

1. **Express.js** — routing, middleware, JSON bodies: the standard way to structure APIs (its own course is coming)
2. **APIs** — REST design, validation, error handling at the protocol level
3. **Databases** — connect Node to PostgreSQL/MySQL with a query layer
4. **Testing** — vitest, testing services before routes

## A project to glue it all together

A tiny JSON "notes" API: \`GET /notes\`, \`POST /notes\`, persisted to a JSON file on disk (your fs skills), with input validation (zod). It's small, it's real, and it touches everything in this course.`,
        },
      ],
    },
  ],
};

export const mysqlCourse: CourseSeed = {
  title: "MySQL and SQL Fundamentals",
  slug: "mysql",
  description:
    "Relational data, step by step: databases and tables, SELECT, filtering, joins, and the full CRUD cycle — with a running example schema.",
  categorySlug: "mysql",
  difficulty: "beginner",
  durationHours: 9,
  status: "draft",
  objectives: [
    "Model real data as relational tables",
    "Query with SELECT, WHERE, ORDER BY, LIMIT",
    "Join related tables correctly",
    "Insert, update and delete safely",
    "Design a small normalized schema",
  ],
  prerequisites: ["Basic SQL exposure helpful but not required"],
  modules: [
    {
      title: "Relational Foundations",
      lessons: [
        {
          title: "Databases, tables and relationships",
          summary: "The relational model in plain language.",
          minutes: 15,
          language: "sql",
          content: `## Why relational?

A database stores data in **tables** — rows of records, columns of fields. Relationships live in **IDs**, not in nested copies:

\`\`\`
users            courses           enrollments
─────────        ─────────         ───────────
id  name         id  title         id  user_id  course_id
1   Sam          1   HTML          1   1        1
2   Taylor       2   CSS           2   1        2
                         3   JS    3   2        3
\`\`\`

The enrollments table is the **link** between users and courses — one row per pair. This pattern (many-to-many through a join table) appears everywhere.

## The rules that make it work

- Every table needs a **primary key** (unique id per row)
- Foreign keys point at another table's primary key
- **Normalization** = no duplicated facts. If a student's name appears in five rows, something's wrong

> The relational model's superpower: change one fact in one place, and every query reflects it. No syncing, no drift.`,
        },
        {
          title: "Creating tables: DDL in practice",
          summary: "CREATE TABLE, data types, keys and constraints.",
          minutes: 20,
          language: "sql",
          content: `## A table, properly declared

\`\`\`sql
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  title         VARCHAR(200) NOT NULL,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  difficulty    VARCHAR(20)  NOT NULL DEFAULT 'beginner',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE enrollments (
  id        UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (user_id, course_id)
);
\`\\"\`\`

- \`NOT NULL\` — the fact must exist
- \`UNIQUE\` — no duplicates (slugs, emails)
- \`REFERENCES ... ON DELETE CASCADE\` — delete a course, its enrollments go too
- \`UNIQUE (user_id, course_id)\` — a composite uniqueness rule: one enrollment per pair

## Choosing types (the ones you'll use)

\`\`\`
VARCHAR(n)  — text with a cap
TEXT        — longer text
INTEGER     — counts
NUMERIC(p,s)— money (never FLOAT)
TIMESTAMPTZ — always with timezone
BOOLEAN     — yes/no
\`\`\`

> Constraints are your first line of data integrity. A database that accepts impossible data is a database that will eventually produce it.`,
        },
      ],
    },
    {
      title: "Querying Data",
      lessons: [
        {
          title: "SELECT: the core query",
          summary: "FROM, WHERE, ORDER BY, LIMIT — and aggregates.",
          minutes: 20,
          language: "sql",
          content: `## The query shape

\`\`\`sql
SELECT title, difficulty
FROM courses
WHERE difficulty = 'beginner'
ORDER BY title
LIMIT 10;
\`\`\`

Reading order (logical): \`FROM\` → \`WHERE\` → \`SELECT\` → \`ORDER BY\` → \`LIMIT\`. "From this table, keep these rows, show these columns, sorted, capped."

## Filtering

\`\`\`sql
WHERE created_at >= '2026-01-01'
  AND title ILIKE '%python%'      -- case-insensitive LIKE
  AND id IN ('a1', 'b2')
  AND slug IS NOT NULL
\`\`\`

## Aggregates — answers, not rows

\`\`\`sql
SELECT difficulty, COUNT(*) AS n
FROM courses
GROUP BY difficulty;

SELECT course_id, COUNT(*) AS students
FROM enrollments
GROUP BY course_id
HAVING COUNT(*) >= 5;   -- filter on the aggregate
\`\\"\`\`

\`WHERE\` filters rows before grouping; \`HAVING\` filters groups after.

> Learn to read \`EXPLAIN\` for your big queries someday — but first, make every query answer a question you can state in one sentence.`,
        },
        {
          title: "JOINs: combining related tables",
          summary: "INNER, LEFT — and the cardinality mindset.",
          minutes: 22,
          language: "sql",
          content: `## Why join?

Facts live in different tables. A "student's courses with progress" answer needs users + enrollments + courses in one result:

\`\`\`sql
SELECT u.name, c.title
FROM users u
JOIN enrollments e ON e.user_id = u.id
JOIN courses c     ON c.course_id = e.id;
\`\`\`

The \`ON\` clause states how rows from two tables match.

## INNER vs LEFT

\`\`\`sql
-- users WITH at least one course:
FROM users u
JOIN enrollments e ON e.user_id = u.id

-- ALL users, course info NULL when none:
FROM users u
LEFT JOIN enrollments e ON e.user_id = u.id
\`\\"\`\`

- \`INNER JOIN\` — only rows with a match on both sides
- \`LEFT JOIN\` — all rows from the left; NULLs where the right has nothing

## Cardinality first

Before writing the JOIN, say the relationship out loud: "one user has many enrollments; one enrollment belongs to one user." If you can't say it, your join will be wrong — usually producing duplicate rows (the classic 1×100 explosion).

> JOINs are just a search: for each left row, find matching right rows. If you can explain the relationship in a sentence, you can write the query.`,
        },
      ],
    },
    {
      title: "Writing Data",
      lessons: [
        {
          title: "INSERT, UPDATE, DELETE",
          summary: "The write side of CRUD — safely.",
          minutes: 18,
          language: "sql",
          content: `## Adding rows

\`\`\`sql
INSERT INTO courses (title, slug, difficulty)
VALUES ('PostgreSQL Deep Dive', 'postgresql-advanced', 'advanced');

-- multiple rows at once:
INSERT INTO enrollments (user_id, course_id) VALUES
  ('u1', 'c1'),
  ('u2', 'c1');
\`\\"\`\`

## Changing rows

\`\`\`sql
UPDATE courses
SET difficulty = 'intermediate'
WHERE id = 'c3';
\`\`\`

⚠️ **An UPDATE without WHERE rewrites the whole table.** Make SELECT-ing the target rows a habit before you UPDATE them:

\`\`\`sql
SELECT * FROM courses WHERE id = 'c3';   -- confirm first
UPDATE courses SET ... WHERE id = 'c3';  -- then change
\`\`\`

## Deleting rows

\`\`\`sql
DELETE FROM enrollments
WHERE course_id = 'c9' AND user_id = 'u1';
\`\`\`

Same rule: SELECT first. And know your \`ON DELETE\` behavior — cascades do delete for you.

> The write side is where databases get damaged. The discipline is simple: always know exactly which rows a statement touches before running it.`,
        },
        {
          title: "Practice: design the study-buddy schema",
          summary: "Model a small real system end to end.",
          minutes: 30,
          language: "sql",
          content: `## The brief

Design a schema for a study-buddy app:

- **users**: id, name, email (unique), created_at
- **groups**: id, title, owner (a user), created_at
- **memberships**: user ↔ group (many-to-many), with a \`role\` ('owner' | 'member')
- **meetings**: id, group, title, starts_at

## Requirements

1. Write all four \`CREATE TABLE\` statements with proper keys, FKs and constraints
2. One group has exactly one owner — how do you guarantee it? (hint: a unique constraint on the owner-role membership, or a separate \`owner_id\` — argue your choice)
3. Deleting a group should remove its meetings and memberships
4. Write the query: "all groups with 3+ members, with their titles and member counts"
5. Write the query: "each user's total upcoming meetings (starts_at > now())"

## Quality bar

- No fact stored in two places
- Every FK has a declared delete behavior
- Your queries run and return the rows you'd predict by hand

> Schema design is the skill that compounds: every future database you touch is variations on this brief.`,
          exercise: {
            title: "Schema checkpoint",
            instructions:
              "Paste your CREATE TABLE statements and the 'groups with 3+ members' query. In two sentences, explain how you guarantee one owner per group.",
            language: "sql",
            starterCode: "CREATE TABLE users (...);\nCREATE TABLE groups (...);\nCREATE TABLE memberships (...);\nCREATE TABLE meetings (...);\n\n-- groups with 3+ members:\n-- SELECT ...",
            expectedBehavior:
              "All four tables create cleanly; a second owner-role membership for the same group is rejected; deleting a group cascades to memberships and meetings; both queries return correct counts.",
          },
        },
      ],
    },
  ],
};
