import { Router } from 'express';
import auth from './auth.js';
import reference from './reference.js';
import vessels from './vessels.js';
import alerts from './alerts.js';
import collaboration from './collaboration.js';
import stats from './stats.js';
import source from './source.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, service: 'seawatch', ts: Date.now() }));
api.use(auth);
api.use(reference);
api.use(vessels);
api.use(alerts);
api.use(collaboration);
api.use(stats);
api.use(source);

export default api;
