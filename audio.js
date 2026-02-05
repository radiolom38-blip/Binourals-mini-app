/* ===============================
   ХРАМ ЗВУКА — АУДИО ЯДРО v5
   ЭТАП (5): АДАПТИВНАЯ СТАБИЛИЗАЦИЯ
   =============================== */

let audioCtx = null;

/* --- ОСНОВА --- */
let oscL, oscR, subOscL, subOscR;

/* --- ГАРМОНИКИ --- */
let harm2L, harm2R, harm3L, harm3R;

/* --- ГЕЙНЫ --- */
let masterGain = null;

/* --- ВРЕМЯ И СОСТОЯНИЕ --- */
let raf = null;
let startTime = 0;
let cfg = null;

/* --- АДАПТАЦИЯ --- */
let adapt = {
  driftScale: 1.0,
  spaceScale: 1.0,
  targetDrift: 1.0,
  targetSpace: 1.0,
  lastShift: 0
};

/* ---------- СОСТОЯНИЯ ---------- */

const STATES = {
  sleep:       { base: 96,  drift: 0.8 },
  meditation: { base: 108, drift: 1.2 },
  relax:       { base: 120, drift: 1.0 },
  work:        { base: 156, drift: 1.6 },
  clarity:     { base: 174, drift: 1.4 }
};

/* ===============================
   ЗАПУСК РИТУАЛА
   =============================== */

function startRitual(stateKey) {
  if (audioCtx) return;

  cfg = STATES[stateKey];
  if (!cfg) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startTime = audioCtx.currentTime;

  /* --- ОСЦИЛЛЯТОРЫ --- */
  oscL = audioCtx.createOscillator();
  oscR = audioCtx.createOscillator();
  subOscL = audioCtx.createOscillator();
  subOscR = audioCtx.createOscillator();
  harm2L = audioCtx.createOscillator();
  harm2R = audioCtx.createOscillator();
  harm3L = audioCtx.createOscillator();
  harm3R = audioCtx.createOscillator();

  [
    oscL, oscR, subOscL, subOscR,
    harm2L, harm2R, harm3L, harm3R
  ].forEach(o => o.type = "sine");

  /* --- ГЕЙНЫ --- */
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.18;

  const subGain = audioCtx.createGain();
  subGain.gain.value = 0.035;

  const h2Gain = audioCtx.createGain();
  h2Gain.gain.value = 0.04;

  const h3Gain = audioCtx.createGain();
  h3Gain.gain.value = 0.02;

  /* --- ПАНОРАМА --- */
  const panL = audioCtx.createStereoPanner();
  const panR = audioCtx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;

  /* --- СОЕДИНЕНИЯ --- */
  oscL.connect(panL).connect(masterGain);
  oscR.connect(panR).connect(masterGain);
  subOscL.connect(subGain).connect(masterGain);
  subOscR.connect(subGain).connect(masterGain);

  harm2L.connect(h2Gain).connect(panL).connect(masterGain);
  harm2R.connect(h2Gain).connect(panR).connect(masterGain);
  harm3L.connect(h3Gain).connect(panL).connect(masterGain);
  harm3R.connect(h3Gain).connect(panR).connect(masterGain);

  masterGain.connect(audioCtx.destination);

  /* --- СТАРТ --- */
  [
    oscL, oscR, subOscL, subOscR,
    harm2L, harm2R, harm3L, harm3R
  ].forEach(o => o.start());

  loop();
}

/* ===============================
   ОСНОВНОЙ ЦИКЛ
   =============================== */

function loop() {
  if (!audioCtx) return;

  const t = audioCtx.currentTime - startTime;

  /* --- АДАПТИВНЫЙ СДВИГ (раз в ~3 мин) --- */
  if (t - adapt.lastShift > 160) {
    adapt.lastShift = t;
    adapt.targetDrift = 0.9 + Math.random() * 0.2;
    adapt.targetSpace = 0.9 + Math.random() * 0.2;
  }

  adapt.driftScale += (adapt.targetDrift - adapt.driftScale) * 0.0005;
  adapt.spaceScale += (adapt.targetSpace - adapt.spaceScale) * 0.0005;

  /* --- ЧАСТОТНЫЙ ДРЕЙФ --- */
  const d =
    Math.sin(t * 0.15) *
    cfg.drift *
    adapt.driftScale;

  const baseL = cfg.base + d;
  const baseR = cfg.base - d * 0.6;

  oscL.frequency.setValueAtTime(baseL, audioCtx.currentTime);
  oscR.frequency.setValueAtTime(baseR, audioCtx.currentTime);
  subOscL.frequency.setValueAtTime(baseL - 2.2, audioCtx.currentTime);
  subOscR.frequency.setValueAtTime(baseR - 1.8, audioCtx.currentTime);

  harm2L.frequency.setValueAtTime(baseL * 2, audioCtx.currentTime);
  harm2R.frequency.setValueAtTime(baseR * 2, audioCtx.currentTime);
  harm3L.frequency.setValueAtTime(baseL * 3, audioCtx.currentTime);
  harm3R.frequency.setValueAtTime(baseR * 3, audioCtx.currentTime);

  /* --- ПРОСТРАНСТВО --- */
  const space =
    1 +
    Math.sin(t * 0.025 + Math.sin(t * 0.004)) *
    0.018 *
    adapt.spaceScale;

  masterGain.gain.setValueAtTime(
    0.18 * space,
    audioCtx.currentTime
  );

  raf = requestAnimationFrame(loop);
}

/* ===============================
   МЯГКИЙ ВЫХОД
   =============================== */

function stopRitual() {
  if (!audioCtx || !masterGain) return;

  if (raf) cancelAnimationFrame(raf);
  raf = null;

  const now = audioCtx.currentTime;

  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.0001, now + 6);

  setTimeout(() => {
    try {
      [
        oscL, oscR, subOscL, subOscR,
        harm2L, harm2R, harm3L, harm3R
      ].forEach(o => o.stop());
    } catch(e) {}

    audioCtx.close();
    audioCtx = null;
    masterGain = null;
  }, 6500);
}

/* ===============================
   API
   =============================== */

window.TempleAudio = {
  start: startRitual,
  stop: stopRitual
};
