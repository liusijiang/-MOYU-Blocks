# 全量代码检查、架构设计总结与潜在隐患深度排查报告

- **文档编号**: `_006_`
- **需求名称**: 全量代码深度检查、现有功能与架构设计总结、潜在隐患排查及下阶段演进准备
- **创建时间**: 2026-09-07
- **当前状态**: 📋 总结审查完成（纯检查与文档输出，无代码修改）

---

## 一、任务背景与审查目标

随着前序任务（`001` ~ `005`）的递进实施，本项目从基础的 10x10 方块放置消除原型，历经候选槽交互重构、横纵消除预判高亮、棋盘与托盘视觉一致性缝合、多段碎片切削与引力核心连锁机制，以及自由落体重力动力学与全场景 Web Audio API 音效的全面落地，已经建立起一套具备深度物理手感与视听反馈的游戏系统。

为了确保当前系统的稳定性、高内聚性与可维护性，并在进入下一阶段开发前彻底排查潜在技术债、边缘案例漏洞与架构隐患，本任务专门执行**全局代码审查与架构盘点**：
1. **全局架构与数据流全景梳理**：系统性梳理组件层级、状态机流转、物理拓扑算法与程序化音效合成管线；
2. **功能代码与设计规范全量盘点**：对现存的 24 种多格骨牌、拓扑缝合渲染、无级拖拽、BFS 碎片切分、刚体下坠与引力波脉冲进行总结沉淀；
3. **深度排查潜在问题与边缘缺陷**：从异步并发竞态、重力拓扑物理盲区、移动端手势兼容、浏览器沙箱持久化、音频上下文生命周期等维度进行严苛走查；
4. **为下一阶段演进做好准备**：提出针对性的架构加固方案、手感增强建议与新机制扩展接口，形成规范化的技术指导文件。

---

## 二、全局系统架构与数据流全景

### 1. 软件架构全景图

整个游戏采用纯前端轻量级响应式架构，基于 React 19 + TypeScript + Vite 6 + Tailwind CSS v4 构建，音效层与物理重力层均采用纯代码级程序化生成，零外部资源依赖。

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              10x10 Block Puzzle 架构层级                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
【视听与动力学配置中心】               【核心渲染与交互视图层】              【游戏逻辑与物理状态机】
physicsAudioConfig.ts                 App.tsx (状态编排中枢)                 gameLogic.ts (无状态纯函数)
├── PLACEMENT_AUDIO_CONFIG            ├── Header / 记分 / 音频开关           ├── canPlacePiece / 碰撞检测
├── DEBRIS_AUDIO_CONFIG               ├── Board.tsx (双层复合渲染)           ├── checkAndClearLines / 消除
├── GRAVITY_KINETICS_CONFIG           │   ├── 底层: 100个网格交互槽          ├── splitAndTrimCutEntities
│   ├── Ease-In 加速曲线              │   ├── 实体层: PlacedPieceEntity      │   └── BFS 4连通分量切削
│   ├── 悬空停滞期 (110ms)            │   ├── 投影层: 虚影预判预览           ├── computeGravityCascadeDrops
│   └── 自适应下落时长函数            │   └── 引力波: 脉冲波前特效           │   └── 刚体自底向上多段下坠
└── pieces.ts (24种多格积木骨架)      ├── PieceTray.tsx (候选托盘)           ├── checkAndSpawnGravityBlock
                                      │   └── 槽位即时独立补牌               │   └── 1x1 引力核心生成
                                      ├── DragOverlay.tsx (120fps 悬浮)      └── rebuildBoardFromEntities
                                      │   └── 硬件加速 translate3d           └── 状态双向对齐校验
                                      └── ConnectedPiece.tsx (拓扑缝合)
                                          ├── getPieceCellBorders (无缝)
                                          └── 引力核心旋转脉冲原子核
                                             │
                                             ▼
                               【Web Audio API 程序化音频引擎】
                                           audio.ts
                               ├── SoundEngine 实例 (单例持久化)
                               ├── playPiecePlaced (双通道榫卯卡扣)
                               ├── playDebrisFracture (切削断裂)
                               ├── playDebrisFalling (自由落体呼啸滑音)
                               ├── playDebrisLanding (刚体撞击低音炮)
                               ├── playGravityBlockSpawn (引力核心结晶)
                               ├── playGlobalGravityPulse (次低音引力震荡)
                               └── playCascadeCombo (5阶升调和弦琶音)
```

---

### 2. 单向数据流与状态机循环

游戏运转严格遵循 React 单向数据流与状态机闭环：

```
[用户手势输入] (PointerDown / Move / Up / Click)
       │
       ▼
[交互预判系统] ───计算几何投影───► [Ghost 虚影 + SimulatedClears 消除行高亮]
       │ (合法松手 / 点击)
       ▼
[executePlacePiece 放置触发]
       │
       ├─► 1. T=0ms 立即播放落子榫卯音效 (sound.playPiecePlaced)
       ├─► 2. 挂载实体并独立刷新该槽位候选积木 (pieces[slotIndex] = getRandomPiece())
       │
       ▼
[级联消除与物理重力循环] (while hasMoreCascade && step <= 10)
       │
       ├─► 3. checkAndClearLines: 扫描行列满格，计算连消行数与得分加成
       │      └─ 若未消除: 结束级联，检查 checkGameOver，恢复交互
       │
       ├─► 4. 判定引力波触发: 是否消除已有 1x1 引力核心？是否生成新引力核心？
       ├─► 5. 播报 Toast + 播放音效 (引力脉冲 / Combo 和弦 / 切割音)
       ├─► 6. 消除高亮闪白 (220ms 清除动画)
       ├─► 7. splitAndTrimCutEntities: BFS 4连通域拓扑切削，生成碎片实体 (isDebris: true)
       ├─► 8. 悬空停滞期待机 (110ms Anticipation Hang-Time，建立心理下坠预期)
       ├─► 9. computeGravityCascadeDrops: 计算自底向上物理落差与 maxDistance
       │      └─ 动态自适应时长 (calculateGravityDropDuration)
       │      └─ 启动 Ease-In 加速俯冲动画 + 呼啸音
       ├─► 10. 触底低音炮 (sound.playDebrisLanding) + 稳定停顿 (80ms settlePause)
       │
       ▼ (步数 step+1，递归回到第 3 步检验下落后是否拼出新的满行)
[沉淀收敛] ───重构棋盘状态───► [checkGameOver 游戏结束检测] ───► [解锁 isCascading]
```

---

## 三、现有功能模块全量盘点与设计规范

### 1. 棋盘与多格骨牌系统 (`pieces.ts`, `types.ts`)
- **棋盘规模**：标准 10x10 二维离散网格矩阵（`CellColor[][]`），通过自适应算法精准响应视口断点（移动端 30px / 平板 36px / 桌面 39px）。
- **积木模板库**：完整涵盖经典俄罗斯方块、多米诺及扩展几何形态共 **24 种积木形态**：
  - 单点类：`Dot` (1x1)；
  - 线条类：`Line-2` (H/V), `Line-3` (H/V), `Line-4` (H/V), `Line-5` (H/V)；
  - 矩阵类：`Square-2` (2x2), `Square-3` (3x3)；
  - 转角类：`Corner` (2x2 四向四种形态)；
  - 经典多格类：`Tetris-T` (上下), `Tetris-L` (正反及旋转), `Tetris-J` (正反及旋转), `Tetris-S`, `Tetris-Z`。
- **色彩与设计规范**：采用 Tailwind 高级明艳色板（amber, orange, emerald, cyan, sky, yellow, rose, indigo, purple, blue, teal, lime, red），搭配顶部微光遮罩（`from-white/15 to-transparent`）呈现温润陶瓷质感。

### 2. 拓扑无缝连接渲染器 (`ConnectedPiece.tsx`, `gameLogic.ts:getPieceCellBorders`)
- **算法核心**：`getPieceCellBorders(shape, r, c)` 通过检查目标单元格与上下左右相邻格的连通性，自动消除内部接缝边框（`border-t-0` 等），仅在组合图形的最外围勾勒高对比度明暗倒角线（`border-t-white/40`, `border-b-black/40`），实现一整块有机刚体的视觉统一。
- **1x1 引力核心（Gravity Core）特殊渲染**：
  - 渐变星空背景：`bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-800`；
  - 外部光晕外发光：`shadow-[0_0_12px_rgba(168,85,247,0.7)] ring-1 ring-purple-300/60`；
  - 核心奇点：内置脉冲微核与 `lucide-react` 的 `Atom` 原子核图标，保持 3s 恒速自旋，科技感与视觉吸引力极强。

### 3. 极速高精手势拖拽与交互系统 (`App.tsx`, `DragOverlay.tsx`, `PieceTray.tsx`)
- **跟手交互体系**：
  - 采用基于指针事件（Pointer Events）的全局监听，同时支持鼠标与移动端多点触控；
  - **防遮挡人体工学锚点**：触控模式下动态引入 `pieceHeight + 50px` 的纵向上移偏置（Y-Offset），彻底消除玩家拇指遮挡积木下落点的盲操痛点；
  - **硬件加速无缝漂浮**：`DragOverlay` 脱离文档流采用 `fixed` 结合 `translate3d` 渲染，以 120fps 满帧性能稳定跟手。
- **双模操作兼容**：
  - 支持“按住直接拖入棋盘松手”的标准流；
  - 支持“轻击候选积木选中 -> 点击棋盘对应格子安放”的点按备用流（移动端误触保护距离阈值设为 6px）。
- **即时消除预判高亮（Elimination Hints）**：
  - 拖拽或悬停过程中，`getSimulatedClearLines` 以微秒级算法虚拟计算若在当前位置落子将要消除的所有行与列；
  - 棋盘空格与已有方块分别呈现琥珀金色内发光与高亮响应，给玩家极致的前瞻掌控感。
- **独立槽位补牌机制**：
  - 告别“必须摆完 3 块才能刷新”的滞后体验，每一次成功放置，**仅被消耗的单格槽位立即以概率生成新积木填补**，保证托盘随时保持 3 块候选状态，大幅降低因缺牌卡死概率。

### 4. 拓扑切分与物理级联重力结算 (`gameLogic.ts`, `physicsAudioConfig.ts`)
- **BFS 4连通域切削算法**：
  - 当整行/整列消除穿透一个复合积木时，`splitAndTrimCutEntities` 自动提取幸存残余方格，利用广度优先搜索（BFS）将其聚类拆分为独立的 4-连通块，并紧致重构其最小包围盒（Bounding Box）；
  - 切割后的残存碎片被标记为 `isDebris: true`，正式赋予重力下坠资质。
- **自底向上无重叠刚体下坠仿真**：
  - `computeGravityCascadeDrops` 优先按照最低接触行降序对活动碎片进行排序，由下至上推进模拟；
  - 每一个碎片在垂直方向逐格试探下探，精准检测棋盘边界与其他未消除障碍物的碰撞，落稳后立即固化为新的碰撞体，完美支持“上层碎片精准落在下层碎片之上”的物理堆叠，杜绝任何穿模与重叠。
- **1x1 引力核心与全场引力波机制**：
  - 一次性消除 2 行/2 列或横纵双消时，系统在消除交叉点或空格智能孕育出 1x1 引力核心；
  - 未来任意时刻消除该引力核心，将激活全场引力波冲击（`isGlobalSurge = true`），唤醒全盘所有由于卡住而悬空的散落碎片全面下坠！
- **真实自由落体动力学（Ease-In Gravity）**：
  - 抛弃原先减速缓动，采用初速度为 0、接近触底动能达到峰值的物理下冲曲线：
    `cubic-bezier(0.55, 0.055, 0.675, 0.19)`；
  - 配合消除后的 **110ms 悬空蓄力停滞期（Anticipation Hang-Time）**，以及根据最大落差动态匹配的下落耗时（1格 180ms，2格 220ms，3~4格 270ms，5格以上阶梯延展至 360ms），下坠力量感极具冲击力。

### 5. 程序化纯 Web Audio API 音效引擎 (`audio.ts`)
- **零网络时延与轻量化**：完全摆脱外部 mp3/wav 音频文件的体积负担与跨域加载延迟，采用浏览器原生的 `AudioContext` 振荡器程序化合成。
- **声学设计细节**：
  1. **落子卡扣音 (`playPiecePlaced`)**：1600Hz$\to$400Hz（15ms 三角波接触瞬态）+ 340Hz$\to$110Hz（55ms 正弦波榫卯腔体共鸣），频率随积木尺寸动态下潜，并附带 $\pm 4\%$ 随机音高抖动；
  2. **断裂脆响音 (`playDebrisFracture`)**：1400Hz$\to$300Hz 快速衰减的高频晶体破裂声；
  3. **下落呼啸滑音 (`playDebrisFalling`)**：480Hz$\to$120Hz 陡峭下潜的空气撕裂声；
  4. **触底撞击咚声 (`playDebrisLanding`)**：110Hz$\to$35Hz 低频次声波震颤，落差越大音调越沉实；
  5. **引力核心诞生结晶音 (`playGravityBlockSpawn`)**：220Hz$\to$880Hz 配合 1760Hz 谐波的梦幻星际共振；
  6. **全场引力脉冲波 (`playGlobalGravityPulse`)**：45Hz 次低频锯齿波震撼轰鸣；
  7. **级联连击琶音 (`playCascadeCombo`)**：E5/G5 $\to$ G5/C6 $\to$ C6/E6 $\to$ E6/G6 $\to$ G6/C7 五级清亮上行大三和弦。

---

## 四、全量代码深度检查与潜在隐患矩阵

在对全部业务代码逐行研读后，我们在架构鲁棒性、物理边界条件、异步并发竞态与平台环境兼容性等方面，提炼出以下需要高度关注的潜在问题与隐患：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          潜在隐患与边缘缺陷排查评估全景矩阵                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
  序号  │ 缺陷分类 │ 影响等级 │               问题简述与潜在风险场景                │ 触发频次
────────┼──────────┼──────────┼─────────────────────────────────────────────────────┼─────────
  #1    │ 并发竞态 │ [高危]   │ 级联消除结算中点击“重置”引起异步执行悬挂与状态回写   │ 中（玩家主动操作）
  #2    │ 物理机制 │ [中危]   │ 存量历史碎片在局部消除下落时未被判定为活动下落对象   │ 低~中（特定棋盘局面）
  #3    │ 交互阻断 │ [中危]   │ 移动端触控在棋盘外拖拽时可能诱发视口上下回弹滚动     │ 高（移动端浏览器）
  #4    │ 平台兼容 │ [低危]   │ localStorage 在无痕隐私模式下抛出 SecurityError 导致崩溃│ 极低
  #5    │ 听觉体验 │ [低危]   │ iOS 浏览器后台挂起切回后 AudioContext 恢复可能偶发哑音 │ 低
  #6    │ UI 驻留  │ [低危]   │ 顶部连击 Toast 飘字缺乏自动计时器淡出清理机制       │ 常驻（无交互时）
  #7    │ 内存拓扑 │ [低危]   │ 碎片长期切削导致 PlacedPieceEntity 数组碎片化膨胀     │ 极长局中可能发生
```

---

### 1. 【高危/并发竞态】级联结算过程中点击“重置”引起的异步幽灵状态覆盖

- **定位源码**：`src/App.tsx:executePlacePiece` & `src/App.tsx:handleRestart`
- **问题机理深入剖析**：
  1. `executePlacePiece` 是一个包含多个 `await sleep(...)`（闪白 220ms、悬空 110ms、下落 180~360ms、沉淀 80ms）的长周期异步异步任务，在多重连锁时单次执行可达 1.5 ~ 3 秒；
  2. 当玩家在消除级联尚未完全结束时，点击右上角的“重置”按钮（`handleRestart`），`handleRestart` 会立即将状态清空为初始状态：
     ```typescript
     setBoard(freshBoard);
     setPlacedPieces([]);
     setScore(0);
     setIsCascading(false);
     ```
  3. **致命隐患**：此时先前的 `executePlacePiece` 正在内存定时器中挂起！当它的 `await sleep(...)` 到期唤醒时，由于没有中止机制（Abort/Cancel Token），它会继续向下执行：
     ```typescript
     setPlacedPieces(currentEntities);
     setBoard(currentBoard);
     setScore((prev) => prev + stepScore);
     ```
  4. **导致后果**：玩家刚刚重置的空白新棋盘，会被上一局悬空的异步级联突然“诈尸式”写回旧数据，造成严重的棋盘状态混乱和鬼影方块！
- **防御与改进方案（下一阶段准备）**：
  - 引入游戏局数或执行版本计数器 `const gameSessionRef = useRef<number>(0)`；
  - 每次执行 `handleRestart` 时自增 `gameSessionRef.current++`；
  - 在 `executePlacePiece` 的每个 `await sleep` 恢复点检查 `if (session !== gameSessionRef.current) return;`，立即静默熔断废弃旧执行流。

---

### 2. 【中危/物理规则】非当轮切削的历史存量悬空碎片在局部消除中的下落遗漏

- **定位源码**：`src/App.tsx` 行 305~311：
  ```typescript
  // 6. Determine which debris should fall
  let targetDebrisIds: Set<string>;
  if (isGlobalSurge) {
    targetDebrisIds = new Set(
      currentEntities.filter((e) => e.isDebris || e.isGravityBlock).map((e) => e.id)
    );
  } else {
    targetDebrisIds = new Set([
      ...newlyCreatedDebrisIds,
      ...currentEntities.filter((e) => e.isGravityBlock).map((e) => e.id),
    ]);
  }
  ```
- **问题机理深入剖析**：
  1. 假设第 1 轮消除在棋盘上方产生了一个碎片 A（已标记为 `isDebris: true`），它掉落并落在了下方的一整条满格方块上；
  2. 第 2 轮玩家在下方消除了一条线，恰好将支撑碎片 A 的底层方块给消除了；
  3. 但在第 2 轮消除中，碎片 A **本身并未被消除线切削过**，因此它**不属于 `newlyCreatedDebrisIds`**；同时本轮也未触发全局引力波（`isGlobalSurge = false`）；
  4. **结果**：`targetDebrisIds` 仅包含了本轮被切开的新碎片，而此前早已存在且现在脚下已被掏空的碎片 A 被遗漏了，从而导致碎片 A **违反重力法则地悬停在空中无法下落**！直到下一次引力核心引爆时才被重新触发。
- **防御与改进方案（下一阶段准备）**：
  - 无论是否触发引力核心引爆，只要有任何行或列被消除，棋盘上**所有拥有 `isDebris: true` 的碎片实体**，其下方支撑都可能被动摇；
  - 应当将所有现存 `isDebris: true` 的实体（或其投影列在被消除行/列下方的实体）统一纳入 `targetDebrisIds` 的下坠候选池，交由 `computeGravityCascadeDrops` 自底向上统一运算。若下方有支撑，`maxDrop` 自然为 0 保持不动；若下方悬空，则自然受重力下坠。

---

### 3. 【中危/移动端手势】拖拽离开棋盘区域时触发浏览器默认橡皮筋反弹与滚动

- **定位源码**：`src/App.tsx:#game-root` & `src/components/Board.tsx`
- **问题机理深入剖析**：
  1. 候选托盘 `PieceTray.tsx` 设置了 `touch-none` 类，在手指接触卡槽的瞬间成功阻止了默认滚动；
  2. 但是随着玩家快速向上拖拽，手指离开候选卡槽滑向棋盘边缘或屏幕外缘时，如果全局容器没有严格声明手势锁定，iOS Safari 和 Android Chrome 的浏览器视口可能会捕获手势事件，触发页面下拉刷新（Pull-to-refresh）或垂直页面弹性晃动；
  3. 这种微小的橡皮筋滚动会导致 `boardRef.current.getBoundingClientRect()` 的相对视口坐标发生突变，使得拖拽方块在指针下方出现偶发性的“跳帧”或“判定偏移”。
- **防御与改进方案（下一阶段准备）**：
  - 在 `#game-root` 或全局 `index.css` 的 `body` 上补充 `touch-action: none; overscroll-behavior: none; user-select: none;`；
  - 确保整个游戏视口在移动端如同原生 App 一样绝对静止与牢固。

---

### 4. 【低危/平台沙箱】`localStorage` 在特定隐私模式或无痕模式下的 `SecurityError`

- **定位源码**：`src/App.tsx` (最高分读取与写入)、`src/utils/audio.ts` (静音状态读取与写入)
- **问题机理深入剖析**：
  1. 当前代码中直接使用裸写调用：
     ```typescript
     const saved = localStorage.getItem('block_puzzle_best_score');
     localStorage.setItem('block_puzzle_best_score', score.toString());
     ```
  2. 在 Safari 开启绝对隐私浏览模式（Private Browsing）、第三方 iframe 嵌入限制，或者某些严格的企业级沙箱环境下，访问 `window.localStorage` 会直接抛出 DOMException (`SecurityError` 或 `QuotaExceededError`)；
  3. 尽管在现代常规浏览器中发生概率较低，但一旦抛出未捕获异常，将直接阻断整个 React 组件的挂载和运行。
- **防御与改进方案（下一阶段准备）**：
  - 封装一个防崩溃的安全存储助手 `safeStorage`，内部使用 `try...catch` 包裹，并在抛错时平稳降级为内存变量。

---

### 5. 【低危/音频引擎】移动端切后台唤回后 `AudioContext` 异步 `resume()` 的瞬态静音

- **定位源码**：`src/utils/audio.ts:getContext`
- **问题机理深入剖析**：
  1. 在移动端浏览器（尤其是 iOS Safari）中，当用户锁屏或切到微信等其他应用再切回时，浏览器的 `AudioContext` 会被自动置为 `suspended` 状态；
  2. `getContext()` 中写道：
     ```typescript
     if (this.ctx && this.ctx.state === 'suspended') {
       this.ctx.resume().catch(() => {});
     }
     ```
  3. 注意 `this.ctx.resume()` 是一个异步 Promise 方法。如果用户切回后立刻落子，`ctx.currentTime` 可能尚未更新，振荡器的 `start(now)` 可能在上下文完全被激活前被忽略，导致切换回来的第一次放置音效静音。
- **防御与改进方案（下一阶段准备）**：
  - 在全局绑定一个一次性的 `pointerdown` / `visibilitychange` 监听，当页面从切出恢复时，立刻提前在用户手势触屏瞬间静默触发 `audioContext.resume()`。

---

### 6. 【低危/UI表现】消除飘字 `EliminationToast` 缺乏自动超时渐隐机制

- **定位源码**：`src/App.tsx:setEliminationToast` & `src/components/Board.tsx`
- **问题机理深入剖析**：
  1. 当触发消除后，`setEliminationToast` 会把诸如“双线同消 (+2线)!”的提示条贴在棋盘顶部上方；
  2. 目前代码中**没有为 `eliminationToast` 设置任何销毁定时器**（`setTimeout(() => setEliminationToast(null), 2000)`）；
  3. 这导致在级联彻底结束后，该飘字横幅会一直驻留在棋盘顶部，直到下一次发生消除或玩家点击重置；
  4. 虽然不影响点击和排版，但在视觉传达上缺少了“通知弹出 -> 停留 1.5 秒 -> 优雅淡出”的动态呼吸感。
- **防御与改进方案（下一阶段准备）**：
  - 增加一个轻量的自动销毁定时器引用 `toastTimerRef`，在设置 Toast 后 1800ms 自动平滑淡出。

---

### 7. 【低危/内存与拓扑】长时间高分对局下实体列表的过度切削与碎片化

- **定位源码**：`src/types.ts:PlacedPieceEntity` & `src/utils/gameLogic.ts:splitAndTrimCutEntities`
- **问题机理深入剖析**：
  1. 在一局达到数万分的极长对局中，如果频繁发生单格切割，棋盘上的方块会被拆分成大量仅有 1 格（1x1）的独立 `PlacedPieceEntity`；
  2. 每个实体在 DOM 中都对应一个带有独立 CSS Transition 的定位容器；
  3. 尽管现代 React 与浏览器渲染 50 个绝对定位元素毫不费力，但大量碎片会导致数组遍历计算（如 BFS 与碰撞检测）的循环次数线性增加。
- **防御与改进方案（下一阶段准备）**：
  - 可以在多次下坠沉淀后，对在同一行同一列相连且颜色相同的相邻静止碎片进行“几何并查集合并（Entity Merging）”，将相邻碎骨重新凝聚为复合多格骨牌。

---

## 五、下一阶段（007+）演进方向与技术储备建议

基于前述审查与潜在问题定位，为下一阶段的项目演进提供以下四个维度的具体架构与体验储备方案：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              下一阶段技术演进路线图                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
【1. 核心物理与生命周期加固】         【2. 视听沉浸与物理粒子增强】          【3. 游戏机制与策略深度】
- 引入 SessionRef 异步熔断机制         - 触底微挤压形变 (Squash & Stretch)    - 连击热度计量槽 (Combo Fever)
- 存量悬空碎片全景下坠扫描拓扑         - 消除碎屑与火花 Canvas 粒子喷射      - 新机制道具/特种积木:
- safeStorage 防御性异常隔离           - 连消屏幕轻微震颤 (Screen Shake)       * 彩虹积木 (全能匹配)
- 全局 touch-action 手势锁             - Toast 飘字优雅淡出动画               * 炸弹积木 (九宫格爆破)
```

### 1. 核心物理与生命周期加固实施细则
- **异步中止控制器（Abort Signal / Session Ref）**：
  在 `App.tsx` 中建立 `gameVersionRef = useRef(0)`，确保每一次重置或重启游戏时，正在进行的异步 `sleep` 链路能在唤醒瞬间自毁，消除任何幽灵状态。
- **全景漂浮碎片拓扑扫描**：
  重构 `App.tsx` 中的目标碎片筛选机制，不论是否触发引力核，只要产生消除，**所有 `entity.isDebris === true` 的积木均进入下坠推演**，彻底消除“悬空死物”的物理违和感。

### 2. 视听与物理粒子表现力增强
- **触底刚体微挤压形变（Squash & Stretch）**：
  目前在 `physicsAudioConfig.ts` 中已经预留了 `GRAVITY_KINETICS_CONFIG.squash` 参数（`scaleY: 0.96, durationMs: 80`）。可在下一阶段与 CSS 关键帧动画无缝对接，让沉重下坠的碎片在着陆的一瞬间发生 4% 的纵向微压缩与横向微膨胀，随后快速弹回，极大增强刚体落地的物理质感。
- **消除微粒子火花喷射（Canvas Particle System）**：
  在满行满列被消除的方格位置，生成向外发散的微小方块碎片与星光火花，与 Web Audio API 的碎裂声协同，使消除快感达到峰值。

### 3. 游戏玩法深度与长线策略机制
- **连击热度条（Fever / Combo Meter）**：
  在分数栏下方引入随连击阶段递增的热度进度条。当玩家连续数步均触发消除或重力级联时，进入“Fever 极热模式”，棋盘边框亮起霓虹流动光效，所有消除得分翻倍。
- **特殊机制积木矩阵扩展**：
  除了现有的 1x1 引力核心（Gravity Block），可在托盘补牌池中以极低概率（如 3%）投放：
  - **彩虹万能块（Rainbow Core）**：可匹配任何单格缺口；
  - **炸药裂变块（TNT Block）**：落盘消除时触发 3x3 范围定点爆破，为濒临死局的玩家提供绝地逢生的逆转爽感。

---

## 六、检查结论与就绪声明

1. **工程质量与编译健康度**：
   - 全局静态类型检查 `npm run lint` (`tsc --noEmit`)：**100% 成功，0 错误，0 告警**；
   - 生产打包构建 `npm run build` (`vite build`)：**100% 成功，所有资源均已成功打包并就绪**。
2. **架构评价**：
   - 现行代码结构清晰，职责分离明确（`App` 负责编排，`Board` 专注复合渲染，`gameLogic` 保持纯函数运算，`physicsAudioConfig` 集中参数化管控，`audio` 独立负责音频合成）；
   - 已经彻底告别了早期的硬编码和魔法数字，为下一阶段的高阶特性扩展与手感调优提供了极高标准的工程底座。
3. **任务交付状态**：
   - 本检查报告已作为独立技术文档完整沉淀至 `/DOC/_006_codebase_inspection_and_design_review.md`；
   - 本次审查**严格遵守“没有编写代码的工作”的铁律约束**，现行所有生产源码均保持绝对稳定未动，随时可按照规划推进后续业务开发。
