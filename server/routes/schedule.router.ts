import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db } from '../db/index.ts';
import { parseSectionImport } from '../services/schedule.service.ts';
import { AcademicSection } from '@/shared/types.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const sectionsRouter = Router();

sectionsRouter.get('/', (_req, res) => {
    try {
        res.json(db.schedule.getSections());
    } catch (e) {
        res.status(500).json({ error: 'DB not ready' });
    }
});

sectionsRouter.get('/:id/students', (req, res) => {
    try {
        res.json(db.schedule.getDetailedSectionStudents(req.params.id));
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch section students' });
    }
});

sectionsRouter.post('/', async (req, res) => {
    try {
        const newSection = req.body as AcademicSection;

        if (!newSection?.id) {
            res.status(400).json({ error: 'Section id is required' });
            return;
        }

        const existing = db.schedule.getSections().find((s) => s.id === newSection.id);
        if (existing) {
            res.status(409).json({ error: 'Section already exists' });
            return;
        }
        const created = await db.schedule.addSection(newSection);
        if (created) res.status(201).json(created);
        else res.status(500).json({ error: 'Failed to create section' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create section' });
    }
});

sectionsRouter.put('/:id', async (req, res) => {
    try {
        const updated = await db.schedule.updateSection(req.params.id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ error: 'Section not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update section' });
    }
});

sectionsRouter.delete('/:id', async (req, res) => {
    try {
        const success = await db.schedule.deleteSection(req.params.id);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Section not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete section' });
    }
});

sectionsRouter.post('/import', upload.single('sectionFile'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    try {
        const records = parseSectionImport(req.file);
        if (records.length === 0) {
            let debugHeaders: string[] = [];
            try {
                if (req.file.originalname.toLowerCase().endsWith('.xlsx')) {
                    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
                    const parsed = xlsx.utils.sheet_to_json<Record<string, any>>(
                        wb.Sheets[wb.SheetNames[0]]
                    );
                    if (parsed.length > 0) debugHeaders = Object.keys(parsed[0]);
                }
            } catch (e) { }

            res.status(400).json({
                error: 'No se encontraron registros válidos. Verifica las columnas del archivo.',
                debugHeaders,
            });
            return;
        }
        const result = await db.schedule.importSections(records);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to import sections data' });
    }
});

sectionsRouter.get('/export', async (_req, res) => {
    try {
        const rows = db.schedule.getExportSections();
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Programación Académica');
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=programacion_academica.xlsx'
        );
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export sections data' });
    }
});