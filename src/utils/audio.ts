import {
  PLACEMENT_AUDIO_CONFIG,
  DEBRIS_AUDIO_CONFIG,
} from '../constants/physicsAudioConfig';
import { AudioPreferences, BGMRuntimeState } from '../types';

/**
 * 任务 018: 专业级 Web Audio 多总线混音拓扑管理器
 * 负责构建 Master Compressor、子分轨 (SFX / BGM / Reverb Send / Wet) 与侧链闪避控制器
 */
class AudioBusManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private sidechainDuckingGain: GainNode | null = null;
  private reverbSendBus: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetBus: GainNode | null = null;
  private isSpatialPannerEnabled: boolean = true;
  private isReverbEnabled: boolean = true;

  public init(ctx: AudioContext, prefs: AudioPreferences) {
    this.ctx = ctx;
    this.isSpatialPannerEnabled = prefs.spatialPannerEnabled;
    this.isReverbEnabled = prefs.reverbEnabled;

    const now = ctx.currentTime;

    // 1. 硬件级主压限器 (Dynamics Compressor) - 防止数字削波与爆音
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-6.0, now);
    this.compressor.knee.setValueAtTime(24.0, now);
    this.compressor.ratio.setValueAtTime(12.0, now);
    this.compressor.attack.setValueAtTime(0.003, now);
    this.compressor.release.setValueAtTime(0.18, now);

    // 2. 主音量增益
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(prefs.masterVolume, now);

    // 3. 子分轨总线
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.setValueAtTime(prefs.sfxMuted ? 0.0 : prefs.sfxVolume, now);

    this.bgmBus = ctx.createGain();
    this.bgmBus.gain.setValueAtTime(prefs.bgmMuted ? 0.0 : prefs.bgmVolume, now);

    this.sidechainDuckingGain = ctx.createGain();
    this.sidechainDuckingGain.gain.setValueAtTime(1.0, now);

    this.reverbSendBus = ctx.createGain();
    this.reverbSendBus.gain.setValueAtTime(prefs.reverbEnabled ? 0.25 : 0.0, now);

    this.wetBus = ctx.createGain();
    this.wetBus.gain.setValueAtTime(0.35, now);

    // 4. 纯算法合成宇宙空间冲激响应 (Procedural Impulse Response - 避免外部音频文件加载)
    try {
      this.convolver = this.createCosmicImpulseResponse(ctx, 1.4, 2.2);
    } catch {
      this.convolver = null;
    }

    // 5. 拓扑节点串联:
    // BGM -> Sidechain Ducking -> Compressor
    this.bgmBus.connect(this.sidechainDuckingGain);
    this.sidechainDuckingGain.connect(this.compressor);

    // SFX -> Compressor & Reverb Send
    this.sfxBus.connect(this.compressor);
    this.sfxBus.connect(this.reverbSendBus);

    // Reverb Send -> Convolver -> Wet Bus -> Compressor
    if (this.convolver) {
      this.reverbSendBus.connect(this.convolver);
      this.convolver.connect(this.wetBus);
      this.wetBus.connect(this.compressor);
    }

    // Compressor -> Master Gain -> ctx.destination
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  // 生成算法空间冲激白噪包络 (耗时 < 2ms, 0 网络依赖)
  private createCosmicImpulseResponse(ctx: AudioContext, duration: number, decay: number): ConvolverNode {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  public getSFXBus(): GainNode | null {
    return this.sfxBus;
  }

  public getBGMBus(): GainNode | null {
    return this.bgmBus;
  }

  public updatePreferences(prefs: AudioPreferences) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.isSpatialPannerEnabled = prefs.spatialPannerEnabled;
    this.isReverbEnabled = prefs.reverbEnabled;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(prefs.masterVolume, now, 0.05);
    }
    if (this.sfxBus) {
      const targetSfx = prefs.sfxMuted ? 0.0 : prefs.sfxVolume;
      this.sfxBus.gain.setTargetAtTime(targetSfx, now, 0.05);
    }
    if (this.bgmBus) {
      const targetBgm = prefs.bgmMuted ? 0.0 : prefs.bgmVolume;
      this.bgmBus.gain.setTargetAtTime(targetBgm, now, 0.05);
    }
    if (this.reverbSendBus) {
      const targetReverb = prefs.reverbEnabled ? 0.25 : 0.0;
      this.reverbSendBus.gain.setTargetAtTime(targetReverb, now, 0.05);
    }
  }

  /**
   * 触发高能事件侧链闪避 (Sidechain Ducking)
   * 将 BGM 音量快速压低后指数恢复，为冲击波留出纯净的声学动态余量
   */
  public triggerSidechainDucking(depth: number = 0.35, durationMs: number = 380) {
    if (!this.ctx || !this.sidechainDuckingGain) return;
    const now = this.ctx.currentTime;
    const gainParam = this.sidechainDuckingGain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(gainParam.value, now);
    // 15ms 快速下潜
    gainParam.linearRampToValueAtTime(depth, now + 0.015);
    // durationMs 内平滑指数回升至 1.0
    gainParam.exponentialRampToValueAtTime(1.0, now + durationMs / 1000);
  }

  /**
   * 根据棋盘横向列坐标 (0~9) 创建立体声全景声相节点
   * col: 0 (左极), 4.5 (居中), 9 (右极)
   */
  public createSpatialPanner(col?: number): StereoPannerNode | null {
    if (!this.ctx || !this.isSpatialPannerEnabled || typeof this.ctx.createStereoPanner !== 'function') {
      return null;
    }
    if (col === undefined || isNaN(col)) {
      col = 4.5;
    }
    // 归一化映射到 [-0.72, +0.72]，温和自然的立体声场
    const panValue = Math.max(-0.75, Math.min(0.75, ((col - 4.5) / 4.5) * 0.72));
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, this.ctx.currentTime);
    return panner;
  }
}

/**
 * 任务 018: 纯 Web Audio 算法生成式【阳光午后 · 咖啡馆暖阳 Lo-Fi / 拇指琴禅意心流】BGM 引擎
 * (Afternoon Coffee & Kalimba Chillhop Engine)
 * 采用 Dm9 -> G13 -> Cmaj9 -> Am11 温暖爵士和弦、纯木质卡林巴拇指琴、暖阳微风沙沙律动与原声大提琴摇摆低音
 */
class GenerativeMusicEngine {
  private ctx: AudioContext | null = null;
  private bgmBus: GainNode | null = null;
  private isRunning: boolean = false;
  private isSuspendedByPage: boolean = false;

  // 定时调度器与音符时钟
  private chordIntervalId: number | null = null;
  private arpIntervalId: number | null = null;
  private feverIntervalId: number | null = null;
  private activeVoices: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  // 当前状态
  private currentChordIndex: number = 0;
  private bpm: number = 66;
  private resonanceEnergy: number = 0;
  private streakCount: number = 0;
  private isGameOver: boolean = false;

  // 经典惬意午后 Jazz Lo-Fi 四和弦进行表 (Dm9 -> G13 -> Cmaj9 -> Am11)
  private readonly chords = [
    // 0: Dm9 (D3, F3, A3, C4, E4)
    [146.83, 174.61, 220.0, 261.63, 329.63],
    // 1: G13 (G2, F3, B3, E4)
    [98.0, 174.61, 246.94, 329.63],
    // 2: Cmaj9 (C3, E3, G3, B3, D4)
    [130.81, 164.81, 196.0, 246.94, 293.66],
    // 3: Am11 (A2, G3, C4, D4, E4)
    [110.0, 196.0, 261.63, 293.66, 329.63],
  ];

  // 卡林巴（Kalimba）木质拇指琴高音水滴音阶池 (C4 ~ G5 治愈五声音阶)
  private readonly kalimbaScale = [
    261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
  ];

  // 动态图层增益节点
  private padMasterGain: GainNode | null = null;       // Layer 1: 复古温暖 Rhodes 电钢琴
  private arpMasterGain: GainNode | null = null;       // Layer 2: 卡林巴拇指琴 / 八音盒水滴
  private shimmerMasterGain: GainNode | null = null;   // Layer 3: 午后暖阳微风 / 爵士鼓刷沙沙声
  private shimmerFilter: BiquadFilterNode | null = null;
  private feverMasterGain: GainNode | null = null;     // Layer 4: 原声大提琴摇摆拨弦 (Walking Bass)

  public init(ctx: AudioContext, bgmBus: GainNode) {
    this.ctx = ctx;
    this.bgmBus = bgmBus;

    const now = ctx.currentTime;

    // 1. 复古电钢琴 (Rhodes EP) 主增益 (Layer 1) - 温暖松弛
    this.padMasterGain = ctx.createGain();
    this.padMasterGain.gain.setValueAtTime(0.36, now);
    this.padMasterGain.connect(bgmBus);

    // 2. 卡林巴木质拇指琴主增益 (Layer 2) - 空灵治愈
    this.arpMasterGain = ctx.createGain();
    this.arpMasterGain.gain.setValueAtTime(0.26, now);
    this.arpMasterGain.connect(bgmBus);

    // 3. 暖阳微风与鼓刷沙沙声 (Layer 3) - 模拟微风拂面或咖啡馆翻书声
    this.shimmerFilter = ctx.createBiquadFilter();
    this.shimmerFilter.type = 'bandpass';
    this.shimmerFilter.frequency.setValueAtTime(1800, now);
    this.shimmerFilter.Q.setValueAtTime(1.8, now);

    this.shimmerMasterGain = ctx.createGain();
    this.shimmerMasterGain.gain.setValueAtTime(0.0, now);
    this.shimmerMasterGain.connect(this.shimmerFilter);
    this.shimmerFilter.connect(bgmBus);

    // 4. 原声大提琴摇摆低音主增益 (Layer 4)
    this.feverMasterGain = ctx.createGain();
    this.feverMasterGain.gain.setValueAtTime(0.0, now);
    this.feverMasterGain.connect(bgmBus);

    // 监听标签页可见性，切到后台时自动优雅静音休眠
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
          this.isSuspendedByPage = true;
        } else if (this.isSuspendedByPage) {
          this.isSuspendedByPage = false;
          this.start();
        }
      });
    }
  }

  public start() {
    if (this.isRunning || !this.ctx || !this.bgmBus) return;
    this.isRunning = true;

    // 立即启动第一和弦
    this.scheduleChordTransition();

    // 启动和弦循环定时器 (每 10.5 秒舒缓交织淡入淡出到下一和弦)
    this.chordIntervalId = window.setInterval(() => {
      this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
      this.scheduleChordTransition();
    }, 10500);

    // 启动卡林巴木质拇指琴随性点缀时钟
    this.startArpeggiatorClock();

    // 启动摇摆大提琴脉冲时钟
    this.startFeverPulseClock();
  }

  public pause() {
    this.isRunning = false;
    if (this.chordIntervalId) {
      clearInterval(this.chordIntervalId);
      this.chordIntervalId = null;
    }
    if (this.arpIntervalId) {
      clearInterval(this.arpIntervalId);
      this.arpIntervalId = null;
    }
    if (this.feverIntervalId) {
      clearInterval(this.feverIntervalId);
      this.feverIntervalId = null;
    }

    // 释放所有常驻振荡器
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const voice of this.activeVoices) {
      try {
        voice.gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
        voice.osc.stop(now + 0.45);
      } catch {
        // Safe guard
      }
    }
    this.activeVoices = [];
  }

  // 1. 温暖复古电钢琴 (Warm Rhodes EP) 和弦交织
  private scheduleChordTransition() {
    if (!this.ctx || !this.padMasterGain) return;
    const now = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIndex];
    const duration = 11.5;

    // 淡出并清理旧声部
    const oldVoices = [...this.activeVoices];
    this.activeVoices = [];
    for (const voice of oldVoices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0.0001, now + 2.2);
        voice.osc.stop(now + 2.3);
        setTimeout(() => {
          try {
            voice.osc.disconnect();
            voice.gain.disconnect();
          } catch {}
        }, 2600);
      } catch {}
    }

    // 构造新和弦声部：模拟 Rhodes 电钢琴的双正弦微失谐与轻微 Tremolo 震音
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.padMasterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // 基底正弦 + 轻微失谐与温和暖色调滤波
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx % 2 === 0 ? 3.0 : -3.0), now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.isGameOver ? 260 : 480, now);

      // 电钢琴般的温暖 Attack 与缓慢延音 (Decay)
      const voiceGain = idx === 0 ? 0.075 : 0.042;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(voiceGain, now + 1.8);
      gain.gain.setValueAtTime(voiceGain * 0.9, now + duration - 2.2);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.padMasterGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);

      this.activeVoices.push({ osc, gain });
    });
  }

  // 2. 卡林巴木质拇指琴 (Organic Kalimba & Music Box)
  private startArpeggiatorClock() {
    if (this.arpIntervalId) clearInterval(this.arpIntervalId);

    // 66 BPM 节拍器驱动，点缀如同微风落叶、水滴木碗
    const intervalMs = Math.floor((60000 / this.bpm) / 2);

    this.arpIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.arpMasterGain || !this.isRunning) return;

      // 40% 随机触发率，保持从容、不喧宾夺主
      if (this.isGameOver || Math.random() > 0.42) return;

      const now = this.ctx.currentTime;
      const currentChord = this.chords[this.currentChordIndex];

      // 挑选与当前和弦和谐对应的高音五声音阶频率
      const baseNote = currentChord[Math.floor(Math.random() * currentChord.length)];
      const candidateFreqs = this.kalimbaScale.filter((f) => f >= baseNote * 1.4);
      const freq = candidateFreqs.length > 0
        ? candidateFreqs[Math.floor(Math.random() * candidateFreqs.length)]
        : this.kalimbaScale[Math.floor(Math.random() * this.kalimbaScale.length)];

      // 1. 卡林巴主声 (正弦波纯净金属弹片振动)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // 2. 指尖拨片物理触感 (极微弱短促木质/金属 Transient Click)
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(freq * 2.8, now);
      clickGain.gain.setValueAtTime(0.015, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      // 拇指琴自然声学包络 (迅速起音，缓慢圆润指数衰减)
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      clickOsc.connect(clickGain);
      clickGain.connect(gain);

      if (pan) {
        // 声相在木盒左右随性微摆 (-0.4 ~ +0.4)
        const p = (Math.random() * 2 - 1) * 0.4;
        pan.pan.setValueAtTime(p, now);
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(this.arpMasterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.arpMasterGain);
      }

      clickOsc.start(now);
      clickOsc.stop(now + 0.025);
      osc.start(now);
      osc.stop(now + 0.58);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
          clickOsc.disconnect();
          clickGain.disconnect();
          if (pan) pan.disconnect();
        } catch {}
      }, 650);
    }, intervalMs);
  }

  // 3. 原声大提琴摇摆走低音 (Acoustic Upright Walking Bass)
  private startFeverPulseClock() {
    if (this.feverIntervalId) clearInterval(this.feverIntervalId);

    const beatInterval = Math.floor(60000 / this.bpm);

    this.feverIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.feverMasterGain || !this.isRunning || this.streakCount < 5) return;

      const now = this.ctx.currentTime;
      const currentChord = this.chords[this.currentChordIndex];
      // 选取和弦根音，模拟爵士大提琴拨弦 (Walking Bass)
      const bassFreq = currentChord[0] * 0.5;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, now);
      osc.frequency.exponentialRampToValueAtTime(bassFreq * 0.98, now + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      // 原声拨弦包络 (Acoustic Pluck)
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.feverMasterGain);

      osc.start(now);
      osc.stop(now + 0.35);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
          filter.disconnect();
        } catch {}
      }, 400);
    }, beatInterval);
  }

  // 动态游戏性响应
  public updateGameState(streak: number, resonance: number, isGameOver: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.streakCount = streak;
    this.resonanceEnergy = Math.max(0, Math.min(100, resonance));
    this.isGameOver = isGameOver;

    // 1. 午后微风与鼓刷沙沙声 Shaker (随共鸣能量 0% -> 100% 柔和展开)
    if (this.shimmerMasterGain && this.shimmerFilter) {
      const ratio = this.resonanceEnergy / 100;
      const targetGain = ratio * 0.14;
      const targetFreq = 1200 + ratio * 1600; // 1200Hz -> 2800Hz 温暖微风展开
      this.shimmerMasterGain.gain.setTargetAtTime(targetGain, now, 0.15);
      this.shimmerFilter.frequency.setTargetAtTime(targetFreq, now, 0.15);
    }

    // 2. 连击狂热状态 Fever Pulse 与节拍自适应 (进入摇摆步进)
    const isFever = streak >= 5;
    const targetBpm = isFever ? 78 : 66;
    if (this.bpm !== targetBpm) {
      this.bpm = targetBpm;
      this.startArpeggiatorClock();
      this.startFeverPulseClock();
    }

    if (this.feverMasterGain) {
      const targetFeverGain = isFever ? 0.32 : 0.0;
      this.feverMasterGain.gain.setTargetAtTime(targetFeverGain, now, 0.2);
    }

    // 3. 游戏结束时压低音乐主垫，营造从容平静的余韵
    if (this.padMasterGain) {
      const targetPad = isGameOver ? 0.14 : 0.36;
      this.padMasterGain.gain.setTargetAtTime(targetPad, now, 0.4);
    }
  }

  public getRuntimeState(): BGMRuntimeState {
    return {
      isPlaying: this.isRunning,
      bpm: this.bpm,
      currentChordIndex: this.currentChordIndex,
      layer1PadGain: this.isGameOver ? 0.14 : 0.36,
      layer2ArpGain: 0.26,
      layer3ShimmerGain: (this.resonanceEnergy / 100) * 0.14,
      layer4FeverGain: this.streakCount >= 5 ? 0.32 : 0.0,
    };
  }
}

/**
 * 任务 018: 统一门面 SoundEngine
 * 彻底集成 AudioBusManager 与 GenerativeMusicEngine，
 * 全面支持点状音效空间声相、BGM 自动播放与分立式静音/音量设置
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private busManager: AudioBusManager = new AudioBusManager();
  private musicEngine: GenerativeMusicEngine = new GenerativeMusicEngine();
  private preferences: AudioPreferences;
  private hasUnlockedAudio: boolean = false;
  private lastAimTickTime: number = 0;
  private lastLockAlertTime: number = 0;
  private lastThudTime: number = 0;

  constructor() {
    // 默认配置
    this.preferences = {
      masterVolume: 1.0,
      bgmVolume: 0.6,
      sfxVolume: 0.8,
      bgmMuted: false,
      sfxMuted: false,
      spatialPannerEnabled: true,
      reverbEnabled: true,
    };

    // 从本地存储读取用户偏好
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('block_puzzle_audio_prefs');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.preferences = { ...this.preferences, ...parsed };
        } else {
          // 兼容旧的单键值 block_puzzle_muted
          const legacyMuted = localStorage.getItem('block_puzzle_muted');
          if (legacyMuted === 'true') {
            this.preferences.bgmMuted = true;
            this.preferences.sfxMuted = true;
          }
        }
      } catch {
        // Fallback to defaults
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // 初始化总线拓扑
        this.busManager.init(this.ctx, this.preferences);
        const bgmBus = this.busManager.getBGMBus();
        if (bgmBus) {
          this.musicEngine.init(this.ctx, bgmBus);
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * 浏览器 Autoplay 政策无感激活
   * 在玩家第一次产生物理交互时调用
   */
  public async resumeContext(): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (!this.hasUnlockedAudio) {
      this.hasUnlockedAudio = true;
      // 若 BGM 未被静音，淡入启动生成式背景音乐
      if (!this.preferences.bgmMuted) {
        this.musicEngine.start();
      }
    }
  }

  // 偏好设置获取与持久化
  public getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<AudioPreferences>) {
    this.preferences = { ...this.preferences, ...partial };
    this.busManager.updatePreferences(this.preferences);

    // BGM 静音与播放联动
    if (this.preferences.bgmMuted) {
      this.musicEngine.pause();
    } else if (this.hasUnlockedAudio) {
      this.musicEngine.start();
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('block_puzzle_audio_prefs', JSON.stringify(this.preferences));
        localStorage.setItem(
          'block_puzzle_muted',
          this.preferences.bgmMuted && this.preferences.sfxMuted ? 'true' : 'false'
        );
      } catch {}
    }
  }

  public setMuted(muted: boolean) {
    this.updatePreferences({ bgmMuted: muted, sfxMuted: muted });
  }

  public getMuted(): boolean {
    return this.preferences.bgmMuted && this.preferences.sfxMuted;
  }

  public toggleMute(): boolean {
    const next = !this.getMuted();
    this.setMuted(next);
    return next;
  }

  public setBgmMuted(muted: boolean) {
    this.updatePreferences({ bgmMuted: muted });
  }

  public setSfxMuted(muted: boolean) {
    this.updatePreferences({ sfxMuted: muted });
  }

  public setBgmVolume(volume: number) {
    this.updatePreferences({ bgmVolume: Math.max(0, Math.min(1, volume)) });
  }

  public setSfxVolume(volume: number) {
    this.updatePreferences({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  }

  public updateGameState(streak: number, resonanceEnergy: number, isGameOver: boolean) {
    this.musicEngine.updateGameState(streak, resonanceEnergy, isGameOver);
  }

  public getBGMRuntimeState(): BGMRuntimeState {
    return this.musicEngine.getRuntimeState();
  }

  // 辅助连接方法：将节点接入 SFX 总线，支持立体声声相
  private connectToSFX(source: AudioNode, col?: number) {
    const sfxBus = this.busManager.getSFXBus();
    if (!sfxBus) return;

    const panner = this.busManager.createSpatialPanner(col);
    if (panner) {
      source.connect(panner);
      panner.connect(sfxBus);
    } else {
      source.connect(sfxBus);
    }
  }

  /* -------------------------------------------------------------
   * 现有点状音效方法全面升级接入 SFX Bus 与空间声相
   * ------------------------------------------------------------- */

  /**
   * 0. 触盘榫卯吸附音 (支持列声相与微气动感)
   */
  public playPiecePlaced(blockSize: number = 4, col: number = 4.5) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = PLACEMENT_AUDIO_CONFIG;

    // 1. 高频边角敲击瞬态
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(cfg.transientFreqStart, now);
    clickOsc.frequency.exponentialRampToValueAtTime(cfg.transientFreqEnd, now + cfg.transientDuration);
    clickGain.gain.setValueAtTime(cfg.transientGain, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.transientDuration);
    clickOsc.connect(clickGain);
    this.connectToSFX(clickGain, col);
    clickOsc.start(now);
    clickOsc.stop(now + cfg.transientDuration);

    // 2. 榫卯腔体共振主声
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    const baseFreq = Math.max(cfg.bodyFreqMin, cfg.bodyFreqBase - blockSize * cfg.bodyFreqDecayPerBlock);
    const randomizedFreq = baseFreq * (1 + (Math.random() * 2 - 1) * cfg.pitchJitterRatio);

    bodyOsc.frequency.setValueAtTime(randomizedFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(cfg.bodyFreqEnd, now + cfg.bodyDuration);
    bodyGain.gain.setValueAtTime(cfg.bodyGain, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.bodyDuration);
    bodyOsc.connect(bodyGain);
    this.connectToSFX(bodyGain, col);
    bodyOsc.start(now);
    bodyOsc.stop(now + cfg.bodyDuration);
  }

  /**
   * 1. 碎片切削断裂清脆音
   */
  public playDebrisFracture() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.fracture;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);

    // 4ms 线性防爆音启动包络
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(cfg.gain, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /**
   * 2. 重力下坠呼啸滑音
   */
  public playDebrisFalling(dropDurationSeconds: number = 0.24) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.falling;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // 柔化音色：采用锯齿波叠加 1200Hz 低通滤波，塑造空气动力学呼啸感，彻底剔除尖锐破音与手机扬声器互调失真
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + dropDurationSeconds);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + dropDurationSeconds);
    filter.Q.setValueAtTime(1.5, now);

    // 5ms 线性微淡入防爆音包络
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(cfg.gain, now + Math.min(0.04, dropDurationSeconds * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dropDurationSeconds);

    osc.connect(filter);
    filter.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + dropDurationSeconds);
  }

  /**
   * 3. 碎片落地刚体厚重敲击音 (支持根据下落总格数与列声相)
   */
  public playDebrisLanding(dropDistance: number = 2, totalFallenBlocks: number = 1, col: number = 4.5) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = DEBRIS_AUDIO_CONFIG.landing;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const landingFreq = Math.max(cfg.minFreq, cfg.baseFreq - dropDistance * cfg.freqDropPerDistance);
    const volume = Math.min(0.24, cfg.gain + Math.min(totalFallenBlocks, 8) * 0.015);

    osc.frequency.setValueAtTime(landingFreq, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + cfg.duration);

    // 5ms 线性微爬升防爆音包络，消除狄拉克冲激跳变
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

    osc.connect(gain);
    this.connectToSFX(gain, col);
    osc.start(now);
    osc.stop(now + cfg.duration);
  }

  /**
   * 4. 1x1 引力核心诞生结晶音
   */
  public playGravityBlockSpawn(col: number = 4.5) {
    if (this.preferences.sfxMuted) return;
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
    this.connectToSFX(gain, col);
    osc.start(now);
    osc.stop(now + cfg.duration);

    // 泛音
    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = 'triangle';
    harmonicOsc.frequency.setValueAtTime(cfg.harmonicFreq, now);
    harmonicOsc.frequency.exponentialRampToValueAtTime(cfg.harmonicFreq * 1.5, now + cfg.duration * 0.75);

    harmonicGain.gain.setValueAtTime(cfg.gain * 0.45, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration * 0.75);

    harmonicOsc.connect(harmonicGain);
    this.connectToSFX(harmonicGain, col);
    harmonicOsc.start(now);
    harmonicOsc.stop(now + cfg.duration * 0.75);
  }

  /**
   * 5. 跨步连击音 (Streak Sound)
   */
  public playStreakSound(streak: number, comboShieldBroken: boolean = false, consecutiveClears: number = 1) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const streakPentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const noteIndex = Math.min(streak - 1, streakPentatonic.length - 1);
    const baseFreq = streakPentatonic[Math.max(0, noteIndex)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = streak >= 5 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.08, now + 0.18);

    const volume = Math.min(0.25, 0.1 + streak * 0.02);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.2);

    // 和弦泛音
    if (streak >= 3 || consecutiveClears >= 2) {
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(baseFreq * 1.5, now);
      harmOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5 * 1.05, now + 0.25);

      harmGain.gain.setValueAtTime(volume * 0.6, now);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      harmOsc.connect(harmGain);
      this.connectToSFX(harmGain);
      harmOsc.start(now);
      harmOsc.stop(now + 0.25);
    }
  }

  /**
   * 6. 行列消除音 (多行消除触发侧链闪避)
   */
  public playClearSound(linesCleared: number, combo: number = 0) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 若一次性消除 3 行或以上，触发侧链闪避
    if (linesCleared >= 3) {
      this.busManager.triggerSidechainDucking(0.4, 340);
    }

    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const startIndex = Math.min(combo * 2, pentatonic.length - linesCleared);

    for (let i = 0; i < linesCleared; i++) {
      const freq = pentatonic[Math.min(startIndex + i, pentatonic.length - 1)];
      const startTime = now + i * 0.06;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.04, startTime + 0.14);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  }

  /**
   * 7. 全局引力波脉冲轰鸣
   */
  public playGravityPulseSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.busManager.triggerSidechainDucking(0.3, 450);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

    // 6ms 线性防爆音启动包络
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * 8. 5x5 裂变引爆冲击音
   */
  public playGravityShatterImpactSound(col: number = 4.5) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.busManager.triggerSidechainDucking(0.35, 380);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

    // 5ms 线性防爆音启动包络
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    this.connectToSFX(gain, col);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * 9. 奇点十字穿透超能激光爆发音 (深度侧链闪避)
   */
  public playSingularityBurst(centerCol: number = 4.5) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 强劲侧链闪避: BGM 瞬间压至 30%，420ms 内平滑恢复
    this.busManager.triggerSidechainDucking(0.3, 420);

    // 激光扫掠
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.22);

    // 4ms 线性防爆音平滑爬升
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    this.connectToSFX(gain, centerCol);
    osc.start(now);
    osc.stop(now + 0.25);

    // 次低频冲击地鸣
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.38);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    this.connectToSFX(subGain, centerCol);
    subOsc.start(now);
    subOsc.stop(now + 0.4);
  }

  /**
   * 10. 奇点结构坍缩声
   */
  public playSingularityCollapseSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  /**
   * 11. 结构厚重撞击钝响 (引入 60ms 硬件并发节流与 5ms 抗爆音微淡入)
   */
  public playStructuralThudSound(totalFallenBlocks: number = 4, col: number = 4.5) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 60ms 硬件并发节流，防止大范围雪崩多个碎块同帧触发导致总线饱和削波
    if (now - this.lastThudTime < 0.06) return;
    this.lastThudTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const volume = Math.min(0.22, 0.10 + totalFallenBlocks * 0.012);
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.26);

    // 5ms 抗爆音微淡入包络
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    this.connectToSFX(gain, col);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * 12. 共鸣蓄能就绪
   */
  public playResonanceChargedSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [329.63, 493.88, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + idx * 0.05 + 0.18);

      gain.gain.setValueAtTime(0.1, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);

      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.2);
    });
  }

  /**
   * 13. 基石降临圣洁音
   */
  public playKeystoneSpawnSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.08, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.25);
    });
  }

  /**
   * 14. 狂热常驻微低鸣
   */
  public playFeverActiveHum() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.2);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * 15. 十字准星微动刻度音 (受 85ms 硬件节流)
   */
  public playCrosshairAimTick(isValid: boolean = true) {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastAimTickTime < 0.085) return;
    this.lastAimTickTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (isValid) {
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.035);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(now);
      osc.stop(now + 0.035);
    } else {
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  }

  /**
   * 16. 战术锁定双音蜂鸣 (受 140ms 节流)
   */
  public playChainedCoreLockAlert() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastLockAlertTime < 0.14) return;
    this.lastLockAlertTime = now;

    const freqs = [1174.66, 1760.0];
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  /**
   * 17. 抓取引力星块线圈充能声
   */
  public playSingularityChargeWhine() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * 18. 游戏结束悲鸣
   */
  public playGameOverSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.busManager.triggerSidechainDucking(0.2, 800);

    const freqs = [293.66, 261.63, 220.0, 174.61];
    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + 0.28);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      this.connectToSFX(gain);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  /**
   * 19. 连击护盾充能/复苏圣音
   */
  public playShieldRestoredSound() {
    this.playResonanceChargedSound();
  }

  /**
   * 20. 连击护盾抵御破碎音
   */
  public playShieldBreakSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * 21. 全局引力波轰鸣别名
   */
  public playGlobalGravityPulse() {
    this.playGravityPulseSound();
  }

  /**
   * 22. 连环级联消除音阶
   */
  public playCascadeCombo(cascadeStep: number) {
    this.playStreakSound(cascadeStep);
  }

  /**
   * 23. 奇点十字冲击波爆发别名
   */
  public playSingularityBurstSound(col: number = 4.5) {
    this.playSingularityBurst(col);
  }

  /**
   * 24. 任务 026/027: 引力折向棱镜诞生结晶音 (磁场偏转线圈通电就绪)
   */
  public playPrismSpawnSound() {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    this.connectToSFX(gain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * 25. 任务 026/027: 瞬态横向脉冲滑移拍紧音 (金属导轨滑行与巨型闸门闭合)
   */
  public playLateralImpulseSound(direction: 'left' | 'right' = 'left') {
    if (this.preferences.sfxMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 触发侧链闪避 BGM 300ms
    this.busManager.triggerSidechainDucking(0.35, 300);

    // 1. 高频金属导轨滑行声 (带通滤波锯齿波)
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(direction === 'left' ? 1200 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.14);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    this.connectToSFX(gain, direction === 'left' ? 2 : 7);
    osc.start(now);
    osc.stop(now + 0.15);

    // 2. 闭合撞击沉闷低音炮
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now + 0.06);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.22);

    subGain.gain.setValueAtTime(0.0001, now + 0.06);
    subGain.gain.linearRampToValueAtTime(0.25, now + 0.065);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    subOsc.connect(subGain);
    this.connectToSFX(subGain);
    subOsc.start(now + 0.06);
    subOsc.stop(now + 0.24);
  }
}

export const sound = new SoundEngine();
