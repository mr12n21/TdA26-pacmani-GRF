import { z } from 'zod';


export const courseCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const courseReadySchema = z.object({
  title: z.string().min(1, 'Course name is required before going live.'),
  description: z.string().min(1, 'Course description is required before going live.'),
});


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


export const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'TRUE_FALSE',
                 'singleChoice', 'multipleChoice', 'text', 'trueFalse']),
  choices: z.array(z.string()).optional(),
  correctAnswer: z.union([z.number(), z.array(z.number()), z.string(), z.boolean()]).optional(),
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


export const participantJoinSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  anonymousId: z.string().uuid().optional(),
});

export const participantUpdateSchema = z.object({
  nickname: z.string().min(1).max(50),
});


export const namespaceCreateSchema = z.object({
  name: z.string().min(1, 'Namespace name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
});

export const namespaceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
});

export const membershipRequestSchema = z.object({
  role: z.enum(['ORG_ADMIN', 'LECTURER', 'STUDENT']),
});

export const membershipStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  role: z.enum(['ORG_ADMIN', 'LECTURER', 'STUDENT']).optional(),
}).refine(data => data.status || data.role, {
  message: 'At least one of status or role is required',
});

export const memberRoleUpdateSchema = z.object({
  role: z.enum(['ORG_ADMIN', 'LECTURER', 'STUDENT']),
});

export const inviteLinkCreateSchema = z.object({
  courseId: z.string().uuid().optional(),
  type: z.enum(['ONE_TIME', 'PERSISTENT']),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
});

export const joinViaInviteSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
});

