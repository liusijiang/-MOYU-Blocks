import { Piece } from '../types';

/**
 * 7 种原生经典俄罗斯方块 (Tetrominoes) 的基准配置 (0度默认朝向)
 */
export interface TetrominoBaseConfig {
  name: 'Tetris-I' | 'Tetris-O' | 'Tetris-T' | 'Tetris-S' | 'Tetris-Z' | 'Tetris-J' | 'Tetris-L';
  shape: number[][];
  color: string;
  borderColor: string;
}

export const TETROMINO_BASES: TetrominoBaseConfig[] = [
  // 1. I 型 (Cyan, 1x4)
  {
    name: 'Tetris-I',
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-400',
    borderColor: 'border-cyan-500',
  },
  // 2. O 型 (Yellow, 2x2)
  {
    name: 'Tetris-O',
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'bg-yellow-400',
    borderColor: 'border-yellow-500',
  },
  // 3. T 型 (Purple)
  {
    name: 'Tetris-T',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    color: 'bg-purple-400',
    borderColor: 'border-purple-500',
  },
  // 4. S 型 (Lime / Green)
  {
    name: 'Tetris-S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 'bg-lime-400',
    borderColor: 'border-lime-500',
  },
  // 5. Z 型 (Red)
  {
    name: 'Tetris-Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 'bg-red-400',
    borderColor: 'border-red-500',
  },
  // 6. J 型 (Blue)
  {
    name: 'Tetris-J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 'bg-blue-400',
    borderColor: 'border-blue-500',
  },
  // 7. L 型 (Orange)
  {
    name: 'Tetris-L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: 'bg-orange-400',
    borderColor: 'border-orange-500',
  },
];

export const GRAVITY_BLOCK_COLOR = 'bg-cyan-500';
export const KEYSTONE_BLOCK_COLOR = 'bg-amber-400';
export const KEYSTONE_BORDER_COLOR = 'border-amber-300';

/**
 * 二维 0-1 矩阵顺时针旋转 90 度
 * 变换规则：result[c][numRows - 1 - r] = original[r][c]
 */
export function rotateMatrix90(matrix: number[][]): number[][] {
  const numRows = matrix.length;
  const numCols = matrix[0].length;
  const result: number[][] = Array.from({ length: numCols }, () =>
    Array.from({ length: numRows }, () => 0)
  );

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      result[c][numRows - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

/**
 * 将矩阵顺时针旋转指定步数 (0: 0°, 1: 90°, 2: 180°, 3: 270°)
 */
export function rotateMatrix(matrix: number[][], steps: number): number[][] {
  const normalizedSteps = ((steps % 4) + 4) % 4;
  let current = matrix;
  for (let i = 0; i < normalizedSteps; i++) {
    current = rotateMatrix90(current);
  }
  return current;
}

/**
 * 保持向后兼容导出的积木模板全集 (包含 7 种形状的所有 4 个旋转朝向)
 */
export const PIECE_TEMPLATES: Omit<Piece, 'id'>[] = TETROMINO_BASES.flatMap((base) =>
  [0, 1, 2, 3].map((steps) => ({
    name: `${base.name}-R${steps * 90}`,
    shape: rotateMatrix(base.shape, steps),
    color: base.color,
    borderColor: base.borderColor,
  }))
);

/**
 * 随机生成一个原生经典俄罗斯方块，满足双重随机机制：
 * 1. 形状随机 (7 种经典 Tetrominoes 等概率随机)
 * 2. 旋转角度随机 (0°, 90°, 180°, 270° 四向等概率随机)
 */
export function getRandomPiece(): Piece {
  // 1. 形状随机：从 7 个经典基础形态中等概率选取
  const baseIndex = Math.floor(Math.random() * TETROMINO_BASES.length);
  const base = TETROMINO_BASES[baseIndex];

  // 2. 旋转随机：0, 1, 2, 3 分别代表旋转 0°, 90°, 180°, 270°
  const rotationSteps = Math.floor(Math.random() * 4);
  const finalShape = rotateMatrix(base.shape, rotationSteps);

  return {
    name: `${base.name}-R${rotationSteps * 90}`,
    shape: finalShape,
    color: base.color,
    borderColor: base.borderColor,
    id: `${base.name}-r${rotationSteps}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

/**
 * 生成初始或补满备选槽积木列表
 */
export function generateInitialPieces(count = 3): Piece[] {
  return Array.from({ length: count }, () => getRandomPiece());
}

/**
 * 任务 010: 生成绝境微晶基石 (1x1 Keystone)
 * 专属琥珀耀金晶体质感，解开死局的战术应急钥匙
 */
export function createKeystonePiece(): Piece {
  return {
    name: 'Keystone-1x1',
    shape: [[1]],
    color: KEYSTONE_BLOCK_COLOR,
    borderColor: KEYSTONE_BORDER_COLOR,
    id: `keystone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    isKeystone: true,
  };
}
