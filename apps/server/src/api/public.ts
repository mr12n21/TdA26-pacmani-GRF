import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ organization: 'Student Cyber Games' });
});

export default router;