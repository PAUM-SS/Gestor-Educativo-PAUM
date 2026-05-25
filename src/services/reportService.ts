/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const reportService = {
  sendReport: async (reportType: string, notes: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/reports', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, notes }) 
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to send report:', error);
      return false;
    }
  }
};
