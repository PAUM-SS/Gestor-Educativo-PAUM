import Database from 'better-sqlite3';
import { SqliteDatabase } from './connection.ts';
import path from 'node:path';

import { 
  Student,
  FacultyMember,
  ClinicalField,
  Module,
  AcademicEvent,
  AcademicMinute,
  AcademicSection
} from '@/src/types';

// Importamos las nuevas sub-clases/servicios
import { StudentRepository } from './repositories/student.repository.ts';
import { FacultyRepository } from './repositories/faculty.repository.ts';
import { ClinicalFieldRepository } from './repositories/clinicalField.repository.ts';
import { CurriculumRepository } from './repositories/curriculum.repository.ts';
import { CalendarRepository } from './repositories/calendar.repository.ts';
import { MinuteRepository } from './repositories/minute.repository.ts';
import { ScheduleRepository } from './repositories/schedule.repository.ts';
import { ReportRepository } from './repositories/report.repository.ts';

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
  getClinicalField() {
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

  getUploadsDir() {
    return path.join(this.connection.getDBDir(), 'uploads');
  }
}




// Exportamos una única instancia compartida por toda la aplicación (Singleton)
export const db = new AppDatabase();