import { Router } from 'express';
import {
	uploadDocument,
	listDocuments,
	getStats,
	getCourseStatisticsOverview,
	statsSSEStream,
	listUsers,
	getUser,
	updateUser,
	deleteUser,
} from '../../controllers/admin.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { rolesMiddleware } from '../../middleware/roles.middleware';
import multer from 'multer';
import { storage } from '../../libs/file.storage';

const router = Router();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/stats', authMiddleware, rolesMiddleware(['ADMIN', 'LECTURER']), getStats);
router.get('/stats/courses', authMiddleware, rolesMiddleware(['ADMIN', 'LECTURER']), getCourseStatisticsOverview);
router.get('/stats/stream', statsSSEStream);
router.post('/documents', authMiddleware, rolesMiddleware(['ADMIN']), upload.single('file'), uploadDocument);
router.get('/documents', authMiddleware, rolesMiddleware(['ADMIN']), listDocuments);
router.get('/users', authMiddleware, rolesMiddleware(['SUPER_ADMIN']), listUsers);
router.get('/users/:userId', authMiddleware, rolesMiddleware(['SUPER_ADMIN']), getUser);
router.patch('/users/:userId', authMiddleware, rolesMiddleware(['SUPER_ADMIN']), updateUser);
router.delete('/users/:userId', authMiddleware, rolesMiddleware(['SUPER_ADMIN']), deleteUser);

export default router;
