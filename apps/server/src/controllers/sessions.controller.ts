import { Request, Response } from 'express';
import * as sessionsService from '../services/sessions.service';
import { handleControllerError } from './controller-error';

export const createSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { expiresInMinutes } = req.body;
    const session = await sessionsService.createSessionCode(
      courseId,
      req.user!.id,
      expiresInMinutes,
    );
    res.status(201).json({
      id: session.id,
      code: session.code,
      courseId: session.courseId,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      course: session.course,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const session = await sessionsService.getActiveSessionCode(courseId);
    if (!session) {
      return res.json(null);
    }
    res.json({
      id: session.id,
      code: session.code,
      courseId: session.courseId,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      course: session.course,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const deactivateSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    await sessionsService.deactivateAllForCourse(courseId);
    res.json({ message: 'Session deactivated' });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const validateSession = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Session code is required' });
    }
    const session = await sessionsService.validateSessionCode(code.trim());
    res.json({
      courseId: session.courseId,
      course: session.course,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};


export const joinViaSession = async (req: Request, res: Response) => {
  try {
    const { code, nickname } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Session code is required' });
    }
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.trim().length > 50) {
      return res.status(400).json({ message: 'Nickname is required (1-50 characters)' });
    }

    const session = await sessionsService.validateSessionCode(code.trim());

    const participantsService = await import('../services/participants.service');
    const participant = await participantsService.joinCourse(session.courseId, {
      userId: req.user?.id,
      nickname: nickname.trim(),
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
