import { Router } from 'express';
import * as coursesCtrl from '../../controllers/courses.controller';
import * as modulesCtrl from '../../controllers/modules.controller';
import * as materialsCtrl from '../../controllers/materials.controller';
import * as quizzesCtrl from '../../controllers/quizzes.controller';
import * as feedCtrl from '../../controllers/feed.controller';
import * as participantsCtrl from '../../controllers/participants.controller';
import * as statisticsCtrl from '../../controllers/statistics.controller';
import multer from 'multer';
import { storage } from '../../libs/file.storage';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import {
  scheduleSchema,
  rescheduleSchema,
  moduleCreateSchema,
  moduleUpdateSchema,
  participantJoinSchema,
} from '../../models/schemas';

const router = Router();
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

const lecturerOnly = [authMiddleware, rolesMiddleware(['LECTURER', 'ADMIN'])];

// ── Public / optionally-authed course endpoints ──────────────────────
router.get('/', coursesCtrl.listCourses);
router.get('/stream', coursesCtrl.coursesListSSEStream);
router.get('/:courseId', optionalAuthMiddleware, coursesCtrl.getCourse);
router.get('/:courseId/overview', optionalAuthMiddleware, coursesCtrl.getCourseOverview);

// ── SSE (anonymous students allowed for LIVE courses) ────────────────
router.get('/:courseId/sse', optionalAuthMiddleware, coursesCtrl.courseSSEStream);

// ── Offline data endpoints ───────────────────────────────────────────
router.get('/:courseId/full-data', optionalAuthMiddleware, coursesCtrl.getFullCourseDataHandler);
router.get('/:courseId/updates', optionalAuthMiddleware, coursesCtrl.getUpdatesSinceHandler);

// ── Course CRUD ──────────────────────────────────────────────────────
router.post('/', coursesCtrl.createCourse);
router.put('/:courseId', optionalAuthMiddleware, coursesCtrl.updateCourse);
router.delete('/:courseId', ...lecturerOnly, coursesCtrl.deleteCourse);

// ── State transition endpoints (lecturer only) ───────────────────────
router.post('/:courseId/schedule', ...lecturerOnly, validationMiddleware(scheduleSchema), coursesCtrl.scheduleCourseHandler);
router.post('/:courseId/reschedule', ...lecturerOnly, validationMiddleware(rescheduleSchema), coursesCtrl.rescheduleCourseHandler);
router.post('/:courseId/revert-to-draft', ...lecturerOnly, coursesCtrl.revertToDraftHandler);
router.post('/:courseId/start', ...lecturerOnly, coursesCtrl.startCourseHandler);
router.post('/:courseId/pause', ...lecturerOnly, coursesCtrl.pauseCourseHandler);
router.post('/:courseId/resume', ...lecturerOnly, coursesCtrl.resumeCourseHandler);
router.post('/:courseId/archive', ...lecturerOnly, coursesCtrl.archiveCourseHandler);
router.post('/:courseId/duplicate', ...lecturerOnly, coursesCtrl.duplicateCourseHandler);

// ── Module endpoints ─────────────────────────────────────────────────
router.get('/:courseId/modules', optionalAuthMiddleware, modulesCtrl.listModules);
router.get('/:courseId/modules/:moduleId', optionalAuthMiddleware, modulesCtrl.getModule);
router.post('/:courseId/modules', ...lecturerOnly, validationMiddleware(moduleCreateSchema), modulesCtrl.createModule);
router.put('/:courseId/modules/:moduleId', ...lecturerOnly, validationMiddleware(moduleUpdateSchema), modulesCtrl.updateModule);
router.delete('/:courseId/modules/:moduleId', ...lecturerOnly, modulesCtrl.deleteModule);
router.patch('/:courseId/modules/:moduleId/reorder', ...lecturerOnly, modulesCtrl.reorderModule);
router.post('/:courseId/modules/:moduleId/reveal', ...lecturerOnly, modulesCtrl.revealModule);
router.post('/:courseId/modules/:moduleId/hide', ...lecturerOnly, modulesCtrl.hideModule);

// ── Materials (nested under modules) ─────────────────────────────────
router.get('/:courseId/modules/:moduleId/materials', materialsCtrl.listMaterials);
router.post('/:courseId/modules/:moduleId/materials', ...lecturerOnly, upload.single('file'), materialsCtrl.createMaterial);
router.put('/:courseId/modules/:moduleId/materials/:materialId', ...lecturerOnly, upload.single('file'), materialsCtrl.updateMaterial);
router.delete('/:courseId/modules/:moduleId/materials/:materialId', ...lecturerOnly, materialsCtrl.deleteMaterial);
router.patch('/:courseId/modules/:moduleId/materials/:materialId/reorder', ...lecturerOnly, materialsCtrl.reorderMaterial);

// ── Quizzes (nested under modules) ───────────────────────────────────
router.get('/:courseId/modules/:moduleId/quizzes', quizzesCtrl.listQuizzes);
router.post('/:courseId/modules/:moduleId/quizzes', ...lecturerOnly, quizzesCtrl.createQuiz);
router.get('/:courseId/modules/:moduleId/quizzes/:quizId', quizzesCtrl.getQuiz);
router.put('/:courseId/modules/:moduleId/quizzes/:quizId', ...lecturerOnly, quizzesCtrl.updateQuiz);
router.delete('/:courseId/modules/:moduleId/quizzes/:quizId', ...lecturerOnly, quizzesCtrl.deleteQuiz);
router.post('/:courseId/modules/:moduleId/quizzes/:quizId/submit', optionalAuthMiddleware, quizzesCtrl.submitQuiz);

// ── Participants ─────────────────────────────────────────────────────
router.post('/:courseId/join', optionalAuthMiddleware, validationMiddleware(participantJoinSchema), participantsCtrl.joinCourse);
router.get('/:courseId/participants', ...lecturerOnly, participantsCtrl.listParticipants);
router.patch('/:courseId/participants/:participantId', optionalAuthMiddleware, participantsCtrl.updateParticipant);

// ── Statistics ───────────────────────────────────────────────────────
router.get('/:courseId/stats', ...lecturerOnly, statisticsCtrl.getCourseStats);
router.get('/:courseId/stats/quiz-dashboard', ...lecturerOnly, statisticsCtrl.getQuizDashboard);
router.get('/:courseId/stats/leaderboard', optionalAuthMiddleware, statisticsCtrl.getLeaderboard);
router.get('/:courseId/stats/participants/:participantId', ...lecturerOnly, statisticsCtrl.getParticipantProgress);
router.get('/:courseId/stats/modules/:moduleId', ...lecturerOnly, statisticsCtrl.getModuleStats);

// ── Feed (Info Channel) ──────────────────────────────────────────────
router.get('/:courseId/feed', feedCtrl.getFeed);
router.post('/:courseId/feed', feedCtrl.createFeedPost);
router.get('/:courseId/feed/stream', feedCtrl.sseStream);
router.put('/:courseId/feed/:postId', feedCtrl.updateFeedPost);
router.delete('/:courseId/feed/:postId', feedCtrl.deleteFeedPost);

// ── Backward-compatible flat endpoints (no module in path) ───────────
// These auto-resolve or create a default module so that
// /courses/:id/materials and /courses/:id/quizzes work without auth.
router.get('/:courseId/materials', optionalAuthMiddleware, materialsCtrl.listCourseMaterials);
router.post('/:courseId/materials', optionalAuthMiddleware, upload.single('file'), materialsCtrl.createCourseMaterial);
router.put('/:courseId/materials/:materialId', optionalAuthMiddleware, upload.single('file'), materialsCtrl.updateCourseMaterial);
router.delete('/:courseId/materials/:materialId', optionalAuthMiddleware, materialsCtrl.deleteCourseMaterial);
router.patch('/:courseId/materials/:materialId/assign-module', optionalAuthMiddleware, materialsCtrl.assignCourseMaterialToModule);
router.post('/:courseId/materials/:materialId/interactions', optionalAuthMiddleware, materialsCtrl.trackCourseMaterialInteraction);

router.get('/:courseId/quizzes', optionalAuthMiddleware, quizzesCtrl.listCourseQuizzes);
router.post('/:courseId/quizzes', optionalAuthMiddleware, quizzesCtrl.createCourseQuiz);
router.get('/:courseId/quizzes/:quizId', optionalAuthMiddleware, quizzesCtrl.getCourseQuiz);
router.put('/:courseId/quizzes/:quizId', optionalAuthMiddleware, quizzesCtrl.updateCourseQuiz);
router.delete('/:courseId/quizzes/:quizId', optionalAuthMiddleware, quizzesCtrl.deleteCourseQuiz);
router.post('/:courseId/quizzes/:quizId/submit', optionalAuthMiddleware, quizzesCtrl.submitCourseQuiz);

// ── Likes ────────────────────────────────────────────────────────────
router.post('/:courseId/like', authMiddleware, coursesCtrl.likeCourse);
router.delete('/:courseId/like', authMiddleware, coursesCtrl.unlikeCourse);

export default router;