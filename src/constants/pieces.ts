import { Piece } from '../types';

export const PIECE_TEMPLATES: Omit<Piece, 'id'>[] = [
  // 1x1
  {
    name: 'Dot',
    shape: [[1]],
    color: 'bg-amber-400',
    borderColor: 'border-amber-500',
  },
  // 2x1 & 1x2
  {
    name: 'Line-2-H',
    shape: [[1, 1]],
    color: 'bg-orange-400',
    borderColor: 'border-orange-500',
  },
  {
    name: 'Line-2-V',
    shape: [[1], [1]],
    color: 'bg-orange-400',
    borderColor: 'border-orange-500',
  },
  // 3x1 & 1x3
  {
    name: 'Line-3-H',
    shape: [[1, 1, 1]],
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-500',
  },
  {
    name: 'Line-3-V',
    shape: [[1], [1], [1]],
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-500',
  },
  // 4x1 & 1x4 (Classic Tetris I)
  {
    name: 'Line-4-H',
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-400',
    borderColor: 'border-cyan-500',
  },
  {
    name: 'Line-4-V',
    shape: [[1], [1], [1], [1]],
    color: 'bg-cyan-400',
    borderColor: 'border-cyan-500',
  },
  // 5x1 & 1x5
  {
    name: 'Line-5-H',
    shape: [[1, 1, 1, 1, 1]],
    color: 'bg-sky-500',
    borderColor: 'border-sky-600',
  },
  {
    name: 'Line-5-V',
    shape: [[1], [1], [1], [1], [1]],
    color: 'bg-sky-500',
    borderColor: 'border-sky-600',
  },
  // Square 2x2 (Classic Tetris O)
  {
    name: 'Square-2',
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'bg-yellow-400',
    borderColor: 'border-yellow-500',
  },
  // Square 3x3
  {
    name: 'Square-3',
    shape: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    color: 'bg-rose-500',
    borderColor: 'border-rose-600',
  },
  // Small L (Corner 2x2)
  {
    name: 'Corner-TL',
    shape: [
      [1, 1],
      [1, 0],
    ],
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-500',
  },
  {
    name: 'Corner-TR',
    shape: [
      [1, 1],
      [0, 1],
    ],
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-500',
  },
  {
    name: 'Corner-BL',
    shape: [
      [1, 0],
      [1, 1],
    ],
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-500',
  },
  {
    name: 'Corner-BR',
    shape: [
      [0, 1],
      [1, 1],
    ],
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-500',
  },
  // Classic Tetris T
  {
    name: 'Tetris-T-Down',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    color: 'bg-purple-400',
    borderColor: 'border-purple-500',
  },
  {
    name: 'Tetris-T-Up',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: 'bg-purple-400',
    borderColor: 'border-purple-500',
  },
  // Classic Tetris L
  {
    name: 'Tetris-L',
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    color: 'bg-blue-400',
    borderColor: 'border-blue-500',
  },
  {
    name: 'Tetris-L-Rotated',
    shape: [
      [1, 1, 1],
      [1, 0, 0],
    ],
    color: 'bg-blue-400',
    borderColor: 'border-blue-500',
  },
  // Classic Tetris J
  {
    name: 'Tetris-J',
    shape: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    color: 'bg-teal-400',
    borderColor: 'border-teal-500',
  },
  {
    name: 'Tetris-J-Rotated',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 'bg-teal-400',
    borderColor: 'border-teal-500',
  },
  // Classic Tetris S
  {
    name: 'Tetris-S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 'bg-lime-400',
    borderColor: 'border-lime-500',
  },
  // Classic Tetris Z
  {
    name: 'Tetris-Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 'bg-red-400',
    borderColor: 'border-red-500',
  },
];

export const GRAVITY_BLOCK_COLOR = 'bg-violet-600';

export function getRandomPiece(): Piece {
  const template = PIECE_TEMPLATES[Math.floor(Math.random() * PIECE_TEMPLATES.length)];
  return {
    ...template,
    id: `${template.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

export function generateInitialPieces(count = 3): Piece[] {
  return Array.from({ length: count }, () => getRandomPiece());
}
