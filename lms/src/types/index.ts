import type { Role } from "@/lib/auth/guards";
import type { Language } from "@/db/schema/learning";

export type { Role };
export type { Language };

/** The user shape safe to expose to the client. No password hashes, no internal ids beyond the public user id. */
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  bio: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export type { SessionUser, SessionContext } from "@/lib/auth/session";

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationHours: number | null;
  status: "draft" | "published" | "archived";
  category: { id: string; name: string; slug: string } | null;
  enrollmentsCount: number;
  lessonsCount: number;
  instructorNames: string[];
}

export interface CurriculumOutline {
  modules: {
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    lessons: {
      id: string;
      title: string;
      summary: string | null;
      estimatedMinutes: number;
      sortOrder: number;
      language: string | null;
      hasExercise: boolean;
      hasQuiz: boolean;
    }[];
  }[];
  totalLessons: number;
  totalMinutes: number;
}
