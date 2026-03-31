import { Request, Response } from 'express';
import { prisma } from '../server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index';
import { addStatsClient } from '../libs/sse.manager';
import * as statisticsService from '../services/statistics.service';
import { GlobalRole } from '@prisma/client';

type AuthUser = { id: string; role: string; globalRole?: string };

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
  const [totalUsers, totalCourses, activeCourses, totalModules, totalMaterials, totalParticipants, totalQuizSubmissions, totalNamespaces] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.course.count({ where: { state: 'LIVE' } }),
    prisma.module.count(),
    prisma.material.count(),
    prisma.participant.count(),
    prisma.quizResult.count(),
    prisma.namespace.count(),
  ]);

  res.json({ totalUsers, totalCourses, activeCourses, totalModules, totalMaterials, totalParticipants, totalQuizSubmissions, totalNamespaces });
};


export const listUsers = async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (role === 'SUPER_ADMIN' || role === 'USER') {
    where.globalRole = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        globalRole: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            namespaceMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page, limit });
};

export const getUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      globalRole: true,
      createdAt: true,
      namespaceMembers: {
        include: {
          namespace: { select: { id: true, name: true, slug: true, status: true } },
        },
      },
      _count: {
        select: { courses: true },
      },
    },
  });

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, email, globalRole, password } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (globalRole === 'SUPER_ADMIN' || globalRole === 'USER') data.globalRole = globalRole;
  if (password) data.passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, globalRole: true, role: true, createdAt: true },
  });

  res.json(updated);
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (req.user?.id === userId) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
};

export const uploadDocument = async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const title = req.body.title || null;
  const description = req.body.description || null;

  const namespaceId = req.namespace?.id || req.user.activeNamespaceId;
  if (!namespaceId) return res.status(400).json({ message: 'Namespace context required' });

  const doc = await prisma.document.create({
    data: {
      filename: file.filename,
      path: file.path,
      originalName: file.originalname,
      uploadedById: req.user.id,
      namespaceId,
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
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  
  const allowed = user.globalRole === 'SUPER_ADMIN' || ['ADMIN', 'LECTURER'].includes(user.role);
  if (!allowed) return res.status(401).json({ message: 'Unauthorized' });

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
