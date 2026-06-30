import { Database } from "better-sqlite3";
import { AcademicEvent, ManualTask } from "@/src/types";

export class CalendarRepository {
    constructor(private db: Database) {}
    
    // Obtener todos los eventos, con filtro opcional por rango de fechas
    getCalendarEvents(from?: string, to?: string): AcademicEvent[] {
        if (from && to) {
        return this.db
            .prepare("SELECT * FROM calendar_events WHERE date >= ? AND date <= ? ORDER BY date ASC")
            .all(from, to) as AcademicEvent[];
        }
        return this.db
            .prepare("SELECT * FROM calendar_events ORDER BY date ASC")
            .all() as AcademicEvent[];
    }

    // Reemplazar todos los eventos BUAP (type != 'minuta') con los nuevos del upload
    upsertBuapEvents(events: Omit<AcademicEvent, 'id'>[]): AcademicEvent[] {
        const tx = this.db.transaction(() => {
            // Borrar todos los eventos BUAP existentes (no tocar minutas)
            this.db.prepare("DELETE FROM calendar_events WHERE type != 'minuta'").run();

            const insert = this.db.prepare(`
                INSERT INTO calendar_events 
                (id, date, title, type, sourceId, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const inserted: AcademicEvent[] = [];
            for (const e of events) {
                const id = `buap-${e.date}-${e.type}-${Math.random().toString(36).slice(2, 7)}`;
                insert.run(id, e.date, e.title, e.type, e.sourceId ?? null, e.description ?? null);
                inserted.push({ id, ...e });
            }
            return inserted;
        });

        return tx();
    }

    // Agregar un evento de tipo 'minuta' cuando se crea una tarea con dueDate
    addMinutaEvent(task: { id: string; description: string; dueDate: string }, minuteId: string): AcademicEvent {
        const id = `minuta-${task.id}`;

        // Upsert: si ya existe por sourceId lo actualiza, si no lo crea
        const existing = this.db
            .prepare("SELECT id FROM calendar_events WHERE sourceId = ?")
            .get(task.id) as { id: string } | undefined;

        if (existing) {
            this.db.prepare(`
                UPDATE calendar_events SET date=?, title=?, description=? WHERE id=?
            `).run(task.dueDate, `Tarea: ${task.description}`, `Minuta ${minuteId}`, existing.id);
            return {
                id: existing.id,
                date: task.dueDate,
                title: `Tarea: ${task.description}`,
                type: 'minuta',
                sourceId: task.id,
                description: `Minuta ${minuteId}`,
            };
        }

        this.db.prepare(`
            INSERT INTO calendar_events (id, date, title, type, sourceId, description)
            VALUES (?, ?, ?, 'minuta', ?, ?)
        `).run(id, task.dueDate, `Tarea: ${task.description}`, task.id, `Minuta ${minuteId}`);

        return {
            id,
            date: task.dueDate,
            title: `Tarea: ${task.description}`,
            type: 'minuta',
            sourceId: task.id,
            description: `Minuta ${minuteId}`,
        };
    }

    // Eliminar el evento de minuta cuando la tarea se marca como realizada
    removeMinutaEvent(taskId: string): boolean {
        const result = this.db
            .prepare("DELETE FROM calendar_events WHERE sourceId = ?")
            .run(taskId);
        return result.changes > 0;
    }
}