import { CourseState } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import { sendCourseListEvent, sendEvent, sendStatsEvent } from '../libs/sse.manager';
import {
  validateAction,
  assertOwnership,
  assertDraftState,
  StateTransitionError,
} from './state-machine.service';
import { courseReadySchema } from '../models/schemas';

// ── helpers ──────────────────────────────────────────────────────────
async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}

function emitStateChange(courseId: string, newState: CourseState, extra?: Record<string, any>) {
  sendEvent(courseId, 'state_changed', { courseId, state: newState, ...extra });
  sendStatsEvent('statistics_updated', { courseId, source: 'state_changed', state: newState, ...extra });
  sendCourseListEvent('courses_changed', { courseId, source: 'state_changed', state: newState, ...extra });
}

// ── queries ──────────────────────────────────────────────────────────
export const getCourseById = async (id: string) => {
  return prisma.course.findUnique({ where: { id } });
};

/**
 * Return the full course payload with all nested data — designed for
 * offline caching on the frontend.
 * @param onlyRevealed If true, only include revealed modules (student view)
 */
export const getFullCourseData = async (courseId: string, onlyRevealed = false) => {
  const moduleWhere: any = { courseId };
  if (onlyRevealed) moduleWhere.isRevealed = true;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: onlyRevealed ? { isRevealed: true } : undefined,
        orderBy: { order: 'asc' },
        include: {
          materials: { orderBy: { createdAt: 'desc' } },
          quizzes: {
            orderBy: { createdAt: 'desc' },
            include: { questions: true },
          },
        },
      },
      feedPosts: { orderBy: { createdAt: 'desc' } },
      likes: true,
    },
  });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
};

/**
 * Check for updates since a given timestamp — used by clients to poll
 * for changes when reconnecting after being offline.
 */
export const getUpdatesSince = async (courseId: string, since: Date) => {
  const course = await getCourseOrThrow(courseId);
  const [modules, feedPosts] = await Promise.all([
    prisma.module.findMany({
      where: { courseId, updatedAt: { gte: since } },
      orderBy: { order: 'asc' },
      include: {
        materials: { orderBy: { createdAt: 'desc' } },
        quizzes: { orderBy: { createdAt: 'desc' }, include: { questions: true } },
      },
    }),
    prisma.feedPost.findMany({
      where: { courseId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { courseState: course.state, updatedAt: course.updatedAt, modules, feedPosts };
};

// ── state transitions ────────────────────────────────────────────────

/**
 * Schedule: DRAFT | PAUSED → SCHEDULED
 */
export const scheduleCourse = async (courseId: string, userId: string, startTime: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('schedule', course.state);

  // Validate course readiness
  courseReadySchema.parse({ title: course.title, description: course.description });

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.SCHEDULED, scheduledStart: new Date(startTime) },
  });
  emitStateChange(courseId, CourseState.SCHEDULED, { scheduledStart: updated.scheduledStart });
  return updated;
};

/**
 * Reschedule: SCHEDULED → SCHEDULED (update start time)
 */
export const rescheduleCourse = async (courseId: string, userId: string, startTime: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('reschedule', course.state);

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { scheduledStart: new Date(startTime) },
  });
  emitStateChange(courseId, CourseState.SCHEDULED, { scheduledStart: updated.scheduledStart });
  return updated;
};

/**
 * Revert / Cancel: SCHEDULED → DRAFT
 */
export const revertToDraft = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('revertToDraft', course.state);

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.DRAFT, scheduledStart: null },
  });
  emitStateChange(courseId, CourseState.DRAFT);
  return updated;
};

/**
 * Start (manual): DRAFT | SCHEDULED → LIVE
 */
export const startCourse = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('start', course.state);

  // Validate course readiness
  courseReadySchema.parse({ title: course.title, description: course.description });

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.LIVE, scheduledStart: null },
  });
  emitStateChange(courseId, CourseState.LIVE);
  return updated;
};

/**
 * Auto-start: called by scheduler when scheduledStart passes.
 */
export const autoStartCourse = async (courseId: string) => {
  const course = await getCourseOrThrow(courseId);
  if (course.state !== CourseState.SCHEDULED) return null; // already changed

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.LIVE, scheduledStart: null },
  });
  emitStateChange(courseId, CourseState.LIVE, { autoStarted: true });
  return updated;
};

/**
 * Pause: LIVE → PAUSED
 */
export const pauseCourse = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('pause', course.state);

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.PAUSED },
  });
  emitStateChange(courseId, CourseState.PAUSED);
  return updated;
};

/**
 * Resume: PAUSED → LIVE
 */
export const resumeCourse = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('resume', course.state);

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.LIVE },
  });
  emitStateChange(courseId, CourseState.LIVE);
  return updated;
};

/**
 * Archive: LIVE | PAUSED → ARCHIVED
 */
export const archiveCourse = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  validateAction('archive', course.state);

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { state: CourseState.ARCHIVED },
  });
  emitStateChange(courseId, CourseState.ARCHIVED);
  return updated;
};

/**
 * Duplicate: works from ANY state (including LIVE and ARCHIVED).
 * Deep-copies modules + materials + quizzes/questions.
 * Does NOT copy any statistical history (participants, quiz results,
 * material interactions).
 * Does NOT copy feed posts.
 */
export const duplicateCourse = async (courseId: string, userId: string) => {
  const source = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          materials: true,
          quizzes: { include: { questions: true } },
        },
      },
    },
  });
  if (!source) throw new StateTransitionError('Course not found.', 404);
  assertOwnership(userId, source.ownerId);

  const newId = uuidv4();
  const duplicate = await prisma.$transaction(async (tx) => {
    // 1. Create the new course shell
    const created = await tx.course.create({
      data: {
        id: newId,
        title: `${source.title} (copy)`,
        description: source.description,
        state: CourseState.DRAFT,
        isDuplicate: true,
        ownerId: source.ownerId,
        namespaceId: source.namespaceId,
      },
    });

    // 2. Deep-copy modules with materials + quizzes + questions
    for (let moduleIndex = 0; moduleIndex < source.modules.length; moduleIndex += 1) {
      const srcModule = source.modules[moduleIndex];
      const newModuleId = uuidv4();
      await tx.module.create({
        data: {
          id: newModuleId,
          courseId: newId,
          title: srcModule.title,
          description: srcModule.description,
          order: moduleIndex + 1,
          isRevealed: false, // always start hidden in draft
        },
      });

      // Copy materials
      if (srcModule.materials.length > 0) {
        const orderedMaterials = [...srcModule.materials].sort((left, right) => {
          const leftOrder = Number.isFinite(Number(left.order)) ? Number(left.order) : Number.MAX_SAFE_INTEGER;
          const rightOrder = Number.isFinite(Number(right.order)) ? Number(right.order) : Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.createdAt.getTime() - right.createdAt.getTime();
        });

        await tx.material.createMany({
          data: orderedMaterials.map((mat, materialIndex) => ({
            id: uuidv4(),
            moduleId: newModuleId,
            type: mat.type,
            title: mat.title,
            description: mat.description,
            url: mat.url,
            faviconUrl: mat.faviconUrl,
            filePath: mat.filePath,
            fileMime: mat.fileMime,
            fileSize: mat.fileSize,
            fileKey: mat.fileKey,
            order: materialIndex,
          })),
        });
      }

      // Copy quizzes + questions
      for (const srcQuiz of srcModule.quizzes) {
        const newQuizId = uuidv4();
        await tx.quiz.create({
          data: {
            id: newQuizId,
            moduleId: newModuleId,
            title: srcQuiz.title,
            description: srcQuiz.description,
          },
        });

        if (srcQuiz.questions.length > 0) {
          await tx.question.createMany({
            data: srcQuiz.questions.map((q) => ({
              id: uuidv4(),
              quizId: newQuizId,
              text: q.text,
              type: q.type,
              choices: q.choices ?? undefined,
              correctAnswer: q.correctAnswer ?? undefined,
            })),
          });
        }
      }
    }

    return created;
  });

  return duplicate;
};

/**
 * Delete a course and all dependent data safely.
 * This pre-deletes quiz results linked through participants to avoid
 * FK ordering issues on some PostgreSQL setups.
 */
export const deleteCourse = async (courseId: string, userId: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);

  await prisma.$transaction(async (tx) => {
    await tx.quizResult.deleteMany({
      where: {
        OR: [
          { participant: { courseId } },
          { quiz: { module: { courseId } } },
        ],
      },
    });

    await tx.course.delete({ where: { id: courseId } });
  });
};

// ── scheduled auto-start checker ─────────────────────────────────────

/**
 * Periodically check for courses whose scheduledStart has passed and
 * auto-transition them to LIVE. Call this from a setInterval.
 */
export const checkScheduledCourses = async () => {
  const now = new Date();
  const courses = await prisma.course.findMany({
    where: {
      state: CourseState.SCHEDULED,
      scheduledStart: { lte: now },
    },
  });
  for (const course of courses) {
    await autoStartCourse(course.id);
  }
};
