/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, PlanningUnit } from '../types';

export const curriculumService = {
  getModules: async (): Promise<Module[]> => {
    try {
      const response = await fetch('/api/curriculum');
      if (!response.ok) throw new Error('Error fetching modules');
      return await response.json();
    } catch (error) {
      console.error('Failed to load modules:', error);
      return [];
    }
  },

  updateModulePlanningUnit: async (moduleId: string, unitId: string, completedSessions: number): Promise<PlanningUnit | null> => {
    try {
      const response = await fetch(`/api/curriculum/${moduleId}/units/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedSessions })
      });
      if (!response.ok) throw new Error('Error updating planning unit');
      return await response.json();
    } catch (error) {
      console.error('Failed to update planning unit:', error);
      return null;
    }
  },

  uploadModuleDocument: async (
    moduleId: string,
    type: 'syllabus' | 'planning',
    file: File
  ): Promise<Module | null> => {
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
  }
};
