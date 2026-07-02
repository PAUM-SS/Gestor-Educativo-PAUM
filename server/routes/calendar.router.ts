import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.ts';
import { parseCalendarJson, parseCalendarPdf } from '../services/calendar.service.ts';
import { AcademicEvent } from '../../shared/types.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const calendarRouter = Router();

calendarRouter.get('/events', (req, res) => {
    try {
        const { from, to } = req.query as { from?: string; to?: string };
        res.json(db.getCalendarEvents(from, to));
    } catch (e) {
        res.status(500).json({ error: 'No se pudieron obtener los eventos del calendario.' });
    }
});

calendarRouter.post('/upload', upload.single('calendar'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No se recibió ningún archivo.' });
        return;
    }

    const isPdf =
        req.file.mimetype === 'application/pdf' ||
        req.file.originalname.toLowerCase().endsWith('.pdf');
    const isJson =
        req.file.mimetype === 'application/json' ||
        req.file.originalname.toLowerCase().endsWith('.json');

    if (!isPdf && !isJson) {
        res.status(400).json({ error: 'Solo se aceptan archivos PDF o JSON.' });
        return;
    }

    try {
        let rawEvents: Omit<AcademicEvent, 'id'>[] = [];

        if (isJson) {
            const result = parseCalendarJson(req.file.buffer);
            if (result.error) {
                res.status(400).json({ error: result.error });
                return;
            }
            rawEvents = result.events;
        }

        if (isPdf) {
            const result = await parseCalendarPdf(req.file.buffer);
            if (result.error) {
                res.status(422).json({ error: result.error });
                return;
            }
            rawEvents = result.events;
        }

        const saved = db.upsertBuapEvents(rawEvents);
        res.json({ created: saved.length, events: saved });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al procesar el archivo del calendario.' });
    }
});

calendarRouter.post('/minuta-event', (req, res) => {
    const { task, minuteId } = req.body as {
        task: { id: string; description: string; dueDate: string };
        minuteId: string;
    };

    if (!task?.id || !task?.dueDate || !minuteId) {
        res.status(400).json({ error: 'Faltan datos del evento (task.id, task.dueDate, minuteId).' });
        return;
    }

    try {
        const event = db.addMinutaEvent(task, minuteId);
        res.json({ success: true, event });
    } catch (e) {
        res.status(500).json({ error: 'No se pudo registrar el evento de minuta.' });
    }
});

calendarRouter.delete('/minuta-event/:taskId', (req, res) => {
    try {
        const removed = db.removeMinutaEvent(req.params.taskId);
        res.json({ success: removed });
    } catch (e) {
        res.status(500).json({ error: 'No se pudo eliminar el evento de minuta.' });
    }
});