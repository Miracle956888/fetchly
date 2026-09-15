/**
 * DEVELOPMENT SEED DATA — users
 *
 * These accounts exist ONLY for local development and demo purposes.
 * They are clearly labeled, use weak-but-policy-compliant passwords, and
 * should never be created in a production database.
 */
export interface DevUser {
  username: string;
  email: string;
  password: string; // dev-only
  role: "student" | "instructor" | "admin";
  firstName: string;
  lastName: string;
  country?: string;
  bio?: string;
}

export const DEV_PASSWORD = "Dev-2026!";

export const devUsers: DevUser[] = [
  {
    username: "avery.admin",
    email: "admin@dev.learnly",
    password: DEV_PASSWORD,
    role: "admin",
    firstName: "Avery",
    lastName: "Stone",
    country: "United States",
    bio: "Platform administrator.",
  },
  {
    username: "john.carter",
    email: "john.carter@dev.learnly",
    password: DEV_PASSWORD,
    role: "instructor",
    firstName: "John",
    lastName: "Carter",
    country: "United Kingdom",
    bio: "Front-end instructor. Teaching HTML, CSS and JavaScript for over a decade.",
  },
  {
    username: "priya.nair",
    email: "priya.nair@dev.learnly",
    password: DEV_PASSWORD,
    role: "instructor",
    firstName: "Priya",
    lastName: "Nair",
    country: "India",
    bio: "Backend and Python instructor focused on practical fundamentals.",
  },
  {
    username: "sam.rivera",
    email: "sam@dev.learnly",
    password: DEV_PASSWORD,
    role: "student",
    firstName: "Sam",
    lastName: "Rivera",
    country: "Spain",
    bio: "Working through the front-end path. Coffee-driven.",
  },
  {
    username: "taylor.chen",
    email: "taylor@dev.learnly",
    password: DEV_PASSWORD,
    role: "student",
    firstName: "Taylor",
    lastName: "Chen",
    country: "Canada",
    bio: "Career changer — from design to software.",
  },
];
