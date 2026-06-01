import { AcademicSection, SectionDailyRecord } from '../types';

export const sectionService = {

  getSections: async (): Promise<AcademicSection[]> => {
    const response = await fetch('/api/sections');

    if (!response.ok) throw new Error('Error fetching sections');
    return await response.json();
  },

  updateSection: async (id: string, updates: Partial<AcademicSection>): Promise<AcademicSection | null> => {
    const response = await fetch(`/api/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error updating section');
    return await response.json();
  },

  getSectionRecords: async (): Promise<SectionDailyRecord[]> => {
    const response = await fetch('/api/section-records');

    if (!response.ok) throw new Error('Error fetching section records');
    return await response.json();
  },

  updateSectionRecord: async (
    sectionId: string,
    date: string,
    updates: Partial<Omit<SectionDailyRecord, 'id' | 'sectionId' | 'date' | 'updatedAt'>>
  ): Promise<SectionDailyRecord | null> => {
    const response = await fetch(`/api/section-records/${encodeURIComponent(sectionId)}/${encodeURIComponent(date)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Error updating section record');
    return await response.json();
  }
};
