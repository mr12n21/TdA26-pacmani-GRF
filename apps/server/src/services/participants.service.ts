import { ParticipantType } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import { sendEvent, sendStatsEvent } from '../libs/sse.manager';
import { StateTransitionError } from './state-machine.service';

// ── helpers 

async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new StateTransitionError('Course not found.', 404);
  return course;
}


export const joinCourse = async (
  courseId: string,
  opts: { userId?: string; anonymousId?: string; nickname?: string },
) => {
  await getCourseOrThrow(courseId);

  if (opts.userId) {
    // REGISTERED: upsert to avoid duplicates
    const existing = await prisma.participant.findUnique({
      where: { courseId_userId: { courseId, userId: opts.userId } },
    });
    if (existing) {
      if (existing.kickedAt) {
        throw new StateTransitionError('You have been removed from this course.', 403);
      }
      // Update nickname if provided
      if (opts.nickname && opts.nickname !== existing.nickname) {
        return prisma.participant.update({
          where: { id: existing.id },
          data: { nickname: opts.nickname },
        });
      }
      return existing;
    }

    const participant = await prisma.participant.create({
      data: {
        id: uuidv4(),
        courseId,
        type: ParticipantType.REGISTERED,
        userId: opts.userId,
        nickname: opts.nickname,
      },
    });

    sendEvent(courseId, 'participant_joined', {
      participantId: participant.id,
      type: participant.type,
      nickname: participant.nickname,
    });
    sendStatsEvent('statistics_updated', { courseId, source: 'participant_joined', participantId: participant.id });
    return participant;
  }

  // ANONYMOUS
  const anonId = opts.anonymousId ?? uuidv4();

  // Check for existing anonymous participant
  const existing = await prisma.participant.findFirst({
    where: { courseId, anonymousId: anonId },
  });
  if (existing) {
    if (existing.kickedAt) {
      throw new StateTransitionError('You have been removed from this course.', 403);
    }
    if (opts.nickname && opts.nickname !== existing.nickname) {
      return prisma.participant.update({
        where: { id: existing.id },
        data: { nickname: opts.nickname },
      });
    }
    return existing;
  }

  const participant = await prisma.participant.create({
    data: {
      id: uuidv4(),
      courseId,
      type: ParticipantType.ANONYMOUS,
      anonymousId: anonId,
      nickname: opts.nickname ?? `Anonymous-${anonId.slice(0, 6)}`,
    },
  });

  sendEvent(courseId, 'participant_joined', {
    participantId: participant.id,
    type: participant.type,
    nickname: participant.nickname,
  });
  sendStatsEvent('statistics_updated', { courseId, source: 'participant_joined', participantId: participant.id });
  return participant;
};


export const resolveParticipant = async (
  courseId: string,
  userId?: string,
  anonymousId?: string,
) => {
  return joinCourse(courseId, { userId, anonymousId });
};

export const getParticipant = async (participantId: string) => {
  const p = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!p) throw new StateTransitionError('Participant not found.', 404);
  return p;
};

export const listParticipants = async (courseId: string) => {
  await getCourseOrThrow(courseId);
  return prisma.participant.findMany({
    where: { courseId },
    orderBy: { joinedAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const listActiveParticipants = async (courseId: string) => {
  await getCourseOrThrow(courseId);
  return prisma.participant.findMany({
    where: { courseId, kickedAt: null },
    orderBy: { joinedAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const updateNickname = async (participantId: string, nickname: string) => {
  const p = await getParticipant(participantId);
  return prisma.participant.update({
    where: { id: p.id },
    data: { nickname },
  });
};


export const kickParticipant = async (courseId: string, participantId: string) => {
  const p = await prisma.participant.findFirst({
    where: { id: participantId, courseId },
  });
  if (!p) throw new StateTransitionError('Participant not found.', 404);

  const updated = await prisma.participant.update({
    where: { id: participantId },
    data: { kickedAt: new Date() },
  });

  sendEvent(courseId, 'participant_kicked', {
    participantId: updated.id,
    nickname: updated.nickname,
  });

  return updated;
};
