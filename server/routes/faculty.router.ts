import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.ts';
import { parseFacultyImport } from '../services/faculty.service.ts';
import { FacultyMember } from '@/shared/types.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const facultyRouter = Router();

facultyRouter.get('/', (_req, res) => {
    try {
        res.json(db.faculty.getFaculty());
    } catch (e) {
        res.status(500).json({ error: 'DB not ready' });
    }
});

facultyRouter.post('/', async (req, res) => {
    try {
        const newFaculty = req.body as FacultyMember;

        if (!newFaculty?.id || !newFaculty?.name) {
            res.status(400).json({ error: 'Faculty id and name are required' });
            return;
        }
        const existing = db.faculty.getFaculty().find((m) => m.id === newFaculty.id);
        if (existing) {
            res.status(409).json({ error: 'Faculty already exists' });
            return;
        }
        const created = await db.faculty.addFaculty(newFaculty);
        if (created) res.status(201).json(created);
        else res.status(500).json({ error: 'Failed to create faculty' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create faculty' });
    }
});

facultyRouter.put('/:id', async (req, res) => {
    try {
        const updated = await db.faculty.updateFaculty(req.params.id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ error: 'Faculty not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update faculty' });
    }
});

facultyRouter.delete('/:id', async (req, res) => {
    try {
        const success = await db.faculty.deleteFaculty(req.params.id);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Faculty not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete faculty' });
    }
});

facultyRouter.post('/import', upload.single('facultyFile'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    try {
        const records = parseFacultyImport(req.file);

        if (records.length === 0) {
            res.status(400).json({ error: 'No valid faculty records found in the file' });
            return;
        }
        const result = await db.faculty.importFaculty(records);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to import faculty data' });
    }
});