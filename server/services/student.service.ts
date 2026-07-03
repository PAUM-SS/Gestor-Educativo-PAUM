import fs from 'node:fs';
import path from 'node:path';
import * as xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { execFile } from 'node:child_process';
import { UploadedFile, parseDecimal, clampNumber, normalizeKey, splitDelimitedLine } from './utils.ts';
import { MOCK_MODULES } from '@/shared/constants.ts';
import { Student, StudentKardexSummary, Module  } from '@/shared/types.ts';

// ─── Tipos ──────────

type KardexParseResult = {
    extractedName: string;
    matricula: string;
    gpa: number;
    detectedGpa: number | undefined;
    detectedSemester: number | undefined;
    calculatedSemester: number;
    cohort: string;
    matchedModuleIds: string[];
    missingModuleIds: string[];
    riskReasons: string[];
    finalStatus: Student['status'];
    alert: boolean;
    kardex: StudentKardexSummary;
    sourcePdfUrl: string | undefined;
    debugTextUrl: string | undefined;
    sourceOcrImageUrl: string | undefined;
    extractionMethod: 'pdf' | 'ocr' | 'pdf+ocr';
    rawTextLength: number;
    ocrTextLength: number;
};

type KardexParseError = {
    status: 422 | 500;
    error: string;
    debug?: Record<string, unknown>;
};

// ─── OCR ──────────

function execFileAsync(
    file: string,
    args: string[],
    options: Parameters<typeof execFile>[2]
) {
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
    const psPath = path.join(
        systemRoot,
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe'
    );

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

function toStudent(raw: Record<string, any>): Student | null {
    const normalizedRecord: Record<string, any> = {};
    for (const [key, value] of Object.entries(raw || {})) {
        if (key) normalizedRecord[key.toLowerCase().trim()] = value;
    }

    // Campos requeridos — si no hay nombre ni matrícula, la fila es inválida
    const name = String(
        normalizedRecord['nombre'] ??
        normalizedRecord['name'] ??
        ''
    ).trim();

    const enrollmentId = String(
        normalizedRecord['matrícula'] ??
        normalizedRecord['matricula'] ??
        normalizedRecord['enrollmentid'] ??
        ''
    ).trim();

    if (!name && !enrollmentId) return null;

    return {
        id: String(
        normalizedRecord['id'] ?? `stu-imp-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        ).trim(),
        name,
        enrollmentId,
        semester: parseInt(String(normalizedRecord['semestre'] ?? normalizedRecord['semester'] ?? '1'), 10) || 1,
        status: (String(
        normalizedRecord['estatus'] ??
        normalizedRecord['status'] ??
        'activo'
        ).trim().toLowerCase() || 'activo') as Student['status'],
        gpa: parseFloat(String(normalizedRecord['promedio'] ?? normalizedRecord['gpa'] ?? '0').replace(',', '.')) || 0,
        attendance: parseFloat(String(normalizedRecord['asistencia'] ?? normalizedRecord['attendance'] ?? '100')) || 100,
        email: String(normalizedRecord['correo'] ?? normalizedRecord['email'] ?? '').trim(),
        cohort: String(normalizedRecord['cohorte'] ?? normalizedRecord['cohort'] ?? '').trim(),
        tutor: String(normalizedRecord['tutor'] ?? '').trim(),
        alert: ['sí', 'si', 'yes', '1', 'true'].includes(
        String(normalizedRecord['alerta'] ?? normalizedRecord['alert'] ?? 'no').toLowerCase().trim()
        ),
        kardex: undefined,
    };
}

// ─── Extractores de texto del Kardex ──────────

function extractEnrollmentId(text: string) {
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
    const match =
        text.match(/\bsemestre\s*(?:actual|oficial)?\s*[:=]?\s*([1-9]|1[0-2])\b/i) ||
        text.match(/\b(?:nivel|periodo)\s*[:=]?\s*(?:sem)?\s*([1-9]|1[0-2])\b/i);
    if (!match?.[1]) return undefined;

    return Number.parseInt(match[1], 10);
}

function extractGpa(text: string) {
  const match =
    text.match(/\bprom(?:edio)?(?:\s+general)?\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom\.\s*gral\.?\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom(?:edio)?\s*(?:acumulado|final)\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bprom(?:edio)?\s*general\s*acumulad[oa]\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bgpa\s*[:=]?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i) ||
    text.match(/\bcalificaci[oó]n(?:\s+general)?[^0-9]*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\b/i);

  const parsed = parseDecimal(match?.[1]);
  if (parsed === undefined) return undefined;

  return clampNumber(parsed, 0, 10);
}

function extractStudentStatusLabel(text: string) {
    const sliceMatch =
        text.match(/\btipo\s+alumno\s*[:=]?\s*([^\n]{0,160})/i) ||
        text.match(/\btipo\s+alumno\b([^\n]{0,160})/i);
    const window = String(sliceMatch?.[1] || '').replace(/\s+/g, ' ').trim();
    const haystack = window || text;

    if (/\bbaja\s+por\s+reglamento\b/i.test(haystack)) return 'Baja por reglamento';
    if (/\btitulado\b/i.test(haystack)) return 'Titulado';
    if (/\binactivo\b/i.test(haystack)) return 'Inactivo';
    if (/\bactivo\b/i.test(haystack)) return 'Activo';

    const match = text.match(
        /\btipo\s+alumno\s*[:=]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,60})/i
    );
    const candidate = match?.[1]?.replace(/\s+/g, ' ').trim();
    if (!candidate) return undefined;

    const cleaned = candidate
        .replace(/\b(PERIODO|NIVEL|CAMPUS|CLAVE|CENTRO|TRABAJO|FACULTAD|KARDEX|HISTORIAL)\b.*$/i, '')
        .replace(/[,;:\-]+$/g, '')
        .trim();

    return cleaned ? cleaned.slice(0, 60).trim() : undefined;
}

function extractProgressPercent(text: string) {
    const match = text.match(/\bporcen(?:taje|ta)\s*[:=]?\s*(\d{1,3})\s*%/i);
    if (!match?.[1]) return undefined;

    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value)) return undefined;

    return clampNumber(value, 0, 100);
}

function extractStudentName(text: string) {
    const match = text.match(
        /(?:NOMBRE\s+DEL\s+ALUMNO|NOMBRE\s+ALUMNO|ALUMNO|ESTUDIANTE|NOMBRE)\s*[:= -]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.'-]{6,120})/i
    );
    const candidate = match?.[1]?.replace(/\s+/g, ' ').trim();
    if (!candidate) return undefined;

    const cleaned = candidate
        .replace(/\b(MATR[ÍI]CULA|PROMEDIO|SEMESTRE|COHORTE|CARRERA)\b.*$/i, '')
        .replace(/\b(FACULTAD|CAMPUS|NIVEL|TIPO\s+ALUMNO)\b.*$/i, '')
        .replace(/[,;:\-]+$/g, '')
        .trim();

    if (!cleaned) return undefined;
    if (cleaned.toLowerCase().includes('alumno')) return undefined;

    return cleaned.length > 60 ? cleaned.slice(0, 60).trim() : cleaned;
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

export async function parseKardexFile(
    file: UploadedFile,
    uploadsDir: string,
    planModules: Module[]
): Promise<{ ok: true; data: KardexParseResult } | { ok: false; error: KardexParseError }> {
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

    // ── 1. Extraer texto del PDF ──────────────────────────────────────────────
    try {
        const parser = new PDFParse({ data: file.buffer });
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

    // ── 2. Guardar PDF y texto para debug ────────────────────────────────────
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const studentsUploadsDir = path.join(uploadsDir, 'students');
    fs.mkdirSync(studentsUploadsDir, { recursive: true });

    const savedFileName = `kardex-${Date.now()}-${safeOriginalName}`;
    const savedFilePath = path.join(studentsUploadsDir, savedFileName);
    await fs.promises.writeFile(savedFilePath, file.buffer);
    sourcePdfUrl = `/uploads/students/${encodeURIComponent(savedFileName)}`;

    const savedTextFileName = savedFileName
        .replace(/^kardex-/, 'kardex-text-')
        .replace(/\.pdf$/i, '.txt');
    const savedTextFilePath = path.join(studentsUploadsDir, savedTextFileName);
    await fs.promises.writeFile(savedTextFilePath, text, 'utf-8');
    debugTextUrl = `/uploads/students/${encodeURIComponent(savedTextFileName)}`;

    // ── 3. OCR fallback ───────────────────────────────────────────────────────
    if (text.length < 80) {
        if (process.platform === 'win32') {
            try {
                const parser = new PDFParse({ data: file.buffer });
                const shot = await parser.getScreenshot({
                    partial: [1], scale: 3, imageBuffer: true, imageDataUrl: false,
                });
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

    // ── 4. Validar texto mínimo ───────────────────────────────────────────────
    if (text.length < 80) {
        const details = [parseErrorMessage, ocrErrorMessage].filter(Boolean).join(' | ');
        return {
            ok: false,
            error: {
                status: 422,
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
            },
        };
    }

    // ── 5. Fallback de nombre ─────────────────────────────────────────────────
    if (!extractedName && file.originalname) {
        extractedName = file.originalname
        .replace(/\.pdf$/i, '')
        .replace(/kardex/i, '')
        .replace(/_/g, ' ')
        .trim();
    }
    if (!extractedName) extractedName = 'Alumno Recuperado (Auto)';
    if (extractedName.length > 60) extractedName = extractedName.substring(0, 60);

    // ── 6. Validar matrícula ──────────────────────────────────────────────────
    const matricula = extractEnrollmentId(text);
    if (!matricula) {
        return {
            ok: false,
            error: {
                status: 422,
                error: 'No pude detectar la matrícula (9 dígitos que inicia con 20). Verifica que sea el Kardex/Historial Académico de SIIA BUAP.',
                debug: { pdfUrl: sourcePdfUrl, textUrl: debugTextUrl, parseErrorMessage },
            },
        };
    }

    // ── 7. Extraer datos ──────────────────────────────────────────────────────
    const statusLabel = extractStudentStatusLabel(text);
    const progressPercent = extractProgressPercent(text);
    const detectedGpa = extractGpa(text);
    const detectedSemester = extractSemester(text);

    // ── 8. Cruzar módulos ─────────────────────────────────────────────────────
    const modules = planModules.length > 0 ? planModules : MOCK_MODULES;
    const normalizedKardexText = normalizeKey(text);
    const matchedModuleIdSet = new Set<string>();

    const codeIndex = new Map<string, (typeof modules)[number]>();
    for (const module of modules) {
        const codeKey = normalizeKey(module.id || '');
        if (codeKey) codeIndex.set(codeKey, module);
    }

    const codeLikeMatches = text.match(/\b[A-Z]{3,6}[\s\-_.\/]*\d{3}\b/gi) || [];
    for (const raw of codeLikeMatches) {
        const codeKey = normalizeKey(raw);
        const module = codeIndex.get(codeKey);
        if (module) matchedModuleIdSet.add(module.id);
    }

    for (const module of modules) {
        if (matchedModuleIdSet.has(module.id)) continue;
        const codeKey = normalizeKey(module.id || '');
        const titleKey = normalizeKey(module.title || '');
        if (
            (codeKey && normalizedKardexText.includes(codeKey)) ||
            (titleKey && normalizedKardexText.includes(titleKey))
        ) {
            matchedModuleIdSet.add(module.id);
        }
    }

    const matchedModuleIds = Array.from(matchedModuleIdSet);

    let derivedSemester = 1;
    for (const module of modules) {
        if (!matchedModuleIdSet.has(module.id)) continue;
        if (typeof module.semester === 'number' && module.semester > derivedSemester) {
            derivedSemester = module.semester;
        }
    }

    const maxPlanSemester = modules.reduce((max, m) => {
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
            ? modules.filter((m) => !matchedModuleIdSet.has(m.id)).map((m) => m.id)
            : [];

    const calculatedSemester = clampNumber(
        detectedSemester ?? derivedSemesterFromModules ?? derivedSemesterFromProgress ?? 1,
        1,
        12
    );

    // ── 9. Riesgo académico ───────────────────────────────────────────────────
    const admissionYear = Number.parseInt(matricula.substring(0, 4), 10);
    const cohort = Number.isFinite(admissionYear) ? `${admissionYear}-Otoño` : '2026-Otoño';
    const currentYear = new Date().getFullYear();
    const yearsInProgram = Number.isFinite(admissionYear) ? currentYear - admissionYear : 0;

    const pendingPreviousSemesters =
        matchedModuleIds.length > 0
        ? modules.filter((m) => {
            if (matchedModuleIdSet.has(m.id)) return false;
            if (typeof m.semester !== 'number') return false;
            return m.semester < calculatedSemester;
            }).length
        : 0;

    const riskReasons: string[] = [];
    if (detectedGpa !== undefined && detectedGpa < 8.0)
        riskReasons.push('Promedio por debajo de 8.0.');
    if (detectedGpa === undefined)
        riskReasons.push('No se detectó el Promedio en el Kardex.');
    if (matchedModuleIds.length === 0 && progressPercent === undefined)
        riskReasons.push('No se detectaron materias (códigos o nombres) dentro del Kardex.');
    if (yearsInProgram >= 4)
        riskReasons.push(`Antigüedad en el programa: ${yearsInProgram} años (matrícula ${admissionYear}).`);
    if (pendingPreviousSemesters >= 3)
        riskReasons.push(`Materias pendientes de semestres previos: ${pendingPreviousSemesters}.`);

    // ── 10. Status final ──────────────────────────────────────────────────────
    const kardexMappedStatus = mapStatusLabelToStudentStatus(statusLabel);
    const baseStatus =
        kardexMappedStatus && kardexMappedStatus !== 'activo' ? kardexMappedStatus : 'activo';
    const isAtRisk = riskReasons.length > 0;
    const finalStatus: Student['status'] =
        baseStatus === 'activo' && isAtRisk ? 'en_riesgo' : baseStatus;
    const alert = finalStatus === 'en_riesgo' || finalStatus === 'baja' || isAtRisk;

    const gpa = Number.isFinite(detectedGpa as number)
        ? Number((detectedGpa as number).toFixed(2))
        : 0;

    const kardex: StudentKardexSummary = {
        parsedAt: new Date().toISOString(),
        sourceFileName: file.originalname,
        sourcePdfUrl,
        sourceTextUrl: debugTextUrl,
        sourceOcrImageUrl,
        extractionMethod,
        rawTextLength: rawLen,
        ocrTextLength: ocrLen,
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

    return {
        ok: true,
        data: {
        extractedName,
        matricula,
        gpa,
        detectedGpa,
        detectedSemester,
        calculatedSemester,
        cohort,
        matchedModuleIds,
        missingModuleIds,
        riskReasons,
        finalStatus,
        alert,
        kardex,
        sourcePdfUrl,
        debugTextUrl,
        sourceOcrImageUrl,
        extractionMethod,
        rawTextLength: rawLen,
        ocrTextLength: ocrLen,
        },
    };
}
    // Importar base de datos

function parseStudentCsv(text: string): Record<string, any>[] {
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
    
export function parseStudentImport(file: UploadedFile): Student[] {
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
            .map((record) => toStudent(record))
            .filter((record): record is Student => Boolean(record));
    }

    const text = file.buffer.toString('utf-8');

    if (fileName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        const records = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.students)
            ? parsed.students
            : [];
        return records
            .map((record) => toStudent(record))
            .filter((record): record is Student => Boolean(record));
    }

    return parseStudentCsv(text)
        .map((record) => toStudent(record))
        .filter((record): record is Student => Boolean(record));
}