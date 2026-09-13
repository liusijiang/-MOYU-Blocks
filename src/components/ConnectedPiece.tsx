import React from 'react';
import { Piece } from '../types';
import { getPieceCellBorders } from '../utils/gameLogic';
import { Disc3, Sparkles } from 'lucide-react';

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
  const isKeystone = Boolean(piece.isKeystone);
  const isResonance = Boolean(piece.isResonancePiece);

  const resonanceWrapperGlow =
    isResonance && !isGhost
      ? 'drop-shadow-[0_0_12px_rgba(168,85,247,0.7)] drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]'
      : '';

  return (
    <div
      className={`inline-grid select-none pointer-events-none transition-transform ${resonanceWrapperGlow} ${className}`}
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

          if (isKeystone) {
            borderClasses = 'border-2 border-amber-200 rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.9)] ring-1 ring-amber-300/80';
            bgClass = 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600';
          } else if (isGravityCore) {
            borderClasses = 'border-2 border-cyan-400 rounded-lg shadow-[0_0_16px_rgba(6,182,212,0.85)] ring-2 ring-cyan-300/70';
            bgClass = 'bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-950';
          } else if (isResonance) {
            borderClasses = 'border-2 border-purple-300 rounded-sm shadow-[0_0_12px_rgba(192,132,252,0.9)] ring-1 ring-amber-300/80';
            bgClass = 'bg-gradient-to-br from-indigo-900 via-purple-900 to-amber-950';
          }

          if (isGhost) {
            bgClass = isValid
              ? `${piece.color} opacity-70`
              : 'bg-rose-500/60';
          } else if (isClearing) {
            bgClass = isGravityCore
              ? 'bg-white brightness-200 shadow-xl shadow-cyan-400/90 transition-colors duration-200'
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

              {/* Keystone Amber Crystal shimmer */}
              {isKeystone && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full">
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-200 blur-[2px] animate-pulse" />
                  <Sparkles
                    className="text-amber-100 drop-shadow-[0_0_6px_rgba(254,240,138,0.9)] animate-pulse"
                    style={{
                      width: Math.max(14, cellSize * 0.65),
                      height: Math.max(14, cellSize * 0.65),
                    }}
                  />
                </div>
              )}

              {/* Gravity singularity core animation (Obsidian & Electric Cyan Event Horizon) */}
              {isGravityCore && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full">
                  {/* Cyan event horizon halo */}
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400/30 blur-[2px] animate-pulse" />
                  {/* Deep black singularity core dot */}
                  <div className="absolute w-2 h-2 rounded-full bg-slate-950 ring-1 ring-cyan-300 shadow-[0_0_6px_#06b6d4] z-10" />
                  {/* Accretion disc vortex */}
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

              {/* Resonance Piece: Purple-Gold Galaxy Breathing Particle Shimmer */}
              {isResonance && !isGravityCore && !isKeystone && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
                  {/* Cosmic nebula breathing pulse */}
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-r from-purple-400/40 via-pink-400/30 to-amber-300/40 blur-[2px] animate-pulse" />
                  {/* Starlight golden shimmer */}
                  <Sparkles
                    className="text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)] animate-pulse"
                    style={{
                      width: Math.max(13, cellSize * 0.55),
                      height: Math.max(13, cellSize * 0.55),
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


