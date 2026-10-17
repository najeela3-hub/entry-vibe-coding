// 뱀서 배경음악 — 직접 합성한 16비트 모노 WAV(22050Hz) 를 만들고 ffmpeg 로 MP3 변환.
// 곡 구성: A 마이너, 120 BPM, 16 마디(32 초) 루프. 코드 진행 Am–F–C–G 반복.
// 실행: node games/vampire-survival/audio/build-bgm.mjs  (결과: vampire-bgm.mp3, 같은 폴더)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const RATE = 22050;
const BPM = 120;
const BEAT = 60 / BPM;            // 0.5 초
const BARS = 16;
const BEATS = BARS * 4;
const DURATION = BEATS * BEAT;    // 32 초
const N = Math.round(RATE * DURATION);

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 코드 (MIDI 음 번호): Am, F, C, G — 베이스 루트 + 코드톤
const CHORDS = [
  { root: 45, tones: [57, 60, 64] },   // Am: A2 / A3 C4 E4
  { root: 41, tones: [53, 57, 60] },   // F
  { root: 48, tones: [55, 60, 64] },   // C
  { root: 43, tones: [55, 59, 62] },   // G
];
// 멜로디 — 마디마다 8분음표 2개씩 (A 마이너 펜타토닉 위주), 4 마디 단위로 변주
const MELODY_PHRASE = [
  [69, 72, 76, 72, 69, 67, 64, 67],
  [65, 69, 72, 69, 65, 64, 62, 64],
  [60, 64, 67, 72, 71, 67, 64, 60],
  [67, 71, 74, 71, 67, 64, 62, 59],
];

// 결정적 의사 난수 (재현 가능한 노이즈)
let seed = 20261017;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return seed / 2147483648; };

const buf = new Float32Array(N);
const addNote = (startSec, durSec, fn) => {
  const s0 = Math.round(startSec * RATE);
  const len = Math.round(durSec * RATE);
  for (let i = 0; i < len && s0 + i < N; i++) buf[s0 + i] += fn(i / RATE, i / len, durSec);
};
const square = (f, t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);
const tri = (f, t) => { const p = (f * t) % 1; return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; };
// 음 길이 기준 어택/릴리스 엔벨로프 (초 단위)
const env = (t, dur, a = 0.02, r = 0.12) => Math.min(1, t / a) * Math.min(1, (dur - t) / r);

for (let bar = 0; bar < BARS; bar++) {
  const chord = CHORDS[bar % 4];
  const t0 = bar * 4 * BEAT;
  // 베이스: 4분음표 루트 (triangle, 저음)
  for (let b = 0; b < 4; b++) {
    addNote(t0 + b * BEAT, BEAT * 0.95, (t, p, dur) => 0.24 * tri(midiToHz(chord.root), t) * env(t, dur, 0.01, 0.2));
  }
  // 아르페지오: 8분음표, 코드톤 순환 (square, 작게)
  for (let e = 0; e < 8; e++) {
    const note = chord.tones[e % 3] + 12;
    addNote(t0 + e * BEAT / 2, BEAT / 2 * 0.9, (t, p, dur) => 0.05 * square(midiToHz(note), t) * env(t, dur, 0.005, 0.1));
  }
  // 멜로디: 4 마디마다 프레이즈 변경 (square, 중음)
  const phrase = MELODY_PHRASE[Math.floor(bar / 4) % 4];
  for (let e = 0; e < 8; e++) {
    const bar2 = bar % 2; // 두 마디 단위로 앞·뒤 반복
    const idx = (e + bar2 * 4) % 8;
    addNote(t0 + e * BEAT / 2, BEAT / 2 * 0.85, (t, p, dur) => 0.1 * square(midiToHz(phrase[idx]), t) * env(t, dur, 0.01, 0.1));
  }
  // 드럼: 킥(1,3박), 하이햇(8분음표 노이즈)
  for (const b of [0, 2]) {
    addNote(t0 + b * BEAT, 0.18, (t, p, dur) => {
      const f = 140 * Math.exp(-t * 18) + 45;
      return 0.4 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14);
    });
  }
  for (let e = 0; e < 8; e++) {
    addNote(t0 + e * BEAT / 2, 0.06, (t) => 0.06 * (rnd() * 2 - 1) * Math.exp(-t * 60));
  }
}

// 가장자리 페이드(루프 끊김 완화) + 소프트 클리핑 + 16비트 PCM
const out = Buffer.alloc(44 + N * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 2, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 2, 40);
const fade = Math.round(0.02 * RATE);
for (let i = 0; i < N; i++) {
  let v = buf[i] * (i < fade ? i / fade : 1) * (N - i < fade ? (N - i) / fade : 1);
  v = Math.tanh(v * 1.2) * 0.85;
  out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2);
}

const wavPath = path.join(here, 'vampire-bgm.wav');
const mp3Path = path.join(here, 'vampire-bgm.mp3');
fs.writeFileSync(wavPath, out);
const enc = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-codec:a', 'libmp3lame', '-b:a', '128k', mp3Path], { stdio: 'inherit' });
if (enc.status !== 0) { console.error('ffmpeg 인코딩 실패'); process.exit(1); }
fs.unlinkSync(wavPath);   // 번들은 MP3 만 (15 소리 검증 문서의 MP3 기본 방침)
console.log(`wrote ${mp3Path}, duration ${DURATION.toFixed(3)} s`);
