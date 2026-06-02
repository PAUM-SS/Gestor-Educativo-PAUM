import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
  AcademicEvent
} from './types';

import {
  MOCK_STUDENTS,
  MOCK_MODULES,
  MOCK_MINUTES,
  MOCK_FACULTY,
  MOCK_CLINICAL_FIELDS,
  MOCK_SECTIONS,
  MOCK_ROTATIONS,
  MOCK_ACTIVITIES,
  MOCK_ACADEMIC_CALENDAR
} from './constants';

export interface DatabaseSchema {
  students: Student[];
  modules: Module[];
  minutes: AcademicMinute[];
  faculty: FacultyMember[];
  clinicalFields: ClinicalField[];
  sections: AcademicSection[];
  sectionDailyRecords: SectionDailyRecord[];
  rotations: Rotation[];
  activities: Activity[];
  calendarEvents: AcademicEvent[]
}

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

function normalizeFacultyMember(member: FacultyMember): FacultyMember {
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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT,
        enrollmentId TEXT,
        semester INTEGER,
        status TEXT,
        gpa REAL,
        attendance REAL,
        email TEXT,
        cohort TEXT,
        tutor TEXT,
        alert INTEGER,
        kardex TEXT
      );

      CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        title TEXT,
        code TEXT,
        credits INTEGER,
        description TEXT,
        instructor TEXT,
        competencies TEXT,
        status TEXT,
        semester TEXT,
        level TEXT,
        syllabusUrl TEXT,
        syllabusFileName TEXT,
        didacticPlanningUrl TEXT,
        didacticPlanningFileName TEXT,
        planning TEXT
      );

      CREATE TABLE IF NOT EXISTS minutes (
        id TEXT PRIMARY KEY,
        date TEXT,
        subject TEXT,
        tasks TEXT,
        fullData TEXT
      );

      CREATE TABLE IF NOT EXISTS faculty (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        level TEXT,
        dedication TEXT,
        seniority INTEGER,
        hireDate TEXT,
        compliance TEXT,
        adscription TEXT,
        email TEXT,
        phone TEXT,
        photo TEXT,
        weeklySchedule TEXT,
        permissions TEXT
      );

      CREATE TABLE IF NOT EXISTS clinical_fields (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        level INTEGER,
        slots INTEGER,
        status TEXT,
        pertinence TEXT,
        lastInspection TEXT,
        agreementExpiry TEXT
      );

      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        moduleId TEXT NOT NULL REFERENCES modules(id),
        moduleName TEXT,
        facultyId TEXT REFERENCES faculty(id) ON DELETE SET NULL,
        groupCode TEXT NOT NULL,
        semester TEXT,
        room TEXT,
        roomType TEXT,
        capacity INTEGER DEFAULT 0,
        enrolled INTEGER DEFAULT 0,
        schedule TEXT
      );

      CREATE TABLE IF NOT EXISTS section_daily_records (
        id TEXT PRIMARY KEY,
        sectionId TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        facultyPresent INTEGER DEFAULT 1,
        absentStudentIds TEXT DEFAULT '[]',
        justification TEXT,
        justificationType TEXT,
        topic TEXT,
        signature INTEGER DEFAULT 0,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rotations (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL REFERENCES students(id),
        studentName TEXT,
        clinicalFieldId TEXT REFERENCES clinical_fields(id) ON DELETE SET NULL,
        facility TEXT,
        department TEXT,
        startDate TEXT,
        endDate TEXT,
        supervisor TEXT,
        status TEXT DEFAULT 'programada'
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        timestamp TEXT,
        relatedId TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id          TEXT PRIMARY KEY,
        date        TEXT NOT NULL,
        title       TEXT NOT NULL,
        type        TEXT NOT NULL,
        sourceId    TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS _meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 1.5. Migraciones de columnas (para bases de datos que ya existen)
    const columnExists = (table: string, column: string): boolean => {
      const cols = this.db.prepare('PRAGMA table_info(' + table + ')').all() as { name: string }[];
      return cols.some(c => c.name === column);
    };

    if (!columnExists('sections', 'semester')) {
      this.db.exec('ALTER TABLE sections ADD COLUMN semester TEXT');
      console.log('[Base de Datos] Migración: columna semester agregada a sections.');
    }
    if (!columnExists('rotations', 'clinicalFieldId')) {
      this.db.exec('ALTER TABLE rotations ADD COLUMN clinicalFieldId TEXT');
      console.log('[Base de Datos] Migración: columna clinicalFieldId agregada a rotations.');
    }
    if (!columnExists('activities', 'relatedId')) {
      this.db.exec('ALTER TABLE activities ADD COLUMN relatedId TEXT');
      console.log('[Base de Datos] Migración: columna relatedId agregada a activities.');
    }

    // 2. Migration logic
    const seeded = this.db
      .prepare("SELECT value FROM _meta WHERE key = 'seeded'")
      .get() as { value: string } | undefined;

    if (!seeded) {
      console.log('[Base de Datos] Primera ejecución. Iniciando siembra o migración.');

      let initialData: DatabaseSchema | null = null;
      const oldJsonPath = path.join(this.dataDir, 'database.json');

      if (existsSync(oldJsonPath)) {
        console.log(`[Base de Datos] Migrando desde ${oldJsonPath}...`);
        try {
          const fileContent = await fs.readFile(oldJsonPath, 'utf-8');
          initialData = JSON.parse(fileContent);
        } catch (error) {
          console.error('[Base de Datos] Error al leer database.json:', error);
        }
      }

      if (!initialData) {
        initialData = {
          students: MOCK_STUDENTS,
          modules: MOCK_MODULES,
          minutes: MOCK_MINUTES,
          faculty: MOCK_FACULTY.map(normalizeFacultyMember),
          clinicalFields: MOCK_CLINICAL_FIELDS,
          sections: MOCK_SECTIONS.map(normalizeSection),
          sectionDailyRecords: [],
          rotations: MOCK_ROTATIONS,
          activities: MOCK_ACTIVITIES,
          calendarEvents: MOCK_ACADEMIC_CALENDAR
        };
      }

      const tx = this.db.transaction((data: DatabaseSchema) => {
        const insertStudent = this.db.prepare(`
        INSERT OR IGNORE INTO students 
        (id, name, enrollmentId, semester, status, gpa, attendance, email, cohort, tutor, alert, kardex) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertModule = this.db.prepare(`
        INSERT OR IGNORE INTO modules 
        (id, title, code, credits, description, instructor, competencies, status, semester, level, 
        syllabusUrl, syllabusFileName, didacticPlanningUrl, didacticPlanningFileName, planning) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMinute = this.db.prepare(`
        INSERT OR IGNORE INTO minutes (id, date, subject, tasks, fullData) 
        VALUES (?, ?, ?, ?, ?)
        `);

        const insertFaculty = this.db.prepare(`
        INSERT OR IGNORE INTO faculty 
        (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, 
        email, phone, photo, weeklySchedule, permissions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertCF = this.db.prepare(`
        INSERT OR IGNORE INTO clinical_fields 
        (id, name, type, level, slots, status, pertinence, lastInspection, agreementExpiry) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertSection = this.db.prepare(`
        INSERT OR IGNORE INTO sections 
        (id, moduleId, moduleName, facultyId, groupCode, semester, room, roomType, capacity, enrolled, schedule) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertSDR = this.db.prepare(`
        INSERT OR IGNORE INTO section_daily_records 
        (id, sectionId, date, facultyPresent, absentStudentIds, justification, justificationType, 
        topic, signature, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertRot = this.db.prepare(`
        INSERT OR IGNORE INTO rotations 
        (id, studentId, studentName, clinicalFieldId, facility, department, startDate, endDate, supervisor, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertAct = this.db.prepare(`
        INSERT OR IGNORE INTO activities 
        (id, type, title, timestamp, relatedId, status) 
        VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertCalEvent = this.db.prepare(`
        INSERT OR IGNORE INTO calendar_events (id, date, title, type, sourceId, description)
        VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Execute inserting initial data
        if (Array.isArray(data.students)) {
          for (const s of data.students) {
            insertStudent.run(
              s.id,
              s.name,
              s.enrollmentId,
              s.semester,
              s.status,
              s.gpa,
              s.attendance,
              s.email,
              s.cohort,
              s.tutor,
              s.alert ? 1 : 0,
              s.kardex ? JSON.stringify(s.kardex) : null
            );
          }
        }

        if (Array.isArray(data.modules)) {
          for (const m of data.modules) {
            insertModule.run(
              m.id,
              m.title,
              m.code,
              m.credits,
              m.description,
              m.instructor,
              m.competencies ? JSON.stringify(m.competencies) : '[]',
              m.status,
              m.semester !== undefined ? String(m.semester) : null,
              m.level,
              m.syllabusUrl ?? null,
              m.syllabusFileName ?? null,
              m.didacticPlanningUrl ?? null,
              m.didacticPlanningFileName ?? null,
              m.planning ? JSON.stringify(m.planning) : null
            );
          }
        }

        if (Array.isArray(data.minutes)) {
          for (const m of data.minutes) {
            insertMinute.run(
              m.id,
              m.date,
              m.subject,
              m.tasks ? JSON.stringify(m.tasks) : '[]',
              m.fullData ? JSON.stringify(m.fullData) : null
            );
          }
        }

        if (Array.isArray(data.faculty)) {
          for (const f of data.faculty) {
            insertFaculty.run(
              f.id,
              f.name,
              f.category,
              f.level,
              f.dedication,
              f.seniority ?? 0,
              f.hireDate ?? null,
              f.compliance ? JSON.stringify(f.compliance) : '{}',
              f.adscription ?? null,
              f.email ?? null,
              f.phone ?? null,
              f.photo ?? null,
              f.weeklySchedule ? JSON.stringify(f.weeklySchedule) : '[]',
              f.permissions ? JSON.stringify(f.permissions) : '[]'
            );
          }
        }

        if (Array.isArray(data.clinicalFields)) {
          for (const cf of data.clinicalFields) {
            insertCF.run(
              cf.id,
              cf.name,
              cf.type,
              cf.level ?? null,
              cf.slots ?? 0,
              cf.status,
              cf.pertinence ?? null,
              cf.lastInspection ?? null,
              cf.agreementExpiry ?? null
            );
          }
        }

        if (Array.isArray(data.sections)) {
          for (const sec of data.sections) {
            insertSection.run(
              sec.id,
              sec.moduleId,
              sec.moduleName ?? null,
              sec.facultyId || null,
              sec.groupCode,
              sec.semester ?? null,
              sec.room ?? null,
              sec.roomType ?? null,
              sec.capacity ?? 0,
              sec.enrolled ?? 0,
              sec.schedule ? JSON.stringify(sec.schedule) : '[]'
            );
          }
        }

        if (Array.isArray(data.sectionDailyRecords)) {
          for (const sdr of data.sectionDailyRecords) {
            insertSDR.run(
              sdr.id,
              sdr.sectionId,
              sdr.date,
              sdr.facultyPresent ? 1 : 0,
              sdr.absentStudentIds ? JSON.stringify(sdr.absentStudentIds) : '[]',
              sdr.justification ?? null,
              sdr.justificationType ?? null,
              sdr.topic ?? null,
              sdr.signature ? 1 : 0,
              sdr.updatedAt ?? new Date().toISOString()
            );
          }
        }

        if (Array.isArray(data.rotations)) {
          for (const r of data.rotations) {
            insertRot.run(
              r.id,
              r.studentId,
              r.studentName ?? null,
              r.clinicalFieldId || null,
              r.facility ?? null,
              r.department ?? null,
              r.startDate ?? null,
              r.endDate ?? null,
              r.supervisor ?? null,
              r.status ?? 'programada'
            );
          }
        }

        if (Array.isArray(data.activities)) {
          for (const act of data.activities) {
            insertAct.run(
              act.id,
              act.type,
              act.title,
              act.timestamp,
              act.relatedId ?? null,
              act.status ?? null
            );
          }
        }

        if (Array.isArray(data.calendarEvents)) {
          for (const e of data.calendarEvents) {
            insertCalEvent.run(
              e.id,
              e.date,
              e.title,
              e.type,
              e.sourceId ?? null,
              e.description ?? null
            );
          }
        }

        this.db
          .prepare("INSERT OR IGNORE INTO _meta (key, value) VALUES ('seeded', 'true')")
          .run();
      });

      // Temporarily disable foreign keys to allow migration/seeding of datasets with potential orphaned references
      this.db.pragma('foreign_keys = OFF');
      try {
        tx(initialData);
      } finally {
        this.db.pragma('foreign_keys = ON');
      }

      if (existsSync(oldJsonPath)) {
        await fs.rename(oldJsonPath, oldJsonPath + '.bak')
          .catch(e => console.warn("[Base de Datos] No se pudo renombrar database.json: ", e));
      }
    }
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

  getSections(): AcademicSection[] {
    return this.db.prepare("SELECT * FROM sections").all().map((row: any) => ({
      ...row,
      // facultyId puede ser NULL tras un ON DELETE SET NULL; se normaliza a string vacío
      facultyId: row.facultyId ?? '',
      schedule: this.parseJSON(row.schedule, [])
    })) as AcademicSection[];
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

        this.db.prepare("UPDATE modules SET planning=? WHERE id=?").run(JSON.stringify(module.planning), moduleId);
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

  async updateFaculty(id: string, updates: Partial<FacultyMember>) {
    const row = this.db.prepare("SELECT * FROM faculty WHERE id = ?").get(id) as any;
    if (!row) return null;

    const faculty: FacultyMember = { ...row, compliance: JSON.parse(row.compliance || "{}"), weeklySchedule: JSON.parse(row.weeklySchedule || "[]"), permissions: JSON.parse(row.permissions || "[]") };
    const updated = normalizeFacultyMember({ ...faculty, ...updates });

    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE faculty SET name=?, category=?, level=?, dedication=?, seniority=?, hireDate=?, compliance=?, adscription=?, email=?, phone=?, photo=?, weeklySchedule=?, permissions=? WHERE id=?`).run(updated.name, updated.category, updated.level, updated.dedication, updated.seniority, updated.hireDate, JSON.stringify(updated.compliance), updated.adscription, updated.email, updated.phone, updated.photo, JSON.stringify(updated.weeklySchedule), JSON.stringify(updated.permissions), id);

      if (updates.name && faculty.name !== updated.name) {
        this.db.prepare("UPDATE modules SET instructor=? WHERE instructor=?").run(updated.name, faculty.name);
      }
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
      this.db.prepare("UPDATE modules SET instructor='Sin asignar' WHERE instructor=?").run(existing.name);
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

          if (existing.name !== f.name) {
            this.db.prepare("UPDATE modules SET instructor=? WHERE instructor=?").run(f.name, existing.name);
          }
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

    this.db.prepare(`UPDATE sections SET moduleId=?, moduleName=?, facultyId=?, groupCode=?, semester=?, room=?, roomType=?, capacity=?, enrolled=?, schedule=? WHERE id=?`).run(updated.moduleId, updated.moduleName, updated.facultyId || null, updated.groupCode, updated.semester ?? null, updated.room, updated.roomType, updated.capacity, updated.enrolled, JSON.stringify(updated.schedule), id);

    return updated;
  }

  async updateMinuteTask(minuteId: string, taskId: string, status: ManualTask['status']) {
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
