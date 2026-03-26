import { Request, Response } from 'express';
import { prisma } from '../server';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { addStatsClient } from '../libs/sse.manager';
import * as statisticsService from '../services/statistics.service';

type AuthUser = { id: string; role: string };

const resolveStatsUser = (req: Request): AuthUser | null => {
  if (req.user) return req.user as AuthUser;

  const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token : '';
  if (!tokenFromQuery) return null;

  try {
    return jwt.verify(tokenFromQuery, config.jwtSecret) as AuthUser;
  } catch {
    return null;
  }
};

export const getStats = async (_req: Request, res: Response) => {
  const [totalUsers, totalCourses, totalModules, totalMaterials] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.module.count(),
    prisma.material.count(),
  ]);

  res.json({ totalUsers, totalCourses, totalModules, totalMaterials });
};

export const uploadDocument = async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const title = req.body.title || null;
  const description = req.body.description || null;

  const doc = await prisma.document.create({
    data: {
      filename: file.filename,
      path: file.path,
      originalName: file.originalname,
      uploadedById: req.user.id,
      title,
      description,
    },
  });
  res.status(201).json(doc);
};

export const listDocuments = async (_req: Request, res: Response) => {
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(docs);
};

export const getCourseStatisticsOverview = async (req: Request, res: Response) => {
  const filters = {
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    state: typeof req.query.state === 'string' ? req.query.state : undefined,
    sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy as any : undefined,
    sortOrder: typeof req.query.sortOrder === 'string' ? req.query.sortOrder as any : undefined,
    minDownloads: Number(req.query.minDownloads),
    minAverageScore: Number(req.query.minAverageScore),
    minSuccessRate: Number(req.query.minSuccessRate),
    minLinkOpens: Number(req.query.minLinkOpens),
    minSseConnected: Number(req.query.minSseConnected),
  };

  const payload = await statisticsService.getCoursesStatsOverview(filters);
  res.json(payload);
};

export const statsSSEStream = async (req: Request, res: Response) => {
  const user = resolveStatsUser(req);
  if (!user || !['ADMIN', 'LECTURER'].includes(user.role)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const clientId = addStatsClient(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, role: user.role })}\n\n`);

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
