import { Request, Response } from 'express';
import * as sessionsService from '../services/sessions.service';
import { handleControllerError } from './controller-error';

/**
 * POST /courses/:courseId/session
 * Create a new session code (deactivates previous).
 */
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

/**
 * GET /courses/:courseId/session
 * Get the active session code for a course.
 */
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

/**
 * DELETE /courses/:courseId/session
 * Deactivate all session codes for a course.
 */
export const deactivateSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    await sessionsService.deactivateAllForCourse(courseId);
    res.json({ message: 'Session deactivated' });
  } catch (err) {
    handleControllerError(res, err);
  }
};

/**
 * POST /session/validate
 * Public endpoint: validate a session code, return course info.
 */
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

/**
 * POST /session/join
 * Public endpoint: join a course via session code with a nickname.
 */
export const joinViaSession = async (req: Request, res: Response) => {
  try {
    const { code, nickname } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Session code is required' });
    }
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.trim().length > 50) {
      return res.status(400).json({ message: 'Nickname is required (1-50 characters)' });
    }

    // Validate the session code
    const session = await sessionsService.validateSessionCode(code.trim());

    // Import participant service and join the course
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
