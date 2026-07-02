import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import * as xlsx from 'xlsx';
import { db } from './db/index.ts';
import { MOCK_MODULES } from '../shared/constants';
import { 
  ClinicalField, 
  FacultyMember, 
  ManualTask, 
  Module, 
  Student, 
  StudentKardexSummary, 
  AcademicEvent, 
  AcademicSection 
} from '../shared/types';
import { section } from 'motion/react-client';

import { 
  normalizeKey, 
  clampNumber,
} from './services/utils.ts';

import {
  ocrImageWithWindows,
  extractEnrollmentId,
  extractSemester,
  extractGpa,
  extractStudentStatusLabel,
  extractProgressPercent,
  extractStudentName,
  mapStatusLabelToStudentStatus
} from './services/student.service.ts';

import {
  parseFacultyImport
} from './services/faculty.service.ts'

import {
  parseCalendarJson,
  parseCalendarPdf
} from './services/calendar.service.ts'

import { 
  inferModuleLevel,
  parseCurriculumImport,
  extractUnitsFromPDF,
  extractLearningOutcome 
} from './services/curriculum.service.ts';

import { 
  parseSectionImport 
} from './services/schedule.service.ts';

dotenv.config();

const calendarUpload = multer({ storage: multer.memoryStorage() });

export interface StartServerOptions {
  host?: string;
  port?: number;
  staticDir?: string;
}

export interface StartedServer {
  app: express.Express;
  host: string;
  port: number;
  server: ReturnType<express.Express['listen']>;
  url: string;
}

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type RequestWithFile = express.Request & {
  file?: UploadedFile;
};

export function createServer({ staticDir }: Pick<StartServerOptions, 'staticDir'> = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const uploadsDir = db.getUploadsDir();
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  const upload = multer({ storage: multer.memoryStorage() });

  app.get('/api/students', (_req, res) => {
    try {
      res.json(db.getStudents());
    } catch (e) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.put('/api/students/:id', async (req, res) => {
    try {
      const updated = await db.updateStudent(req.params.id, req.body);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Student not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update student' });
    }
  });

  app.post('/api/students', async (req, res) => {
    try {
      const newStudent = req.body;
      const created = await db.addStudent(newStudent);
      if (created) res.status(201).json(created);
      else res.status(500).json({ error: 'Failed to create student' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create student' });
    }
  });

  app.post('/api/students/upload-kardex', upload.single('kardex'), async (req: RequestWithFile, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.originalname?.toLowerCase().endsWith('.pdf')) {
      res.status(400).json({ error: 'Solo se permiten archivos PDF.' });
      return;
    }

    try {
      let rawText = '';
      let text = '';
      let ocrText = '';
      let extractedName = '';
      let sourcePdfUrl: string | undefined;
      let debugTextUrl: string | undefined;
      let parseErrorMessage: string | undefined;
      let ocrErrorMessage: string | undefined;
      let sourceOcrImageUrl: string | undefined;
      let extractionMethod: 'pdf' | 'ocr' | 'pdf+ocr' = 'pdf';
      try {
        const parser = new PDFParse({ data: req.file.buffer });
        const parsed = await parser.getText();
        rawText = String(parsed?.text || '').replace(/\u0000/g, '');

        const detectedName = extractStudentName(rawText);
        if (detectedName) extractedName = detectedName;
      } catch (pdfErr: any) {
        console.warn('kardex parse error:', pdfErr);
        parseErrorMessage = String(pdfErr?.message || pdfErr);
      }

      rawText = rawText.replace(/\u0000/g, '').trim();
      text = rawText;

      // Guardar el PDF + el texto extraído (debug local) incluso si después falla la validación de matrícula.
      const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const studentsUploadsDir = path.join(uploadsDir, 'students');
      fs.mkdirSync(studentsUploadsDir, { recursive: true });
      const savedFileName = `kardex-${Date.now()}-${safeOriginalName}`;
      const savedFilePath = path.join(studentsUploadsDir, savedFileName);
      await fs.promises.writeFile(savedFilePath, req.file.buffer);
      sourcePdfUrl = `/uploads/students/${encodeURIComponent(savedFileName)}`;

      const savedTextFileName = savedFileName.replace(/^kardex-/, 'kardex-text-').replace(/\.pdf$/i, '.txt');
      const savedTextFilePath = path.join(studentsUploadsDir, savedTextFileName);
      await fs.promises.writeFile(savedTextFilePath, text, 'utf-8');
      debugTextUrl = `/uploads/students/${encodeURIComponent(savedTextFileName)}`;

      // OCR fallback for SIIA PDFs that look like text but have no extractable text layer.
      if (text.length < 80) {
        if (process.platform === 'win32') {
          try {
            const parser = new PDFParse({ data: req.file.buffer });
            const shot = await parser.getScreenshot({ partial: [1], scale: 3, imageBuffer: true, imageDataUrl: false });
            const page = shot?.pages?.[0];
            if (!page?.data) throw new Error('No se pudo renderizar el PDF a imagen para OCR.');

            const ocrImageFileName = savedFileName.replace(/\.pdf$/i, '-ocr-page1.png');
            const ocrImagePath = path.join(studentsUploadsDir, ocrImageFileName);
            await fs.promises.writeFile(ocrImagePath, Buffer.from(page.data));
            sourceOcrImageUrl = `/uploads/students/${encodeURIComponent(ocrImageFileName)}`;

            ocrText = await ocrImageWithWindows(ocrImagePath, 'es-ES');
            text = [text, ocrText].filter(Boolean).join('\n\n').replace(/\u0000/g, '').trim();
          } catch (err: any) {
            console.warn('kardex ocr error:', err);
            ocrErrorMessage = String(err?.message || err);
          }
        } else {
          ocrErrorMessage = 'OCR automatico solo esta disponible en Windows.';
        }

        await fs.promises.writeFile(savedTextFilePath, text, 'utf-8');
      }

      const rawLen = rawText.length;
      const ocrLen = ocrText.length;
      if (ocrLen > 0 && rawLen >= 80) extractionMethod = 'pdf+ocr';
      else if (ocrLen > 0) extractionMethod = 'ocr';

      if (!extractedName) {
        const detectedName = extractStudentName(text);
        if (detectedName) extractedName = detectedName;
      }

      if (text.length < 80) {
        const details = [parseErrorMessage, ocrErrorMessage].filter(Boolean).join(' | ');
        res.status(422).json({
          error: details
            ? `No se pudo leer el Kardex. Detalle: ${details}`
            : 'No se pudo extraer texto del PDF (ni con OCR).',
          debug: {
            pdfUrl: sourcePdfUrl,
            textUrl: debugTextUrl,
            ocrImageUrl: sourceOcrImageUrl,
            parseErrorMessage,
            ocrErrorMessage,
            extractionMethod,
            rawTextLength: rawLen,
            ocrTextLength: ocrLen,
            mergedTextLength: text.length,
          },
        });
        return;
      }

      if (text.length < 80 && false) {
        res.status(422).json({
          error:
            parseErrorMessage
              ? `No se pudo leer el PDF. Detalle: ${parseErrorMessage}`
              : 'No se pudo extraer texto del PDF. Esto pasa cuando el Kardex está escaneado (solo imagen) o no es el formato SIIA. Descarga el Kardex en PDF con texto (no escaneado) e inténtalo de nuevo.',
          debug: { pdfUrl: sourcePdfUrl, textUrl: debugTextUrl, parseErrorMessage },
        });
        return;
      }

      // Fallback a nombre de archivo solo si todo lo demás falló
      if (!extractedName && req.file.originalname) {
        extractedName = req.file.originalname.replace(/\.pdf$/i, '').replace(/kardex/i, '').replace(/_/g, ' ').trim();
      }
      if (!extractedName) extractedName = 'Alumno Recuperado (Auto)';

      // Extract Matrícula (BUAP uses 9 digits starting with 20)
      const matricula = extractEnrollmentId(text);
      if (!matricula) {
        res.status(422).json({
          error:
            'No pude detectar la matrícula (9 dígitos que inicia con 20). Verifica que sea el Kardex/Historial Académico de SIIA BUAP.',
          debug: { pdfUrl: sourcePdfUrl, textUrl: debugTextUrl, parseErrorMessage },
        });
        return;
      }

      const studentsData = db.getStudents();
      const existing = studentsData.find((s) => s.enrollmentId === matricula);

      const statusLabel = extractStudentStatusLabel(text);
      const progressPercent = extractProgressPercent(text);

      const detectedGpa = extractGpa(text);
      const gpa = Number.isFinite(detectedGpa as number)
        ? Number((detectedGpa as number).toFixed(2))
        : existing?.gpa ?? 0;

      const detectedSemester = extractSemester(text);

      if (extractedName.length > 60) extractedName = extractedName.substring(0, 60);

      // Cruzar materias del Kardex con el plan de estudios (BD > fallback)
      const modulesData = db.getModules();
      const planModules = modulesData.length > 0 ? modulesData : MOCK_MODULES;
      const normalizedKardexText = normalizeKey(text);
      const matchedModuleIdSet = new Set<string>();

      // 1) Match by explicit code patterns first (more reliable than full title string matching).
      const codeIndex = new Map<string, (typeof planModules)[number]>();
      for (const module of planModules) {
        const codeKey = normalizeKey(module.id || '');
        if (codeKey) codeIndex.set(codeKey, module);
      }

      const codeLikeMatches = text.match(/\b[A-Z]{3,6}[\s\-_.\/]*\d{3}\b/gi) || [];
      for (const raw of codeLikeMatches) {
        const codeKey = normalizeKey(raw);
        const module = codeIndex.get(codeKey);
        if (module) matchedModuleIdSet.add(module.id);
      }

      // 2) Fallback match by searching code/title strings in the normalized text.
      for (const module of planModules) {
        if (matchedModuleIdSet.has(module.id)) continue;
        const codeKey = normalizeKey(module.id || '');
        const titleKey = normalizeKey(module.title || '');
        if ((codeKey && normalizedKardexText.includes(codeKey)) || (titleKey && normalizedKardexText.includes(titleKey))) {
          matchedModuleIdSet.add(module.id);
        }
      }

      const matchedModuleIds = Array.from(matchedModuleIdSet);
      let derivedSemester = 1;
      for (const module of planModules) {
        if (!matchedModuleIdSet.has(module.id)) continue;
        if (typeof module.semester === 'number' && module.semester > derivedSemester) {
          derivedSemester = module.semester;
        }
      }

      const maxPlanSemester = planModules.reduce((max, m) => {
        if (typeof m.semester === 'number') return Math.max(max, m.semester);
        return max;
      }, 1);

      const derivedSemesterFromModules = matchedModuleIds.length > 0 ? derivedSemester : undefined;
      const derivedSemesterFromProgress =
        progressPercent !== undefined
          ? clampNumber(Math.round((progressPercent / 100) * maxPlanSemester), 1, maxPlanSemester)
          : undefined;

      const missingModuleIds =
        matchedModuleIds.length > 0
          ? planModules.filter((m) => !matchedModuleIdSet.has(m.id)).map((m) => m.id)
          : [];

      const calculatedSemester = clampNumber(
        detectedSemester ?? derivedSemesterFromModules ?? derivedSemesterFromProgress ?? 1,
        1,
        12
      );

      // Determinar cohorte y riesgo
      const admissionYear = Number.parseInt(matricula.substring(0, 4), 10);
      const cohort = Number.isFinite(admissionYear) ? `${admissionYear}-Otoño` : '2026-Otoño';
      const currentYear = new Date().getFullYear();
      const yearsInProgram = Number.isFinite(admissionYear) ? currentYear - admissionYear : 0;

      const pendingPreviousSemesters =
        matchedModuleIds.length > 0
          ? planModules.filter((m) => {
            if (matchedModuleIdSet.has(m.id)) return false;
            if (typeof m.semester !== 'number') return false;
            return m.semester < calculatedSemester;
          }).length
          : 0;

      const riskReasons: string[] = [];
      if (detectedGpa !== undefined && detectedGpa < 8.0) riskReasons.push('Promedio por debajo de 8.0.');
      if (detectedGpa === undefined && !existing) riskReasons.push('No se detectó el Promedio en el Kardex.');
      if (matchedModuleIds.length === 0 && progressPercent === undefined) {
        riskReasons.push('No se detectaron materias (códigos o nombres) dentro del Kardex.');
      }
      if (yearsInProgram >= 4) riskReasons.push(`Antigüedad en el programa: ${yearsInProgram} años (matrícula ${admissionYear}).`);
      if (pendingPreviousSemesters >= 3) {
        riskReasons.push(`Materias pendientes de semestres previos: ${pendingPreviousSemesters}.`);
      }

      const kardexMappedStatus = mapStatusLabelToStudentStatus(statusLabel);
      const existingStageStatus =
        existing?.status && existing.status !== 'en_riesgo' ? existing.status : 'activo';
      const baseStatus =
        kardexMappedStatus && kardexMappedStatus !== 'activo' ? kardexMappedStatus : existingStageStatus;

      const isAtRisk = riskReasons.length > 0;
      const finalStatus: Student['status'] =
        baseStatus === 'activo' && isAtRisk ? 'en_riesgo' : baseStatus;
      const alert = finalStatus === 'en_riesgo' || finalStatus === 'baja' || isAtRisk;

      const kardex: StudentKardexSummary = {
        parsedAt: new Date().toISOString(),
        sourceFileName: req.file.originalname,
        sourcePdfUrl,
        sourceTextUrl: debugTextUrl,
        sourceOcrImageUrl,
        extractionMethod,
        rawTextLength: rawText.length,
        ocrTextLength: ocrText.length,
        extractedTextLength: text.length,
        extracted: {
          enrollmentId: matricula,
          name: extractedName,
          gpa: detectedGpa,
          semester: detectedSemester ?? derivedSemesterFromModules ?? derivedSemesterFromProgress,
          studentStatusLabel: statusLabel,
          progressPercent,
        },
        matchedModuleIds,
        missingModuleIds,
        riskReasons,
      };

      const studentUpdates: Partial<Student> = {
        name: extractedName,
        enrollmentId: matricula,
        gpa,
        semester: calculatedSemester,
        cohort,
        status: finalStatus,
        alert,
        kardex,
      };

      if (existing) {
        const updated = await db.updateStudent(existing.id, studentUpdates);
        return res.json({ action: 'updated', student: updated });
      }

      const studentToCreate: Student = {
        id: `stu-${Date.now()}`,
        name: extractedName,
        enrollmentId: matricula,
        gpa,
        semester: calculatedSemester,
        cohort,
        status: finalStatus,
        email: `${matricula}@alumno.buap.mx`,
        tutor: 'Asignación Pendiente',
        attendance: 100,
        alert,
        kardex,
      };

      const added = await db.addStudent(studentToCreate);
      return res.json({ action: 'created', student: added });
    } catch (error) {
      console.error('PDF Parse Error:', error);
      res.status(500).json({ error: 'Failed to parse PDF Kardex' });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      const success = await db.deleteStudent(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Student not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete student' });
    }
  });

  app.get('/api/curriculum', (_req, res) => {
    try {
      res.json(db.getModules());
    } catch (e) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.post('/api/curriculum', async (req, res) => {
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

  app.put('/api/curriculum/:moduleId', async (req, res) => {
    try {
      const updated = await db.updateModule(req.params.moduleId, req.body);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Module not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update module' });
    }
  });

  app.post('/api/curriculum/import', upload.single('curriculumFile'), async (req: RequestWithFile, res) => {
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
        res.status(400).json({ error: 'No se encontraron módulos PAUM en el archivo. Verifica que la hoja se llame "Base Asignatura" y que la columna "Clave PA" tenga el valor "PAU".' });
        return;
      }

      const result = await db.importCurriculum(rows);
      res.json(result);
    } catch (error) {
      console.error('Curriculum import error:', error);
      res.status(500).json({ error: 'Error al importar el plan de estudios' });
    }
  });

  app.put('/api/curriculum/:moduleId/units/:unitId', async (req, res) => {
    try {
      const { completedSessions } = req.body;
      const updated = await db.updateModulePlanningUnit(req.params.moduleId, req.params.unitId, completedSessions);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Module/Unit not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update planning' });
    }
  });

  app.post('/api/curriculum/:moduleId/files/:type', upload.single('document'), async (req: RequestWithFile, res) => {
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
      const moduleUploadsDir = path.join(uploadsDir, 'curriculum', moduleId);
      fs.mkdirSync(moduleUploadsDir, { recursive: true });

      const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const savedFileName = `${type}-${Date.now()}-${safeOriginalName}`;
      const savedFilePath = path.join(moduleUploadsDir, savedFileName);

      await fs.promises.writeFile(savedFilePath, req.file.buffer);

      const publicUrl = `/uploads/curriculum/${encodeURIComponent(moduleId)}/${encodeURIComponent(savedFileName)}`;
      const updatedModule = await db.updateModuleDocument(moduleId, type, publicUrl, req.file.originalname);
      if (!updatedModule) {
        res.status(404).json({ error: 'Module not found' });
        return;
      }

      // Si es syllabus, intentar extraer unidades para pre-poblar la planeación
      let detectedUnits: { unitNumber: string; title: string; content: string }[] = [];
      let learningOutcome = '';
      if (type === 'syllabus') {
        try {
          const pdfLib = require('pdf-parse');
          const parseFn = pdfLib.PDFParse;
          const parser = new parseFn({ data: req.file.buffer });
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
      console.error('Curriculum upload error:', error);
      res.status(500).json({ error: 'Failed to upload curriculum document' });
    }
  });

  app.get('/api/minutes', (_req, res) => {
    try {
      res.json(db.getMinutes());
    } catch (e) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.get('/api/calendar/events', (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const events = db.getCalendarEvents(from, to);
      res.json(events);
    } catch (e) {
      console.error('[Calendar] Error fetching events:', e);
      res.status(500).json({ error: 'No se pudieron obtener los eventos del calendario.' });
    }
  });

  app.post('/api/calendar/upload', calendarUpload.single('calendar'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo.' });
      return;
    }

    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const isJson = req.file.mimetype === 'application/json' || req.file.originalname.toLowerCase().endsWith('.json');

    if (!isPdf && !isJson) {
      res.status(400).json({ error: 'Solo se aceptan archivos PDF o JSON.' });
      return;
    }

    try {
      let rawEvents: Omit<AcademicEvent, 'id'>[] = [];

      // ── Rama JSON: parseo directo ─────────────────────────────────────────────
      if (isJson) {
        const parsed = parseCalendarJson(req.file.buffer);

        if (parsed.error) {
           res.status(400).json({ error: parsed.error });
           return;
        }
        
        rawEvents = parsed.events;
      }

      // ── Rama PDF: extracción con Gemini ───────────────────────────────────────
      if (isPdf) {
        const result = await parseCalendarPdf(req.file.buffer);

        if (result.error) {
          res.status(422).json({ error: result.error });
          return;
        }

        rawEvents = result.events;
      }

      // ── Guardar en BD (reemplaza todos los eventos BUAP existentes) ───────────
      const saved = db.upsertBuapEvents(rawEvents);
      res.json({ created: saved.length, events: saved });

    } catch (error) {
      console.error('[Calendar] Error procesando archivo:', error);
      res.status(500).json({ error: 'Error interno al procesar el archivo del calendario.' });
    }
  });

  app.post('/api/calendar/minuta-event', (req, res) => {
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
      console.error('[Calendar] Error adding minuta event:', e);
      res.status(500).json({ error: 'No se pudo registrar el evento de minuta.' });
    }
  });

  app.delete('/api/calendar/minuta-event/:taskId', (req, res) => {
    const { taskId } = req.params;
    try {
      const removed = db.removeMinutaEvent(taskId);
      res.json({ success: removed });
    } catch (e) {
      console.error('[Calendar] Error removing minuta event:', e);
      res.status(500).json({ error: 'No se pudo eliminar el evento de minuta.' });
    }
  });

  app.get('/api/faculty', (_req, res) => {
    try {
      res.json(db.getFaculty());
    } catch (e) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.post('/api/faculty', async (req, res) => {
    try {
      const newFaculty = req.body as FacultyMember;

      if (!newFaculty?.id || !newFaculty?.name) {
        res.status(400).json({ error: 'Faculty id and name are required' });
        return;
      }

      const existingFaculty = db.getFaculty().find((member) => member.id === newFaculty.id);
      if (existingFaculty) {
        res.status(409).json({ error: 'Faculty already exists' });
        return;
      }

      const created = await db.addFaculty(newFaculty);
      if (created) res.status(201).json(created);
      else res.status(500).json({ error: 'Failed to create faculty' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create faculty' });
    }
  });

  app.put('/api/faculty/:id', async (req, res) => {
    try {
      const updated = await db.updateFaculty(req.params.id, req.body);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Faculty not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update faculty' });
    }
  });

  app.delete('/api/faculty/:id', async (req, res) => {
    try {
      const success = await db.deleteFaculty(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Faculty not found' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete faculty' });
    }
  });

  app.post('/api/faculty/import', upload.single('facultyFile'), async (req: RequestWithFile, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      const facultyRecords = parseFacultyImport(req.file);

      if (facultyRecords.length === 0) {
        res.status(400).json({ error: 'No valid faculty records found in the file' });
        return;
      }

      const result = await db.importFaculty(facultyRecords);
      res.json(result);
    } catch (error) {
      console.error('Faculty import error:', error);
      res.status(500).json({ error: 'Failed to import faculty data' });
    }
  });

  app.get('/api/clinical-fields', (_req, res) => {
    try {
      res.json(db.getClinicalFields());
    } catch (error) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.post('/api/clinical-fields', async (req, res) => {
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

  app.put('/api/clinical-fields/:id', async (req, res) => {
    try {
      const updated = await db.updateClinicalField(req.params.id, req.body);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Clinical field not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update clinical field' });
    }
  });

  app.delete('/api/clinical-fields/:id', async (req, res) => {
    try {
      const success = await db.deleteClinicalField(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Clinical field not found' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete clinical field' });
    }
  });

  app.get('/api/sections', (_req, res) => {
    try { res.json(db.getSections()); }
    catch (e) { res.status(500).json({ error: 'DB not ready' }); }
  });

  app.put('/api/sections/:id', async (req, res) => {
    try {
      const updated = await db.updateSection(req.params.id, req.body);
      if (updated) res.json(updated);
      else res.status(404).json({ error: 'Section not found' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update section' });
    }
  });

  app.post('/api/sections', async (req, res) => {
    try {
      const newSection = req.body as AcademicSection;

      if (!newSection?.id) {
        res.status(400).json({ error: 'Section id is required' });
        return;
      }

      const existingSection = db.getSections().find((section) => section.id === newSection.id);
      if (existingSection) {
        res.status(409).json({ error: 'Section already exists' });
        return;
      }

      const created = await db.addSection(newSection);
      if (created) res.status(201).json(created);
      else res.status(500).json({ error: 'Failed to create section' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create section' });
    }
  });


  app.delete('/api/sections/:id', async (req, res) => {
    try {
      const success = await db.deleteSection(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ error: 'Section not found' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete section' });
    }
  });

  app.post('/api/sections/import', upload.single('sectionFile'), async (req: RequestWithFile, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      const sectionsRecords = parseSectionImport(req.file);

      if (sectionsRecords.length === 0) {
        // Parse directly just to see what headers were found to help the user debug
        let debugHeaders = [];
        try {
          if (req.file.originalname.toLowerCase().endsWith('.xlsx')) {
            const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
            const parsed = xlsx.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);
            if (parsed.length > 0) debugHeaders = Object.keys(parsed[0]);
          }
        } catch (e) { }

        res.status(400).json({
          error: 'No se encontraron registros válidos. Verifica las columnas del archivo.',
          debugHeaders
        });
        return;
      }
      // console.log(sectionsRecords)
      const result = await db.importSections(sectionsRecords);
      res.json(result);
    } catch (error) {
      console.error('Section import error:', error);
      res.status(500).json({ error: 'Failed to import sections data' });
    }
  });

  app.get('/api/sections/export', async (_req, res) => {
    try {
      const rows = db.getExportSections();

      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Programación Académica');
      const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=programacion_academica.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error('Section export error:', error);
      res.status(500).json({ error: 'Failed to export sections data' });
    }
  });


  app.get('/api/section-records', (_req, res) => {
    try {
      res.json(db.getSectionDailyRecords());
    } catch (error) {
      res.status(500).json({ error: 'DB not ready' });
    }
  });

  app.patch('/api/section-records/:sectionId/:date', async (req, res) => {
    const { sectionId, date } = req.params;

    if (!sectionId || !date) {
      res.status(400).json({ error: 'sectionId and date are required' });
      return;
    }

    try {
      const updated = await db.upsertSectionDailyRecord(sectionId, date, {
        facultyPresent: req.body?.facultyPresent,
        absentStudentIds: Array.isArray(req.body?.absentStudentIds) ? req.body.absentStudentIds : undefined,
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

  app.get('/api/rotations', (_req, res) => {
    try { res.json(db.getRotations()); }
    catch (e) { res.status(500).json({ error: 'DB not ready' }); }
  });

  app.get('/api/activities', (_req, res) => {
    try { res.json(db.getActivities()); }
    catch (e) { res.status(500).json({ error: 'DB not ready' }); }
  });

  app.post('/api/reports', (req, res) => {
    const { reportType } = req.body;
    console.log(`[Backend] Processing report: ${reportType}`);
    res.json({ success: true, message: 'Report generated' });
  });

  app.patch('/api/minutes/:minuteId/tasks/:taskId', async (req, res) => {
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

  app.post('/api/ai/generate', (_req, res) => {
    res.json({ response: 'Procesado por Gemini (simulado)' });
  });

  // ── Reportes: recibir PDF y enviarlo por correo ──────────────────
  const pdfUpload = multer({ storage: multer.memoryStorage() });

  app.post('/api/reports/send', pdfUpload.single('pdf'), async (req, res) => {
    try {
      const pdfFile = (req as RequestWithFile).file;
      const { reportType = 'general', notes = '' } = req.body as { reportType?: string; notes?: string };

      if (!pdfFile) {
        res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
        return;
      }

      // ── Nodemailer ──────────────────────────────────────────────
      const nodemailer = await import('nodemailer');

      const from = process.env.MAIL_FROM || '';
      const to = process.env.MAIL_TO || '';
      const user = process.env.SMTP_USER || from;
      const pass = process.env.SMTP_PASS || '';

      if (!from || !pass) {
        console.warn('[Reports] MAIL_FROM / MAIL_PASS no configurados en .env. El correo no se enviará.');
        // En desarrollo, aceptamos y respondemos OK de todas formas
        res.json({ success: true, simulated: true });
        return;
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });

      const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      const subject = `[PAUM] Reporte oficial – ${reportType.toUpperCase()} – ${today}`;

      await transporter.sendMail({
        from: `"PAUM Gestor Educativo" <${from}>`,
        to,
        subject,
        html: `
          <p>Se adjunta el reporte oficial de tipo <strong>${reportType}</strong> generado el ${today}.</p>
          ${notes ? `<p><strong>Observaciones del coordinador:</strong><br/>${notes.replace(/\n/g, '<br/>')}</p>` : ''}
          <hr/>
          <p style="font-size:11px;color:#64748b;">Enviado automáticamente por el sistema PAUM Gestor Educativo – Facultad de Medicina BUAP.</p>
        `,
        attachments: [{
          filename: pdfFile.originalname || `PAUM-${reportType}-${Date.now()}.pdf`,
          content: pdfFile.buffer,
          contentType: 'application/pdf',
        }],
      });

      console.log(`[Reports] Reporte "${reportType}" enviado a ${to}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[Reports] Error al enviar el reporte:', error);
      res.status(500).json({ error: 'No se pudo enviar el reporte.' });
    }
  });

  if (staticDir) {
    const resolvedStaticDir = path.resolve(staticDir);
    const indexFile = path.join(resolvedStaticDir, 'index.html');

    app.use(express.static(resolvedStaticDir));
    app.get(/^\/(?!api).*/, (_req, res) => {
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
        return;
      }

      res.status(500).send(`No se encontro el build del frontend en ${resolvedStaticDir}`);
    });
  }

  return app;
}

export async function startServer({
  host = '0.0.0.0',
  port = 3001,
  staticDir,
}: StartServerOptions = {}): Promise<StartedServer> {
  // Inicializar base de datos primero
  await db.init();
  const app = createServer({ staticDir });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('No se pudo resolver la direccion del servidor.'));
        return;
      }

      const resolvedHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      resolve({
        app,
        host,
        port: address.port,
        server,
        url: `http://${resolvedHost}:${address.port}`,
      });
    });

    server.on('error', reject);
  });
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
   (process.argv[1].includes('server/index') || 
   process.argv[1].includes('server\\index'));

if (isDirectExecution) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';
  const staticDir = process.env.STATIC_DIR;

  startServer({ host, port, staticDir })
    .then(({ port: activePort }) => {
      console.log(`Server API running on ${activePort}`);
    })
    .catch((error) => {
      console.error('No se pudo iniciar el servidor:', error);
      process.exit(1);
    });
}
