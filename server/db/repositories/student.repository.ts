import { Database } from 'better-sqlite3';
import { Student, StudentKardexSummary } from "@/shared/types";

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

}
