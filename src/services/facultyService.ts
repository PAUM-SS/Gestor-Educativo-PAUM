/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FacultyMember } from '../types';

type FacultyImportResult = {
  created: number;
  updated: number;
  total: number;
  faculty: FacultyMember[];
};

export const facultyService = {
  getFaculty: async (): Promise<FacultyMember[]> => {
    try {
      const response = await fetch('/api/faculty');
      if (!response.ok) throw new Error('Error fetching faculty');
      return await response.json();
    } catch (error) {
      console.error('Failed to load faculty:', error);
      return [];
    }
  },

  addFaculty: async (facultyMember: FacultyMember): Promise<FacultyMember | null> => {
    try {
      const response = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyMember)
      });
      if (!response.ok) throw new Error('Error creating faculty');
      return await response.json();
    } catch (error) {
      console.error('Failed to create faculty:', error);
      return null;
    }
  },

  updateFaculty: async (id: string, updates: Partial<FacultyMember>): Promise<FacultyMember | null> => {
    try {
      const response = await fetch(`/api/faculty/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Error updating faculty');
      return await response.json();
    } catch (error) {
      console.error('Failed to update faculty:', error);
      return null;
    }
  },

  deleteFaculty: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/faculty/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error deleting faculty');
      return true;
    } catch (error) {
      console.error('Failed to delete faculty:', error);
      return false;
    }
  },

  importFaculty: async (file: File): Promise<FacultyImportResult | null> => {
    try {
      const formData = new FormData();
      formData.append('facultyFile', file);

      const response = await fetch('/api/faculty/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Error importing faculty');
      return await response.json();
    } catch (error) {
      console.error('Failed to import faculty:', error);
      return null;
    }
  }
};
