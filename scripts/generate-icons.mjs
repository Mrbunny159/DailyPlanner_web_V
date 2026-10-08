import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const sizes = [192, 512];

await mkdir(path.join('public', 'icons'), { recursive: true });

for (const size of sizes) {
  await sharp(path.join('public', 'icon.svg'), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join('public', 'icons', `icon-${size}.png`));

  console.log(`Created public/icons/icon-${size}.png`);
}