import { ClinicalField } from '@/shared/types';
import { getFileNameFromResponse } from './utils';

type ExportResult = {
  blob: Blob;
  fileName: string;
};

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
  },

  importClinicalFields: async (file: File) => {
    const formData = new FormData();
    formData.append('clinicalFieldFile', file);
    const response = await fetch('/api/clinical-fields/import', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Error al importar sedes clínicas');
    return await response.json();
  },

  exportClinicalFields: async (): Promise<ExportResult> => {
    const response = await fetch('/api/clinical-fields/export');
    if (!response.ok) throw new Error('Error al exportar sedes clínicas');

    const blob = await response.blob();
    const fileName = getFileNameFromResponse(response, 'Sedes_Clinicas.xlsx');

    return { blob, fileName };
  }

};
