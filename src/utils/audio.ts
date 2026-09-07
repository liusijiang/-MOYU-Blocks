import {
  PLACEMENT_AUDIO_CONFIG,
  DEBRIS_AUDIO_CONFIG,
} from '../constants/physicsAudioConfig';

/**
 * Web Audio API procedural sound synthesis engine.
 * Generates tactile, zero-latency sound effects without external audio files.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Read saved mute preference if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('block_puzzle_muted');
      if (saved === 'true') {
        this.isMuted = true;
      }
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('block_puzzle_muted', muted ? 'true' : 'false');
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    return next;
  }

  /**
   * 0. Tactile piece placement snap sound (Woodblock / Magnetic Snap).
   * Plays immediately upon dropping a piece onto the grid (even with no lines cleared).
   * @param blockSize Number of blocks in the placed piece to tune the resonance frequency
   */
  public playPiecePlaced(blockSize: number = 4) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = PLACEMENT_AUDIO_CONFIG;

    // 1. High frequency transient click (corner contact)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(cfg.transientFreqStart, now);
    clickOsc.frequency.exponentialRampToValueAtTime(
      cfg.transientFreqEnd,
      now + cfg.transientDuration
    );
    clickGain.gain.setValueAtTime(cfg.transientGain, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.transientDuration);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + cfg.transientDuration);

    // 2. Body resonance thud (snapping into grid socket)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    const baseFreq = Math.max(
      cfg.bodyFreqMin,
      cfg.bodyFreqBase - blockSize * cfg.bodyFreqDecayPerBlock
    );
    const randomizedFreq =
      baseFreq * (1 + (Math.random() * 2 - 1) * cfg.pitchJitterRatio);

    bodyOsc.frequency.setValueAtTime(randomizedFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(
      cfg.bodyFreqEnd,
      now + cfg.bodyDuration
    );
    bodyGain.gain.setValueAtTime(cfg.bodyGain, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.bodyDuration);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + cfg.bodyDuration);
  }

  /** 1. Debris fracture sound (laser cut / crystal crack) */
  public playDebrisFracture() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.fracture;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);
    gain.gain.setValueAtTime(cfg.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /** 2. Debris falling whoosh sound with steep exponential drop */
  public playDebrisFalling() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.falling;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);
    gain.gain.setValueAtTime(cfg.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /** 3. Rigid body landing thud */
  public playDebrisLanding(dropDistance: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.landing;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = Math.max(
      cfg.minFreq,
      cfg.baseFreq - dropDistance * cfg.freqDropPerDistance
    );
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + cfg.duration);
    gain.gain.setValueAtTime(cfg.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /** 4. 1x1 Gravity core spawn crystallization */
  public playGravityBlockSpawn() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.gravityBlockSpawn;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);
    gain.gain.setValueAtTime(cfg.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /** 5. Global gravity pulse detonation (sub-bass surge) */
  public playGlobalGravityPulse() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.globalPulse;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(cfg.subBassFreq * 2.5, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.subBassFreq * 0.75, now + cfg.duration);
    gain.gain.setValueAtTime(cfg.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /** 6. Cascade combo ascending chords */
  public playCascadeCombo(comboCount: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.combo;
    const chordIndex = Math.min(comboCount - 1, cfg.chordNotes.length - 1);
    const notes = cfg.chordNotes[Math.max(0, chordIndex)];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      gain.gain.setValueAtTime(cfg.gain, now + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + cfg.duration + idx * 0.035
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + cfg.duration + 0.05);
    });
  }
}

export const sound = new SoundEngine();
