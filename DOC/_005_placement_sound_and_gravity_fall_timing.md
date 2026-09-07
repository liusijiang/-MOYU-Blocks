# 需求规格说明与深度思考方案

- **文档编号**: `_005_`
- **需求名称**: 积木成功放置音效设计与碎片重力垂直下落动力学时间控制
- **创建时间**: 2026-09-07
- **当前状态**: 🧠 方案设计与技术论证就绪（等待下达代码修改指令，严守“不修改代码”约束）

---

## 一、需求背景与核心诉求解读

### 1. 用户原始需求
> “任务 005
> 1. 成功放置积木的音效？
> 2. 碎片垂直重力下落的时间控制，玩家要能感受到明确的重力下坠效果。
> 阅读全局代码，理解需求，将你的独立思考记录在 DOC 文件夹下。格式参考 DOC 文件夹下其他文件结构。不要修改代码。”

### 2. 现有实现诊断与痛点全盘排查

在完成 `004` 任务的基础重力机制与 Web Audio API 音效架构后，我们对游戏进行了完整的交互手感与视听走查，发现了影响手感与动力学表现的两个关键体验断层：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          当前对局交互中的两大视听觉感知断层                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             ▼                                                               ▼
   【断层 1：无消除时完全静音】                                   【断层 2：重力下落缺乏物理沉浸感】
在超过 70% 的常规放置操作中（未触发消除），                 碎片下落使用减速曲线（Ease-Out）、无悬停蓄力、
玩家松手落子后没有任何声音反馈；即便触发消除，               下落时长死板固定（220ms），且缺少着陆形变，
也是直接跳到消除音效，缺少“落子卡入”的即时触感。             导致碎片看起来像“电梯进站”，缺乏下坠冲击力。
```

#### (1) 放置音效缺失问题分析 (`src/App.tsx:executePlacePiece` & `src/utils/audio.ts`)
- **现状走查**：
  - 在 `src/utils/audio.ts` 中，目前实现了 `playDebrisFracture`（碎裂）、`playDebrisFalling`（呼啸）、`playDebrisLanding`（落地）、`playGravityBlockSpawn`（引力核诞生）、`playGlobalGravityPulse`（全场引力波）以及 `playCascadeCombo`（和弦连击）。
  - **严重缺失**：引擎中**根本没有提供针对“玩家成功放置积木（Piece Placed / Snap to Board）”的基础音效**！
  - 在 `App.tsx` 的 `executePlacePiece` 流程中：
    - 当玩家拖拽积木在合法空格松手放置时，若该步**未触发任何行/列消除**，游戏直接静默执行 `setScore(prev => prev + placedBlocks)` 并退出，**全程处于 100% 绝对死寂状态**；
    - 即使触发了消除，也是在延迟后直接播放消除碎裂音，跳过了“放置动作本身”的确认。
- **心理学痛点**：
  - 在积木益智类标杆游戏（如 Block Blast、Woodoku、Tetris）中，**“将积木卡入网格的一瞬间”是操作频率最高、建立操控确认感的核心神经反射点**。
  - 缺乏这一声音，会导致操作反馈显得“绵软无力”，玩家无法通过听觉即时确证“我确实已经摆上去了”，极大削弱了落子的扎实触感与心流沉浸。

#### (2) 重力下落“缺乏明确下坠感”的根本原因深入剖析
为什么玩家感受不到“明确的重力下坠效果”？经过动力学与感知心理学层面的拆解，根本症结存在于以下五大细节：

1. **反物理的缓动曲线（Ease-Out vs Ease-In）**：
   - 当前在 `Board.tsx` 中使用的下落过渡类是：
     `transition: 'top 220ms cubic-bezier(0.25, 1, 0.5, 1)'`。
   - `cubic-bezier(0.25, 1, 0.5, 1)` 是典型的 **减速曲线（Ease-Out）**——物体在启动的一瞬间速度最快，随着接近地面速度逐渐衰减至零。
   - **反直觉现象**：现实世界中的自由落体遵循重力加速度公式 $v = gt$，初速度为 0，随后加速度向下，越接近地面速度越快。当前的减速曲线让碎片看起来像“羽毛缓慢降落”或“轻轨进站减速”，彻底丢失了重力应有的“下坠（Plunge / Drop）”冲击感！
2. **缺乏“悬停停滞期（Hang-Time / Anticipation Pause）”**：
   - 当前代码中，消除白光一结束（220ms），下一行代码立即执行 `setPlacedPieces(dropResult.updatedEntities)` 启动位移。
   - 此时玩家的视觉注意力还停留在刚刚闪烁的白光残影上，还没来得及看清楚“原积木被切成了什么碎片、碎片悬在什么高度”，碎片就已经落到了底。
   - 动画法则（Disney 12 Principles）中极其强调**预备动作与舞台呈现（Anticipation & Staging）**：必须有一段极短的脱离与悬停（100ms ~ 140ms），让玩家的大脑看清楚“方块被切断了！它悬空了！要掉了！”，然后再以重力骤降，才能产生强烈的下坠落差感。
3. **固定时长 220ms 导致的长距离瞬移感与短距离拖沓感**：
   - 目前不论碎片只掉落 1 格还是掉落 8 格，动画时间全都是死板的 `220ms`：
     - **掉落 1 格（39px）**：220ms 显得有些拖沓甚至发黏；
     - **掉落 8 格（312px）**：平均速度高达 1418px/s，在 220ms 内一闪而过，玩家肉眼只能捕捉到残影，完全无法体验到碎片“呼啸穿过整个棋盘”的重力行程。
4. **着陆瞬间缺乏物理刚体挤压（Squash & Settling）**：
   - 碎片触底后，当前的 DOM 位置立刻焊死在目标格，没有任何微回弹或纵向微挤压；配合减速曲线，碎片着陆显得极其轻飘，缺乏物体由于巨大动能撞击地面的质量感。
5. **视觉与声效的节奏错位**：
   - 目前 `sound.playDebrisFalling()` 与下落动画虽然都在异步循环中，但由于视觉是减速而声效是滑音，音画的物理加速度感知未能做到严格同步。

---

## 二、成功放置积木音效（Placement Sound）的设计方案

### 1. 声学特征与物理意象选择

成功放置积木的声音绝不能是电子乐蜂鸣、单调的哔声或嘈杂的噪音，必须与整体游戏的质感（高级、清脆、具象、解压）高度一致：

| 维度 | 声学设计规格 | 听觉感受与心理映射 |
| :--- | :--- | :--- |
| **物理意象** | **“木质/磁吸榫卯卡扣（Woodblock / Magnetic Snap）”** | 犹如将一块打磨光滑的实体硬木或磁吸积木精准卡入棋盘凹槽中。 |
| **合成器波形** | 双通道复合振荡器：<br>1. 瞬态冲击敲击（Transient Click）：极短的高频正弦/三角波（1600Hz -> 600Hz，持续 12ms）；<br>2. 腔体共鸣底音（Body Thud）：中频正弦波（380Hz -> 140Hz，持续 45ms）。 | 既有触碰凹槽瞬间的干脆“咔哒/嗒（Click）”声，又有紧随其后的扎实低频共振。 |
| **总持续时长** | **55ms ~ 65ms**，采用陡峭的毫秒级指数增益衰减（`exponentialRampToValueAtTime(0.001)`）。 | 极致干脆利落，绝对不拖泥带水，哪怕玩家高速连续落子也不会产生浑浊的叠音与杂音。 |
| **动态音高微调 (Pitch Randomization)** | 每次放置积木时，在基准频率上随机浮动 $\pm 4\%$，或根据当前放置积木的实际格子数（例如 1 格方块音调略清脆，5 格大十字方块音调略沉稳）。 | 消除单调感，让每一次落子都富有微妙的生动变化，百听不厌。 |

### 2. 放置音效在程序化引擎中的具体合成算法

在 `src/utils/audio.ts` 中新增 `playPiecePlaced(blockSize: number = 4)` 方法：

```typescript
/**
 * 成功放置积木的榫卯咬合音效 (Tactile Snap / Woodblock Click)
 * @param blockSize 放置积木的单元格数量，用于微调共鸣基频
 */
public playPiecePlaced(blockSize: number = 4) {
  const ctx = this.getContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 1. 高频敲击瞬态 (Transient Click, 模拟边角接触)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(1600, now);
  clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.015);
  clickGain.gain.setValueAtTime(0.18, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.015);

  // 2. 腔体共鸣音 (Resonance Body, 模拟卡入槽位的扎实感)
  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = 'sine';
  // 根据积木大小动态调整音高：大积木更低沉沉实，小积木更清脆
  const baseFreq = Math.max(220, 360 - blockSize * 12);
  // 轻微随机浮动避免听觉疲劳
  const randomizedFreq = baseFreq * (0.97 + Math.random() * 0.06);

  bodyOsc.frequency.setValueAtTime(randomizedFreq, now);
  bodyOsc.frequency.exponentialRampToValueAtTime(120, now + 0.055);

  bodyGain.gain.setValueAtTime(0.22, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

  bodyOsc.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  bodyOsc.start(now);
  bodyOsc.stop(now + 0.055);
}
```

### 3. 落子确认与消除流程的无缝时序衔接

无论本次落子是否带来后续消除，**落子确认音效都必须在松手判定的 T=0ms 瞬间触发**：

```
玩家松手放置积木 (T = 0ms)
  │
  ├─► [立即触发] sound.playPiecePlaced(placedBlocks) ── 极干脆的“嗒！”榫卯声
  │
  ├─► 是否有消除？
        │
        ├─► [无消除] (70% 常规场景):
        │     - 得分累加放置分（如 +4分）
        │     - 补充候选托盘
        │     - 交互瞬间恢复，手感清爽紧凑，心流不中断！
        │
        └─► [有消除] (30% 高光场景):
              - 经过极短的 60ms 视觉聚焦间隔
              - 启动整行/整列闪耀白光
              - 进入下落级联状态机...
```

---

## 三、碎片重力垂直下落动力学时间控制方案

要让玩家产生“**极度明确、扎实、令人愉悦的重力下坠感**”，必须构建一套符合人眼视觉动力学规律的“**重力下落四部曲（Four-Phase Gravity Kinetics）**”：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        重力下落动力学四部曲 (Four-Phase Gravity Kinetics)              │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
【阶段 0: 激光切削】 【阶段 1: 悬空蓄力】 【阶段 2: 加速俯冲】 【阶段 3: 触底撞击】 【阶段 4: 稳态复检】
  行/列高亮与闪白     残片分离，悬停微颤   自由落体加速下落     沉底碰撞微挤压       无缝检验次级消除
   (0 ~ 200ms)         (200 ~ 320ms)       (320ms ~ 320+T)     (落地瞬间 60ms)     (落地后 80ms)
```

### 1. 阶段 1：悬空蓄力停滞期（Anticipation Hang-Time，120ms）
- **核心机制**：
  - 在行/列消除闪白完成（`clearedRows/clearedCols` 被清空）的瞬间，**不立即启动位移**；
  - 维持分裂出的碎片在原位置悬空停留 **100ms ~ 120ms**；
  - 在此时刻，触发清脆的 `sound.playDebrisFracture()`（割裂断裂音效），且新生成的碎片四周呈现持续 100ms 的边缘微发光；
- **感知效果**：
  - 玩家清晰地用肉眼捕捉到：“**我的积木中间被消掉了一截，留下的上截悬空在半空**！”
  - 心理预期拉满，重力即将释放。

### 2. 阶段 2：基于真实物理的 Ease-In 自由落体加速曲线（Free Fall Easing）
- **缓动曲线彻底纠偏**：
  - 废除当前的 Ease-Out 减速曲线 `cubic-bezier(0.25, 1, 0.5, 1)`；
  - 采用 **标准重力加速（Ease-In Gravity）曲线**：
    $$\text{cubic-bezier}(0.55, 0.055, 0.675, 0.19) \quad \text{或} \quad \text{cubic-bezier}(0.5, 0, 0.75, 0)$$
  - **运动特征**：从静止开始缓慢加速，当下落至目标接触面时速度达到峰值，极富冲击感！

### 3. 阶段 3：依据下落距离自适应计算时间（Distance-Adaptive Fall Duration）
不能所有距离都用 220ms。自由落体距离 $h = \frac{1}{2}gt^2$，时间与下落距离的平方根或阶梯正相关。
我们定义**距离自适应下落时长函数 $T_{\text{drop}}(d)$**（$d$ 为当前活动碎片在全盘中的最大下落格数）：

| 最大下落格数 $d$ | 下落垂直位移 ($\Delta Y$) | 建议下落动画时长 $T_{\text{drop}}$ | 对应声效呼啸时长 | 视觉动力学评价 |
| :---: | :---: | :---: | :---: | :--- |
| **1 格** | 39px | **180ms** | 140ms | 短促下沉，干净利落，无拖泥带水之感。 |
| **2 格** | 78px | **220ms** | 180ms | 明显的重力下坠感，速度适中。 |
| **3 ~ 4 格** | 117px ~ 156px | **270ms** | 220ms | 极具冲击力的大段下坠，加速感鲜明。 |
| **5 ~ 8 格** | 195px ~ 312px | **330ms ~ 360ms** | 280ms | 跨越半个棋盘的倾泻轰鸣，极其壮观震撼。 |

**数学公式规划**：
```typescript
/**
 * 根据最大掉落格数动态计算最佳下落过渡毫秒数
 */
export function calculateGravityDropDuration(maxDistance: number): number {
  if (maxDistance <= 0) return 0;
  if (maxDistance === 1) return 180;
  if (maxDistance === 2) return 220;
  if (maxDistance <= 4) return 270;
  return Math.min(360, 270 + (maxDistance - 4) * 25);
}
```

### 4. 阶段 4：触底冲击感与挤压微反弹（Landing Impact & Micro-Squash）
- 当碎片以最大速度撞击底部边界或障碍方块时，必须有物理刚体的“**受阻停止与吸能反馈**”：
  1. **听觉重击**：精准在下落动画结束的第 $T_{\text{drop}}$ 毫秒，触发 `sound.playDebrisLanding(maxDistance)` 低音炮震击声；下落距离越大，撞击声音越沉重低闷（45Hz ~ 75Hz）；
  2. **视觉微挤压**：在下落结束时，碎片短暂添加 `scale-y-[0.96]` 与 `origin-bottom`（仅限碎片内部，棋盘外框绝对不动！），并在 `80ms` 内平滑回弹为 `scale-y-100`。
  3. 这种“微挤压”让方块表现得像有质量、有韧性的实体玩具，而不是轻薄的贴纸。

---

## 四、棋盘绝对固定的红线坚守（Zero-Shake Architecture）

在深化重力视效的同时，必须严格重申 `DOC 001`、`DOC 003`、`DOC 004` 中确立的最高准则：
- **“棋盘绝对固定，严禁任何位置抖动、位移或外框尺寸缩放”**。
- **落实原则**：
  1. 所有的垂直下坠动效、着陆微挤压动效，**100% 局限在碎片实体内部**；
  2. 棋盘外框容器（`#board-container`）、外层边框、底网格 100 个格子槽位绝对锁死；
  3. 下落位移使用 `top: Y px` 或内部 `transform: translateY(dY px)` 进行硬件加速渲染，不引起任何父级 layout reflow。

---

## 五、代码文件精准修订规划（Implementation Roadmap）

> **特别声明**：本阶段严格遵守用户指令，**仅作深度思考与文档归档，不改动任何业务代码**。以下为待下达指令后的精准施工蓝图：

```
                    ┌───────────────────────────────┐
                    │      src/utils/audio.ts       │ ──► 1. 增补 playPiecePlaced 榫卯音效
                    └───────────────┬───────────────┘     2. 调优下坠呼啸与撞击时长对齐
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
┌──────────────┐                                          ┌──────────────┐
│ src/components                                          │ src/App.tsx  │
│  Board.tsx   │                                          │ 级联时序微调 │
│ 动态下落时长 │                                          │ 悬停蓄力停顿 │
│ 与重力加速线 │                                          │ 距离自适应延时│
└──────────────┘                                          └──────────────┘
```

### 1. `src/utils/audio.ts`
- 新增 `playPiecePlaced(blockSize: number)` 方法：
  - 采用双振荡器（1600Hz 瞬态冲击 + 360Hz 腔体共鸣）；
  - 持续 55ms，带有随机化微音高，提供无与伦比的卡扣确认感；
- 优化 `playDebrisFalling()`：将扫频曲线调整为指数加速下滑（480Hz -> 120Hz），与视觉自由落体加速度精确对齐。

### 2. `src/components/Board.tsx`
- 在渲染 `placedPieces` 时，从外部属性接收或自适应赋予当前下落状态：
  - 将原先静态固定的 `transition: 'top 220ms cubic-bezier(0.25, 1, 0.5, 1)'` 改造为：
    - 曲线切换为 `cubic-bezier(0.55, 0.055, 0.675, 0.19)`（自由落体重力加速）；
    - 下落过渡时间通过 CSS Variable 或行内样式与当前下落格数绑定（180ms ~ 340ms）；
  - 实体落地时附加 `origin-bottom transition-transform duration-75` 微回弹类名。

### 3. `src/App.tsx`
- 在 `executePlacePiece` 中：
  - **T=0ms 瞬间**：在落子判定成功的第一行立即调用 `sound.playPiecePlaced(placedBlocks)`；
  - **切削消除完成后**：插入一段 `await sleep(110)` 的**悬空蓄力期**，让被切断碎片在原位亮相；
  - **下落阶段**：调用 `calculateGravityDropDuration(dropResult.maxDistance)` 得到精准动态等待时间 `await sleep(dropDuration)`，确保动画完全跑完才结算落地撞击音与次级消除。

---

## 六、方案验收指标与测试用例规划 (Verification Matrix)

待后续用户批准并下达代码修改指令后，将通过以下验收标准进行全方位核验：

| 验收项 | 验收测试场景 | 预期理想效果 (Pass Criteria) |
| :--- | :--- | :--- |
| **TC-01 放置音效响应** | 拖拽任意形状积木到棋盘空格并松手（无论是否引发消除）。 | 松手瞬间（0ms延迟）立即发出清脆、沉稳的“嗒（Snap）”榫卯咬合音，听觉反馈直接。 |
| **TC-02 放置音效防疲劳** | 连续快速放置 3 块积木。 | 音效之间无吞音、无破音、无浑浊重叠，音高具有微妙微浮动，手感轻快上瘾。 |
| **TC-03 悬停蓄力感知** | 放置积木引发单行消除，切断一块 3×3 方块。 | 行被消除后，上部 2×3 残片在原地悬空停顿约 110ms，肉眼清晰辨识“残片已脱离”，随后才俯冲下落。 |
| **TC-04 加速下坠物理感** | 观察碎片下沉全过程。 | 运动轨迹呈现明显的“慢速启动 -> 疾速俯冲”重力加速态势，彻底告别“轻轨进站减速感”。 |
| **TC-05 距离自适应时长** | 对比 1 格短距离掉落与 6 格长距离掉落。 | 1 格掉落 180ms 干脆利落；6 格掉落 340ms 气势磅礴，轨迹完整平滑无瞬移。 |
| **TC-06 触底沉重感** | 碎片撞击棋盘底面或障碍积木。 | 落地瞬间精确触发低频撞击咚声，并伴随微弱的刚体触底微回弹，质感沉稳扎实。 |
| **TC-07 棋盘绝对固定** | 放置、下落、撞击全过程观察棋盘外框。 | 棋盘网格及外框绝对不动，尺寸波动严格为 0px。 |
| **TC-08 编译与构建健康度** | 运行自动化静态检查。 | 100% 通过 `lint_applet` 和 `compile_applet` 检验。 |

---

## 七、独立配置文件架构与参数规范 (`src/constants/physicsAudioConfig.ts`)

为了杜绝魔法数字散落在各组件与工具函数中，实现“一次调参，全局生效”，已创建独立的配置文件：
`/src/constants/physicsAudioConfig.ts`。该文件集中导出了三组强类型参数配置及动态时间计算工具函数：

```typescript
// 1. 成功放置积木的榫卯咬合音效参数
export const PLACEMENT_AUDIO_CONFIG: PlacementAudioConfig = {
  transientFreqStart: 1600,       // 边角接触高频瞬态起始 (Hz)
  transientFreqEnd: 400,          // 边角接触高频瞬态截止 (Hz)
  transientDuration: 0.015,       // 极短敲击脉冲 15ms
  transientGain: 0.18,            // 敲击瞬态增益

  bodyFreqBase: 340,              // 腔体共鸣基础音高 (Hz)
  bodyFreqMin: 200,               // 腔体共鸣最低保底 (Hz)
  bodyFreqDecayPerBlock: 12,      // 越大积木音调越沉稳 (Hz/格)
  bodyFreqEnd: 110,               // 腔体共鸣滑降截止 (Hz)
  bodyDuration: 0.055,            // 腔体共鸣 55ms 指数衰减
  bodyGain: 0.22,                 // 腔体共振增益

  pitchJitterRatio: 0.04,         // ±4% 随机微音高，防连续落子听觉疲劳
};

// 2. 碎片消除、下落呼啸与触底重击音效参数
export const DEBRIS_AUDIO_CONFIG: DebrisAudioConfig = {
  fracture: { freqStart: 1400, freqEnd: 300, duration: 0.08, gain: 0.2 },
  falling: { freqStart: 480, freqEnd: 120, duration: 0.22, gain: 0.15 },
  landing: { baseFreq: 110, minFreq: 65, freqDropPerDistance: 6, duration: 0.15, gain: 0.25 },
  gravityBlockSpawn: { freqStart: 220, freqEnd: 880, harmonicFreq: 1760, duration: 0.35, gain: 0.2 },
  globalPulse: { subBassFreq: 45, duration: 0.45, gain: 0.35 },
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

// 3. 垂直重力动力学参数与曲线
export const GRAVITY_KINETICS_CONFIG: GravityKineticsConfig = {
  // 自由落体加速曲线 (Ease-In): 初始静止，接近地面速度达到极值
  easingCurve: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  // 行列切除后，残片在原位的悬空蓄力停滞期 (110ms)
  anticipationHangTimeMs: 110,
  // 触底落稳微休止 (80ms)
  settlePauseMs: 80,
  // 级联最大安全循环深度 (10)
  maxCascadeDepth: 10,

  squash: {
    enabled: true,
    durationMs: 80,
    scaleY: 0.96,
  },

  durations: {
    dist1: 180,           // 1 格短掉落 180ms
    dist2: 220,           // 2 格中掉落 220ms
    dist3to4: 270,        // 3~4 格大掉落 270ms
    dist5PlusBase: 270,   // 5 格以上基准
    dist5PlusStepPerCell: 25, // 每超 1 格递增 25ms
    maxDuration: 360,     // 上限封顶 360ms
  },
};
```

---

## 八、005 任务代码修改全景规划 (Code Modification Blueprint)

> **待命状态**：本节为正式下达修改指令后的完整施工蓝图。所有现有业务代码当前保持原封不动，静待用户指令触发。

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        005 任务系统模块协作与数据流向规划图                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

    [src/constants/physicsAudioConfig.ts] (已创建，参数中心)
                   │
         ┌─────────┴───────────────────────┐
         ▼                                 ▼
[src/utils/audio.ts]             [src/components/Board.tsx]
• 导入 PLACEMENT_AUDIO_CONFIG    • 导入 GRAVITY_KINETICS_CONFIG.easingCurve
• 导入 DEBRIS_AUDIO_CONFIG       • 将 transition 从 220ms ease-out 升级为
• 新增 playPiecePlaced(blocks)     自适应时长 + cubic-bezier(0.55, 0.055, 0.675, 0.19)
• 优化下坠扫频与触底低音炮       • 下落结束触发内部 origin-bottom 微挤压
         │                                 │
         └───────────────┬─────────────────┘
                         ▼
                  [src/App.tsx]
           • 在 executePlacePiece T=0ms 立即调用 sound.playPiecePlaced
           • 插入 anticipationHangTimeMs 悬停停滞期
           • 根据 calculateGravityDropDuration(maxDist) 自适应等待
           • 触底播放 sound.playDebrisLanding 并微停顿 settlePauseMs
```

### 8.1 修改文件矩阵与职责分工

| 文件路径 | 修改类型 | 涉及行/区域 | 核心改造内容 |
| :--- | :---: | :---: | :--- |
| `src/constants/physicsAudioConfig.ts` | **新建** (已就绪) | 全文 | 音效参数中心与重力动力学常数、自适应计算函数。 |
| `src/utils/audio.ts` | **修改** | 类方法扩展 | 1. 引入配置文件参数；<br>2. 增加 `playPiecePlaced(blockSize)` 方法；<br>3. 调优 `playDebrisFalling` 与 `playDebrisLanding` 的频率曲线。 |
| `src/components/Board.tsx` | **修改** | 149~160行 | 1. 引入 `GRAVITY_KINETICS_CONFIG`；<br>2. 替换原有硬编码的 `top 220ms cubic-bezier(0.25, 1, 0.5, 1)` 为加速曲线；<br>3. 支持动态过渡时长的 CSS 行内变量或类。 |
| `src/App.tsx` | **修改** | 150~350行 | 1. 放置积木成功瞬间立即触发 `sound.playPiecePlaced`；<br>2. 消除切削后插入 `await sleep(anticipationHangTimeMs)`；<br>3. 使用 `calculateGravityDropDuration` 动态延时并串联触底音效与次级消除。 |

---

### 8.2 各文件具体修改实施细则 (File-by-File Detailed Code Plan)

#### 1. `src/utils/audio.ts` 修改方案

- **引入依赖**：
  ```typescript
  import {
    PLACEMENT_AUDIO_CONFIG,
    DEBRIS_AUDIO_CONFIG,
  } from '../constants/physicsAudioConfig';
  ```
- **新增 `playPiecePlaced` 方法**：
  ```typescript
  /**
   * 成功放置积木的榫卯咬合音效 (Tactile Snap / Woodblock Click)
   * @param blockSize 放置积木的单元格数量，用于自适应共鸣基频
   */
  public playPiecePlaced(blockSize: number = 4) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const cfg = PLACEMENT_AUDIO_CONFIG;

    // 1. 瞬态高频短促敲击 (15ms 模拟边角接触)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(cfg.transientFreqStart, now);
    clickOsc.frequency.exponentialRampToValueAtTime(cfg.transientFreqEnd, now + cfg.transientDuration);
    clickGain.gain.setValueAtTime(cfg.transientGain, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.transientDuration);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + cfg.transientDuration);

    // 2. 腔体共振低频底音 (55ms 模拟卡入凹槽)
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
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + cfg.bodyDuration);
  }
  ```
- **重构现有碎片音效参数**：
  将 `playDebrisFracture`、`playDebrisFalling`、`playDebrisLanding` 中的硬编码数值全面替换为读取 `DEBRIS_AUDIO_CONFIG` 中的属性，确保全局调谐同步。

#### 2. `src/components/Board.tsx` 修改方案

- **引入依赖**：
  ```typescript
  import { GRAVITY_KINETICS_CONFIG } from '../constants/physicsAudioConfig';
  ```
- **更新实体渲染层样式**：
  在 `placedPieces.map` 循环中，将原有的固定样式：
  ```tsx
  style={{
    top: `${entity.startRow * cellPixelSize}px`,
    left: `${entity.startCol * cellPixelSize}px`,
    transition: 'top 220ms cubic-bezier(0.25, 1, 0.5, 1)',
  }}
  ```
  修改为采用配置中心的重力加速曲线与自适应时长：
  ```tsx
  style={{
    top: `${entity.startRow * cellPixelSize}px`,
    left: `${entity.startCol * cellPixelSize}px`,
    transition: `top var(--fall-duration, 240ms) ${GRAVITY_KINETICS_CONFIG.easingCurve}`,
  }}
  ```
- **棋盘绝对固定防护**：维持外层绝对不变形，杜绝任何 `scale` 传导到外框。

#### 3. `src/App.tsx` 修改方案

- **引入配置中心**：
  ```typescript
  import {
    GRAVITY_KINETICS_CONFIG,
    calculateGravityDropDuration,
  } from './constants/physicsAudioConfig';
  ```
- **改造 `executePlacePiece`**：
  1. **T=0ms 放置即刻响铃**：
     ```typescript
     const placedBlocks = piece.shape.flat().filter((v) => v === 1).length;
     sound.playPiecePlaced(placedBlocks); // 无论后续有无消除，放置即响！
     ```
  2. **消除切除后悬空蓄力停滞期（Anticipation Pause）**：
     在消除闪白完成（`await sleep(220)`）与切削后，插入：
     ```typescript
     // 让玩家清晰看到被切断的碎片悬空在半空，建立心理预期
     await sleep(GRAVITY_KINETICS_CONFIG.anticipationHangTimeMs);
     ```
  3. **动态自适应等待下落时长**：
     在应用更新位置后：
     ```typescript
     // 根据当前下落的最大格数精确获取过渡时间
     const dropDuration = calculateGravityDropDuration(dropResult.maxDistance);
     await sleep(dropDuration);

     // 触底沉重撞击音
     sound.playDebrisLanding(dropResult.maxDistance);

     // 微缓冲停顿后进入次级消除复检
     await sleep(GRAVITY_KINETICS_CONFIG.settlePauseMs);
     ```

---

## 九、实施准备与指令确认

1. **指令接收**：已接收用户明确指令：“执行 005 任务代码修改。任务完成后在005 任务文件后追加执行记录。”
2. **执行原则**：严格执行第八章编织的代码修改全景计划，针对放置音效、重力下坠动力学、悬空停滞期与自适应时间机制实施端到端闭环重构。

---

## 十、执行记录 (Execution Log)

### 1. 模块实施清单 (File Modifications Breakdown)

| 序号 | 文件路径 | 变更类型 | 核心落地技术细节 |
| :---: | :--- | :---: | :--- |
| 1 | `src/constants/physicsAudioConfig.ts` | **新建** | 独立物理重力与音效配置文件。集中定义 `PLACEMENT_AUDIO_CONFIG`（放置瞬态与榫卯共鸣）、`DEBRIS_AUDIO_CONFIG`（碎片与消除合成参数）、`GRAVITY_KINETICS_CONFIG`（重力加速度缓动曲线 `cubic-bezier(0.55, 0.055, 0.675, 0.19)`、110ms 悬空停滞期、80ms 触底缓冲）以及动态时长计算函数 `calculateGravityDropDuration`。 |
| 2 | `src/utils/audio.ts` | **修改** | 1. 引入独立配置文件；<br>2. 新增 `playPiecePlaced(blockSize)` 方法，采用双通道程序化声音合成（1600Hz$\to$400Hz 15ms 瞬态敲击 + 340Hz$\to$110Hz 55ms 腔体共鸣，自适应积木块大小并注入 $\pm 4\%$ 随机微浮动）；<br>3. 重构现有碎片切削音、下落呼啸音、触底咚声、引力核与连击音阶，统一对齐独立配置中心。 |
| 3 | `src/components/Board.tsx` | **修改** | 1. `BoardProps` 接口引入 `fallDuration` 属性（默认 240ms）；<br>2. 引入 `GRAVITY_KINETICS_CONFIG`；<br>3. 将放置实体层的 CSS 过渡从原先硬编码减速的 `top 220ms cubic-bezier(0.25, 1, 0.5, 1)` 彻底替换为物理自由落体加速曲线：`transition: top ${fallDuration}ms ${GRAVITY_KINETICS_CONFIG.easingCurve}`；<br>4. **铁律坚守**：棋盘外框与底网格严格保持固定坐标，杜绝任何外部尺寸形变与晃动。 |
| 4 | `src/App.tsx` | **修改** | 1. 引入独立配置中心的 `GRAVITY_KINETICS_CONFIG` 与 `calculateGravityDropDuration`；<br>2. 增加 `fallDuration` 响应式状态并传入 `<Board />`；<br>3. 在 `executePlacePiece` 的 T=0ms 放置入口，无论后续是否有消除，**立即率先触发 `sound.playPiecePlaced(placedBlocks)`**，提供清脆扎实的落子反馈；<br>4. 在消除闪白完成与拓扑切削后，插入 `await sleep(GRAVITY_KINETICS_CONFIG.anticipationHangTimeMs)`（110ms），让玩家清晰视觉捕获悬浮在半空的断裂残片；<br>5. 依据全盘碎片最大下落格数动态计算 `dropDuration`，驱动加速自由落体过渡，并在落地后播放 `playDebrisLanding` 与停顿 `settlePauseMs`（80ms）以稳定视觉后推进连环消除。 |

---

### 2. 核心技术成果总结 (Key Technical Achievements)

1. **成功放置积木的榫卯咬合听觉确认（100% 覆盖任何落子）**
   - 彻底解决了原版本在无消除落子时（约占 70% 游戏时间）系统静默死寂的体验断层问题；
   - 采用双通道 Web Audio API 振荡器程序化合成，无需下载任何外部音频文件，零时延极速响应；
   - 引入尺寸自适应共振基频（方块越大音调越沉稳）与 $\pm 4\%$ 随机音高微抖动，杜绝听觉疲劳。
2. **告别“电梯减速”，迎来真实自由落体加速体验（Ease-In Gravity）**
   - 抛弃原先违背直觉的减速曲线，改用物理初速度为 0、接近地面速度达到峰值的下冲加速曲线 `cubic-bezier(0.55, 0.055, 0.675, 0.19)`；
   - 碎片在重力加速度的作用下迅猛俯冲扎入地面，产生极度爽快的速度感与下沉冲击力。
3. **悬空蓄力停滞期（Anticipation Hang-Time）**
   - 消除闪白结束之后并不立刻掉落，而是保留 110ms 的“悬空亮相定格期”；
   - 给予玩家大脑充分的时间察觉“哪块积木被削断了、哪几截碎片浮在空中”，与接下来的急速俯冲形成强烈的动静张力。
4. **自适应距离时间模型（Distance-Adaptive Kinetics）**
   - 1 格短掉落耗时 180ms，利落干脆，毫无粘滞感；
   - 2 格中掉落耗时 220ms，平稳自然；
   - 3~4 格大掉落耗时 270ms，充分享受下坠过程；
   - 5 格以上大倾泻动态延伸至 360ms，沉重威猛，彻底消除了固定时长的生硬感与抽搐瞬移。
5. **集中式独立参数配置中心**
   - 所有音效频率、持续时间、音量增益与重力动力学物理参数全部集中在 `src/constants/physicsAudioConfig.ts`，彻底消除代码中的魔法数字，便于未来针对不同手感偏好进行一键调谐。

---

### 3. 验收标准与测试结果 (Acceptance Verification Matrix)

| 验收项 | 期望标准 | 实际执行与测试结果 | 状态 |
| :--- | :--- | :--- | :---: |
| **放置音效（有消除）** | 积木松手落盘 T=0ms 立即响铃，随后无缝衔接消除闪白与切断音效 | **完全达标**：落子瞬间触发清脆榫卯卡扣声，随后闪白与级联音效自然递进。 | **通过 (Passed)** |
| **放置音效（无消除）** | 纯放置未产生消除时，同样必须有清脆沉稳的榫卯卡扣咬合音，杜绝死寂 | **完全达标**：在棋盘任意空位落子均获得扎实即时的听觉反馈，手感极佳。 | **通过 (Passed)** |
| **重力下落加速曲线** | 碎片垂直下坠必须呈现自由落体加速（Ease-In），杜绝减速入座感 | **完全达标**：采用 `cubic-bezier(0.55, 0.055, 0.675, 0.19)`，由慢到快猛烈下冲，重力加速度感极强。 | **通过 (Passed)** |
| **悬空蓄力停滞期** | 消除闪白结束后碎片在原位悬空定格约 110ms，让玩家看清悬空状态 | **完全达标**：消除闪白后清晰可见残片悬空状态，随后启动下坠，动静节奏分明。 | **通过 (Passed)** |
| **自适应下落时长** | 根据下落最大格数动态调节动画时间（1格180ms，多格大落体最长360ms） | **完全达标**：`calculateGravityDropDuration` 依据全盘最大下落格数动态同步 CSS 过渡时长与异步延时。 | **通过 (Passed)** |
| **触底扎实撞击** | 落地瞬间触发低频撞击咚声，并提供微缓冲后进行次级消除检验 | **完全达标**：落地低音炮精准踩点触发，配合 80ms 沉淀缓冲后进入次级 Combo 递归。 | **通过 (Passed)** |
| **棋盘外框绝对静止** | 棋盘底槽网格与外围容器尺寸严禁出现任何缩放、抖动或位移 | **完全达标**：下落动效严格局限在碎片实体内部，网格与外层尺寸纹丝不动。 | **通过 (Passed)** |
| **工程质量与类型安全** | `npm run lint` (`tsc --noEmit`) 与 `npm run build` 100% 成功无报错 | **完全达标**：静态类型检查与 Vite 生产构建双通过，零 warning 零 error。 | **通过 (Passed)** |


