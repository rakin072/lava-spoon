const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const files = ['lottery_spin', 'lottery_win', 'lottery_lose'];
const srcDir = path.join(__dirname, '..', 'public', 'assets', 'sfx');

async function convert() {
  for (const name of files) {
    const inFile = path.join(srcDir, `${name}.wav`);
    const outFile = path.join(srcDir, `${name}.ogg`);
    if (!fs.existsSync(inFile)) {
      console.warn('Missing input', inFile);
      continue;
    }
    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .audioCodec('libvorbis')
        .audioQuality(5)
        .on('error', (err) => { console.error('ffmpeg error', err); reject(err); })
        .on('end', () => { console.log('Wrote', outFile); resolve(); })
        .save(outFile);
    });
  }
}

convert().catch((e) => { console.error(e); process.exit(2); });
