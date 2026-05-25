/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_STUDENTS, MOCK_MODULES, MOCK_MINUTES } from '../constants';
import { Student, Module, AcademicMinute } from '../types';

/**
 * Data Service Layer
 * Abstracting data access to allow for seamless transition from
 * local hardcoded mocks to a backend (e.g., Firebase/BFF) API.
 */

export const dataService = {
  // Students
  getStudents: async (): Promise<Student[]> => {
    // In future: return await fetch('/api/students').then(r => r.json());
    return MOCK_STUDENTS;
  },

  // Curriculum
  getModules: async (): Promise<Module[]> => {
    return MOCK_MODULES;
  },

  // Minutes & Tasks
  getMinutes: async (): Promise<AcademicMinute[]> => {
    return MOCK_MINUTES;
  },

  // Reports (Placeholder for future backend implementation)
  sendReport: async (reportType: string, notes: string): Promise<boolean> => {
    console.log(`[Service] Sending report: ${reportType}, with note: ${notes}`);
    return new Promise((resolve) => setTimeout(() => resolve(true), 1500));
  }
};
