import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db } from '../db/index.ts';
import { parseKardexFile } from '../services/student.service.ts';
import { Student } from '@/shared/types.ts';
import { parseStudentImport } from '../services/student.service.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const studentsRouter = Router();

studentsRouter.get('/', (_req, res) => {
  try {
    res.json(db.students.getStudents());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

studentsRouter.post('/', async (req, res) => {
  try {
    const created = await db.students.addStudent(req.body);
    if (created) res.status(201).json(created);
    else res.status(500).json({ error: 'Failed to create student' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create student' });
  }
});

studentsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await db.students.updateStudent(req.params.id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Student not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update student' });
  }
});

studentsRouter.delete('/:id', async (req, res) => {
  try {
    const success = await db.students.deleteStudent(req.params.id);
    if (success) res.json({ success: true });
    else res.status(404).json({ error: 'Student not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

studentsRouter.post('/upload-kardex', upload.single('kardex'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  if (!req.file.originalname?.toLowerCase().endsWith('.pdf')) {
    res.status(400).json({ error: 'Solo se permiten archivos PDF.' });
    return;
  }

  try {
    const uploadsDir = db.getUploadsDir();
    const planModules = db.getModules();

    const result = await parseKardexFile(req.file, uploadsDir, planModules);

    if (!result.ok) {
      res.status(result.error.status).json({
        error: result.error.error,
        ...(result.error.debug && { debug: result.error.debug }),
      });
      return;
    }

    const {
      extractedName, matricula, gpa, calculatedSemester,
      cohort, finalStatus, alert, kardex,
    } = result.data;

    const existing = db.students.getStudents().find((s) => s.enrollmentId === matricula);

    if (existing) {
      const updated = await db.students.updateStudent(existing.id, {
        name: extractedName,
        enrollmentId: matricula,
        gpa,
        semester: calculatedSemester,
        cohort,
        status: finalStatus,
        alert,
        kardex,
      });
      res.json({ action: 'updated', student: updated });
      return;
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

    const added = await db.students.addStudent(studentToCreate);
    res.json({ action: 'created', student: added });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    res.status(500).json({ error: 'Failed to parse PDF Kardex' });
  }
});

studentsRouter.post('/import', upload.single('studentsFile'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    const records = parseStudentImport(req.file);
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
    const result = await db.students.importStudents(records);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import students data' });
  }
});

studentsRouter.get('/export', async (_req, res) => {
  try {
    const rows = db.students.exportStudents();
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Cohorte Estudiantil');
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