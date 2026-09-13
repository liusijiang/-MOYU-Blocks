import React from 'react';
import {
  BoardState,
  Piece,
  PreviewPlacement,
  EliminationPreview,
  EliminationToast,
  PlacedPieceEntity,
} from '../types';
import { canPlacePiece } from '../utils/gameLogic';
import { ConnectedPiece } from './ConnectedPiece';
import { GRAVITY_KINETICS_CONFIG } from '../constants/physicsAudioConfig';

interface BoardProps {
  board: BoardState;
  placedPieces: PlacedPieceEntity[];
  selectedPiece: Piece | null;
  activeDragPiece?: Piece | null;
  previewPlacement: PreviewPlacement | null;
  simulatedClears?: EliminationPreview | null;
  eliminationToast?: EliminationToast | null;
  onPlacePiece: (row: number, col: number) => void;
  onCellHover?: (pos: { row: number; col: number } | null) => void;
  clearingRows: number[];
  clearingCols: number[];
  boardRef: React.RefObject<HTMLDivElement | null>;
  cellPixelSize: number;
  isGlobalGravityPulseActive?: boolean;
  shatterShockwaveCenters?: Array<{ row: number; col: number }>;
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
  eliminationToast,
  onPlacePiece,
  onCellHover,
  clearingRows,
  clearingCols,
  boardRef,
  cellPixelSize,
  isGlobalGravityPulseActive = false,
  shatterShockwaveCenters = [],
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
      {/* Elimination Toast Banner (Floats gently without shifting board layout) */}
      {eliminationToast && (
        <div
          id="elimination-toast"
          key={eliminationToast.id}
          className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-amber-400/70 shadow-xl shadow-amber-500/20 backdrop-blur-xs transition-opacity duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-amber-300 font-bold text-xs sm:text-sm tracking-wide">
            {eliminationToast.title}
          </span>
          <span className="text-emerald-400 font-extrabold text-xs sm:text-sm">
            +{eliminationToast.scoreBonus}
          </span>
        </div>
      )}

      {/* Rigid outer frame: guarantees stillness, perfectly centers playable grid */}
      <div
        id="game-board-frame"
        className={`w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] md:w-[410px] md:h-[410px] p-2 sm:p-2.5 bg-slate-900/95 rounded-2xl shadow-2xl transition-all duration-300 box-border flex items-center justify-center overflow-hidden ${
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
              className="absolute pointer-events-none z-10 will-change-[top]"
              style={{
                top: `${entity.startRow * cellPixelSize}px`,
                left: `${entity.startCol * cellPixelSize}px`,
                transition: `top ${fallDuration}ms ${GRAVITY_KINETICS_CONFIG.easingCurve}`,
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
                    {/* Expanding shockwave burst */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400 bg-cyan-500/25 shadow-[0_0_35px_rgba(6,182,212,0.95)] animate-ping" />
                    {/* 5x5 Shatter Highlight Aura */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-cyan-300 ring-2 ring-cyan-500/80 bg-cyan-950/40 backdrop-brightness-125 shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-pulse" />
                  </div>
                );
              })}
            </div>
          )}

          {/* 2.6 Global Gravity Shockwave Wavefront */}
          {isGlobalGravityPulseActive && (
            <div
              id="gravity-shockwave"
              className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center overflow-hidden"
            >
              <div className="w-full h-full rounded-xl border-4 border-cyan-400/90 shadow-[0_0_40px_rgba(6,182,212,0.9)] animate-ping opacity-90" />
              <div className="absolute w-48 h-48 rounded-full bg-cyan-500/30 blur-2xl animate-pulse" />
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

