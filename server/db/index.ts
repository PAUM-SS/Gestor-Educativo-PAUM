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
}

// Exportamos una única instancia compartida por toda la aplicación (Singleton)
export const db = new AppDatabase();