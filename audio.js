<script>
/* ===============================
   ХРАМ ЗВУКА — АУДИО ЯДРО v4
   DEMO CORE
   ACTIVE MODE: BETA / WORK ONLY
   =============================== */

let audioCtx = null;

/* --- ОСЦИЛЛЯТОРЫ --- */
let oscL, oscR, subOscL, subOscR;
let harm2L, harm2R, harm3L, harm3R;

/* --- ГЕЙНЫ --- */
let masterGain = null;
let driftRAF = null;
let driftStartTime = 0;

/* ===============================
   🔒 ЕДИНСТВЕННАЯ КОНФИГУРАЦИЯ
   =============================== */

const WORK_CFG = {
  base: 156,   // BETA
  drift: 1.6
};

/* ===============================
   START (stateKey ИГНОРИРУЕТСЯ)
   =============================== */

function startRitual() {

  if (audioCtx) return;

  const cfg = WORK_CFG;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  /* --- ОСНОВА --- */
  oscL = audioCtx.createOscillator();
  oscR = audioCtx.createOscillator();
  subOscL = audioCtx.createOscillator();
  subOscR = audioCtx.createOscillator();

  [oscL, oscR, subOscL, subOscR].forEach(o => o.type = 'sine');

  oscL.frequency.value = cfg.base;
  oscR.frequency.value = cfg.base * 1.004;
  subOscL.frequency.value = cfg.base - 2.2;
  subOscR.frequency.value = cfg.base - 1.8;

  /* --- ГАРМОНИКИ --- */
  harm2L = audioCtx.createOscillator();
  harm2R = audioCtx.createOscillator();
  harm3L = audioCtx.createOscillator();
  harm3R = audioCtx.createOscillator();

  [harm2L, harm2R, harm3L, harm3R].forEach(o => o.type = 'sine');

  /* --- ГЕЙНЫ --- */
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.18;

  const subGain   = audioCtx.createGain(); subGain.gain.value   = 0.035;
  const harm2Gain = audioCtx.createGain(); harm2Gain.gain.value = 0.04;
  const harm3Gain = audioCtx.createGain(); harm3Gain.gain.value = 0.02;

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

  harm2L.connect(harm2Gain).connect(panL).connect(masterGain);
  harm2R.connect(harm2Gain).connect(panR).connect(masterGain);

  harm3L.connect(harm3Gain).connect(panL).connect(masterGain);
  harm3R.connect(harm3Gain).connect(panR).connect(masterGain);

  masterGain.connect(audioCtx.destination);

  [
    oscL, oscR, subOscL, subOscR,
    harm2L, harm2R, harm3L, harm3R
  ].forEach(o => o.start());

  startDrift(cfg);
}

/* ===============================
   DRIFT
   =============================== */

function startDrift(cfg) {
  driftStartTime = audioCtx.currentTime;

  const tick = () => {
    if (!audioCtx) return;

    const t = audioCtx.currentTime - driftStartTime;

    const d  = Math.sin(t * 0.15) * cfg.drift;
    const sd = Math.sin(t * 0.09 + 1.7) * cfg.drift * 0.4;

    const baseL = cfg.base + d;
    const baseR = cfg.base - d * 0.6;

    oscL.frequency.setValueAtTime(baseL, audioCtx.currentTime);
    oscR.frequency.setValueAtTime(baseR, audioCtx.currentTime);

    subOscL.frequency.setValueAtTime(baseL - 2.2 + sd, audioCtx.currentTime);
    subOscR.frequency.setValueAtTime(baseR - 1.8 - sd, audioCtx.currentTime);

    harm2L.frequency.setValueAtTime(baseL * 2, audioCtx.currentTime);
    harm2R.frequency.setValueAtTime(baseR * 2, audioCtx.currentTime);
    harm3L.frequency.setValueAtTime(baseL * 3, audioCtx.currentTime);
    harm3R.frequency.setValueAtTime(baseR * 3, audioCtx.currentTime);

    masterGain.gain.setValueAtTime(
      0.18 * (1 + Math.sin(t * 0.025) * 0.018),
      audioCtx.currentTime
    );

    driftRAF = requestAnimationFrame(tick);
  };

  tick();
}

/* ===============================
   STOP
   =============================== */

function stopRitual() {

  if (!audioCtx) return;

  if (driftRAF) cancelAnimationFrame(driftRAF);
  driftRAF = null;

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
    } catch {}

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
</script>
<script>
console.log('TempleAudio is', window.TempleAudio);
for (const k in window) {
  if (k.toLowerCase().includes('ritual') || k.toLowerCase().includes('audio')) {
    console.log('GLOBAL:', k);
  }
}
</script>
