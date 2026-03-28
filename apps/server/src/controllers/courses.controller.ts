import { Request, Response } from 'express';
import { CourseState } from '@prisma/client';
import { prisma } from '../server';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { toCourseSummary, toCourseOverview, toFullCoursePayload } from '../libs/transformers';
import { getDefaultLecturerId } from '../libs/default-user';
import { addClient, addCourseListClient, getStudentCount, sendCourseListEvent, sendStatsEvent } from '../libs/sse.manager';
import * as coursesService from '../services/courses.service';
import { assertDraftState, assertOwnership } from '../services/state-machine.service';
import { handleControllerError } from './controller-error';

type AuthUser = { id: string; role: string };


export const listCourses = async (req: Request, res: Response) => {
  const { state } = req.query;
  const where: any = {};
  if (state && typeof state === 'string') {
    where.state = state.toUpperCase();
  }
  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(courses.map(toCourseSummary));
};

export const createCourse = async (req: Request, res: Response) => {
  const { title, name, description } = req.body;
  const resolvedTitle = (title ?? name)?.trim();
  if (!resolvedTitle) return res.status(400).json({ message: 'Title required' });

  const ownerId = req.user?.id ?? await getDefaultLecturerId();
  
  // Get namespaceId from request context
  const namespaceId = req.namespace?.id || req.user?.activeNamespaceId;
  if (!namespaceId) return res.status(400).json({ message: 'Namespace context required' });

  const course = await prisma.course.create({
    data: {
      id: uuidv4(),
      title: resolvedTitle,
      description,
      state: CourseState.DRAFT,
      ownerId,
      namespaceId,
    },
  });

  sendStatsEvent('statistics_updated', {
    courseId: course.id,
    source: 'course_created',
    state: course.state,
  });
  sendCourseListEvent('courses_changed', {
    courseId: course.id,
    source: 'course_created',
    state: course.state,
  });


  res.status(201).json(toCourseSummary(course));
};

export const getCourseOverview = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const isOwner = req.user && req.user.id === course.ownerId;
    const isLecturer = req.user && req.user.role === 'LECTURER';
    if (!isOwner && !isLecturer) {
      if (course.state === CourseState.DRAFT) {
        return res.status(403).json({ message: 'This course is not currently accessible.' });
      }
    }

    res.json(toCourseOverview(course));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await coursesService.getFullCourseData(courseId, false);

    // Owner / lecturer sees everything
    const ownerMatch = req.user && req.user.id === course.ownerId;
    const isLecturer = req.user && req.user.role === 'LECTURER';
    if (ownerMatch || isLecturer || !req.user) {
      // Unauthenticated requests are allowed full access (for public / test usage)
      return res.json(toFullCoursePayload(course));
    }

    // Authenticated non-owner student: limited access
    if (course.state === CourseState.DRAFT || course.state === CourseState.ARCHIVED) {
      return res.status(403).json({ message: 'This course is not currently accessible.' });
    }
    if (course.state === CourseState.SCHEDULED) {
      return res.json(toCourseOverview(course));
    }

    const filtered = {
      ...course,
      modules: course.modules.filter((m: any): boolean => m.isRevealed),
    };
    return res.json(toFullCoursePayload(filtered));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, name, description } = req.body;
    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing) return res.status(404).json({ message: 'Course not found' });

    assertDraftState(existing.state);
    if (req.user) assertOwnership(req.user.id, existing.ownerId);

    const newTitle = (title ?? name ?? existing.title)?.trim();
    const course = await prisma.course.update({
      where: { id: courseId },
      data: { title: newTitle, description },
    });
    sendStatsEvent('statistics_updated', {
      courseId: course.id,
      source: 'course_updated',
      state: course.state,
    });
    sendCourseListEvent('courses_changed', {
      courseId: course.id,
      source: 'course_updated',
      state: course.state,
    });
    res.json(toCourseSummary(course));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    await coursesService.deleteCourse(courseId, req.user!.id);
    sendStatsEvent('statistics_updated', {
      courseId,
      source: 'course_deleted',
    });
    sendCourseListEvent('courses_changed', {
      courseId,
      source: 'course_deleted',
    });
    res.status(204).send();
  } catch (err) {
    handleControllerError(res, err);
  }
};


export const likeCourse = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Authentication required' });
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  try {
    await prisma.like.create({ data: { userId, courseId, namespaceId: course.namespaceId } });
  } catch (e) { /* unique constraint -> already liked */ }
  const likesCount = await prisma.like.count({ where: { courseId } });
  res.json({ liked: true, likesCount });
};

export const unlikeCourse = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Authentication required' });
  try {
    await prisma.like.delete({ where: { userId_courseId: { userId, courseId } } as any });
  } catch (e) { /* ignore if not found */ }
  const likesCount = await prisma.like.count({ where: { courseId } });
  res.json({ liked: false, likesCount });
};


export const scheduleCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { startTime } = req.body;
    const result = await coursesService.scheduleCourse(courseId, req.user!.id, startTime);
    res.json({ success: true, state: result.state, scheduledStart: result.scheduledStart });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const rescheduleCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { startTime } = req.body;
    const result = await coursesService.rescheduleCourse(courseId, req.user!.id, startTime);
    res.json({ success: true, state: result.state, scheduledStart: result.scheduledStart });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const revertToDraftHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.revertToDraft(courseId, req.user!.id);
    res.json({ success: true, state: result.state });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const startCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.startCourse(courseId, req.user!.id);
    res.json({ success: true, state: result.state });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const pauseCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.pauseCourse(courseId, req.user!.id);
    res.json({ success: true, state: result.state });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const resumeCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.resumeCourse(courseId, req.user!.id);
    res.json({ success: true, state: result.state });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const archiveCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.archiveCourse(courseId, req.user!.id);
    res.json({ success: true, state: result.state });
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const duplicateCourseHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const result = await coursesService.duplicateCourse(courseId, req.user!.id);
    sendStatsEvent('statistics_updated', {
      courseId: result.id,
      source: 'course_duplicated',
      sourceCourseId: courseId,
      state: result.state,
    });
    sendCourseListEvent('courses_changed', {
      courseId: result.id,
      source: 'course_duplicated',
      sourceCourseId: courseId,
      state: result.state,
    });
    res.status(201).json({
      success: true,
      courseUuid: result.id,
      courseId: result.id,
      state: result.state,
    });
  } catch (err) {
    handleControllerError(res, err);
  }
};


export const getFullCourseDataHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const ownerMatch = req.user && req.user.id === course.ownerId;
    const isLecturer = req.user && req.user.role === 'LECTURER';
    const onlyRevealed = !(ownerMatch || isLecturer);

    const data = await coursesService.getFullCourseData(courseId, onlyRevealed);
    res.json(toFullCoursePayload(data));
  } catch (err) {
    handleControllerError(res, err);
  }
};

export const getUpdatesSinceHandler = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const since = req.query.since as string;
    if (!since) return res.status(400).json({ message: 'Query parameter "since" is required (ISO date).' });
    const date = new Date(since);
    if (isNaN(date.getTime())) return res.status(400).json({ message: 'Invalid date format.' });
    const data = await coursesService.getUpdatesSince(courseId, date);
    res.json(data);
  } catch (err) {
    handleControllerError(res, err);
  }
};

// ── SSE endpoint ─────────────────────────────────────────────────────

export const courseSSEStream = async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const resolveSseUser = (): AuthUser | null => {
    if (req.user) return req.user as AuthUser;

    const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token : '';
    if (!tokenFromQuery) return null;

    try {
      return jwt.verify(tokenFromQuery, config.jwtSecret) as AuthUser;
    } catch {
      return null;
    }
  };

  const user = resolveSseUser();

  // Only allow SSE connections for LIVE courses (or lecturer in any state)
  const isLecturer = Boolean(user && ['LECTURER', 'ADMIN'].includes(user.role));
  if (!isLecturer && course.state !== CourseState.LIVE) {
    return res.status(403).json({ message: 'Real-time stream is only available during live sessions.' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const role = isLecturer ? 'lecturer' : 'student';
  const clientId = addClient(courseId, res, role);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({
    clientId,
    role,
    courseState: course.state,
    anonymousStudents: getStudentCount(courseId),
  })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
};

export const coursesListSSEStream = async (_req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const clientId = addCourseListClient(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  _req.on('close', () => {
    clearInterval(heartbeat);
  });
};