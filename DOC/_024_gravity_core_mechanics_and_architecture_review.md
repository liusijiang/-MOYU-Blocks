# 任务 024：引力核心（Gravity Core）游戏机制、物理裂变引信与全链路代码架构全景解析

- **文档编号**: `_024_`
- **文档名称**: 引力核心（Gravity Core）游戏机制、多线生成、5x5 裂变引信、雪崩级联跃迁与代码架构全景解析
- **前置依赖与关联文档**:
  - `_004_piece_debris_gravity_and_gravity_block.md`（1x1 重力方块概念初建与重力效应萌芽）
  - `_008_universal_gravity_fall_correction.md`（全场重力下坠设计与物理公平性纠偏）
  - `_010_game_rules_engagement_and_addictiveness_analysis.md`（引力共鸣槽规则、单发发牌与跨步连击系统）
  - `_011_gravity_core_5x5_cascade_and_visual_redesign.md`（5x5 裂变引信设计与等离子曜石视觉重构规范）
  - `_013_gravitational_singularity_and_structural_collapse.md`（引力奇点坍缩、落盘即爆与支撑力沉降）
  - `_014_gravitational_singularity_and_structural_collapse_implementation_plan.md`（奇点落地与支撑力沉降落地工程）
  - `_015_singularity_cross_blast_origin_and_preview_design.md`（引力星核发射源与连锁核心 5x5 预警）
  - `_016_singularity_cross_blast_targeting_and_preview_system_specification.md`（瞄准预览 HUD 系统规范）
  - `_023_gravity_star_block_mechanics_and_architecture_review.md`（引力星块机制与架构总结）
- **核心定位**: **深度剖析并完整总结《摸鱼方块》中「引力核心」（Gravity Core）的诞生因由、演进历程、生成规则、物理裂变机制、全局大雪崩连锁判定以及视觉与工程实现，建立关于引力核心机制的权威标准知识库。**
- **执行原则**: **严格遵守指令：代码零修改（Zero Code Modification），仅在 DOC 路径下沉淀文档**。

---

## 目录索引

1. [引力核心的定义与系统本体定位](#一引力核心的定义与系统本体定位)
   - 1.1 什么是引力核心（Gravity Core）？
   - 1.2 物理形态与属性解构：与引力星块、微晶基石、普通碎石的边界
   - 1.3 核心战略职能：从棋盘“地雷引信”到“空间重组催化剂”
2. [引力核心机制的演进史：从粗放下落到确定性雪崩引信](#二引力核心机制的演进史从粗放下落到确定性雪崩引信)
   - 2.1 任务 004 时期：1x1 “重力方块”初生与全场碎片沉降
   - 2.2 任务 008 时期：全场积木公正下落与地貌抹平的弊端
   - 2.3 任务 011 时期：5x5 定向震碎引信与“曜石等离子青”视觉彻底重构
   - 2.4 任务 013 ~ 016 时期：解除 2.76% 概率死锁，确立“大雪崩临界跃迁”与“奇点脱壳共振”
3. [引力核心的双重诞生链路与生成数学模型](#三引力核心的双重诞生链路与生成数学模型)
   - 3.1 链路一：高阶多线连消触发（checkAndSpawnGravityBlock）
   - 3.2 链路二：引力星块落盘奇点脱壳固化（Singularity Core In-Place Crystallization）
4. [引力核心的激活与物理裂变动力学（Detonation & Avalanche）](#四引力核心的激活与物理裂变动力学detonation--avalanche)
   - 4.1 激活触发条件：常规消除穿透与奇点贯穿波及
   - 4.2 阶段一：5x5 区域定向粉碎（splitAndTrimCutEntities & Shatter Zone）
   - 4.3 阶段二：1x1 碎石自由落体与牛顿支撑力沉降（computeStructuralSupportDrops）
   - 4.4 阶段三：大雪崩确定性临界跃迁（Deterministic Avalanche Transition）
5. [战术预警与连锁感应（Chained Core Lock & Preview）](#五战术预警与连锁感应chained-core-lock--preview)
   - 5.1 十字瞄准光束穿透感应模型
   - 5.2 5x5 紫色脉冲震荡波预警场渲染
   - 5.3 双重雷达锁定蜂鸣音效工程
6. [独立视觉图腾与声学通感系统（Visual & Acoustic Identity）](#六独立视觉图腾与声学通感系统visual--acoustic-identity)
   - 6.1 色彩与材质：曜石深黑底质与电涌等离子青（Obsidian & Electric Cyan）
   - 6.2 内部微视界：微型奇点核与高速旋转吸积盘（Event Horizon & Accretion Disc）
   - 6.3 冲击波光幕渲染与性能保障（Anti-Slop 与无模糊滤镜架构）
   - 6.4 专属 Web Audio 纯程序化音效链
7. [代码实现映射索引（Source Code Architecture Mapping）](#七代码实现映射索引source-code-architecture-mapping)
8. [总结与机制价值评估](#八总结与机制价值评估)

---

## 一、引力核心的定义与系统本体定位

### 1.1 什么是引力核心（Gravity Core）？

在《摸鱼方块》的微观世界中，**「引力核心」**（在代码中标记为 `isGravityBlock: true, shape: [[1]]`，常态呈现为深邃曜石黑底搭配霓虹等离子青光晕的 1x1 晶体）是盘踞在棋盘上的**战略级物理引信与空间重构催化剂**。

它并非玩家直接从托盘中抓取的手牌，而是通过高阶消除操作（如双行/双列/十字消除）或是引力星块落盘奇点脱壳后，**在棋盘特定网格内孕育出的高密度能量奇点实体**。

它平时静止如深海礁石，而一旦被后续的横纵消除线穿透激活，便会瞬间向四周爆发极强的引力冲击波，将周围积木震裂为最微小的碎石，并作为“点火引信”拉开全场积木自底向上大雪崩的序幕。

### 1.2 物理形态与属性解构：四类实体的边界对比

为了杜绝概念混淆，下表对棋盘与手牌中的四类核心实体进行横向对比：

| 实体标识 | 空间驻留地 | 几何尺寸 | 视觉配色与材质 | 生成驱动源 | 物理核心职能 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **引力核心**<br>`(Gravity Core)` | **棋盘网格** | 严格 **1x1** 最小单格 | 曜石超深黑 + 等离子青<br>(`from-slate-950 via-cyan-950`)<br>内置 `Disc3` 逆时针吸积盘 | ① 横竖多线连消（$\ge 2$线）<br>② 引力星块落盘时底格固化脱落 | **棋盘引爆引信**；被消除时引爆 5x5 区域积木震碎为 1x1，为全局大雪崩提供点火条件。 |
| **引力星块**<br>`(Resonance Piece)` | **托盘槽位**（手牌） | 任意俄罗斯方块形态<br>(4格经典拓扑) | 深空星云紫金双色渐变<br>(`from-indigo-950 via-purple-900`)<br>底层单元格嵌入高能金色准星 | 引力共鸣槽蓄满 100% 后<br>对托盘首个可用方块原位附魔 | **全场战役大招**；拖拽时激发横纵十字瞄准，落盘瞬间触发 19 格十字穿透爆破，底格固化为引力核心。 |
| **微晶基石**<br>`(Keystone)` | **托盘槽位**（手牌） | 严格 **1x1** 最小单格 | 纯净琥珀耀金晶体渐变<br>(`from-amber-300 via-amber-400`)<br>内置脉冲 `Sparkles` 闪光点 | 自适应发牌算法<br>在托盘全死且满足冷却时刷出 | **战术解围钥匙**；1x1 自由填充死角缺口，挽救濒死盘面。 |
| **普通积木碎片**<br>`(Debris Entity)` | **棋盘网格** | 1x1 ~ 3x3 随机破损拓扑 | 沿用母体方块的经典颜色<br>(青、黄、紫、绿、红、蓝、橙) | 被常规消除线条切割截断<br>或被引力核心 5x5 震碎 | **受重力下落的被动实体**；失去底层支撑时垂直滑落填坑。 |

### 1.3 核心战略职能：从棋盘“地雷引信”到“空间重组催化剂”

如果说常规俄罗斯积木是在向棋盘“填塞熵增”，那么引力核心就是棋盘上的**“负熵压缩机”**：
1. **战略布局（Strategy Stash）**：玩家主动打出双线消除生成引力核心，相当于在棋盘的咽喉要道“埋下一颗高能地雷”；
2. **重塑地貌（Topological Remodeling）**：当引力核心被引爆，5x5 区域内的顽固几何死角瞬间瓦解为自由流动的 1x1 微粒；
3. **连锁爆发（Chain Reaction Catalyst）**：它为后续的全局重力大雪崩提供了最宝贵的“多米诺骨牌第一张骨牌”。

---

## 二、引力核心机制的演进史：从粗放下落到确定性雪崩引信

梳理 `DOC` 目录下的一系列技术文档，引力核心机制经历了四次极其重要的系统重构：

```
【引力核心机制的四阶段跃迁】

  [阶段 1: Doc 004] ──► [阶段 2: Doc 008] ──► [阶段 3: Doc 011] ──► [阶段 4: Doc 013~016]
   1x1 重力方块生成       全场积木公正下坠       5x5 定向震碎引信        解除 2.76% 概率死锁
   消除时仅碎片下落       抹平地貌失去纵深       曜石等离子青重构        确立确定性大雪崩跃迁
```

### 2.1 任务 004 时期：1x1 “重力方块”初生与全场碎片沉降
- **初版诞生**：在文档 `_004_` 中首次提出了“重力方块”的概念。当单次消除产生两行以上、或一行一列交叉十字消除时，在消除空格内随机生成一个 1x1 的重力方块；
- **初代局限**：当时消除该方块，仅仅能让“先前被切碎的积木碎片”下落，而未被切碎的完整积木完全不受物理影响，导致玩家感觉重力规则不统一、产生断层感。

### 2.2 任务 008 时期：全场积木公正下落与地貌抹平的弊端
- **全场下落探索**：在文档 `_008_` 中，将重力方块被消除时的行为扩展为“全场所有积木整体公正垂直下坠”；
- **暴露的机制缺陷**：一旦消除重力方块，整个棋盘所有悬空方块无脑往下掉，导致所有积木总是扁平地堆积在底部，棋盘彻底失去纵深感；玩家无需策略计算即可轻松消除，玩法迅速变味和疲劳。

### 2.3 任务 011 时期：5x5 定向震碎引信与“曜石等离子青”视觉彻底重构
- **两阶段“引信-雪崩”模型确立**：
  文档 `_011_` 废弃了“无脑全场下落”，创新性提出了“5x5 区域定向粉碎”：
  - 引力核心被消除时，仅将其周围 $5\times 5$ 半径内的积木解构为 1x1 微块；
  - 1x1 微块先做第一波垂直自由落体填坑，作为“点火引信”；
- **视觉混淆诊断与彻底重构**：
  011 任务严厉指出旧版引力核心使用紫色渐变，与托盘中的引力星块高度同质化撞色。为此，全面确立了**「曜石深黑 + 等离子青蓝（Obsidian & Electric Cyan）」**的专属视觉图腾，辅以高速旋转吸积盘，树立了无可替代的辨识度。

### 2.4 任务 013 ~ 016 时期：解除 2.76% 概率死锁，确立“大雪崩临界跃迁”
- **致命概率死锁的发现（013 走查）**：
  011 版本规定：5x5 碎石下落后，必须在后续步骤中凑满一整行（10格全满），才能解锁全局大雪崩。然而经蒙特卡洛随机模拟测算，在充满空隙的 10x10 网格中，单靠 5x5 掉落的几颗微块正好拼满 10 格的概率不足 **2.76%**！全局大雪崩沦为近乎无法触发的“幽灵机制”；
- **确定性跃迁修正（Deterministic Avalanche Transition）**：
  013 与 014 任务彻底重写了触发阈值：
  只要本回合触发了引力核心的 5x5 震碎，在后续步骤（`cascadeStep > 1`）中，**只要碎石下落促成了哪怕 1 条新的消行（`totalLines >= 1`）**，系统立刻 **100% 确定性**激活全局大雪崩（`isGlobalGravityUnlocked = true`）！
- **星核奇点脱壳共振**：
  引力星块落盘触地瞬间，最底部晶元就地脱落固化为 1x1 引力核心，使引力核心的在场率与战术价值大幅提升。

---

## 三、引力核心的双重诞生链路与生成数学模型

在当前稳定运行的代码体系中，棋盘上的引力核心拥有两条完全独立且互补的孕育生成通道：

```
                    【引力核心的双重生成链路】
                    
     通道 A: 技巧消除触发                        通道 B: 战略大招兑现
  ┌───────────────────────────┐               ┌───────────────────────────┐
  │ 玩家打出高阶消除          │               │ 玩家放置引力星块          │
  │ (双行/双列/十字交叉 >=2线)│               │ (isResonancePiece = true) │
  └─────────────┬─────────────┘               └─────────────┬─────────────┘
                │                                           │
                ▼                                           ▼
  ┌───────────────────────────┐               ┌───────────────────────────┐
  │ checkAndSpawnGravityBlock │               │ 奇点脱壳: bottomCell 固化 │
  │ 算法优先选择交叉点空格生成│               │ 母体剥离该格，就地生成    │
  └─────────────┬─────────────┘               └─────────────┬─────────────┘
                │                                           │
                └─────────────────────┬─────────────────────┘
                                      ▼
                        ┌───────────────────────────┐
                        │ 生成 1x1 引力核心实体     │
                        │ color: bg-cyan-500        │
                        │ shape: [[1]]              │
                        │ isGravityBlock: true      │
                        └───────────────────────────┘
```

### 3.1 链路一：高阶多线连消触发（checkAndSpawnGravityBlock）

在 `src/utils/gameLogic.ts` 中，纯函数 `checkAndSpawnGravityBlock` 负责检测常规落子是否符合生成资格：

```typescript
// src/utils/gameLogic.ts: 第 767~830 行
export function checkAndSpawnGravityBlock(
  board: BoardState,
  clearedRows: number[],
  clearedCols: number[]
): PlacedPieceEntity | null {
  const lineCount = clearedRows.length + clearedCols.length;
  const isEligible =
    clearedRows.length >= 2 ||
    clearedCols.length >= 2 ||
    (clearedRows.length >= 1 && clearedCols.length >= 1);

  if (!isEligible || lineCount < 2) return null;
  // ...
```

#### 生成数学规则：
1. **触发门槛**：
   $$\text{LineCount} \ge 2 \quad \text{且} \quad (\text{Rows} \ge 2 \lor \text{Cols} \ge 2 \lor (\text{Rows} \ge 1 \land \text{Cols} \ge 1))$$
2. **位置甄选三级梯度算法**：
   - **优先级 1（交叉点黄金位）**：优先在横竖相交的网格空格 $(r, c) \in \text{clearedRows} \times \text{clearedCols}$ 且 `board[r][c] === null` 中选取；
   - **优先级 2（消除线空位）**：若无交叉点空位，在本次消除清空的所有行和列的任意空单元格中随机选取；
   - **优先级 3（全盘保底空位）**：若上述网格已被其他方块占据，则在全场 100 个格子中扫描任意空白单元格保底生成。
3. **声学与实体固化**：
   生成后作为独立的 `PlacedPieceEntity` 载入棋盘，并调用 `sound.playGravityBlockSpawn()` 播放带有空灵科幻感的晶体生成音效。

### 3.2 链路二：引力星块落盘奇点脱壳固化

在 `src/App.tsx` 中，当玩家放置了满能的引力星块时，执行星核剥离：

```typescript
// src/App.tsx: 第 408~425 行
if (isResonancePiece) {
  const bottomCell = findBottomMostCellInPiece(piece.shape);
  const coreRow = row + bottomCell.r;
  const coreCol = col + bottomCell.c;
  newEntity.shape[bottomCell.r][bottomCell.c] = 0; // 从母体俄罗斯方块中扣除该格
  boardWithPiece[coreRow][coreCol] = GRAVITY_BLOCK_COLOR;

  const resonanceGravityCoreEntity: PlacedPieceEntity = {
    id: `resonance_core_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    color: GRAVITY_BLOCK_COLOR,
    startRow: coreRow,
    startCol: coreCol,
    shape: [[1]],
    isDebris: false,
    isGravityBlock: true,
  };
  currentEntities.push(resonanceGravityCoreEntity);
  // ...
```
**机制深意**：
这保证了引力大招不仅带来一次性的 19 格十字大清屏，还在棋盘落地处**永久埋下一颗 1x1 引力核心**，为后续对局埋下二次激发的物理引信。

---

## 四、引力核心的激活与物理裂变动力学（Detonation & Avalanche）

当棋盘上已存在引力核心时，一旦它被后续的消除波及，游戏物理引擎将全面启动三阶段动力学结算。

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        引力核心激活与三阶段级联裂变动力学流程                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                             【引力核心被消除行/列贯穿】
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │ 阶段一：5x5 定向冲击震碎（引信阶段）         │
                    │ • 以核心坐标为中心，扫描半径 2 格内的网格    │
                    │ • 范围内的存活积木全部解构为 1x1 独立碎块    │
                    │ • 跨边界积木执行 BFS 连通域重新切分          │
                    │ • 触发等离子青 5x5 冲击波与裂变空间碎裂声效  │
                    └───────────────────────┬──────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │ 阶段二：牛顿支撑力沉降（初级重力填坑）       │
                    │ • computeStructuralSupportDrops 自底向上投射 │
                    │ • 1x1 碎石与悬空积木受重力自由垂直下落       │
                    │ • 填补深坑，重塑局部微地形                  │
                    └───────────────────────┬──────────────────────┘
                                            │
                                            ▼
                                  【进入 CascadeStep = 2】
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ 沉降后是否形成新的消行？  │
                              └─────────────┬─────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
              【未产生新消行】                                 【产生任意新满行/满列!】
                    │                                               │
                    ▼                                               ▼
            （引信燃尽，平稳收尾）                     ┌───────────────────────────────────┐
                    │                                  │ ⚡ 阶段三：临界点爆！全局大雪崩 ⚡ │
                    │                                  │ • isGlobalGravityUnlocked = true  │
                    │                                  │ • 全场所有悬空积木解除刚性锁定    │
                    │                                  │ • 全体方块一齐垂直滑落崩塌        │
                    │                                  │ • 循环扫描判定消行直至全场稳态！  │
                    └───────────────────────┬──────────┴─────────────────┬─────────────────┘
                                            │                            │
                                            └──────────────┬─────────────┘
                                                           ▼
                                               【平息收尾，结算巨额连击分】
```

### 4.1 激活触发条件
在 `App.tsx` 的级联主循环中，系统实时检测：
```typescript
const clearedGravityCores = currentEntities.filter(
  (e) =>
    e.isGravityBlock &&
    (clearedRows.includes(e.startRow) || clearedCols.includes(e.startCol))
);
```
只要消除的横行包含核心的 `startRow`，或者消除的竖列包含核心的 `startCol`，引力核心即刻被引爆！

### 4.2 阶段一：5x5 区域定向粉碎（splitAndTrimCutEntities & Shatter Zone）

在 `src/utils/gameLogic.ts` 中，`splitAndTrimCutEntities` 接收 `shatterCenters` 坐标数组：

$$\text{ShatterZone} = \{ (r, c) \mid |r - r_{\text{core}}| \le 2 \land |c - c_{\text{core}}| \le 2 \}$$

#### 拓扑切割逻辑：
1. **内部方块原子化**：处于该 $5\times 5$（最多 25 个格子）范围内的所有积木单元格，其原有的刚体外框约束被引力波撕裂；
2. **生成 1x1 独立碎石**：系统在原位置为每个单元格生成独立的 `PlacedPieceEntity`：
   ```typescript
   const shatteredPiece: PlacedPieceEntity = {
     id: fragId,
     color: entity.color,
     startRow: boardR,
     startCol: boardC,
     shape: [[1]],
     isDebris: true,
     isGravityBlock: entity.isGravityBlock ?? false,
   };
   remainingEntities.push(shatteredPiece);
   ```
3. **边界积木 BFS 重新切分**：跨越 5x5 边界的多联方块，在边界外的存活部分通过广度优先搜索（BFS）重新聚类为新的独立碎片实体，绝无悬挂或内存泄漏。

### 4.3 阶段二：1x1 碎石自由落体与牛顿支撑力沉降
在震碎完成后，系统调用 `computeStructuralSupportDrops`：
- 所有新生成的 1x1 碎石以及因消除被掏空的上方积木，沿着垂直方向执行向下射线碰撞检测（Vertical Raycasting）；
- 失去底层支撑的方块整体或微粒，以流畅的缓动曲线垂直坠入下方坑洞；
- 该阶段的下落具有极强的策略价值——它以物理流体的方式重塑了棋盘底盘，填平了此前难以填充的凹槽。

### 4.4 阶段三：大雪崩确定性临界跃迁（Deterministic Avalanche Transition）

这是整个引力物理引擎最精妙的“戏剧高潮”：
```typescript
// App.tsx: 第 514~516 行
if (hasTriggeredShatterInTurn && cascadeStep > 1 && totalLines >= 1) {
  isGlobalGravityUnlocked = true;
}
```
- **临界触发**：碎石沉降后，只要填平坑洼凑出了**任意 1 行或 1 列消除**，系统立即将 `isGlobalGravityUnlocked` 赋为 `true`；
- **雪崩爆发**：
  - 屏幕四周激活高能等离子引力脉冲冲击波（`isGlobalGravityPulseActive = true`）；
  - 扬声器鸣响宏大的次声波重力扫频（`sound.playGlobalGravityPulse()`）；
  - 全场所有积木（无论是完整俄罗斯方块还是碎石）彻底解除静态锁定，在物理引擎牵引下一齐向下轰然崩落！
  - 崩落若再次形成满行，则级联计数器累加（`cascadeStep++`），得分乘数呈阶梯级暴涨，形成“大雪崩”狂欢！

---

## 五、战术预警与连锁感应（Chained Core Lock & Preview）

引力核心不仅在被消除时释放威力，当玩家在手牌中拖拽**引力星块**进行全屏十字瞄准时，棋盘上的引力核心还会与星块产生强烈的**高维战术共振**。

```
【引力星块拖拽瞄准与引力核心的战术共振】

      引力星块十字瞄准光束 (centerRow, centerCol)
                      │
                      ▼
        扫描处于 centerRow 或 centerCol 上的引力核心
                      │
                      ▼
          ┌──────────────────────────────────────┐
          │ 触发连锁锁定 (Chained Core Lock)     │
          │ 1. 核心周围亮起 5x5 紫色虚线脉冲预警 │
          │ 2. 核心内部吸积盘转速加剧            │
          │ 3. 扬声器释放双频雷达锁定蜂鸣        │
          └──────────────────────────────────────┘
                      │
                      ▼
         玩家获得确切情报: "此处下落将触发连锁大引爆!"
```

### 5.1 十字瞄准光束穿透感应模型
在 `src/utils/gameLogic.ts` 的 `computeSingularityCrosshairPreview` 中：
```typescript
const chainedGravityCores = placedPieces
  .filter(
    (e) =>
      e.isGravityBlock &&
      (e.startRow === centerRow || e.startCol === centerCol)
  )
  .map((c) => ({ row: c.startRow, col: c.startCol }));
```
算法在微秒级时间内扫描全部场上实体，实时捕获所有位于十字发射轴线上的引力核心。

### 5.2 5x5 紫色脉冲震荡波预警场渲染
在 `Board.tsx` 中，一旦 `chainedGravityCores` 存在元素，系统将在网格上空动态投射出 5x5 预警框：
```tsx
{/* Board.tsx: 第 344~370 行 */}
{singularityCrossPreview.chainedGravityCores.map((core, idx) => {
  const minR = Math.max(0, core.row - 2);
  const maxR = Math.min(9, core.row + 2);
  const minC = Math.max(0, core.col - 2);
  const maxC = Math.min(9, core.col + 2);
  // ...
  return (
    <div className="absolute pointer-events-none z-24 rounded-xl border-2 border-dashed border-purple-400/90 bg-purple-950/25 shadow-[0_0_14px_rgba(168,85,247,0.7)] animate-pulse" />
  );
})}
```
虚线边框伴随轻微呼吸光芒，精确向玩家勾勒出：“如果你在此处落子，这 25 个格子的空间将被彻底震碎重构！”

### 5.3 双重雷达锁定蜂鸣音效工程
在准星滑过引力核心所在的行/列的瞬间，系统触发 `sound.playChainedCoreLockAlert()`，释放两道快速交替的双正弦波微脉冲（1200Hz / 1600Hz），模拟军事雷达锁定目标的警示音，极大地刺激了玩家的神经兴奋度。

---

## 六、独立视觉图腾与声学通感系统（Visual & Acoustic Identity）

根据任务 `_011_` 与 `_021_` 的设计规范，引力核心确立了完全独立于其他道具的视听识别系统。

### 6.1 色彩与材质：曜石深黑与等离子青（Obsidian & Electric Cyan）
为了杜绝与紫金星块（Purple/Gold）或琥珀微晶（Amber）撞色，引力核心采用完全相反的极冷色系：
- **基底材质**：
  `bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950`
  呈现如宇宙黑体辐射般的超致密高密度物质感；
- **高能外边框与光晕**：
  `border-2 border-cyan-400 rounded-lg shadow-[0_0_16px_rgba(6,182,212,0.85)] ring-2 ring-cyan-300/70`
  向外喷薄出高饱和度的霓虹等离子青光晕。

### 6.2 内部微视界：微型奇点核与高速旋转吸积盘
在 `src/components/ConnectedPiece.tsx` 中：
```tsx
{/* ConnectedPiece.tsx: 第 136~152 行 */}
{isGravityCore && !isGhost && (
  <div className="relative flex items-center justify-center w-full h-full">
    {/* 青色事件视界光晕 */}
    <div className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400/30 blur-[2px] animate-pulse" />
    {/* 超深黑奇点核心原点 */}
    <div className="absolute w-2 h-2 rounded-full bg-slate-950 ring-1 ring-cyan-300 shadow-[0_0_6px_#06b6d4] z-10" />
    {/* 等离子吸积盘顺时针高速旋转 */}
    <Disc3
      className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.95)] animate-spin"
      style={{
        width: Math.max(15, cellSize * 0.68),
        height: Math.max(15, cellSize * 0.68),
        animationDuration: '2.4s',
      }}
    />
  </div>
)}
```
这一精致小巧的天体物理拟物结构，使 1x1 的引力核心在昏暗的棋盘格中如同一枚耀眼的“脉冲星”，极具危险诱惑力与科技美感。

### 6.3 冲击波光幕渲染与低负载优化（Anti-Slop）
- **5x5 裂变光幕（Shatter Shockwave Overlay）**：
  核心爆破时，以其为中心向四周投射一层带 `animate-ping` 与 `animate-pulse` 的等离子青色光幕（`Board.tsx` 第 184~209 行）；
- **全屏下坠引力波（Global Gravity Pulse）**：
  全场大雪崩激活时，棋盘外围亮起全屏青蓝引力脉冲边框与径向衰减光波（`Board.tsx` 第 212~220 行）；
- **移动端零卡顿优化**：
  严格贯彻任务 021 的防掉帧规范，**彻底摒弃了昂贵耗能的 `backdrop-filter: blur()`**，光幕完全依托预乘透明度与 GPU 变换管线，在 iOS In-App WebView 下依然能跑满 60fps。

### 6.4 专属 Web Audio 纯程序化音效链

在 `src/utils/audio.ts` 中，引力核心拥有专门调校的合成器函数：

| 音效方法 | 物理声学建模 | 心理映射与触发时机 |
| :--- | :--- | :--- |
| `playGravityBlockSpawn()` | 双正弦波微脉冲（520Hz $\to$ 780Hz）配合带通混响 | 引力核心在棋盘上生成诞生的瞬间；提示玩家“新引信已埋下”。 |
| `playDebrisFracture()` | 高频突发白噪声，通过 2400Hz 带通滤波器急剧衰减 | 5x5 区域积木被震碎解构为 1x1 碎石；提供清脆致密的晶格碎裂质感。 |
| `playGlobalGravityPulse()` | 宏大的低通次声波扫频（180Hz 指数级俯冲至 45Hz） | 全局大雪崩激活时；传达出“天塌地陷、引力常数改变”的宏大震撼。 |
| `playChainedCoreLockAlert()` | 1200Hz 与 1600Hz 快速交替的双音调正弦波脉冲 | 引力星块十字准星扫过引力核心时；释放雷达锁定的战术兴奋信号。 |

---

## 七、代码实现映射索引（Source Code Architecture Mapping）

为了方便工程团队快速追溯代码逻辑，现将当前项目中所有与“引力核心”相关的代码位置整理如下：

| 模块类别 | 源码文件 | 行号/标识符 | 核心职责与逻辑说明 |
| :--- | :--- | :--- | :--- |
| **基础配置与常量** | `/src/constants/pieces.ts` | `GRAVITY_BLOCK_COLOR` (行 83) | 定义引力核心的基础色值标识（`bg-cyan-500`）。 |
| **实体类型标记** | `/src/types.ts` | `PlacedPieceEntity.isGravityBlock` (行 50)<br>`Piece.isGravityBlock` (行 67) | 标识该实体是否具备引力核心属性与引信能力。 |
| **高阶多线生成** | `/src/utils/gameLogic.ts` | `checkAndSpawnGravityBlock` (行 767~830) | 判定双行/双列/十字消除，并在交叉点优先生成 1x1 引力核心。 |
| **奇点固化脱落** | `/src/App.tsx` | `executePlacePiece` (行 415~424) | 引力星块落盘触地时，将底层单元格剥离并固化为引力核心实体。 |
| **消除判定与捕获** | `/src/App.tsx` | `clearedGravityCores` (行 491~495) | 检测当前消除行/列是否击中场上的引力核心。 |
| **5x5 定向震碎** | `/src/utils/gameLogic.ts` | `splitAndTrimCutEntities` (行 273~320) | 将 `shatterCenters` 半径 2 格范围内的方块粉碎为 1x1 碎石。 |
| **大雪崩临界跃迁** | `/src/App.tsx` | `isGlobalGravityUnlocked` (行 514~516) | 判定碎石下落是否引发新消除，确定性解锁全局重力大雪崩。 |
| **十字瞄准连锁检索** | `/src/utils/gameLogic.ts` | `computeSingularityCrosshairPreview` (行 475) | 检索位于十字准星打击轴线上的引力核心。 |
| **5x5 预警虚线框** | `/src/components/Board.tsx` | `chainedGravityCores` 渲染 (行 344~370) | 在瞄准状态下渲染 5x5 范围的紫色脉冲虚线预警场。 |
| **5x5 爆破冲击波** | `/src/components/Board.tsx` | `shatterShockwaveCenters` 渲染 (行 184~209) | 引力核心被引爆时，渲染等离子青色的 5x5 扩散射线与光圈。 |
| **全场大雪崩光波** | `/src/components/Board.tsx` | `isGlobalGravityPulseActive` 渲染 (行 212~220) | 全局重力解锁时，渲染全屏引力脉冲冲击波前。 |
| **曜石等离子青渲染** | `/src/components/ConnectedPiece.tsx` | `isGravityCore` 分支 (行 83~85, 136~152) | 渲染深黑曜石渐变、霓虹青边框与顺时针旋转吸积盘。 |
| **专属合成音效** | `/src/utils/audio.ts` | `playGravityBlockSpawn`<br>`playGlobalGravityPulse`<br>`playDebrisFracture` | Web Audio 纯程序化合成引力核心生成、碎裂与大雪崩音效。 |

---

## 八、总结与机制价值评估

### 8.1 机制价值提炼
**「引力核心」是《摸鱼方块》平衡“策略深度”与“爆发爽感”的最精巧杠杆：**
1. **策略门槛的正向引导**：玩家通过精妙计算打出多线消除获得引力核心，将短期的消除收益转化为长期的战场资产；
2. **两阶段动力学的节奏把控**：
   - 先通过 5x5 局部定向震碎建立悬念；
   - 随之通过碎石下落的确定性临界跃迁激活全场大雪崩；
   - 完美规避了“全屏无脑乱掉”的乏味感与“概率过低无法触发”的挫败感；
3. **视觉与音画的尊贵感**：冷峻高贵的曜石等离子青材质与吸积盘天体视界，赋予了该机制强烈的街机高级感。

### 8.2 归档决议
- 本文档作为任务 024 的核心交付成果，已完整撰写并永久归档于 `/DOC/_024_gravity_core_mechanics_and_architecture_review.md`；
- 本次任务严格执行了**“代码零修改（Zero Code Modification）”**的原则，未引入任何破坏性或污染性代码变更；
- 本文档与 `_023_`（引力星块机制解析）共同构成了《摸鱼方块》引力物理动力学体系的双壁基石，作为后续开发与迭代的最终标准依据。
