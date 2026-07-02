import { Router } from 'express';
import multer from 'multer';

import { db } from '../db/index.ts';
import { parseKardexFile } from '../services/student.service.ts';
import { Student } from '@/shared/types.ts';

const upload = multer({ storage: multer.memoryStorage() });
export const studentsRouter = Router();

studentsRouter.get('/', (_req, res) => {
  try {
    res.json(db.getStudents());
  } catch (e) {
    res.status(500).json({ error: 'DB not ready' });
  }
});

studentsRouter.post('/', async (req, res) => {
  try {
    const created = await db.addStudent(req.body);
    if (created) res.status(201).json(created);
    else res.status(500).json({ error: 'Failed to create student' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create student' });
  }
});

studentsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await db.updateStudent(req.params.id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Student not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update student' });
  }
});

studentsRouter.delete('/:id', async (req, res) => {
  try {
    const success = await db.deleteStudent(req.params.id);
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

    const existing = db.getStudents().find((s) => s.enrollmentId === matricula);

    if (existing) {
      const updated = await db.updateStudent(existing.id, {
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

    const added = await db.addStudent(studentToCreate);
    res.json({ action: 'created', student: added });
  } catch (error) {
    console.error('PDF Parse Error:', error);
    res.status(500).json({ error: 'Failed to parse PDF Kardex' });
  }
});