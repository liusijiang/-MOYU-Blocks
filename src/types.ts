export type CellColor = string | null;

export type BoardState = CellColor[][];

export interface Piece {
  id: string;
  name: string;
  shape: number[][]; // 1 for filled, 0 for empty
  color: string;
  borderColor: string;
  textColor?: string;
  slotIndex?: number;
  isDebris?: boolean;
  isGravityBlock?: boolean;
  isGravityPrism?: boolean;           // 任务 026/027: 是否为引力折向棱镜
  vectorDirection?: 'left' | 'right';  // 任务 026/027: 横向脉冲推进方向
  isResonancePiece?: boolean;  // 任务 010: 是否被引力共鸣星块赋能
  isKeystone?: boolean;        // 任务 010: 是否为 1x1 稀缺微晶基石
  hasSingularityCore?: boolean; // 任务 016: 标记内部包含奇点发射星核
  coreLocalPos?: { r: number; c: number }; // 任务 016: 星核在局部矩阵中的精确坐标
}

export interface CellBorderInfo {
  hasTop: boolean;
  hasBottom: boolean;
  hasLeft: boolean;
  hasRight: boolean;
  roundedTl: boolean;
  roundedTr: boolean;
  roundedBl: boolean;
  roundedBr: boolean;
}

export interface ActiveDragState {
  piece: Piece;
  slotIndex: number;
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  anchorX: number; // Grab offset from piece top-left
  anchorY: number;
  isTouch: boolean;
}

export interface PreviewPlacement {
  row: number;
  col: number;
  isValid: boolean;
}

export interface EliminationPreview {
  clearingRows: number[];
  clearingCols: number[];
  totalLines: number;
}

export interface EliminationToast {
  id: string;
  title: string;
  scoreBonus: number;
  totalLines: number;
}

export interface PlacedPieceEntity {
  id: string;
  color: string;
  startRow: number;
  startCol: number;
  shape: number[][];
  isDebris?: boolean;
  isGravityBlock?: boolean;
  isGravityPrism?: boolean;           // 任务 026/027: 是否为引力折向棱镜
  vectorDirection?: 'left' | 'right';  // 任务 026/027: 横向脉冲推进方向
  hasStructuralSupport?: boolean;
  dropOffset?: number;
  hasSingularityCore?: boolean;
  coreLocalPos?: { r: number; c: number };
}

// ==========================================
// 任务 016: 引力奇点十字贯穿动态瞄准预览状态接口
// ==========================================

export interface SingularityCrossPreviewState {
  centerRow: number;
  centerCol: number;
  isValidPlacement: boolean;
  beamRow: number;
  beamCol: number;
  targetedBlockCoords: Array<{ row: number; col: number }>;
  chainedGravityCores: Array<{ row: number; col: number; blastRange: number }>;
  estimatedLinesCleared: number;
}

// ==========================================
// 任务 007: 认证、排行榜与云端存档类型定义
// ==========================================

export interface UserProfile {
  id: string;
  username: string;
  securityCode?: string;
  createdAt?: string;
}

export interface ScoreRankContext {
  currentRank: number;
  higherRankScore: number | null;
  deltaToHigher: number;
  topScore: number;
  deltaToTop: number;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  highScore: number;
  achievedAt: string;
}

export interface CloudGameProgress {
  userId: string;
  username: string;
  score: number;
  boardData: (CellColor | null)[][];
  placedPieces: PlacedPieceEntity[];
  currentPieces: (Piece | null)[];
  isGameOver: boolean;
  updatedAt: string;
}

// 任务 018: 音频偏好与自适应 BGM 接口
export interface AudioPreferences {
  masterVolume: number;     // 0.0 ~ 1.0 (默认 1.0)
  bgmVolume: number;        // 0.0 ~ 1.0 (默认 0.6)
  sfxVolume: number;        // 0.0 ~ 1.0 (默认 0.8)
  bgmMuted: boolean;        // 默认 false
  sfxMuted: boolean;        // 默认 false
  spatialPannerEnabled: boolean; // 空间声相开关 (默认 true)
  reverbEnabled: boolean;   // 空间微混响开关 (默认 true)
}

export interface BGMRuntimeState {
  isPlaying: boolean;
  bpm: number;
  currentChordIndex: number;
  layer1PadGain: number;
  layer2ArpGain: number;
  layer3ShimmerGain: number;
  layer4FeverGain: number;
}


