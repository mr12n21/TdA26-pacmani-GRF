import express from 'express';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import authRouter from './api/auth/index';
import coursesRouter from './api/courses/index';
import adminRouter from './api/admin/index';
import namespacesRouter from './api/namespaces/index';
import { materialsDir } from './libs/file.storage';
import { checkScheduledCourses } from './services/courses.service';

const logger = pino({ level: 'info' });
const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:3001';
const corsOrigin = typeof corsOriginRaw === 'string' && corsOriginRaw.includes(',')
  ? corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : corsOriginRaw;
logger.info({ corsOrigin }, 'Configured CORS origin(s)');
app.use(cors({ origin: corsOrigin }));

app.use('/uploads/materials', express.static(materialsDir));

app.get('/', (req, res) => res.json({ organization: 'Student Cyber Games' }));
app.get('/api', (req, res) => res.json({ organization: 'Student Cyber Games' }));
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', adminRouter);
app.use('/api', namespacesRouter);

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use(errorHandler);

// ── Scheduled course auto-start checker (every 30 seconds) ───────────
const SCHEDULE_CHECK_INTERVAL = 30_000;
let scheduleTimer: ReturnType<typeof setInterval> | null = null;

function startScheduleChecker() {
  scheduleTimer = setInterval(async () => {
    try {
      await checkScheduledCourses();
    } catch (err) {
      logger.error({ err }, 'Error in scheduled course checker');
    }
  }, SCHEDULE_CHECK_INTERVAL);
  logger.info('Scheduled course auto-start checker started (30s interval)');
}

// Start the checker when the module loads
startScheduleChecker();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  if (scheduleTimer) clearInterval(scheduleTimer);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  if (scheduleTimer) clearInterval(scheduleTimer);
  await prisma.$disconnect();
  process.exit(0);
});

export { app, logger, prisma };