/**
 * Row-scoped authorization policies.
 *
 * These pure functions answer the hard questions — "may THIS user touch THIS
 * resource row?" — using only data already loaded from the database. Services
 * must call them before exposing or mutating data. Keeping them pure makes
 * them trivially unit-testable.
 */
import type { Role } from "@/lib/auth/guards";

export interface CourseLike {
  id: string;
  status: "draft" | "published" | "archived";
}

export interface InstructorAssignmentLike {
  courseId: string;
  userId: string;
}

export interface EnrollmentLike {
  userId: string;
  courseId: string;
  status: "active" | "completed" | "dropped";
}

/** Who may view a course's full content area (curriculum, progress, students)? */
export function canAccessCourseArea(
  role: Role,
  userId: string,
  course: CourseLike,
  opts: { isAssignedToCourse: boolean; isEnrolledInCourse: boolean },
): boolean {
  switch (role) {
    case "admin":
      return true;
    case "instructor":
      return opts.isAssignedToCourse;
    case "student":
      return (
        // Public catalog exposes published courses; enrolled students keep
        // access to a course even if it is later archived.
        course.status === "published" || opts.isEnrolledInCourse
      );
    default:
      return false;
  }
}

/**
 * May `instructorId` inspect `studentId`'s data for `courseId`?
 * Only students who are enrolled in a course the instructor is assigned to
 * (dropped enrollments are no longer visible).
 */
export function instructorCanViewStudent(
  instructorId: string,
  studentId: string,
  courseId: string,
  assignments: InstructorAssignmentLike[],
  enrollment: EnrollmentLike | null,
): boolean {
  if (!enrollment) return false;
  if (enrollment.userId !== studentId || enrollment.courseId !== courseId) return false;
  if (enrollment.status === "dropped") return false;
  return assignments.some((a) => a.userId === instructorId && a.courseId === courseId);
}

/** May `actor` write progress for `ownerId`? (Only self — admins included.) */
export function canWriteProgressFor(actorId: string, ownerId: string): boolean {
  return actorId === ownerId;
}

/** May a student enroll in this course? */
export function canEnroll(role: Role, course: CourseLike): boolean {
  return role === "student" && course.status === "published";
}
