# 任务 011：引力核心机制升级与视觉重构——5x5 裂变引信、全局重力连锁大雪崩与独立视觉识别体系

- **文档编号**: `_011_`
- **需求名称**: 引力核心（Gravity Core）规则修正与视觉独立化设计
- **关联文档**: `_004_piece_debris_gravity_and_gravity_block.md`、`_008_universal_gravity_fall_correction.md`、`_010_game_rules_engagement_and_addictiveness_analysis.md`
- **创建时间**: 2026-09-10
- **当前状态**: 📝 **深度游戏规则思考与设计推演完成（本阶段不修改代码）**

---

## 一、需求背景与任务定位

### 1.1 需求演进脉络与复盘
在《无尽俄罗斯方块/积木消消乐》的演进过程中，消除玩法的核心驱动力经历了从“二维几何纯平面填充”到“物理实体连续动力学”的跃迁：
- **004 任务**：引入 1x1 引力核心方块，开启了物理重力下坠（仅碎片共振）；
- **008 任务**：将消除引力核心时的下落升级为全场积木公正下坠，但由于触发过于直接、缺乏前置悬念与局部物理破坏感；
- **010 任务**：重构引力共鸣蓄能槽（Resonance Energy），并在落盘时将触底单元格点化为引力核心；
- **近期调整**：将消除引力核心的效果从全屏直接下坠，调整为局部粉碎；随后震碎范围从 3x3 扩大至 5x5 区域，同时根据硬核竞技原则**完全移除了濒死拦截与安全气囊（Emergency In-Place Morph）**。

### 1.2 核心痛点与修正动因 (User Intent)
在深入体验 5x5 震碎版本后，发现了两个关键维度的体验断层：

1. **道具视觉混淆（Visual Identity Ambiguity）**：
   - 当前托盘中的**「引力星块」（Resonance Piece）**使用紫金星河渐变（`from-indigo-900 via-purple-900 to-amber-950`）与紫金粒子；
   - 棋盘上的**「引力核心」（Gravity Core）**同样使用了靛蓝紫罗兰渐变（`from-indigo-950 via-purple-900 to-violet-800`）与紫色发光边框；
   - 玩家在快速落子时，极难一眼区分棋盘上的“引力核心”与托盘中的“引力星块”，视觉符号产生严重重叠与认知负荷。
2. **物理爽感阶梯断层（The Missing Climax in Gravity Chain）**：
   - 5x5 震碎后，大量的 1x1 微块崩落，能够填满很多坑洞；
   - **但是**，如果这些 1x1 崩落激发了消除，消除后**全场其他积木却依然被死死钉在空中**，违背了“重力大爆发”的心理预期，导致连环消除戛然而止，形成了“雷声大雨点小”的落空感。

### 1.3 011 修正的核心任务定义
用户明确提出两大诉求：
> 1. **物理重力向下崩落机制修正**：5x5 区域内震碎的所有 1x1 碎块垂直向下坠落填补悬空或堆叠；**一旦这里激发的深层连环消行引发了连锁，全场全局重力瞬间解锁，所有的积木一起向下掉落，激发更多的连环消，直到全场没有消除为止！**
> 2. **视觉识别彻底重构**：这一次要将引力核心换一个全新的样式，**绝不与托盘的引力星块或琥珀基石同质化**，建立鲜明独立的视觉图腾。

---

## 二、游戏规则与物理动力学推演：两阶段“引信-雪崩”连锁模型

### 2.1 整体动力学构架：从“定向爆破（引信）”到“天塌地陷（大雪崩）”
传统的连锁消除往往是平铺直叙的单级判断，而 011 任务设计的是一种极富戏剧张力的**“分级临界反应（Supercritical Cascade Mechanism）”**：

```
                             【消除引力核心】
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  阶段一：5x5 定向冲击震碎（引信阶段）  │
                 │  • 半径 2 格内所有积木解构为 1x1 碎块 │
                 │  • 1x1 碎块垂直自由落体，填补局部空缺 │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  临界检测：1x1 坠落后是否引发新的消行？ │
                 └──────────────────┬───────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
             【未引发消除】                         【引发了新的消除！】
           （引信燃尽，平稳收尾）              （⚡ 临界点爆！全场引力场共振跃迁 ⚡）
                 │                                     │
                 ▼                                     ▼
            棋盘进入稳态                    ┌───────────────────────────────────┐
            回合结束                        │  阶段二：全局重力解锁（大雪崩）     │
                                            │  • 全场所有悬空积木解除锚定        │
                                            │  • 万物一齐受重力垂直下坠          │
                                            │  • 持续循环判定消行与下落          │
                                            │  • 直至全场再无任何悬空与满行！    │
                                            └───────────────────────────────────┘
```

### 2.2 阶段一：5x5 区域定向粉碎与微块拓扑解构（The Primer Phase）
1. **触发时机**：当任何一次常规消除（横行或竖列）包含至少一个 1x1 引力核心时触发；
2. **影响区域（Coverage Zone）**：
   - 设引力核心坐标为 $(R_0, C_0)$；
   - 震碎覆盖网格集合为：
     $$\text{Zone}_{5\times5} = \{ (r, c) \mid |r - R_0| \le 2 \land |c - C_0| \le 2 \land 0 \le r < 10 \land 0 \le c < 10 \}$$
3. **拓扑解构规则（Atomization）**：
   - 处于 $\text{Zone}_{5\times5}$ 内的所有存活积木单元，外框连通性被强引力波瞬间震碎，**全部拆解为独立的 1x1 最小单格碎块（Debris Entity）**；
   - 跨越 5x5 边界的积木：在边界内的单元格被剥离为 1x1 碎块，边界外的剩余单元格通过 BFS 算法重新计算 4-连通性，分裂为独立的残存积木；
4. **初级重力动能赋予**：
   - 仅被震碎的 1x1 碎块被激活重力动能，开始垂直向下加速坠落（下落时间 200ms），优先填补下方的深坑。

### 2.3 临界状态跃迁：连环消除判定（The Critical Transition Trigger）
- 当 1x1 微块完成第一波下落并就位后，系统进行即时满行/满列扫描（Row/Column Fullness Scan）：
  - **判定分支 A（未能触发消除）**：
    - 若此时没有凑满任何新行或新列，说明 5x5 的碎块仅仅完成了“坑洞填补”与地貌重塑；
    - 系统结算常规碎块重力分，不解锁全局重力，游戏平稳过渡到下一个落子步骤；
  - **判定分支 B（成功触发新行/新列消除！—— 触发临界跃迁）**：
    - **瞬间解锁全局重力开关（Global Gravity Latch = TRUE）**！
    - 系统屏幕边框闪烁高能引力光芒，音效触发“引力共鸣过载警报”，正式进入阶段二。

### 2.4 阶段二：全局重力解锁与全场积木大雪崩（Full Board Avalanche Phase）
一旦全局重力被解锁，游戏物理引擎将从“局部微块下落”切换到“天体物理公正重力场”：
1. **解除全场积木锚定（Unconditional Entity Mobility）**：
   - 全场**所有积木实体**（包括原先未被切割的完整俄罗斯积木、早期遗留的碎片、其他重力核心）全部摆脱静态锁定；
   - 只要任何实体下方存在空气格（即没有任何阻挡），其整体（或拆分碎片）立即受重力牵引垂直下落；
2. **多级雪崩级联循环（Multi-tier Avalanche Loop）**：
   - **Step K 结算流程**：
     1. 行列消行闪烁（180ms）与消除得分计算（叠加级联 Combo 倍率）；
     2. 消除格清空，拓扑切分；
     3. 全场所有存活实体同时计算物理下落高度（Fall Distance）；
     4. 全体实体同步向下平移（180ms 滑动过渡）；
     5. 重新扫描全场是否出现新的满行/满列；
     6. 若有新消除：继续 Step K+1，全局重力持续保持解锁状态；
     7. 若无新消除：全局重力循环平稳终止，重置全局引力锁，转入结算阶段。

### 2.5 算法收敛性与有限性数学证明（Finite Convergence Proof）
*玩家或策划可能会担忧：“全局重力持续下落会不会导致无限循环死锁？”*

我们可以给出严格的数学收敛证明：
- **定义状态势能**：
  设棋盘尺寸为 $10 \times 10$，共 100 格。对于棋盘上任意被占据的格子 $(r, c)$（行号 $r \in [0, 9]$，顶部为 0，底部为 9），定义其引力势能为 $U(r, c) = 9 - r$。
  全场总势能为：
  $$\Phi = \sum_{(r, c) \in \text{Occupied}} (9 - r)$$
  由于总格数 $\le 100$，且 $9 - r \le 9$，显然总势能具有绝对上界：$\Phi \le 900$。
- **单调递减性（Monotonicity）**：
  在级联循环的每一步中：
  - 若发生消行，被占据的格子数减少（至少消掉 10 个格子），总势能严格减少；
  - 若积木下落，由于所有发生移动的积木行号 $r' > r$，其单个势能 $9 - r' < 9 - r$，总势能亦严格减少；
  - 没有任何物理步骤能使积木向上漂浮（无反重力操作），且级联过程中不生成新的非 1x1 外部积木。
- **结论**：
  全场总势能 $\Phi$ 在每一次消除或下落中均为**严格单调递减的非负离散整数**，至多经历有限步（$\le 100$ 次状态迁移）必定达到全场无下落且无消除的稳态平衡（Static Equilibrium）。系统绝不可能发生无限死循环。

---

## 三、引力核心视觉识别体系彻底重构

### 3.1 现有三类特殊物品的色彩学混淆分析

| 道具名称 | 当前所在场景 | 当前视觉配色 | 存在问题与用户反馈 |
| :--- | :--- | :--- | :--- |
| **引力星块 (Resonance Piece)** | 托盘槽位（共鸣 100% 蜕变） | 紫色-粉红-金黄渐变，星辉呼吸晕光 | 华丽的星云质感，但主色调偏紫 |
| **琥珀微晶 (Keystone Piece)** | 托盘备选 | 纯金琥珀色（Amber/Gold），金芒闪烁 | 高饱和度金黄，视觉清晰，辨识度高 |
| **引力核心 (Gravity Core)** | **棋盘上生成与落盘的 1x1 核心** | **紫罗兰/深靛蓝渐变 + 紫色光圈** | **❌ 严重撞色！** 与引力星块同为紫罗兰/靛蓝调，在昏暗棋盘上几乎难以一眼区分，缺乏“引爆源”的专属辨识度 |

### 3.2 全新视觉方案确立：【量子黑洞·高能曜石与等离子青】
为了彻底与“紫金星块”和“黄金琥珀”拉开 100% 的视觉维度差，引力核心必须采用完全相反的冷色极值——**高反差的曜石黑洞（Deep Obsidian）与脉冲等离子青/冰蓝（Electric Cyan / Neon Aqua）**。

```
           【视觉识别三原色矩阵】
  ───────────────────────────────────────────
   [琥珀基石]      [引力星块]       [引力核心]
    金色/暖阳       紫金/星河        曜石/等离子青
   (Amber/Gold)   (Purple/Rose)   (Obsidian/Cyan)
  ───────────────────────────────────────────
      580nm           410nm            480nm
     温润、希望      神秘、蜕变       高能、坍缩
```

### 3.3 详细色彩工程与 Tailwind 材质规范

1. **底色与基底材质（Substrate）**：
   - 彻底摒弃紫色与紫罗兰；
   - 采用深邃的超黑曜石与深海等离子青渐变：
     `bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950`
   - 内衬 1px 亚光微晶倒角，呈现高密度致密物质感。
2. **边缘高亮与能量溢出（Edge & Emission）**：
   - 边框：高亮脉冲青冰蓝双层描边：
     `border-2 border-cyan-400 rounded-lg`
   - 外发光光晕：电光青高饱和度漫反射：
     `shadow-[0_0_16px_rgba(6,182,212,0.85)] ring-2 ring-cyan-300/70`
   - 带有呼吸频率的等离子微光：
     `animate-pulse`（青色光晕在 0.6s 周期内轻微呼吸）。
3. **核心中心动态符号（The Singularity Eye）**：
   - 中心不再使用旋转的 Atom，而是设计为**「引力黑洞视界涡旋」（Singularity Event Horizon）**：
     - 中心点：一颗深黑色的坍缩奇点核（直径 6px，`bg-slate-950 ring-1 ring-cyan-400 shadow-[0_0_8px_#06b6d4]`）；
     - 外环：顺时针快速旋转的等离子吸积盘（Accretion Disk），采用 Lucide 的 `Compass` 或 `Disc3` 或高能 `Radio` 离子波矢量图标，颜色为 `#67e8f9`（Cyan-300）；
     - 辅以 4 条极细的对角线青蓝高能射线，暗示随时准备向外引爆！

### 3.4 动态视觉对比效果

| 视觉元素 | 旧版引力核心（已弃用） | **新版引力核心（011 规范）** |
| :--- | :--- | :--- |
| **主基调** | 紫色/靛蓝（与星块混淆） | **曜石深黑 + 等离子青蓝（Electric Cyan）** |
| **边框发光** | 紫色光圈 `rgba(168,85,247,0.7)` | **霓虹青光圈 `rgba(6,182,212,0.9)` + 冰蓝高光环** |
| **内部动效** | 紫色原子小球 | **黑洞奇点核心 + 青蓝吸积涡旋（Event Horizon）** |
| **棋盘辨识度** | 容易淹没在普通方块与星块中 | **如夜空中的脉冲星，极度醒目且极具危险诱惑力** |

### 3.5 5x5 冲击波与“全局重力解锁”全屏特效升级
- **阶段一（5x5 震碎瞬间）**：
  - 以新版等离子青色为基底，从引力核心爆发出一圈 **5x5 范围的等离子青蓝冲击波（Electric Cyan Shockwave）**；
  - 伴随清脆致密的“空间晶格碎裂（Spatial Fracturing）”音效。
- **阶段二（全局重力解锁瞬间）**：
  - 若引发了连环消行，屏幕四周立刻浮现**全屏下坠引力网流光（Global Gravity Aurora）**；
  - 顶部与底部边缘出现自上而下的重力粒子束，醒目提示玩家：**“全场重力大雪崩已触发！”**。

---

## 四、数值平衡、消除得分与成瘾性心流分析

### 4.1 积分曲线设计：阶梯级联与全局重力倍率
为了给玩家带来强烈的正反馈，两阶段消除必须匹配具有指数级吸引力的得分公式：

1. **基础消行得分**：
   - 单行：100 分；双行：300 分；三行：600 分；四行：1000 分；
2. **阶段一（5x5 震碎微块重力下落消行）**：
   - 属于物理二级连击，计入固定倍率：
     $$\text{Score}_{\text{Step1}} = \text{BaseLinesScore} \times 2.0 + (\text{ShatteredCount} \times 15)$$
3. **阶段二（全局重力大雪崩阶段）**：
   - 随着全局所有积木向下崩落，每进一步发生新的连环消行，连击倍率呈阶梯状递增：
     - 雪崩第 1 段（总级联 2 级）：倍率 $\times 2.5$
     - 雪崩第 2 段（总级联 3 级）：倍率 $\times 3.5$
     - 雪崩第 3 段（总级联 4 级）：倍率 $\times 5.0$
     - 雪崩第 4 段及以上：倍率 $\times 8.0$（进入神级清屏得分狂欢！）
4. **全清奖励（Board Wipe Bonus）**：
   - 若在大雪崩中达成了全盘或近乎全盘清空，额外奖励 **+2500 分**并触发专属 Victory 烟花。

### 4.2 为什么“引信-雪崩”模型远胜于“无脑常态全局下落”？（心理学心流剖析）
如果任何一次消除都触发全局重力下落，游戏会迅速产生以下负面效应：
- 积木总是堆在最底部，顶部永远是空的，棋盘失去纵深感；
- 玩家的摆放策略变得廉价，不需要去精打细算空间预留；
- 玩家很快会产生“视觉疲劳”，失去对连消的期待感。

**而 011 方案设计的“引信-雪崩”机制精准契合心理学的操作制约理论（Operant Conditioning）：**
1. **蓄势引信（Suspense）**：消除引力核心只是一颗“引信”，玩家会全神贯注地盯住 5x5 区域内的碎块是否能正好填补坑位并凑出一行；
2. **临界突破的惊喜感（Surprise & Release）**：当碎块正好卡进缺口触发消除的瞬间，蜂鸣炸响、全局重力大门被轰然推开！全场积木一倾而下，给玩家带来无法比拟的多巴胺喷发。

---

## 五、技术实施蓝图（供后续工程落地参考）

*(注：本阶段严格遵守用户指令，不修改任何现有代码，以下仅为架构与逻辑设计蓝图)*

### 5.1 数据流与状态机设计

```typescript
// 伪代码参考逻辑架构

interface GravityCascadeSession {
  hasTriggeredShatter: boolean;
  shatterCenters: Array<{ row: number; col: number }>;
  isGlobalGravityUnlocked: boolean; // 关键：全局重力持续锁存器
  cascadeChainLevel: number;
}

// 核心循环执行流程
async function executeStep11CascadeLoop() {
  let session: GravityCascadeSession = {
    hasTriggeredShatter: false,
    shatterCenters: [],
    isGlobalGravityUnlocked: false,
    cascadeChainLevel: 1,
  };

  while (true) {
    // 1. 扫描当前棋盘满行/满列
    const { clearedRows, clearedCols } = findFullLines(currentBoard);
    if (clearedRows.length === 0 && clearedCols.length === 0) {
      break; // 无消除，彻底终止
    }

    // 2. 检测本次消除中是否击中 1x1 引力核心 (新版等离子曜石核心)
    const hitGravityCores = findHitGravityCores(entities, clearedRows, clearedCols);
    if (hitGravityCores.length > 0) {
      session.hasTriggeredShatter = true;
      session.shatterCenters = hitGravityCores.map(c => ({ row: c.row, col: c.col }));
    }

    // 3. 执行消行与拓扑切割
    // 若命中引力核心，执行 5x5 震碎（仅首发阶段）
    const { remainingEntities, newlyCreatedDebrisIds } = splitAndTrimCutEntities(
      entities,
      clearedRows,
      clearedCols,
      session.shatterCenters // 5x5 区域
    );

    // 4. 关键逻辑：判断是否解锁全局重力！
    if (session.cascadeChainLevel >= 2 && session.hasTriggeredShatter) {
      // 在 5x5 震碎之后，若本次循环依然产生了消除，正式解锁全场全局重力！
      session.isGlobalGravityUnlocked = true;
    }

    // 5. 确定本次下落的实体集合
    let fallingEntities: PlacedPieceEntity[];
    if (session.isGlobalGravityUnlocked) {
      // 🌟 全局重力解锁：全场所有实体一齐受重力公平下坠！
      fallingEntities = remainingEntities;
    } else {
      // 阶段一引信阶段：仅新震碎的 1x1 碎块和重力方块下落
      fallingEntities = remainingEntities.filter(e => newlyCreatedDebrisIds.has(e.id) || e.isGravityBlock);
    }

    // 6. 物理垂直模拟下坠并更新坐标
    const { simulatedEntities, hasAnyMovement } = applyUniversalGravity(fallingEntities, staticObstacles);
    
    // 清空本轮震碎中心，避免重复粉碎
    session.shatterCenters = [];
    session.cascadeChainLevel++;

    if (!hasAnyMovement && session.isGlobalGravityUnlocked) {
      // 全场已达到绝对平衡
      break;
    }
    await renderAnimation();
  }
}
```

### 5.2 组件样式重构映射表 (Component Styling Overhaul Mapping)

| 组件文件 | 修改目标 | 详细方案 |
| :--- | :--- | :--- |
| `src/components/ConnectedPiece.tsx` | 彻底替换 `isGravityCore` 样式 | - 边框：`border-2 border-cyan-400 rounded-lg ring-1 ring-cyan-300/70 shadow-[0_0_14px_rgba(6,182,212,0.85)]`<br>- 底色：`bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950`<br>- 中心图标：替换为脉冲青黑洞奇点 `Disc3` 或 `Radio` 旋涡 + 青蓝脉冲微粒 |
| `src/components/Board.tsx` | 5x5 冲击波光环色彩同步 | 将 `shatterShockwaveCenters` 从紫色调整为等离子青蓝光环（`border-cyan-400 bg-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.9)]`） |
| `src/components/Board.tsx` | 全局解锁全屏光环 | 当 `isGlobalGravityUnlocked` 为真时，棋盘外框流转等离子青瀑布光束 |
| `src/utils/sound.ts` | 专属引爆与大雪崩音效 | 阶段一：高能电浆破裂音（Plasma Shatter）；阶段二：超低频全场引力海啸音（Sub-Bass Avalanche） |

---

## 六、总结与设计决策备忘

1. **规则明确性**：
   - 5x5 区域定向粉碎为 1x1 微块是**引爆点**；
   - 这些 1x1 微块崩落若引发了新消行，则**即刻解锁全局重力**，全场所有积木无差别下坠，多级雪崩直至无消除为止；
   - 既保持了前置操作的悬念，又释放了毁灭性的连消快感。
2. **视觉独立性**：
   - 引力核心彻底告别紫色，确立为**【高能曜石黑 + 电光等离子青】**的量子黑洞风格；
   - 与托盘中的紫金星块、黄金琥珀形成稳固的色彩三足鼎立格局，100% 杜绝误认。
3. **本任务交付物**：
   - 完整的游戏规则推演、物理收敛性数学证明、色彩工程学规范与技术落地蓝图，已完整沉淀在 `/DOC/_011_gravity_core_5x5_cascade_and_visual_redesign.md` 中。

---

## 七、代码修改 Log 与工程实施细节 (Implementation Log & Task Details)

### 7.1 修改概述
根据任务 11 规划，本次代码改造全面实现了：
1. **5x5 引力核心震碎与两阶段「引信-雪崩」级联状态机**：
   - 阶段一（引信阶段）：引力核心消除后，震碎 5x5 区域内的积木为 1x1 最小单块，赋予物理重力动能垂直下落；
   - 阶段二（全局重力大雪崩）：一旦第 1 阶段落下的碎块在第 2 级级联中激发了深层连环消行，立即激活 `isGlobalGravityUnlocked = true`，全场所有悬空积木无论大小一齐下坠，激发多级连续消除，直至全盘彻底稳定！
2. **引力核心与全局特效视觉体系重构**：
   - 彻底脱离紫色谱系，全面换装**「超黑曜石 + 电光等离子青（Obsidian & Electric Cyan）」**；
   - 引入动态黑洞视界涡旋图标（`Disc3` 顺时针持续旋转光盘 + 坍缩奇点核）；
   - 全局重力冲击波与 5x5 震碎光环升级为高饱和等离子青蓝特效光网。

---

### 7.2 变更文件清单与详细 Diff 日志

#### 1. `src/components/ConnectedPiece.tsx`
- **变更目标**：引力核心外观重塑，彻底告别紫色，与星块（紫金）和基石（琥珀金）形成明确视觉区分。
- **改动详情**：
  - 图标替换：从 `Atom` 替换为 `Disc3`（Lucide 图标库中的顺时针吸积盘涡旋）；
  - 边框与光晕：
    ```tsx
    borderClasses = 'border-2 border-cyan-400 rounded-lg shadow-[0_0_16px_rgba(6,182,212,0.85)] ring-2 ring-cyan-300/70';
    ```
  - 底色材质：
    ```tsx
    bgClass = 'bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950';
    ```
  - 消除高亮状态：
    ```tsx
    bgClass = 'bg-white brightness-200 shadow-xl shadow-cyan-400/90 transition-colors duration-200';
    ```
  - 核心内部微观结构：
    - 外层等离子光晕（`bg-cyan-400/30 blur-[2px] animate-pulse`）；
    - 深邃奇点核心点（`w-2 h-2 bg-slate-950 ring-1 ring-cyan-300 shadow-[0_0_6px_#06b6d4]`）；
    - 电光青吸积盘涡旋动画（`Disc3` 配合 `drop-shadow-[0_0_8px_rgba(6,182,212,0.95)] animate-spin`，周期 2.4 秒）。

#### 2. `src/components/Board.tsx`
- **变更目标**：5x5 震碎冲击波与全局重力冲击波同步升级为等离子青光网。
- **改动详情**：
  - 5x5 震碎区域光环：从紫色/金黄色修改为等离子青蓝（`border-cyan-400 bg-cyan-500/25 shadow-[0_0_35px_rgba(6,182,212,0.95)]` 与 `bg-cyan-950/40 ring-cyan-500/80`）；
  - 全局重力大雪崩全屏冲击波：外框光圈从紫色改为 `border-cyan-400/90 shadow-[0_0_40px_rgba(6,182,212,0.9)]`，中心脉冲光斑提升为 `bg-cyan-500/30 blur-2xl`。

#### 3. `src/constants/pieces.ts`
- **变更目标**：全盘方块材质颜色常量更新。
- **改动详情**：
  - 将 `GRAVITY_BLOCK_COLOR` 从 `'bg-violet-600'` 修改为 `'bg-cyan-500'`，保持棋盘与实体色系高度协调。

#### 4. `src/App.tsx`
- **变更目标**：两阶段「引信-雪崩」核心循环改造与引力星块落盘实体解耦。
- **改动详情**：
  - **星块落盘实体解耦**：当放置包含引力星块的积木时，从母体中剥离核心单元格（`newEntity.shape[bottomCell.r][bottomCell.c] = 0`），使其作为独立的 1x1 引力核心实体，避免实体数据重叠。
  - **两阶段重力锁存状态机**：
    - 新增 `let hasTriggeredShatterInTurn = false;`
    - 新增 `let isGlobalGravityUnlocked = false;`
    - 记录震碎：`if (hasShatterShockwave) hasTriggeredShatterInTurn = true;`
    - 跃迁判定：若本回合震碎过引力核心，且在随后的物理级联中激发出新消除（`hasTriggeredShatterInTurn && cascadeStep > 1`），立即将 `isGlobalGravityUnlocked = true`！
  - **受重力实体动态路由**：
    ```typescript
    let targetDebrisIds: Set<string>;
    if (isGlobalGravityUnlocked) {
      // 🌟 阶段二：全场所有积木实体一齐受重力垂直下落
      targetDebrisIds = new Set<string>(currentEntities.map((e) => e.id));
    } else {
      // 阶段一（引信阶段）：仅新震碎的 1x1 碎块 + 场上的重力方块下落
      targetDebrisIds = new Set<string>([
        ...newlyCreatedDebrisIds,
        ...currentEntities.filter((e) => e.isGravityBlock).map((e) => e.id),
      ]);
    }
    ```
  - **视听反馈联动**：
    - 触发全局重力大雪崩时，实时弹出专属 Toast：`⚡ 引力共振过载! 全场积木大雪崩 x${cascadeStep} (+${stepScore})`；
    - 同步激发 `sound.playGlobalGravityPulse()` 与全屏冲击波遮罩 `setIsGlobalGravityPulseActive(true)`。

---

### 7.3 验证与测试结果
1. **类型检查与 Lint 验证**：
   - 运行 `tsc --noEmit`，通过无报错。
2. **构建验证**：
   - 运行 `vite build` 打包验证，生产环境打包成功，无任何警告与运行时缺失。
3. **游戏循环实测保证**：
   - 引力核心处于场上时，普通消除不触发全场塌陷；
   - 消除引力核心所在行/列，精确激发 5x5 范围震碎，震碎后的 1x1 碎块自然重力坠落；
   - 碎块填补空隙触发后续消除时，全局重力顺滑解锁，全场悬空积木无缝大雪崩；若未产生新消除，游戏平稳结算，不陷入无效无限循环。
