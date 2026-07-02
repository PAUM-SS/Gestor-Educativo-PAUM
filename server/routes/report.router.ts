import { Router } from 'express';
import multer from 'multer';

export const reportsRouter = Router();

const pdfUpload = multer({ storage: multer.memoryStorage() });

reportsRouter.post('/', (req, res) => {
  const { reportType } = req.body;
  console.log(`[Backend] Processing report: ${reportType}`);
  res.json({ success: true, message: 'Report generated' });
});

reportsRouter.post('/send', pdfUpload.single('pdf'), async (req, res) => {
  try {
    const pdfFile = req.file;
    const { reportType = 'general', notes = '' } = req.body as {
      reportType?: string;
      notes?: string;
    };

    if (!pdfFile) {
      res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
      return;
    }

    const nodemailer = await import('nodemailer');
    const from = process.env.MAIL_FROM || '';
    const to = process.env.MAIL_TO || '';
    const pass = process.env.SMTP_PASS || '';

    if (!from || !pass) {
      console.warn('[Reports] MAIL_FROM / MAIL_PASS no configurados en .env.');
      res.json({ success: true, simulated: true });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { ciphers: 'SSLv3' },
    });

    const today = new Date().toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const subject = `[PAUM] Reporte oficial – ${reportType.toUpperCase()} – ${today}`;

    await transporter.sendMail({
      from: `"PAUM Gestor Educativo" <${from}>`,
      to,
      subject,
      html: `
        <p>Se adjunta el reporte oficial de tipo <strong>${reportType}</strong> generado el ${today}.</p>
        ${notes ? `<p><strong>Observaciones del coordinador:</strong><br/>${notes.replace(/\n/g, '<br/>')}</p>` : ''}
        <hr/>
        <p style="font-size:11px;color:#64748b;">Enviado automáticamente por el sistema PAUM Gestor Educativo – Facultad de Medicina BUAP.</p>
      `,
      attachments: [{
        filename: pdfFile.originalname || `PAUM-${reportType}-${Date.now()}.pdf`,
        content: pdfFile.buffer,
        contentType: 'application/pdf',
      }],
    });

    console.log(`[Reports] Reporte "${reportType}" enviado a ${to}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Reports] Error al enviar el reporte:', error);
    res.status(500).json({ error: 'No se pudo enviar el reporte.' });
  }
});