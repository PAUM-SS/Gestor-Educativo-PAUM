import { AcademicMinute } from '../types';

export const minutesService = {

  getMinutes: async (): Promise<AcademicMinute[]> => {
    const response = await fetch('/api/minutes');

    if (!response.ok) throw new Error('Error fetching minutes');
    return await response.json();
  },

  updateTask: async (minuteId: string, taskId: string, status: 'pendiente' | 'realizada' | 'vencida'): Promise<boolean> => {
    const response = await fetch(`/api/minutes/${minuteId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Error actualizando tarea de minuta');
    return await response.json();

  }
};
