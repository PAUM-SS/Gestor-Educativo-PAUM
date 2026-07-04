import Database from 'better-sqlite3';
import { SqliteDatabase } from './connection.ts';
import path from 'node:path';

import {
  Student,
  FacultyMember,
  ClinicalField,
  Module,
  SectionDailyRecord,
  AcademicEvent,
  ManualTask,
  AcademicSection
} from '@/shared/types';

// Repositorios de cada entidad de la BD
import { StudentRepository } from './repositories/student.repository.ts';
import { FacultyRepository } from './repositories/faculty.repository.ts';
import { ClinicalFieldRepository } from './repositories/clinicalField.repository.ts';
import { CurriculumRepository } from './repositories/curriculum.repository.ts';
import { CalendarRepository } from './repositories/calendar.repository.ts';
import { MinuteRepository } from './repositories/minute.repository.ts';
import { ScheduleRepository } from './repositories/schedule.repository.ts';
import { ReportRepository } from './repositories/report.repository.ts';
import { ActivityRepository } from './repositories/activity.repository.ts';
import { RotationRepository } from './repositories/rotation.repository.ts';

class AppDatabase {
  private connection !: SqliteDatabase;
  private db !: Database.Database;

  public students!: StudentRepository;
  public faculty!: FacultyRepository;
  public clinicalFields!: ClinicalFieldRepository;
  public curriculum!: CurriculumRepository;
  public calendar!: CalendarRepository;
  public minutes!: MinuteRepository;
  public schedule!: ScheduleRepository;
  public reports!: ReportRepository;
  public activities!: ActivityRepository;
  public rotations!: RotationRepository;

  constructor() {
    this.connection = new SqliteDatabase();
  }

  async init() {
    await this.connection.init();

    this.db = this.connection.getRawConnection();

    // Conexión global
    this.students = new StudentRepository(this.db);
    this.faculty = new FacultyRepository(this.db);
    this.clinicalFields = new ClinicalFieldRepository(this.db);
    this.curriculum = new CurriculumRepository(this.db);
    this.calendar = new CalendarRepository(this.db);
    this.minutes = new MinuteRepository(this.db);
    this.schedule = new ScheduleRepository(this.db);
    this.reports = new ReportRepository(this.db);
  }

  getUploadsDir() {
    return path.join(this.connection.getDBDir(), 'uploads');
  }

  // Mapeado de los métodos principales
  // --- Students ---
  getStudents() {
    return this.students.getStudents();
  }

  addStudent(student: Student) {
    return this.students.addStudent(student);
  }

  updateStudent(id: string, updates: Partial<Student>) {
    return this.students.updateStudent(id, updates);
  }

  deleteStudent(id: string) {
    return this.students.deleteStudent(id);
  }

  // --- Faculty ---
  getFaculty() {
    return this.faculty.getFaculty();
  }

  addFaculty(facultyMember: FacultyMember) {
    return this.faculty.addFaculty(facultyMember);
  }

  updateFaculty(id: string, updates: Partial<FacultyMember>) {
    return this.faculty.updateFaculty(id, updates);
  }

  deleteFaculty(id: string) {
    return this.faculty.deleteFaculty(id);
  }

  importFaculty(faculty: FacultyMember[]) {
    return this.faculty.importFaculty(faculty);
  }

  // --- CLinical Field ---
  getClinicalFields() {
    return this.clinicalFields.getClinicalFields();
  }

  addClinicalField(clinicalField: ClinicalField) {
    return this.clinicalFields.addClinicalField(clinicalField);
  }

  updateClinicalField(id: string, updates: Partial<ClinicalField>) {
    return this.clinicalFields.updateClinicalField(id, updates);
  }

  deleteClinicalField(id: string) {
    return this.clinicalFields.deleteClinicalField(id);
  }

  // -- Curriculum ---
  getModules() {
    return this.curriculum.getModules();
  }

  addModule(module: Module) {
    return this.curriculum.addModule(module);
  }

  updateModule(id: string, updates: Partial<Module>) {
    return this.curriculum.updateModule(id, updates);
  }

  updateModulePlanningUnit(moduleId: string, unitId: string, completedSessions: number) {
    return this.curriculum.updateModulePlanningUnit(moduleId, unitId, completedSessions);
  }

  updateModuleDocument(
    moduleId: string,
    type: 'syllabus' | 'planning',
    fileUrl: string,
    fileName: string
  ) {
    return this.curriculum.updateModuleDocument(moduleId, type, fileUrl, fileName);
  }

  importCurriculum(
    rows: { code: string; title: string; credits: number; semester: number | string; level: Module['level'] }[]
  ) {
    return this.curriculum.importCurriculum(rows);
  }

  // --- Schedule --- 
  getSections() {
    return this.schedule.getSections();
  }

  getExportSections() {
    return this.schedule.getExportSections();
  }

  getSectionDailyRecords() {
    return this.schedule.getSectionDailyRecords();
  }

  addSection(academicSection: AcademicSection) {
    return this.schedule.addSection(academicSection);
  }

  updateSection(id: string, updates: Partial<AcademicSection>) {
    return this.schedule.updateSection(id, updates);
  }

  deleteSection(id: string) {
    return this.schedule.deleteSection(id);
  }

  importSections(sections: AcademicSection[]) {
    return this.schedule.importSections(sections);
  }

  getSectionStudents(sectionId: string) {
    return this.schedule.getSectionStudents(sectionId);
  }

  addEnrollment(studentId: string, sectionId: string) {
    return this.schedule.addEnrollment(studentId, sectionId);
  }

  removeEnrollment(studentId: string, sectionId: string) {
    return this.schedule.removeEnrollment(studentId, sectionId);
  }

  upsertSectionDailyRecord(sectionId: string, date: string, updates: Partial<Omit<SectionDailyRecord, 'id' | 'sectionId' | 'date' | 'updatedAt'>>) {
    return this.schedule.upsertSectionDailyRecord(sectionId, date, updates);
  }

  // --- Calendar --- 
  getCalendarEvents(from?: string, to?: string) {
    return this.calendar.getCalendarEvents(from, to);
  }

  upsertBuapEvents(events: Omit<AcademicEvent, 'id'>[]) {
    return this.calendar.upsertBuapEvents(events);
  }

  addMinutaEvent(task: { id: string; description: string; dueDate: string }, minuteId: string) {
    return this.calendar.addMinutaEvent(task, minuteId);
  }

  removeMinutaEvent(taskId: string) {
    return this.calendar.removeMinutaEvent(taskId);
  }

  // --- Minutes ---
  getMinutes() {
    return this.minutes.getMinutes();
  }

  updateMinuteTask(minuteId: string, taskId: string, status: ManualTask['status']) {
    return this.minutes.updateMinuteTask(minuteId, taskId, status);
  }

  // --- Activity ---
  getActivities() {
    return this.activities.getActivities();
  }

  // --- Rotations ---
  getRotations() {
    return this.rotations.getRotations();
  }

  // --- Reports ---

}




// Exportamos una única instancia compartida por toda la aplicación (Singleton)
export const db = new AppDatabase();