import { Router } from 'express';
import { db } from '../db/index.ts';
import { ClinicalField } from '@/shared/types.ts';

export const clinicalFieldsRouter = Router();

clinicalFieldsRouter.get('/', (_req, res) => {
  try {
    res.json(db.getClinicalFields());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

clinicalFieldsRouter.post('/', async (req, res) => {
  try {
    const newField = req.body as ClinicalField;
    if (!newField?.id || !newField?.name) {
      res.status(400).json({ error: 'Clinical field id and name are required' });
      return;
    }
    const created = await db.addClinicalField(newField);
    if (created) {
      res.status(201).json(created);
      return;
    }
    res.status(500).json({ error: 'Failed to create clinical field' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create clinical field' });
  }
});

clinicalFieldsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await db.updateClinicalField(req.params.id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Clinical field not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update clinical field' });
  }
});

clinicalFieldsRouter.delete('/:id', async (req, res) => {
  try {
    const success = await db.deleteClinicalField(req.params.id);
    if (success) res.json({ success: true });
    else res.status(404).json({ error: 'Clinical field not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete clinical field' });
  }
});