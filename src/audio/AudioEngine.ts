/** Controls for the soundtrack once it is routed through the game's audio. */
export interface MusicBus {
  setMuffled(muffled: boolean): void;
}

const MUSIC_VOLUME = 0.7;
const MUFFLED_VOLUME = 0.45;
const MUFFLED_CUTOFF = 650;

/**
 * All game sound is synthesised with the Web Audio API: no audio files to
 * load. Browsers only allow sound after a user gesture, so nothing plays
 * until `unlock()` is called from a click.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private sawGain: GainNode | null = null;
  private sawFilter: BiquadFilterNode | null = null;
  private muted: boolean;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return; // No Web Audio: the game still works silently.
      }
      this.build(this.ctx);
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Routes the soundtrack through a low-pass filter into the master volume,
   * so mute covers it and it can be muffled. Null before `unlock()`.
   */
  connectMusic(element: HTMLMediaElement): MusicBus | null {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    const source = ctx.createMediaElementSource(element);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20000;
    const gain = ctx.createGain();
    gain.gain.value = MUSIC_VOLUME;
    source.connect(filter).connect(gain).connect(this.master);
    return {
      setMuffled: (muffled) => {
        const now = ctx.currentTime;
        filter.frequency.setTargetAtTime(muffled ? MUFFLED_CUTOFF : 20000, now, 0.4);
        gain.gain.setTargetAtTime(muffled ? MUFFLED_VOLUME : MUSIC_VOLUME, now, 0.4);
      },
    };
  }

  /** 0..1: how hard the wind is rushing past the kite. */
  setWind(level: number): void {
    if (!this.ctx || !this.windGain || !this.windFilter) return;
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.04 + level * 0.14, now, 0.3);
    this.windFilter.frequency.setTargetAtTime(300 + level * 600, now, 0.3);
  }

  /** 0..1: the zip of your dor rubbing in a pecha. 0 = silent. */
  setSaw(level: number): void {
    if (!this.ctx || !this.sawGain || !this.sawFilter) return;
    const now = this.ctx.currentTime;
    this.sawGain.gain.setTargetAtTime(level * 0.22, now, 0.05);
    this.sawFilter.frequency.setTargetAtTime(1800 + level * 2600, now, 0.05);
  }

  /** A line snapping. */
  snap(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noiseBurst(t, 0.07, 'highpass', 3500, 0.5);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(this.out());
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** The rooftops erupt: crowd roar plus a few voices shouting. */
  cheer(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.noiseBurst(t, 2.2, 'bandpass', 900, 0.35, 0.25);
    for (let i = 0; i < 6; i++) {
      const start = t + Math.random() * 0.4;
      const base = 180 + Math.random() * 220;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.linearRampToValueAtTime(base * 1.45, start + 0.35);
      osc.frequency.linearRampToValueAtTime(base * 1.2, start + 0.9);
      filter.type = 'lowpass';
      filter.frequency.value = 1300;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1);
      osc.connect(filter).connect(gain).connect(this.out());
      osc.start(start);
      osc.stop(start + 1.05);
    }
  }

  /** A short dhol flourish: dha, tak-tak, dha, tak. */
  dhol(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const hits: readonly [number, 'dha' | 'tak'][] = [
      [0, 'dha'],
      [0.16, 'tak'],
      [0.24, 'tak'],
      [0.4, 'dha'],
      [0.56, 'tak'],
    ];
    for (const [offset, kind] of hits) {
      const at = t + offset;
      if (kind === 'dha') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(120, at);
        osc.frequency.exponentialRampToValueAtTime(55, at + 0.18);
        gain.gain.setValueAtTime(0.7, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
        osc.connect(gain).connect(this.out());
        osc.start(at);
        osc.stop(at + 0.36);
      } else {
        this.noiseBurst(at, 0.06, 'highpass', 2200, 0.3);
      }
    }
  }

  /** Your kite is gone. */
  lose(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 1.2);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    osc.connect(gain).connect(this.out());
    osc.start(t);
    osc.stop(t + 1.35);
  }

  private build(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    const length = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.loopNoise().connect(this.windFilter).connect(this.windGain).connect(this.master);

    this.sawFilter = ctx.createBiquadFilter();
    this.sawFilter.type = 'bandpass';
    this.sawFilter.frequency.value = 2500;
    this.sawFilter.Q.value = 4;
    this.sawGain = ctx.createGain();
    this.sawGain.gain.value = 0;
    this.loopNoise().connect(this.sawFilter).connect(this.sawGain).connect(this.master);
  }

  private out(): AudioNode {
    if (!this.master) throw new Error('AudioEngine used before unlock()');
    return this.master;
  }

  private loopNoise(): AudioBufferSourceNode {
    if (!this.ctx) throw new Error('AudioEngine used before unlock()');
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.start();
    return source;
  }

  private noiseBurst(
    at: number,
    duration: number,
    type: BiquadFilterType,
    frequency: number,
    peak: number,
    attack = 0.005,
  ): void {
    if (!this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.out());
    source.start(at, Math.random());
    source.stop(at + duration + 0.05);
  }
}
