import { ClinicalField } from '../types';

export const clinicalFieldService = {
  getClinicalFields: async (): Promise<ClinicalField[]> => {
    try {
      const response = await fetch('/api/clinical-fields');
      if (!response.ok) throw new Error('Error fetching clinical fields');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch clinical fields:', error);
      return [];
    }
  },

  addClinicalField: async (field: ClinicalField): Promise<ClinicalField | null> => {
    try {
      const response = await fetch('/api/clinical-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      });

      if (!response.ok) throw new Error('Error creating clinical field');
      return await response.json();
    } catch (error) {
      console.error('Failed to create clinical field:', error);
      return null;
    }
  },
};
