const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
    const dir = path.join(__dirname, '..', 'public', 'creatives', 'varanda');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

    console.log('=== CRIATIVOS VARANDA ===\n');
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const meta = await sharp(filePath).metadata();
        const ratio = meta.width / meta.height;
        const orientation = ratio > 1.2 ? 'LANDSCAPE' : ratio < 0.8 ? 'PORTRAIT/STORY' : 'SQUARE';
        console.log(`${file}`);
        console.log(`  ${meta.width}x${meta.height} | ${orientation} | ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
        console.log('');
    }
}

main().catch(console.error);
