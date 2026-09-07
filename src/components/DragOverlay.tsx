import React from 'react';
import { ActiveDragState } from '../types';
import { ConnectedPiece } from './ConnectedPiece';

interface DragOverlayProps {
  dragState: ActiveDragState | null;
  cellPixelSize: number;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({
  dragState,
  cellPixelSize,
}) => {
  if (!dragState) return null;

  const { piece, currentX, currentY, anchorX, anchorY } = dragState;

  const left = currentX - anchorX;
  const top = currentY - anchorY;

  return (
    <div
      id="drag-overlay"
      className="fixed top-0 left-0 pointer-events-none z-50 will-change-transform select-none"
      style={{
        transform: `translate3d(${left}px, ${top}px, 0)`,
      }}
    >
      <ConnectedPiece
        piece={piece}
        cellSize={cellPixelSize}
        className="filter drop-shadow-2xl opacity-95"
      />
    </div>
  );
};
