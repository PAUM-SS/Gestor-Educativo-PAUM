/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AcademicMinute } from '../types';

export const minutesService = {
  getMinutes: async (): Promise<AcademicMinute[]> => {
    try {
      const response = await fetch('/api/minutes');
      if (!response.ok) throw new Error('Error fetching minutes');
      return await response.json();
    } catch (error) {
      console.error('Failed to load minutes:', error);
      return [];
    }
  },
  
  updateTask: async (minuteId: string, taskId: string, status: 'pendiente' | 'realizada' | 'vencida'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/minutes/${minuteId}/tasks/${taskId}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update task:', error);
      return false;
    }
  }
};
