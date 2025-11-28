const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../public/services/new-pictures');
const OUTPUT_DIR = INPUT_DIR; // Overwrite originals (backup first!)
const MAX_WIDTH = 800; // Max width for service card images
const QUALITY = 80; // JPEG/WebP quality

async function optimizeImages() {
  const files = fs.readdirSync(INPUT_DIR);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|PNG|JPG|JPEG)$/i.test(f));

  console.log(`Found ${imageFiles.length} images to optimize...\n`);

  let totalSaved = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;

    // Skip if already small (under 100KB)
    if (originalSize < 100 * 1024) {
      console.log(`Skipping ${file} (already ${(originalSize / 1024).toFixed(0)}KB)`);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, path.extname(file));
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.jpg`);

    try {
      await sharp(inputPath)
        .resize(MAX_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(outputPath + '.tmp');

      const newStats = fs.statSync(outputPath + '.tmp');
      const newSize = newStats.size;
      const saved = originalSize - newSize;
      totalSaved += saved;

      // Replace original with optimized version
      fs.renameSync(outputPath + '.tmp', outputPath);

      // Remove original PNG if we converted to JPG
      if (ext !== '.jpg' && ext !== '.jpeg' && inputPath !== outputPath) {
        fs.unlinkSync(inputPath);
      }

      console.log(`${file}: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(newSize / 1024).toFixed(0)}KB (saved ${(saved / 1024 / 1024).toFixed(2)}MB)`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  console.log(`\nTotal saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`);
}

optimizeImages().catch(console.error);
