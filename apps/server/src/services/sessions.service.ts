import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { StateTransitionError } from './state-machine.service';

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}


export async function createSessionCode(
  courseId: string,
  createdById: string,
  expiresInMinutes?: number,
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);

  await prisma.sessionCode.updateMany({
    where: { courseId, isActive: true },
    data: { isActive: false },
  });

  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await prisma.sessionCode.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new StateTransitionError('Failed to generate unique session code.', 500);
  }

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : undefined;

  return prisma.sessionCode.create({
    data: {
      id: uuidv4(),
      courseId,
      code,
      isActive: true,
      createdById,
      expiresAt,
    },
    include: {
      course: { select: { id: true, title: true, state: true } },
    },
  });
}

export async function validateSessionCode(code: string) {
  const session = await prisma.sessionCode.findUnique({
    where: { code },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          state: true,
          ownerId: true,
          owner: { select: { name: true } },
        },
      },
    },
  });

  if (!session) {
    throw new StateTransitionError('Invalid session code.', 404);
  }

  if (!session.isActive) {
    throw new StateTransitionError('This session code is no longer active.', 410);
  }

  if (session.expiresAt && session.expiresAt < new Date()) {
    await prisma.sessionCode.update({
      where: { id: session.id },
      data: { isActive: false },
    });
    throw new StateTransitionError('This session code has expired.', 410);
  }

  return session;
}

export async function getActiveSessionCode(courseId: string) {
  return prisma.sessionCode.findFirst({
    where: { courseId, isActive: true },
    include: {
      course: { select: { id: true, title: true, state: true } },
    },
  });
}

export async function deactivateSessionCode(sessionId: string) {
  return prisma.sessionCode.update({
    where: { id: sessionId },
    data: { isActive: false },
  });
}


export async function deactivateAllForCourse(courseId: string) {
  return prisma.sessionCode.updateMany({
    where: { courseId, isActive: true },
    data: { isActive: false },
  });
}
