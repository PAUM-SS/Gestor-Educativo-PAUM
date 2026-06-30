import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';

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

export function normalizeScheduleDay(day: string): ClassSchedule['day'] {
  const normalizedKey = day
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return NORMALIZED_DAYS[normalizedKey] ?? (day as ClassSchedule['day']);
}

export function normalizeSection(section: AcademicSection): AcademicSection {
  return {
    ...section,
    schedule: section.schedule.map((slot) => ({
      ...slot,
      day: normalizeScheduleDay(slot.day),
    })),
  };
}

export function normalizeSectionDailyRecord(record: SectionDailyRecord): SectionDailyRecord {
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

export function parseJSON(str: any, fallback: any) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
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
  private dbDir: string;
  private db!: Database.Database;

  constructor() {
    this.dbDir = path.join(os.homedir(), '.paum-system');
    this.dbPath = path.join(this.dbDir, 'database.sqlite')
  }

  getRawConnection(): Database.Database {
    return this.db;
  }

  getDBDir(): string {
    return this.dbDir
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

}
