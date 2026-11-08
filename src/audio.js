// Tiny synthesized sound engine — no external audio assets.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.started = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = 0.96 * last + 0.04 * w;
      data[i] = last * 2.6;
    }
    this.noiseBuffer = buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.55, this.ctx.currentTime + 0.12);
    }
    if (this.musicGain) {
      this.musicGain.gain.linearRampToValueAtTime(m ? 0 : 0.11, this.ctx.currentTime + 0.3);
    }
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  _tone({ f = 440, to = null, dur = 0.2, type = 'sine', vol = 0.2, delay = 0, attack = 0.005, dest = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.t + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.2, type = 'lowpass', f = 1000, q = 0.8, delay = 0, to = null }) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t0 = this.t + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(f, t0);
    if (to !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(filter); filter.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.04);
  }

  shoot() {
    this._tone({ f: 820 + Math.random() * 120, to: 340, dur: 0.13, type: 'triangle', vol: 0.07 });
    this._noise({ dur: 0.09, vol: 0.025, type: 'highpass', f: 1800 });
  }
  hit() {
    this._tone({ f: 150, to: 70, dur: 0.11, type: 'square', vol: 0.1 });
    this._noise({ dur: 0.08, vol: 0.08, f: 700 });
  }
  enemyDie() {
    this._tone({ f: 180, to: 42, dur: 0.36, type: 'sawtooth', vol: 0.11 });
    this._noise({ dur: 0.34, vol: 0.11, f: 900, to: 120 });
  }
  hurt() {
    this._tone({ f: 210, to: 58, dur: 0.4, type: 'sawtooth', vol: 0.2 });
    this._noise({ dur: 0.25, vol: 0.15, f: 500, to: 90 });
  }
  coin() {
    this._tone({ f: 1180, dur: 0.09, type: 'sine', vol: 0.12 });
    this._tone({ f: 1760, dur: 0.2, type: 'sine', vol: 0.1, delay: 0.07 });
  }
  heart() {
    [523, 659, 784].forEach((f, i) => this._tone({ f, dur: 0.22, type: 'sine', vol: 0.11, delay: i * 0.06 }));
  }
  item() {
    [392, 493, 587, 784].forEach((f, i) => this._tone({ f, dur: 0.7, type: 'triangle', vol: 0.09, delay: i * 0.1 }));
    this._tone({ f: 196, dur: 1.4, type: 'sine', vol: 0.08, delay: 0.1 });
  }
  bombPlace() {
    this._tone({ f: 320, to: 180, dur: 0.15, type: 'triangle', vol: 0.1 });
    this._noise({ dur: 0.12, vol: 0.04, f: 900 });
  }
  explosion() {
    this._noise({ dur: 0.7, vol: 0.32, f: 1100, to: 60 });
    this._tone({ f: 90, to: 28, dur: 0.6, type: 'sine', vol: 0.28 });
  }
  door() {
    this._noise({ dur: 0.5, vol: 0.1, f: 340, to: 90 });
    this._tone({ f: 70, to: 48, dur: 0.5, type: 'sine', vol: 0.12 });
  }
  clear() {
    [330, 415, 494, 660].forEach((f, i) => this._tone({ f, dur: 0.55, type: 'triangle', vol: 0.06, delay: i * 0.11 }));
  }
  bossRoar() {
    this._tone({ f: 74, to: 36, dur: 1.5, type: 'sawtooth', vol: 0.2 });
    this._noise({ dur: 1.3, vol: 0.16, f: 440, to: 70 });
  }
  bossHit() {
    this._tone({ f: 120, to: 55, dur: 0.18, type: 'square', vol: 0.09 });
  }
  tearBlock() {
    this._noise({ dur: 0.08, vol: 0.04, f: 2500 });
  }
  step() {
    this._noise({ dur: 0.06, vol: 0.018, f: 260, type: 'lowpass' });
  }
  ui() {
    this._tone({ f: 520, to: 640, dur: 0.08, type: 'triangle', vol: 0.05 });
  }
  victory() {
    [262, 330, 392, 523, 659, 784].forEach((f, i) =>
      this._tone({ f, dur: 1.5, type: 'triangle', vol: 0.07, delay: i * 0.18 }));
  }
  gameOver() {
    [220, 196, 165, 110].forEach((f, i) =>
      this._tone({ f, dur: 1.4, type: 'sawtooth', vol: 0.06, delay: i * 0.28 }));
  }

  startMusic() {
    if (!this.ctx || this.started) return;
    this.started = true;
    const t = this.t;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.muted ? 0 : 0.11;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.musicGain.connect(this.master);
    filter.connect(this.musicGain);

    const droneFreqs = [55, 55.35, 82.4, 110.2];
    droneFreqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = i === 0 ? 0.16 : 0.06;
      o.connect(g); g.connect(filter);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.04 + i * 0.017;
      const lg = this.ctx.createGain();
      lg.gain.value = 0.035;
      lfo.connect(lg); lg.connect(g.gain);
      o.start(t); lfo.start(t);
    });

    const wind = this.ctx.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;
    const wf = this.ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 160;
    const wg = this.ctx.createGain();
    wg.gain.value = 0.05;
    wind.connect(wf); wf.connect(wg); wg.connect(this.musicGain);
    wind.start(t);

    // A distant, irregular music-box note.
    const bell = () => {
      if (!this.ctx || this.muted) return;
      const notes = [523.25, 587.33, 659.25, 783.99, 880];
      const f = notes[Math.floor(Math.random() * notes.length)];
      this._tone({ f, dur: 2.8, type: 'sine', vol: 0.018, attack: 0.4, dest: this.musicGain });
      this._tone({ f: f * 2.01, dur: 2.2, type: 'sine', vol: 0.007, attack: 0.5, dest: this.musicGain });
      setTimeout(bell, 5000 + Math.random() * 9000);
    };
    setTimeout(bell, 3500);
  }
}
