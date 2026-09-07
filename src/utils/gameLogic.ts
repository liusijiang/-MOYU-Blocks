import {
  BoardState,
  Piece,
  CellBorderInfo,
  EliminationPreview,
  PlacedPieceEntity,
} from '../types';
import { GRAVITY_BLOCK_COLOR } from '../constants/pieces';

export const BOARD_SIZE = 10;

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

/**
 * Calculates topological connectivity of a cell in a polyomino piece
 * to render a seamless, unified block without internal borders.
 */
export function getPieceCellBorders(
  shape: number[][],
  r: number,
  c: number
): CellBorderInfo {
  const numRows = shape.length;
  const numCols = shape[0].length;

  const hasTop = r > 0 && shape[r - 1][c] === 1;
  const hasBottom = r < numRows - 1 && shape[r + 1][c] === 1;
  const hasLeft = c > 0 && shape[r][c - 1] === 1;
  const hasRight = c < numCols - 1 && shape[r][c + 1] === 1;

  // Outer corners get rounded
  const roundedTl = !hasTop && !hasLeft;
  const roundedTr = !hasTop && !hasRight;
  const roundedBl = !hasBottom && !hasLeft;
  const roundedBr = !hasBottom && !hasRight;

  return {
    hasTop,
    hasBottom,
    hasLeft,
    hasRight,
    roundedTl,
    roundedTr,
    roundedBl,
    roundedBr,
  };
}

/**
 * Checks whether a piece can be placed at board coordinate (startRow, startCol)
 */
export function canPlacePiece(
  board: BoardState,
  piece: Piece,
  startRow: number,
  startCol: number
): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        const targetR = startRow + r;
        const targetC = startCol + c;

        if (
          targetR < 0 ||
          targetR >= BOARD_SIZE ||
          targetC < 0 ||
          targetC >= BOARD_SIZE
        ) {
          return false;
        }

        if (board[targetR][targetC] !== null) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Places the piece onto the board and returns a new board state
 */
export function placePieceOnBoard(
  board: BoardState,
  piece: Piece,
  startRow: number,
  startCol: number
): BoardState {
  const newBoard = board.map((row) => [...row]);

  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] === 1) {
        const targetR = startRow + r;
        const targetC = startCol + c;
        newBoard[targetR][targetC] = piece.color;
      }
    }
  }

  return newBoard;
}

/**
 * Checks for full rows and columns, clears them simultaneously,
 * and returns the cleared indexes and count.
 */
export function checkAndClearLines(board: BoardState): {
  newBoard: BoardState;
  clearedRows: number[];
  clearedCols: number[];
  totalLines: number;
} {
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  // Check horizontal rows
  for (let r = 0; r < BOARD_SIZE; r++) {
    const isFull = board[r].every((cell) => cell !== null);
    if (isFull) {
      clearedRows.push(r);
    }
  }

  // Check vertical columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    let isFull = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === null) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      clearedCols.push(c);
    }
  }

  if (clearedRows.length === 0 && clearedCols.length === 0) {
    return {
      newBoard: board,
      clearedRows: [],
      clearedCols: [],
      totalLines: 0,
    };
  }

  // Clear matched rows and columns
  const newBoard = board.map((row, r) =>
    row.map((cell, c) => {
      if (clearedRows.includes(r) || clearedCols.includes(c)) {
        return null;
      }
      return cell;
    })
  );

  return {
    newBoard,
    clearedRows,
    clearedCols,
    totalLines: clearedRows.length + clearedCols.length,
  };
}

/**
 * Checks if a piece can fit anywhere on the current board
 */
export function canPieceFitAnywhere(board: BoardState, piece: Piece): boolean {
  for (let r = 0; r <= BOARD_SIZE - piece.shape.length; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.shape[0].length; c++) {
      if (canPlacePiece(board, piece, r, c)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Fast simulated preview of line eliminations if piece is placed at (startRow, startCol).
 * Executes in microseconds without mutating or cloning the full board.
 */
export function getSimulatedClearLines(
  board: BoardState,
  piece: Piece,
  startRow: number,
  startCol: number
): EliminationPreview {
  const clearingRows: number[] = [];
  const clearingCols: number[] = [];

  const pieceRows = piece.shape.length;
  const pieceCols = piece.shape[0].length;

  // Helper to check if (r, c) would be filled by the piece or board
  const isFilled = (r: number, c: number): boolean => {
    if (board[r][c] !== null) return true;
    const pr = r - startRow;
    const pc = c - startCol;
    if (pr >= 0 && pr < pieceRows && pc >= 0 && pc < pieceCols) {
      return piece.shape[pr][pc] === 1;
    }
    return false;
  };

  // Check rows
  for (let r = 0; r < BOARD_SIZE; r++) {
    let full = true;
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isFilled(r, c)) {
        full = false;
        break;
      }
    }
    if (full) {
      clearingRows.push(r);
    }
  }

  // Check columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (!isFilled(r, c)) {
        full = false;
        break;
      }
    }
    if (full) {
      clearingCols.push(c);
    }
  }

  return {
    clearingRows,
    clearingCols,
    totalLines: clearingRows.length + clearingCols.length,
  };
}

/**
 * Splits and trims placed entities when lines are cleared.
 * Intact entities remain unchanged.
 * Entities that are partially cut are split into 4-connected components,
 * bounded by tight bounding boxes, and converted to debris (isDebris: true).
 * Entities completely cleared are removed.
 */
export function splitAndTrimCutEntities(
  entities: PlacedPieceEntity[],
  clearedRows: number[],
  clearedCols: number[]
): {
  remainingEntities: PlacedPieceEntity[];
  newlyCreatedDebrisIds: Set<string>;
} {
  const remainingEntities: PlacedPieceEntity[] = [];
  const newlyCreatedDebrisIds = new Set<string>();

  for (const entity of entities) {
    const localH = entity.shape.length;
    const localW = entity.shape[0].length;
    const grid: number[][] = [];
    let hasCutOccurred = false;
    let hasAnyAliveCell = false;

    for (let r = 0; r < localH; r++) {
      grid[r] = [];
      const boardR = entity.startRow + r;
      const isRowCleared = clearedRows.includes(boardR);
      for (let c = 0; c < localW; c++) {
        const boardC = entity.startCol + c;
        const isColCleared = clearedCols.includes(boardC);
        if (entity.shape[r][c] === 1) {
          if (isRowCleared || isColCleared) {
            grid[r][c] = 0;
            hasCutOccurred = true;
          } else {
            grid[r][c] = 1;
            hasAnyAliveCell = true;
          }
        } else {
          grid[r][c] = 0;
        }
      }
    }

    // Completely eliminated
    if (!hasAnyAliveCell) continue;

    // Uncut entity: preserves original shape and debris state
    if (!hasCutOccurred) {
      remainingEntities.push(entity);
      continue;
    }

    // Cut entity: Extract 4-connected components using BFS
    const visited = Array.from({ length: localH }, () =>
      Array(localW).fill(false)
    );
    let fragmentIndex = 0;

    for (let r = 0; r < localH; r++) {
      for (let c = 0; c < localW; c++) {
        if (grid[r][c] === 1 && !visited[r][c]) {
          const cells: [number, number][] = [];
          const queue: [number, number][] = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [cr, cc] = queue.shift()!;
            cells.push([cr, cc]);
            const neighbors: [number, number][] = [
              [cr - 1, cc],
              [cr + 1, cc],
              [cr, cc - 1],
              [cr, cc + 1],
            ];
            for (const [nr, nc] of neighbors) {
              if (
                nr >= 0 &&
                nr < localH &&
                nc >= 0 &&
                nc < localW &&
                grid[nr][nc] === 1 &&
                !visited[nr][nc]
              ) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }

          // Calculate bounding box
          let minR = Infinity;
          let maxR = -Infinity;
          let minC = Infinity;
          let maxC = -Infinity;
          for (const [cr, cc] of cells) {
            minR = Math.min(minR, cr);
            maxR = Math.max(maxR, cr);
            minC = Math.min(minC, cc);
            maxC = Math.max(maxC, cc);
          }

          const subH = maxR - minR + 1;
          const subW = maxC - minC + 1;
          const subShape = Array.from({ length: subH }, () =>
            Array(subW).fill(0)
          );
          for (const [cr, cc] of cells) {
            subShape[cr - minR][cc - minC] = 1;
          }

          const fragId = `${entity.id}_frag_${fragmentIndex++}_${Date.now()}`;
          const newFragEntity: PlacedPieceEntity = {
            id: fragId,
            color: entity.color,
            startRow: entity.startRow + minR,
            startCol: entity.startCol + minC,
            shape: subShape,
            isDebris: true, // Marked as debris
            isGravityBlock: entity.isGravityBlock ?? false,
          };

          remainingEntities.push(newFragEntity);
          newlyCreatedDebrisIds.add(fragId);
        }
      }
    }
  }

  return { remainingEntities, newlyCreatedDebrisIds };
}

/**
 * Computes rigid gravity drops for specified active debris entities.
 * Simulates bottom-up settling where lowest entities drop and land first,
 * providing support for entities above them without clipping or overlapping.
 */
export function computeGravityCascadeDrops(
  board: BoardState,
  entities: PlacedPieceEntity[],
  activeDebrisIds: Set<string>
): {
  updatedEntities: PlacedPieceEntity[];
  updatedBoard: BoardState;
  hasMovement: boolean;
  maxDistance: number;
} {
  const tempBoard: BoardState = board.map((row) => [...row]);

  // Remove active entities' cells from tempBoard so they don't collide with themselves
  for (const entity of entities) {
    if (activeDebrisIds.has(entity.id)) {
      for (let r = 0; r < entity.shape.length; r++) {
        for (let c = 0; c < entity.shape[0].length; c++) {
          if (entity.shape[r][c] === 1) {
            const tr = entity.startRow + r;
            const tc = entity.startCol + c;
            if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
              tempBoard[tr][tc] = null;
            }
          }
        }
      }
    }
  }

  // Sort active entities by bottom-most row descending (bottom entities drop first)
  const activeEntities = entities.filter((e) => activeDebrisIds.has(e.id));
  activeEntities.sort((a, b) => {
    const bottomA = a.startRow + a.shape.length - 1;
    const bottomB = b.startRow + b.shape.length - 1;
    return bottomB - bottomA;
  });

  let hasMovement = false;
  let maxDistance = 0;
  const entityDropMap = new Map<string, number>();

  for (const entity of activeEntities) {
    let maxDrop = 0;
    while (true) {
      const nextDrop = maxDrop + 1;
      let canDrop = true;

      for (let r = 0; r < entity.shape.length; r++) {
        for (let c = 0; c < entity.shape[0].length; c++) {
          if (entity.shape[r][c] === 1) {
            const targetR = entity.startRow + r + nextDrop;
            const targetC = entity.startCol + c;

            // Hit bottom boundary
            if (targetR >= BOARD_SIZE) {
              canDrop = false;
              break;
            }

            // Hit another block on tempBoard
            if (tempBoard[targetR][targetC] !== null) {
              canDrop = false;
              break;
            }
          }
        }
        if (!canDrop) break;
      }

      if (canDrop) {
        maxDrop = nextDrop;
      } else {
        break;
      }
    }

    if (maxDrop > 0) {
      hasMovement = true;
      maxDistance = Math.max(maxDistance, maxDrop);
    }
    entityDropMap.set(entity.id, maxDrop);

    // Lock landed entity onto tempBoard so higher entities can land on it
    const finalStartRow = entity.startRow + maxDrop;
    for (let r = 0; r < entity.shape.length; r++) {
      for (let c = 0; c < entity.shape[0].length; c++) {
        if (entity.shape[r][c] === 1) {
          const tr = finalStartRow + r;
          const tc = entity.startCol + c;
          if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
            tempBoard[tr][tc] = entity.color;
          }
        }
      }
    }
  }

  const updatedEntities = entities.map((entity) => {
    const drop = entityDropMap.get(entity.id) || 0;
    if (drop > 0) {
      return {
        ...entity,
        startRow: entity.startRow + drop,
      };
    }
    return entity;
  });

  return {
    updatedEntities,
    updatedBoard: tempBoard,
    hasMovement,
    maxDistance,
  };
}

/**
 * Checks if conditions are met to spawn a 1x1 Gravity Block:
 * (clearedRows >= 2 || clearedCols >= 2 || (clearedRows >= 1 && clearedCols >= 1))
 * Spawns on an empty cell in the cleared rows/cols, or anywhere empty on board.
 */
export function checkAndSpawnGravityBlock(
  board: BoardState,
  clearedRows: number[],
  clearedCols: number[]
): PlacedPieceEntity | null {
  const lineCount = clearedRows.length + clearedCols.length;
  const isEligible =
    clearedRows.length >= 2 ||
    clearedCols.length >= 2 ||
    (clearedRows.length >= 1 && clearedCols.length >= 1);

  if (!isEligible || lineCount < 2) return null;

  const candidateCells: [number, number][] = [];

  // 1. Prioritize intersection empty slots
  for (const r of clearedRows) {
    for (const c of clearedCols) {
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        if (board[r][c] === null) {
          candidateCells.push([r, c]);
        }
      }
    }
  }

  // 2. Secondary: any empty slot in the cleared lines
  if (candidateCells.length === 0) {
    for (const r of clearedRows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) candidateCells.push([r, c]);
      }
    }
    for (const c of clearedCols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[r][c] === null) candidateCells.push([r, c]);
      }
    }
  }

  // 3. Fallback: any empty cell anywhere on the board
  if (candidateCells.length === 0) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) candidateCells.push([r, c]);
      }
    }
  }

  if (candidateCells.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * candidateCells.length);
  const [spawnR, spawnC] = candidateCells[randomIndex];

  return {
    id: `gravity_core_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    color: GRAVITY_BLOCK_COLOR,
    startRow: spawnR,
    startCol: spawnC,
    shape: [[1]],
    isDebris: false,
    isGravityBlock: true,
  };
}

/**
 * Rebuilds the 10x10 board grid from placed piece entities for guaranteed state synchronization.
 */
export function rebuildBoardFromEntities(
  entities: PlacedPieceEntity[]
): BoardState {
  const newBoard = createEmptyBoard();
  for (const entity of entities) {
    for (let r = 0; r < entity.shape.length; r++) {
      for (let c = 0; c < entity.shape[0].length; c++) {
        if (entity.shape[r][c] === 1) {
          const tr = entity.startRow + r;
          const tc = entity.startCol + c;
          if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
            newBoard[tr][tc] = entity.color;
          }
        }
      }
    }
  }
  return newBoard;
}


