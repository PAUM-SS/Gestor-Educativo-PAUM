import { Database } from "better-sqlite3";
import { AcademicSection, AcademicSectionWithNames, SectionDailyRecord } from "@/src/types";
import { parseJSON, normalizeSection, normalizeSectionDailyRecord, normalizeScheduleDay } from "../transforms";

export class ScheduleRepository {
    constructor(private db: Database) {}
    
    getSections(): AcademicSectionWithNames[] {
        return this.db.prepare(`
            SELECT
                s.id,
                s.moduleId,
                s.facultyId,
                s.capacity,
                s.enrolled,
                s.schedule,
                COALESCE(m.title, s.moduleId, 'Módulo desconocido') AS moduleName,
                COALESCE(f.name, 'Sin asignar')                     AS facultyName
            FROM sections s
            LEFT JOIN modules m ON m.id = s.moduleId
            LEFT JOIN faculty f ON f.id = s.facultyId
            ORDER BY s.id ASC
        `).all().map((row: any) => ({
            id: row.id,
            moduleId: row.moduleId ?? '',
            facultyId: row.facultyId ?? '',
            capacity: row.capacity ?? 0,
            enrolled: row.enrolled ?? 0,
            schedule: parseJSON(row.schedule, []),
            moduleName: row.moduleName,
            facultyName: row.facultyName,
        })) as AcademicSectionWithNames[];
    }

    getExportSections(): any[] {
        const rows = this.db.prepare(`
            SELECT 
                s.id as nrc,
                m.semester as semester,
                s.moduleId as code,
                m.title as moduleName,
                s.capacity as capacity,
                s.enrolled as enrolled,
                s.schedule as schedule,
                s.facultyId as facultyId,
                f.name as facultyName,
                s.comments as comments,
                s.adjustment as adjustment
            FROM sections s
            LEFT JOIN modules m ON s.moduleId = m.id
            LEFT JOIN faculty f ON s.facultyId = f.id
            ORDER BY s.id ASC
        `).all() as any[];

        const daysMap: Record<string, string> = {
            'Lunes': 'Lun', 'Martes': 'Mar', 'Miércoles': 'Mie', 'Jueves': 'Jue', 'Viernes': 'Vie', 'Sábado': 'Sab'
        };

        return rows.map((row, index) => {
            const scheduleCols: Record<string, string> = { Lun: '', Mar: '', Mie: '', Jue: '', Vie: '', Sab: '' };
            let globalRoom = '';

            const parsedSchedule = parseJSON(row.schedule, []);
            parsedSchedule.forEach((slot: any) => {
                const shortDay = daysMap[slot.day];
                if (shortDay) {
                    scheduleCols[shortDay] = `${slot.start}-${slot.end}`;
                }
                if (slot.room && !globalRoom) {
                    globalRoom = slot.room;
                }
            });

            return {
                'No.': index + 1,
                'NRC': row.nrc,
                'Semestre': row.semester || '',
                'Código': row.code,
                'Asignatura': row.moduleName || '',
                'Cupo': row.capacity,
                'Inscritos': row.enrolled,
                'Lun': scheduleCols.Lun,
                'Mar': scheduleCols.Mar,
                'Mie': scheduleCols.Mie,
                'Jue': scheduleCols.Jue,
                'Vie': scheduleCols.Vie,
                'Sab': scheduleCols.Sab,
                'Edif-Salón': globalRoom,
                'ID-Docente': row.facultyId || '',
                'Docente': row.facultyName || 'Sin asignar',
                'Comentarios': row.comments || '',
                'Ajuste': row.adjustment || ''
            };
        });
    }

    getSectionDailyRecords(): SectionDailyRecord[] {
        return this.db.prepare("SELECT * FROM section_daily_records ORDER BY date DESC").all().map((row: any) => ({
            ...row,
            facultyPresent: Boolean(row.facultyPresent),
            signature: Boolean(row.signature),
            absentStudentIds: parseJSON(row.absentStudentIds, [])
        })) as SectionDailyRecord[];
    }

    async addSection(academicSection: AcademicSection) {
        const existing = this.db.prepare("SELECT id FROM sections WHERE id = ?").get(academicSection.id);
        if (existing) return null;
    
        const s = normalizeSection(academicSection);
        this.db.prepare(`
            INSERT INTO sections 
            (id, moduleId, facultyId, capacity, enrolled, schedule, comments, adjustment) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(s.id, s.moduleId, s.facultyId || null, s.capacity, s.enrolled, JSON.stringify(s.schedule), s.comments ?? null, s.adjustment ?? null);
    
        return s;
    }
    
    async updateSection(id: string, updates: Partial<AcademicSection>) {
        const row = this.db.prepare("SELECT * FROM sections WHERE id = ?").get(id) as any;
        if (!row) return null;

        const section: AcademicSection = { ...row, schedule: JSON.parse(row.schedule || "[]") };
        const normalizedUpdates = updates.schedule ? {
            ...updates,
            schedule: updates.schedule.map((slot) => ({
                ...slot,
                day: normalizeScheduleDay(slot.day),
            })),
        } : updates;
        const updated = normalizeSection({ ...section, ...normalizedUpdates });

        this.db.prepare(`
            UPDATE sections SET 
            moduleId=?, facultyId=?, capacity=?, enrolled=?, schedule=?, comments=?, adjustment=? 
            WHERE id=?
        `).run(updated.moduleId, updated.facultyId || null, updated.capacity, updated.enrolled, JSON.stringify(updated.schedule), updated.comments ?? null, updated.adjustment ?? null, id);

        return updated;
    }
    
    async deleteSection(id: string) {
        const existing = this.db.prepare("SELECT id FROM sections WHERE id = ?").get(id) as { id: string } | undefined;
        if (!existing) return false;
    
        const tx = this.db.transaction(() => {
            // Actualizar referencias ANTES de eliminar para respetar llaves foráneas
            this.db.prepare("DELETE FROM sections WHERE id = ?").run(id);
        });
        tx();

        return true;
    }
    
    async importSections(sections: AcademicSection[]) {
        let created = 0;
        let updated = 0;

        const tx = this.db.transaction(() => {
            for (const rawSection of sections) {
                const normalizedSection = normalizeSection(rawSection);

                let validFacultyId = normalizedSection.facultyId || null;
                if (validFacultyId) {
                    const facultyExists = this.db.prepare("SELECT id FROM faculty WHERE id = ?").get(validFacultyId);
                    if (!facultyExists) validFacultyId = null;
                }

                const validModuleId = normalizedSection.moduleId;
                const moduleExists = this.db.prepare("SELECT id FROM modules WHERE id = ?").get(validModuleId);
                if (!moduleExists) {
                    this.db.prepare(`
                        INSERT INTO modules 
                        (id, title, credits, description, status, level) 
                        VALUES (?, ?, 0, '', 'pendiente', 'Básico')
                    `).run(validModuleId, validModuleId);
                }

                const existing = this.db.prepare("SELECT id FROM sections WHERE id = ?").get(normalizedSection.id) as { id: string } | undefined;

                if (!existing) {
                    this.db.prepare(`
                        INSERT INTO sections 
                        (id, moduleId, facultyId, capacity, enrolled, schedule, comments, adjustment) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(normalizedSection.id, validModuleId, validFacultyId, normalizedSection.capacity, normalizedSection.enrolled, JSON.stringify(normalizedSection.schedule), normalizedSection.comments ?? null, normalizedSection.adjustment ?? null);
                    created += 1;
                } else {
                    this.db.prepare(`
                        UPDATE sections SET 
                        moduleId=?, facultyId=?, capacity=?, enrolled=?, schedule=?, comments=?, adjustment=? 
                        WHERE id=?
                    `).run(validModuleId, validFacultyId, normalizedSection.capacity, normalizedSection.enrolled, JSON.stringify(normalizedSection.schedule), normalizedSection.comments ?? null, normalizedSection.adjustment ?? null, normalizedSection.id);
                    updated += 1;
                }
            }
        });
        tx();

        const total = (this.db.prepare("SELECT count(*) as count FROM sections").get() as any).count;
        const allSections = this.db.prepare("SELECT * FROM sections ORDER BY id DESC").all().map((row: any) => ({
            ...row,
            schedule: JSON.parse(row.schedule || "[]")
        })) as AcademicSection[];

        return { created, updated, total, sections: allSections };
    }
    
    getSectionStudents(sectionId: string): string[] {
        const rows = this.db.prepare("SELECT studentId FROM section_enrollments WHERE sectionId = ?").all(sectionId) as any[];
        return rows.map(r => r.studentId);
    }
    
    async addEnrollment(studentId: string, sectionId: string) {
        const existing = this.db.prepare("SELECT studentId FROM section_enrollments WHERE studentId = ? AND sectionId = ?").get(studentId, sectionId);
        if (existing) return false;
    
        const tx = this.db.transaction(() => {
            this.db.prepare("INSERT INTO section_enrollments (studentId, sectionId, enrolledAt) VALUES (?, ?, ?)").run(studentId, sectionId, new Date().toISOString());
            this.db.prepare("UPDATE sections SET enrolled = enrolled + 1 WHERE id = ?").run(sectionId);
        });
        tx();

        return true;
    }
    
    async removeEnrollment(studentId: string, sectionId: string) {
        let changed = false;
        const tx = this.db.transaction(() => {
            const res = this.db.prepare("DELETE FROM section_enrollments WHERE studentId = ? AND sectionId = ?").run(studentId, sectionId);
            if (res.changes > 0) {
                this.db.prepare("UPDATE sections SET enrolled = CASE WHEN enrolled > 0 THEN enrolled - 1 ELSE 0 END WHERE id = ?").run(sectionId);
            }
            changed = res.changes > 0;
        });
        tx();

        return changed;
    }

    async upsertSectionDailyRecord(
        sectionId: string,
        date: string,
        updates: Partial<Omit<SectionDailyRecord, 'id' | 'sectionId' | 'date' | 'updatedAt'>>
    ) {
        const recordId = `${sectionId}:${date}`;
        const row = this.db.prepare("SELECT * FROM section_daily_records WHERE id = ?").get(recordId) as any;
    
        const baseRecord: SectionDailyRecord = row ? { ...row, facultyPresent: Boolean(row.facultyPresent), signature: Boolean(row.signature), absentStudentIds: JSON.parse(row.absentStudentIds || "[]") } : {
            id: recordId,
            sectionId,
            date,
            facultyPresent: true,
            absentStudentIds: [],
            signature: false,
            updatedAt: new Date().toISOString(),
        };
    
        const nextRecord = normalizeSectionDailyRecord({
            ...baseRecord,
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    
        if (row) {
            this.db.prepare(`UPDATE section_daily_records SET facultyPresent=?, absentStudentIds=?, justification=?, justificationType=?, topic=?, signature=?, updatedAt=? WHERE id=?`).run(nextRecord.facultyPresent ? 1 : 0, JSON.stringify(nextRecord.absentStudentIds), nextRecord.justification, nextRecord.justificationType, nextRecord.topic, nextRecord.signature ? 1 : 0, nextRecord.updatedAt, recordId);
        } else {
            this.db.prepare(`INSERT INTO section_daily_records (id, sectionId, date, facultyPresent, absentStudentIds, justification, justificationType, topic, signature, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(nextRecord.id, nextRecord.sectionId, nextRecord.date, nextRecord.facultyPresent ? 1 : 0, JSON.stringify(nextRecord.absentStudentIds), nextRecord.justification, nextRecord.justificationType, nextRecord.topic, nextRecord.signature ? 1 : 0, nextRecord.updatedAt);
        }
        return nextRecord;
    }
}