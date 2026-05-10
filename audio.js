/* ═══════════════════════════════════════
   CORPOFFICE — audio.js
   Sistema de efectos de sonido procedural
═══════════════════════════════════════ */

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

export function ensureAudio() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume();
}

function playTone(freq, type, dur, vol = 0.18, attack = 0.01) {
  if (!actx) return;
  const osc  = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(actx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const now = actx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

function playNoise(dur, vol = 0.1, filterFreq = 800) {
  if (!actx) return;
  const buf    = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src    = actx.createBufferSource();
  const gain   = actx.createGain();
  const filter = actx.createBiquadFilter();
  filter.type            = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value         = 0.8;

  src.buffer = buf;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(actx.destination);

  const now = actx.currentTime;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.start(now);
  src.stop(now + dur + 0.05);
}

/* ─── SFX públicos ─── */
export const SFX = {
  placeBomb() {
    ensureAudio();
    playTone(180, 'sine', 0.12, 0.2);
    playNoise(0.15, 0.12, 400);
  },

  explosion() {
    ensureAudio();
    playNoise(0.6, 0.28, 600);
    playTone(90,  'sawtooth', 0.45, 0.22, 0.005);
    playTone(160, 'sine',     0.2,  0.1);
  },

  enemyDie(scene) {
    if (scene && scene.sound) scene.sound.play('enemyDieSound');
  },

  // Director — crujido de papeles
  deathDirector() {
    ensureAudio();
    playNoise(0.3, 0.2, 1200);
    playTone(440, 'sawtooth', 0.4, 0.12, 0.01);
    playNoise(0.5, 0.15, 800);
  },

  // VP — silbido de caída de acciones
  deathVP() {
    ensureAudio();
    const osc  = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'sine';
    const now = actx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 1.0);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.1);
    playNoise(0.4, 0.1, 300);
  },

  // Manager — golpe de grapadora
  deathManager() {
    ensureAudio();
    playNoise(0.4, 0.25, 600);
    playTone(200, 'square', 0.3, 0.15, 0.005);
    playTone(150, 'square', 0.2, 0.1,  0.02);
    setTimeout(() => playNoise(0.2, 0.1, 400), 250);
  },

  // CEO — trombón triunfal que sale mal
  deathCEO() {
    ensureAudio();
    [523, 659, 784, 659, 523, 392, 330].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sawtooth', 0.35, 0.18, 0.02), i * 130)
    );
    setTimeout(() => {
      playNoise(0.8, 0.3, 200);
      playTone(80, 'sawtooth', 0.8, 0.25, 0.01);
    }, 700);
  },

  playerHit() {
    ensureAudio();
    playNoise(0.25, 0.22, 900);
    playTone(140, 'square', 0.2, 0.18, 0.005);
  },

  collectPower() {
    ensureAudio();
    [262, 330, 392, 523].forEach((f, i) =>
      setTimeout(() => playTone(f, 'square', 0.18, 0.1), i * 70)
    );
  },

  powerActivate() {
    ensureAudio();
    playTone(1400, 'square', 0.06, 0.08);
    playTone(900,  'square', 0.09, 0.1);
    playTone(600,  'sine',   0.14, 0.12);
  },

  levelUp() {
    ensureAudio();
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sine', 0.3, 0.15), i * 110)
    );
    setTimeout(() => playNoise(0.3, 0.06, 1200), 200);
  },

  gameOver() {
    ensureAudio();
    [300, 250, 200, 160, 120].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sawtooth', 0.5, 0.2, 0.02), i * 220)
    );
  },

  freeze() {
    ensureAudio();
    playTone(800, 'sine',     0.8, 0.09, 0.02);
    playTone(600, 'triangle', 1.0, 0.07, 0.03);
    playNoise(0.4, 0.06, 500);
  },

  uiClick() {
    ensureAudio();
    playTone(523, 'sine', 0.07, 0.12);
    playTone(659, 'sine', 0.05, 0.1);
  },
};