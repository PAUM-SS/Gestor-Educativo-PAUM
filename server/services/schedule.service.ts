import * as xlsx from 'xlsx';
import { AcademicSection } from '@/shared/types.ts';
import { UploadedFile, splitDelimitedLine } from './utils.ts';

// ─── CSV ──────────

function parseSectionCsv(text: string) {
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

// ─── Conversión de registro crudo a AcademicSection ──────────

function toAcademicSection(raw: Record<string, any>): AcademicSection | null {
  const normalizedRecord: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (key) normalizedRecord[key.toLowerCase().trim()] = value;
  }

  const id = String(normalizedRecord['nrc'] ?? '').trim();
  const moduleId = String(
    normalizedRecord['código'] ?? normalizedRecord['codigo'] ?? ''
  ).trim();

  if (!id && !moduleId) return null;

  const finalId = id || `sec-imp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const capacity = parseInt(String(normalizedRecord['cupo'] ?? '0'), 10) || 0;
  const enrolled = parseInt(String(normalizedRecord['inscritos'] ?? '0'), 10) || 0;
  const facultyId = String(
    normalizedRecord['id'] ?? normalizedRecord['id-docente'] ?? ''
  ).trim();
  const comments = normalizedRecord['comentarios']
    ? String(normalizedRecord['comentarios']).trim()
    : undefined;
  const adjustment = normalizedRecord['ajuste']
    ? String(normalizedRecord['ajuste']).trim()
    : undefined;

  const globalRoom = String(
    normalizedRecord['edif-salón'] ?? normalizedRecord['edif-salon'] ?? ''
  ).trim();

  const daysMap: Record<string, string> = {
    lun: 'Lunes',
    mar: 'Martes',
    mie: 'Miércoles',
    jue: 'Jueves',
    vie: 'Viernes',
    sab: 'Sábado',
  };

  const schedule: any[] = [];
  for (const [key, dayName] of Object.entries(daysMap)) {
    const val = normalizedRecord[key];
    if (val && typeof val === 'string' && val.trim() !== '') {
      const parts = val.trim().split('-');
      if (parts.length === 2) {
        schedule.push({
          day: dayName,
          start: parts[0].trim(),
          end: parts[1].trim(),
          room: globalRoom,
          roomType: 'Teórico',
        });
      } else {
        schedule.push({
          day: dayName,
          start: val.trim(),
          end: val.trim(),
          room: globalRoom,
          roomType: 'Teórico',
        });
      }
    }
  }

  return {
    id: finalId,
    moduleId: moduleId || 'SIN-CODIGO',
    facultyId,
    capacity,
    enrolled,
    schedule,
    comments,
    adjustment,
  };
}

// ─── Parser principal ──────────

export function parseSectionImport(file: UploadedFile): AcademicSection[] {
  const fileName = file.originalname.toLowerCase();

  if (fileName.endsWith('.xlsx')) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsed = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: null,
      raw: false,
    });
    return parsed
      .map((record) => toAcademicSection(record))
      .filter((record): record is AcademicSection => Boolean(record));
  }

  const text = file.buffer.toString('utf-8');

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.sections)
      ? parsed.sections
      : [];
    return records
      .map((record) => toAcademicSection(record))
      .filter((record): record is AcademicSection => Boolean(record));
  }

  return parseSectionCsv(text)
    .map((record) => toAcademicSection(record))
    .filter((record): record is AcademicSection => Boolean(record));
}