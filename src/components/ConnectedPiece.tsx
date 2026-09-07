import React from 'react';
import { Piece } from '../types';
import { getPieceCellBorders } from '../utils/gameLogic';
import { Atom } from 'lucide-react';

interface ConnectedPieceProps {
  piece: Piece;
  cellSize?: number; // size in px for each square block unit
  opacity?: number;
  className?: string;
  isGhost?: boolean;
  isValid?: boolean;
  isCellClearing?: (r: number, c: number) => boolean;
  isCellHinted?: (r: number, c: number) => boolean;
}

export const ConnectedPiece: React.FC<ConnectedPieceProps> = ({
  piece,
  cellSize = 24,
  opacity = 1,
  className = '',
  isGhost = false,
  isValid = true,
  isCellClearing,
  isCellHinted,
}) => {
  const numRows = piece.shape.length;
  const numCols = piece.shape[0].length;
  const isGravityCore = Boolean(piece.isGravityBlock);

  return (
    <div
      className={`inline-grid select-none pointer-events-none transition-transform ${className}`}
      style={{
        gridTemplateColumns: `repeat(${numCols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${numRows}, ${cellSize}px)`,
        width: `${numCols * cellSize}px`,
        height: `${numRows * cellSize}px`,
        opacity,
      }}
    >
      {piece.shape.map((row, r) =>
        row.map((val, c) => {
          if (val === 0) {
            return (
              <div
                key={`empty-${r}-${c}`}
                style={{ width: cellSize, height: cellSize }}
                className="bg-transparent"
              />
            );
          }

          const borders = getPieceCellBorders(piece.shape, r, c);
          const isClearing = isCellClearing?.(r, c);
          const isHinted = isCellHinted?.(r, c);

          // Determine border styling for exterior edges only
          let borderClasses = [
            borders.hasTop ? 'border-t-0' : 'border-t-2 border-t-white/40',
            borders.hasBottom ? 'border-b-0' : 'border-b-2 border-b-black/40',
            borders.hasLeft ? 'border-l-0' : 'border-l-2 border-l-white/30',
            borders.hasRight ? 'border-r-0' : 'border-r-2 border-r-black/35',
            borders.roundedTl ? 'rounded-tl-md' : 'rounded-tl-none',
            borders.roundedTr ? 'rounded-tr-md' : 'rounded-tr-none',
            borders.roundedBl ? 'rounded-bl-md' : 'rounded-bl-none',
            borders.roundedBr ? 'rounded-br-md' : 'rounded-br-none',
          ].join(' ');

          let bgClass = piece.color;

          if (isGravityCore) {
            borderClasses = 'border-2 border-purple-400 rounded-lg shadow-[0_0_12px_rgba(168,85,247,0.7)] ring-1 ring-purple-300/60';
            bgClass = 'bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-800';
          }

          if (isGhost) {
            bgClass = isValid
              ? `${piece.color} opacity-70`
              : 'bg-rose-500/60';
          } else if (isClearing) {
            bgClass = isGravityCore
              ? 'bg-white brightness-200 shadow-xl shadow-purple-400/90 transition-colors duration-200'
              : 'bg-white brightness-200 shadow-md shadow-white/80 transition-colors duration-200';
          }

          const hintClass =
            isHinted && !isGhost
              ? 'ring-2 ring-amber-300 ring-inset brightness-110 shadow-xs'
              : '';

          return (
            <div
              key={`cell-${r}-${c}`}
              style={{ width: cellSize, height: cellSize }}
              className={`relative box-border ${bgClass} ${borderClasses} ${hintClass} flex items-center justify-center overflow-hidden`}
            >
              {/* Subtle glossy sheen on each cell */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

              {/* Gravity singularity core animation */}
              {isGravityCore && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full">
                  <div className="absolute w-2 h-2 rounded-full bg-violet-400 blur-[2px] animate-pulse" />
                  <Atom
                    className="text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-spin"
                    style={{
                      width: Math.max(14, cellSize * 0.58),
                      height: Math.max(14, cellSize * 0.58),
                      animationDuration: '3s',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};


