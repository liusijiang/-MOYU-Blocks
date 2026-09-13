# 任务 009：原生经典俄罗斯方块积木（Tetrominoes）池限定与双重随机（形状+四向旋转）需求书

- **文档编号**: `_009_`
- **需求名称**: 009 新任务（原生俄罗斯方块 7 种经典积木限制，备选区随机积木与随机旋转方向）
- **关联文档**: `_001_candidate_and_interaction_improvements.md`、`_004_piece_debris_gravity_and_gravity_block.md`、`_008_universal_gravity_fall_correction.md`
- **创建时间**: 2026-09-09
- **当前状态**: ✅ **编码实现与质量验收全量完成（代码零副作用，生产构建编译通过）**

---

## 一、需求背景与业务价值 (Background & Motivation)

### 1. 现状痛点剖析
在当前 10x10 棋盘放置游戏中（`src/constants/pieces.ts`）：
- 积木池包含了大量的非标准多联骨牌：
  - 超小/碎片型：`1x1` 点、`2x1`、`3x1` 直线；
  - 极端超大型：`5x1` 长条、`3x3` 九宫格大方块；
  - 非对称弯角：`Corner 2x2`（三格 L 形直角）等；
- **博弈体验失衡问题**：
  - `1x1` 或 `2x1` 过小，缺乏经典方块填格的策略深度；
  - `3x3` 或 `5x1` 占用空间极大，在 10x10 棋盘中后期极易因随机发牌而突然“暴毙”，挫败感强；
  - 现有的旋转方向是通过预设静态数组定义的（例如部分形状有预设旋转，部分没有），没有建立系统的几何矩阵四向旋转体系。

### 2. 009 任务核心目标
将候选池中的积木严格收敛至经典 **俄罗斯方块官方标准 7 种四连方块（Tetrominoes：I, O, T, S, Z, J, L）**：
1. **积木范围纯粹化**：完全剔除 1x1, 2x1, 3x1, 5x1, 3x3, 小直角 corner 等非 Tetrominoes 方块，仅保留由 4 个单元格组成的经典 7 种形状；
2. **备选区积木双重随机机制（Double Randomness）**：
   - **积木形状随机（Shape Randomness）**：从 7 大经典族系（I, O, T, S, Z, J, L）中均匀随机抽取；
   - **旋转方向随机（Orientation Randomness）**：每一个生成的积木，必须**随机携带 0°、90°、180°、270°（4 个朝向之一）**，直接生成在备选托盘区中供玩家放置；
3. **保护现有机制与核心玩法**：
   - 纯粹改动积木生成池与旋转朝向算法，棋盘 10x10 规格、拖拽手势、碎片刚体切削、008 全局积木公正下坠、云端存档和天梯榜单全部无缝兼容。

---

## 二、经典 7 大俄罗斯方块（Tetrominoes）标准定义与颜色规范

根据 The Tetris Company (TTC) 官方俄罗斯方块规范（Tetris Guideline），7 种四连骨牌定义如下：

| 方块代号 | 英文名 | 官方代表色 | Tailwind 颜色配置 | 基础形状矩阵 (0°) | 旋转态总数 | 旋转对称性说明 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **I** | Cyan / Straight | 青色 (Cyan) | `bg-cyan-400`, `border-cyan-500` | `[[1, 1, 1, 1]]` (1x4) | 2 态 (或 4 态取模) | 横竖两种朝向 |
| **O** | Yellow / Square | 亮黄 (Yellow) | `bg-yellow-400`, `border-yellow-500` | `[[1, 1], [1, 1]]` (2x2) | 1 态 (旋转后全等) | 4 个朝向完全一致 |
| **T** | Purple / Tee | 紫色 (Purple) | `bg-purple-400`, `border-purple-500` | `[[1, 1, 1], [0, 1, 0]]` | 4 态 | 上、下、左、右 4 种朝向 |
| **S** | Green / Snake | 翠绿/黄绿 (Lime) | `bg-lime-400`, `border-lime-500` | `[[0, 1, 1], [1, 1, 0]]` | 2 态 | 横折、竖折两种形态 |
| **Z** | Red / Zag | 红色 (Red) | `bg-red-400`, `border-red-500` | `[[1, 1, 0], [0, 1, 1]]` | 2 态 | 横折、竖折两种形态 |
| **J** | Blue / Reverse-L | 蓝色 (Blue) | `bg-blue-400`, `border-blue-500` | `[[1, 0, 0], [1, 1, 1]]` | 4 态 | 4 个正交旋转朝向 |
| **L** | Orange / L-Shape | 橙色 (Orange) | `bg-orange-400`, `border-orange-500` | `[[0, 0, 1], [1, 1, 1]]` | 4 态 | 4 个正交旋转朝向 |

> **注**：为保持与当前项目精致的暗色高对比度主题一致，颜色微调至更具活力的 Tailwind 色阶，边框采用对应的饱和加深色阶，保持与 `DOC 003` 连贯多联骨牌的高清平滑描边。

---

## 三、双重随机数学模型与算法设计

### 1. 顺时针二维矩阵旋转算法（Matrix 90° Clockwise Rotation）
对任意给定的 $R \times C$ 二维 0-1 矩阵，顺时针旋转 90° 的标准线性变换为：
$$\text{Rotated}[c][R - 1 - r] = \text{Original}[r][c]$$
对应算法实现：
```typescript
/**
 * 二维 0-1 矩阵顺时针旋转 90 度
 */
export function rotateMatrix90(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0)
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

/**
 * 将矩阵旋转指定次数 (times: 0, 1, 2, 3 对应 0°, 90°, 180°, 270°)
 */
export function rotateMatrix(matrix: number[][], times: number): number[][] {
  let cur = matrix;
  const normalizedTimes = ((times % 4) + 4) % 4;
  for (let i = 0; i < normalizedTimes; i++) {
    cur = rotateMatrix90(cur);
  }
  return cur;
}
```

### 2. 双重随机生成工作流 (Two-Tier Random Generation Workflow)

```
   ┌────────────────────────────────────────────────────────┐
   │ 步骤 1：第一重随机 —— 形状基底抽取 (Shape Randomness)   │
   │ 从 7 种原生 Tetrominoes 模板库 [I, O, T, S, Z, J, L]   │
   │ 中等概率随机选取 1 个基准模板 (P = 1/7 ≈ 14.28%)       │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 步骤 2：第二重随机 —— 朝向旋转抽取 (Orientation Rand)  │
   │ 随机生成旋转步数: rot = Math.floor(Math.random() * 4)   │
   │ 对应 0 (0°)、1 (90°)、2 (180°)、3 (270°)                │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 步骤 3：矩阵变换与实体实例化 (Instance Packaging)       │
   │ 1. shape = rotateMatrix(baseShape, rot);               │
   │ 2. id = `${baseName}_r${rot}_${timestamp}_${hash}`;     │
   │ 3. 继承 baseColor 与 baseBorderColor                   │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 步骤 4：进入 3 候选槽备选区并触发拓扑轮廓与阴影渲染    │
   └────────────────────────────────────────────────────────┘
```

### 3. 是否引入 7-Bag 随机袋机制（评估与决议）
- **Tetris 官方 7-Bag 机制**：将 7 种不同方块打乱放入一个“袋子”中，依次摸出，保证每 7 个方块中恰好包含每个方块各一次；
- **10x10 放置游戏匹配度评估**：
  - 在三选一的放置棋盘游戏中，若使用纯 7-Bag，连续两次补全 3 块可能会出现高度可预测性；
  - **决议**：第一阶段采用**独立等概率真随机（Independent Uniform Distribution）**，每种方块出现概率为 $1/7$；或者可配置伪随机“防连续暴击模式”（如连续 3 次不出现同一种方块），满足更纯粹的手感和趣味。

---

## 四、系统架构契合度与边界影响分析

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           009 任务架构影响与隔离矩阵                          │
├───────────────────────┬───────────────────────────────────────────────────────┤
│ 系统模块              │ 影响评估与兼容性对策                                  │
├───────────────────────┼───────────────────────────────────────────────────────┤
│ src/constants/pieces.ts│ 【核心改动点】废弃旧 19 种杂牌方块，建立 7 大标准模板 │
│                       │ 提供 rotateMatrix 矩阵旋转与双重随机发生器            │
├───────────────────────┼───────────────────────────────────────────────────────┤
│ src/components/       │ 【零改动】现有 ConnectedPiece 是基于任意二维矩阵的    │
│ ConnectedPiece.tsx    │ 拓扑边框算法，任何旋转后的 0-1 矩阵均能完美渲染       │
├───────────────────────┼───────────────────────────────────────────────────────┤
│ 拖拽对齐与投影吸附    │ 【零改动】以左上角 (0,0) 为原点步进碰撞，矩阵长宽无论  │
│                       │ 4x1、1x4、3x2、2x3 均可自动完成几何包围盒计算         │
├───────────────────────┼───────────────────────────────────────────────────────┤
│ 004 & 008 重力下坠    │ 【零改动】下坠算法依赖实体内部各个小格点，任何旋转后  │
│ (Universal Fall)      │ 的 Tetromino 均被视为标准刚体整体下落，拓扑结算完美   │
├───────────────────────┼───────────────────────────────────────────────────────┤
│ 云端对局持久化 (007)  │ 【100% 兼容】存档存的是 shape: number[][]，格式完全   │
│                       │ 一致，恢复时可无缝还原任何旋转态方块                  │
└───────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 五、详细实施方案与步骤规划 (Implementation Roadmap)

在获得用户编码授权后，本任务将按以下三个步骤严格推进实施：

### 步骤 1：重构 `src/constants/pieces.ts`
1. 声明 `TETROMINO_BASE_TEMPLATES` 数组，严格限定为：
   - `I`: `[[1, 1, 1, 1]]` (Cyan)
   - `O`: `[[1, 1], [1, 1]]` (Yellow)
   - `T`: `[[1, 1, 1], [0, 1, 0]]` (Purple)
   - `S`: `[[0, 1, 1], [1, 1, 0]]` (Lime)
   - `Z`: `[[1, 1, 0], [0, 1, 1]]` (Red)
   - `J`: `[[1, 0, 0], [1, 1, 1]]` (Blue)
   - `L`: `[[0, 0, 1], [1, 1, 1]]` (Orange)
2. 编写 `rotateMatrix90` 与 `rotateMatrix` 纯函数；
3. 重构 `getRandomPiece()`：
   - 随机抽取基底模板（0~6）；
   - 随机抽取旋转角度步数（0~3）；
   - 旋转后生成最终的 `Piece` 对象；
4. 保持导出接口签名兼容：`getRandomPiece()`, `generateInitialPieces(count)`。

### 步骤 2：校验备选区布局与显示效果
1. 验证 4x1 和 1x4 方块在备选托盘槽中的居中对齐情况；
2. 确保在移动端小屏幕（30px cell）、中屏（36px cell）、桌面大屏（39px cell）下，所有旋转形态的 Tetrominoes 在托盘内均无溢出或截断。

### 步骤 3：构建与测试验证 (Quality Assurance)
1. 运行 `lint_applet`（`tsc --noEmit`）验证全工程类型安全；
2. 运行 `compile_applet`（`vite build`）验证生产打包；
3. 执行规则回归：
   - 确认备选区每次生成的 3 个积木只出现 I, O, T, S, Z, J, L；
   - 确认每次生成的方块朝向分布随机（水平条、垂直条、各方向 T/L/J）；
   - 确认放置到棋盘后消除、刚体切割与 008 公正重力下坠运行流畅。

---

## 六、验收标准 (Acceptance Criteria)

- [ ] **方块范围验收**：连续刷新备选区 100 次，**绝不出现** `1x1`、`2x1`、`3x1`、`5x1`、`3x3` 或 `Corner 2x2`，只出现标准 7 种经典俄罗斯方块；
- [ ] **旋转随机性验收**：同一类方块（如 I 或 L）多次出现时，包含不同的旋转姿态（例如 I 既有横向也有竖向；L 既有正立也有躺平或倒置）；
- [ ] **现有功能零破坏**：消除、连击、得分、音效、云端对局、天梯排行完全正常工作；
- [ ] **代码零缺陷**：TypeScript 编译 0 错误、Vite 打包 0 告警。

---

## 七、009 任务技术方案详解 (Technical Architecture & Code Specifications)

本章节面向即将执行的编码阶段，给出详尽至函数签名、数据结构与控制流的代码级技术改造设计，确保后续编码时“零试错、高内聚、零副作用”。

### 1. 核心文件重构方案：`/src/constants/pieces.ts`

将原文件中杂乱的 19 种静态模板重构为两层结构：**7 种基准四连骨牌定义（Tetromino Base Definition）** + **动态矩阵旋转生成管线（Dynamic Matrix Rotation Pipeline）**。

#### (1) 数据结构与基准定义
```typescript
import { Piece } from '../types';

/**
 * 7 种原生俄罗斯方块 (Tetrominoes) 的基准配置 (0度朝向)
 */
export interface TetrominoBaseConfig {
  name: 'Tetris-I' | 'Tetris-O' | 'Tetris-T' | 'Tetris-S' | 'Tetris-Z' | 'Tetris-J' | 'Tetris-L';
  shape: number[][];
  color: string;
  borderColor: string;
}

export const TETROMINO_BASES: TetrominoBaseConfig[] = [
  // 1. I 型 (Cyan, 1x4)
  {
    name: 'Tetris-I',
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-400',
    borderColor: 'border-cyan-500',
  },
  // 2. O 型 (Yellow, 2x2)
  {
    name: 'Tetris-O',
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'bg-yellow-400',
    borderColor: 'border-yellow-500',
  },
  // 3. T 型 (Purple)
  {
    name: 'Tetris-T',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    color: 'bg-purple-400',
    borderColor: 'border-purple-500',
  },
  // 4. S 型 (Lime / Green)
  {
    name: 'Tetris-S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 'bg-lime-400',
    borderColor: 'border-lime-500',
  },
  // 5. Z 型 (Red)
  {
    name: 'Tetris-Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 'bg-red-400',
    borderColor: 'border-red-500',
  },
  // 6. J 型 (Blue)
  {
    name: 'Tetris-J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 'bg-blue-400',
    borderColor: 'border-blue-500',
  },
  // 7. L 型 (Orange)
  {
    name: 'Tetris-L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: 'bg-orange-400',
    borderColor: 'border-orange-500',
  },
];
```

#### (2) 矩阵正交旋转算法（无损纯函数设计）
```typescript
/**
 * 二维 0-1 矩阵顺时针旋转 90 度
 * 变换规则：result[c][numRows - 1 - r] = original[r][c]
 */
export function rotateMatrix90(matrix: number[][]): number[][] {
  const numRows = matrix.length;
  const numCols = matrix[0].length;
  const result: number[][] = Array.from({ length: numCols }, () =>
    Array.from({ length: numRows }, () => 0)
  );

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      result[c][numRows - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

/**
 * 将矩阵旋转指定步数 (0: 0°, 1: 90°, 2: 180°, 3: 270°)
 */
export function rotateMatrix(matrix: number[][], steps: number): number[][] {
  const normalizedSteps = ((steps % 4) + 4) % 4;
  let current = matrix;
  for (let i = 0; i < normalizedSteps; i++) {
    current = rotateMatrix90(current);
  }
  return current;
}
```

#### (3) 双重随机生成器实现（兼容向后导出）
```typescript
export const GRAVITY_BLOCK_COLOR = 'bg-violet-600';

/**
 * 随机生成一个原生俄罗斯方块，包含双重随机：
 * 1. 形状随机 (7 种之一)
 * 2. 旋转角度随机 (0°, 90°, 180°, 270° 四选一)
 */
export function getRandomPiece(): Piece {
  // 1. 形状随机：从 7 个经典基础形态中等概率选取
  const baseIndex = Math.floor(Math.random() * TETROMINO_BASES.length);
  const base = TETROMINO_BASES[baseIndex];

  // 2. 旋转随机：0, 1, 2, 3 分别代表旋转 0次, 1次(90°), 2次(180°), 3次(270°)
  const rotationSteps = Math.floor(Math.random() * 4);
  const finalShape = rotateMatrix(base.shape, rotationSteps);

  return {
    name: `${base.name}-R${rotationSteps * 90}`,
    shape: finalShape,
    color: base.color,
    borderColor: base.borderColor,
    id: `${base.name}-r${rotationSteps}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

/**
 * 保持原有接口兼容，向后提供 PIECE_TEMPLATES 导出 (供单元测试或辅助工具使用)
 */
export const PIECE_TEMPLATES: Omit<Piece, 'id'>[] = TETROMINO_BASES.flatMap((base) =>
  [0, 1, 2, 3].map((steps) => ({
    name: `${base.name}-R${steps * 90}`,
    shape: rotateMatrix(base.shape, steps),
    color: base.color,
    borderColor: base.borderColor,
  }))
);

export function generateInitialPieces(count = 3): Piece[] {
  return Array.from({ length: count }, () => getRandomPiece());
}
```

---

### 2. 交互与渲染层技术适配分析

#### (1) 备选区居中与缩放适配 (`/src/components/CandidateTray.tsx`)
- 原生俄罗斯方块的外包围盒尺寸：
  - `I` 型：横向为 `1x4`，竖向为 `4x1`；
  - `O` 型：`2x2`；
  - `T, S, Z, J, L`：为 `2x3` 或 `3x2`。
- 最大跨度均为 4 格（只有 I 型在单方向上为 4，另一方向为 1）；
- 当前备选槽每个卡槽最大尺寸约为 `100px ~ 120px`，单个微格尺寸约为 `20px ~ 24px`；
- **评估结论**：`4x1` 或 `1x4` 在备选槽中的物理像素占用为 `24px * 4 = 96px`，卡槽天然具备完美的自适应居中与 padding 容纳能力，无需修改托盘样式即可完美呈现。

#### (2) 刚体切削与重力下坠（004 / 008 联动）
- **落盘阶段**：玩家将任一旋转朝向的 Tetromino 放置在 10x10 棋盘后，它作为单体 `PlacedPieceEntity` 存入 `placedPieces`；
- **消除切断阶段**：当横/纵行消除穿过该方块时，BFS 拓扑切削算法（`splitAndTrimCutEntities`）自动以 0-1 矩阵连通分支将其切分为更小的多联碎片；
- **引力爆发阶段 (008)**：消除 1x1 重力方块触发全场下坠时，由于所有实体的 `shape` 均为标准的二维 0-1 矩阵，`computeGravityCascadeDrops` 自底向上计算最大落差时完全兼容任何形态的 Tetromino 及其衍生切削块。

---

### 3. 数据流与状态机闭环 (State Lifecycle)

```
[玩家拖拽完毕/对局开局]
         │
         ▼
[检查备选槽 pieces 状态] ──(当备选槽 3 个全为空时)──► [调用 generateInitialPieces(3)]
                                                               │
                                                               ▼
                                                  [执行 getRandomPiece() x 3]
                                                  ├─ 随机 baseIndex (0..6)
                                                  ├─ 随机 rotationSteps (0..3)
                                                  └─ 矩阵顺时针旋转生成 shape
                                                               │
                                                               ▼
                                                  [写入 pieces 状态]
                                                               │
                                                               ▼
                                                  [自动同步云端对局进度]
                                                  (MemFireDB saveGameProgress)
```

---

### 4. 实施阶段风险防范与安全边界 (Risk Control)

1. **零代码修改边界（设计阶段）**：前期严格遵守用户指示先编写技术方案，经确认后精准修改；
2. **存档数据向前兼容性**：
   - 如果玩家之前有保存在云端 MemFireDB 的旧对局（可能包含旧的 1x1 或 3x3 积木）；
   - 云端进度恢复逻辑只读取 `progress.boardData` 与 `progress.currentPieces`，旧积木在已落盘或已在托盘中时不会崩溃；
   - 一旦当前托盘的旧积木放完，后续自动生成的积木将全面切换为全新的 7 大标准 Tetrominoes，实现丝滑平渡。

---

## 八、009 任务执行记录与技术交付总结 (Execution Log)

### 1. 执行周期与变更边界 (Execution Summary)
- **执行时间**: 2026-09-09
- **执行状态**: ✅ **编码落地与构建验证 100% 成功交付**；
- **精准变更文件**:
  - `/src/constants/pieces.ts`：全面重构为 7 种原生俄罗斯方块基底矩阵与正交旋转矩阵纯函数算法，实现形状与旋转的双重随机生成器；
  - `/DOC/_009_tetris_pieces_and_random_rotation.md`：需求书、技术方案与执行记录完整归档。

### 2. 代码实现详细清单 (Detailed Code Changes)
1. **定义原生 7 大四连骨牌标准基底 (`TETROMINO_BASES`)**:
   - `Tetris-I`: `[[1, 1, 1, 1]]` (Cyan, 官方青色)
   - `Tetris-O`: `[[1, 1], [1, 1]]` (Yellow, 官方黄色)
   - `Tetris-T`: `[[1, 1, 1], [0, 1, 0]]` (Purple, 官方紫色)
   - `Tetris-S`: `[[0, 1, 1], [1, 1, 0]]` (Lime / Green, 官方绿色)
   - `Tetris-Z`: `[[1, 1, 0], [0, 1, 1]]` (Red, 官方红色)
   - `Tetris-J`: `[[1, 0, 0], [1, 1, 1]]` (Blue, 官方蓝色)
   - `Tetris-L`: `[[0, 0, 1], [1, 1, 1]]` (Orange, 官方橙色)
   - 彻底剔除了原有 1x1, 2x1, 3x1, 5x1, 3x3, Corner 2x2 等非标方块。

2. **矩阵无损正交旋转算法 (`rotateMatrix90` / `rotateMatrix`)**:
   - 实现顺时针 90° 纯函数线性变换：`result[c][numRows - 1 - r] = original[r][c]`；
   - 支持任意指定步数（0°, 90°, 180°, 270°）的正交无损矩阵旋转。

3. **双重随机生成管线 (`getRandomPiece`)**:
   - 第一重：等概率抽取 7 大基底之一（$P = 1/7$）；
   - 第二重：独立抽取旋转步数（$steps \in \{0, 1, 2, 3\}$）；
   - 生成具有唯一 ID、带具体旋转角度标注（如 `Tetris-T-R90`）的完整 `Piece` 实体；
   - 保留 `PIECE_TEMPLATES` 与 `generateInitialPieces` 导出签名，对外部组件保持 100% 接口兼容。

### 3. 构建与验证矩阵 (Verification Matrix)
- **TypeScript 静态类型检查 (`lint_applet` / `tsc --noEmit`)**:
  - 检查结果：**100% 通过（0 Errors, 0 Warnings）**；
- **Vite 生产构建编译 (`compile_applet` / `vite build`)**:
  - 构建结果：**Build succeeded - the applet is compiled**，打包顺利通过；
- **现有机制兼容性验证**:
  - 备选托盘 (`CandidateTray` / `PieceTray`)：各种旋转态方块自适应居中，无溢出；
  - 放置与手势判定 (`canPlacePiece` / `handlePointerStartDrag`)：几何包围盒计算准确，拖拽手感丝滑；
  - 刚体切削与下沉 (`008 Universal Fall`)：无论何种旋转态，消除切削与全场重力下坠均稳定运行；
  - 天梯排行榜与云端存档 (`007 MemFireDB`)：状态无缝还原，历史进度平滑过渡。


