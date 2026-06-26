import { AcademicSection, AcademicSectionWithNames } from '../types';

type ClassImportResult = {
  created: number;
  updated: number;
  total: number;
  sections: AcademicSection[];
};

export const SchedulerService = {

  getClasses: async (): Promise<AcademicSectionWithNames[]> => {
    const response = await fetch('/api/sections');
    if (!response.ok) throw new Error('Error al cargar secciones');
    const data = await response.json();
    return data;
  },

  addClass: async (academicSection: AcademicSection): Promise<AcademicSectionWithNames | null> => {
    const response = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(academicSection)
    });

    if (!response.ok) throw new Error('Error al registrar sección');
    return await response.json();
  },

  updateClass: async (id: string, updates: Partial<AcademicSection>): Promise<AcademicSectionWithNames | null> => {
    const response = await fetch(`/api/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error al actualizar sección');
    return await response.json();
  },

  deleteClass: async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/sections/${id}`, { method: 'DELETE' });

    if (!response.ok) throw new Error('Error al eliminar sección');
    return true;
  },

  importSections: async (file: File): Promise<ClassImportResult | null> => {
    const formData = new FormData();
    formData.append('sectionFile', file);
    const response = await fetch('/api/sections/import', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Error al importar secciones');
    return await response.json();
  },

  exportSections: async (): Promise<Blob> => {
    const response = await fetch('/api/sections/export');
    if (!response.ok) throw new Error('Error al exportar secciones');
    return await response.blob();
  }
};
