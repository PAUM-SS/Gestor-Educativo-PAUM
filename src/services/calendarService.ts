import { AcademicEvent, ManualTask } from '../types';

export const calendarService = {

    // Obtener todos los eventos, opcionalmente filtrados por rango de fechas
    getEvents: async (from?: string, to?: string): Promise<AcademicEvent[]> => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const url = `/api/calendar/events${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener los eventos del calendario.');
        return response.json();
    },

    // Subir PDF o JSON del calendario oficial BUAP
    uploadCalendar: async (file: File): Promise<{ created: number; events: AcademicEvent[] }> => {
        const formData = new FormData();
        formData.append('calendar', file);

        const response = await fetch('/api/calendar/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.error || 'Error al procesar el archivo del calendario.');
        }
        return response.json();
    },

    // Registrar una tarea de minuta como evento en el calendario
    // Solo se llama cuando la tarea tiene dueDate y pasa a estado 'pendiente'
    addMinutaEvent: async (
        task: Pick<ManualTask, 'id' | 'description' | 'dueDate'>,
        minuteId: string
    ): Promise<AcademicEvent> => {
        const response = await fetch('/api/calendar/minuta-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, minuteId }),
        });
        if (!response.ok) throw new Error('Error al registrar el evento de la tarea en el calendario.');
        const data = await response.json();
        return data.event;
    },

    // Eliminar el evento de una tarea del calendario
    // Se llama cuando la tarea se marca como 'realizada'
    removeMinutaEvent: async (taskId: string): Promise<void> => {
        const response = await fetch(`/api/calendar/minuta-event/${taskId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Error al eliminar el evento de la tarea del calendario.');
    },
};