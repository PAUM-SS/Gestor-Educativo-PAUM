import { Database } from "better-sqlite3";
import { FacultyMember } from "@/src/types";
import { parseJSON, normalizeFacultyMember } from "../transforms";

export class FacultyRepository {
    constructor(private db: Database) {}

    getFaculty(): FacultyMember[] {
        return this.db.prepare("SELECT * FROM faculty ORDER BY id DESC").all().map((row: any) => ({
            ...row,
            compliance: parseJSON(row.compliance, {}),
            weeklySchedule: parseJSON(row.weeklySchedule, []),
            permissions: parseJSON(row.permissions, [])
        })) as FacultyMember[];
      }

    async addFaculty(facultyMember: FacultyMember) {
        const existing = this.db.prepare("SELECT id FROM faculty WHERE id = ?").get(facultyMember.id);
        if (existing) return null;

        const f = normalizeFacultyMember(facultyMember);
        this.db.prepare(`
            INSERT INTO faculty 
            (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, email, phone, photo, weeklySchedule, permissions) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(f.id, f.name, f.category, f.level, f.dedication, f.seniority, f.hireDate, JSON.stringify(f.compliance || {}), f.adscription, f.email, f.phone, f.photo, JSON.stringify(f.weeklySchedule || []), JSON.stringify(f.permissions || []));

        return f;
    }

    async updateFaculty(id: string, updates: Partial<FacultyMember>) {
        const row = this.db.prepare("SELECT * FROM faculty WHERE id = ?").get(id) as any;
        if (!row) return null;

        const faculty: FacultyMember = { ...row, compliance: JSON.parse(row.compliance || "{}"), weeklySchedule: JSON.parse(row.weeklySchedule || "[]"), permissions: JSON.parse(row.permissions || "[]") };
        const updated = normalizeFacultyMember({ ...faculty, ...updates });

        const tx = this.db.transaction(() => {
            this.db.prepare(`
                UPDATE faculty SET 
                name=?, category=?, level=?, dedication=?, seniority=?, hireDate=?, compliance=?, adscription=?, email=?, phone=?, photo=?, weeklySchedule=?, permissions=? 
                WHERE id=?
            `).run(updated.name, updated.category, updated.level, updated.dedication, updated.seniority, updated.hireDate, JSON.stringify(updated.compliance), updated.adscription, updated.email, updated.phone, updated.photo, JSON.stringify(updated.weeklySchedule), JSON.stringify(updated.permissions), id);
        });
        tx();
        return updated;
    }

    async deleteFaculty(id: string) {
        const existing = this.db.prepare("SELECT name FROM faculty WHERE id = ?").get(id) as { name: string } | undefined;
        if (!existing) return false;

        const tx = this.db.transaction(() => {
            // Actualizar referencias ANTES de eliminar para respetar llaves foráneas
            this.db.prepare("UPDATE sections SET facultyId=NULL WHERE facultyId=?").run(id);
            this.db.prepare("DELETE FROM faculty WHERE id = ?").run(id);
        });
        tx();
        return true;
    }

    async importFaculty(facultyMembers: FacultyMember[]) {
        let created = 0;
        let updated = 0;

        const tx = this.db.transaction(() => {
        for (const rawMember of facultyMembers) {
            const normalizedMember = normalizeFacultyMember(rawMember);
            const existing = this.db.prepare("SELECT name FROM faculty WHERE id = ?").get(normalizedMember.id) as { name: string } | undefined;

            if (!existing) {
                this.db.prepare(`
                    INSERT INTO faculty (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, email, phone, photo, weeklySchedule, permissions) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(normalizedMember.id, normalizedMember.name, normalizedMember.category, normalizedMember.level, normalizedMember.dedication, normalizedMember.seniority, normalizedMember.hireDate, JSON.stringify(normalizedMember.compliance || {}), normalizedMember.adscription, normalizedMember.email, normalizedMember.phone, normalizedMember.photo, JSON.stringify(normalizedMember.weeklySchedule || []), JSON.stringify(normalizedMember.permissions || []));
                created += 1;
            } else {
                const f = normalizedMember;
                this.db.prepare(`
                    UPDATE faculty SET 
                    name=?, category=?, level=?, dedication=?, seniority=?, hireDate=?, compliance=?, adscription=?, email=?, phone=?, photo=?, weeklySchedule=?, permissions=? 
                    WHERE id=?
                `).run(f.name, f.category, f.level, f.dedication, f.seniority, f.hireDate, JSON.stringify(f.compliance || {}), f.adscription, f.email, f.phone, f.photo, JSON.stringify(f.weeklySchedule || []), JSON.stringify(f.permissions || []), f.id);
                
                updated += 1;
            }
        }
        });
        tx();

        const total = (this.db.prepare("SELECT count(*) as count FROM faculty").get() as any).count;
        const faculty = this.db.prepare("SELECT * FROM faculty ORDER BY id DESC").all().map((row: any) => ({
            ...row,
            compliance: JSON.parse(row.compliance || "{}"),
            weeklySchedule: JSON.parse(row.weeklySchedule || "[]"),
            permissions: JSON.parse(row.permissions || "[]")
        })) as FacultyMember[];

        return { created, updated, total, faculty };
    }
}