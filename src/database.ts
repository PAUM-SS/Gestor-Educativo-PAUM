import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Import initial mock data as fallback/seed
import { 
  MOCK_STUDENTS, 
  MOCK_MODULES, 
  MOCK_MINUTES, 
  MOCK_FACULTY, 
  MOCK_CLINICAL_FIELDS,
  MOCK_SECTIONS, 
  MOCK_ROTATIONS, 
  MOCK_ACTIVITIES 
} from './constants';

import { Student, Module, AcademicMinute, FacultyMember, AcademicSection, ClassSchedule, ManualTask, Rotation, Activity, ClinicalField, SectionDailyRecord } from './types';

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

export class JsonDatabase {
  private dbPath: string;
  private dataDir: string;
  private data: DatabaseSchema | null = null;

  constructor() {
    // Buscar la ruta de OneDrive (Institucional o Personal)
    const oneDrivePath = process.env.OneDriveCommercial || process.env.OneDrive;
    const userHome = os.homedir();
    
    // Si existe OneDrive, guardamos ahí para sincronización en la nube.
    // Si no, guardamos en la carpeta Documentos normal.
    const baseDir = oneDrivePath ? oneDrivePath : 
                   (existsSync(path.join(userHome, 'Documents')) ? path.join(userHome, 'Documents') : userHome);
                   
    const dataDir = path.join(baseDir, 'PAUM_BaseDeDatos');
    
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    this.dataDir = dataDir;
    this.dbPath = path.join(dataDir, 'database.json');
  }

  async init() {
    try {
      if (existsSync(this.dbPath)) {
        const fileContent = await fs.readFile(this.dbPath, 'utf-8');
        this.data = JSON.parse(fileContent);
        const normalizedSections = this.data.sections.map(normalizeSection);
        const normalizedFaculty = this.data.faculty.map(normalizeFacultyMember);
        const normalizedClinicalFields = Array.isArray(this.data.clinicalFields) ? this.data.clinicalFields : [];
        const normalizedSectionDailyRecords = Array.isArray(this.data.sectionDailyRecords)
          ? this.data.sectionDailyRecords.map(normalizeSectionDailyRecord)
          : [];
        const sectionDataChanged =
          JSON.stringify(normalizedSections) !== JSON.stringify(this.data.sections);
        const facultyDataChanged =
          JSON.stringify(normalizedFaculty) !== JSON.stringify(this.data.faculty);
        const clinicalFieldsMissing = !Array.isArray(this.data.clinicalFields);
        const sectionDailyRecordsMissing = !Array.isArray(this.data.sectionDailyRecords);
        const sectionDailyRecordDataChanged =
          JSON.stringify(normalizedSectionDailyRecords) !== JSON.stringify(this.data.sectionDailyRecords ?? []);
        this.data.sections = normalizedSections;
        this.data.faculty = normalizedFaculty;
        this.data.clinicalFields = normalizedClinicalFields;
        this.data.sectionDailyRecords = normalizedSectionDailyRecords;
        if (
          sectionDataChanged ||
          facultyDataChanged ||
          clinicalFieldsMissing ||
          sectionDailyRecordsMissing ||
          sectionDailyRecordDataChanged
        ) {
          await this.save();
        }
        console.log(`[Base de Datos] Cargada desde: ${this.dbPath}`);
      } else {
        console.log(`[Base de Datos] Archivo no encontrado. Inicializando con datos predeterminados en: ${this.dbPath}`);
        this.data = {
          students: MOCK_STUDENTS,
          modules: MOCK_MODULES,
          minutes: MOCK_MINUTES,
          faculty: MOCK_FACULTY.map(normalizeFacultyMember),
          clinicalFields: MOCK_CLINICAL_FIELDS,
          sections: MOCK_SECTIONS.map(normalizeSection),
          sectionDailyRecords: [],
          rotations: MOCK_ROTATIONS,
          activities: MOCK_ACTIVITIES
        };
        await this.save();
      }
    } catch (error) {
      console.error('[Base de Datos] Error al inicializar:', error);
      // En caso de error crítico (JSON corrupto), inicia de cero en memoria
      this.data = {
        students: MOCK_STUDENTS,
        modules: MOCK_MODULES,
        minutes: MOCK_MINUTES,
        faculty: MOCK_FACULTY.map(normalizeFacultyMember),
        clinicalFields: MOCK_CLINICAL_FIELDS,
        sections: MOCK_SECTIONS.map(normalizeSection),
        sectionDailyRecords: [],
        rotations: MOCK_ROTATIONS,
        activities: MOCK_ACTIVITIES
      };
    }
  }

  async save() {
    if (this.data) {
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    }
  }

  getData(): DatabaseSchema {
    if (!this.data) throw new Error('Database not initialized');
    return this.data;
  }

  getUploadsDir() {
    return path.join(this.dataDir, 'uploads');
  }

  // --- Helpers Específicos ---

  async updateStudent(id: string, updates: Partial<Student>) {
    if (!this.data) return;
    const index = this.data.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.students[index] = { ...this.data.students[index], ...updates };
      await this.save();
      return this.data.students[index];
    }
    return null;
  }

  async updateModulePlanningUnit(moduleId: string, unitId: string, completedSessions: number) {
    if (!this.data) return;
    const module = this.data.modules.find(m => m.id === moduleId);
    if (module && module.planning) {
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

        await this.save();
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
    if (!this.data) return null;
    const moduleIndex = this.data.modules.findIndex((item) => item.id === moduleId);

    if (moduleIndex === -1) {
      return null;
    }

    if (type === 'syllabus') {
      this.data.modules[moduleIndex].syllabusUrl = fileUrl;
      this.data.modules[moduleIndex].syllabusFileName = fileName;
    } else {
      this.data.modules[moduleIndex].didacticPlanningUrl = fileUrl;
      this.data.modules[moduleIndex].didacticPlanningFileName = fileName;
    }

    await this.save();
    return this.data.modules[moduleIndex];
  }

  async updateFaculty(id: string, updates: Partial<FacultyMember>) {
    if (!this.data) return null;
    const index = this.data.faculty.findIndex(f => f.id === id);
    
    if (index !== -1) {
      const oldName = this.data.faculty[index].name;
      this.data.faculty[index] = normalizeFacultyMember({ ...this.data.faculty[index], ...updates });
      
      const newName = this.data.faculty[index].name;
      
      // Actualización en Cascada: si el nombre cambió, actualizar todos los módulos que lo tengan asignado
      if (updates.name && oldName !== newName) {
        this.data.modules.forEach(m => {
          if (m.instructor === oldName) {
            m.instructor = newName;
          }
        });
      }
      
      await this.save();
      return this.data.faculty[index];
    }
    return null;
  }

  async addFaculty(facultyMember: FacultyMember) {
    if (!this.data) return null;
    if (this.data.faculty.some((member) => member.id === facultyMember.id)) {
      return null;
    }

    this.data.faculty.unshift(normalizeFacultyMember(facultyMember));
    await this.save();
    return this.data.faculty[0];
  }

  async deleteFaculty(id: string) {
    if (!this.data) return false;

    const facultyMember = this.data.faculty.find((member) => member.id === id);
    if (!facultyMember) {
      return false;
    }

    this.data.faculty = this.data.faculty.filter((member) => member.id !== id);
    this.data.modules = this.data.modules.map((module) =>
      module.instructor === facultyMember.name
        ? { ...module, instructor: 'Sin asignar' }
        : module
    );
    this.data.sections = this.data.sections.map((section) =>
      section.facultyId === id
        ? { ...section, facultyId: 'SIN ASIGNAR' }
        : section
    );

    await this.save();
    return true;
  }

  async importFaculty(facultyMembers: FacultyMember[]) {
    if (!this.data) {
      return { created: 0, updated: 0, total: 0, faculty: [] as FacultyMember[] };
    }

    let created = 0;
    let updated = 0;

    for (const rawMember of facultyMembers) {
      const normalizedMember = normalizeFacultyMember(rawMember);
      const existingIndex = this.data.faculty.findIndex((member) => member.id === normalizedMember.id);

      if (existingIndex === -1) {
        this.data.faculty.unshift(normalizedMember);
        created += 1;
        continue;
      }

      const oldName = this.data.faculty[existingIndex].name;
      this.data.faculty[existingIndex] = {
        ...this.data.faculty[existingIndex],
        ...normalizedMember,
      };

      if (oldName !== normalizedMember.name) {
        this.data.modules = this.data.modules.map((module) =>
          module.instructor === oldName
            ? { ...module, instructor: normalizedMember.name }
            : module
        );
      }

      updated += 1;
    }

    await this.save();

    return {
      created,
      updated,
      total: this.data.faculty.length,
      faculty: this.data.faculty,
    };
  }

  async addStudent(student: Student) {
    if (!this.data) return null;
    this.data.students.unshift(student); // Add to the top
    await this.save();
    return student;
  }

  async deleteStudent(id: string) {
    if (!this.data) return false;
    const initialLength = this.data.students.length;
    this.data.students = this.data.students.filter(s => s.id !== id);
    if (this.data.students.length < initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async updateSection(id: string, updates: Partial<AcademicSection>) {
    if (!this.data) return null;
    const index = this.data.sections.findIndex(s => s.id === id);
    if (index !== -1) {
      const normalizedUpdates = updates.schedule
        ? {
            ...updates,
            schedule: updates.schedule.map((slot) => ({
              ...slot,
              day: normalizeScheduleDay(slot.day),
            })),
          }
        : updates;
      this.data.sections[index] = normalizeSection({ ...this.data.sections[index], ...normalizedUpdates });
      await this.save();
      return this.data.sections[index];
    }
    return null;
  }

  async updateMinuteTask(minuteId: string, taskId: string, status: ManualTask['status']) {
    if (!this.data) return null;
    const minute = this.data.minutes.find((item) => item.id === minuteId);
    const task = minute?.tasks.find((item) => item.id === taskId);

    if (!task) {
      return null;
    }

    task.status = status;
    await this.save();
    return task;
  }

  async addClinicalField(field: ClinicalField) {
    if (!this.data) return null;
    this.data.clinicalFields.unshift(field);
    await this.save();
    return field;
  }

  async upsertSectionDailyRecord(
    sectionId: string,
    date: string,
    updates: Partial<Omit<SectionDailyRecord, 'id' | 'sectionId' | 'date' | 'updatedAt'>>
  ) {
    if (!this.data) return null;

    const recordId = `${sectionId}:${date}`;
    const index = this.data.sectionDailyRecords.findIndex(
      (record) => record.sectionId === sectionId && record.date === date
    );

    const baseRecord: SectionDailyRecord =
      index >= 0
        ? this.data.sectionDailyRecords[index]
        : {
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

    if (index >= 0) {
      this.data.sectionDailyRecords[index] = nextRecord;
    } else {
      this.data.sectionDailyRecords.unshift(nextRecord);
    }

    await this.save();
    return nextRecord;
  }
}

// Instancia global
export const db = new JsonDatabase();
