import { ClinicalField } from '../types';

export const clinicalFieldService = {

  getClinicalFields: async (): Promise<ClinicalField[]> => {
    const response = await fetch('/api/clinical-fields');

    if (!response.ok) throw new Error('Error fetching clinical fields');
    return await response.json();
  },

  addClinicalField: async (field: ClinicalField): Promise<ClinicalField | null> => {
    const response = await fetch('/api/clinical-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    });

    if (!response.ok) throw new Error('Error creating clinical field');
    return await response.json();
  },

  updateClinicalField: async (id: string, updates: Partial<ClinicalField>): Promise<ClinicalField | null> => {
    const response = await fetch(`/api/clinical-fields/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error al actualizar el campo clínico');
    return await response.json();
  },

  deleteClinicalField: async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/clinical-fields/${id}`, { method: 'DELETE' });

    if (!response.ok) throw new Error('Error al eliminar el campo clínico');
    return true;
  }

};
