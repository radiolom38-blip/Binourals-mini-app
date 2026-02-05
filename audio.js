/* ===============================
   ХРАМ ЗВУКА — АУДИО ЯДРО v3
   ЭТАП (3): СПЕКТРАЛЬНЫЕ СЛОИ
   =============================== */

let audioCtx = null;

/* --- ОСНОВА --- */
let oscL = null;
let oscR = null;
let subOscL = null;
let subOscR = null;

/* --- ГАРМОНИКИ --- */
let harm2L = null;
let harm2R = null;
let harm3L = null;
let harm3R = null;

let gainNode = null;
let driftRAF = null;
let driftStartTime = 0;
let driftCfg = null;

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

  const cfg = STATES[stateKey];
  if (!cfg) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  /* --- ОСНОВНЫЕ ОСЦИЛЛЯТОРЫ --- */
  oscL = audioCtx.createOscillator();
  oscR = audioCtx.createOscillator();
  subOscL = audioCtx.createOscillator();
  subOscR = audioCtx.createOscillator();

  oscL.type = oscR.type = "sine";
  subOscL.type = subOscR.type = "sine";

  oscL.frequency.value = cfg.base;
  oscR.frequency.value = cfg.base * 1.004;

  subOscL.frequency.value = cfg.base - 2.2;
  subOscR.frequency.value = cfg.base - 1.8;

  /* --- ГАРМОНИКИ --- */
  harm2L = audioCtx.createOscillator();
  harm2R = audioCtx.createOscillator();
  harm3L = audioCtx.createOscillator();
  harm3R = audioCtx.createOscillator();

  harm2L.type = harm2R.type = "sine";
  harm3L.type = harm3R.type = "sine";

  harm2L.frequency.value = oscL.frequency.value * 2;
  harm2R.frequency.value = oscR.frequency.value * 2;
  harm3L.frequency.value = oscL.frequency.value * 3;
  harm3R.frequency.value = oscR.frequency.value * 3;

  /* --- ГЕЙНЫ --- */
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.18;

  const subGain = audioCtx.createGain();
  subGain.gain.value = 0.035;

  const harm2Gain = audioCtx.createGain();
  harm2Gain.gain.value = 0.04;

  const harm3Gain = audioCtx.createGain();
  harm3Gain.gain.value = 0.02;

  /* --- ПАНОРАМА --- */
  const panL = audioCtx.createStereoPanner();
  const panR = audioCtx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;

  /* --- СОЕДИНЕНИЯ --- */
  oscL.connect(panL).connect(gainNode);
  oscR.connect(panR).connect(gainNode);

  subOscL.connect(subGain).connect(gainNode);
  subOscR.connect(subGain).connect(gainNode);

  harm2L.connect(harm2Gain).connect(panL).connect(gainNode);
  harm2R.connect(harm2Gain).connect(panR).connect(gainNode);

  harm3L.connect(harm3Gain).connect(panL).connect(gainNode);
  harm3R.connect(harm3Gain).connect(panR).connect(gainNode);

  gainNode.connect(audioCtx.destination);

  /* --- СТАРТ --- */
  oscL.start();
  oscR.start();
  subOscL.start();
  subOscR.start();
  harm2L.start();
  harm2R.start();
  harm3L.start();
  harm3R.start();

  startDrift(cfg);
}

/* ===============================
   ДРЕЙФ (ПЛАВНЫЙ, НЕПРЕРЫВНЫЙ)
   =============================== */

function startDrift(cfg) {
  driftCfg = cfg;
  driftStartTime = audioCtx.currentTime;

  const tick = () => {
    if (!audioCtx) return;

    const t = audioCtx.currentTime - driftStartTime;

    const d = Math.sin(t * 0.15) * driftCfg.drift;
    const sd = Math.sin(t * 0.09 + 1.7) * driftCfg.drift * 0.4;

    const baseL = driftCfg.base + d;
    const baseR = driftCfg.base - d * 0.6;

    oscL.frequency.setValueAtTime(baseL, audioCtx.currentTime);
    oscR.frequency.setValueAtTime(baseR, audioCtx.currentTime);

    subOscL.frequency.setValueAtTime(baseL - 2.2 + sd, audioCtx.currentTime);
    subOscR.frequency.setValueAtTime(baseR - 1.8 - sd, audioCtx.currentTime);

    harm2L.frequency.setValueAtTime(baseL * 2, audioCtx.currentTime);
    harm2R.frequency.setValueAtTime(baseR * 2, audioCtx.currentTime);
    harm3L.frequency.setValueAtTime(baseL * 3, audioCtx.currentTime);
    harm3R.frequency.setValueAtTime(baseR * 3, audioCtx.currentTime);

    const res = (d / driftCfg.drift + 1) / 2;
    document.documentElement.style.setProperty("--res", res.toFixed(3));

    driftRAF = requestAnimationFrame(tick);
  };

  tick();
}

/* ===============================
   МЯГКИЙ ВЫХОД
   =============================== */

function stopRitual() {
  if (!audioCtx || !gainNode) return;

  if (driftRAF) cancelAnimationFrame(driftRAF);
  driftRAF = null;

  const now = audioCtx.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + 6);

  setTimeout(() => {
    try {
      oscL.stop();
      oscR.stop();
      subOscL.stop();
      subOscR.stop();
      harm2L.stop();
      harm2R.stop();
      harm3L.stop();
      harm3R.stop();
    } catch(e) {}

    audioCtx.close();

    audioCtx = null;
    oscL = oscR = subOscL = subOscR = null;
    harm2L = harm2R = harm3L = harm3R = null;
    gainNode = null;
  }, 6500);
}

/* ===============================
   API
   =============================== */

window.TempleAudio = {
  start: startRitual,
  stop: stopRitual
};
