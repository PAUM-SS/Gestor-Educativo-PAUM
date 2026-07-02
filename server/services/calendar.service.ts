import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { AcademicEvent } from '@/shared/types.ts';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const VALID_EVENT_TYPES = ['clase', 'ins', 'fin', 'susp', 'vac', 'gest', 'buap'] as const;

// ── Parser JSON ───────────────────────────────────────────────────────────────

export function parseCalendarJson(
    buffer: Buffer
): { events: Omit<AcademicEvent, 'id'>[]; error?: string } {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    const events = Array.isArray(parsed) ? parsed : parsed.events;

    if (!Array.isArray(events)) {
        return {
        events: [],
        error: 'El JSON debe ser un array de eventos o tener una propiedad "events".',
        };
    }

    const validEvents: Omit<AcademicEvent, 'id'>[] = events
        .filter((e: any) => e.date && e.title && VALID_EVENT_TYPES.includes(e.type))
        .map((e: any) => ({
            date: String(e.date),
            title: String(e.title),
            type: e.type as AcademicEvent['type'],
            description: e.description ? String(e.description) : undefined,
        }));

    if (validEvents.length === 0) {
        return {
            events: [],
            error: 'El JSON no contiene eventos válidos. Verifica el formato.',
        };
    }

    return { events: validEvents };
}

// ── Parser PDF con Gemini ─────────────────────────────────────────────────────

export async function parseCalendarPdf(
    buffer: Buffer
): Promise<{ events: Omit<AcademicEvent, 'id'>[]; error?: string }> {
    // 1. Extraer texto del PDF
    const parser = new PDFParse({ data: buffer });
    const parsedText = await parser.getText();
    const pdfText = String(parsedText?.text || '').replace(/\u0000/g, '').trim();

    if (!pdfText || pdfText.length < 50) {
        return {
            events: [],
            error: 'No se pudo extraer texto del PDF. Verifica que no sea una imagen escaneada.',
        };
    }

    // 2. Llamar a Gemini
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

    const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const geminiText = response.text?.trim() ?? '';
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
        return {
            events: [],
            error: 'La IA no pudo estructurar los eventos del PDF. Intenta subir un JSON manualmente.',
        };
    }

    const validEvents: Omit<AcademicEvent, 'id'>[] = parsed
        .filter((e: any) => e.date && e.title && VALID_EVENT_TYPES.includes(e.type))
        .map((e: any) => ({
            date: String(e.date),
            title: String(e.title),
            type: e.type as AcademicEvent['type'],
            description: e.description ? String(e.description) : undefined,
        }));

    if (validEvents.length === 0) {
        return {
            events: [],
            error: 'Gemini no encontró eventos reconocibles en el PDF.',
        };
    }

    return { events: validEvents };
}