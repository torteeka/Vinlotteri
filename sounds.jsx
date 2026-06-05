/* sounds.jsx — synth helpers via Web Audio.
   We avoid loading audio files. Sounds are short, percussive, wine-vibe. */

let __ctx = null;
function ctx() {
  if (!__ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    __ctx = AC ? new AC() : null;
  }
  if (__ctx && __ctx.state === "suspended") __ctx.resume();
  return __ctx;
}

function tone({ freq = 800, dur = 0.05, type = "sine", gain = 0.18, attack = 0.005, decay = 0.04, when = 0, detune = 0 }) {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (detune) o.detune.value = detune;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + attack + decay + dur + 0.05);
}

const Sound = {
  enabled: true,
  set(on) { Sound.enabled = !!on; },
  tick() {
    if (!Sound.enabled) return;
    // Quick light tick, slight pitch jitter to feel mechanical.
    const f = 700 + Math.random() * 220;
    tone({ freq: f, dur: 0.02, type: "triangle", gain: 0.10, attack: 0.001, decay: 0.05 });
  },
  cellTick() {
    if (!Sound.enabled) return;
    const f = 900 + Math.random() * 350;
    tone({ freq: f, dur: 0.02, type: "square", gain: 0.07, attack: 0.001, decay: 0.04 });
  },
  rowSettle() {
    if (!Sound.enabled) return;
    tone({ freq: 420, dur: 0.12, type: "sine", gain: 0.18, attack: 0.005, decay: 0.18 });
    tone({ freq: 630, dur: 0.12, type: "sine", gain: 0.12, attack: 0.005, decay: 0.18, when: 0.04 });
  },
  jump() {
    if (!Sound.enabled) return;
    tone({ freq: 1300, dur: 0.04, type: "triangle", gain: 0.18, attack: 0.001, decay: 0.06 });
  },
  fanfare() {
    if (!Sound.enabled) return;
    // C5 - E5 - G5 - C6 arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      tone({ freq: f, dur: 0.18, type: "triangle", gain: 0.22, attack: 0.005, decay: 0.2, when: i * 0.085 });
      tone({ freq: f / 2, dur: 0.22, type: "sine", gain: 0.10, attack: 0.005, decay: 0.22, when: i * 0.085 });
    });
    // Sparkle tail
    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        tone({ freq: 1500 + Math.random() * 1200, dur: 0.05, type: "sine", gain: 0.08, attack: 0.001, decay: 0.1, when: i * 0.03 });
      }
    }, 360);
  },
  pop() {
    if (!Sound.enabled) return;
    tone({ freq: 320, dur: 0.04, type: "sine", gain: 0.25, attack: 0.001, decay: 0.06 });
    tone({ freq: 80, dur: 0.05, type: "sine", gain: 0.18, attack: 0.001, decay: 0.08, when: 0.005 });
  },
};

window.Sound = Sound;
