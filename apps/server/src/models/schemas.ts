import { z } from 'zod';

// ─── Course Schemas ──────────────────────────────────────────────────

export const courseCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const courseReadySchema = z.object({
  title: z.string().min(1, 'Course name is required before going live.'),
  description: z.string().min(1, 'Course description is required before going live.'),
});

// ─── State Machine Transition Schemas ────────────────────────────────

export const scheduleSchema = z.object({
  startTime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  }, { message: 'startTime must be a valid future ISO date string' }),
});

export const rescheduleSchema = z.object({
  startTime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  }, { message: 'startTime must be a valid future ISO date string' }),
});

// ─── Module Schemas ──────────────────────────────────────────────────

export const moduleCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export const moduleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export const revealModuleSchema = z.object({
  revealed: z.boolean().default(true),
});

// ─── Material Schemas (belong to Module) ─────────────────────────────

export const materialCreateSchema = z.object({
  type: z.enum(['FILE', 'URL', 'VIDEO', 'TEXT']),
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
});

export const materialUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
});

// ─── Quiz Schemas (belong to Module) ─────────────────────────────────

export const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'TRUE_FALSE',
                 'singleChoice', 'multipleChoice', 'text', 'trueFalse']),
  choices: z.array(z.string()).optional(),
  correctAnswer: z.union([z.number(), z.array(z.number()), z.string(), z.boolean()]).optional(),
  // Legacy field names (backward compat)
  options: z.array(z.string()).optional(),
  correctIndex: z.number().optional(),
  correctIndices: z.array(z.number()).optional(),
});

export const quizCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema).optional(),
});

export const quizUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  questions: z.array(questionSchema).optional(),
});

export const quizSubmitSchema = z.object({
  answers: z.array(z.object({
    uuid: z.string(),
    selectedIndex: z.number().optional(),
    selectedIndices: z.array(z.number()).optional(),
    textAnswer: z.string().optional(),
    selectedAnswer: z.boolean().optional(),
  })),
});

// ─── Participant Schemas ─────────────────────────────────────────────

export const participantJoinSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  anonymousId: z.string().uuid().optional(),
});

export const participantUpdateSchema = z.object({
  nickname: z.string().min(1).max(50),
});
