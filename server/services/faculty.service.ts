import { FacultyMember } from '@/shared/types.ts';
import { UploadedFile, normalizeKey, normalizeNumber, splitDelimitedLine } from './utils.ts';

// ─── Constantes ──────────

type ScheduleDay = NonNullable<FacultyMember['weeklySchedule']>[number];

const FACULTY_DAY_MAP = new Map<string, ScheduleDay>([
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['miércoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['sábado', 'Sábado'],
]);

// ─── Normalizadores ──────────

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

function normalizeFacultyLevel(
  value?: string,
  category?: FacultyMember['category']
): FacultyMember['level'] {
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

function normalizeWeeklySchedule(value: unknown) {
  if (!value) return [];

  const parts = Array.isArray(value)
    ? value
    : String(value)
        .split(/[;,|/]/)
        .map((item) => item.trim())
        .filter(Boolean);

  const uniqueDays = new Set<ScheduleDay>();
  for (const part of parts) {
    const mapped = FACULTY_DAY_MAP.get(String(part).trim().toLowerCase());
    if (mapped) uniqueDays.add(mapped);
  }
  return Array.from(uniqueDays);
}

// ─── Conversión a FacultyMember ──────────

function toFacultyMember(raw: Record<string, any>): FacultyMember | null {
  const normalizedRecord = Object.fromEntries(
    Object.entries(raw || {}).map(([key, value]) => [normalizeKey(key), value])
  );

  const complianceFromObject =
    typeof raw?.compliance === 'object' && raw.compliance !== null ? raw.compliance : {};
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

  if (!id || !name) return null;

  const category = normalizeFacultyCategory(
    String(normalizedRecord.category ?? normalizedRecord.categoria ?? raw.category ?? '')
  );
  const dedication = normalizeFacultyDedication(
    String(normalizedRecord.dedication ?? normalizedRecord.dedicacion ?? raw.dedication ?? '')
  );
  const level = normalizeFacultyLevel(
    String(normalizedRecord.level ?? normalizedRecord.nivel ?? raw.level ?? ''),
    category
  );

  return {
    id,
    name,
    category,
    level,
    dedication,
    seniority: normalizeNumber(
      normalizedRecord.seniority ?? normalizedRecord.antiguedad ?? raw.seniority,
      0
    ),
    hireDate:
      String(
        normalizedRecord.hiredate ??
        normalizedRecord.fechaingreso ??
        normalizedRecord.fechaalta ??
        raw.hireDate ??
        ''
      ).trim() || undefined,
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
    adscription:
      String(
        normalizedRecord.adscription ??
        normalizedRecord.adscripcion ??
        normalizedRecord.departamento ??
        raw.adscription ??
        'Facultad de Medicina'
      ).trim() || 'Facultad de Medicina',
    email:
      String(
        normalizedRecord.email ??
        normalizedRecord.correo ??
        normalizedRecord.correoinstitucional ??
        raw.email ??
        ''
      ).trim() || undefined,
    phone:
      String(
        normalizedRecord.phone ??
        normalizedRecord.telefono ??
        normalizedRecord.celular ??
        raw.phone ??
        ''
      ).trim() || undefined,
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

// ─── Parsers de archivo ──────────

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

export function parseFacultyImport(file: UploadedFile): FacultyMember[] {
  const fileName = file.originalname.toLowerCase();
  const text = file.buffer.toString('utf-8');

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.faculty)
      ? parsed.faculty
      : [];
    return records
      .map((record) => toFacultyMember(record))
      .filter((record): record is FacultyMember => Boolean(record));
  }

  return parseFacultyCsv(text)
    .map((record) => toFacultyMember(record))
    .filter((record): record is FacultyMember => Boolean(record));
}