export const reportService = {

  sendReport: async (reportType: string, notes: string): Promise<boolean> => {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType, notes })
    });

    if (!response.ok) throw new Error('Error subiendo reporte');
    return await response.json();
  }
};
