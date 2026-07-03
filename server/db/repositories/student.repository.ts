import { Database } from 'better-sqlite3';
import { Student, StudentKardexSummary } from "@/shared/types";
import { parseJSON } from '../transforms';

export class StudentRepository {
    constructor(private db: Database) {}

    getStudents(): Student[] {
    const rows = this.db.prepare('SELECT * FROM students').all() as any[];
    return rows.map(r => ({
      ...r,
      alert: Boolean(r.alert),
      kardex: r.kardex ? JSON.parse(r.kardex) : null
    }));
  }
  
  async addStudent(student: Student) {
    const existing = this.db.prepare("SELECT id FROM students WHERE id = ?").get(student.id);
    if (existing) return null;
    
    this.db.prepare(`
      INSERT INTO students 
      (id, name, enrollmentId, semester, status, gpa, attendance, email, cohort, tutor, alert, kardex) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student.id, student.name, student.enrollmentId, student.semester, student.status, student.gpa, student.attendance, student.email, student.cohort, student.tutor, student.alert ? 1 : 0, student.kardex ? JSON.stringify(student.kardex) : null);
    
    return student;
  }

  async updateStudent(id: string, updates: Partial<Student>) {
    const row = this.db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
    if (!row) return null;

    const kardex = row.kardex ? JSON.parse(row.kardex) : undefined;
    const student: Student = { ...row, alert: Boolean(row.alert), kardex };
    const updated = { ...student, ...updates };

    this.db.prepare(`
      UPDATE students SET 
      name=?, enrollmentId=?, semester=?, status=?, gpa=?, attendance=?, email=?, cohort=?, tutor=?, alert=?, kardex=? 
      WHERE id=?
    `).run(updated.name, updated.enrollmentId, updated.semester, updated.status, updated.gpa, updated.attendance, updated.email, updated.cohort, updated.tutor, updated.alert ? 1 : 0, updated.kardex ? JSON.stringify(updated.kardex) : null, id);

    return updated;
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

  importStudents(students: Student[]) {
    let created = 0;
    let updated = 0;

    const tx = this.db.transaction(() => {
      for (const student of students) {
        const existing = this.db.prepare(
          "SELECT id FROM students WHERE id = ? OR enrollmentId = ?"
        ).get(student.id, student.enrollmentId) as { id: string } | undefined;

        if (!existing) {
          this.db.prepare(`
            INSERT INTO students
            (id, name, enrollmentId, semester, status, gpa, attendance, email, cohort, tutor, alert, kardex)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            student.id || `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            student.name ?? '',
            student.enrollmentId ?? '',
            student.semester ?? 1,
            student.status ?? 'activo',
            student.gpa ?? 0,
            student.attendance ?? 100,
            student.email ?? '',
            student.cohort ?? '',
            student.tutor ?? '',
            student.alert ? 1 : 0,
            student.kardex ? JSON.stringify(student.kardex) : null
          );
          created += 1;
        } else {
          this.db.prepare(`
            UPDATE students SET
            name=?, enrollmentId=?, semester=?, status=?, gpa=?,
            attendance=?, email=?, cohort=?, tutor=?, alert=?
            WHERE id=?
          `).run(
            student.name ?? '',
            student.enrollmentId ?? '',
            student.semester ?? 1,
            student.status ?? 'activo',
            student.gpa ?? 0,
            student.attendance ?? 100,
            student.email ?? '',
            student.cohort ?? '',
            student.tutor ?? '',
            student.alert ? 1 : 0,
            existing.id
          );
          updated += 1;
        }
      }
    });
    tx();

    const total = (this.db.prepare(
      "SELECT count(*) as count FROM students"
    ).get() as any).count;

    const allStudents = this.db.prepare(
      "SELECT * FROM students ORDER BY name ASC"
    ).all().map((row: any) => ({
      ...row,
      alert: Boolean(row.alert),
      kardex: parseJSON(row.kardex, null),
    })) as Student[];

    return { created, updated, total, students: allStudents };
  }

  exportStudents(): any[] {
    const rows = this.db.prepare(`
      SELECT
        id,
        name,
        enrollmentId,
        semester,
        status,
        gpa,
        attendance,
        email,
        cohort,
        tutor,
        alert
      FROM students
      ORDER BY name ASC
    `).all() as any[];

    return rows.map((row, index) => ({
      'No.': index + 1,
      'ID': row.id,
      'Nombre': row.name || '',
      'Matrícula': row.enrollmentId || '',
      'Semestre': row.semester || '',
      'Estatus': row.status || '',
      'Promedio': row.gpa ?? '',
      'Asistencia': row.attendance ?? '',
      'Correo': row.email || '',
      'Cohorte': row.cohort || '',
      'Tutor': row.tutor || '',
      'Alerta': row.alert ? 'Sí' : 'No',
    }));
  }

}
