import { Student } from '../types';

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
  }
};
