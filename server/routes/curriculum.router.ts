import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.ts';
import {
  parseCurriculumImport,
  extractUnitsFromPDF,
  extractLearningOutcome,
} from '../services/curriculum.service.ts';
import { Module } from '@/shared/types.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const curriculumRouter = Router();

curriculumRouter.get('/', (_req, res) => {
    try {
        res.json(db.getModules());
    } catch (e) {
        res.status(500).json({ error: 'DB not ready' });
    }
});

curriculumRouter.post('/', async (req, res) => {
    try {
        const newModule = req.body as Module;
        if (!newModule?.id || !newModule?.title) {
            res.status(400).json({ error: 'Module id or title are required' });
            return;
        }
        const created = await db.addModule(newModule);
        if (created) res.status(201).json(created);
        else res.status(409).json({ error: 'Module already exists' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create module' });
    }
});

curriculumRouter.put('/:moduleId', async (req, res) => {
    try {
        const updated = await db.updateModule(req.params.moduleId, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ error: 'Module not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update module' });
    }
});

curriculumRouter.post('/import', upload.single('curriculumFile'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    
    if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
        res.status(400).json({ error: 'Solo se permiten archivos .xlsx' });
        return;
    }

    try {
        const rows = parseCurriculumImport(req.file);
        if (rows.length === 0) {
            res.status(400).json({
                error: 'No se encontraron módulos PAUM en el archivo. Verifica que la hoja se llame "Base Asignatura" y que la columna "Clave PA" tenga el valor "PAU".',
            });
            return;
        }
        const result = await db.importCurriculum(rows);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al importar el plan de estudios' });
    }
});

curriculumRouter.put('/:moduleId/units/:unitId', async (req, res) => {
    try {
        const { completedSessions } = req.body;
        const updated = await db.updateModulePlanningUnit(
            req.params.moduleId,
            req.params.unitId,
            completedSessions
        );
        if (updated) res.json(updated);
        else res.status(404).json({ error: 'Module/Unit not found' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update planning' });
    }
});

curriculumRouter.post('/:moduleId/files/:type', upload.single('document'), async (req, res) => {
    const { moduleId, type } = req.params;

    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    if (type !== 'syllabus' && type !== 'planning') {
        res.status(400).json({ error: 'Invalid file type' });
        return;
    }
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
        res.status(400).json({ error: 'Only PDF files are allowed' });
        return;
    }

    try {
        const uploadsDir = db.getUploadsDir();
        const moduleUploadsDir = path.join(uploadsDir, 'curriculum', moduleId);
        fs.mkdirSync(moduleUploadsDir, { recursive: true });

        const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const savedFileName = `${type}-${Date.now()}-${safeOriginalName}`;
        const savedFilePath = path.join(moduleUploadsDir, savedFileName);
        await fs.promises.writeFile(savedFilePath, req.file.buffer);

        const publicUrl = `/uploads/curriculum/${encodeURIComponent(moduleId)}/${encodeURIComponent(savedFileName)}`;
        const updatedModule = await db.updateModuleDocument(
            moduleId, type, publicUrl, req.file.originalname
        );
        if (!updatedModule) {
            res.status(404).json({ error: 'Module not found' });
            return;
        }

        let detectedUnits: { unitNumber: string; title: string; content: string }[] = [];
        let learningOutcome = '';

        if (type === 'syllabus') {
            try {
                const pdfLib = require('pdf-parse');
                const parser = new pdfLib.PDFParse({ data: req.file.buffer });
                const parsed = await parser.getText();
                const text = String(parsed?.text || '').replace(/\u0000/g, '');
                detectedUnits = extractUnitsFromPDF(text);
                learningOutcome = extractLearningOutcome(text);
            } catch (e) {
                console.warn('[Curriculum] No se pudo extraer unidades del PDF:', e);
            }
        }

        res.json({ module: updatedModule, detectedUnits, learningOutcome });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload curriculum document' });
    }
});