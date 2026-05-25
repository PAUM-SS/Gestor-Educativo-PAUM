import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'build', 'electron');

await mkdir(outputDir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, 'electron', 'main.ts')],
  outfile: path.join(outputDir, 'main.cjs'),
  bundle: true,
  external: ['electron', 'pdf-parse'], // Solo pdf-parse debe ser externa para que funcione su lectura de archivos nativa
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
});
