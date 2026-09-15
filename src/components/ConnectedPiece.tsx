import React from 'react';
import { Piece } from '../types';
import { getPieceCellBorders, findBottomMostCellInPiece } from '../utils/gameLogic';
import { Disc3, Sparkles, Crosshair, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
  const isPrism = Boolean(piece.isGravityPrism);
  const prismDir = piece.vectorDirection || 'left';
  const isKeystone = Boolean(piece.isKeystone);
  const isResonance = Boolean(piece.isResonancePiece);
  const resonanceCorePos = isResonance ? findBottomMostCellInPiece(piece.shape) : null;

  const resonanceWrapperGlow =
    isResonance && !isGhost
      ? 'drop-shadow-[0_0_14px_rgba(245,158,11,0.7)] drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]'
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
          } else if (isPrism) {
            borderClasses = 'border-2 border-emerald-400 rounded-lg shadow-[0_0_16px_rgba(16,185,129,0.85)] ring-2 ring-emerald-300/70';
            bgClass = 'bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950';
          } else if (isResonance) {
            const isCoreCell = resonanceCorePos?.r === r && resonanceCorePos?.c === c;
            if (isCoreCell) {
              borderClasses = 'border-2 border-amber-200 rounded-md shadow-[0_0_16px_rgba(251,191,36,1)] ring-2 ring-amber-300';
              bgClass = 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-100';
            } else {
              borderClasses = 'border-2 border-purple-400/80 rounded-sm shadow-[0_0_10px_rgba(168,85,247,0.8)] ring-1 ring-purple-300/40';
              bgClass = 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900';
            }
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

              {/* Gravity prism directional energy icon (Electric Emerald & Chevrons Left/Right) */}
              {isPrism && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full">
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/30 blur-[2px] animate-pulse" />
                  {prismDir === 'left' ? (
                    <ChevronsLeft
                      className="text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.95)] animate-pulse"
                      style={{
                        width: Math.max(16, cellSize * 0.72),
                        height: Math.max(16, cellSize * 0.72),
                      }}
                    />
                  ) : (
                    <ChevronsRight
                      className="text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.95)] animate-pulse"
                      style={{
                        width: Math.max(16, cellSize * 0.72),
                        height: Math.max(16, cellSize * 0.72),
                      }}
                    />
                  )}
                </div>
              )}

              {/* Resonance Piece: Singularity Core Cell vs Outer Crystal Shimmer */}
              {isResonance && !isGravityCore && !isKeystone && !isGhost && (
                <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
                  {resonanceCorePos?.r === r && resonanceCorePos?.c === c ? (
                    // Singularity Core Launcher Reticle Cell
                    <div className="relative flex items-center justify-center w-full h-full">
                      <div
                        className="absolute w-4 h-4 rounded-full bg-amber-300/60 blur-[2px] animate-ping"
                        style={{ animationDuration: '2s' }}
                      />
                      <Crosshair
                        className="text-amber-950 drop-shadow-[0_0_4px_rgba(255,255,255,0.9)] animate-spin"
                        style={{
                          width: Math.max(15, cellSize * 0.7),
                          height: Math.max(15, cellSize * 0.7),
                          animationDuration: '6s',
                        }}
                      />
                    </div>
                  ) : (
                    // Cosmic nebula breathing pulse for other outer cells
                    <>
                      <div className="absolute w-3 h-3 rounded-full bg-purple-400/30 blur-[2px] animate-pulse" />
                      <Sparkles
                        className="text-purple-200 drop-shadow-[0_0_6px_rgba(192,132,252,0.8)] animate-pulse"
                        style={{
                          width: Math.max(12, cellSize * 0.5),
                          height: Math.max(12, cellSize * 0.5),
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};


