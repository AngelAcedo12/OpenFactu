import { Router } from 'express';
import documentsRouter from './documents';

const router = Router();

router.use('/documents', documentsRouter);

// Futuros endpoints:
// router.use('/partners', partnersRouter);
// router.use('/items', itemsRouter);

export default router;
