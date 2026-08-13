import { Router } from 'express';
import { db } from '../db/index.ts';

export const sectionRecordsRouter = Router();

sectionRecordsRouter.get('/', (_req, res) => {
  try {
    res.json(db.schedule.getSectionDailyRecords());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

sectionRecordsRouter.patch('/:sectionId/:date', async (req, res) => {
  const { sectionId, date } = req.params;

  if (!sectionId || !date) {
    res.status(400).json({ error: 'sectionId and date are required' });
    return;
  }

  try {
    const updated = await db.schedule.upsertSectionDailyRecord(sectionId, date, {
      facultyPresent: req.body?.facultyPresent,
      absentStudentIds: Array.isArray(req.body?.absentStudentIds)
        ? req.body.absentStudentIds
        : undefined,
      justification: req.body?.justification,
      justificationType: req.body?.justificationType,
      topic: req.body?.topic,
      signature: req.body?.signature,
    });

    if (updated) {
      res.json(updated);
      return;
    }
    res.status(500).json({ error: 'Failed to update section record' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update section record' });
  }
});