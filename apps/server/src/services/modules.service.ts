import { CourseState } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import { sendEvent, sendStatsEvent } from '../libs/sse.manager';
import { assertDraftState, assertOwnership, StateTransitionError } from './state-machine.service';


async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}

async function getModuleOrThrow(moduleId: string) {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { materials: true, quizzes: { include: { questions: true } } },
  });
  if (!mod) throw new StateTransitionError('Module not found.', 404);
  return mod;
}

async function normalizeModuleOrders(courseId: string, tx: any = prisma) {
  const modules: Array<{ id: string; order: number }> = await tx.module.findMany({
    where: { courseId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, order: true },
  });

  if (modules.length === 0) {
    return;
  }

  const needsNormalization = modules.some((mod, index) => mod.order !== index + 1);
  if (!needsNormalization) {
    return;
  }

  await applyModuleOrderSequence(
    courseId,
    modules.map((moduleItem) => moduleItem.id),
    tx,
  );
}

async function applyModuleOrderSequence(courseId: string, orderedModuleIds: string[], tx: any = prisma) {
  if (!orderedModuleIds.length) return;

  const highestOrderedModule: { order: number } | null = await tx.module.findFirst({
    where: { courseId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const maxOrder = highestOrderedModule?.order ?? 0;
  const temporaryOffset = maxOrder + orderedModuleIds.length + 1000;

  await tx.module.updateMany({
    where: { courseId },
    data: { order: { increment: temporaryOffset } },
  });

  for (let index = 0; index < orderedModuleIds.length; index += 1) {
    await tx.module.update({
      where: { id: orderedModuleIds[index] },
      data: { order: index + 1 },
    });
  }
}

async function acquireCourseOrderLock(courseId: string, tx: any = prisma) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${courseId}))`;
}

export const getOrCreateDefaultModule = async (courseId: string) => {
  let mod = await prisma.module.findFirst({
    where: { courseId },
    orderBy: { order: 'asc' },
  });

  if (!mod) {
    mod = await prisma.module.create({
      data: {
        id: uuidv4(),
        courseId,
        title: 'Default',
        description: 'Auto-created module',
        order: 1,
      },
    });
  }

  return mod;
};

export const listModules = async (courseId: string, onlyRevealed = false) => {
  await getCourseOrThrow(courseId);
  await normalizeModuleOrders(courseId);
  const where: any = { courseId };
  if (onlyRevealed) where.isRevealed = true;

  return prisma.module.findMany({
    where,
    orderBy: { order: 'asc' },
    include: {
      materials: { orderBy: { order: 'asc' } },
      quizzes: { orderBy: { createdAt: 'desc' }, include: { questions: true } },
    },
  });
};

export const getModule = async (moduleId: string) => {
  return getModuleOrThrow(moduleId);
};

export const createModule = async (
  courseId: string,
  userId: string,
  data: { title: string; description?: string; order?: number },
  globalRole?: string,
) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId, globalRole);
  assertDraftState(course.state);

  const created = await prisma.$transaction(async (tx) => {
    await acquireCourseOrderLock(courseId, tx);
    await normalizeModuleOrders(courseId, tx);

    const orderedModules: Array<{ id: string }> = await tx.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const count = orderedModules.length;
    const desiredOrder = Number.isFinite(Number(data.order)) ? Number(data.order) : count + 1;
    const order = Math.max(1, Math.min(desiredOrder, count + 1));

    const newlyCreated = await tx.module.create({
      data: {
        id: uuidv4(),
        courseId,
        title: data.title,
        description: data.description,
        order: count + 1,
      },
    });

    const orderedIds = orderedModules.map((moduleItem) => moduleItem.id);
    orderedIds.splice(order - 1, 0, newlyCreated.id);
    await applyModuleOrderSequence(courseId, orderedIds, tx);

    return tx.module.findUnique({
      where: { id: newlyCreated.id },
      include: {
        materials: true,
        quizzes: { include: { questions: true } },
      },
    });
  });

  if (!created) {
    throw new StateTransitionError('Module not found after creation.', 404);
  }

  sendEvent(courseId, 'module_created', {
    moduleId: created.id,
    title: created.title,
    description: created.description,
    order: created.order,
  });
  sendStatsEvent('statistics_updated', { courseId, source: 'module_created', moduleId: created.id });

  return created;
};

export const updateModule = async (
  moduleId: string,
  userId: string,
  data: { title?: string; description?: string; order?: number },
  globalRole?: string,
) => {
  const mod = await getModuleOrThrow(moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId, globalRole);
  assertDraftState(course.state);

  const updated = await prisma.$transaction(async (tx) => {
    await acquireCourseOrderLock(mod.courseId, tx);

    if (data.order !== undefined) {
      await normalizeModuleOrders(mod.courseId, tx);

      const orderedModules: Array<{ id: string }> = await tx.module.findMany({
        where: { courseId: mod.courseId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      const fromIndex = orderedModules.findIndex((moduleItem) => moduleItem.id === moduleId);
      if (fromIndex < 0) {
        throw new StateTransitionError('Module not found in this course.', 404);
      }

      const maxOrder = orderedModules.length;
      const targetOrder = Math.max(1, Math.min(Number(data.order), maxOrder));
      if (Number.isFinite(targetOrder)) {
        const targetIndex = targetOrder - 1;
        if (fromIndex !== targetIndex) {
          const reorderedIds = orderedModules.map((moduleItem) => moduleItem.id);
          const [movedModuleId] = reorderedIds.splice(fromIndex, 1);
          reorderedIds.splice(targetIndex, 0, movedModuleId);
          await applyModuleOrderSequence(mod.courseId, reorderedIds, tx);
        }
      }
    }

    await tx.module.update({
      where: { id: moduleId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return tx.module.findUnique({
      where: { id: moduleId },
      include: {
        materials: true,
        quizzes: { include: { questions: true } },
      },
    });
  });

  if (!updated) {
    throw new StateTransitionError('Module not found after update.', 404);
  }

  sendEvent(mod.courseId, 'module_updated', {
    moduleId: updated.id,
    title: updated.title,
    description: updated.description,
    order: updated.order,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'module_updated', moduleId: updated.id });

  return updated;
};

export const deleteModule = async (moduleId: string, userId: string, globalRole?: string) => {
  const mod = await getModuleOrThrow(moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId, globalRole);
  assertDraftState(course.state);

  await prisma.$transaction(async (tx) => {
    await acquireCourseOrderLock(mod.courseId, tx);
    await tx.module.delete({ where: { id: moduleId } });
    await normalizeModuleOrders(mod.courseId, tx);
  });
  
  sendEvent(mod.courseId, 'module_deleted', { moduleId });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'module_deleted', moduleId });
  
  return mod;
};


export const reorderModule = async (
  courseId: string,
  moduleId: string,
  newOrder: number,
  userId: string,
  globalRole?: string,
) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId, globalRole);
  assertDraftState(course.state);

  const mod = await getModuleOrThrow(moduleId);
  if (mod.courseId !== courseId) {
    throw new StateTransitionError('Module does not belong to this course.', 400);
  }

  await prisma.$transaction(async (tx) => {
    await acquireCourseOrderLock(courseId, tx);
    await normalizeModuleOrders(courseId, tx);

    const orderedModules: Array<{ id: string }> = await tx.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const fromIndex = orderedModules.findIndex((moduleItem) => moduleItem.id === moduleId);
    if (fromIndex < 0) {
      throw new StateTransitionError('Module not found in this course.', 404);
    }

    const maxOrder = orderedModules.length;
    const targetOrder = Math.max(1, Math.min(Number(newOrder), maxOrder));
    if (!Number.isFinite(targetOrder)) return;

    const targetIndex = targetOrder - 1;
    if (fromIndex === targetIndex) return;

    const reorderedIds = orderedModules.map((moduleItem) => moduleItem.id);
    const [movedModuleId] = reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(targetIndex, 0, movedModuleId);

    await applyModuleOrderSequence(courseId, reorderedIds, tx);
  });

  const updated = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      materials: { orderBy: { order: 'asc' } },
      quizzes: { orderBy: { createdAt: 'desc' }, include: { questions: true } },
    },
  });

  if (!updated) {
    throw new StateTransitionError('Module not found after reorder.', 404);
  }

  sendEvent(courseId, 'module_reordered', {
    moduleId: updated.id,
    newOrder: updated.order,
  });
  sendStatsEvent('statistics_updated', { courseId, source: 'module_reordered', moduleId: updated.id });

  return updated;
};


export const revealModule = async (moduleId: string, courseId: string, userId: string, globalRole?: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId, globalRole);

  if (course.state !== CourseState.LIVE) {
    throw new StateTransitionError('Modules can only be revealed during a live session.');
  }

  const mod = await getModuleOrThrow(moduleId);
  if (mod.courseId !== courseId) {
    throw new StateTransitionError('Module does not belong to this course.', 400);
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { isRevealed: true },
    include: {
      materials: true,
      quizzes: { include: { questions: true } },
    },
  });

  sendEvent(courseId, 'module_revealed', {
    moduleId: updated.id,
    title: updated.title,
    description: updated.description,
    order: updated.order,
  });
  sendStatsEvent('statistics_updated', { courseId, source: 'module_revealed', moduleId: updated.id });

  return updated;
};

export const hideModule = async (moduleId: string, courseId: string, userId: string, globalRole?: string) => {
  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId, globalRole);

  if (course.state !== CourseState.LIVE) {
    throw new StateTransitionError('Modules can only be hidden during a live session.');
  }

  const mod = await getModuleOrThrow(moduleId);
  if (mod.courseId !== courseId) {
    throw new StateTransitionError('Module does not belong to this course.', 400);
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { isRevealed: false },
    include: {
      materials: true,
      quizzes: { include: { questions: true } },
    },
  });

  sendEvent(courseId, 'module_hidden', { moduleId: updated.id });
  sendStatsEvent('statistics_updated', { courseId, source: 'module_hidden', moduleId: updated.id });
  return updated;
};
