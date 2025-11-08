const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'public', 'assets', 'sprites');
const targets = ['spoon', 'blob'];

async function run() {
  for (const name of targets) {
    const inPath = path.join(SRC_DIR, `${name}.svg`);
    const outPath = path.join(SRC_DIR, `${name}.png`);
    if (!fs.existsSync(inPath)) {
      console.warn(`Skipping ${name}: SVG not found at ${inPath}`);
      continue;
    }
    try {
      await sharp(inPath)
        .png()
        .resize(128, 32, { fit: 'contain' })
        .toFile(outPath);
      console.log(`Wrote ${outPath}`);
    } catch (err) {
      console.error(`Failed to rasterize ${inPath}:`, err);
      process.exitCode = 2;
    }
  }
}

run();
