import * as xlsx from 'xlsx';
import { UploadedFile, normalizeKey, splitDelimitedLine, normalizeNumber } from './utils.ts';
import { ClinicalField } from '@/shared/types.ts';

// ─── Parsers de datos a ClinicalField ──────────

function toClinicalField(record: Record<string, any>): ClinicalField | null {
    // Buscar propiedades normalizando sus llaves
    const findProp = (keys: string[]) => {
        const normalizedKeys = keys.map(normalizeKey);
        for (const [key, value] of Object.entries(record)) {
            if (normalizedKeys.includes(normalizeKey(key))) return value;
        }
        return undefined;
    };

    const id = findProp(['iddesede', 'ID Sede']);
    const name = findProp(['nombredesede', 'Nombre Sede']);

    if (!id || !name) return null; // ID y Nombre son requeridos

    const rawType = findProp(['tipo', 'type']);
    const typeMap: Record<string, ClinicalField['type']> = {
        'publico': 'Público',
        'privado': 'Privado',
        'social': 'Social',
        'rescate': 'Rescate'
    };
    const type = typeMap[normalizeKey(String(rawType || ''))] || 'Público';

    const rawLevel = normalizeNumber(findProp(['nivel', 'level']), 1);
    const level = (rawLevel >= 1 && rawLevel <= 3 ? rawLevel : 1) as 1 | 2 | 3;

    const slots = normalizeNumber(findProp(['plazasdisponibles', 'plazas', 'slots', 'capacidad']), 0);

    const rawStatus = findProp(['estatus', 'status']);
    const statusMap: Record<string, ClinicalField['status']> = {
        'activo': 'Activo',
        'enrevision': 'En Revisión',
        'vencido': 'Vencido'
    };
    const status = statusMap[normalizeKey(String(rawStatus || ''))] || 'En Revisión';

    const pertinence = String(findProp(['pertinencia', 'pertinence']) || '');
    const lastInspection = String(findProp(['ultimainspeccion', 'lastinspection', 'inspeccion']) || '');
    const agreementExpiry = String(findProp(['vencimientodeconvenio', 'agreementexpiry', 'vencimiento']) || '');

    return {
        id: String(id),
        name: String(name),
        type,
        level,
        slots,
        status,
        pertinence,
        lastInspection,
        agreementExpiry
    };
}

function parseCsv(text: string): Record<string, any>[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
    const headers = splitDelimitedLine(headerLine, separator);

    return lines.slice(1).map(line => {
        const values = splitDelimitedLine(line, separator);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
}

// ─── Función Principal de Importación ──────────

export function parseClinicalFieldImport(file: UploadedFile): ClinicalField[] {
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
            .map(record => toClinicalField(record))
            .filter((record): record is ClinicalField => Boolean(record));
    }

    const text = file.buffer.toString('utf-8');

    if (fileName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        const records = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.clinicalFields)
                ? parsed.clinicalFields
                : [];
        return records
            .map(record => toClinicalField(record))
            .filter((record): record is ClinicalField => Boolean(record));
    }

    return parseCsv(text)
        .map(record => toClinicalField(record))
        .filter((record): record is ClinicalField => Boolean(record));
}
