import React from 'react';
import { pdf } from '@react-pdf/renderer';
import ReportPDFDocument, { type ReportType } from '../components/ReportPDFDocument';

export const reportService = {

  /**
   * Genera el PDF en el cliente usando @react-pdf/renderer y lo devuelve como Blob.
   */
  generatePdfBlob: async (reportType: ReportType, notes: string): Promise<Blob> => {
    const doc = React.createElement(ReportPDFDocument, { type: reportType, notes });
    const blob = await pdf(doc as any).toBlob();
    return blob;
  },

  /**
   * Genera el PDF y lo abre en una nueva pestaña para imprimir con el diálogo nativo del navegador.
   */
  printReport: async (reportType: ReportType, notes: string): Promise<boolean> => {
    const blob = await reportService.generatePdfBlob(reportType, notes);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.focus();
      });
    }
    // Liberar la URL del objeto después de un tiempo prudente
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    return true;
  },

  /**
   * Genera el PDF y lo envía al backend para que Nodemailer lo mande por correo.
   */
  sendReport: async (reportType: ReportType, notes: string): Promise<boolean> => {
    const blob = await reportService.generatePdfBlob(reportType, notes);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `PAUM-${reportType.toUpperCase()}-${today}.pdf`;

    const formData = new FormData();
    formData.append('pdf', blob, fileName);
    formData.append('reportType', reportType);
    formData.append('notes', notes);

    const response = await fetch('/api/reports/send', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Error al enviar el reporte');
    return true;
  },
};
