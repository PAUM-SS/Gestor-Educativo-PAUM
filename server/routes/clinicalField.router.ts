import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db } from '../db/index.ts';
import { ClinicalField } from '@/shared/types.ts';
import { formatDate } from '../services/utils.ts';
import { parseClinicalFieldImport } from '../services/clinicalField.service.ts';

const upload = multer({ storage: multer.memoryStorage() });

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

clinicalFieldsRouter.post('/import', upload.single('clinicalFieldFile'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  try {
    const records = parseClinicalFieldImport(req.file);
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
    const result = db.clinicalFields.importClinicalFields(records);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import clinical fields data' });
  }
});

clinicalFieldsRouter.get('/export', async (_req, res) => {
  try {
    const rows = db.clinicalFields.exportClinicalFields();
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sedes Clínicas');
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Sedes_Clinicas_${formatDate()}.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export clinical fields data' });
  }
});