import React from 'react';
import {
  BoardState,
  Piece,
  PreviewPlacement,
  EliminationPreview,
  PlacedPieceEntity,
  SingularityCrossPreviewState,
} from '../types';
import { canPlacePiece } from '../utils/gameLogic';
import { ConnectedPiece } from './ConnectedPiece';
import { GRAVITY_KINETICS_CONFIG } from '../constants/physicsAudioConfig';
import { Crosshair } from 'lucide-react';

interface BoardProps {
  board: BoardState;
  placedPieces: PlacedPieceEntity[];
  selectedPiece: Piece | null;
  activeDragPiece?: Piece | null;
  previewPlacement: PreviewPlacement | null;
  simulatedClears?: EliminationPreview | null;
  onPlacePiece: (row: number, col: number) => void;
  onCellHover?: (pos: { row: number; col: number } | null) => void;
  clearingRows: number[];
  clearingCols: number[];
  boardRef: React.RefObject<HTMLDivElement | null>;
  cellPixelSize: number;
  isGlobalGravityPulseActive?: boolean;
  shatterShockwaveCenters?: Array<{ row: number; col: number }>;
  singularityBlastCenter?: { row: number; col: number } | null;
  singularityCrossPreview?: SingularityCrossPreviewState | null;
  fallDuration?: number;
  isFeverMode?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  board,
  placedPieces,
  selectedPiece,
  activeDragPiece,
  previewPlacement,
  simulatedClears,
  onPlacePiece,
  onCellHover,
  clearingRows,
  clearingCols,
  boardRef,
  cellPixelSize,
  isGlobalGravityPulseActive = false,
  shatterShockwaveCenters = [],
  singularityBlastCenter = null,
  singularityCrossPreview = null,
  fallDuration = 240,
  isFeverMode = false,
}) => {
  const activePieceForPreview = activeDragPiece || selectedPiece;

  // Check click-to-place fallback
  const handleCellClick = (r: number, c: number) => {
    if (!selectedPiece) return;
    if (canPlacePiece(board, selectedPiece, r, c)) {
      onPlacePiece(r, c);
      onCellHover?.(null);
    }
  };

  return (
    <div
      id="game-board-container"
      className="relative flex flex-col items-center select-none"
      onMouseLeave={() => onCellHover?.(null)}
    >
      {/* Adaptive outer frame: hugs the playable 10x10 grid dynamically with zero dead margins */}
      <div
        id="game-board-frame"
        className={`w-fit h-fit p-1.5 sm:p-2.5 bg-slate-900/95 rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 box-border flex items-center justify-center overflow-hidden ${
          isFeverMode
            ? 'border-2 border-amber-400/90 ring-4 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
            : 'border-2 border-slate-700/80'
        }`}
      >
        {/* Playable 10x10 Grid (Zero gap, exact cell pixel matching) */}
        <div
          ref={boardRef}
          id="game-board"
          className="relative box-border rounded-lg overflow-hidden bg-slate-950/80 border border-slate-800/80"
          style={{
            width: `${cellPixelSize * 10}px`,
            height: `${cellPixelSize * 10}px`,
          }}
        >
          {/* 1. Base Grid Layer: 100 interaction slots */}
          <div
            className="grid grid-cols-10 grid-rows-10 w-full h-full gap-0 select-none"
            style={{
              gridTemplateColumns: `repeat(10, ${cellPixelSize}px)`,
              gridTemplateRows: `repeat(10, ${cellPixelSize}px)`,
            }}
          >
            {board.map((row, r) =>
              row.map((_, c) => {
                const isClearing =
                  clearingRows.includes(r) || clearingCols.includes(c);
                const isSimulatedClear =
                  Boolean(simulatedClears) &&
                  Boolean(
                    simulatedClears?.clearingRows.includes(r) ||
                      simulatedClears?.clearingCols.includes(c)
                  );

                let slotStyle =
                  'bg-slate-900/60 border border-slate-800/60 box-border';

                // Pre-placement elimination hint on empty slots
                if (isSimulatedClear && previewPlacement?.isValid) {
                  slotStyle +=
                    ' bg-amber-400/20 ring-1 ring-amber-300/60 ring-inset';
                }

                if (isClearing) {
                  slotStyle =
                    'bg-white brightness-200 shadow-md shadow-white/80 transition-colors duration-200';
                }

                return (
                  <button
                    key={`${r}-${c}`}
                    id={`cell-${r}-${c}`}
                    type="button"
                    style={{ width: cellPixelSize, height: cellPixelSize }}
                    className={`flex items-center justify-center cursor-pointer box-border p-0 m-0 ${slotStyle}`}
                    onMouseEnter={() => {
                      if (activePieceForPreview) {
                        onCellHover?.({ row: r, col: c });
                      }
                    }}
                    onClick={() => handleCellClick(r, c)}
                    aria-label={`棋盘格子 (${r + 1}, ${c + 1})`}
                  />
                );
              })
            )}
          </div>

          {/* 2. Placed Entities Layer: ConnectedPiece components retain 100% style consistency with candidate tray */}
          {placedPieces.map((entity) => (
            <div
              key={entity.id}
              className="absolute pointer-events-none z-10 will-change-[top,left]"
              style={{
                top: `${entity.startRow * cellPixelSize}px`,
                left: `${entity.startCol * cellPixelSize}px`,
                transition: `top ${fallDuration}ms ${GRAVITY_KINETICS_CONFIG.easingCurve}, left ${GRAVITY_KINETICS_CONFIG.lateralImpulseDurationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`,
              }}
            >
              <ConnectedPiece
                piece={{
                  id: entity.id,
                  name: '',
                  color: entity.color,
                  borderColor: '',
                  shape: entity.shape,
                  isDebris: entity.isDebris,
                  isGravityBlock: entity.isGravityBlock,
                  isGravityPrism: entity.isGravityPrism,
                  vectorDirection: entity.vectorDirection,
                }}
                cellSize={cellPixelSize}
                isCellClearing={(pr, pc) =>
                  clearingRows.includes(entity.startRow + pr) ||
                  clearingCols.includes(entity.startCol + pc)
                }
                isCellHinted={(pr, pc) =>
                  Boolean(
                    simulatedClears &&
                      previewPlacement?.isValid &&
                      (simulatedClears.clearingRows.includes(entity.startRow + pr) ||
                        simulatedClears.clearingCols.includes(entity.startCol + pc))
                  )
                }
              />
            </div>
          ))}

          {/* 2.5 5x5 Shatter Shockwave Overlays */}
          {shatterShockwaveCenters && shatterShockwaveCenters.length > 0 && (
            <div
              id="shatter-shockwave-overlay"
              className="absolute inset-0 pointer-events-none z-25 overflow-hidden"
            >
              {shatterShockwaveCenters.map((sc, idx) => {
                const minR = Math.max(0, sc.row - 2);
                const maxR = Math.min(9, sc.row + 2);
                const minC = Math.max(0, sc.col - 2);
                const maxC = Math.min(9, sc.col + 2);
                const width = (maxC - minC + 1) * cellPixelSize;
                const height = (maxR - minR + 1) * cellPixelSize;
                const top = minR * cellPixelSize;
                const left = minC * cellPixelSize;

                return (
                  <div key={`shockwave-${idx}-${sc.row}-${sc.col}`} className="absolute" style={{ top, left, width, height }}>
                    {/* Expanding shockwave burst - GPU 纯边框加速 */}
                    <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/90 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.7)] animate-ping" />
                    {/* 5x5 Shatter Highlight Aura - 彻底剔除 backdrop-filter */}
                    <div className="absolute inset-0 rounded-xl border border-cyan-300 ring-1 ring-cyan-400/80 bg-cyan-950/60 shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-pulse" />
                  </div>
                );
              })}
            </div>
          )}

          {/* 2.6 Global Gravity Shockwave Wavefront - 轻量化 GPU 光波 */}
          {isGlobalGravityPulseActive && (
            <div
              id="gravity-shockwave"
              className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center overflow-hidden"
            >
              <div className="w-full h-full rounded-lg border-2 border-cyan-400/90 shadow-[0_0_16px_rgba(6,182,212,0.8)] animate-ping opacity-85" />
              <div className="absolute w-44 h-44 rounded-full bg-radial from-cyan-400/30 via-cyan-500/10 to-transparent opacity-80 animate-pulse" />
            </div>
          )}

          {/* 2.7 任务 013/014: 奇点十字贯穿爆破高能等离子光幕 (Singularity Cross Plasma Burst) */}
          {singularityBlastCenter && (
            <div
              id="singularity-cross-overlay"
              className="absolute inset-0 pointer-events-none z-26 overflow-hidden"
            >
              {/* 横向高能激光束 */}
              <div
                className="absolute left-0 right-0 bg-gradient-to-r from-amber-500/10 via-amber-300 to-amber-500/10 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse"
                style={{
                  top: `${singularityBlastCenter.row * cellPixelSize}px`,
                  height: `${cellPixelSize}px`,
                  borderTop: '2px solid rgba(251, 191, 36, 0.9)',
                  borderBottom: '2px solid rgba(251, 191, 36, 0.9)',
                  backgroundColor: 'rgba(245, 158, 11, 0.35)',
                }}
              />
              {/* 纵向高能激光束 */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-b from-amber-500/10 via-amber-300 to-amber-500/10 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse"
                style={{
                  left: `${singularityBlastCenter.col * cellPixelSize}px`,
                  width: `${cellPixelSize}px`,
                  borderLeft: '2px solid rgba(251, 191, 36, 0.9)',
                  borderRight: '2px solid rgba(251, 191, 36, 0.9)',
                  backgroundColor: 'rgba(245, 158, 11, 0.35)',
                }}
              />
              {/* 奇点中心坍缩星核爆破微粒 */}
              <div
                className="absolute rounded-full bg-white shadow-[0_0_40px_rgba(251,191,36,1)] ring-4 ring-amber-300/80 animate-ping"
                style={{
                  top: `${singularityBlastCenter.row * cellPixelSize}px`,
                  left: `${singularityBlastCenter.col * cellPixelSize}px`,
                  width: `${cellPixelSize}px`,
                  height: `${cellPixelSize}px`,
                }}
              />
            </div>
          )}

          {/* 2.8 任务 016: 引力奇点十字爆破动态瞄准准星与预警系统 (Dynamic Singularity Crosshair HUD) */}
          {singularityCrossPreview && (
            <div
              id="singularity-crosshair-hud"
              className="absolute inset-0 pointer-events-none z-24 overflow-hidden"
            >
              {/* Layer 20: 目标方块晶格消解态预览 (iOS Safari GPU 硬件加速轻量化优化) */}
              {singularityCrossPreview.isValidPlacement &&
                singularityCrossPreview.targetedBlockCoords.map((coord) => (
                  <div
                    key={`annihilate-${coord.row}-${coord.col}`}
                    className="absolute box-border rounded-xs border border-amber-300/90 bg-amber-400/30 flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-75"
                    style={{
                      top: `${coord.row * cellPixelSize}px`,
                      left: `${coord.col * cellPixelSize}px`,
                      width: `${cellPixelSize}px`,
                      height: `${cellPixelSize}px`,
                    }}
                  >
                    {/* 静态高亮激光消解十字点，彻底移除导致 WebKit 崩溃掉帧的 backdrop-filter 与嵌套 animate-ping */}
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-100 ring-1 ring-amber-300 shadow-[0_0_4px_#fde047]" />
                  </div>
                ))}

              {/* Layer 24: 连锁引力方块 5x5 裂变预警场 (Chained 5x5 Shockwave Preview) */}
              {singularityCrossPreview.isValidPlacement &&
                singularityCrossPreview.chainedGravityCores.map((core, idx) => {
                  const minR = Math.max(0, core.row - 2);
                  const maxR = Math.min(9, core.row + 2);
                  const minC = Math.max(0, core.col - 2);
                  const maxC = Math.min(9, core.col + 2);
                  const width = (maxC - minC + 1) * cellPixelSize;
                  const height = (maxR - minR + 1) * cellPixelSize;
                  const top = minR * cellPixelSize;
                  const left = minC * cellPixelSize;

                  return (
                    <div
                      key={`chained-core-warn-${idx}-${core.row}-${core.col}`}
                      className="absolute border-2 border-dashed border-purple-400/90 bg-purple-950/25 rounded-xl shadow-[0_0_25px_rgba(168,85,247,0.7)] animate-pulse flex items-center justify-center"
                      style={{ top, left, width, height }}
                    >
                      <div className="w-24 h-24 rounded-full border border-purple-300/60 animate-ping opacity-60" />
                    </div>
                  );
                })}

              {/* Layer 28: 横向等离子瞄准光束 */}
              <div
                className={`absolute left-0 right-0 transition-all duration-75 flex items-center justify-center ${
                  singularityCrossPreview.isValidPlacement
                    ? 'border-y border-amber-300/90 bg-amber-400/25 shadow-[0_0_20px_rgba(245,158,11,0.85)]'
                    : 'border-y border-dashed border-rose-500/50 bg-rose-500/10'
                }`}
                style={{
                  top: `${singularityCrossPreview.beamRow * cellPixelSize}px`,
                  height: `${cellPixelSize}px`,
                }}
              >
                {singularityCrossPreview.isValidPlacement && (
                  <div className="w-full h-0.5 bg-white/90 shadow-[0_0_8px_#ffffff]" />
                )}
              </div>

              {/* Layer 28: 纵向等离子瞄准光束 */}
              <div
                className={`absolute top-0 bottom-0 transition-all duration-75 flex items-center justify-center ${
                  singularityCrossPreview.isValidPlacement
                    ? 'border-x border-amber-300/90 bg-amber-400/25 shadow-[0_0_20px_rgba(245,158,11,0.85)]'
                    : 'border-x border-dashed border-rose-500/50 bg-rose-500/10'
                }`}
                style={{
                  left: `${singularityCrossPreview.beamCol * cellPixelSize}px`,
                  width: `${cellPixelSize}px`,
                }}
              >
                {singularityCrossPreview.isValidPlacement && (
                  <div className="h-full w-0.5 bg-white/90 shadow-[0_0_8px_#ffffff]" />
                )}
              </div>

              {/* Layer 28: 交叉发射源中心高能旋转准星 (Core Reticle) */}
              <div
                className="absolute flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{
                  top: `${singularityCrossPreview.centerRow * cellPixelSize}px`,
                  left: `${singularityCrossPreview.centerCol * cellPixelSize}px`,
                  width: `${cellPixelSize}px`,
                  height: `${cellPixelSize}px`,
                }}
              >
                {/* 旋转准星标 */}
                <div
                  className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center animate-spin ${
                    singularityCrossPreview.isValidPlacement
                      ? 'border-amber-300 bg-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.9)]'
                      : 'border-rose-400/60 bg-rose-500/20'
                  }`}
                  style={{ animationDuration: '4s' }}
                >
                  <Crosshair
                    className={`w-6 h-6 ${
                      singularityCrossPreview.isValidPlacement
                        ? 'text-amber-100 drop-shadow-[0_0_4px_#fef08a]'
                        : 'text-rose-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Ghost Placement Preview Layer (ConnectedPiece directly projected on board) */}
          {previewPlacement && activePieceForPreview && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                top: `${previewPlacement.row * cellPixelSize}px`,
                left: `${previewPlacement.col * cellPixelSize}px`,
              }}
            >
              <ConnectedPiece
                piece={activePieceForPreview}
                cellSize={cellPixelSize}
                isGhost={true}
                isValid={previewPlacement.isValid}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

