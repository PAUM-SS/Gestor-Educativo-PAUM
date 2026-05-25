import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';

async function run() {
  try {
    const file = fs.readFileSync('base de datos programacion académica.pdf');
    const parser = new PDFParse({ data: file });
    const data = await parser.getText();
    fs.writeFileSync('pdf-output.txt', data.text);
    console.log('PDF parsed successfully');
  } catch (err) {
    console.error('Error parsing PDF:', err);
  }
}

run();
