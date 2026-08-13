import { Router } from 'express';
import { db } from '../db/index.ts';

export const miscRouter = Router();

miscRouter.get('/rotations', (_req, res) => {
  try {
    res.json(db.rotations.getRotations());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

miscRouter.get('/activities', (_req, res) => {
  try {
    res.json(db.activities.getActivities());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

miscRouter.post('/ai/generate', (_req, res) => {
  res.json({ response: 'Procesado por Gemini (simulado)' });
});