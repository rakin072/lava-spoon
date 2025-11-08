const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav16(filePath, samples, sampleRate = SAMPLE_RATE) {
  // samples: Float32Array -1..1
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // subchunk1 size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(1, offset); offset += 2; // channels
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(16, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  // PCM samples
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = Math.round(s * 0x7fff);
    buffer.writeInt16LE(int16, offset); offset += 2;
  }
  fs.writeFileSync(filePath, buffer);
  console.log('Wrote', filePath);
}

function linmap(t, a, b, x, y) {
  const u = (t - a) / (b - a);
  return x + u * (y - x);
}

function makeLotterySpin() {
  const dur = 1.5;
  const samples = new Float32Array(Math.floor(dur * SAMPLE_RATE));
  const clickCarrierFreq = 200; // pitch: clicking rhythm (200Hz pulses)
  const volume = 0.6;
  // schedule clicks over time with variable interval
  let t = 0;
  let nextClick = 0;
  while (t < dur) {
    // determine interval based on phase
    let interval;
    if (t < 0.5) interval = linmap(t, 0, 0.5, 0.02, 0.005);
    else if (t < 1.0) interval = 0.005;
    else interval = linmap(t, 1.0, 1.5, 0.005, 0.05);
    if (t >= nextClick - 1e-9) {
      // generate a short click at time t
      const clickStart = Math.floor(t * SAMPLE_RATE);
      const clickLen = Math.floor(0.012 * SAMPLE_RATE); // 12 ms burst
      for (let i = 0; i < clickLen; i++) {
        const tt = i / SAMPLE_RATE;
        const env = Math.exp(-30 * tt); // quick decay
        const idx = clickStart + i;
        if (idx < samples.length) samples[idx] += env * Math.sin(2 * Math.PI * clickCarrierFreq * tt) * 1.0;
      }
      nextClick = t + interval;
    }
    t += 1 / SAMPLE_RATE; // advance time by one sample
  }
  // apply small soft clipping and normalize
  // simple fade-in/out to avoid clicks
  const fadeSamps = Math.floor(0.01 * SAMPLE_RATE);
  for (let i = 0; i < samples.length; i++) {
    if (i < fadeSamps) samples[i] *= (i / fadeSamps);
    const tail = samples.length - i;
    if (tail < fadeSamps) samples[i] *= (tail / fadeSamps);
  }
  // scale to volume
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? (volume / peak) : 0;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

function makeLotteryWin() {
  const dur = 2.0;
  const samples = new Float32Array(Math.floor(dur * SAMPLE_RATE));
  const vol = 1.0;
  // square wave chord C4 E4 G4
  const freqs = [261.63, 329.63, 392.0];
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // crescendo envelope: 0..0.5s ramp to 1
    const env = t < 0.5 ? (t / 0.5) : 1.0;
    let s = 0;
    for (const f of freqs) {
      const phase = 2 * Math.PI * f * t;
      s += Math.sign(Math.sin(phase));
    }
    s /= freqs.length; // normalize
    samples[i] += s * env;
  }
  // coin plinks: random short sine bursts
  for (let k = 0; k < 18; k++) {
    const time = Math.random() * dur;
    const start = Math.floor(time * SAMPLE_RATE);
    const len = Math.floor((0.03 + Math.random() * 0.03) * SAMPLE_RATE);
    const freq = 1000 + Math.random() * 2000;
    for (let j = 0; j < len; j++) {
      const idx = start + j;
      if (idx >= samples.length) break;
      const tt = j / SAMPLE_RATE;
      const env = Math.exp(-18 * tt);
      samples[idx] += Math.sin(2 * Math.PI * freq * tt) * env * 0.9;
    }
  }
  // sparkle overlay: high freq noise blips
  for (let k = 0; k < 40; k++) {
    const p = Math.floor(Math.random() * samples.length);
    const len = Math.floor(0.008 * SAMPLE_RATE);
    for (let j = 0; j < len; j++) {
      const idx = p + j;
      if (idx >= samples.length) break;
      samples[idx] += (Math.random() * 2 - 1) * Math.exp(-30 * (j / SAMPLE_RATE)) * 0.08;
    }
  }
  // crowd-ish low rumble: filtered noise (simple lowpass)
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const n = (Math.random() * 2 - 1) * 0.2;
    last = last * 0.995 + n * 0.005;
    samples[i] += last * 0.3;
  }
  // overall fade in/out
  const fade = Math.floor(0.02 * SAMPLE_RATE);
  for (let i = 0; i < samples.length; i++) {
    if (i < fade) samples[i] *= (i / fade);
    const tail = samples.length - i;
    if (tail < fade) samples[i] *= (tail / fade);
  }
  // normalize and apply volume
  let peak = 0; for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? (vol / peak) : 0;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

function makeLotteryLose() {
  const dur = 1.0;
  const samples = new Float32Array(Math.floor(dur * SAMPLE_RATE));
  const vol = 0.5;
  const startFreq = 500;
  const endFreq = 200;
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // linear freq descent
    const freq = linmap(t, 0, dur, startFreq, endFreq);
    // sawtooth: 2*(phase - floor(phase+0.5))
    const phase = (freq * t) % 1;
    const saw = 2 * (phase - Math.round(phase));
    samples[i] += saw * Math.exp(-2 * t);
  }
  // gentle fade out
  const fade = Math.floor(0.06 * SAMPLE_RATE);
  for (let i = 0; i < samples.length; i++) {
    const tail = samples.length - i;
    if (tail < fade) samples[i] *= (tail / fade);
  }
  // normalize and volume
  let peak = 0; for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? (vol / peak) : 0;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

(async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'assets', 'sfx');
  ensureDir(outDir);
  const spin = makeLotterySpin();
  writeWav16(path.join(outDir, 'lottery_spin.wav'), spin);
  const win = makeLotteryWin();
  writeWav16(path.join(outDir, 'lottery_win.wav'), win);
  const lose = makeLotteryLose();
  writeWav16(path.join(outDir, 'lottery_lose.wav'), lose);
  console.log('All SFX generated under', outDir);
})();
