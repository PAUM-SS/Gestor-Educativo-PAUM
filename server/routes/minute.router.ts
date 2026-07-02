import { Router } from 'express';
import { db } from '../db/index.ts';
import { ManualTask } from '@/shared/types.ts';

export const minutesRouter = Router();

minutesRouter.get('/', (_req, res) => {
  try {
    res.json(db.getMinutes());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

minutesRouter.patch('/:minuteId/tasks/:taskId', async (req, res) => {
  const { minuteId, taskId } = req.params;
  const { status } = req.body as { status?: ManualTask['status'] };
  const allowedStatuses: ManualTask['status'][] = ['pendiente', 'realizada', 'vencida'];

  if (!status || !allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid task status' });
    return;
  }

  try {
    const updatedTask = await db.updateMinuteTask(minuteId, taskId, status);
    if (updatedTask) {
      res.json({ success: true, task: updatedTask });
      return;
    }
    res.status(404).json({ error: 'Task not found' });
  } catch (error) {
    console.error(`[Backend] Failed to update task ${taskId} in minute ${minuteId}:`, error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});