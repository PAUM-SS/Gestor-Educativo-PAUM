import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const resourcesDir = path.join(projectRoot, 'build-resources');
const svgPath = path.join(resourcesDir, 'icon.svg');
const pngPath = path.join(resourcesDir, 'icon.png');
const icoPath = path.join(resourcesDir, 'icon.ico');

await mkdir(resourcesDir, { recursive: true });

const iconSizes = [256, 128, 64, 48, 32, 16];
const pngBuffer = await sharp(svgPath)
  .resize(512, 512)
  .png()
  .toBuffer();

await writeFile(pngPath, pngBuffer);

const icoBuffers = await Promise.all(
  iconSizes.map((size) =>
    sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer()
  )
);

const icoBuffer = await pngToIco(icoBuffers);
await writeFile(icoPath, icoBuffer);

console.log(`[icons] Iconos generados en ${resourcesDir}`);
