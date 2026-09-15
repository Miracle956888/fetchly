/**
 * Shared Zod schemas. This module is isomorphic (no Node/Next imports) so the
 * same rules run client-side (fast UX feedback) and server-side (authoritative).
 */
import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be at most 30 characters.")
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?$/, "Use letters, numbers, - and _ only.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/\d/, "Password must contain at least one number.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Full name is too long.")
  .regex(/^[\p{L}][\p{L}\p{M}'’\- ]*$/u, "Enter a valid name.");

export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const countrySchema = z.string().trim().min(2, "Enter a valid country.").max(80).optional().or(z.literal(""));

export const registerSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  country: countrySchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  /** Email OR username. */
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().max(500).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset link."),
  password: passwordSchema,
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  phone: phoneSchema,
  country: countrySchema,
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  timezone: z.string().trim().max(64).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  email: emailSchema,
  subject: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(4000),
});

// ── Course catalog queries ────────────────────────────────────────────────
export const courseListQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["popular", "newest", "title"]).default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(24).default(9),
});

export const courseSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Invalid course slug.");

export const courseIdParamSchema = z
  .string()
  .trim()
  .uuid("Invalid course id.");

export const lessonIdParamSchema = z
  .string()
  .trim()
  .uuid("Invalid lesson id.");

export const enrollmentCreateSchema = z.object({
  courseId: z.string().trim().uuid("Invalid course id."),
});

export const aiAssistantMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(3, "Your question is too short.")
    .max(1500, "Your question is too long."),
  courseId: z.string().trim().uuid().optional(),
  lessonId: z.string().trim().uuid().optional(),
  conversationId: z.string().trim().uuid().optional(),
});
export type AiAssistantMessageInput = z.infer<typeof aiAssistantMessageSchema>;

export const aiSuggestionsQuerySchema = z.object({
  courseId: z.string().trim().uuid().optional(),
  lessonId: z.string().trim().uuid().optional(),
  conversationId: z.string().trim().uuid().optional(),
});

export const progressUpdateSchema = z.object({
  lessonId: z.string().trim().uuid("Invalid lesson id."),
  completed: z.literal(true, { message: "Marking a lesson as not completed is not supported yet." }),
});

export const quizAttemptSubmitSchema = z.object({
  quizId: z.string().trim().uuid("Invalid quiz id."),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().uuid(),
        optionId: z.string().trim().uuid(),
      }),
    )
    .min(1, "Submit at least one answer.")
    .max(50),
});
