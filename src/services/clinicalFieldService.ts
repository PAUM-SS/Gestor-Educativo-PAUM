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
};
