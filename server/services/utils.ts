export type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// ─── Funciones ──────────
export function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'si', 'sí', 'yes', 'x', 'ok'].includes(normalized);
}

export function parseDecimal(value?: string) {
  if (!value) return undefined;
  
  const normalized = value.replace(',', '.').trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function splitDelimitedLine(line: string, separator: string) {
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