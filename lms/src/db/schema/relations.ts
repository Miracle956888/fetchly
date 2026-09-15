// Central relation map. Kept in one module so table definitions stay free of
// circular imports. Most queries use explicit joins; these relations are
// available for drizzle's query builder when convenient.
import { relations } from "drizzle-orm";
import { categories } from "./categories";
import { courses, courseInstructors } from "./courses";
import { learningPaths, learningPathCourses, lessonModules, lessons, exercises } from "./learning";
import { quizzes, questions, questionOptions, quizAttempts, quizAttemptAnswers } from "./assessments";
import { enrollments, lessonProgress, exerciseAttempts, courseCompletions, certificates } from "./progress";
import { notifications, activityRecords } from "./platform";
import { users, profiles, sessions, passwordResets } from "./users";

export const rCategories = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const rUsers = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  sessions: many(sessions),
  passwordResets: many(passwordResets),
  enrollments: many(enrollments),
  lessonProgress: many(lessonProgress),
  quizAttempts: many(quizAttempts),
  courseCompletions: many(courseCompletions),
  certificates: many(certificates),
  notifications: many(notifications),
  activityRecords: many(activityRecords),
  taughtCourses: many(courseInstructors),
}));

export const rProfiles = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const rCourses = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  instructors: many(courseInstructors),
  modules: many(lessonModules),
  enrollments: many(enrollments),
  courseCompletions: many(courseCompletions),
  certificates: many(certificates),
  inLearningPaths: many(learningPathCourses),
}));

export const rCourseInstructors = relations(courseInstructors, ({ one }) => ({
  course: one(courses, { fields: [courseInstructors.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseInstructors.userId], references: [users.id] }),
}));

export const rLearningPaths = relations(learningPaths, ({ many }) => ({
  entries: many(learningPathCourses),
}));

export const rLearningPathCourses = relations(learningPathCourses, ({ one }) => ({
  learningPath: one(learningPaths, { fields: [learningPathCourses.learningPathId], references: [learningPaths.id] }),
  course: one(courses, { fields: [learningPathCourses.courseId], references: [courses.id] }),
}));

export const rModules = relations(lessonModules, ({ one, many }) => ({
  course: one(courses, { fields: [lessonModules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const rLessons = relations(lessons, ({ one, many }) => ({
  module: one(lessonModules, { fields: [lessons.moduleId], references: [lessonModules.id] }),
  exercises: many(exercises),
  quizzes: many(quizzes),
  lessonProgress: many(lessonProgress),
}));

export const rExercises = relations(exercises, ({ one, many }) => ({
  lesson: one(lessons, { fields: [exercises.lessonId], references: [lessons.id] }),
  attempts: many(exerciseAttempts),
}));

export const rQuizzes = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
  questions: many(questions),
  attempts: many(quizAttempts),
}));

export const rQuestions = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  options: many(questionOptions),
  answers: many(quizAttemptAnswers),
}));

export const rQuestionOptions = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));

export const rQuizAttempts = relations(quizAttempts, ({ one, many }) => ({
  user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  answers: many(quizAttemptAnswers),
}));

export const rQuizAttemptAnswers = relations(quizAttemptAnswers, ({ one }) => ({
  attempt: one(quizAttempts, { fields: [quizAttemptAnswers.attemptId], references: [quizAttempts.id] }),
  question: one(questions, { fields: [quizAttemptAnswers.questionId], references: [questions.id] }),
  option: one(questionOptions, { fields: [quizAttemptAnswers.optionId], references: [questionOptions.id] }),
}));

export const rEnrollments = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const rLessonProgress = relations(lessonProgress, ({ one }) => ({
  user: one(users, { fields: [lessonProgress.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [lessonProgress.lessonId], references: [lessons.id] }),
}));

export const rExerciseAttempts = relations(exerciseAttempts, ({ one }) => ({
  user: one(users, { fields: [exerciseAttempts.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [exerciseAttempts.exerciseId], references: [exercises.id] }),
}));

export const rCourseCompletions = relations(courseCompletions, ({ one }) => ({
  user: one(users, { fields: [courseCompletions.userId], references: [users.id] }),
  course: one(courses, { fields: [courseCompletions.courseId], references: [courses.id] }),
}));

export const rCertificates = relations(certificates, ({ one }) => ({
  completion: one(courseCompletions, { fields: [certificates.completionId], references: [courseCompletions.id] }),
  user: one(users, { fields: [certificates.userId], references: [users.id] }),
  course: one(courses, { fields: [certificates.courseId], references: [courses.id] }),
}));

export const rNotifications = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
