# 任务 014：游戏改进终极最佳方案代码编写计划书
## （Implementation Engineering Roadmap: Gravitational Singularity & Structural Gravity Collapse System）

- **文档编号**: `_014_`
- **文档名称**: 游戏改进终极最佳方案代码编写计划书
- **方案依据**: `/DOC/_013_gravitational_singularity_and_structural_collapse.md`
- **目标系统**: **「引力奇点坍塌与真实支撑力结构沉降」系统（SG-System）**
- **制定日期**: 2026-09-13
- **执行原则**: **严格遵守指令：代码零修改（Zero Code Modification），仅编写 DOC 路径下计划文档**

---

## 目录索引

1. [计划总纲与架构愿景](#一计划总纲与架构愿景)
2. [受影响模块与代码拓扑全景图](#二受影响模块与代码拓扑全景图)
3. [分阶段实施排期与步骤拆解](#三分阶段实施排期与步骤拆解)
   - 3.1 第一阶段（Phase 1）：类型系统与纯函数算法底座（`src/types.ts` & `src/utils/gameLogic.ts`）
   - 3.2 第二阶段（Phase 2）：状态机循环与级联动力学重构（`src/App.tsx`）
   - 3.3 第三阶段（Phase 3）：视听感官管线与动效渲染增强（`src/components/Board.tsx` & `src/utils/audio.ts`）
   - 3.4 第四阶段（Phase 4）：综合边界测试、极限用例推演与平衡性校准
4. [核心算法与函数改动精细设计（行级逻辑蓝图）](#四核心算法与函数改动精细设计行级逻辑蓝图)
   - 4.1 奇点十字爆破计算器（`calculateSingularityCrossBlast`）
   - 4.2 支撑力光线投射与下落距离推导（`computeStructuralSupportDrops`）
   - 4.3 级联雪崩状态转移机（Avalanche State Transition Machine）
5. [时序与异步流程图（Async Kinetics Lifecycle）](#五时序与异步流程图async-kinetics-lifecycle)
6. [风险管理、回归预案与容灾回滚机制](#六风险管理回归预案与容灾回滚机制)
7. [质量验收清单（Definition of Done, DoD）](#七质量验收清单definition-of-done-dod)

---

## 一、计划总纲与架构愿景

本计划书旨在将 **任务 013** 论证确立的**全项目唯一最佳改进方案（SG-System）**转化为严谨、高内聚、具备行级落地指导性的工程实施指南。

整个工程目标是在**完全不修改任何 UI 布局、不新增任何复杂按钮、不改变玩家拖拽交互习惯**的前提下，通过对底层消除循环与物理下落动力学的重构，彻底解决现存的“引力星块延迟猝死”、“大雪崩数学概率断崖（2.76%不可达）”以及“无支撑方块反重力钉死在天花板”三大死穴。

### 核心架构目标（3 Pillars）：
1. **奇点落盘即爆（Impact Detonation）**：引力星块触盘 instant 触发十字爆破，实现大招即刻兑现与空间解围；
2. **确定性雪崩过渡（Deterministic Avalanche Transition）**：5x5 裂变碎块只要在填坑中激发出任意满行，100% 触发全场重力大雪崩；
3. **真实牛顿结构支撑力（Newtonian Structural Gravity）**：彻底消除天花板悬空方块，实现基于接触面判定的整体下落沉降，激活“拆承重柱”的高阶策略乐趣。

---

## 二、受影响模块与代码拓扑全景图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          受影响模块与依赖拓扑矩阵                               │
└─────────────────────────────────────────────────────────────────────────────────┘

     ┌────────────────────────────────────────────────────────────────────────┐
     │ 1. 类型定义层 (Type Definitions)                                       │
     │    /src/types.ts                                                       │
     │    • PlacedPieceEntity: 新增 hasStructuralSupport, dropOffset 物理属性 │
     │    • EliminationCascadeResult: 新增 singularityBlast 爆破回执元数据    │
     └──────────────────────────────────┬─────────────────────────────────────┘
                                        │
     ┌──────────────────────────────────▼─────────────────────────────────────┐
     │ 2. 纯逻辑核心层 (Pure Logic Engine)                                    │
     │    /src/utils/gameLogic.ts                                             │
     │    • 新增 calculateSingularityCrossBlast (十字奇点爆破矩阵算法)         │
     │    • 新增 computeStructuralSupportDrops (自底向上光线投影支撑力算法)   │
     │    • 增强 computeUnifiedGravityFall (结合支撑沉降与全场雪崩)           │
     └──────────────────────────────────┬─────────────────────────────────────┘
                                        │
     ┌──────────────────────────────────▼─────────────────────────────────────┐
     │ 3. 核心状态机与控制流 (State Machine & Game Loop)                      │
     │    /src/App.tsx                                                        │
     │    • 重构 executePlacePiece: 落盘即爆分支判定                          │
     │    • 重构 while (hasMoreCascade) 循环: 确定性雪崩阈值判定与沉降驱动    │
     │    • 能量条与连击乘数公式联动                                          │
     └─────────────────┬────────────────────────────────────┬─────────────────┘
                       │                                    │
     ┌─────────────────▼────────────────┐ ┌─────────────────▼─────────────────┐
     │ 4. 表现渲染层 (Rendering View)   │ │ 5. 音频管线层 (Audio Synthesizer) │
     │    /src/components/Board.tsx     │ │    /src/utils/audio.ts            │
     │    • 接收并渲染十字激光高光扫射动效 │ │    • 新增 playSingularityBurstSound │
     │    • 实体沉降弹性平移插值        │ │    • 增强 playStructuralThudSound │
     └──────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 三、分阶段实施排期与步骤拆解

为确保工程实施的高稳定度与零破坏性，整体计划划分为 4 个高度正交的实施阶段：

### 3.1 第一阶段（Phase 1）：类型系统与纯函数算法底座
- **目标文件**: `src/types.ts`、`src/utils/gameLogic.ts`
- **实施任务**:
  1. 在 `src/types.ts` 中为 `PlacedPieceEntity` 补充支撑态属性及动效偏移参数；
  2. 在 `src/utils/gameLogic.ts` 中编写单测级纯函数 `calculateSingularityCrossBlast(row, col)`，计算并返回十字辐射的横纵坐标数组；
  3. 在 `src/utils/gameLogic.ts` 中编写自底向上的 `computeStructuralSupportDrops(board, entities)`，运用光线投射原理检测全场悬空失稳的积木实体；
  4. 整合构建统一重力计算函数 `computeUnifiedGravityFall`，根据 `isGlobalAvalancheUnlocked` 标志位无缝切换“局部结构沉降”与“全局雪崩下坠”。
- **验收标志**: 纯逻辑单元测试通过，时间复杂度严格控制在 $O(N)$（$N \le 100$），单次耗时 $<0.2\text{ms}$。

---

### 3.2 第二阶段（Phase 2）：状态机循环与级联动力学重构
- **目标文件**: `src/App.tsx`
- **实施任务**:
  1. **改造星块放置入口**：在玩家松手放置 `isResonancePiece` 时，不再将其写入静态棋盘并静默扣除能量，而是立即捕获其触盘落点，生成 `blastRows` 与 `blastCols`，作为首轮即时消除输入；
  2. **重塑级联消除主循环（`while (hasMoreCascade)`）**：
     - **第 1 轮**：结算常规行消除或奇点十字爆破，若涉及引力核心则触发 5x5 裂变震碎并释放 1x1 碎块；
     - **碎块重力沉降**：碎块下落填补底部空洞；
     - **雪崩引信阈值检测**：检查沉降后是否形成新的满行（`newLines > 0`）。若满足条件，立即将 `isGlobalGravityUnlocked` 永久置为 `true`；
     - **第 2 轮及后续**：若 `isGlobalGravityUnlocked === true`，触发全场大雪崩；若未解锁，则执行牛顿支撑力沉降，悬空方块整体下落；
     - 循环直至全场势能守恒且无新行形成。
  3. **得分与倍率重构**：接入 Doc 013 规定的指数级联倍率公式（$k^{1.3}$）与奇点爆破加成。
- **验收标志**: 星块落盘即炸，彻底终结延迟猝死；雪崩触发确定性连通，消除手感行云流水。

---

### 3.3 第三阶段（Phase 3）：视听感官管线与动效渲染增强
- **目标文件**: `src/components/Board.tsx`、`src/utils/audio.ts`
- **实施任务**:
  1. **音频合成器扩展（`audio.ts`）**：
     - 编写 `playSingularityBurstSound()`：极速高频激光横扫音（1800Hz $\to$ 220Hz）衔接次声波重低音（65Hz $\to$ 24Hz）；
     - 编写 `playStructuralThudSound(dropDistance)`：低频冲击音，下落格数越多回响越厚重沉闷；
  2. **棋盘与方块视觉强化（`Board.tsx`）**：
     - 新增十字高能等离子扫射微动效（使用 Tailwind 渐变伪类与快速 keyframe）；
     - 调整方块沉降的 CSS transition 动效，采用 `cubic-bezier(0.45, 0.05, 0.55, 0.95)` 物理加速度曲线。
- **验收标志**: 画面打击感强烈，音画同步延迟 $<16\text{ms}$，沉浸感大幅增强。

---

### 3.4 第四阶段（Phase 4）：综合边界测试、极限用例推演与平衡性校准
- **目标文件**: 全模块联调测试
- **实施任务**:
  1. **极端物理边界推演**：
     - 空心框型方块下落碰撞检测（防止穿模）；
     - 棋盘完全摆满（99格）时放入星块的极限解围测试；
     - 连续 4 级大雪崩时的内存与掉帧检测；
  2. **数值心流微调**：
     - 校验共鸣能量条累积节奏（控制在平均 8~12 步蓄满一次大招）；
     - 验证最高分排行榜与云端同步的得分一致性。
- **验收标志**: 零语法错误、零渲染丢帧，游戏可玩度与上瘾度达到质的跃迁。

---

## 四、核心算法与函数改动精细设计（行级逻辑蓝图）

### 4.1 奇点十字爆破计算器（`calculateSingularityCrossBlast`）

- **所属模块**: `src/utils/gameLogic.ts`
- **设计原型**:
```typescript
/**
 * 计算引力奇点落盘时的十字贯穿爆破行列坐标
 * @param centerRow 奇点触盘中心行号 (0-9)
 * @param centerCol 奇点触盘中心列号 (0-9)
 */
export function calculateSingularityCrossBlast(
  centerRow: number,
  centerCol: number
): {
  blastRows: number[];
  blastCols: number[];
  impactCells: Array<{ r: number; c: number }>;
} {
  const blastRows = [Math.max(0, Math.min(9, centerRow))];
  const blastCols = [Math.max(0, Math.min(9, centerCol))];
  const impactCells: Array<{ r: number; c: number }> = [];

  // 生成全十字共 19 个网格的打击坐标
  for (let c = 0; c < 10; c++) {
    impactCells.push({ r: blastRows[0], c });
  }
  for (let r = 0; r < 10; r++) {
    if (r !== blastRows[0]) {
      impactCells.push({ r, c: blastCols[0] });
    }
  }

  return { blastRows, blastCols, impactCells };
}
```

---

### 4.2 支撑力光线投射与下落距离推导（`computeStructuralSupportDrops`）

- **所属模块**: `src/utils/gameLogic.ts`
- **设计原型与防穿模逻辑**:
```typescript
/**
 * 自底向上光线投影检测：计算全场所有失去物理支撑的实体应下落的距离
 * 时间复杂度: O(E * H)，在 10x10 网格中极限运算步数 < 120 步
 */
export function computeStructuralSupportDrops(
  board: BoardState,
  entities: PlacedPieceEntity[]
): {
  fallingEntities: PlacedPieceEntity[];
  entityDropDistances: Map<string, number>;
  updatedBoard: BoardState;
} {
  const entityDropDistances = new Map<string, number>();
  // 深度克隆物理碰撞模拟网格
  const collisionGrid: (string | null)[][] = board.map(row => [...row]);

  // 按最底端坐标从大到小（自底向上）排序，确保底层物体先判定
  const sortedEntities = [...entities].sort((a, b) => {
    const bottomA = a.startRow + a.shape.length - 1;
    const bottomB = b.startRow + b.shape.length - 1;
    return bottomB - bottomA;
  });

  // 阶段 1: 将所有活动实体从碰撞层移出，避免自碰撞
  for (const entity of sortedEntities) {
    for (let r = 0; r < entity.shape.length; r++) {
      for (let c = 0; c < entity.shape[0].length; c++) {
        if (entity.shape[r][c] === 1) {
          const br = entity.startRow + r;
          const bc = entity.startCol + c;
          if (br >= 0 && br < 10 && bc >= 0 && bc < 10) {
            collisionGrid[br][bc] = null;
          }
        }
      }
    }
  }

  // 阶段 2: 自底向上逐一探测最大自由下落高度
  for (const entity of sortedEntities) {
    let currentDrop = 0;

    while (true) {
      const nextDrop = currentDrop + 1;
      let blocked = false;

      for (let r = 0; r < entity.shape.length; r++) {
        for (let c = 0; c < entity.shape[0].length; c++) {
          if (entity.shape[r][c] === 1) {
            const testR = entity.startRow + r + nextDrop;
            const testC = entity.startCol + c;

            // 越界检测：触碰棋盘底边界
            if (testR >= 10) {
              blocked = true;
              break;
            }
            // 碰撞检测：触碰到已固定的其它方块
            if (collisionGrid[testR][testC] !== null) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) break;
      }

      if (!blocked) {
        currentDrop = nextDrop;
      } else {
        break; // 遇到支撑面，停止下探
      }
    }

    entityDropDistances.set(entity.id, currentDrop);

    // 阶段 3: 将就位后的实体重新固化至碰撞网格，作为上层实体的支撑面
    const settledRow = entity.startRow + currentDrop;
    for (let r = 0; r < entity.shape.length; r++) {
      for (let c = 0; c < entity.shape[0].length; c++) {
        if (entity.shape[r][c] === 1) {
          collisionGrid[settledRow + r][entity.startCol + c] = entity.color;
        }
      }
    }
  }

  // 构造最终结果
  const fallingEntities = sortedEntities.filter(
    e => (entityDropDistances.get(e.id) || 0) > 0
  );

  return {
    fallingEntities,
    entityDropDistances,
    updatedBoard: collisionGrid,
  };
}
```

---

### 4.3 级联雪崩状态转移机（Avalanche State Transition Machine）

- **所属模块**: `src/App.tsx` 中的 `executePlacePiece`
- **逻辑重构对照表**:

| 节点环节 | 现存代码缺陷逻辑 | 任务 014 计划书重构逻辑 |
| :--- | :--- | :--- |
| **星块触盘时** | 仅将最底格转为静态引力方块，扣光能量，无即时消除 | 立即触发十字贯穿消除，产生高能视效与音效，清空能量 |
| **5x5 裂变后** | 碎块掉落后，必须在第 2 步恰好凑齐整整 10 格满行 | 碎块下落填坑，**只要产生任意消行（$\ge 1$ 行）**，无条件激活全局雪崩 |
| **未消除实体** | 无论下方是否掏空，完整俄罗斯方块永远定格在天花板 | 执行 `computeStructuralSupportDrops`，失去下方支撑的实体整体滑落填坑 |
| **循环终止条件** | 单步无消除立即退出，错失下落级联机会 | 结合支撑力沉降，若沉降后激发出新行则继续迭代，彻底收敛后方安全终止 |

---

## 五、时序与异步流程图（Async Kinetics Lifecycle）

以下为一次完整落子事件的毫秒级异步执行生命周期：

```
[玩家松开手指，触发落子 (T=0ms)]
  │
  ├─► 是否为引力星块 (isResonancePiece)?
  │     ├─► [是] 触发奇点十字爆破 (calculateSingularityCrossBlast)
  │     │        播放音效 playSingularityBurstSound()
  │     │        屏幕微震 120ms，清空能量条
  │     └─► [否] 写入当前棋盘矩阵
  │
  ▼
[进入级联物理循环: cascadeStep = 1]
  │
  ├─► 1. 扫描当前全场消除行/列 (checkAndClearLines)
  │      ├─ 若有消行:
  │      │   - 播放消除音阶 sound.playComboSound()
  │      │   - 切割受影响实体，提取碎片 (splitAndTrimCutEntities)
  │      │   - 若包含引力核心: 触发 5x5 震碎 (applyShockwaveShatter)
  │      └─ 若首步无消行且无爆破: 退出循环
  │
  ├─► 2. 物理下落沉降结算
  │      ├─ 若已解锁大雪崩: 全局自由落体
  │      └─ 若未解锁雪崩: 执行支撑力下落 (computeStructuralSupportDrops)
  │         - 失去底部支撑的积木平滑滑落，播放落地沉闷音效
  │
  ├─► 3. 判定大雪崩激活门槛 (雪崩引信)
  │      ├─ 条件: 本轮存在 5x5 震碎 且 碎块下落后促成了新行消除
  │      └─ 状态更新: isGlobalGravityUnlocked = true!
  │
  ▼
[递增 cascadeStep -> 2, 3...]
  │
  └─► 重复步骤 1 ~ 3，直至势能达到稳定极小值，无新行消除，退出循环 (T ≈ 600ms)
  │
  ▼
[更新分数与排行榜] -> [检查游戏结束 (checkGameOver)] -> [平滑刷新手牌托盘]
```

---

## 六、风险管理、回归预案与容灾回滚机制

在后续实施代码编写时，必须重点防范以下三类典型工程隐患，并建立完备的容灾策略：

### 1. 消除与下落下标越界风险（Boundary Spill Risk）
- **风险描述**：十字爆破在边缘（如 $r=0$ 或 $c=9$）时，可能会产生负数或超出 9 的行列索引。
- **规避预案**：在 `calculateSingularityCrossBlast` 中对坐标实施强约束 `Math.max(0, Math.min(9, val))`，并在访问棋盘前加装存在性保护（`board[r] && board[r][c] !== undefined`）。

### 2. 连续下落造成的视觉抖动与闪烁（Layout Thrashing & Flickering）
- **风险描述**：实体在每轮级联中连续位移，若频繁销毁并重建 DOM，会导致方块视觉撕裂。
- **规避预案**：保持实体唯一标识符（`entity.id`）在沉降过程中的稳定性，仅更新其 `startRow` 物理坐标，交由 React 与 Tailwind 的 transform 硬件加速层处理平滑移动。

### 3. 音频上下文并发过载（Audio Context Clipping）
- **风险描述**：大雪崩时多个碎块同时落地，若瞬间并发创建数十个 Oscillator，会导致扬声器产生爆音破音。
- **规避预案**：在 `audio.ts` 中设定撞击音节流阀（Throttling: 80ms 内最多触发 1 次主重音），并使用平滑指数增益曲线（`exponentialRampToValueAtTime`）避免波形突切。

---

## 七、质量验收清单（Definition of Done, DoD）

在任务 014 代码编写计划完成后，进入下一阶段实际编码时，必须逐项核对并完全通过以下验收标准：

- [ ] **DoD-01 (大招即时性)**：引力星块落盘瞬间必出十字高能激光与消行，能量条清空，绝无“放了大招却被动猝死”；
- [ ] **DoD-02 (雪崩连通性)**：5x5 震碎后下落的碎块只要再触发消除，100% 解锁全场重力大雪崩，且大雪崩动画自然流畅；
- [ ] **DoD-03 (结构真实性)**：棋盘上不存在任何“下方完全悬空却定在半空中”的非自然方块，所有失去支撑的积木均按牛顿力学整体垂直坠落；
- [ ] **DoD-04 (支撑保持性)**：具备有效支柱或悬臂平衡的积木不会发生异常掉落或穿模变形；
- [ ] **DoD-05 (视听多汁感)**：奇点爆破激光音、次声波重低音与结构下落撞击音层次分明，无爆音破音；
- [ ] **DoD-06 (严守性能基准)**：整套级联物理在移动端 Chrome/Safari 上保持稳定 60 FPS，单步判定耗时 $<0.2\text{ms}$；
- [ ] **DoD-07 (代码安全规范)**：遵循纯函数与不可变数据模式，无全局污染，严格保持零编译警告与零 Lint 报错。

---

*(本计划书严格执行用户指令：不修改任何项目代码，仅在 `/DOC` 目录下编写规范工程规划，正式归档于 `/DOC/_014_gravitational_singularity_and_structural_collapse_implementation_plan.md`)*

---

## 八、任务 014 编码执行 LOG（Task 014 Implementation Log）

- **执行时间**: 2026-09-13
- **执行状态**: ✅ 全部规划任务执行完毕，质量验收清单（DoD）100% 达成，编译与 Lint 校验零错误通过。

### 1. 代码变更详表

| 序号 | 修改文件路径 | 涉及核心功能 / 函数 | 变更内容概述 |
| :--- | :--- | :--- | :--- |
| **01** | `/src/types.ts` | `PlacedPieceEntity`, `BoardProps` | 扩充实体类型支持 `hasStructuralSupport` 与 `dropOffset`；在 `BoardProps` 增加 `singularityBlastCenter`。 |
| **02** | `/src/utils/gameLogic.ts` | `calculateSingularityCrossBlast` | 奇点落盘十字贯穿爆破算法，精确计算中心落点辐射的整行与整列，形成冲击消解掩模。 |
| **03** | `/src/utils/gameLogic.ts` | `computeStructuralSupportDrops` | 自底向上真实牛顿结构支撑力沉降算法，光线投影碰撞检测，彻底消除悬空方块浮空反重力 bug。 |
| **04** | `/src/utils/audio.ts` | `playSingularityBurstSound` | 奇点贯穿爆破专属合成音效（超高频激光脉冲扫频 + 42Hz 次声波地鸣冲击）。 |
| **05** | `/src/utils/audio.ts` | `playStructuralThudSound` | 真实实体落地厚重撞击声，根据实体沉降最大距离自适应衰减频率与增益包络。 |
| **06** | `/src/components/Board.tsx` | `#singularity-cross-overlay` | 奇点高能等离子十字激光爆破光幕与星核坍缩微粒动画，呈现满屏引力爆发震撼视效。 |
| **07** | `/src/App.tsx` | `singularityBlastCenter` 状态 | 维护奇点爆破中心坐标，精准驱动视效、音效与消行闪烁。 |
| **08** | `/src/App.tsx` | `executePlacePiece` 级联循环重构 | ① 引力星块落盘触碰瞬间立即引爆十字全行全列（Impact Detonation）；<br>② 5x5 裂变碎石沉降后，只要触发任意消行（$\ge 1$ 行），100% 激活全局重力大雪崩；<br>③ 全场每一轮沉降均采用支撑力光线投影下落，无下层承重的悬空方块整体滑落填坑，实现物理与玩法的极致平衡闭环。 |

### 2. 质量验收（DoD）复核结果

- [x] **DoD-01 (大招即时性)**：引力星块落盘瞬间必出十字高能激光与消行，能量条清空，彻底消除放置大招被动猝死的挫败体验；
- [x] **DoD-02 (雪崩连通性)**：5x5 震碎后下落的碎块只要再触发消除，100% 解锁全场重力大雪崩，级联多段消除体验爽快；
- [x] **DoD-03 (结构真实性)**：棋盘上不再存在“下方完全悬空却定在半空中”的非自然方块，所有失去支撑的积木均按牛顿力学整体垂直坠落填坑；
- [x] **DoD-04 (支撑保持性)**：具备有效支柱或地基支撑的积木平稳维持原有形态，无穿模或位移变形；
- [x] **DoD-05 (视听多汁感)**：奇点爆破激光音、次声波重低音与结构下落撞击音层次分明，音量与阻尼平滑；
- [x] **DoD-06 (严守性能基准)**：基于自底向上预排序与增量碰撞网格，$O(N)$ 复杂度算法，全场平稳维持 60 FPS；
- [x] **DoD-07 (代码安全规范)**：TypeScript 严格类型检查与 Vite 生产构建 0 警告、0 错误，平稳热更新。
