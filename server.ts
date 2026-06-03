/**
 * Basic Express Server for PAUM System
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { db } from './src/database';
import { MOCK_MODULES } from './src/constants';
import { ClinicalField, FacultyMember, ManualTask, Student, StudentKardexSummary, AcademicEvent } from './src/types';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
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


const FACULTY_DAY_MAP = new Map<string, FacultyMember['weeklySchedule'][number]>([
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['miércoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['sábado', 'Sábado'],
]);

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseDecimal(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(',', '.').trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extractEnrollmentId(text: string) {
  // BUAP uses 9 digits starting with 20 (e.g. 202012345)
  const keywordMatch = text.match(/matr[íi]cula[^0-9]*((?:20)(?:[\s\-_.]*\d){7})/i);
  if (keywordMatch?.[1]) {
    const digits = keywordMatch[1].replace(/[^\d]/g, '');
    if (/^20\d{7}$/.test(digits)) return digits;
  }

  const relaxedMatch = text.match(/(?:^|[^0-9])((?:20)(?:[\s\-_.]*\d){7})(?:[^0-9]|$)/);
  if (relaxedMatch?.[1]) {
    const digits = relaxedMatch[1].replace(/[^\d]/g, '');
    if (/^20\d{7}$/.test(digits)) return digits;
  }

  const digitsOnly = text.replace(/[^\d]/g, '');
  const fallback = digitsOnly.match(/20\d{7}/);
  return fallback?.[0];
}

function extractSemester(text: string) {
  // Prefer explicit semester when present (several variants in SIIA exports).
  const match =
    text.match(/\bsemestre\s*(?:actual|oficial)?\s*[:=]?\s*([1-9]|1[0-2])\b/i) ||
    text.match(/\b(?:nivel|periodo)\s*[:=]?\s*(?:sem)?\s*([1-9]|1[0-2])\b/i);
  if (!match?.[1]) return undefined;
  return Number.parseInt(match[1], 10);
}

function extractGpa(text: string) {
  // Promedio: 0-10 with 1-2 decimals, dot or comma.
  const match =
    text.match(/\bprom(?:edio)?(?:\s+general)?\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom\.\s*gral\.?\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom(?:edio)?\s*(?:acumulado|final)\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom(?:edio)?\s*general\s*acumulad[oa]\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bgpa\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bcalificaci[oó]n(?:\s+general)?[^0-9]*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i);

  const parsed = parseDecimal(match?.[1]);
  if (parsed === undefined) return undefined;
  // Keep within 0-10 range.
  return clampNumber(parsed, 0, 10);
}

function extractStudentStatusLabel(text: string) {
  const sliceMatch =
    text.match(/\btipo\s+alumno\s*[:=]?\s*([^\n]{0,160})/i) ||
    text.match(/\btipo\s+alumno\b([^\n]{0,160})/i);
  const window = String(sliceMatch?.[1] || '').replace(/\s+/g, ' ').trim();
  const haystack = window || text;

  // Handle common statuses even when OCR scrambles the header ordering.
  if (/\bbaja\s+por\s+reglamento\b/i.test(haystack)) return 'Baja por reglamento';
  if (/\btitulado\b/i.test(haystack)) return 'Titulado';
  if (/\binactivo\b/i.test(haystack)) return 'Inactivo';
  if (/\bactivo\b/i.test(haystack)) return 'Activo';

  // Usually appears in the header of SIIA Kardex: "Tipo Alumno: Activo"
  const match = text.match(/\btipo\s+alumno\s*[:=]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,60})/i);
  const candidate = match?.[1]?.replace(/\s+/g, ' ').trim();
  if (!candidate) return undefined;

  // Stop at the next common label to avoid swallowing the rest of the header.
  const cleaned = candidate
    .replace(/\b(PERIODO|NIVEL|CAMPUS|CLAVE|CENTRO|TRABAJO|FACULTAD|KARDEX|HISTORIAL)\b.*$/i, '')
    .replace(/[,;:\-]+$/g, '')
    .trim();

  return cleaned ? cleaned.slice(0, 60).trim() : undefined;
}

function extractProgressPercent(text: string) {
  // Prefer explicit percent: "Porcentaje 19%"
  const match = text.match(/\bporcen(?:taje|ta)\s*[:=]?\s*(\d{1,3})\s*%/i);
  if (!match?.[1]) return undefined;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value)) return undefined;
  return clampNumber(value, 0, 100);
}

function mapStatusLabelToStudentStatus(label?: string): Student['status'] | undefined {
  const normalized = normalizeKey(label || '');
  if (!normalized) return undefined;
  if (normalized.includes('baja')) return 'baja';
  if (normalized.includes('titulado') || normalized.includes('egresado')) return 'egresado';
  if (normalized.includes('inactivo')) return 'baja';
  if (normalized.includes('activo')) return 'activo';
  return undefined;
}
function extractStudentName(text: string) {
  // Handles lines like: "NOMBRE DEL ALUMNO: APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)"
  const match = text.match(
    /(?:NOMBRE\s+DEL\s+ALUMNO|NOMBRE\s+ALUMNO|ALUMNO|ESTUDIANTE|NOMBRE)\s*[:= -]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.'-]{6,120})/i
  );
  const candidate = match?.[1]?.replace(/\s+/g, ' ').trim();
  if (!candidate) return undefined;

  // Some PDFs concatenate fields without line breaks; stop at the next common label.
  const cleaned = candidate
    .replace(/\b(MATR[ÍI]CULA|PROMEDIO|SEMESTRE|COHORTE|CARRERA)\b.*$/i, '')
    .replace(/\b(FACULTAD|CAMPUS|NIVEL|TIPO\s+ALUMNO)\b.*$/i, '')
    .replace(/[,;:\-]+$/g, '')
    .trim();
  if (!cleaned) return undefined;
  // Avoid grabbing headings like "NOMBRE DEL ALUMNO" again.
  if (cleaned.toLowerCase().includes('alumno')) return undefined;
  return cleaned.length > 60 ? cleaned.slice(0, 60).trim() : cleaned;
}

function execFileAsync(file: string, args: string[], options: Parameters<typeof execFile>[2]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        (error as any).stdout = stdout;
        (error as any).stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

async function ocrImageWithWindows(imagePath: string, language = 'es-ES') {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const psPath = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

  // Use Windows OCR via WinRT (no extra npm deps).
  // Input is passed through environment vars to avoid command injection issues.
  const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Runtime.WindowsRuntime

function Await([object]$asyncOp, [Type]$resultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq 'AsTask' -and
      $_.IsGenericMethodDefinition -and
      $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.ToString().StartsWith('Windows.Foundation.IAsyncOperation')
    } |
    Select-Object -First 1

  $generic = $method.MakeGenericMethod(@($resultType))
  $task = $generic.Invoke($null, @($asyncOp))
  $task.Wait()
  return $task.Result
}

$img = $env:PAUM_OCR_IMAGE
$lang = $env:PAUM_OCR_LANG
if (-not $img) { throw 'Missing PAUM_OCR_IMAGE' }
if (-not (Test-Path -LiteralPath $img)) { throw ('Image not found: ' + $img) }
if (-not $lang) { $lang = 'es-ES' }

$stream = [System.IO.File]::OpenRead($img)
try {
  $ras = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)
  $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]::CreateAsync($ras)
  $decoderType = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
  $decoder = Await $decoderOp $decoderType

  $bitmapOp = $decoder.GetSoftwareBitmapAsync()
  $bitmapType = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
  $bitmap = Await $bitmapOp $bitmapType

  $langType = [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]
  $ocrType = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime]
  $engine = $ocrType::TryCreateFromLanguage($langType::new($lang))
  if ($null -eq $engine) { $engine = $ocrType::TryCreateFromUserProfileLanguages() }
  if ($null -eq $engine) { throw 'No OCR engine available.' }

  $resOp = $engine.RecognizeAsync($bitmap)
  $resType = [Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType=WindowsRuntime]
  $res = Await $resOp $resType
  $res.Text
} finally {
  $stream.Close()
}
`;

  const { stdout } = await execFileAsync(
    psPath,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
      env: {
        ...process.env,
        PAUM_OCR_IMAGE: imagePath,
        PAUM_OCR_LANG: language,
      },
    }
  );

  return stdout.replace(/\u0000/g, '').trim();
}

function normalizeFacultyCategory(value?: string): FacultyMember['category'] {
  const normalized = normalizeKey(value || '');

  if (normalized.includes('tecnico')) return 'Técnico Académico';
  if (normalized.includes('investig')) return 'Profesor-Investigador';
  return 'Profesor de Asignatura';
}

function normalizeFacultyDedication(value?: string): FacultyMember['dedication'] {
  const normalized = normalizeKey(value || '');

  if (normalized.includes('tiempocompleto')) return 'Tiempo Completo';
  if (normalized.includes('mediotiempo')) return 'Medio Tiempo';
  return 'Hora Clase';
}

function normalizeFacultyLevel(value?: string, category?: FacultyMember['category']): FacultyMember['level'] {
  const normalized = normalizeKey(value || '');

  if (normalized === 'asistente') return 'Asistente';
  if (normalized === 'asociadoa') return 'Asociado A';
  if (normalized === 'asociadob') return 'Asociado B';
  if (normalized === 'asociadoc') return 'Asociado C';
  if (normalized === 'titulara') return 'Titular A';
  if (normalized === 'titularb') return 'Titular B';
  if (normalized === 'titularc') return 'Titular C';

  return category === 'Técnico Académico' ? 'Asistente' : 'Asociado A';
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'si', 'sí', 'yes', 'x', 'ok'].includes(normalized);
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWeeklySchedule(value: unknown) {
  if (!value) return [];

  const parts = Array.isArray(value)
    ? value
    : String(value)
      .split(/[;,|/]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const uniqueDays = new Set<FacultyMember['weeklySchedule'][number]>();

  for (const part of parts) {
    const mapped = FACULTY_DAY_MAP.get(String(part).trim().toLowerCase());
    if (mapped) uniqueDays.add(mapped);
  }

  return Array.from(uniqueDays);
}

function splitDelimitedLine(line: string, separator: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseFacultyCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(headerLine, separator);

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, separator);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function toFacultyMember(raw: Record<string, any>): FacultyMember | null {
  const normalizedRecord = Object.fromEntries(
    Object.entries(raw || {}).map(([key, value]) => [normalizeKey(key), value])
  );

  const complianceFromObject = typeof raw?.compliance === 'object' && raw.compliance !== null ? raw.compliance : {};
  const normalizedCompliance = Object.fromEntries(
    Object.entries(complianceFromObject).map(([key, value]) => [normalizeKey(key), value])
  );

  const id = String(
    normalizedRecord.id ??
    normalizedRecord.matricula ??
    normalizedRecord.clave ??
    normalizedRecord.numeroempleado ??
    normalizedRecord.empleadoid ??
    ''
  ).trim();
  const name = String(
    normalizedRecord.name ??
    normalizedRecord.nombre ??
    normalizedRecord.docente ??
    normalizedRecord.profesor ??
    ''
  ).trim();

  if (!id || !name) {
    return null;
  }

  const category = normalizeFacultyCategory(String(normalizedRecord.category ?? normalizedRecord.categoria ?? raw.category ?? ''));
  const dedication = normalizeFacultyDedication(String(normalizedRecord.dedication ?? normalizedRecord.dedicacion ?? raw.dedication ?? ''));
  const level = normalizeFacultyLevel(String(normalizedRecord.level ?? normalizedRecord.nivel ?? raw.level ?? ''), category);

  return {
    id,
    name,
    category,
    level,
    dedication,
    seniority: normalizeNumber(normalizedRecord.seniority ?? normalizedRecord.antiguedad ?? raw.seniority, 0),
    hireDate: String(normalizedRecord.hiredate ?? normalizedRecord.fechaingreso ?? normalizedRecord.fechaalta ?? raw.hireDate ?? '').trim() || undefined,
    compliance: {
      cedula: normalizeBoolean(normalizedRecord.cedula ?? normalizedCompliance.cedula),
      medicalExam: normalizeBoolean(
        normalizedRecord.medicalexam ??
        normalizedRecord.examemedico ??
        normalizedRecord.examenmedico ??
        normalizedCompliance.medicalexam ??
        normalizedCompliance.examemedico ??
        normalizedCompliance.examenmedico
      ),
      inductionCourse: normalizeBoolean(
        normalizedRecord.inductioncourse ??
        normalizedRecord.induccion ??
        normalizedRecord.cursodeinduccion ??
        normalizedCompliance.inductioncourse ??
        normalizedCompliance.induccion ??
        normalizedCompliance.cursodeinduccion
      ),
      annualEvaluation: Math.min(
        100,
        Math.max(
          0,
          Math.round(
            normalizeNumber(
              normalizedRecord.annualevaluation ??
              normalizedRecord.evaluacionanual ??
              normalizedRecord.evaluacion ??
              normalizedCompliance.annualevaluation ??
              normalizedCompliance.evaluacionanual ??
              normalizedCompliance.evaluacion,
              0
            )
          )
        )
      ),
    },
    adscription: String(normalizedRecord.adscription ?? normalizedRecord.adscripcion ?? normalizedRecord.departamento ?? raw.adscription ?? 'Facultad de Medicina').trim() || 'Facultad de Medicina',
    email: String(normalizedRecord.email ?? normalizedRecord.correo ?? normalizedRecord.correoinstitucional ?? raw.email ?? '').trim() || undefined,
    phone: String(normalizedRecord.phone ?? normalizedRecord.telefono ?? normalizedRecord.celular ?? raw.phone ?? '').trim() || undefined,
    weeklySchedule: normalizeWeeklySchedule(
      normalizedRecord.weeklyschedule ??
      normalizedRecord.horariosemanal ??
      normalizedRecord.dias ??
      normalizedRecord.diaspresenciales ??
      raw.weeklySchedule
    ),
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  };
}

function parseFacultyImport(file: UploadedFile) {
  const fileName = file.originalname.toLowerCase();
  const text = file.buffer.toString('utf-8');

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.faculty) ? parsed.faculty : [];
    return records
      .map((record) => toFacultyMember(record))
      .filter((record): record is FacultyMember => Boolean(record));
  }

  return parseFacultyCsv(text)
    .map((record) => toFacultyMember(record))
    .filter((record): record is FacultyMember => Boolean(record));
}

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
        const codeKey = normalizeKey(module.code || module.id || '');
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
        const codeKey = normalizeKey(module.code || '');
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

      res.json(updatedModule);
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
        const parsed = JSON.parse(req.file.buffer.toString('utf-8'));
        const events = Array.isArray(parsed) ? parsed : parsed.events;

        if (!Array.isArray(events)) {
          res.status(400).json({ error: 'El JSON debe ser un array de eventos o tener una propiedad "events".' });
          return;
        }

        const validTypes = ['clase', 'ins', 'fin', 'susp', 'vac', 'gest', 'buap'];
        rawEvents = events
          .filter((e: any) => e.date && e.title && validTypes.includes(e.type))
          .map((e: any) => ({
            date: String(e.date),
            title: String(e.title),
            type: e.type as AcademicEvent['type'],
            description: e.description ? String(e.description) : undefined,
          }));

        if (rawEvents.length === 0) {
          res.status(400).json({ error: 'El JSON no contiene eventos válidos. Verifica el formato.' });
          return;
        }
      }

      // ── Rama PDF: extracción con Gemini ───────────────────────────────────────
      if (isPdf) {
        // 1. Extraer texto del PDF
        const parser = new PDFParse({ data: req.file.buffer });
        const parsedText = await parser.getText();
        const pdfText = String(parsedText?.text || '').replace(/\u0000/g, '').trim();

        if (!pdfText || pdfText.length < 50) {
          res.status(422).json({ error: 'No se pudo extraer texto del PDF. Verifica que no sea una imagen escaneada.' });
          return;
        }

        // 2. Llamar a Gemini para estructurar los eventos
        const model = genAI.models;
        const prompt = `
          Eres un asistente que extrae eventos de calendarios escolares universitarios mexicanos.
          Analiza el siguiente texto de un calendario escolar de la BUAP (Benemérita Universidad Autónoma de Puebla)
          y extrae TODOS los eventos marcados.
          
          Los tipos de eventos válidos son:
          - "clase"  → Inicio de cursos / Reinicio de actividades
          - "ins"    → Inscripción / Reinscripción
          - "fin"    → Fin de cursos / Exámenes finales
          - "susp"   → Suspensión de labores (días festivos, conmemorativos)
          - "vac"    → Periodo vacacional
          - "gest"   → Actividades de gestión académica/administrativa
          - "buap"   → Día de la Benemérita Universidad Autónoma de Puebla
          
          Tú determina el año del calendario. Todas las fechas deben estar en formato YYYY-MM-DD.
          
          Devuelve ÚNICAMENTE un JSON válido con este formato exacto (sin markdown, sin texto adicional):
          [
            { "date": "2026-01-05", "title": "Inicio de cursos Primavera 2026", "type": "clase" },
            { "date": "2026-02-02", "title": "Suspensión de labores (Aniversario Constitución)", "type": "susp" }
          ]
          
          Texto del calendario:
          ${pdfText}
      `.trim();

        const response = await model.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const geminiText = response.text?.trim() ?? '';

        // Limpiar posibles backticks de markdown que Gemini a veces agrega
        const cleanJson = geminiText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        let parsed: any[];
        try {
          parsed = JSON.parse(cleanJson);
        } catch {
          console.error('[Calendar] Gemini no devolvió JSON válido:', geminiText);
          res.status(422).json({
            error: 'La IA no pudo estructurar los eventos del PDF. Intenta subir un JSON manualmente.',
          });
          return;
        }

        const validTypes = ['clase', 'ins', 'fin', 'susp', 'vac', 'gest', 'buap'];
        rawEvents = parsed
          .filter((e: any) => e.date && e.title && validTypes.includes(e.type))
          .map((e: any) => ({
            date: String(e.date),
            title: String(e.title),
            type: e.type as AcademicEvent['type'],
            description: e.description ? String(e.description) : undefined,
          }));

        if (rawEvents.length === 0) {
          res.status(422).json({ error: 'Gemini no encontró eventos reconocibles en el PDF.' });
          return;
        }
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
  process.argv[1].includes('server.ts');

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
