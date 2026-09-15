/**
 * 游戏物理重力动力学与 Web Audio API 音效核心参数配置中心
 * 集中管理所有音效合成频率、时延、缓动曲线与重力下落参数
 */

export interface PlacementAudioConfig {
  /** 边角接触高频敲击瞬态起始频率 (Hz) */
  transientFreqStart: number;
  /** 边角接触高频敲击瞬态截止频率 (Hz) */
  transientFreqEnd: number;
  /** 高频敲击持续时间 (秒) */
  transientDuration: number;
  /** 高频敲击音量增益 */
  transientGain: number;

  /** 榫卯腔体共振基础起始频率 (Hz) */
  bodyFreqBase: number;
  /** 榫卯腔体共振最低保底频率 (Hz) */
  bodyFreqMin: number;
  /** 每增加一个积木单元格，共振基频的递减量 (Hz/格) */
  bodyFreqDecayPerBlock: number;
  /** 榫卯腔体共振截止频率 (Hz) */
  bodyFreqEnd: number;
  /** 榫卯共鸣持续时间 (秒) */
  bodyDuration: number;
  /** 榫卯共鸣音量增益 */
  bodyGain: number;

  /** 音高随机微浮动比率 (防止连续落子产生听觉疲劳) */
  pitchJitterRatio: number;
}

export interface DebrisAudioConfig {
  /** 碎片切削断裂脆响参数 */
  fracture: {
    freqStart: number;
    freqEnd: number;
    duration: number;
    gain: number;
  };
  /** 自由落体下坠呼啸滑音参数 */
  falling: {
    freqStart: number;
    freqEnd: number;
    duration: number;
    gain: number;
  };
  /** 触底刚体撞击低音炮参数 */
  landing: {
    baseFreq: number;
    minFreq: number;
    freqDropPerDistance: number;
    duration: number;
    gain: number;
  };
  /** 1x1 引力核心诞生结晶音参数 */
  gravityBlockSpawn: {
    freqStart: number;
    freqEnd: number;
    harmonicFreq: number;
    duration: number;
    gain: number;
  };
  /** 全场引力波冲击低音参数 */
  globalPulse: {
    subBassFreq: number;
    duration: number;
    gain: number;
  };
  /** 连击和弦音阶参数 */
  combo: {
    chordNotes: number[][];
    duration: number;
    gain: number;
  };
}

export interface GravityKineticsConfig {
  /** 自由落体重力加速缓动曲线 (Ease-In Gravity, 越接近地面速度越快) */
  easingCurve: string;
  /** 消除闪白结束至碎片下落启动之间的悬空蓄力等待时间 (ms) */
  anticipationHangTimeMs: number;
  /** 碎片落稳后至下一次次级连环消除检验之间的稳定缓冲时间 (ms) */
  settlePauseMs: number;
  /** 任务 026/027: 瞬态横向物理脉冲滑移时长 (ms) */
  lateralImpulseDurationMs: number;
  /** 级联消除最大递归深度上限 (死循环保险) */
  maxCascadeDepth: number;

  /** 刚体触底微挤压形变配置 */
  squash: {
    enabled: boolean;
    durationMs: number;
    scaleY: number;
  };

  /** 各下落格数距离对应的精确过渡时长 (ms) */
  durations: {
    dist1: number;
    dist2: number;
    dist3to4: number;
    dist5PlusBase: number;
    dist5PlusStepPerCell: number;
    maxDuration: number;
  };
}

/** 成功放置积木音效参数配置 */
export const PLACEMENT_AUDIO_CONFIG: PlacementAudioConfig = {
  transientFreqStart: 1600,
  transientFreqEnd: 400,
  transientDuration: 0.015,
  transientGain: 0.18,

  bodyFreqBase: 340,
  bodyFreqMin: 200,
  bodyFreqDecayPerBlock: 12,
  bodyFreqEnd: 110,
  bodyDuration: 0.055,
  bodyGain: 0.22,

  pitchJitterRatio: 0.04,
};

/** 碎片与引力音效参数配置 */
export const DEBRIS_AUDIO_CONFIG: DebrisAudioConfig = {
  fracture: {
    freqStart: 1400,
    freqEnd: 300,
    duration: 0.08,
    gain: 0.2,
  },
  falling: {
    freqStart: 480,
    freqEnd: 120,
    duration: 0.22,
    gain: 0.15,
  },
  landing: {
    baseFreq: 110,
    minFreq: 65,
    freqDropPerDistance: 6,
    duration: 0.15,
    gain: 0.25,
  },
  gravityBlockSpawn: {
    freqStart: 220,
    freqEnd: 880,
    harmonicFreq: 1760,
    duration: 0.35,
    gain: 0.2,
  },
  globalPulse: {
    subBassFreq: 45,
    duration: 0.45,
    gain: 0.35,
  },
  combo: {
    chordNotes: [
      [659.25, 783.99],   // E5 + G5
      [783.99, 1046.5],   // G5 + C6
      [1046.5, 1318.51],  // C6 + E6
      [1318.51, 1567.98], // E6 + G6
      [1567.98, 2093.0],  // G6 + C7
    ],
    duration: 0.25,
    gain: 0.25,
  },
};

/** 碎片垂直重力下坠动力学时间与运动曲线配置 */
export const GRAVITY_KINETICS_CONFIG: GravityKineticsConfig = {
  // 自由落体加速曲线：初速度为 0，受重力加速度强烈向下俯冲
  easingCurve: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  // 敏捷化悬空蓄力停滞期 (110ms -> 65ms)
  anticipationHangTimeMs: 65,
  // 紧凑落稳休止 (80ms -> 45ms)
  settlePauseMs: 45,
  // 瞬态横向脉冲时延 (120ms)
  lateralImpulseDurationMs: 120,
  // 安全级联递归上限 (10次)
  maxCascadeDepth: 10,

  squash: {
    enabled: true,
    durationMs: 60,
    scaleY: 0.96,
  },

  durations: {
    dist1: 140,
    dist2: 170,
    dist3to4: 210,
    dist5PlusBase: 210,
    dist5PlusStepPerCell: 18,
    maxDuration: 280,
  },
};

/**
 * 根据最大下落格数动态计算自由落体过渡时长 (ms)
 * @param maxDistance 全盘活动碎片中的最大垂直下落格数
 */
export function calculateGravityDropDuration(maxDistance: number): number {
  const { dist1, dist2, dist3to4, dist5PlusBase, dist5PlusStepPerCell, maxDuration } =
    GRAVITY_KINETICS_CONFIG.durations;

  if (maxDistance <= 0) return 0;
  if (maxDistance === 1) return dist1;
  if (maxDistance === 2) return dist2;
  if (maxDistance <= 4) return dist3to4;

  const calculated = dist5PlusBase + (maxDistance - 4) * dist5PlusStepPerCell;
  return Math.min(maxDuration, calculated);
}
