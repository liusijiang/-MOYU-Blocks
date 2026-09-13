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

  /** 7. 任务 010: 跨步连击大调五声音阶音效 (Pentatonic Streak Audio) */
  public playStreakSound(streakCount: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // C Major Pentatonic Scale: C4, D4, E4, G4, A4, C5, D5, E5, G5, A5, C6, D6
    const pentatonicNotes = [
      261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
      880.0, 1046.5, 1174.66,
    ];
    const noteIndex = Math.min(streakCount - 1, pentatonicNotes.length - 1);
    const baseFreq = pentatonicNotes[Math.max(0, noteIndex)];

    // 主音 (Triangle 晶体清脆质感)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = streakCount >= 5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.02, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);

    // 5+ Fever 狂热模式伴随高八度轻灵泛音
    if (streakCount >= 5) {
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(baseFreq * 2, now + 0.03);
      harmGain.gain.setValueAtTime(0.1, now + 0.03);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      harmOsc.connect(harmGain);
      harmGain.connect(ctx.destination);
      harmOsc.start(now + 0.03);
      harmOsc.stop(now + 0.25);
    }
  }

  /** 8. 任务 010: 濒死护盾碎裂警报音 */
  public playShieldBreakSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** 9. 任务 010: 连击护盾重新充能音 */
  public playShieldRestoredSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25]; // A major arpeggio
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.18);
    });
  }

  /** 10. 任务 010: 引力星块被动大坍缩次声滑音 */
  public playResonanceCollapseSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass sweep 95Hz -> 28Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  /** 11. 任务 010: 琥珀微晶基石神圣降临音 */
  public playKeystoneSpawnSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [587.33, 739.99, 880.0, 1174.66]; // D-F#-A-D crystal shimmer
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.15, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.25);
    });
  }
}

export const sound = new SoundEngine();
