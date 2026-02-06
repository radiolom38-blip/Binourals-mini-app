/* ===============================
   ХРАМ ЗВУКА — АУДИО ЯДРО v8
   С ПРЕСЕТАМИ СОСТОЯНИЙ + ОБНОВЛЁННЫЙ ШУМ
   ДИНАМИЧНЫЙ ДРЕЙФ + МИКРО-ИЗМЕНЕНИЯ + ШУМ ДЛЯ КАЖДОГО СОСТОЯНИЯ
   Шумы тише + добавки (природа, шуман)
   + УПРАВЛЕНИЕ ГРОМКОСТЬЮ
   =============================== */

const TempleAudio = (function() {
  let audioCtx = null;
  let nodes = {};
  let noiseSource = null;
  let noiseGain = null;
  let natureSource = null;
  let natureGain = null;
  let schumannL = null;
  let schumannR = null;
  let schumannGain = null;
  let rafId = null;
  let startTime = 0;
  let lastMicroChange = 0;
  let microTarget = 0;
  let microSpeed = 0;
  let currentPreset = null;
  let volumeMultiplier = 0.8;

  /* ===============================
     ПРЕСЕТЫ СОСТОЯНИЙ
     (биение ≈ разница L/R, база — несущая, дрейф — динамика, шум — текстура)
     Шумы тише (0.08-0.15), + добавки для природы (имитация через pink + фильтры) и Шумана (отдельный бинауральный слой 7.83 Гц)
     =============================== */

  const STATES = {
    delta: {  // Глубокий сон: brown + звуки природы (pink с low-pass для rain-like)
      name: "Глубокий сон",
      beat: 2,
      base: 140,
      drift: 0.8,
      longDrift: 3,
      longSpeed: 0.0009,
      microChance: 0.008,
      subOffset: 2.5,
      masterVol: 0.16,
      subVol: 0.03,
      harm2Vol: 0.025,
      harm3Vol: 0.015,
      noiseType: 'brown',
      noiseVol: 0.15,  // тише
      natureType: 'pink_rain',  // добавка: pink с фильтрами для имитации природы/дождя
      natureVol: 0.12,
      schumann: false,
    },
    theta: {  // Медитация: brown + частота Шумана (7.83 Гц в отдельном слое)
      name: "Медитация",
      beat: 6,
      base: 180,
      drift: 1.4,
      longDrift: 5,
      longSpeed: 0.0012,
      microChance: 0.012,
      subOffset: 2.0,
      masterVol: 0.18,
      subVol: 0.035,
      harm2Vol: 0.04,
      harm3Vol: 0.02,
      noiseType: 'brown',
      noiseVol: 0.12,  // тише
      natureType: null,
      natureVol: 0,
      schumann: true,  // добавка: бинауральный 7.83 Гц
    },
    alpha: {  // Расслабление: pink + звуки природы (pink с low-pass)
      name: "Расслабление",
      beat: 10,
      base: 220,
      drift: 1.8,
      longDrift: 6,
      longSpeed: 0.0014,
      microChance: 0.015,
      subOffset: 1.8,
      masterVol: 0.20,
      subVol: 0.04,
      harm2Vol: 0.045,
      harm3Vol: 0.025,
      noiseType: 'pink',
      noiseVol: 0.10,  // тише
      natureType: 'pink_rain',
      natureVol: 0.08,
      schumann: false,
    },
    beta: {   // Фокус и работа: white
      name: "Фокус и работа",
      beat: 20,
      base: 300,
      drift: 2.2,
      longDrift: 8,
      longSpeed: 0.0016,
      microChance: 0.018,
      subOffset: 1.5,
      masterVol: 0.22,
      subVol: 0.045,
      harm2Vol: 0.05,
      harm3Vol: 0.03,
      noiseType: 'white',
      noiseVol: 0.09,  // тише
      natureType: null,
      natureVol: 0,
      schumann: false,
    },
    gamma: {  // Ясность: white
      name: "Ясность",
      beat: 40,
      base: 420,
      drift: 1.2,
      longDrift: 4,
      longSpeed: 0.0010,
      microChance: 0.010,
      subOffset: 1.0,
      masterVol: 0.19,
      subVol: 0.032,
      harm2Vol: 0.035,
      harm3Vol: 0.018,
      noiseType: 'white',
      noiseVol: 0.08,  // тише
      natureType: null,
      natureVol: 0,
      schumann: false,
    }
  };

  /* ===============================
     СОЗДАНИЕ УЗЛОВ (ОСЦИЛЛЯТОРЫ + ШУМ + ДОБАВКИ)
     =============================== */

  function createNodes() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Осцилляторы
    nodes.oscL = audioCtx.createOscillator();
    nodes.oscR = audioCtx.createOscillator();
    nodes.subL = audioCtx.createOscillator();
    nodes.subR = audioCtx.createOscillator();
    nodes.h2L  = audioCtx.createOscillator();
    nodes.h2R  = audioCtx.createOscillator();
    nodes.h3L  = audioCtx.createOscillator();
    nodes.h3R  = audioCtx.createOscillator();

    [nodes.oscL, nodes.oscR, nodes.subL, nodes.subR,
     nodes.h2L, nodes.h2R, nodes.h3L, nodes.h3R].forEach(o => o.type = 'sine');

    // Гейны
    nodes.masterGain = audioCtx.createGain();
    nodes.subGain    = audioCtx.createGain();
    nodes.h2Gain     = audioCtx.createGain();
    nodes.h3Gain     = audioCtx.createGain();

    noiseGain = audioCtx.createGain();
    natureGain = audioCtx.createGain();

    // Панорама
    nodes.panL = audioCtx.createStereoPanner(); nodes.panL.pan.value = -1;
    nodes.panR = audioCtx.createStereoPanner(); nodes.panR.pan.value = 1;

    // Соединения для осцилляторов
    nodes.oscL.connect(nodes.panL).connect(nodes.masterGain);
    nodes.oscR.connect(nodes.panR).connect(nodes.masterGain);

    nodes.subL.connect(nodes.subGain).connect(nodes.masterGain);
    nodes.subR.connect(nodes.subGain).connect(nodes.masterGain);

    nodes.h2L.connect(nodes.h2Gain).connect(nodes.panL).connect(nodes.masterGain);
    nodes.h2R.connect(nodes.h2Gain).connect(nodes.panR).connect(nodes.masterGain);

    nodes.h3L.connect(nodes.h3Gain).connect(nodes.panL).connect(nodes.masterGain);
    nodes.h3R.connect(nodes.h3Gain).connect(nodes.panR).connect(nodes.masterGain);

    // Шумы подключаем через master
    noiseGain.connect(nodes.masterGain);
    natureGain.connect(nodes.masterGain);

    nodes.masterGain.connect(audioCtx.destination);

    // Применяем пресет
    applyPresetVolumes();
    applyPresetNoise();
    applyPresetNature();
    applyPresetSchumann();

    // Старт осцилляторов
    Object.values(nodes).filter(n => n instanceof OscillatorNode).forEach(o => o.start());

    // Fade-in для всего
    const now = audioCtx.currentTime;
    nodes.masterGain.gain.setValueAtTime(0.0001, now);
    nodes.masterGain.gain.linearRampToValueAtTime(currentPreset.masterVol * volumeMultiplier, now + 3);
  }

  function applyPresetVolumes() {
    nodes.subGain.gain.value    = currentPreset.subVol;
    nodes.h2Gain.gain.value     = currentPreset.harm2Vol;
    nodes.h3Gain.gain.value     = currentPreset.harm3Vol;
  }

  /* ===============================
     СОЗДАНИЕ ОСНОВНОГО ШУМА (WHITE / PINK / BROWN)
     =============================== */

  function createNoise(type) {
    if (noiseSource) {
      noiseSource.stop();
      noiseSource.disconnect();
      noiseSource = null;
    }
    if (type === 'off' || !type) {
      noiseGain.gain.value = 0;
      return;
    }

    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    let outputNode = noiseSource;

    if (type !== 'white') {
      const b0 = audioCtx.createBiquadFilter();
      const b1 = audioCtx.createBiquadFilter();
      const b2 = audioCtx.createBiquadFilter();

      b0.type = 'lowshelf';   b0.frequency.value = 150;   b0.gain.value = (type === 'brown') ? 12 : 3;
      b1.type = 'peaking';    b1.frequency.value = 400;   b1.gain.value = (type === 'brown') ? 6 : 1.5;  b1.Q.value = 0.5;
      b2.type = 'highshelf';  b2.frequency.value = 3000;  b2.gain.value = (type === 'brown') ? -18 : -6;

      outputNode.connect(b0);
      b0.connect(b1);
      b1.connect(b2);
      outputNode = b2;
    }

    outputNode.connect(noiseGain);
    noiseSource.start();
  }

  function applyPresetNoise() {
    const type = currentPreset.noiseType || 'off';
    const vol = currentPreset.noiseVol || 0;

    createNoise(type);

    const now = audioCtx.currentTime;
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(vol, now + 4);
  }

  /* ===============================
     СОЗДАНИЕ ДОБАВКИ "ЗВУКИ ПРИРОДЫ" (PINK С ФИЛЬТРАМИ ДЛЯ RAIN-LIKE)
     =============================== */

  function createNature(type) {
    if (natureSource) {
      natureSource.stop();
      natureSource.disconnect();
      natureSource = null;
    }
    if (type === 'off' || !type) {
      natureGain.gain.value = 0;
      return;
    }

    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    natureSource = audioCtx.createBufferSource();
    natureSource.buffer = buffer;
    natureSource.loop = true;

    // Фильтры для имитации природы (pink + low-pass + notch для rain/wind)
    const lowPass = audioCtx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 800;  // обрезаем высокие для "мягкого дождя"
    lowPass.Q.value = 0.8;

    const notch = audioCtx.createBiquadFilter();
    notch.type = 'notch';
    notch.frequency.value = 1200;  // лёгкий "ветер"
    notch.Q.value = 1.2;

    natureSource.connect(lowPass);
    lowPass.connect(notch);
    notch.connect(natureGain);

    natureSource.start();
  }

  function applyPresetNature() {
    const type = currentPreset.natureType || 'off';
    const vol = currentPreset.natureVol || 0;

    createNature(type);

    const now = audioCtx.currentTime;
    natureGain.gain.setValueAtTime(0.0001, now);
    natureGain.gain.linearRampToValueAtTime(vol, now + 4);
  }

  /* ===============================
     СОЗДАНИЕ ШУМАНА (7.83 Гц БИНАУРАЛЬНЫЙ СЛОЙ)
     =============================== */

  function applyPresetSchumann() {
    if (!currentPreset.schumann) return;

    schumannL = audioCtx.createOscillator();
    schumannR = audioCtx.createOscillator();
    schumannGain = audioCtx.createGain();

    schumannL.type = 'sine';
    schumannR.type = 'sine';

    // Базовая несущая для Шумана (низкая, ~100 Гц, разница 7.83)
    schumannL.frequency.value = 100;
    schumannR.frequency.value = 107.83;

    schumannGain.gain.value = 0.0001;  // тихо, но слышимо
    schumannGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 4);  // vol 0.12 - тише основного резонанса

    schumannL.connect(schumannGain);
    schumannR.connect(schumannGain);
    schumannGain.connect(nodes.masterGain);

    schumannL.start();
    schumannR.start();
  }

  /* ===============================
     ДРЕЙФ + МИКРО (ДИНАМИКА)
     =============================== */

  function updateFrequencies(t) {
    const p = currentPreset;

    // Долгий эволюционный дрейф
    const longDrift = Math.sin(t * p.longSpeed) * p.longDrift;

    // Основной быстрый дрейф
    const fastD  = Math.sin(t * 0.15) * p.drift;
    const fastD2 = Math.sin(t * 0.09 + 1.7) * p.drift * 0.4;

    // Микро-изменения
    if (Math.random() < p.microChance && (t - lastMicroChange) > 18) {
      microTarget = (Math.random() - 0.5) * 1.6;
      microSpeed = (microTarget > 0 ? 0.018 : -0.018);
      lastMicroChange = t;
    }
    const micro = microTarget * Math.sin((t - lastMicroChange) * 0.8);

    // База с дрейфом
    const base = p.base + longDrift + micro * 0.7;

    // L/R
    const baseL = base + fastD;
    const baseR = base + p.beat - fastD * 0.6;

    nodes.oscL.frequency.setValueAtTime(baseL, audioCtx.currentTime);
    nodes.oscR.frequency.setValueAtTime(baseR, audioCtx.currentTime);

    nodes.subL.frequency.setValueAtTime(baseL - p.subOffset + fastD2, audioCtx.currentTime);
    nodes.subR.frequency.setValueAtTime(baseR - p.subOffset - fastD2 * 0.7, audioCtx.currentTime);

    nodes.h2L.frequency.setValueAtTime(baseL * 2.01, audioCtx.currentTime);
    nodes.h2R.frequency.setValueAtTime(baseR * 1.99, audioCtx.currentTime);
    nodes.h3L.frequency.setValueAtTime(baseL * 3.02, audioCtx.currentTime);
    nodes.h3R.frequency.setValueAtTime(baseR * 2.98, audioCtx.currentTime);

    // Дыхание громкости
    nodes.masterGain.gain.setValueAtTime(
      p.masterVol * volumeMultiplier * (1 + Math.sin(t * 0.025) * 0.018),
      audioCtx.currentTime
    );
  }

  function startDrift() {
    startTime = audioCtx.currentTime;
    lastMicroChange = startTime;

    const tick = () => {
      if (!audioCtx || !nodes.masterGain) return;

      const t = audioCtx.currentTime - startTime;
      updateFrequencies(t);

      rafId = requestAnimationFrame(tick);
    };

    tick();
  }

  /* ===============================
     API
     =============================== */

  return {
    start(stateKey) {
      if (audioCtx) return;

      currentPreset = STATES[stateKey] || STATES.theta;

      createNodes();
      startDrift();
    },

    stop() {
      if (!audioCtx) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const now = audioCtx.currentTime;
      nodes.masterGain.gain.cancelScheduledValues(now);
      nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, now);
      nodes.masterGain.gain.linearRampToValueAtTime(0.0001, now + 6);

      setTimeout(() => {
        Object.values(nodes).filter(n => n instanceof OscillatorNode).forEach(o => {
          try { o.stop(); } catch {}
        });
        if (noiseSource) noiseSource.stop();
        if (natureSource) natureSource.stop();
        if (schumannL) schumannL.stop();
        if (schumannR) schumannR.stop();
        audioCtx.close().catch(() => {});
        audioCtx = null;
        nodes = {};
        noiseSource = null;
        natureSource = null;
        schumannL = null;
        schumannR = null;
        currentPreset = null;
      }, 6500);
    },

    setVolume(volume) {
      volumeMultiplier = Math.max(0, Math.min(1, volume));
      if (audioCtx && nodes.masterGain && currentPreset) {
        const now = audioCtx.currentTime;
        nodes.masterGain.gain.cancelScheduledValues(now);
        nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, now);
        nodes.masterGain.gain.linearRampToValueAtTime(
          currentPreset.masterVol * volumeMultiplier,
          now + 0.1
        );
      }
    }
  };
})();

window.TempleAudio = TempleAudio;
