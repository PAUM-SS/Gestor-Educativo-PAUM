// SIEMBRA DE DATOS INICIALES
import { Database } from 'better-sqlite3';

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
} from '../../shared/types.ts';
import {
  MOCK_STUDENTS,
  MOCK_MODULES,
  MOCK_MINUTES,
  MOCK_FACULTY,
  MOCK_CLINICAL_FIELDS,
  MOCK_ROTATIONS,
  MOCK_ACTIVITIES,
  MOCK_ACADEMIC_CALENDAR
} from '../../shared/constants.ts';

import { normalizeFacultyMember } from './connection';

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

export function seedDatabase (db: Database): void {
    const seeded = db
        .prepare("SELECT value FROM _meta WHERE key = 'seeded'")
        .get() as { value: string } | undefined;

    if(seeded) {
        return;
    }

    console.log('[Base de Datos] Primera ejecución. Iniciando siembra o migración.');

    const initialData: DatabaseSchema = {
        students: MOCK_STUDENTS,
        modules: MOCK_MODULES,
        minutes: MOCK_MINUTES,
        faculty: MOCK_FACULTY.map(normalizeFacultyMember),
        clinicalFields: MOCK_CLINICAL_FIELDS,
        sections: [],
        sectionDailyRecords: [],
        rotations: MOCK_ROTATIONS,
        activities: MOCK_ACTIVITIES,
        calendarEvents: MOCK_ACADEMIC_CALENDAR
    };

    const tx = db.transaction((data: DatabaseSchema) => {
        const insertStudent = db.prepare(`
            INSERT OR IGNORE INTO students 
            (id, name, enrollmentId, semester, status, gpa, attendance, email, cohort, tutor, alert, kardex) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertModule = db.prepare(`
            INSERT OR IGNORE INTO modules 
            (id, title, credits, description, competencies, status, semester, level, 
            syllabusUrl, syllabusFileName, didacticPlanningUrl, didacticPlanningFileName, planning) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMinute = db.prepare(`
            INSERT OR IGNORE INTO minutes 
            (id, date, subject, tasks, fullData) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertFaculty = db.prepare(`
            INSERT OR IGNORE INTO faculty 
            (id, name, category, level, dedication, seniority, hireDate, compliance, adscription, 
            email, phone, photo, weeklySchedule, permissions) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertCF = db.prepare(`
            INSERT OR IGNORE INTO clinical_fields 
            (id, name, type, level, slots, status, pertinence, lastInspection, agreementExpiry) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertSDR = db.prepare(`
            INSERT OR IGNORE INTO section_daily_records 
            (id, sectionId, date, facultyPresent, absentStudentIds, justification, justificationType, 
            topic, signature, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertRot = db.prepare(`
            INSERT OR IGNORE INTO rotations 
            (id, studentId, studentName, clinicalFieldId, facility, department, startDate, endDate, supervisor, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertAct = db.prepare(`
            INSERT OR IGNORE INTO activities 
            (id, type, title, timestamp, relatedId, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertCalEvent = db.prepare(`
            INSERT OR IGNORE INTO calendar_events 
            (id, date, title, type, sourceId, description)
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
                    m.credits,
                    m.description,
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

        db.prepare("INSERT OR IGNORE INTO _meta (key, value) VALUES ('seeded', 'true')")
            .run();
    });

    // Ejecutar de forma segura desactivando temporalmente las llaves foráneas
    db.pragma('foreign_keys = OFF');
    try {
        tx(initialData);
    } finally {
        db.pragma('foreign_keys = ON');
    }
}