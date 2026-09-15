/**
 * DEVELOPMENT SEED DATA — categories (the initial platform catalog).
 * Admins can add more in later phases; the UI never hard-codes this list.
 */
export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  section: "front_end" | "back_end" | "databases" | "languages" | "full_stack" | "other";
  sortOrder: number;
}

export const devCategories: CategorySeed[] = [
  { name: "HTML", slug: "html", section: "front_end", description: "The structure of the web: markup, documents, forms and semantics.", sortOrder: 1 },
  { name: "CSS", slug: "css", section: "front_end", description: "Styling and layout: from the box model to Flexbox, Grid and responsive design.", sortOrder: 2 },
  { name: "Tailwind CSS", slug: "tailwind-css", section: "front_end", description: "Utility-first styling for building interfaces fast. (Course in development.)", sortOrder: 3 },
  { name: "JavaScript", slug: "javascript", section: "front_end", description: "The language of the web: logic, functions, data and the DOM.", sortOrder: 4 },
  { name: "Node.js", slug: "nodejs", section: "back_end", description: "JavaScript on the server: runtime, modules and building services.", sortOrder: 5 },
  { name: "Express.js", slug: "expressjs", section: "back_end", description: "The minimal web framework for Node.js. (Course in development.)", sortOrder: 6 },
  { name: "APIs", slug: "apis", section: "back_end", description: "Designing and consuming HTTP APIs. (Course in development.)", sortOrder: 7 },
  { name: "MySQL", slug: "mysql", section: "databases", description: "Relational databases and SQL, step by step.", sortOrder: 8 },
  { name: "MongoDB", slug: "mongodb", section: "databases", description: "Document data model and queries. (Course in development.)", sortOrder: 9 },
  { name: "PostgreSQL", slug: "postgresql", section: "databases", description: "Advanced relational data. (Course in development.)", sortOrder: 10 },
  { name: "Python", slug: "python", section: "languages", description: "A friendly, general-purpose language — perfect first steps.", sortOrder: 11 },
  { name: "C++", slug: "cpp", section: "languages", description: "Systems programming and performance. (Course in development.)", sortOrder: 12 },
];
