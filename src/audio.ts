// Generative music engine — everything is synthesized live with the Web Audio API.
// No audio files, no licensing, infinite non-repeating-ish loops.

export type Mode = "lofi" | "synthwave" | "rain";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

// Chord voicings as MIDI notes (one chord per bar)
const PROGRESSIONS: Record<Exclude<Mode, "rain">, number[][]> = {
  lofi: [
    [53, 57, 60, 64], // Fmaj7
    [52, 55, 59, 62], // Em7
    [50, 53, 57, 60], // Dm7
    [48, 52, 55, 59], // Cmaj7
  ],
  synthwave: [
    [45, 52, 57, 60], // Am
    [41, 48, 53, 57], // F
    [48, 55, 60, 64], // C
    [43, 50, 55, 59], // G
  ],
};

const TEMPO: Record<Mode, number> = { lofi: 76, synthwave: 104, rain: 60 };

export class FlowAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: BiquadFilterNode;
  private noise?: AudioBuffer;
  private ambience?: AudioBufferSourceNode;
  private timer?: number;
  private step = 0;
  private nextTime = 0;
  mode: Mode = "lofi";
  playing = false;

  private init() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(comp);

    // warm, "tape-y" low-pass over all music
    this.music = ctx.createBiquadFilter();
    this.music.type = "lowpass";
    this.music.frequency.value = 1800;
    this.music.connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setVolume(v: number) {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  async play(mode: Mode) {
    this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    this.stopLoops();
    this.mode = mode;
    this.playing = true;
    this.music!.frequency.value = mode === "synthwave" ? 3200 : 1800;
    this.startAmbience(mode);
    if (mode !== "rain") {
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
  }

  stop() {
    this.playing = false;
    this.stopLoops();
    this.ctx?.suspend();
  }

  private stopLoops() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.ambience?.stop();
    this.ambience = undefined;
  }

  /** Vinyl crackle for lo-fi, soft rain for rain mode, tape hiss for synthwave. */
  private startAmbience(mode: Mode) {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      if (mode === "lofi") {
        d[i] = white * 0.015 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 0.9 : 0); // hiss + pops
      } else {
        last = (last + 0.02 * white) / 1.02; // brown-ish noise
        d[i] = last * (mode === "rain" ? 3.5 : 0.8);
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = mode === "rain" ? "bandpass" : "lowpass";
    filter.frequency.value = mode === "rain" ? 1200 : 4000;
    filter.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = mode === "rain" ? 0.9 : 0.5;
    src.connect(filter).connect(g).connect(this.master!);
    src.start();
    this.ambience = src;
  }

  private schedule() {
    const ctx = this.ctx!;
    const sixteenth = 60 / TEMPO[this.mode] / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, sixteenth);
      // lo-fi swing: delay every off-beat 16th
      const swing = this.mode === "lofi" && this.step % 2 === 0 ? 1.18 : this.mode === "lofi" ? 0.82 : 1;
      this.nextTime += sixteenth * swing;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number, sixteenth: number) {
    const mode = this.mode as Exclude<Mode, "rain">;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = PROGRESSIONS[mode][bar];

    if (s === 0) chord.forEach((n, i) => this.pad(midi(n), t + i * 0.012, sixteenth * 16, mode));

    if (mode === "lofi") {
      if (s === 0 || s === 10) this.kick(t, 0.9);
      if (s === 4 || s === 12) this.snare(t, 0.35);
      if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.08 : 0.05);
      // lazy melody notes from the chord, an octave up
      if ((s === 6 || s === 14) && Math.random() < 0.6) this.pluck(midi(chord[Math.floor(Math.random() * 4)] + 12), t);
    } else {
      if (s % 4 === 0) this.kick(t, 1);
      if (s === 4 || s === 12) this.snare(t, 0.5);
      this.hat(t, 0.04);
      // driving octave bass + arpeggio
      this.bass(midi(chord[0] - 12 + (s % 2 ? 12 : 0)), t, sixteenth);
      if (s % 2 === 0) this.pluck(midi(chord[(s / 2) % 4] + 12), t, "sawtooth");
    }
  }

  private pad(freq: number, t: number, dur: number, mode: Exclude<Mode, "rain">) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(mode === "lofi" ? 0.07 : 0.045, t + 0.4);
    g.gain.setTargetAtTime(0, t + dur - 0.3, 0.25);
    g.connect(this.music!);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = mode === "lofi" ? "triangle" : "sawtooth";
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 1);
    }
  }

  private pluck(freq: number, t: number, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(type === "sine" ? 0.12 : 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (type === "sine" ? 0.9 : 0.25));
    o.connect(g).connect(this.music!);
    o.start(t);
    o.stop(t + 1);
  }

  private bass(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
    o.connect(g).connect(this.music!);
    o.start(t);
    o.stop(t + dur);
  }

  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(t: number, vol: number, type: BiquadFilterType, freq: number, decay: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f).connect(g).connect(this.music!);
    src.start(t, Math.random());
    src.stop(t + decay + 0.05);
  }

  private snare(t: number, vol: number) {
    this.noiseHit(t, vol, "bandpass", 1800, 0.18);
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, vol, "highpass", 7000, 0.04);
  }
}
