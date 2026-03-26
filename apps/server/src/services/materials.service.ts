import { MaterialType } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { sendEvent, sendStatsEvent } from '../libs/sse.manager';
import { assertDraftState, assertOwnership, StateTransitionError } from './state-machine.service';

// ── helpers ──────────────────────────────────────────────────────────

async function getModuleOrThrow(moduleId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) throw new StateTransitionError('Module not found.', 404);
  return mod;
}

async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}

async function getMaterialOrThrow(materialId: string) {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new StateTransitionError('Material not found.', 404);
  return material;
}

// ── CRUD ─────────────────────────────────────────────────────────────

export const listMaterials = async (moduleId: string) => {
  await getModuleOrThrow(moduleId);
  return prisma.material.findMany({
    where: { moduleId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getMaterialById = async (id: string) => {
  return getMaterialOrThrow(id);
};

export const createMaterial = async (
  moduleId: string,
  userId: string,
  data: {
    type: MaterialType;
    title: string;
    description?: string;
    url?: string;
    faviconUrl?: string;
    filePath?: string;
    fileMime?: string;
    fileSize?: number;
    fileKey?: string;
  },
) => {
  const mod = await getModuleOrThrow(moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId);
  assertDraftState(course.state);

  // Determine order: find max order + 1
  const lastMaterial = await prisma.material.findFirst({
    where: { moduleId },
    orderBy: { order: 'desc' },
  });
  const order = lastMaterial ? lastMaterial.order + 1 : 0;

  const created = await prisma.material.create({
    data: {
      id: uuidv4(),
      moduleId,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      faviconUrl: data.faviconUrl,
      filePath: data.filePath,
      fileMime: data.fileMime,
      fileSize: data.fileSize,
      fileKey: data.fileKey,
      order,
    },
  });

  // SSE broadcast
  sendEvent(mod.courseId, 'material_created', {
    materialId: created.id,
    moduleId,
    title: created.title,
    type: created.type,
    order: created.order,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'material_created', materialId: created.id });

  return created;
};

export const updateMaterial = async (
  materialId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    url?: string;
    faviconUrl?: string;
    filePath?: string;
    fileMime?: string;
    fileSize?: number;
  },
) => {
  const material = await getMaterialOrThrow(materialId);
  const mod = await getModuleOrThrow(material.moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId);
  assertDraftState(course.state);

  // If replacing a file, remove old one
  if (data.filePath && material.filePath) {
    try { fs.unlinkSync(material.filePath); } catch { /* ignore */ }
  }

  const updated = await prisma.material.update({
    where: { id: materialId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
      ...(data.filePath !== undefined && { filePath: data.filePath }),
      ...(data.fileMime !== undefined && { fileMime: data.fileMime }),
      ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
    },
  });

  // SSE broadcast
  sendEvent(mod.courseId, 'material_updated', {
    materialId: updated.id,
    moduleId: material.moduleId,
    title: updated.title,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'material_updated', materialId: updated.id });

  return updated;
};

export const deleteMaterial = async (materialId: string, userId: string) => {
  const material = await getMaterialOrThrow(materialId);
  const mod = await getModuleOrThrow(material.moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId);
  assertDraftState(course.state);

  if (material.filePath) {
    try { fs.unlinkSync(material.filePath); } catch { /* ignore */ }
  }

  await prisma.material.delete({ where: { id: materialId } });
  
  // SSE broadcast
  sendEvent(mod.courseId, 'material_deleted', {
    materialId,
    moduleId: material.moduleId,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'material_deleted', materialId });
  
  return material;
};

export const reorderMaterial = async (
  materialId: string,
  moduleId: string,
  newOrder: number,
  userId: string
) => {
  const material = await getMaterialOrThrow(materialId);
  const mod = await getModuleOrThrow(moduleId);
  const course = await getCourseOrThrow(mod.courseId);
  assertOwnership(userId, course.ownerId);
  assertDraftState(course.state);

  if (material.moduleId !== moduleId) {
    throw new StateTransitionError('Material does not belong to this module.', 400);
  }

  const oldOrder = material.order;
  
  // Use transaction to avoid constraint violations
  await prisma.$transaction(async (tx) => {
    // First, move target material to a temporary high position to free up its slot
    await tx.material.update({
      where: { id: materialId },
      data: { order: 999999 },
    });

    // Adjust orders of other materials
    if (newOrder < oldOrder) {
      // Moving up: shift materials down
      await tx.material.updateMany({
        where: {
          moduleId,
          order: { gte: newOrder, lt: oldOrder },
        },
        data: { order: { increment: 1 } },
      });
    } else if (newOrder > oldOrder) {
      // Moving down: shift materials up
      await tx.material.updateMany({
        where: {
          moduleId,
          order: { lte: newOrder, gt: oldOrder },
        },
        data: { order: { decrement: 1 } },
      });
    }

    // Finally, move target material to its new position
    await tx.material.update({
      where: { id: materialId },
      data: { order: newOrder },
    });
  });

  const updated = await prisma.material.findUnique({
    where: { id: materialId },
  });

  if (!updated) {
    throw new StateTransitionError('Material not found after reorder.', 404);
  }

  // SSE broadcast
  sendEvent(mod.courseId, 'material_reordered', {
    materialId: updated.id,
    moduleId,
    newOrder: updated.order,
  });
  sendStatsEvent('statistics_updated', { courseId: mod.courseId, source: 'material_reordered', materialId: updated.id });

  return updated;
};

export const reassignCourseMaterialToModule = async (
  courseId: string,
  materialId: string,
  targetModuleId: string,
  userId: string,
) => {
  const material = await getMaterialOrThrow(materialId);
  const currentModule = await getModuleOrThrow(material.moduleId);
  const targetModule = await getModuleOrThrow(targetModuleId);

  if (currentModule.courseId !== courseId || targetModule.courseId !== courseId) {
    throw new StateTransitionError('Material or target module does not belong to this course.', 400);
  }

  const course = await getCourseOrThrow(courseId);
  assertOwnership(userId, course.ownerId);
  assertDraftState(course.state);

  if (material.moduleId === targetModuleId) {
    return material;
  }

  const moved = await prisma.$transaction(async (tx) => {
    const lastTargetMaterial = await tx.material.findFirst({
      where: { moduleId: targetModuleId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastTargetMaterial ? lastTargetMaterial.order + 1 : 0;

    const updatedMaterial = await tx.material.update({
      where: { id: materialId },
      data: {
        moduleId: targetModuleId,
        order: nextOrder,
      },
    });

    await tx.material.updateMany({
      where: {
        moduleId: currentModule.id,
        order: { gt: material.order },
      },
      data: { order: { decrement: 1 } },
    });

    return updatedMaterial;
  });

  sendEvent(courseId, 'material_updated', {
    materialId: moved.id,
    moduleId: moved.moduleId,
    previousModuleId: currentModule.id,
    title: moved.title,
    source: 'module_reassign',
  });

  sendStatsEvent('statistics_updated', {
    courseId,
    source: 'material_module_reassigned',
    materialId: moved.id,
    moduleId: moved.moduleId,
    previousModuleId: currentModule.id,
  });

  return moved;
};

export const trackMaterialInteraction = async (
  courseId: string,
  materialId: string,
  interactionType: 'DOWNLOAD' | 'URL_OPEN',
  participantId?: string,
) => {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: { module: true },
  });

  if (!material || material.module.courseId !== courseId) {
    throw new StateTransitionError('Material not found in this course.', 404);
  }

  if (interactionType === 'DOWNLOAD' && material.type !== MaterialType.FILE) {
    throw new StateTransitionError('DOWNLOAD interaction is only valid for file materials.', 400);
  }

  if (interactionType === 'URL_OPEN' && !(material.type === MaterialType.URL || material.type === MaterialType.VIDEO)) {
    throw new StateTransitionError('URL_OPEN interaction is only valid for URL/VIDEO materials.', 400);
  }

  const interactionsDelegate = (prisma as any).materialInteraction;
  if (!interactionsDelegate?.create) {
    sendEvent(courseId, 'statistics_updated', {
      courseId,
      source: 'material_interaction',
      interactionType,
      materialId,
    });
    sendStatsEvent('statistics_updated', {
      courseId,
      source: 'material_interaction',
      interactionType,
      materialId,
    });
    return null;
  }

  const interaction = await interactionsDelegate.create({
    data: {
      id: uuidv4(),
      courseId,
      materialId,
      participantId,
      interactionType,
    },
  });

  sendEvent(courseId, 'statistics_updated', {
    courseId,
    source: 'material_interaction',
    interactionType,
    materialId,
  });

  sendStatsEvent('statistics_updated', {
    courseId,
    source: 'material_interaction',
    interactionType,
    materialId,
  });

  return interaction;
};