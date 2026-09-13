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
  isResonancePiece?: boolean;  // 任务 010: 是否被引力共鸣星块赋能
  isKeystone?: boolean;        // 任务 010: 是否为 1x1 稀缺微晶基石
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


