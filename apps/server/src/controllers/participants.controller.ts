import { Request, Response } from 'express';
import * as participantsService from '../services/participants.service';
import { handleControllerError } from './controller-error';

/**
 * POST /courses/:courseId/join
 * Join a course as a participant (anonymous or registered).
 */
export const joinCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { nickname, anonymousId } = req.body;

    const participant = await participantsService.joinCourse(courseId, {
      userId: req.user?.id,
      anonymousId,
      nickname,
    });

    res.status(201).json({
      participantId: participant.id,
      courseId: participant.courseId,
      type: participant.type,
      nickname: participant.nickname,
      joinedAt: participant.joinedAt,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};

/**
 * GET /courses/:courseId/participants
 * List all participants (lecturer only).
 */
export const listParticipants = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const participants = await participantsService.listParticipants(courseId);
    res.json(participants.map((p) => ({
      participantId: p.id,
      type: p.type,
      nickname: p.nickname,
      userId: p.userId,
      user: p.user ? { id: p.user.id, name: p.user.name } : null,
      joinedAt: p.joinedAt,
      kickedAt: p.kickedAt,
    })));
  } catch (err) {
    handleControllerError(res, err);
  }
};

/**
 * PATCH /courses/:courseId/participants/:participantId
 * Update participant nickname.
 */
export const updateParticipant = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.params;
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ message: 'Nickname required' });

    const updated = await participantsService.updateNickname(participantId, nickname);
    res.json({
      participantId: updated.id,
      nickname: updated.nickname,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};

/**
 * DELETE /courses/:courseId/participants/:participantId
 * Kick a participant from the course (lecturer only).
 */
export const kickParticipant = async (req: Request, res: Response) => {
  try {
    const { courseId, participantId } = req.params;
    const kicked = await participantsService.kickParticipant(courseId, participantId);
    res.json({
      participantId: kicked.id,
      nickname: kicked.nickname,
      kickedAt: kicked.kickedAt,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};
