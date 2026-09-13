import React from 'react';
import { BoardState, Piece } from '../types';
import { canPieceFitAnywhere } from '../utils/gameLogic';
import { ConnectedPiece } from './ConnectedPiece';
import { Sparkles } from 'lucide-react';

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
        const isResonance = Boolean(piece.isResonancePiece);
        const isKeystone = Boolean(piece.isKeystone);

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
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border-2 transition-all select-none touch-none w-24 h-24 sm:w-32 sm:h-32 bg-slate-900/90 shadow-lg relative ${
              isDragging
                ? 'opacity-25 border-indigo-400/50'
                : isSelected
                ? 'border-indigo-400 ring-4 ring-indigo-500/20 bg-slate-800'
                : isResonance
                ? 'border-purple-400/90 ring-2 ring-amber-400/70 shadow-[0_0_22px_rgba(168,85,247,0.55)] bg-gradient-to-br from-purple-950/80 via-slate-900/90 to-amber-950/50 cursor-grab active:cursor-grabbing'
                : isKeystone
                ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/40 bg-amber-950/30 cursor-grab active:cursor-grabbing'
                : canFit
                ? 'border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing'
                : 'border-slate-800/60 opacity-35 cursor-not-allowed'
            }`}
          >
            {/* Resonance galaxy breathing halo aura */}
            {isResonance && !isDragging && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600/20 via-pink-500/10 to-amber-400/20 pointer-events-none animate-pulse ring-1 ring-purple-400/40" />
            )}

            {/* Special status badge */}
            {isResonance && !isDragging && (
              <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 border border-amber-300 text-[9px] font-black text-white tracking-tight shadow-[0_0_10px_rgba(245,158,11,0.6)] flex items-center gap-1 z-10 animate-bounce">
                <Sparkles className="w-2.5 h-2.5 text-amber-200 animate-pulse" />
                引力星块
              </span>
            )}
            {isKeystone && !isDragging && (
              <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-amber-600 border border-amber-300 text-[9px] font-black text-amber-100 tracking-tighter shadow-md">
                微晶基石
              </span>
            )}

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
