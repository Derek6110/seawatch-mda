// Reference data: MOCs, operators, and zones (relatively static).
import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

router.get('/mocs', (_req, res) => res.json(store.mocs));
router.get('/operators', (_req, res) => res.json(store.operators));
router.get('/zones', (_req, res) => res.json(store.zones));

export default router;
