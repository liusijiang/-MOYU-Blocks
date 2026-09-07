import React from 'react';
import { BoardState, Piece } from '../types';
import { canPieceFitAnywhere } from '../utils/gameLogic';
import { ConnectedPiece } from './ConnectedPiece';

interface PieceTrayProps {
  pieces: (Piece | null)[];
  selectedPiece: Piece | null;
  onSelectPiece: (piece: Piece | null, slotIndex: number) => void;
  onPointerStartDrag: (
    piece: Piece,
    slotIndex: number,
    clientX: number,
    clientY: number,
    isTouch: boolean,
    targetElement: HTMLElement
  ) => void;
  board: BoardState;
  activeDragSlotIndex: number | null;
  disabled?: boolean;
}

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  selectedPiece,
  onSelectPiece,
  onPointerStartDrag,
  board,
  activeDragSlotIndex,
  disabled = false,
}) => {
  return (
    <div
      id="piece-tray"
      className={`flex items-center justify-center gap-3 sm:gap-6 mt-4 w-full max-w-xl px-2 transition-opacity ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {pieces.map((piece, slotIndex) => {
        if (!piece) {
          return (
            <div
              key={`empty-slot-${slotIndex}`}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center bg-slate-900/30"
            />
          );
        }

        const isSelected = selectedPiece?.id === piece.id;
        const isDragging = activeDragSlotIndex === slotIndex;
        const canFit = !disabled && canPieceFitAnywhere(board, piece);

        const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
          if (disabled || !canFit) return;
          // Trigger dragging immediately on pointer down for instant response
          onPointerStartDrag(
            piece,
            slotIndex,
            e.clientX,
            e.clientY,
            e.pointerType === 'touch',
            e.currentTarget
          );
        };

        return (
          <div
            key={piece.id}
            id={`piece-slot-${slotIndex}`}
            onPointerDown={handlePointerDown}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border-2 transition-all select-none touch-none w-24 h-24 sm:w-32 sm:h-32 bg-slate-900/90 shadow-lg ${
              isDragging
                ? 'opacity-25 border-indigo-400/50'
                : isSelected
                ? 'border-indigo-400 ring-4 ring-indigo-500/20 bg-slate-800'
                : canFit
                ? 'border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing'
                : 'border-slate-800/60 opacity-35 cursor-not-allowed'
            }`}
          >
            {/* Integrated Polyomino piece representation */}
            <div className="flex items-center justify-center pointer-events-none">
              <ConnectedPiece
                piece={piece}
                cellSize={16}
                className="scale-90 sm:scale-100 transition-transform"
              />
            </div>

            {!canFit && (
              <span className="text-[10px] text-rose-400 mt-1.5 font-medium tracking-tight">
                无处放置
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
