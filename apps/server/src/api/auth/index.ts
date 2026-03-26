import { Router } from 'express';
import * as authCtrl from '../../controllers/auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.post('/login', authCtrl.login);
router.post('/register', authCtrl.register);
router.post('/refresh', authCtrl.refresh);
router.get('/me', authMiddleware, authCtrl.me);

export default router;
