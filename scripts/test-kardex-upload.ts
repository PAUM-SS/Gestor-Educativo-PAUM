import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createSimplePdf(lines: string[]) {
  const content =
    [
      'BT',
      '/F1 12 Tf',
      '14 TL',
      '50 780 Td',
      ...lines.map((line, idx) => `(${pdfEscape(line)}) Tj${idx < lines.length - 1 ? ' T*' : ''}`),
      'ET',
      '',
    ].join('\n');

  const objects: string[] = [];
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  objects[3] =
    `3 0 obj\n` +
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n` +
    `endobj\n`;

  const contentLength = Buffer.byteLength(content, 'ascii');
  objects[4] = `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}endstream\nendobj\n`;
  objects[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  offsets[0] = 0;

  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'ascii');
    pdf += objects[i];
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 6\n`;
  pdf += `0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
}

async function run() {
  // Redirect DB writes to a temp folder for testing.
  const tmpDrive = path.join(os.tmpdir(), 'paum-kardex-test-onedrive');
  process.env.OneDrive = tmpDrive;

  const { startServer } = await import('../server.ts');

  const externalPdfPath = process.env.KARDEX_PDF_PATH;
  const pdf = externalPdfPath
    ? fs.readFileSync(externalPdfPath)
    : createSimplePdf([
        'NOMBRE DEL ALUMNO: JUAN PEREZ LOPEZ',
        'MATRICULA: 202012345',
        'PROMEDIO GENERAL ACUMULADO: 8.55',
        'SEMESTRE ACTUAL: 3',
        'PAUS 001 FUN ANAT CAB CUELLO Y TORAX',
        'PAUS 006 FUND ANAT ABDOMEN Y EXTREMID',
        'PAUS 009 ATN DES NAT Y ANTROPOGENICOS',
      ]);

  const filename = externalPdfPath ? path.basename(externalPdfPath) : 'kardex-test.pdf';

  const started = await startServer({ host: '127.0.0.1', port: 0 });

  try {
    const form = new FormData();
    form.append('kardex', new Blob([pdf], { type: 'application/pdf' }), filename);

    const response = await fetch(`${started.url}/api/students/upload-kardex`, {
      method: 'POST',
      body: form,
    });

    const body = await response.text();
    console.log('status:', response.status);
    console.log(body);
  } finally {
    started.server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
