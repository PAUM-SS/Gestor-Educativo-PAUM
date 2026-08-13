import { Student } from '@/shared/types';

type StudentsImportResult = {
  created: number;
  updated: number;
  total: number;
  students: Student[];
};

type KardexResult = {
  action: 'created' | 'updated';
  student: Student;
};

export const studentService = {

  getStudents: async (): Promise<Student[]> => {
    const response = await fetch('/api/students');

    if (!response.ok) throw new Error('Error al cargar el listado de alumnos');
    return await response.json();
  },

  updateStudent: async (id: string, updates: Partial<Student>): Promise<Student | null> => {
    const response = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error al actualizar el alumno');
    return await response.json();
  },

  addStudent: async (student: Student): Promise<Student | null> => {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });

    if (!response.ok) throw new Error('Error al registrar el alumno');
    return await response.json();
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/students/${id}`, { method: 'DELETE' });

    if (!response.ok) throw new Error('Error al eliminar el alumno');
    return true;
  },

  importStudents: async (file: File): Promise<StudentsImportResult | null> => {
    const formData = new FormData();
    formData.append('studentsFile', file);
    const response = await fetch('/api/students/import', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Error al importar estudiantes');
    return await response.json();
  },

  exportStudents: async (): Promise<Blob> => {
    const response = await fetch('/api/students/export');
    if (!response.ok) throw new Error('Error al exportar estudiantes');
    return await response.blob();
  },

  parseKardex: async (file: File): Promise<KardexResult> => {
    const formData = new FormData();
    formData.append('kardex', file);
    const response = await fetch('/api/students/upload-kardex', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Error al importar kardex');
    return await response.json();
  }
};
