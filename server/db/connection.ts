import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// import { db } from '.index';
import { DB_SCHEMA } from './schema.ts'
import { seedDatabase } from './seed.ts'

import {
  Student,
  Module,
  AcademicMinute,
  FacultyMember,
  AcademicSection,
  ClassSchedule,
  ManualTask,
  Rotation,
  Activity,
  ClinicalField,
  SectionDailyRecord,
  AcademicEvent,
  AcademicSectionWithNames
} from '../../shared/types.ts';

const NORMALIZED_DAYS: Record<string, ClassSchedule['day']> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Mi\u00E9rcoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'S\u00E1bado',
};

function normalizeScheduleDay(day: string): ClassSchedule['day'] {
  const normalizedKey = day
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return NORMALIZED_DAYS[normalizedKey] ?? (day as ClassSchedule['day']);
}

function normalizeSection(section: AcademicSection): AcademicSection {
  return {
    ...section,
    schedule: section.schedule.map((slot) => ({
      ...slot,
      day: normalizeScheduleDay(slot.day),
    })),
  };
}

function normalizeSectionDailyRecord(record: SectionDailyRecord): SectionDailyRecord {
  return {
    ...record,
    absentStudentIds: Array.isArray(record.absentStudentIds)
      ? Array.from(new Set(record.absentStudentIds))
      : [],
    facultyPresent: record.facultyPresent !== false,
    topic: record.topic?.trim() || undefined,
    justification: record.justification?.trim() || undefined,
    justificationType: record.justificationType?.trim() || undefined,
    signature: Boolean(record.signature),
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

const DEFAULT_FACULTY_COMPLIANCE: FacultyMember['compliance'] = {
  cedula: false,
  medicalExam: false,
  inductionCourse: false,
  annualEvaluation: 0,
};

function normalizeHireDate(hireDate?: string) {
  if (!hireDate) return undefined;
  const parsed = new Date(hireDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function calculateSeniority(hireDate?: string, fallback = 0) {
  const normalizedHireDate = normalizeHireDate(hireDate);

  if (!normalizedHireDate) {
    return Math.max(0, Math.round(Number(fallback) || 0));
  }

  const today = new Date();
  const start = new Date(normalizedHireDate);
  let years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) {
    years -= 1;
  }

  return Math.max(0, years);
}

export function normalizeFacultyMember(member: FacultyMember): FacultyMember {
  const hireDate = normalizeHireDate(member.hireDate);

  return {
    ...member,
    seniority: calculateSeniority(hireDate, member.seniority),
    hireDate,
    adscription: member.adscription?.trim() || 'Facultad de Medicina',
    email: member.email?.trim() || undefined,
    phone: member.phone?.trim() || undefined,
    compliance: {
      ...DEFAULT_FACULTY_COMPLIANCE,
      ...member.compliance,
      annualEvaluation: Math.min(100, Math.max(0, Math.round(Number(member.compliance?.annualEvaluation) || 0))),
    },
    weeklySchedule: Array.isArray(member.weeklySchedule) ? member.weeklySchedule : [],
    permissions: Array.isArray(member.permissions) ? member.permissions : [],
  };
}

export class SqliteDatabase {
  private dbPath: string;
  private dataDir: string;
  private db!: Database.Database;

  constructor() {
    const oneDrivePath = process.env.OneDriveCommercial || process.env.OneDrive;
    const userHome = os.homedir();

    const baseDir = oneDrivePath
      ? oneDrivePath
      : (existsSync(path.join(userHome, 'Documents'))
        ? path.join(userHome, 'Documents')
        : userHome);

    const dataDir = path.join(baseDir, 'PAUM_BaseDeDatos');

    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    this.dataDir = dataDir;
    this.dbPath = path.join(dataDir, 'database.sqlite');
  }

  async init() {
    try {
      this.db = new Database(this.dbPath);
    } catch (error) {
      console.error('[Base de datos] No se pudo abrir el archivo SQLite: ', error);
      this.db = new Database(':memory:');
    }
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(
      DB_SCHEMA
    );

    // Siembra de datos iniciales
    seedDatabase(this.db);

    console.log(`[Base de Datos] SQLite Lista en: ${this.dbPath}`);
  }

  private parseJSON(str: any, fallback: any) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  }

  getStudents(): Student[] {
    return this.db.prepare("SELECT * FROM students ORDER BY id DESC").all().map((row: any) => ({
      ...row,
      alert: Boolean(row.alert),
      kardex: this.parseJSON(row.kardex, undefined)
    })) as Student[];
  }

  getModules(): Module[] {
    return this.db.prepare("SELECT * FROM modules").all().map((row: any) => {
      const sem = isNaN(Number(row.semester)) ? row.semester : Number(row.semester);
      return {
        ...row,
        semester: sem,
        competencies: this.parseJSON(row.competencies, []),
        planning: this.parseJSON(row.planning, undefined)
      };
    }) as Module[];
  }

  getMinutes(): AcademicMinute[] {
    return this.db.prepare("SELECT * FROM minutes ORDER BY date DESC").all().map((row: any) => ({
      ...row,
      tasks: this.parseJSON(row.tasks, []),
      fullData: this.parseJSON(row.fullData, undefined)
    })) as AcademicMinute[];
  }

  getFaculty(): FacultyMember[] {
    return this.db.prepare("SELECT * FROM faculty ORDER BY id DESC").all().map((row: any) => ({
      ...row,
      compliance: this.parseJSON(row.compliance, {}),
      weeklySchedule: this.parseJSON(row.weeklySchedule, []),
      permissions: this.parseJSON(row.permissions, [])
    })) as FacultyMember[];
  }

  getClinicalFields(): ClinicalField[] {
    return this.db.prepare("SELECT * FROM clinical_fields ORDER BY id DESC").all() as ClinicalField[];
  }

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
      schedule: this.parseJSON(row.schedule, []),
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

      const parsedSchedule = this.parseJSON(row.schedule, []);
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
      absentStudentIds: this.parseJSON(row.absentStudentIds, [])
    })) as SectionDailyRecord[];
  }

  getRotations(): Rotation[] {
    return this.db.prepare("SELECT * FROM rotations").all() as Rotation[];
  }

  getActivities(): Activity[] {
    return this.db.prepare("SELECT * FROM activities").all() as Activity[];
  }

  getUploadsDir() {
    return path.join(this.dataDir, 'uploads');
  }

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

  // --- Helpers Específicos ---

  async updateStudent(id: string, updates: Partial<Student>) {
    const row = this.db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
    if (!row) return null;

    const kardex = row.kardex ? JSON.parse(row.kardex) : undefined;
    const student: Student = { ...row, alert: Boolean(row.alert), kardex };
    const updated = { ...student, ...updates };

    const stmt = this.db.prepare(`UPDATE students SET name=?, enrollmentId=?, semester=?, status=?, gpa=?, attendance=?, email=?, cohort=?, tutor=?, alert=?, kardex=? WHERE id=?`);
    stmt.run(updated.name, updated.enrollmentId, updated.semester, updated.status, updated.gpa, updated.attendance, updated.email, updated.cohort, updated.tutor, updated.alert ? 1 : 0, updated.kardex ? JSON.stringify(updated.kardex) : null, id);

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
    return { ...updatedRow, semester: sem, competencies: JSON.parse(updatedRow.competencies || "[]"), planning: JSON.parse(updatedRow.planning || "null") } as Module;
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

  async updateFaculty(id: string, updates: Partial<FacultyMember>) {
    const row = this.db.prepare("SELECT * FROM faculty WHERE id = ?").get(id) as any;
    if (!row) return null;

    const faculty: FacultyMember = { ...row, compliance: JSON.parse(row.compliance || "{}"), weeklySchedule: JSON.parse(row.weeklySchedule || "[]"), permissions: JSON.parse(row.permissions || "[]") };
    const updated = normalizeFacultyMember({ ...faculty, ...updates });

    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE faculty SET name=?, category=?, level=?, dedication=?, seniority=?, hireDate=?, compliance=?, adscription=?, email=?, phone=?, photo=?, weeklySchedule=?, permissions=? WHERE id=?`).run(updated.name, updated.category, updated.level, updated.dedication, updated.seniority, updated.hireDate, JSON.stringify(updated.compliance), updated.adscription, updated.email, updated.phone, updated.photo, JSON.stringify(updated.weeklySchedule), JSON.stringify(updated.permissions), id);
    });
    tx();
    return updated;
  }

  async addFaculty(facultyMember: FacultyMember) {
    const existing = this.db.prepare("SELECT id FROM faculty WHERE id = ?").get(facultyMember.id);
    if (existing) return null;

    const f = normalizeFacultyMember(facultyMember);
    this.db.prepare(`INSERT INTO faculty (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, email, phone, photo, weeklySchedule, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(f.id, f.name, f.category, f.level, f.dedication, f.seniority, f.hireDate, JSON.stringify(f.compliance || {}), f.adscription, f.email, f.phone, f.photo, JSON.stringify(f.weeklySchedule || []), JSON.stringify(f.permissions || []));

    return f;
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
          this.db.prepare(`INSERT INTO faculty (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, email, phone, photo, weeklySchedule, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(normalizedMember.id, normalizedMember.name, normalizedMember.category, normalizedMember.level, normalizedMember.dedication, normalizedMember.seniority, normalizedMember.hireDate, JSON.stringify(normalizedMember.compliance || {}), normalizedMember.adscription, normalizedMember.email, normalizedMember.phone, normalizedMember.photo, JSON.stringify(normalizedMember.weeklySchedule || []), JSON.stringify(normalizedMember.permissions || []));
          created += 1;
        } else {
          const f = normalizedMember;
          this.db.prepare(`UPDATE faculty SET name=?, category=?, level=?, dedication=?, seniority=?, hireDate=?, compliance=?, adscription=?, email=?, phone=?, photo=?, weeklySchedule=?, permissions=? WHERE id=?`).run(f.name, f.category, f.level, f.dedication, f.seniority, f.hireDate, JSON.stringify(f.compliance || {}), f.adscription, f.email, f.phone, f.photo, JSON.stringify(f.weeklySchedule || []), JSON.stringify(f.permissions || []), f.id);
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

  async addStudent(student: Student) {
    const existing = this.db.prepare("SELECT id FROM students WHERE id = ?").get(student.id);
    if (existing) return null;
    this.db.prepare(`INSERT INTO students (id, name, enrollmentId, semester, status, gpa, attendance, email, cohort, tutor, alert, kardex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(student.id, student.name, student.enrollmentId, student.semester, student.status, student.gpa, student.attendance, student.email, student.cohort, student.tutor, student.alert ? 1 : 0, student.kardex ? JSON.stringify(student.kardex) : null);
    return student;
  }

  async deleteStudent(id: string) {
    const tx = this.db.transaction(() => {
      // Eliminar rotaciones asociadas antes de borrar el alumno (integridad referencial)
      this.db.prepare("DELETE FROM rotations WHERE studentId = ?").run(id);
      const res = this.db.prepare("DELETE FROM students WHERE id = ?").run(id);
      return res.changes > 0;
    });
    return tx();
  }

  async addSection(academicSection: AcademicSection) {
    const existing = this.db.prepare("SELECT id FROM sections WHERE id = ?").get(academicSection.id);
    if (existing) return null;

    const s = normalizeSection(academicSection);
    this.db.prepare(`INSERT INTO sections (id, moduleId, facultyId, capacity, enrolled, schedule, comments, adjustment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(s.id, s.moduleId, s.facultyId || null, s.capacity, s.enrolled, JSON.stringify(s.schedule), s.comments ?? null, s.adjustment ?? null);

    return s;
  }

  async updateSection(id: string, updates: Partial<AcademicSection>) {
    const row = this.db.prepare("SELECT * FROM sections WHERE id = ?").get(id) as any;
    if (!row) return null;

    const section: AcademicSection = { ...row, schedule: JSON.parse(row.schedule || "[]") };
    const normalizedUpdates = updates.schedule
      ? {
        ...updates,
        schedule: updates.schedule.map((slot) => ({
          ...slot,
          day: normalizeScheduleDay(slot.day),
        })),
      }
      : updates;
    const updated = normalizeSection({ ...section, ...normalizedUpdates });

    this.db.prepare(`UPDATE sections SET moduleId=?, facultyId=?, capacity=?, enrolled=?, schedule=?, comments=?, adjustment=? WHERE id=?`)
      .run(updated.moduleId, updated.facultyId || null, updated.capacity, updated.enrolled, JSON.stringify(updated.schedule), updated.comments ?? null, updated.adjustment ?? null, id);

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
          this.db.prepare(`INSERT INTO modules (id, title, credits, description, status, level) VALUES (?, ?, 0, '', 'pendiente', 'Básico')`).run(validModuleId, validModuleId);
        }

        const existing = this.db.prepare("SELECT id FROM sections WHERE id = ?").get(normalizedSection.id) as { id: string } | undefined;

        if (!existing) {
          this.db.prepare(`INSERT INTO sections (id, moduleId, facultyId, capacity, enrolled, schedule, comments, adjustment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(normalizedSection.id, validModuleId, validFacultyId, normalizedSection.capacity, normalizedSection.enrolled, JSON.stringify(normalizedSection.schedule), normalizedSection.comments ?? null, normalizedSection.adjustment ?? null);
          created += 1;
        } else {
          this.db.prepare(`UPDATE sections SET moduleId=?, facultyId=?, capacity=?, enrolled=?, schedule=?, comments=?, adjustment=? WHERE id=?`)
            .run(validModuleId, validFacultyId, normalizedSection.capacity, normalizedSection.enrolled, JSON.stringify(normalizedSection.schedule), normalizedSection.comments ?? null, normalizedSection.adjustment ?? null, normalizedSection.id);
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

  addEnrollment(studentId: string, sectionId: string) {
    const existing = this.db.prepare("SELECT studentId FROM section_enrollments WHERE studentId = ? AND sectionId = ?").get(studentId, sectionId);
    if (existing) return false;

    const tx = this.db.transaction(() => {
      this.db.prepare("INSERT INTO section_enrollments (studentId, sectionId, enrolledAt) VALUES (?, ?, ?)").run(studentId, sectionId, new Date().toISOString());
      this.db.prepare("UPDATE sections SET enrolled = enrolled + 1 WHERE id = ?").run(sectionId);
    });
    tx();
    return true;
  }

  removeEnrollment(studentId: string, sectionId: string) {
    let changed = false;
    const tx = this.db.transaction(() => {
      const res = this.db.prepare("DELETE FROM section_enrollments WHERE studentId = ? AND sectionId = ?").run(studentId, sectionId);
      if (res.changes > 0) {
        this.db.prepare("UPDATE sections SET enrolled = CASE WHEN enrolled > 0 THEN enrolled - 1 ELSE 0 END WHERE id = ?").run(sectionId);
      }
      changed = res.changes > 0;
    });
    // Wait, let's fix the SQL inside
    tx();
    return changed;
  }

  updateMinuteTask(minuteId: string, taskId: string, status: ManualTask['status']) {
    const row = this.db.prepare("SELECT * FROM minutes WHERE id = ?").get(minuteId) as any;
    if (!row) return null;

    const minute: AcademicMinute = { ...row, tasks: JSON.parse(row.tasks || "[]"), fullData: JSON.parse(row.fullData || "null") };
    const task = minute.tasks.find((item) => item.id === taskId);

    if (!task) return null;

    task.status = status;
    this.db.prepare("UPDATE minutes SET tasks=? WHERE id=?").run(JSON.stringify(minute.tasks), minuteId);
    return task;
  }

  async addClinicalField(field: ClinicalField) {
    this.db.prepare(`INSERT INTO clinical_fields (id, name, type, level, slots, status, pertinence, lastInspection, agreementExpiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(field.id, field.name, field.type, field.level, field.slots, field.status, field.pertinence, field.lastInspection, field.agreementExpiry);
    return field;
  }

  async updateClinicalField(id: string, updates: Partial<ClinicalField>) {
    const row = this.db.prepare("SELECT * FROM clinical_fields WHERE id = ?").get(id) as any;
    if (!row) return null;

    const clinicalField: ClinicalField = { ...row };
    const updated = { ...clinicalField, ...updates };

    const tx = this.db.transaction(() => {
      this.db.prepare(
        `UPDATE clinical_fields SET name=?, type=?, level=?, slots=?, status=?, pertinence=?, lastInspection=?, agreementExpiry=? WHERE id=?`
      ).run(updated.name, updated.type, updated.level, updated.slots, updated.status, updated.pertinence, updated.lastInspection, updated.agreementExpiry, id);
    });
    tx();
    return updated;
  }

  async deleteClinicalField(id: string) {
    const existing = this.db.prepare("SELECT name FROM clinical_fields WHERE id = ?").get(id) as { name: string } | undefined;
    if (!existing) return false;

    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE rotations SET clinicalFieldId=NULL WHERE clinicalFieldId=?").run(id);
      this.db.prepare("DELETE FROM clinical_fields WHERE id = ?").run(id);
    });
    tx();
    return true;
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

  // Reemplazar todos los eventos BUAP (type != 'minuta') con los nuevos del upload
  upsertBuapEvents(events: Omit<AcademicEvent, 'id'>[]): AcademicEvent[] {
    const tx = this.db.transaction(() => {
      // Borrar todos los eventos BUAP existentes (no tocar minutas)
      this.db.prepare("DELETE FROM calendar_events WHERE type != 'minuta'").run();

      const insert = this.db.prepare(`
      INSERT INTO calendar_events (id, date, title, type, sourceId, description)
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

// Instancia global
export const db = new SqliteDatabase();
