import { Module, PlanningUnit } from '../types';

export const curriculumService = {
  getModules: async (): Promise<Module[]> => {
    const response = await fetch('/api/curriculum');

    if (!response.ok) throw new Error('Error fetching modules');
    return await response.json();
  },

  updateModulePlanningUnit: async (moduleId: string, unitId: string, completedSessions: number): Promise<PlanningUnit | null> => {
    const response = await fetch(`/api/curriculum/${moduleId}/units/${unitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedSessions })
    });

    if (!response.ok) throw new Error('Error updating planning unit');
    return await response.json();
  },

  uploadModuleDocument: async (
    moduleId: string,
    type: 'syllabus' | 'planning',
    file: File
  ): Promise<{ module: Module; detectedUnits: { unitNumber: string; title: string; content: string }[]; learningOutcome: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch(`/api/curriculum/${moduleId}/files/${type}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Error uploading module document');
      return await response.json();
    } catch (error) {
      console.error('Failed to upload module document:', error);
      return null;
    }
  },

  updateModule: async (moduleId: string, updates: Partial<Module>): Promise<Module | null> => {
    try {
      const response = await fetch(`/api/curriculum/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Error updating module');
      return await response.json();
    } catch (error) {
      console.error('Failed to update module:', error);
      return null;
    }
  }
};

// Calcula créditos completados vs totales, agrupados por nivel
export function calcCurriculumProgress(modules: Module[]) {
  const levels = ['Básico', 'Formativo', 'Minerva', 'Práctica/Servicio'] as const;

  const byLevel = levels.map(level => {
    const ofLevel = modules.filter(m => m.level === level);
    const total = ofLevel.reduce((sum, m) => sum + m.credits, 0);
    const completed = ofLevel
      .filter(m => m.status === 'completado')
      .reduce((sum, m) => sum + m.credits, 0);
    return {
      level,
      completed,
      total,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const totalCredits = modules.reduce((sum, m) => sum + m.credits, 0);
  const completedCredits = modules
    .filter(m => m.status === 'completado')
    .reduce((sum, m) => sum + m.credits, 0);
  const totalPct = totalCredits > 0
    ? Math.round((completedCredits / totalCredits) * 100)
    : 0;

  return { byLevel, totalCredits, completedCredits, totalPct };
}
