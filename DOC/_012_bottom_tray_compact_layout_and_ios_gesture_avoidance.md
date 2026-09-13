# 任务 012：移动端底部候选区防误触上移与全局紧凑界面重构方案

- **文档编号**: `_012_`
- **需求名称**: 底部候选积木区上移紧凑化布局与移动端全面屏手势防误触设计
- **关联文档**: `_001_candidate_and_interaction_improvements.md`、`_006_codebase_inspection_and_design_review.md`、`_011_gravity_core_5x5_cascade_and_visual_redesign.md`
- **创建时间**: 2026-09-13
- **当前状态**: 📝 **需求分析、实现思路推演与编码计划编制完成（遵循明确指令：本阶段严禁修改任何业务代码）**

---

## 一、创建任务 (Task Overview)

### 1.1 任务目标与背景
用户在移动设备（尤其是 iPhone 等全面屏智能手机）上游玩《摸鱼方块》时，反馈了一个严重的体验与操作可用性痛点：
> **用户诉求**：“在下方的三个候选区的积木太靠近下方，容易触发 iphone 和手机切换 app 手势。将 UI 尽可能地向上紧凑靠近布局调整。在 DOC 文件夹下 012 开头的文档，包含：创建任务，需求分析，实现思路，编码计划。不要修改代码。”

### 1.2 核心目标定义
1. **彻底规避系统级切换手势冲突**：消除用户手指在候选区触摸、选取、拖拽积木时频繁触发 iPhone 底部横条（Home Indicator）或 Android 全面屏手势导致的“意外切换 App”或“退回主屏幕”现象。
2. **全局 UI 纵向紧凑收拢**：系统化重构页面垂直方向（Vertical Axis）的空间预算分配，通过紧缩顶部 Header、缩减微小组件冗余 Margin、优化候选槽位尺寸，将整个操作核心向上推移，为底部腾出一条宽裕的“防误触安全护城河”（Bottom Safe Zone）。
3. **严格保证棋盘与交互品质不变**：在整体向上紧凑收拢的过程中，保持 10x10 棋盘的物理像素绝对固定（无抖动、无变形、无模糊），维持清晰舒适的触控热区（Target Size ≥ 44px）与高灵敏度跟手手感。
4. **恪守约束规范**：本任务仅在 DOC 目录下输出规范的规划与分析文档，绝不擅自更改任何前端业务代码。

---

## 二、需求分析 (Detailed Requirements Analysis)

### 2.1 物理机理与系统层手势竞争分析 (iOS / Android Gesture Collisions)

在现代全面屏手机人机交互体系中（以 iPhone X 及以上机型、iOS 14+ 以及 Android 10+ 手势导航为例）：
- **系统保留热区（Home Gesture Guard Zone）**：
  屏幕底部物理边缘向内约 **34px ~ 44px**（iOS Home Indicator 区域）由操作系统直接监听。此区域内的触控行为具备极高优先级：
  1. **向上微划 / 快划**：触发回到桌面（Go to Home）；
  2. **水平左右划动**：在最近使用的多任务 App 之间循环快速切换（Fast App Switcher）；
  3. **上划并停顿**：呼出多任务后台卡片列表（App Switcher Overview）。
- **玩家实际操作行为**：
  玩家在玩三选一放置消除游戏时，通常单手或双手拇指操作。当拇指落入屏幕最下方的 3 个候选卡槽并向斜上方或上方拖动积木时，手指启动点几乎贴紧屏幕物理底部，第一时间的 `touchmove` 矢量与系统“返回桌面”或“切换应用”判定弧度高度重叠，导致手机系统直接抢占触控事件，造成游戏被强制退入后台或横切至其他应用，严重破坏对局心流。

### 2.2 现有代码空间预算深度诊断 (Vertical Height Budget Breakdown)

我们以目前最普遍的移动端视口（如 iPhone 14/15/16 标准屏：逻辑分辨率 390px × 844px，去掉 Safari 顶部状态栏与底部工具栏后，实际常态动态视口高度约为 **720px ~ 780px**）进行严格的垂直高度核算：

| UI 模块区域 | 当前对应代码节点 | 当前占用高度与间距 | 存在的空间冗余与缺陷分析 |
| :--- | :--- | :--- | :--- |
| **视口与根容器** | `index.html` & `App.tsx` 中的 `#game-root` | `min-h-screen`, `justify-between`, `p-3` | 1. 采用 `min-h-screen` (基于 `100vh`) 而非动态视口 `100dvh`，iOS Safari 工具栏展开时会产生隐性纵向滚动；<br>2. `justify-between` 弹性布局机制会将空白均分，硬生生把 Footer 顶到视口绝对边缘；<br>3. `index.html` 缺少 `viewport-fit=cover` 声明，导致安全区环境变量失效。 |
| **顶部 Header 导航** | `App.tsx` `<header>` | 标题栏 (约 40px) + 分数栏双大卡片 (约 48px) + `RankStatusBar` (`my-2 py-2`, 约 46px) + `gap-2.5` | 累计高度高达 **145px ~ 160px**！在移动端占用了过多的垂直纵深，是导致下方各层级被严重下压的元凶。 |
| **棋盘核心区域** | `App.tsx` `<main>` | `my-auto` + `ComboBadge` (`mb-2 min-h-[28px]`) + Board Frame (`320px`) + `ResonanceBar` (`mt-2 mb-1`) | 累计高度约 **380px**。其中 `my-auto` 会在垂直方向自动吃掉中间空隙，加剧顶部与底部的两极挤压。 |
| **底部候选区 Footer** | `App.tsx` `<footer>` & `PieceTray.tsx` | 引导文案 (约 20px) + Tray 外边距 (`mt-4`, 16px) + 槽位尺寸 (`w-24 h-24`, 即 96px) | 累计高度约 **135px**。且因外部容器 `p-3` (12px)，候选卡槽距离屏幕物理底边仅有区区 **12px**！完全处于 34px~44px 的系统手势高危触发区域中。 |

**当前总高度预算**：
$$155\text{px (Header)} + 380\text{px (Main)} + 135\text{px (Footer)} + 24\text{px (Padding)} = 694\text{px} \approx 700\text{px}$$
在 720px 的可用视口中，剩余的冗余仅仅是 20px。由于 `justify-between` 将它平均拉开，候选槽底端与物理屏底边界近乎**贴脸相撞**。

### 2.3 需求核心指标与验收准则
1. **安全区护城河指标**：在移动端竖屏模式下，候选积木卡槽底部距离手机屏幕物理底边的绝对垂直间距必须提升至 **≥ 32px ~ 48px**（包含 `env(safe-area-inset-bottom)`）。
2. **全局向上收拢指标**：
   - Header 垂直总高度从 ~155px 压缩至 **≤ 100px**（节省约 55px）；
   - Board 周围微型挂件 Margin 压缩（节省约 15px）；
   - 候选区自身从 `mt-4` 紧凑至 `mt-1`，槽位高度微调（节省约 20px）；
   - 累计释放垂直空间 **≥ 90px**，全部作为底部防误触缓冲与舒适视觉留白。
3. **触控与手势免疫指标**：
   - 候选区全面注入 `touch-action: none`；
   - 拖拽过程严格使用 Pointer Capture 锁定，防止中途丢失；
   - 保留起手 50px 纵向浮空偏移，彻底杜绝下边缘误触。

---

## 三、实现思路 (Architectural Solutions & Engineering Design)

为了在不牺牲任何视觉品质与可玩性的前提下完成“向上紧凑靠拢”，提出**四大协同重构策略**：

```
┌────────────────────────────────────────────────────────┐
│ 1. 视口契约修正: 100dvh + viewport-fit=cover + 底部物理垫高 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. 顶部 Header 模块瘦身: 扁平紧凑徽章化 + 紧凑 Rank 状态栏 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. 棋盘中枢微调: 消除弹性 my-auto，使用紧凑受控 gap-1.5   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. 候选区上提与卡槽精致化: 82px 紧凑槽位 + 物理安全下外边距 │
└────────────────────────────────────────────────────────┘
```

### 3.1 策略一：视口契约与根容器布局重组 (Viewport Contract & Flex Restructure)

1. **Meta 标签增强 (`index.html`)**：
   - 修改 `<meta name="viewport" ...>`：
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
     ```
   - 作用：`viewport-fit=cover` 激活 CSS 环境函数 `env(safe-area-inset-*)`，`user-scalable=no` 彻底禁止移动端偶发的双击放大与视口晃动。
2. **根容器容器约束 (`#game-root`)**：
   - **废弃**：`min-h-screen justify-between p-3`
   - **重构为**：
     ```tsx
     <div
       id="game-root"
       className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-1.5 sm:gap-3 select-none overflow-hidden touch-none"
     >
     ```
   - **核心优势**：
     - `h-[100dvh]`: 精准匹配当前屏幕动态可用高度，自动减去地址栏变化；
     - `justify-start`: 整体布局从顶部开始自然紧凑向下排列，而不是把子元素强行弹到屏幕四角边缘；
     - `pb-[max(1.5rem,env(safe-area-inset-bottom))]`: 强制在最底部构建一道保底 24px、最高适配刘海屏手势条的**“防误触禁区”**。

### 3.2 策略二：Header 顶部信息看板紧凑化设计 (Header Compaction)

当前 Header 占据了约 155px 高度，是占用纵向空间最庞大的模块。我们通过“信息层级合并”与“紧凑排布”进行瘦身：

1. **标题栏与功能按钮行 (Title & Actions)**：
   - 移动端标题字号由 `text-xl` 调整为 `text-lg`，小巧精致；
   - 登录、音效、重置按钮的内边距由 `px-2.5 py-1.5` 优化为 `px-2 py-1`，保持高质感同时降低高度。
2. **得分看板 (Score Counters)**：
   - 由原先的纵深厚重卡片 `py-2` 紧缩为 `py-1 px-3`，字号保持 `text-base sm:text-lg`；
   - 将行内上下外边距去除，高度由 48px 下降至 34px。
3. **全服排位看板 (`RankStatusBar`)**：
   - 外层由 `my-2 px-3 py-2` 重构为 `my-0.5 sm:my-1 px-2.5 py-1`；
   - 图标由 `w-3.5 h-3.5` 精准适配，行高降至单行紧凑模式；
   - 整体高度从 46px 压缩至 30px。

> **小结**：整个 Header 垂直占用从 **155px** 直降至 **~95px**，立省 **60px** 宝贵纵向高度！

### 3.3 策略三：中枢棋盘区与挂件微间隙控制 (Board & Gadgets Tightening)

1. **解绑弹性浮动**：
   - 移除 `<main>` 上的 `my-auto`，改用外层根容器统一的受控间距（如 `gap-1 sm:gap-2`），杜绝因屏幕尺寸变动而突发性将下方元素顶向底边。
2. **连击指示徽章 (`ComboBadge`)**：
   - 外层占位容器由 `mb-2 min-h-[28px]` 微调为 `mb-0.5 min-h-[22px]`，在不触发连击时紧缩占位，连击浮现时以微型发光胶囊展示。
3. **引力共鸣蓄能条 (`ResonanceBar`)**：
   - 容器外边距由 `mt-2 mb-1` 缩减为 `mt-1 mb-0.5`；
   - 轨道高度保持 4px 纳米级发光微导轨，既有科技感又不占用屏幕层高。
4. **棋盘物理稳定性保障**：
   - 移动端维持标准精确单元格：`cellPixelSize = 30px`，10x10 网格严格为 300px × 300px；
   - 外框边距微调：由 `p-2` 维持 `w-[316px] h-[316px]`，绝对不缩小棋盘格子，确保玩家落子点击的物理精度与舒适度。

### 3.4 策略四：候选区 (PieceTray) 全面上移与防误触卡槽设计

这是本任务最关键的交付阵地：

1. **消除冗余 Top Margin**：
   - `PieceTray` 容器上原有的 `mt-4`（16px）直接移至 `mt-0.5 sm:mt-1`；
   - 提示文案由 `mb-1 text-xs` 简化或与托盘更紧密贴合。
2. **卡槽物理尺寸优化 (Slot Dimension Refinement)**：
   - **原尺寸**：移动端 `w-24 h-24`（96px × 96px）；
   - **优化尺寸**：移动端微调至 `w-[82px] h-[82px]` 或 `w-[84px] h-[84px]`，中大屏保持 `sm:w-32 sm:h-32`（128px）；
   - **尺寸合理性佐证**：
     - 人机交互标准（Apple HIG / Material Design）建议主要可点击控件尺寸为 44px~48px；
     - 84px 是该标准的近 **2 倍**，完全保留了极其充裕的点击与按压热区；
     - 同时，内部积木渲染尺寸通过 `ConnectedPiece` 的 `cellSize={14}`（原 16px）与 `scale-90` 完美适配，积木的几何线条与发光外轮廓依然极其精致清晰；
     - 槽位高度减小 12px，加上托盘上移，让整体视觉焦点向上挪移了 30px 以上。
3. **触控手势防拦截强化 (Touch Action & Event Shield)**：
   - 卡槽与外框容器明确添加 `touch-none` (`touch-action: none`)；
   - 阻止移动端默认的长按呼出菜单行为（`-webkit-touch-callout: none`）；
   - 保持触控拖拽时的起手 Y 轴抬升：
     $$\text{anchorY} = \text{isTouch} \ ? \ (\text{pieceHeight} + 50) : (\text{pieceHeight} / 2)$$
     玩家手指在卡槽按下时，积木立即向上悬浮 50px，完全离开手指遮挡并向棋盘快速靠拢，进一步拉大与屏幕底部的有效距离。

---

## 四、空间压缩对比与几何推演数据

通过上述设计重构前后，在 780px 典型视口高度下的对比分析表：

```
【修改前：底部紧贴边缘，频触手势】             【修改后：UI整体上提，底部宽裕安全】
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│  Header (高 ~155px)                  │     │  Header 紧凑化 (高 ~95px)            │ ▲ 压缩 60px
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│  Main (Board + 挂件, 高 ~380px)      │     │  Main 棋盘核心 (高 ~355px)           │ ▲ 压缩 25px
│  [通过 my-auto 肆意伸展]             │     │  [严格受控小间距]                    │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│  Tray 候选区 (高 ~135px)             │     │  Tray 候选区 (高 ~105px, 84px槽位)   │ ▲ 压缩 30px
│  [mt-4 强力下推]                     │     │  [整体大幅上提]                      │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│  ⚠️ 距屏幕底边仅 12px (极易误触退出)  │     │  🛡️ 底部安全护城河: 45px ~ 60px 留白   │ 🟢 安全防误触
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

**空间收益小结**：
- 顶部 Header 节约：~60px
- 中部 Main 挂件节约：~25px
- 候选区自身上提与尺寸节约：~30px
- **累计上提总量**：**~115px**！
- 最终结果：候选槽位底部距离屏幕下沿从原先危险的 **12px** 彻底跃升至 **45px ~ 65px**（自动叠加 `env(safe-area-inset-bottom)`），从根本上移出了系统的手势判定敏感带。

---

## 五、详细编码计划 (Detailed Coding Plan)

> **前置特别声明**：根据用户本次指令：“在 DOC 文件夹下 012 开头的文档，包含：创建任务，需求分析，实现思路，编码计划。**不要修改代码**。”
> 本编码计划仅作为后续实施阶段的标准操作指南（SOP），明确具体待修改文件、代码行级改动方案与验证流程，本阶段暂不执行代码修改。

### 5.1 第一阶段：视口元配置与根容器样式适配

#### 步骤 1.1：`index.html` 视口配置增强
- **文件路径**: `/index.html`
- **修改内容**:
  ```html
  <!-- 原代码 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- 计划修改为 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  ```
- **目的**: 支持安全区 inset 变量，消除非受控双击放大。

#### 步骤 1.2：`src/App.tsx` 根容器 `#game-root` 重构
- **文件路径**: `/src/App.tsx`（约第 852~857 行）
- **修改内容**:
  - 原代码：
    ```tsx
    <div
      id="game-root"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-3 sm:p-6 select-none overflow-hidden"
    >
    ```
  - 计划修改为：
    ```tsx
    <div
      id="game-root"
      className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] gap-1 sm:gap-2.5 select-none overflow-hidden touch-none"
    >
    ```

### 5.2 第二阶段：Header 信息看板精简与紧凑排布

#### 步骤 2.1：Header 容器与标题功能行精简
- **文件路径**: `/src/App.tsx`（约第 858~930 行）
- **修改内容**:
  - `<header className="w-full max-w-md flex flex-col gap-1.5 sm:gap-2.5">`
  - 标题字号调整为：`text-lg sm:text-2xl`
  - 按钮尺寸调整为：`px-2 py-1 sm:px-2.5 sm:py-1.5`

#### 步骤 2.2：得分看板高度压缩
- **文件路径**: `/src/App.tsx`（约第 933~955 行）
- **修改内容**:
  - 分数卡片容器调整：`px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl`
  - 分数字号调整：`text-base sm:text-lg`

#### 步骤 2.3：`RankStatusBar` 组件内边距与外间距优化
- **文件路径**: `/src/components/RankStatusBar.tsx`（约第 24~28 行）
- **修改内容**:
  - 容器样式由 `my-2 px-3 py-2` 调整为：
    ```tsx
    className="w-full max-w-md mx-auto my-0.5 sm:my-2 px-2.5 py-1 sm:py-2 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-lg sm:rounded-xl backdrop-blur-md shadow-md cursor-pointer transition-all duration-200 group flex items-center justify-between text-xs"
    ```

### 5.3 第三阶段：棋盘中枢与连击挂件紧凑化

#### 步骤 3.1：消除 `<main>` 的 `my-auto` 弹性间距
- **文件路径**: `/src/App.tsx`（约第 966 行）
- **修改内容**:
  - 原代码：`<main className="relative my-auto flex flex-col items-center justify-center">`
  - 计划修改为：`<main className="relative flex flex-col items-center justify-center">`

#### 步骤 3.2：压缩 `ComboBadge` 与 `ResonanceBar` 外边距
- **文件路径**: `/src/App.tsx` & `/src/components/ResonanceBar.tsx`
- **修改内容**:
  - ComboBadge 外层容器：`mb-0.5 min-h-[22px] sm:min-h-[28px]`
  - ResonanceBar 容器：`mt-1 mb-0.5 px-3`，确保高科技能量条紧凑吸附在棋盘底沿。

### 5.4 第四阶段：候选托盘上提与卡槽精致化

#### 步骤 4.1：Footer 与文案上提
- **文件路径**: `/src/App.tsx`（约第 1043~1064 行）
- **修改内容**:
  - 移除大空隙，文案文字紧缩：`text-[11px] sm:text-xs text-slate-400 mb-0.5 sm:mb-1`

#### 步骤 4.2：`PieceTray.tsx` 槽位尺寸微调与触控属性
- **文件路径**: `/src/components/PieceTray.tsx`（约第 34~124 行）
- **修改内容**:
  - 托盘容器外边距：从 `mt-4` 修改为 `mt-0.5 sm:mt-3`，彻底紧贴提示语；
  - 槽位宽高调整：
    ```tsx
    // 原代码
    className="... w-24 h-24 sm:w-32 sm:h-32 ..."

    // 计划修改为
    className="... w-[82px] h-[82px] sm:w-32 sm:h-32 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl ..."
    ```
  - 空槽位（empty-slot）保持同等宽高：`w-[82px] h-[82px] sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl`；
  - 内部积木渲染尺寸：
    ```tsx
    <ConnectedPiece
      piece={piece}
      cellSize={14}
      className="scale-90 sm:scale-100 transition-transform"
    />
    ```
  - 额外保障：在卡槽元素显式声明 `touch-none`，配合 Pointer Events 保证手势不被系统抢占。

### 5.5 第五阶段：跨设备分辨率回归与防误触验证计划

在后续进入代码实施后，需针对以下 4 类典型移动端视口进行像素级测试与验收：

1. **极端小屏设备 (Small-Screen Mobile)**：
   - 仿真目标：iPhone SE 2/3 (375px × 667px)
   - 验证重点：所有内容能否在 667px 视口内单屏完整呈现，无任何滚动条，底部留白是否仍保持 ≥ 20px。
2. **主流全面屏设备 (Standard Modern Notch/Dynamic Island)**：
   - 仿真目标：iPhone 13/14/15/16 Pro (390px/393px × 844px/852px)
   - 验证重点：底部 Home Indicator 区域上方是否有宽敞纯黑背景留白，手指在任意 3 个候选槽位进行按下和快速划动拖拽时，**100% 不触发** iOS 底部切换应用手势。
3. **长屏 Android 设备 (Tall Aspect Ratio)**：
   - 仿真目标：Samsung Galaxy / Google Pixel (393px × 873px ~ 915px)
   - 验证重点：整体 UI 在长屏下是否自然居中上收，不会由于拉伸产生松散感。
4. **桌面端与平板大屏 (Desktop & Tablet)**：
   - 仿真目标：iPad Mini / 桌面浏览器 (768px 及以上)
   - 验证重点：`sm:` 响应式断点自动生效，棋盘与候选区恢复宽敞大气的大槽位与大间距，交互一如既往流畅。

---

## 六、方案总结与当前进展

本设计方案全面解构了当前布局在移动端容易误触 iOS/Android 全面屏 App 切换手势的底层成因，并通过**动态视口定义 (`100dvh`)、顶部 Header 结构瘦身、棋盘挂件间隙压缩、候选区卡槽尺寸微调以及底部强制安全留白**，系统性地将游戏交互核心上提逾 **115px**。

目前设计文档已正式收录于 `/DOC/_012_bottom_tray_compact_layout_and_ios_gesture_avoidance.md`。严格遵循用户要求，**本轮未对任何业务代码做任何修改**，待用户审阅评估并下发编码指令后，即可精准推进实施。
