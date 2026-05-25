/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    try {
      const response = await fetch('/api/students');
      if (!response.ok) throw new Error('Error fetching students');
      return await response.json();
    } catch (error) {
      console.error('Failed to load students:', error);
      return [];
    }
  },

  updateStudent: async (id: string, updates: Partial<Student>): Promise<Student | null> => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Error updating student');
      return await response.json();
    } catch (error) {
      console.error('Failed to update student:', error);
      return null;
    }
  },

  addStudent: async (student: Student): Promise<Student | null> => {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      if (!response.ok) throw new Error('Error creating student');
      return await response.json();
    } catch (error) {
      console.error('Failed to create student:', error);
      return null;
    }
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      return response.ok;
    } catch (error) {
      console.error('Failed to delete student:', error);
      return false;
    }
  }
};
