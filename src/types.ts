/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  name: string;
  enrollmentId: string;
  semester: number;
  status:
  | 'activo'
  | 'egresado'
  | 'baja'
  | 'en_riesgo'
  | 'en_rotacion'
  | 'servicio_social'
  | 'práctica_profesional';
  gpa: number;
  attendance: number;
  email: string;
  cohort: string;
  tutor: string;
  alert: boolean;
  kardex?: StudentKardexSummary;
}

export interface StudentKardexSummary {
  parsedAt: string;
  sourceFileName: string;
  sourcePdfUrl?: string;
  sourceTextUrl?: string;
  sourceOcrImageUrl?: string;
  extractionMethod?: 'pdf' | 'ocr' | 'pdf+ocr';
  rawTextLength?: number;
  ocrTextLength?: number;
  extractedTextLength: number;
  extracted: {
    enrollmentId?: string;
    name?: string;
    gpa?: number;
    semester?: number;
    studentStatusLabel?: string;
    progressPercent?: number;
  };
  matchedModuleIds: string[];
  missingModuleIds: string[];
  riskReasons: string[];
}

export interface Module {
  id: string;
  title: string;
  credits: number;
  description: string;
  competencies: string[];
  status: 'completado' | 'en_curso' | 'pendiente';
  semester: number | string;
  level: 'Básico' | 'Formativo' | 'Minerva' | 'Práctica/Servicio';
  syllabusUrl?: string;
  syllabusFileName?: string;
  didacticPlanningUrl?: string;
  didacticPlanningFileName?: string;
  planning?: DidacticPlanning;
}

export interface PlanningUnit {
  id: string;
  unitNumber: string;
  title: string;
  content: string;
  activity: string;
  strategies: string[];
  resources: string[];
  evidence: string;
  instrument: string;
  weight: number;
  sessions: number;
  completedSessions: number;
  sessionLog: string[];
  status: 'pendiente' | 'en_progreso' | 'completado';
}

export interface DidacticPlanning {
  id: string;
  learningOutcome: string;
  competencies: {
    generic: string[];
    specific: string[];
  };
  units: PlanningUnit[];
}

export interface FacultyMember {
  id: string;
  name: string;
  category: 'Profesor-Investigador' | 'Técnico Académico' | 'Profesor de Asignatura';
  level: 'Asistente' | 'Asociado A' | 'Asociado B' | 'Asociado C' | 'Titular A' | 'Titular B' | 'Titular C';
  dedication: 'Tiempo Completo' | 'Medio Tiempo' | 'Hora Clase';
  seniority: number;
  hireDate?: string;
  compliance: {
    cedula: boolean;
    medicalExam: boolean;
    inductionCourse: boolean;
    annualEvaluation: number;
  };
  adscription: string;
  email?: string;
  phone?: string;
  photo?: string;
  weeklySchedule?: string[];
  permissions?: {
    type: 'Médico' | 'Administrativo' | 'Capacitación' | 'Personal';
    startDate: string;
    endDate: string;
    description: string;
    approved: boolean;
  }[];
}

export interface ClinicalField {
  id: string;
  name: string;
  type: 'Público' | 'Privado' | 'Social' | 'Rescate';
  level: 1 | 2 | 3;
  slots: number;
  status: 'Activo' | 'En Revisión' | 'Vencido';
  pertinence: string;
  lastInspection: string;
  agreementExpiry: string;
}

export interface AcademicEvent {
  id: string;
  date: string;         // YYYY-MM-DD
  title: string;
  type: 'clase' | 'ins' | 'fin' | 'susp' | 'vac' | 'gest' | 'buap' | 'minuta';
  sourceId?: string;    // id de ManualTask si type === 'minuta'
  description?: string; // detalle adicional opcional
}

export interface AcademicMinute {
  id: string;
  date: string;
  subject: string;
  tasks: ManualTask[];
  fullData?: {
    number: string;
    time: string;
    modality: string;
    evidenceValidity: string;
    revisedVersion: string;
    agenda: string[];
    documents: { code: string; title: string; version: string; date: string }[];
    development: string;
    agreements: string[];
    attendance: { name: string; role: string }[];
  };
}

export interface ManualTask {
  id: string;
  description: string;
  dueDate: string;
  status: 'pendiente' | 'realizada' | 'vencida';
  estimatedHours?: number;
  actualHours?: number;
  reminderSent?: boolean;
}

export interface ClassSchedule {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  start: string;
  end: string;
  room: string;
  roomType: 'Teórico' | 'Laboratorio' | 'Simulación' | 'Rotación' | 'Práctica' | 'Otros';
}

export interface AcademicSection {
  id: string;
  moduleId: string;
  facultyId: string;
  capacity: number;
  enrolled: number;
  schedule: ClassSchedule[];
}

export interface SectionEnrollment {
  studentId: string;
  sectionId: string;
  enrolledAt: string;
}

export interface SectionDailyRecord {
  id: string;
  sectionId: string;
  date: string;
  facultyPresent: boolean;
  absentStudentIds: string[];
  justification?: string;
  justificationType?: string;
  topic?: string;
  signature: boolean;
  updatedAt: string;
}

export interface Rotation {
  id: string;
  studentId: string;
  studentName: string;
  facility: string;
  department: string;
  startDate: string;
  endDate: string;
  supervisor: string;
  status: 'programada' | 'en_progreso' | 'completada' | 'cancelada';
  /** FK al campo clínico del catálogo (clinical_fields.id) */
  clinicalFieldId?: string;
}

export interface Activity {
  id: string;
  type: 'evaluation' | 'rotation' | 'lecture' | 'seminar';
  title: string;
  timestamp: string;
  /** ID de la entidad relacionada (rotación, módulo, etc.) */
  relatedId?: string;
  status: string;
}
