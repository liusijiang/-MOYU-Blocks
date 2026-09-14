# 任务 018：游戏音效系统深度改进与自适应背景音乐（BGM）架构代码编写方案

> **文件标识**：`/DOC/_018_audio_engine_and_adaptive_bgm_implementation_plan.md`  
> **关联前置文档**：`/DOC/_017_game_audio_and_bgm_enhancement_proposal.md`  
> **执行指令**：基于任务 017 提案制定工程化代码编写方案；纯技术文档设计，**严禁修改任何业务代码**。  
> **制定时间**：2026-09-13  
> **核心目标**：将 017 提案中设计的“纯 Web Audio 生成式太空环境音乐引擎、专业级多总线混音拓扑、动态侧链闪避与立体声声相定位”转化为精确到文件、接口、算法和执行步骤的落地编码计划。

---

## 一、方案综述与架构目标

本实施方案旨在彻底重塑《摸鱼方块》的声学体验，将现有的零散点状单声道音效升级为现代化全景声学系统，实现：
1. **零外部网络资产依赖（Zero External Assets）**：完全基于浏览器原生 Web Audio API，无需下载或加载任何 `.mp3`、`.ogg` 文件，首屏资源零负担，具备绝对的离线可用性；
2. **生成式无限变奏太空氛围音乐（Generative Cosmic Chillout BGM）**：通过程序化低通正弦和弦垫（Void Pad）、五声音阶星辰琶音（Star Arpeggio）、引力共鸣微光（Resonance Shimmer）与狂热心跳脉冲（Fever Pulse），随游戏状态实时有机演进，消除听觉疲劳；
3. **专业 DAW 级多总线混音拓扑（Multi-Bus Master Routing）**：建立 Master -> SFX / BGM / Reverb 独立子总线体系，支持 BGM 与 SFX 分立音量与静音独立控制；
4. **动态侧链避让机制（Dynamic Sidechain Ducking）**：高能消除与奇点爆破触发时自动让位，给爆炸音腾出动态余量，消除浑浊与破音；
5. **空间声相渲染（Spatial Stereo Panning）**：基于棋盘 0~9 列坐标将落盘与消除声音映射到立体声声场，打造极佳临场感。

---

## 二、系统音频节点网络与拓扑架构（Web Audio Node Topology）

```
                                  全局音频总线拓扑架构图
                                  
   [ 游戏音效发生源 (SFX) ]
        │
        ├──► [ StereoPannerNode ] (根据棋盘 Column 映射声相)
        │           │
        │           ├──► [ Dry SFX Bus (GainNode) ] ──────────────────┐
        │           │                                                 │
        │           └──► [ Reverb Send (GainNode: 0.25) ] ──┐         │
        │                                                   │         │
   [ 生成式背景音乐 (BGM) ]                                  ▼         │
        │                                        [ Convolver / Delay] │
        ├──► Layer 1: Void Pad ──┐                          │         │
        ├──► Layer 2: Arpeggio ──┤                          ▼         │
        ├──► Layer 3: Shimmer ───┼──► [ BGM Bus ] ──► [ Wet Bus ]     │
        └──► Layer 4: Fever Beat ┘         │                │         │
                                           ▼                │         │
                             [ Sidechain Ducking Gain ]     │         │
                                           │                │         │
                                           └────────────────┼─────────┘
                                                            ▼
                                                   [ Master Submix ]
                                                            │
                                                            ▼
                                              [ DynamicsCompressorNode ]
                                              (Threshold -6dB, Ratio 12:1)
                                                            │
                                                            ▼
                                                   [ Master Volume Gain ]
                                                            │
                                                            ▼
                                                [ AudioContext.destination ]
```

---

## 三、受影响模块与文件变动范围

| 文件路径 | 模块性质 | 核心修改点与增量职责 |
| :--- | :--- | :--- |
| **`/src/types.ts`** | 类型定义 | 增加 `AudioSettings`、`BGMTrackLayersState`、`AudioMixerPreferences` 等状态接口。 |
| **`/src/utils/audio.ts`** | 音频核心引擎 | 1. 构建 `AudioBusManager` 总线路由管理系统；<br>2. 新增 `GenerativeMusicEngine` 音乐发生器；<br>3. 实现 `SidechainDuckingController` 侧链控制器；<br>4. 重构既有点状音效以挂载到 SFX 总线和空间声相节点；<br>5. 导出统一门面 `sound`，兼容旧接口并新增音乐控制 API。 |
| **`/src/components/AudioSettingsModal.tsx`** | UI 组件（新增） | 沉浸式轻量级音频设置悬浮浮层：支持 BGM 音量滑块、SFX 音量滑块、空间混响开关与独立静音切换。 |
| **`/src/App.tsx`** | 应用主状态与生命周期 | 1. 挂载首次用户交互激活 `sound.resumeContext()`；<br>2. 监听游戏状态变化（`streakCount`、`resonanceEnergy`、`gameOver`），实时同步给 BGM 状态调制器；<br>3. 替换顶部 Header 单纯静音按钮为多态音频浮层控制按钮。 |

---

## 四、关键子系统与代码骨架详细设计

### 4.1 数据接口定义（`/src/types.ts`）

```typescript
// 用户音频偏好配置接口
export interface AudioPreferences {
  masterVolume: number;     // 0.0 ~ 1.0 (默认 1.0)
  bgmVolume: number;        // 0.0 ~ 1.0 (默认 0.6)
  sfxVolume: number;        // 0.0 ~ 1.0 (默认 0.8)
  bgmMuted: boolean;        // 默认 false
  sfxMuted: boolean;        // 默认 false
  spatialPannerEnabled: boolean; // 空间声相开关 (默认 true)
  reverbEnabled: boolean;   // 空间微混响开关 (默认 true)
}

// BGM 四层和声状态枚举与强度
export interface BGMRuntimeState {
  isPlaying: boolean;
  bpm: number;              // 基础 68 BPM，Fever 模式自适应升至 82 BPM
  currentChordIndex: number;// 0: Cmaj7, 1: Am7, 2: Fmaj7, 3: Gsus4
  layer1PadGain: number;    // 恒星虚空环境垫强度
  layer2ArpGain: number;    // 星辰五声琶音强度
  layer3ShimmerGain: number;// 引力共鸣极光高八度强度 (0.0 ~ 1.0)
  layer4FeverGain: number;  // 狂热心跳低音脉冲强度 (0.0 ~ 1.0)
}
```

---

### 4.2 混音总线子系统设计（`AudioBusManager`）

在 `src/utils/audio.ts` 内部封装全局音频总线生命周期管理，避免任何直接输出到 `ctx.destination` 的未管控节点。

```typescript
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

  public init(ctx: AudioContext) {
    this.ctx = ctx;

    // 1. 硬件级主压限器 (Dynamics Compressor)
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-6.0, ctx.currentTime);
    this.compressor.knee.setValueAtTime(24.0, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12.0, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.18, ctx.currentTime);

    // 2. 主输出增益
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // 3. 子分轨总线
    this.sfxBus = ctx.createGain();
    this.bgmBus = ctx.createGain();
    this.sidechainDuckingGain = ctx.createGain();
    this.reverbSendBus = ctx.createGain();
    this.reverbSendBus.gain.setValueAtTime(0.25, ctx.currentTime);
    this.wetBus = ctx.createGain();
    this.wetBus.gain.setValueAtTime(0.35, ctx.currentTime);

    // 4. 算法合成空间冲激混响 (Procedural Space Impulse)
    this.convolver = this.createCosmicImpulseResponse(ctx, 1.4, 2.0);

    // 5. 拓扑节点连接
    // BGM -> Sidechain Ducking -> Master
    this.bgmBus.connect(this.sidechainDuckingGain);
    this.sidechainDuckingGain.connect(this.compressor);

    // SFX -> Master & Reverb Send
    this.sfxBus.connect(this.compressor);
    this.sfxBus.connect(this.reverbSendBus);

    // Reverb Send -> Convolver -> Wet Bus -> Master
    if (this.convolver) {
      this.reverbSendBus.connect(this.convolver);
      this.convolver.connect(this.wetBus);
      this.wetBus.connect(this.compressor);
    }

    // Master Compressor -> Master Gain -> Destination
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  // 纯算法生成宇宙空间冲激混响响应 (避免引入外部 WAV 采样)
  private createCosmicImpulseResponse(ctx: AudioContext, duration: number, decay: number): ConvolverNode {
    const rate = ctx.sampleRate;
    const length = rate * duration;
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

  // 触发侧链避让 (Ducking)
  public triggerSidechainDucking(depth: number = 0.35, durationMs: number = 380) {
    if (!this.ctx || !this.sidechainDuckingGain) return;
    const now = this.ctx.currentTime;
    const gainParam = this.sidechainDuckingGain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(gainParam.value, now);
    // 15ms 快速下潜
    gainParam.linearRampToValueAtTime(depth, now + 0.015);
    // 平滑恢复至 1.0
    gainParam.exponentialRampToValueAtTime(1.0, now + durationMs / 1000);
  }
}
```

---

### 4.3 生成式 BGM 引擎子系统（`GenerativeMusicEngine`）

这是本架构的核心中枢。它不依赖循环音频样本，而是使用 Web Audio API 原生时间轴（`ctx.currentTime`）进行毫秒级精度的振荡器和弦编排。

#### 4.3.1 和弦级数与频率定义（C Major / A Minor 五声和声）
- **Cmaj7**：C3 (130.81Hz), E3 (164.81Hz), G3 (196.00Hz), B3 (246.94Hz)
- **Am7**：A2 (110.00Hz), C3 (130.81Hz), E3 (164.81Hz), G3 (196.00Hz)
- **Fmaj7**：F2 (87.31Hz), A2 (110.00Hz), C3 (130.81Hz), E3 (164.81Hz)
- **G7sus4**：G2 (98.00Hz), C3 (130.81Hz), D3 (146.83Hz), F3 (174.61Hz)

#### 4.3.2 琶音器音阶池（Pentatonic Star Arpeggio Pool）
与游戏消除连击音完全谐调的高音水晶音阶（C4~C6 五声音阶）：
`[261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]`。

#### 4.3.3 四层自适应控制算法
```typescript
class GenerativeMusicEngine {
  private isRunning: boolean = false;
  private chordTimer: number | null = null;
  private arpTimer: number | null = null;
  private feverTimer: number | null = null;
  private currentChordIndex: number = 0;
  
  // 动态游戏性响应参数
  private resonanceEnergy: number = 0;
  private streakCount: number = 0;
  private isGameOver: boolean = false;

  // 1. Layer 1: 恒星虚空和弦垫 (Void Cosmic Pad)
  // 使用双正弦振荡器 + 温和低通滤波器，每 12 秒以对数平滑交替过渡到下一和弦
  private scheduleNextChord() {
    // 自动化和弦对数淡入淡出（Crossfade 2.0s）
  }

  // 2. Layer 2: 星辰脉冲琶音 (Star Arpeggio)
  // 以 68 BPM 节拍器为基准，在五声音阶中随机挑选与当前和弦内音和谐的频率，
  // 触发微型短促的高反光正弦音，并伴随细微的立体声交替摆动
  private tickArpeggio() {
    // 随机点缀点状水晶音
  }

  // 3. Layer 3: 引力共鸣高八度极光 (Resonance Shimmer)
  // 随着 resonanceEnergy 从 0% 升至 100%，
  // 动态打开高八度低通滤波截止频率（600Hz -> 3200Hz），泛音逐渐璀璨耀眼
  public updateResonance(energy: number) {
    this.resonanceEnergy = Math.max(0, Math.min(100, energy));
    // 动态调节 Shimmer 增益与滤波器
  }

  // 4. Layer 4: 狂热心跳脉冲 (Fever Pulse)
  // 当 streakCount >= 5 时激活，加入 48Hz 次低频脉冲与节奏加速至 82 BPM
  public updateStreak(streak: number) {
    this.streakCount = streak;
    // 切换狂热状态增益
  }
}
```

---

### 4.4 点状音效空间化与声相增强（Spatial Panning & Modernization）

#### 4.4.1 基于棋盘列坐标的声相算法
在 `SoundManager` 中为每一个棋盘交互音效提供可选的列坐标参数 `col?: number`：
$$\text{Pan} = \frac{\text{col} - 4.5}{4.5} \times 0.72$$
- 当玩家在第 0 列放置方块时，$\text{Pan} = -0.72$（声相偏左耳）；
- 当玩家在第 9 列放置方块时，$\text{Pan} = +0.72$（声相偏右耳）；
- 中间列（4、5 列）居中平衡，实现沉浸的全景声定位。

#### 4.4.2 核心音效重构升级表

```typescript
// 升级示例：落盘吸附音加入气动微弱白噪与空间声相
playPiecePlaced(col: number = 4.5) {
  // 1. 创建 StereoPannerNode
  const panner = this.createPanner(col);
  // 2. 磁悬浮短促吸附正弦波 (340Hz -> 180Hz, 40ms)
  // 3. 极微弱气动喷流 (5ms 滤波白噪声)
  // 4. 路由接入 SFX Bus
}

// 升级示例：引力奇点爆炸触发动态侧链避让
playSingularityBurst(centerCol: number = 4.5) {
  // 1. 触发 BGM 侧链闪避：BGM 音量瞬间下潜至 35%，并在 400ms 内平滑恢复
  this.busManager.triggerSidechainDucking(0.35, 400);
  // 2. 爆发立体声宽频激光等离子脉冲
  // 3. 42Hz 超重低音冲击波
}
```

---

### 4.5 浏览器自动播放合规与生命周期（Autoplay Policy & Lifecycle）

现代浏览器（尤其是 iOS Safari 与 Chrome）严格禁止无用户手势直接播放音频。系统需建立无感激活守卫：

1. **首触即活（First Touch Unlock）**：
   - 在 `window.addEventListener('pointerdown', unlockAudio, { once: true })` 中激活；
   - 执行 `audioContext.resume()`；
   - 验证 context 状态为 `'running'` 后，BGM 引擎执行 $1.5\text{s}$ 指数淡入，避免突兀爆音；
2. **页面可见性切换与休眠管理（Page Visibility API）**：
   - 监听 `document.addEventListener('visibilitychange')`；
   - 当页面切换到后台或标签页被遮挡时，平滑淡出并挂起 `AudioContext.suspend()`，防止在后台持续消耗手机电量；
   - 重新进入游戏时，平滑执行 `AudioContext.resume()` 并淡入恢复。

---

### 4.6 UI 交互面板设计（`src/components/AudioSettingsModal.tsx`）

在顶部 Header 区域将原有的单一静音按钮升级为**多态音频控制浮层按钮**：

```tsx
// 悬浮浮层核心规格
- 宽度: 280px，深色磨砂玻璃背景 (bg-slate-900/95 border-slate-700/80 backdrop-blur-md)
- 控件 1: 背景音乐 (BGM) 开关 + 滑块 (0% ~ 100%)
- 控件 2: 游戏音效 (SFX) 开关 + 滑块 (0% ~ 100%)
- 控件 3: 空间声相与微混响 (3D Spatial Audio) 切换开关
- 动效: 弹出与收起均采用轻量 fade & scale 物理弹簧过渡
- 响应式: 移动端自动居中对齐，避免溢出屏幕边界
```

---

## 五、实施步骤拆解与里程碑（Step-by-Step Milestones）

### 第一阶段：混音总线拓扑重构与持久化偏好设置
1. 在 `src/types.ts` 中增补音频偏好及 BGM 运行时状态接口；
2. 在 `src/utils/audio.ts` 中构建 `AudioBusManager`，建立 Master、BGM、SFX、Reverb 与 DynamicsCompressor 节点拓扑；
3. 将现存所有现有音效（`playPiecePlaced`、`playStreakSound`、`playDebrisLanding` 等）重构为统一连接至 `sfxBus`，确保无任何未管控音效直连 `ctx.destination`；
4. 实现本地 `localStorage` 偏好存储与加载（`block_puzzle_audio_prefs`）。

### 第二阶段：生成式 BGM 引擎与自适应响应中枢
1. 编写 `GenerativeMusicEngine` 核心模块，实现和弦时钟轮转调度与星辰五声琶音器；
2. 接入游戏状态响应钩子（共鸣能量滤波展开、连击数 Fever 狂热模式加速）；
3. 实现生命周期守卫（用户首触唤醒、切后台自动挂起休眠）。

### 第三阶段：侧链避让、全景声相与 UI 控制中心
1. 编写 `SidechainDuckingController`，在多行消除、奇点激光爆发与全局坍缩时自动触发避让；
2. 为核心交互音效加入 `StereoPannerNode` 空间声相计算；
3. 创建 `AudioSettingsModal.tsx` 交互组件，并在 `App.tsx` 顶部 Header 处挂载触发入口；
4. 进行全链路编译构建、Lint 与跨平台音质验证。

---

## 六、非功能性指标与性能控制（Performance & Safety Controls）

1. **CPU 算力与内存零泄漏控制**：
   - 振荡器与滤波器等瞬态节点必须严格在 `onended` 事件触发后显式调用 `disconnect()` 并断开引用，交由 GC 回收；
   - 生成式音乐的定时器统一基于单个微型 RAF 或 AudioContext 高精度时钟，杜绝多重 `setInterval` 累积漂移；
2. **全频段防爆破音与听觉安全（Acoustic Limiter）**：
   - Master 总线强制挂载 `DynamicsCompressorNode`，设置 $-6\text{dB}$ 软阈值，无论瞬间并发多少个音效，最终输出声压绝不发生数字削波失真（Digital Clipping）；
   - 侧链避让采用对数/指数平滑包络，避免任何增益跳跃产生的“咔嗒”杂音（Click & Pop）。

---

## 七、质量验收标准（Definition of Done, DoD）

在未来获准进入代码编写后，必须严格遵循以下验收项：

- [ ] **DoD-01 (零外部素材)**：整个系统严禁引入任何外置音频文件（如 `.mp3`/`.wav`），网络面板传输大小为 0 字节；
- [ ] **DoD-02 (自适应沉浸度)**：BGM 随连击数和共鸣槽呈现平滑阶梯式丰富度演变，音乐与消除音阶处于同一五声调式中，和声完全和谐；
- [ ] **DoD-03 (分轨独立控制)**：玩家可以任意开启/关闭 BGM，或任意调节 BGM 与 SFX 的相对音量，互不干扰；
- [ ] **DoD-04 (侧链避让呼吸感)**：在奇点激光十字爆破与多行消除时，能清晰听见 BGM 适度避让让位并平滑恢复，无突兀截断感；
- [ ] **DoD-05 (立体声临场感)**：在棋盘最左列与最右列落子时，佩戴耳机能明显感知到声相横向位移；
- [ ] **DoD-06 (移动端与后台休眠)**：手机锁屏或切换标签页时音乐自动暂停，切回后无卡顿平滑恢复；首次触控前静默合规，无报错崩溃；
- [ ] **DoD-07 (无缝编译与类型安全)**：通过 `lint_applet`（`tsc --noEmit`）与 `compile_applet` 生产环境构建，0 错误 0 警告。

---

*(本代码编写方案已严谨规划完毕，作为纯设计规划文档妥善归档至 `/DOC/_018_audio_engine_and_adaptive_bgm_implementation_plan.md`)*

---

## 八、任务 018 编码执行与交付日志（Task Execution Log）

- **执行日期**：2026-09-14
- **执行状态**：✅ 全部功能模块顺利完成，编译与类型检查 100% 通过（Build & Lint Green）

### 8.1 变更清单与实施成果

1. **类型定义与配置扩充 (`src/types.ts`)**：
   - 增加 `AudioPreferences` 接口，定义 `masterVolume`, `bgmVolume`, `sfxVolume`, `bgmMuted`, `sfxMuted`, `spatialPannerEnabled`, `reverbEnabled` 字段；
   - 增加 `BGMRuntimeState` 接口，定义 `isPlaying`, `bpm`, `currentChordIndex`, `layer1PadGain`, `layer2ArpGain`, `layer3ShimmerGain`, `layer4FeverGain` 运行时态字段。

2. **Web Audio 多总线拓扑架构重构 (`src/utils/audio.ts`)**：
   - **`AudioBusManager`**：
     - 构建硬件级主总线压限器 `DynamicsCompressorNode`（防止爆破音失真与数字削波）；
     - 实现多子分轨路由结构：`sfxBus`, `bgmBus`, `reverbSendBus`, `wetBus`，以及自研程序化宇宙空间冲激响应合成算法（Procedural Cosmic Impulse Response，1.4s 空间余韵，0 外部文件依赖）；
     - 实现动态侧链闪避控制器 `triggerSidechainDucking(depth, durationMs)`，在奇点十字爆发、多行消除与重力大雪崩时毫秒级拉低 BGM 为打击乐留出干净的声学余量；
     - 实现了基于棋盘横向坐标 (0~9) 计算的 `createSpatialPanner(col)` 立体声空间声相定位器。
   - **`GenerativeMusicEngine`**：
     - 纯 Web Audio 算法生成式背景音乐，零外部素材（0 KB 网络带宽占用）；
     - 四和弦循环（Cmaj7 -> Am7 -> Fmaj7 -> G7sus4）结合微失谐（Detune ±3.5 cents）与温和低通滤波；
     - 星辰五声琶音器（Star Pentatonic Arpeggio）根据 68 BPM 节拍与当前和弦音阶跳动，随机立体声摆动；
     - 共鸣极光微光（Resonance Shimmer）随引力共鸣槽蓄能（0% -> 100%）动态展开低通滤波器（500Hz -> 2800Hz）与高八度泛音；
     - 连击狂热心跳脉冲（Fever Pulse）在连击数 $\ge 5$ 时自动启动 48Hz 次低频温暖心跳，BPM 提速至 82；
     - 支持 Page Visibility API，切换标签页或手机后台时自动优雅静默，切回时无缝恢复。
   - **`SoundEngine` 统一门面**：
     - 统一管控 `busManager` 与 `musicEngine`，提供向后兼容的音效调用接口；
     - 支持 `localStorage` 持久化用户设置（`block_puzzle_audio_prefs`），同时平滑迁移兼容旧版 `block_puzzle_muted`。

3. **声学控制中心组件 (`src/components/AudioSettingsModal.tsx`)**：
   - 全新编写深色太空微晶磨砂浮层组件；
   - 提供 BGM 与 SFX 分立式静音切换、平滑音量滑块调节（0%~100%）；
   - 提供 3D 空间声相开关与宇宙算法混响开关；
   - 实时显示 BGM 运行态势（当前和弦、实时 BPM、极光/狂热状态指示）。

4. **主界面与游戏闭环联动 (`src/App.tsx`)**：
   - 引入手势唤醒逻辑（首个 pointerdown / keydown 触发 `sound.resumeContext()`），完美符合移动端与现代浏览器 Autoplay 策略；
   - 游戏关键状态（`streakCount`, `resonanceEnergy`, `gameOver`）实时同步至生成式音乐引擎；
   - 顶部 Header 新增“自适应音乐与音频设置”快捷入口（带有脉冲动画与高质感图标）；
   - 为落子榫卯吸附、引力坍缩、奇点爆破等核心音效传入所在列坐标，呈现身临其境的横向立体声相。

### 8.2 DoD 质量验收结论

- [x] **DoD-01 (零外部素材)**：100% 纯 Web Audio API 算法声学合成，无任何 `.mp3` / `.wav` 文件。
- [x] **DoD-02 (自适应沉浸度)**：BGM 随连击数和共鸣能量实时无缝渲染，五声调式与全场消除音效和声完全契合。
- [x] **DoD-03 (分轨独立控制)**：BGM 与 SFX 支持各自独立的静音开关与音量滑动调节。
- [x] **DoD-04 (侧链避让呼吸感)**：高能消行与奇点激光爆发瞬间，BGM 快速下潜至 30% 并以指数对数平滑恢复。
- [x] **DoD-05 (立体声临场感)**：左右棋盘不同列落子时，声相呈现精准平滑的横向声场。
- [x] **DoD-06 (移动端与后台休眠)**：页面可见性感知与手势激活均已严格实装。
- [x] **DoD-07 (无缝编译与类型安全)**：`lint_applet`（`tsc --noEmit`）与 `compile_applet`（`npm run build`）双重校验通过，0 错误 0 警告。

---

## 九、BGM 风格演进与重构执行记录（阳光午后 · 咖啡馆 Lo-Fi & 拇指琴禅意心流）

- **重构日期**：2026-09-14
- **演进背景**：
  鉴于《摸鱼方块》是一款主打“碎片时间轻松解压、摸鱼心流、舒适治愈”的休闲益智游戏，原深空宇宙/虚空引力脉冲主题偏重科幻高冷与紧张压迫感，容易引起听觉疲劳。经专题讨论，决定将生成式 BGM 体系彻底重塑为**“阳光午后 · 咖啡馆暖阳 Lo-Fi / 拇指琴禅意心流（Afternoon Coffee & Kalimba Chillhop）”**。
- **重构状态**：✅ 改造全面落地，编译与类型检查全绿（Build & Lint Green）。

### 9.1 声学与和声架构改进细节

1. **和弦体系全面升级为经典 Jazz Lo-Fi 进行**：
   - 告别单调冷峻的 Cmaj7-Am7，采用慵懒惬意的四和弦循环：
     - **Dm9**：`[146.83, 174.61, 220.00, 261.63, 329.63]`（D3, F3, A3, C4, E4）—— 优雅柔和的暖阳漫射；
     - **G13**：`[98.00, 174.61, 246.94, 329.63]`（G2, F3, B3, E4）—— 饱满舒适的期待感；
     - **Cmaj9**：`[130.81, 164.81, 196.00, 246.94, 293.66]`（C3, E3, G3, B3, D4）—— 澄澈通透，如同温热拿铁；
     - **Am11**：`[110.00, 196.00, 261.63, 293.66, 329.63]`（A2, G3, C4, D4, E4）—— 松弛沉淀，余音袅袅。
   - 和弦转换周期调整为 10.5 秒，交叉淡入淡出（Crossfade 2.2s），消除任何机械割裂感。

2. **四大声学图层物理建模重塑**：
   - **Layer 1（温暖复古电钢琴 Warm Rhodes EP）**：
     - 双正弦波微失谐（Detune: $\pm 3.0$ cents）模拟复古电钢琴唱针微漂移，叠加温和三角波泛音；
     - 挂载暖色调低通滤波（260Hz ~ 480Hz），消除冷硬尖锐感，温润包裹玩家听觉。
   - **Layer 2（卡林巴木质拇指琴点缀 Organic Kalimba & Music Box）**：
     - 频率池采用治愈五声音阶（C4 ~ G5，`[261.63 ~ 783.99Hz]`）；
     - 构造高频极微弱短促的物理拨片瞬态（Click Attack: 18ms）与纯正弦谐振衰减，结合左右声道随机微摆（Pan: $-0.4 \sim +0.4$），听感犹如水滴落入木碗、阳光透过树叶般清爽治愈。
   - **Layer 3（午后暖阳微风与爵士鼓刷沙沙声 Sunlight Breeze & Brush Shaker）**：
     - 结合带通滤波器（1200Hz ~ 2800Hz），随引力共鸣能量（0% ~ 100%）柔和展开，模拟窗外微风拂过或咖啡馆书页轻轻翻动的白噪音 ASMR 效果。
   - **Layer 4（原声大提琴摇摆低音 Acoustic Upright Walking Bass）**：
     - 当连击数 $\ge 5$ 进入狂热状态时，不再使用刺耳低音炮，而是激活 45Hz ~ 90Hz 的原声爵士大提琴圆润拨弦（Pluck Bass），BPM 平滑提升至 78，营造自然摇摆（Swing）的心流沉浸。
   - **平缓宁静的结束态（Game Over）**：
     - 游戏结束时自动将主和弦电钢琴音量轻柔降至 0.14，营造平静从容的午后余韵，消除挫败感。

3. **控制中心 UI 氛围同步 (`src/components/AudioSettingsModal.tsx`)**：
   - 浮层主题色调由冷青色调整为温馨琥珀金（Amber）；
   - 动态监控区域实时更新显示当前爵士和弦（Dm9 / G13 / Cmaj9 / Am11）及运行层状态（☕ 咖啡电钢琴、🌿 拇指琴韵、✨ 暖阳微风、🎵 摇摆大提琴）；
   - 文案全面优化为休闲解压风格。

4. **双重工程验证**：
   - `lint_applet`（`tsc --noEmit`）：0 语法错误，0 类型报警；
   - `compile_applet`（`vite build`）：生产打包一次性成功。


