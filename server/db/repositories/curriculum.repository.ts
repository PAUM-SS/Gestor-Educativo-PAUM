import { Database } from "better-sqlite3";
import { Module, PlanningUnit } from "@/shared/types";
import { parseJSON } from "../transforms";

export class CurriculumRepository {
    constructor(private db: Database) {}
    
    getModules(): Module[] {
        return this.db.prepare("SELECT * FROM modules").all().map((row: any) => {
          const sem = isNaN(Number(row.semester)) ? row.semester : Number(row.semester);
          return {
            ...row,
            semester: sem,
            competencies: parseJSON(row.competencies, []),
            planning: parseJSON(row.planning, undefined)
          };
        }) as Module[];
      }

    async addModule(module: Module): Promise<Module | null> {
        const existing = this.db.prepare("SELECT id FROM modules WHERE id = ?").get(module.id);
        if (existing) return null; // ya existe

        this.db.prepare(`
            INSERT INTO modules (id, title, credits, description, competencies, status, semester, level, planning)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            module.id,
            module.title,
            module.credits,
            module.description ?? '',
            JSON.stringify(module.competencies ?? []),
            module.status ?? 'pendiente',
            String(module.semester ?? 1),
            module.level ?? 'Básico',
            null
        );

        return module;
    }

    async updateModule(moduleId: string, updates: Partial<Module>) {
        const row = this.db.prepare("SELECT * FROM modules WHERE id = ?").get(moduleId) as any;
        if (!row) return null;

        const sem = isNaN(Number(row.semester)) ? row.semester : Number(row.semester);
        const current: Module = {
            ...row,
            semester: sem,
            competencies: JSON.parse(row.competencies || "[]"),
            planning: JSON.parse(row.planning || "null")
        };

        const updated = { ...current, ...updates };

        this.db.prepare(`
            UPDATE modules SET title=?, credits=?, description=?, 
            competencies=?, status=?, semester=?, level=?, planning=? WHERE id=?
        `).run(
            updated.title,
            updated.credits,
            updated.description,
            JSON.stringify(updated.competencies),
            updated.status,
            String(updated.semester),
            updated.level,
            updated.planning ? JSON.stringify(updated.planning) : null,
            moduleId
        );

        return updated;
    }

    async updateModulePlanningUnit(moduleId: string, unitId: string, completedSessions: number) {
        const row = this.db.prepare("SELECT * FROM modules WHERE id = ?").get(moduleId) as any;
        if (!row) return null;

        const sem = isNaN(Number(row.semester)) ? row.semester : Number(row.semester);
        const module: Module = { ...row, semester: sem, competencies: JSON.parse(row.competencies || "[]"), planning: JSON.parse(row.planning || "null") };

        if (module.planning) {
            const unit = module.planning.units.find(u => u.id === unitId);
            if (unit) {
                const safeCompletedSessions = Math.max(0, Math.min(unit.sessions, Math.round(Number(completedSessions) || 0)));
                const currentLog = Array.isArray(unit.sessionLog) ? [...unit.sessionLog] : [];
                const normalizedLog = currentLog.slice(0, Math.min(currentLog.length, safeCompletedSessions));
                const today = new Date().toISOString().slice(0, 10);

                while (normalizedLog.length < safeCompletedSessions) {
                    normalizedLog.push(today);
                }

                unit.completedSessions = safeCompletedSessions;
                unit.sessionLog = normalizedLog;

                if (unit.completedSessions >= unit.sessions) {
                    unit.status = 'completado';
                } else if (unit.completedSessions > 0) {
                    unit.status = 'en_progreso';
                } else {
                    unit.status = 'pendiente';
                }

                // Después de actualizar la unidad, revisar si todas están completadas
                const allUnitsCompleted = module.planning.units.every(u => u.status === 'completado');
                const anyInProgress = module.planning.units.some(u => u.status === 'en_progreso' || u.completedSessions > 0);

                const newModuleStatus = allUnitsCompleted ? 'completado' : anyInProgress ? 'en_curso' : 'pendiente';

                // Actualizar el status del módulo junto con la planeación
                this.db.prepare("UPDATE modules SET planning=?, status=? WHERE id=?")
                    .run(JSON.stringify(module.planning), newModuleStatus, moduleId);

                return unit;
            }   
        }
        return null;
    } 

    async updateModuleDocument(
        moduleId: string,
        type: 'syllabus' | 'planning',
        fileUrl: string,
        fileName: string
    ) {
        const row = this.db.prepare("SELECT * FROM modules WHERE id = ?").get(moduleId) as any;
        if (!row) return null;

        if (type === 'syllabus') {
            this.db.prepare("UPDATE modules SET syllabusUrl=?, syllabusFileName=? WHERE id=?").run(fileUrl, fileName, moduleId);
        } else {
            this.db.prepare("UPDATE modules SET didacticPlanningUrl=?, didacticPlanningFileName=? WHERE id=?").run(fileUrl, fileName, moduleId);
        }

        const updatedRow = this.db.prepare("SELECT * FROM modules WHERE id = ?").get(moduleId) as any;
        const sem = isNaN(Number(updatedRow.semester)) ? updatedRow.semester : Number(updatedRow.semester);

        return { 
            ...updatedRow, 
            semester: sem, 
            competencies: JSON.parse(updatedRow.competencies || "[]"), 
            planning: JSON.parse(updatedRow.planning || "null") 
        } as Module;
    }

    async importCurriculum(rows: { code: string; title: string; credits: number; semester: number | string; level: Module['level'] }[]) {
        let created = 0;
        let updated = 0;
    
        const tx = this.db.transaction(() => {
            for (const row of rows) {
                const existing = this.db.prepare("SELECT id FROM modules WHERE code = ?").get(row.code) as { id: string } | undefined;
        
                if (!existing) {
                    const id = row.code;
                    this.db.prepare(`
                        INSERT INTO modules (id, title, code, credits, description, instructor, competencies, status, semester, level)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(id, row.title, row.code, row.credits, '', 'Sin asignar', '[]', 'pendiente', String(row.semester), row.level);
                    
                    created += 1;
                } else {
                    this.db.prepare(`
                        UPDATE modules SET title=?, credits=?, semester=?, level=? WHERE id=?
                    `).run(row.title, row.credits, String(row.semester), row.level, existing.id);

                    updated += 1;
                }
            }
        });
        tx();
    
        const total = (this.db.prepare("SELECT count(*) as count FROM modules").get() as any).count;
        return { created, updated, total, modules: this.getModules() };
    }

}