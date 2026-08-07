import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/twview.svg');
const outputDir = path.resolve('public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [16, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${size}x${size} PNG icon at: ${outputPath}`);
  }
}

generateIcons().catch(console.error);
