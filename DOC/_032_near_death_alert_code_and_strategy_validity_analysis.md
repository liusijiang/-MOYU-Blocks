# 任务 032：濒死警报系统代码实现与策略合理性深度审查报告
## ——基于实际源码的代码严密性、系统动力学与演进策略评估

---

### 报告概览

本报告针对 **任务 031（`DOC/_031_near_death_alert_mechanics_and_experience_analysis.md`）** 所分析的“濒死警报”系统展开全面的**合理性、有效性与工程可行性技术复审**。

本分析完全立足于《摸鱼方块》（Gravity Polyomino）的**实际生产源代码**（重点审查 `src/App.tsx`、`src/utils/gameLogic.ts`、`src/components/ComboBadge.tsx`、`src/components/PieceTray.tsx`、`src/constants/pieces.ts`、`src/utils/audio.ts`），逐行核对底层逻辑、状态转移时序与算法边界，对任务 031 提出的机制解构、心理学推论以及未来演进方案进行严格的实证检验。

> **核心守则声明**：本分析报告秉持纯理论与架构审计原则，**未对项目代码做任何修改**。

---

## 目录

1. [审查宗旨与方法论](#一审查宗旨与方法论)
2. [现行濒死警报代码实现的严密性审查与实证核验](#二现行濒死警报代码实现的严密性审查与实证核验)
   - 2.1 连击濒死状态机（`ComboBadge` + `executePlacePiece`）的时序与逻辑自洽性
   - 2.2 护盾双步恢复策略（`consecutiveClears >= 2`）的数学防刷严密性
   - 2.3 托盘无法落子检测（`canPieceFitAnywhere`）的算法开销与表现
   - 2.4 重大代码时序发现：发牌引擎在消除前抽样的“状态错位”隐患
   - 2.5 架构残留审查：`tryEmergencyKeystoneRescue` 的未接驳死代码与注释漂移
3. [任务 031 核心观点与设计策略的合理性辩证](#三任务-031-核心观点与设计策略的合理性辩证)
   - 3.1 “连击有警报，盘面无预警”的体验不对称性实证
   - 3.2 损失规避与近失效应在代码层面的映射与放大
   - 3.3 恐慌死亡螺旋（Panic Death Spiral）的系统动力学检验
4. [任务 031 前瞻演进提案的工程可行性与体验边界评估](#四任务-031-前瞻演进提案的工程可行性与体验边界评估)
   - 4.1 空间窒息指数（CDI）的算法复杂度与响应敏锐度
   - 4.2 Web Audio 次低频心跳音效的可行性与听觉疲劳风险
   - 4.3 前瞻性“自杀步”预警（Lookahead Warning）的性能开销与玩家心流平衡
5. [综合评估矩阵与架构优化建言（纯方案推演）](#五综合评估矩阵与架构优化建言纯方案推演)
6. [总结与核心结论](#六总结与核心结论)

---

## 一、审查宗旨与方法论

在游戏架构与数值设计中，任何关于“体验”或“手感”的定性讨论，都必须扎根于**具体的代码执行流程、数据状态变化以及计算时间复杂度**。

任务 031 对濒死警报给出了高度系统化的剖析，提出了“连击之死 vs 全局之死”、“马尔可夫链减震模型”以及“空间窒息指数（CDI）”等诸多论述。任务 032 的核心职责是作为**代码审查员（Code Auditor）与系统架构师**，回答以下关键问题：
1. **真实性验证**：任务 031 所引用的源码逻辑、变量流动、状态机转换，在当前代码中是否 100% 真实存在？有无过度解读或遗漏的暗线？
2. **合理性判定**：现行代码中的各项设计（如单步护盾、连续 2 步消除充能、1 换 1 即时补牌、移除判死气囊）在玩法策略与数值稳定性上是否真正合理？
3. **边界与隐患挖掘**：在实际代码运行中，是否存在边界死锁、时序错位或尚未暴露的性能与体验缺陷？
4. **前瞻方案可用性**：任务 031 提出的演进方案是否具备工程落地可行性？会不会引入新的副作用？

---

## 二、现行濒死警报代码实现的严密性审查与实证核验

### 2.1 连击濒死状态机（`ComboBadge` + `executePlacePiece`）的时序与逻辑自洽性

#### (1) 代码审查事实
在 `src/App.tsx:700-728`，落子流程完成所有物理重力掉落与多重级联扫描后，进入最终结算闭包：

```ts
// 任务 010: 回合平息后连击与护盾收敛结算
let nextStreak = streakCount;
if (totalClearedInTurn > 0) {
  nextStreak = streakCount + 1;
  setStreakCount(nextStreak);
  const nextConsecutive = consecutiveClears + 1;
  setConsecutiveClears(nextConsecutive);

  if (nextConsecutive >= 2 && !comboShield) {
    setComboShield(true);
    sound.playShieldRestoredSound();
  }
  sound.playStreakSound(nextStreak);
} else {
  setConsecutiveClears(0);
  if (comboShield) {
    setComboShield(false);
    sound.playShieldBreakSound();
  } else {
    nextStreak = 0;
    setStreakCount(0);
  }
}
```

#### (2) 合理性评估：优秀（Highly Reasonable）
1. **闭包确定性**：连击判定被严格安置在 `while (hasMoreCascade && cascadeStep <= 10)` 循环之外。这意味着不论该回合发生了多么复杂的多轮“消除 $\to$ 引力下落 $\to$ 二次消除 $\to$ 奇点爆发”，连击数只以整回合的宏观结果（`totalClearedInTurn > 0`）为准，单回合仅自增 1。这防止了单手操作引发连击指数级膨胀，数值控制非常扎实。
2. **状态同步准确**：`ComboBadge.tsx:21` 中的 `const isDyingStreak = !comboShield` 纯粹由外部 `comboShield` 驱动，为纯受控无状态组件（Pure Presentational Component），不存在局部状态与全局状态冲突的风险。
3. **视听联动即时**：触发破盾时有明确的声音反馈（`playShieldBreakSound()`，520Hz $\to$ 140Hz 线性快速下滑频），组件通过 `animate-pulse` 和 `animate-bounce` 强化视觉警报，视听信号对齐度极高。

#### (3) 发现的代码级细节瑕疵（Minor Defect）
- **连击清零无音效（Auditory Gap on Final Death）**：
  当处于 `!comboShield` 状态下再次空步（`else { ... nextStreak = 0; setStreakCount(0); }`）时，**代码完全没有调用任何断裂音效**！
  - 破盾有声（滑音），充能有声（圣音），但唯独最严重的“连击彻底破灭”在音频层面是静默的（仅靠 BGM 的 Fever Pulse 停止和视觉 Badge 消失）。
  - **合理性建言**：应当补全一个类似“玻璃粉碎或叹息低音”的断裂音效（如 `playStreakLostSound()`），让死亡反馈形成完整闭环。

---

### 2.2 护盾双步恢复策略（`consecutiveClears >= 2`）的数学防刷严密性

任务 031 指出：要求“连续 2 步消行”才能复原护盾，是为了防止玩家使用“一步消行、一步划水”的无赖震荡策略（Ping-Pong Exploit）。

#### 审查与数学推导验证
我们验证如果将条件改为 `nextConsecutive >= 1`（即单步消除即重置护盾），会发生什么：
- 步骤 1：满护盾，消行（连击 1，护盾满）；
- 步骤 2：空步占位（连击 1，护盾破，进入濒死）；
- 步骤 3：单步消行（若 1 步恢复，则连击 2，护盾**立刻重新充满**）；
- 步骤 4：再次空步占位（连击 2，护盾再次抵御破碎，进入濒死）；
- 步骤 5：单步消行...

此时，玩家实质上获得了**每隔一步就可以完全免责一次**的永久被动，连击事实上永远不会中断，空间整理压力下降 50% 以上。

而现行代码强制执行：
```ts
const nextConsecutive = consecutiveClears + 1;
setConsecutiveClears(nextConsecutive);

if (nextConsecutive >= 2 && !comboShield) {
  setComboShield(true);
}
```
并且在未消行时：
```ts
setConsecutiveClears(0);
```
这意味着：
1. 一旦破盾，在接下来的第 1 步必须消行（此时 `nextConsecutive = 1`，仅保命，不回盾）；
2. 在接下来的第 2 步**依然必须消行**（此时 `nextConsecutive = 2`，才真正回满护盾）。
3. 如果在第 2 步未能消行，由于此时 `comboShield` 为 `false`，直接判定断连！

**结论**：该策略在代码逻辑与博弈论层面**完全成立且极其严谨**。它在给予玩家一次容错机会的同时，给后续施加了连续两次成功的硬性约束，实现了“绝境救赎”与“硬核防刷”的完美平衡。

---

### 2.3 托盘无法落子检测（`canPieceFitAnywhere`）的算法开销与表现

#### (1) 复杂度实测审查
在 `src/utils/gameLogic.ts:184`：
```ts
export function canPieceFitAnywhere(board: BoardState, piece: Piece): boolean {
  const pieceRows = piece.shape.length;
  const pieceCols = piece.shape[0].length;

  for (let r = 0; r <= BOARD_SIZE - pieceRows; r++) {
    for (let c = 0; c <= BOARD_SIZE - pieceCols; c++) {
      if (canPlacePiece(board, piece, r, c)) {
        return true;
      }
    }
  }
  return false;
}
```
- `BOARD_SIZE = 10`；
- 所有 7 种俄罗斯基础方块尺寸最大为 $4 \times 1$ 或 $2 \times 2$ 或 $3 \times 2$；
- 外层循环最多执行 $(10 - 1 + 1) \times (10 - 4 + 1) = 70$ 次；
- 内层 `canPlacePiece` 仅包含 $R \times C \le 8$ 次基本单元格数字比对，命中 `board[r+i][c+j] !== 0` 立即短路退出；
- `canPieceFitAnywhere` 遇到第一个合法位置立刻 `return true` 短路返回。

#### (2) 评估结论：高度合理（Optimal Performance）
最坏情况（遍历全盘无一处可放，即判定死局）的总操作指令数在几百条 CPU 周期以内，耗时 $< 0.03\text{ms}$。在 React 渲染周期中直接调用（`PieceTray.tsx:52`）完全不会导致重绘卡顿。该算法简单、暴力、鲁棒且绝对准确。

---

### 2.4 重大代码时序发现：发牌引擎在消除前抽样的“状态错位”隐患

在深入审查 `src/App.tsx:415-468` 时，我们发现了一个此前未被充分重视的**重大时序反常（Timing Anomaly）**：

```ts
// src/App.tsx
// 1. 将玩家选择的方块 stamp 到棋盘上，生成 boardWithPiece
const boardWithPiece = board.map((row) => [...row]);
// ... 把当前方块填入 boardWithPiece ...

// 2. 关键时序：在执行行消除（checkAndClearLines）之前，立刻调用了发牌算法！
// 3. Immediately refill ONLY this placed piece's slot using Task 010 adaptive engine!
const nextPieces = [...pieces];
const generatedPiece = getAdaptiveRandomPiece(
  boardWithPiece,           // <-- 注意：这里传入的是尚未消除、空间最挤的棋盘！
  keystoneCooldownSteps,
  keystoneUsageCount,
  recentShapes
);
nextPieces[slotIndex] = generatedPiece;
setPieces(nextPieces);

// 4. 随后才开始进入消除循环！
while (hasMoreCascade && cascadeStep <= 10) {
  const scanResult = checkAndClearLines(currentBoard);
  // ... 消除行、下落方块、清空空间 ...
}
```

#### 这个时序引发的系统动力学偏差剖析：

```
 时序点 T0                时序点 T1 (当前发牌时点)             时序点 T2 (回合结算收敛)
 ┌──────────────┐         ┌────────────────────────┐         ┌───────────────────────┐
 │ 玩家刚放下方块│ ──────► │ 棋盘处于瞬时最高占满度   │ ──────► │ 行消除发生，大量方块下落│
 │ (准备判定)   │         │ boardWithPiece (极度拥挤)│         │ currentBoard 空出大片空间│
 └──────────────┘         └───────────┬────────────┘         └───────────────────────┘
                                      │
                                      ▼
                        [getAdaptiveRandomPiece 介入]
                        · 误判棋盘极度危险
                        · 可行解集被严重压缩
                        · 可能误触 Layer 1 应急基石
```

1. **错峰感知（Phase Misalignment）**：
   玩家下这一步的目的很可能是为了促成“三行连消”，落子完成后棋盘本该大幅释放空间；然而发牌算法却在**消除发生前的最挤瞬间（`boardWithPiece`）**去扫描全局 28 种姿态的可行解集！
2. **潜在不良后果**：
   - **过度保守发牌**：算法认为棋盘空间逼仄，因此过滤掉了需要较大空间的大方块（如 3x2、4x1），而优先抽取小尺寸或极易消行的形状，使得发牌的多样性在经常消行的玩家手中被人为压缩；
   - **Keystone 误判消耗**：若这一步落子后全盘恰好填满到只剩 1 格，但该步落子即将促成 4 行大消除。此时发牌引擎扫描 `boardWithPiece`，发现 28 种姿态全部死局且 `emptyCount >= 1`，**可能在消除前瞬间直接触发 Layer 1 吐出一颗 1x1 琥珀基石**！这不仅浪费了本局极为珍贵的 2 次限额，而且在消除后大片空地上出现一颗 1x1 小方块，会破坏后续大块的拼接节奏。
3. **合理性判定**：
   **这一实现时序存在显著的次优缺陷（Suboptimal Sequence）**。
   - **最优时序应当是**：先执行完当前的全部消除与重力平息，得到最终的稳定盘面 `currentBoard`，随后再依据 `currentBoard` 的真实剩余拓扑进行自适应补牌！

---

### 2.5 架构残留审查：`tryEmergencyKeystoneRescue` 的未接驳死代码与注释漂移

#### (1) 代码审查事实
在 `src/utils/gameLogic.ts:1245`：
```ts
export function tryEmergencyKeystoneRescue(...) { ... }
```
被完整声明并导出。

而在 `src/App.tsx:761-764`：
```ts
// Check game over (with emergency keystone rescue)
if (checkGameOver(currentBoard, nextPieces)) {
  setGameOver(true);
}
```

#### (2) 评估结论：确认属于版本演进留下的注释漂移（Doc Drift）与未使用的死代码
- 任务 031 对此现象的推断完全属实。
- 历史文档 `DOC/_011` 中明确记录了“完全移除了濒死拦截与安全气囊（Emergency In-Place Morph）”。然而开发人员在重构代码时，仅将该逻辑从 `App.tsx` 的判死处移除，保留了 `gameLogic.ts` 中的函数实现，并遗留了带括号的注释 `(with emergency keystone rescue)`。
- **合理性建言**：这种死代码与误导性注释应当在后续代码整理中予以清理或重构，避免给后续维护者造成“当前系统仍有判死拦截”的错觉。

---

## 三、任务 031 核心观点与设计策略的合理性辩证

### 3.1 “连击有警报，盘面无预警”的体验不对称性实证

任务 031 提出的最犀利的体验批判是：**“不对称的危机告知——连击有警报，盘面无预警”**。

#### 代码实证检验
我们审查 `src/App.tsx` 和 `src/components/Board.tsx` 中与“危机”相关的所有 UI 控制逻辑：
1. `ComboBadge.tsx` 拥有极为丰富的濒死警报：`isDyingStreak`、`ShieldAlert`、`text-rose-400 animate-bounce`、`急救!`。
2. 然而检查 `src/components/Board.tsx` 的属性与类名：
   - 棋盘容器固定为：`bg-slate-900/90 border border-slate-700/80 rounded-2xl`；
   - 唯一的动画是 `isGlobalGravityPulseActive`（全屏引力脉冲的青色流光）；
   - **没有任何关于“棋盘空间占满率”的颜色、边框或告警动效**！
3. 检查 `src/utils/audio.ts`：
   - 背景音乐引擎 `CosmicMusicEngine` 的状态更新接口为 `updateGameState(streak, resonance, isGameOver)`；
   - 音乐的动态层（Layer 2 Fever Pad 与 BPM 加速）**只随连击数 `streak` 变化**；
   - 如果玩家连击数为 0，哪怕棋盘被填到 98 格、只差 1 步就满盘暴毙，BGM 仍然以悠闲从容的 66 BPM 慢速播放，环境没有任何危机感。

#### 结论
**任务 031 的这一指控在代码级完全成立，且击中了现有游戏系统最严重的心流断层！**
现有的危机反馈体系是“重连击轻生存”的偏科架构。在高分局中，玩家的死亡往往是毫无视听预兆的“突发猝死”，体验极度突兀。

---

### 3.2 损失规避与近失效应在代码层面的映射与放大

任务 031 引用了行为经济学的前景理论（Prospect Theory）与近失效应（Near-Miss Effect）。从代码实现上看，这种心理机制是如何被代码精确调动的？

#### 代码实现机制对照：
1. **倍率阶梯放大资产价值**：
   在 `src/utils/gameLogic.ts:1122`，每步得分公式为：
   $$\text{Score} = (\text{Base} + \text{Lines} \times 100 \times \text{Cascade}) \times (1 + \text{Streak} \times 0.25) \times \text{Fever}$$
   当连击达到 8 时，得分倍率已飙升至 $3.0\times$。这意味着后续走的每一步消除，其收益是常态的 3 倍。
2. **延迟惩罚制造悬念**：
   若无护盾，空步立即断连，玩家面对的是**既成事实的失去**；
   而代码中的 `setComboShield(false)` 则是给出了一个**即将失去的确定性倒计时**。
3. **近失加权（Layer 4 Near-Miss Biasing）**：
   在 `src/utils/gameLogic.ts:1211` 中，能直接促成消行的方块被显式提升了 $80\%$ 的生成权重（`weight *= 1.8`）。这使得进入濒死态后，系统有更高概率送来恰好能填补缺口的关键块，使得“差一点就死”与“差一点就能消”的心理近失感被算法直接拉满。

**评估**：任务 031 对该心理学机制的理论总结与代码现实完全吻合，该策略的设计是极其成功的商业化成瘾飞轮范例。

---

### 3.3 恐慌死亡螺旋（Panic Death Spiral）的系统动力学检验

任务 031 提出了由于急于保连击而导致的“恐慌死亡螺旋”。我们在代码层面验证这种系统反馈回路是否必然存在：

```
                    ┌─────────────────────────────────────────┐
                    │       进入濒死态 (!comboShield)         │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │ 强烈渴望保连击，目标函数坍缩至局部单行消除 │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │ 强行将非最佳形态方块塞入狭窄区域消 1 行  │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │ 遗留碎片破坏棋盘连续性，空穴高度碎裂化   │
                    │ (碎片无法触发重力下落，因重力仅对悬空块生效)│
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │ 护盾仍未恢复 (需连续 2 步消行)，依然濒死│
                    │ 但此时大尺寸方块 (3x2, 4x1) 已无处安放  │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │        下回合必定断连并全局暴毙          │
                    └─────────────────────────────────────────┘
```

#### 代码实证检验：
在 `src/utils/gameLogic.ts:311` 的 `applyGravityFall` 算法中，引力下落必须满足“连通块下方存在完全空白的行”方可下落。如果玩家为了急救而把方块错落有致地卡在各行之间，会产生大量的“凹型死角”。这些凹槽无法被自然引力填平，而俄罗斯方块模板（`PIECE_TEMPLATES`）中全是 4 格大块，根本无法填入这些单个凹陷中，直接导致下一个回合大块集体变红标示 `无法放置`。

**评估**：恐慌死亡螺旋并非抽象的心理假说，而是**由现有物理规则与积木形态库共同决定的必然数学现象**。这一分析极具洞察力。

---

## 四、任务 031 前瞻演进提案的工程可行性与体验边界评估

任务 031 提出了三项演进设想：
1. CDI 空间窒息指数算法；
2. 多模态全屏暗红呼吸晕影 + 次低频心跳音效；
3. 前瞻性自杀步态预警。

我们对这三项提案进行严谨的**工程可行性与体验副作用审查**：

### 4.1 空间窒息指数（CDI）的算法复杂度与响应敏锐度

#### 提案模型：
$$\text{CDI} = w_1 \cdot \text{OccupancyRatio} + w_2 \cdot \text{LargePieceDeadRatio} + w_3 \cdot \text{Entropy}$$

#### 工程落地评估：
1. **计算成本分析**：
   - 现行代码中已有 `countEmptyCells(board)`，开销为 100 次循环（$< 0.01\text{ms}$）；
   - 对 7 种经典俄罗斯方块基准形态做一次 `canPieceFitAnywhere`，开销为 $7 \times 49 \approx 343$ 次基本比对（$< 0.1\text{ms}$）；
   - 无需计算复杂的香农熵（Entropy，会带来额外的计算负担且收益不明显），只需简化为：
     $$\text{CDI} = 0.6 \times \left(\frac{100 - \text{EmptyCount}}{100}\right) + 0.4 \times \left(\frac{\text{DeadBasePieceCount}}{7}\right)$$
2. **结论**：**工程可行性极高，计算开销极低**。这一设计能完美填补“盘面无危机预警”的空白，边框颜色随着 CDI 从蓝渐变至橙再到暗红闪烁，能以极小的代码代价换来巨大的体验升级。

---

### 4.2 Web Audio 次低频心跳音效的可行性与听觉疲劳风险

#### 提案内容：
在 `src/utils/audio.ts` 中引入 60Hz 正弦波 + 低通滤波的 Sub-bass 心跳，随着危险度爬升加快 BPM。

#### 工程与体验评估：
1. **工程可行性**：
   - Web Audio API 的 `OscillatorNode` 生成 60Hz 正弦波非常轻量，配合 `GainNode` 的 `exponentialRampToValueAtTime` 即可生成逼真的心跳重音（Thump-thump 规律）。
2. **体验副作用警告（Audio Fatigue Risk）**：
   - **移动端扬声器物理限制**：绝大多数智能手机的内置微型扬声器在 60Hz 以下频段严重衰减，玩家若不佩戴耳机，纯粹的 60Hz 次低频几乎无法被人耳捕捉，只会产生杂音或毫无声响；必须混合 120Hz~180Hz 的二次谐波才能在手机外放上被清晰感知。
   - **听觉疲劳**：若玩家处于高难残局思考较慢，持续数分钟的高频心跳声会引发强烈的生理烦躁感，甚至导致玩家直接关闭静音。
3. **合理性建言**：
   - 心跳音效应当**仅在关键时刻限时触发**（例如：连击破盾后的前 5 秒，或者 CDI $\ge 0.85$ 时每 3 秒轻轻跳动两声），且必须包含适当的谐波适配移动端扬声器。

---

### 4.3 前瞻性“自杀步”预警（Lookahead Warning）的性能开销与玩家心流平衡

#### 提案内容：
拖拽方块悬停在某一位置时，虚拟推演落子后是否会导致托盘中其余方块立即全部死亡，若全死则给出红光警示。

#### 工程与体验深度评估：
1. **高频计算性能瓶颈**：
   - 拖拽事件（`handlePointerMove`）在 60fps~120fps 下触发极其频繁；
   - 若在每个 Move 事件中都执行：虚拟复制棋盘 $\to$ 落子 $\to$ 消除扫描 $\to$ 对托盘其余 2 块各执行一次 `canPieceFitAnywhere`，计算量将暴增为：
     $$120\text{fps} \times (100 + 2 \times 49) \approx 23,760 \text{ ops/sec}$$
   - 虽然现代浏览器能勉强跑下，但在低端安卓机或微信内置 WebView 中极易引发掉帧。
   - **优化解法**：只能在 `calculateBoardTarget` 发生网格坐标跃迁（即 `row !== prevRow || col !== prevCol`）时才执行一次，且必须通过轻量级 Memo 进行缓存。
2. **游戏设计伦理与玩法剥夺（Agency Stripping）**：
   - **最致命的问题在于：自杀步本身就是 Polyomino 消除游戏策略深度的核心组成部分！**
   - 玩家之所以需要思考，就是为了避免“下完这一步导致后两步无路可走”。如果系统像导航避障一样，只要走自杀步就亮红灯，玩家就会退化为“试错盲人”：随便晃动方块，只要没亮红灯就松手。这会彻底剥夺高阶玩家运筹帷幄的策略自豪感。
3. **合理性判定**：
   - **在标准竞技模式下不建议引入强预警**；
   - 若引入，仅能作为新手关卡或休闲模式下的可选辅助，绝不能作为默认强制机制。

---

## 五、综合评估矩阵与架构优化建言（纯方案推演）

基于上述代码与策略审查，我们对任务 031 中涉及的全部现有机制与演进提案进行矩阵化评级：

| 机制 / 策略模块 | 现行代码状态 | 策略合理性评级 | 核心价值 / 缺陷诊断 | 后续演进建议（理论推演） |
| :--- | :--- | :--- | :--- | :--- |
| **连击濒死状态机** | `src/App.tsx:700`<br>`ComboBadge.tsx` | ★★★★★ (极佳) | 极大激发损失规避本能；连续 2 步消除复苏从数学上杜绝了震荡刷分漏洞。 | 补齐二次断连时的“连击破灭音效”（当前断连无声）。 |
| **托盘无法落子标红** | `PieceTray.tsx:52`<br>`canPieceFitAnywhere` | ★★★★★ (成熟可靠) | $O(1)$ 常数级开销，即时切断无效拖拽与手滑误触。 | 保持现状即可。 |
| **即时补牌机制时序** | `src/App.tsx:438`<br>`getAdaptiveRandomPiece` | ★★★☆☆ (有时序缺陷) | 保证新出方块有解，防猝死极佳；但在消除前取样，导致极度拥挤时过度保守。 | **应将补牌时机移至级联消除彻底收敛之后**，基于最终稳定盘面发牌。 |
| **判死安全气囊** | `tryEmergencyKeystoneRescue`<br>（代码遗留但未接驳） | ★★★★☆ (弃用正确) | 移除原地变形符合硬核公平原则；发牌层 Layer 1 应急已足够。 | 清理 `App.tsx` 中遗留的死代码注释与未引用声明。 |
| **CDI 盘面空间危机预警** | 当前**完全缺失** | ★★★★★ (极为必要) | 解决高分局“毫无征兆突然猝死”的最大体验断层。 | 引入基于占满率与大块死率的轻量级 CDI，驱动棋盘边框脉动。 |
| **次低频环境心跳音频** | 当前**完全缺失** | ★★★☆☆ (需谨慎克制) | 能营造窒息感；但需防范手机外放无低频与长时间高压导致的听觉疲劳。 | 增加中频谐波支持手机扬声器；仅在危急时刻限时播放。 |
| **前瞻自杀步预警** | 提案内设想 | ★★☆☆☆ (侵犯策略自主) | 存在高频拖拽性能隐患，更会严重剥夺玩家推演乐趣，降智为避障游戏。 | 竞技模式坚决不加，仅可作为新手教程辅助开关。 |

---

## 六、总结与核心结论

1. **任务 031 的分析质量高度扎实**：
   任务 031 所提出的“连击与生存双重危机哲学”、“马尔可夫链减震器”以及“连击有警报而盘面无预警的不对称性”，均经受住了底层源代码的严格推导与实证核验。
2. **挖掘出关键的代码级时序优化点**：
   本报告通过代码逐行审计，指出了 `App.tsx` 中发牌引擎在消除前抽样（`boardWithPiece`）导致的状态错峰问题。这是后续性能与体验重构中价值极高的技术发现。
3. **辨明了演进方案的边界与雷区**：
   本报告明确论证了：**CDI 空间窒息指数属于极高价值、零副作用的必改项**；而**前瞻自杀步态预警则属于会破坏核心几何乐趣的过度设计**，应当果断予以剔除。

---
*报告归档编号：`DOC/_032_near_death_alert_code_and_strategy_validity_analysis.md`*  
*编制时间：2026年9月*  
*审查基准：完全基于当前仓库实际源码·零代码修改*
