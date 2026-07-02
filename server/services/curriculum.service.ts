import * as XLSX from 'xlsx';
import { UploadedFile } from './utils';
import { Module } from '@/shared/types.ts';

// ─── Nivel por código ──────────

const PAUM_LEVEL_BY_CODE: Record<string, Module['level']> = {
    'PAUS 001': 'Básico',      'PAUS 002': 'Básico',      'PAUS 003': 'Formativo',
    'PAUS 004': 'Formativo',   'PAUS 005': 'Básico',      'FGUS 002': 'Minerva',
    'FGUS 004': 'Minerva',     'PAUS 006': 'Básico',      'PAUS 007': 'Básico',
    'PAUS 009': 'Formativo',   'PAUS 011': 'Formativo',   'PAUS 258': 'Formativo',
    'FGUS 001': 'Minerva',     'FGUS 005': 'Minerva',     'PAUS 008': 'Formativo',
    'PAUS 250': 'Formativo',   'PAUS 251': 'Formativo',   'PAUS 252': 'Formativo',
    'PAUS 253': 'Formativo',   'PAUS 255': 'Formativo',   'PAUS 256': 'Formativo',
    'PAUS 010': 'Básico',      'PAUS 254': 'Formativo',   'PAUS 257': 'Formativo',
    'PAUS 259': 'Formativo',   'PAUS 260': 'Básico',      'PAUS 261': 'Formativo',
    'PAUS 262': 'Formativo',   'PPUM 101': 'Práctica/Servicio', 'SSUM 100': 'Práctica/Servicio',
};

function inferModuleLevel(code: string): Module['level'] {
    const known = PAUM_LEVEL_BY_CODE[code.trim()];
    if (known) return known;

    const prefix = code.trim().split(' ')[0].toUpperCase();
    if (prefix.startsWith('FGUS') || prefix.startsWith('FGUM')) return 'Minerva';
    if (prefix.startsWith('PPUM') || prefix.startsWith('SSUM')) return 'Práctica/Servicio';
    
    return 'Formativo';
}

// ─── Parser de archivo XLSX ──────────

export function parseCurriculumImport(file: UploadedFile) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Base Asignatura'];
    if (!sheet) return [];

    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return rows
        .filter((row) => String(row['Clave PA'] || '').trim().toUpperCase() === 'PAU')
        .map((row) => {
        const code = String(row['Código'] || '').trim();
        const title = String(row['Asignatura'] || '').trim();
        const credits = Number(row['Créd']) || 0;
        const rawSemester = String(row['Semestre'] || '').trim().toUpperCase();
        const semester = rawSemester === 'SS' ? 'Servicio' : Number(row['Semestre']);
        return { code, title, credits, semester, level: inferModuleLevel(code) };
        })
        .filter((m) => m.code && m.title);
}

// ─── Extracción de unidades del PDF del syllabus ──────────

export function extractUnitsFromPDF(
    text: string
): { unitNumber: string; title: string; content: string }[] {
    const units: { unitNumber: string; title: string; content: string }[] = [];
    const seen = new Set<string>();

    const rawLines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const skipPatterns = [
        /^Benemérita Universidad/,
        /^Vicerrectoría de Docencia/,
        /^Dirección General/,
        /^Facultad de Medicina/,
        /^-- \d+ of \d+ --$/,
        /^Bioquímica\s*$/i,
        /^\d+$/,
        /^Unidad\s+Contenido/,
    ];

    const lines = rawLines.filter(
        (line) => !skipPatterns.some((pattern) => pattern.test(line))
    );

    const excluded = [
        'DATOS GENERALES', 'CARGA HORARIA', 'REVISIONES', 'ACTUALIZACIONES',
        'OBJETIVO', 'CONTENIDOS TEMÁTICOS', 'CONTRIBUCIÓN', 'ESTRATEGIAS',
        'CRITERIOS', 'REQUISITOS', 'PERFIL DESEABLE', 'DESCRIBA', 'EJES',
        'PERFIL DE EGRESO',
    ];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Caso especial: título muy corto (ej. "pH")
        const shortMatch = line.match(
            /^(\d+)\.\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]{1,5})\s+\d+\.\d+/
        );
        if (shortMatch) {
            const unitNumber = shortMatch[1];
            const title = shortMatch[2].trim().toUpperCase();
            const afterTitle = line
                .slice(line.indexOf(shortMatch[2]) + shortMatch[2].length)
                .trim();

            const isExcluded = excluded.some((ex) => title.includes(ex));
            if (!isExcluded && !seen.has(title)) {
                seen.add(title);
                const contentLines: string[] = [];
                if (afterTitle.length > 3) contentLines.push(afterTitle);
                let k = i + 1;
                while (k < lines.length && k < i + 20) {
                    const nextLine = lines[k];
                    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]/.test(nextLine)) break;
                    if (
                        nextLine.length > 5 &&
                        !/^(McKee|Rodwell|John|Baynes|Capítulo|Sección|D\.A\.|P\(Eds\.|Elsevier|McGraw|Bioquímica\. Las|Harper\.|ilustrada|moleculares)/.test(nextLine) &&
                        !/\(20\d\d\)/.test(nextLine) &&
                        !/^\d+e\s/.test(nextLine)
                    ) {
                        contentLines.push(nextLine);
                    }
                    k++;
                }
                units.push({
                    unitNumber,
                    title,
                    content: contentLines.join(' ').slice(0, 800),
                });
            }
            i++;
            continue;
        }

        const match = line.match(
            /^(\d+)\.\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ\s\/]{1,40})(?:\s+(\d+\.\d+.*)|\s*$)/
        );

        if (match) {
            let unitNumber = match[1];
            let title = match[2].trim();
            let extraContent = match[3] || '';

            let j = i + 1;
            while (j < lines.length && j < i + 3) {
                const nextLine = lines[j];
                if (
                    /^[A-ZÁÉÍÓÚÑ\s]+$/.test(nextLine) &&
                    nextLine.length >= 2 &&
                    nextLine.length <= 30 &&
                    !/^\d+\./.test(nextLine) &&
                    !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(nextLine)
                ) {
                    title = title + ' ' + nextLine;
                    j++;
                } else {
                    break;
                }
            }
            i = j - 1;

            const isExcluded = excluded.some((ex) => title.toUpperCase().includes(ex));
            const isDuplicate = seen.has(title.toUpperCase());
            const isTableHeader =
                title.toUpperCase().includes('TEMÁTICO') ||
                title.toUpperCase().includes('REFERENCIAS');

            if (!isExcluded && !isDuplicate && !isTableHeader && title.length >= 3 && title.length <= 80) {
                seen.add(title.toUpperCase());

                const contentLines: string[] = [];
                let k = i + 1;
                while (k < lines.length && k < i + 30) {
                    const nextLine = lines[k];
                    if (/^\d+\.\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]/.test(nextLine)) break;
                    const isReference =
                        /^(McKee|Rodwell|John|Baynes|Capítulo|Sección|J\.R\.|7e\.|32e\.|5e\.|Elsevier|McGraw)/.test(nextLine);
                    const isPageNumber = /^\d+$/.test(nextLine);
                    const isTooShort = nextLine.length < 5;
                    if (!isReference && !isPageNumber && !isTooShort) {
                        contentLines.push(nextLine);
                    }
                    k++;
                }

                units.push({
                    unitNumber,
                    title,
                    content: (extraContent + ' ' + contentLines.join(' ')).trim().slice(0, 800),
                });
            }
        }
        i++;
    }

    return units;
}

export function extractLearningOutcome(text: string): string {
    const match = text.match(
        /(?:5\.\s*OBJETIVO[:\s]*|OBJETIVO[:\s]*\n)([\s\S]{20,600}?)(?=\n\s*6\.|$)/i
    );
    if (!match?.[1]) return '';

    return match[1]
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
}