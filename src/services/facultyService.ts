import { FacultyMember } from '../types';

type FacultyImportResult = {
  created: number;
  updated: number;
  total: number;
  faculty: FacultyMember[];
};

export const facultyService = {

  getFaculty: async (): Promise<FacultyMember[]> => {
    const response = await fetch('/api/faculty');

    if (!response.ok) throw new Error('Error al cargar docentes');
    return await response.json();
  },

  addFaculty: async (facultyMember: FacultyMember): Promise<FacultyMember | null> => {
    const response = await fetch('/api/faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facultyMember)
    });

    if (!response.ok) throw new Error('Error al registrar docente');
    return await response.json();
  },

  updateFaculty: async (id: string, updates: Partial<FacultyMember>): Promise<FacultyMember | null> => {
    const response = await fetch(`/api/faculty/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error al actualizar docente');
    return await response.json();
  },

  deleteFaculty: async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/faculty/${id}`, { method: 'DELETE' });

    if (!response.ok) throw new Error('Error al eliminar docente');
    return true;
  },

  importFaculty: async (file: File): Promise<FacultyImportResult | null> => {
    const formData = new FormData();
    formData.append('facultyFile', file);
    const response = await fetch('/api/faculty/import', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Error al importar docentes');
    return await response.json();
  }
};
