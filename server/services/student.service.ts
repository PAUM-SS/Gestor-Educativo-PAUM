import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { parseDecimal, clampNumber, normalizeKey } from './utils.ts';
import { Student } from '@/shared/types.ts';

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

export async function ocrImageWithWindows(imagePath: string, language = 'es-ES') {
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

// ─── Extractores de texto del Kardex ──────────

export function extractEnrollmentId(text: string) {
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

export function extractSemester(text: string) {
    const match =
        text.match(/\bsemestre\s*(?:actual|oficial)?\s*[:=]?\s*([1-9]|1[0-2])\b/i) ||
        text.match(/\b(?:nivel|periodo)\s*[:=]?\s*(?:sem)?\s*([1-9]|1[0-2])\b/i);
    if (!match?.[1]) return undefined;

    return Number.parseInt(match[1], 10);
}

export function extractGpa(text: string) {
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

export function extractStudentStatusLabel(text: string) {
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

export function extractProgressPercent(text: string) {
    const match = text.match(/\bporcen(?:taje|ta)\s*[:=]?\s*(\d{1,3})\s*%/i);
    if (!match?.[1]) return undefined;

    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value)) return undefined;

    return clampNumber(value, 0, 100);
}

export function extractStudentName(text: string) {
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

export function mapStatusLabelToStudentStatus(label?: string): Student['status'] | undefined {
    const normalized = normalizeKey(label || '');
    if (!normalized) return undefined;
    if (normalized.includes('baja')) return 'baja';
    if (normalized.includes('titulado') || normalized.includes('egresado')) return 'egresado';
    if (normalized.includes('inactivo')) return 'baja';
    if (normalized.includes('activo')) return 'activo';
    
    return undefined;
}