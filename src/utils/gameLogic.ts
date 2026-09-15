import {
  BoardState,
  CellColor,
  Piece,
  CellBorderInfo,
  EliminationPreview,
  PlacedPieceEntity,
  SingularityCrossPreviewState,
} from '../types';
import {
  GRAVITY_BLOCK_COLOR,
  GRAVITY_PRISM_COLOR,
  PIECE_TEMPLATES,
  getRandomPiece,
  createKeystonePiece,
} from '../constants/pieces';

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
  clearedCols: number[],
  shatterCenters: Array<{ row: number; col: number }> = []
): {
  remainingEntities: PlacedPieceEntity[];
  newlyCreatedDebrisIds: Set<string>;
} {
  const remainingEntities: PlacedPieceEntity[] = [];
  const newlyCreatedDebrisIds = new Set<string>();

  const isInShatterZone = (boardR: number, boardC: number) =>
    shatterCenters.some(
      (sc) => Math.abs(boardR - sc.row) <= 2 && Math.abs(boardC - sc.col) <= 2
    );

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
          } else if (isInShatterZone(boardR, boardC)) {
            // 将3x3区域内的积木都震碎，变成1x1的最小单位积木并施加重力下坠
            grid[r][c] = 0;
            hasCutOccurred = true;

            const fragId = `shatter_1x1_${boardR}_${boardC}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const shatteredPiece: PlacedPieceEntity = {
              id: fragId,
              color: entity.color,
              startRow: boardR,
              startCol: boardC,
              shape: [[1]],
              isDebris: true,
              isGravityBlock: entity.isGravityBlock ?? false,
            };
            remainingEntities.push(shatteredPiece);
            newlyCreatedDebrisIds.add(fragId);
          } else {
            grid[r][c] = 1;
            hasAnyAliveCell = true;
          }
        } else {
          grid[r][c] = 0;
        }
      }
    }

    // Completely eliminated or entirely shattered into 1x1 pieces
    if (!hasAnyAliveCell) continue;

    // Uncut entity: preserves original shape and debris state
    if (!hasCutOccurred) {
      remainingEntities.push(entity);
      continue;
    }

    // Cut entity: Extract remaining 4-connected components using BFS
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
 * 任务 013/014: 计算引力奇点落盘时的十字贯穿爆破行列与受波及单元格
 * @param centerRow 奇点落盘行号 (0-9)
 * @param centerCol 奇点落盘列号 (0-9)
 */
export function calculateSingularityCrossBlast(
  centerRow: number,
  centerCol: number
): {
  blastRows: number[];
  blastCols: number[];
  impactCells: Array<{ r: number; c: number }>;
} {
  const safeR = Math.max(0, Math.min(BOARD_SIZE - 1, centerRow));
  const safeC = Math.max(0, Math.min(BOARD_SIZE - 1, centerCol));
  const blastRows = [safeR];
  const blastCols = [safeC];
  const impactCells: Array<{ r: number; c: number }> = [];

  // 十字共 19 个格子的打击坐标
  for (let c = 0; c < BOARD_SIZE; c++) {
    impactCells.push({ r: safeR, c });
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r !== safeR) {
      impactCells.push({ r, c: safeC });
    }
  }

  return { blastRows, blastCols, impactCells };
}

/**
 * 任务 016: 计算引力奇点动态十字瞄准预览状态
 * 无论玩家从哪个像素拖拽积木，发射中心均严格、确定地固化在积木的星核晶元单元格上
 */
export function computeSingularityCrosshairPreview(
  board: BoardState,
  piece: Piece,
  targetRow: number,
  targetCol: number,
  placedPieces: PlacedPieceEntity[],
  isValidPlacement: boolean
): SingularityCrossPreviewState {
  const corePos = findBottomMostCellInPiece(piece.shape);
  const centerRow = Math.max(0, Math.min(BOARD_SIZE - 1, targetRow + corePos.r));
  const centerCol = Math.max(0, Math.min(BOARD_SIZE - 1, targetCol + corePos.c));

  const targetedBlockCoords: Array<{ row: number; col: number }> = [];

  // 1. 扫描当前棋盘上被中心十字贯穿命中的既有方块（将被湮灭消解）
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board[centerRow][c] !== null) {
      targetedBlockCoords.push({ row: centerRow, col: c });
    }
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r !== centerRow && board[r][centerCol] !== null) {
      targetedBlockCoords.push({ row: r, col: centerCol });
    }
  }

  // 2. 检索当前棋盘上已被横向或纵向激光覆盖的 1x1 引力方块（触发 5x5 裂变预警）
  const chainedGravityCores: Array<{ row: number; col: number; blastRange: number }> = [];
  for (const p of placedPieces) {
    if (p.isGravityBlock) {
      if (p.startRow === centerRow || p.startCol === centerCol) {
        chainedGravityCores.push({
          row: p.startRow,
          col: p.startCol,
          blastRange: 5,
        });
      }
    }
  }

  return {
    centerRow,
    centerCol,
    isValidPlacement,
    beamRow: centerRow,
    beamCol: centerCol,
    targetedBlockCoords,
    chainedGravityCores,
    estimatedLinesCleared: 2,
  };
}

/**
 * 任务 013/014: 基于牛顿结构支撑力的自底向上光线投射沉降算法
 * 检测并驱动全场失去物理支撑的积木实体整体垂直下落，彻底消除反重力悬空现象，
 * 同时严格保证自底向上就位，杜绝穿模与重叠。
 */
export function computeStructuralSupportDrops(
  board: BoardState,
  entities: PlacedPieceEntity[]
): {
  updatedEntities: PlacedPieceEntity[];
  updatedBoard: BoardState;
  fallingEntities: PlacedPieceEntity[];
  entityDropMap: Map<string, number>;
  hasMovement: boolean;
  maxDistance: number;
} {
  const tempBoard: BoardState = board.map((row) => [...row]);
  const entityDropMap = new Map<string, number>();

  // 1. 先将所有待探测实体占用的单元格从 tempBoard 中擦除，避免自相碰撞
  for (const entity of entities) {
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

  // 2. 自底向上排序：最底层的实体优先判定落点与支撑面
  const sortedEntities = [...entities].sort((a, b) => {
    const bottomA = a.startRow + a.shape.length - 1;
    const bottomB = b.startRow + b.shape.length - 1;
    return bottomB - bottomA;
  });

  let hasMovement = false;
  let maxDistance = 0;

  // 3. 逐个实体向下进行光线投射探测最大可用自由落体距离
  for (const entity of sortedEntities) {
    let maxDrop = 0;

    while (true) {
      const nextDrop = maxDrop + 1;
      let blocked = false;

      for (let r = 0; r < entity.shape.length; r++) {
        for (let c = 0; c < entity.shape[0].length; c++) {
          if (entity.shape[r][c] === 1) {
            const targetR = entity.startRow + r + nextDrop;
            const targetC = entity.startCol + c;

            // 触碰底界
            if (targetR >= BOARD_SIZE) {
              blocked = true;
              break;
            }

            // 碰撞到已固定的其他积木或地基
            if (tempBoard[targetR][targetC] !== null) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) break;
      }

      if (!blocked) {
        maxDrop = nextDrop;
      } else {
        break; // 探测到支撑接触面，停止下探
      }
    }

    if (maxDrop > 0) {
      hasMovement = true;
      maxDistance = Math.max(maxDistance, maxDrop);
    }
    entityDropMap.set(entity.id, maxDrop);

    // 4. 将就位后的实体重新固化至 tempBoard，作为更高处实体的物理支撑面
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
    return {
      ...entity,
      startRow: entity.startRow + drop,
      hasStructuralSupport: true,
      dropOffset: drop,
    };
  });

  const fallingEntities = updatedEntities.filter(
    (e) => (entityDropMap.get(e.id) || 0) > 0
  );

  return {
    updatedEntities,
    updatedBoard: tempBoard,
    fallingEntities,
    entityDropMap,
    hasMovement,
    maxDistance,
  };
}

/**
 * 任务 013/014 统一重力动力学接口
 */
export function computeUnifiedGravityFall(
  board: BoardState,
  entities: PlacedPieceEntity[],
  _isGlobalAvalancheUnlocked?: boolean
): {
  updatedEntities: PlacedPieceEntity[];
  updatedBoard: BoardState;
  hasMovement: boolean;
  maxDistance: number;
} {
  return computeStructuralSupportDrops(board, entities);
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
 * 任务 026/027: 启发式地貌势能自动寻优算法
 * 扫描当前棋盘左右两侧的实体方块密度，永远锁定向积木密集侧推进
 * 势能寻优法则：向积木更密集的一侧挤压，最容易迅速凑满整列消除，并在稀疏侧释放大平原！
 */
export function calculatePrismVectorDirection(board: BoardState): 'left' | 'right' {
  let leftMass = 0;
  let rightMass = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < 5; c++) {
      if (board[r][c] !== null) leftMass++;
    }
    for (let c = 5; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) rightMass++;
    }
  }

  return leftMass >= rightMass ? 'left' : 'right';
}

/**
 * 任务 026/027: 双子特殊引信生成裁决函数（横消生核，纵消生棱）
 * 1. 消除线数 < 2: 不生成任何引信
 * 2. 纯横向消除 (clearedCols.length === 0): 孕育 1x1 引力核心 (Gravity Core, 5x5 裂变)
 * 3. 包含纵向消除 (clearedCols.length >= 1): 孕育 1x1 引力折向棱镜 (Gravity Prism, 瞬态横向脉冲自愈)
 */
export function checkAndSpawnSpecialEntity(
  board: BoardState,
  clearedRows: number[],
  clearedCols: number[]
): PlacedPieceEntity | null {
  const lineCount = clearedRows.length + clearedCols.length;
  if (lineCount < 2) return null;

  // 分支 A: 纯横向消除 -> 保持经典引力核心孕育
  if (clearedCols.length === 0) {
    return checkAndSpawnGravityBlock(board, clearedRows, clearedCols);
  }

  // 分支 B: 包含纵向消除 -> 孕育引力折向棱镜 (Gravity Prism)
  const candidateCells: [number, number][] = [];

  // 1. 优先选择横纵消除交界的断口空位（消除中心断口）
  for (const r of clearedRows) {
    for (const c of clearedCols) {
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        if (board[r][c] === null) {
          candidateCells.push([r, c]);
        }
      }
    }
  }

  // 2. 次选被消除纵列的纵向中段空位 (Row in [3, 6])
  if (candidateCells.length === 0) {
    for (const c of clearedCols) {
      for (let r = 3; r <= 6; r++) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] === null) candidateCells.push([r, c]);
        }
      }
    }
  }

  // 3. 备选：消除线上的任意空位
  if (candidateCells.length === 0) {
    for (const c of clearedCols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[r][c] === null) candidateCells.push([r, c]);
      }
    }
    for (const r of clearedRows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) candidateCells.push([r, c]);
      }
    }
  }

  // 4. 兜底：棋盘任意空网格
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
  const optimalDirection = calculatePrismVectorDirection(board);

  return {
    id: `gravity_prism_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    color: GRAVITY_PRISM_COLOR,
    startRow: spawnR,
    startCol: spawnC,
    shape: [[1]],
    isDebris: false,
    isGravityBlock: false,
    isGravityPrism: true,
    vectorDirection: optimalDirection,
  };
}

/**
 * 任务 026/027: 计算瞬态横向物理脉冲位移（Lateral Impulse）
 * 将棋盘每行的方块单元格向目标方向 (left 或 right) 极速压实拍紧
 * 保持方块单元格颜色完整性，并将重组后的地貌以 1x1 碎石单元包装，
 * 以便无缝接驳后续基于支撑力的垂直自底向上重力下坠（computeStructuralSupportDrops）
 */
export function computeLateralImpulse(
  board: BoardState,
  entities: PlacedPieceEntity[],
  direction: 'left' | 'right'
): {
  updatedBoard: BoardState;
  updatedEntities: PlacedPieceEntity[];
  hasMovement: boolean;
} {
  const newBoard: BoardState = createEmptyBoard();
  let hasMovement = false;

  // 1. 逐行执行横向平移与拍紧
  for (let r = 0; r < BOARD_SIZE; r++) {
    const nonNullCells: CellColor[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        nonNullCells.push(board[r][c]);
      }
    }

    if (direction === 'left') {
      // 靠左对齐：非空格靠左，后部填 null
      for (let c = 0; c < BOARD_SIZE; c++) {
        const newColor = c < nonNullCells.length ? nonNullCells[c] : null;
        newBoard[r][c] = newColor;
        if (newBoard[r][c] !== board[r][c]) {
          hasMovement = true;
        }
      }
    } else {
      // 靠右对齐：前部填 null，非空格靠右
      const emptyCount = BOARD_SIZE - nonNullCells.length;
      for (let c = 0; c < BOARD_SIZE; c++) {
        const newColor = c >= emptyCount ? nonNullCells[c - emptyCount] : null;
        newBoard[r][c] = newColor;
        if (newBoard[r][c] !== board[r][c]) {
          hasMovement = true;
        }
      }
    }
  }

  if (!hasMovement) {
    return {
      updatedBoard: board,
      updatedEntities: entities,
      hasMovement: false,
    };
  }

  // 2. 将横向拍紧后的网格重构为 1x1 独立刚体碎石实体 (Debris Entities)
  // 同时保留既有的特殊属性（若原实体存在特殊标识）
  const updatedEntities: PlacedPieceEntity[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const color = newBoard[r][c];
      if (color !== null) {
        const matchingOriginal = entities.find(
          (e) =>
            e.startRow === r &&
            e.startCol === c &&
            e.shape.length === 1 &&
            e.shape[0].length === 1
        );
        updatedEntities.push({
          id: matchingOriginal?.id || `lateral_frag_${r}_${c}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          color,
          startRow: r,
          startCol: c,
          shape: [[1]],
          isDebris: true,
          isGravityBlock: matchingOriginal?.isGravityBlock,
          isGravityPrism: matchingOriginal?.isGravityPrism,
          vectorDirection: matchingOriginal?.vectorDirection,
        });
      }
    }
  }

  return {
    updatedBoard: newBoard,
    updatedEntities,
    hasMovement: true,
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

/**
 * ========================================================
 * 任务 010: 跨步连击、引力共鸣与自适应发牌算法
 * ========================================================
 */

/**
 * 统计棋盘上的空单元格数量
 */
export function countEmptyCells(board: BoardState): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) count++;
    }
  }
  return count;
}

/**
 * 寻找方块在自身相对网格中的最底端单元格（行号最大，并列取最靠左者）
 * 用于引力共鸣星块落盘后将该格转化为紫色重力核心
 */
export function findBottomMostCellInPiece(shape: number[][]): { r: number; c: number } {
  let maxR = -1;
  let bestC = -1;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        if (r > maxR) {
          maxR = r;
          bestC = c;
        } else if (r === maxR && (bestC === -1 || c < bestC)) {
          bestC = c;
        }
      }
    }
  }
  return { r: Math.max(0, maxR), c: Math.max(0, bestC) };
}

/**
 * 计算单步消除对于引力共鸣蓄能槽的充能百分比增量
 */
export function calculateResonanceDelta(clearedLines: number, cascadeStep: number = 1): number {
  if (clearedLines === 0) {
    return 2.0; // 普通有效放置（未消行）
  }
  let baseDelta = 0;
  if (clearedLines === 1) {
    baseDelta = 7.0;
  } else if (clearedLines === 2) {
    baseDelta = 18.0;
  } else {
    baseDelta = 35.0; // 三行及以上
  }
  // 物理二级级联额外奖励
  if (cascadeStep > 1) {
    baseDelta += (cascadeStep - 1) * 10.0;
  }
  return baseDelta;
}

/**
 * 任务 010 统一闭环单回合得分计算公式:
 * StepScore = (BasePlacement + LinesCleared * 100 * CascadeStep) * (1 + StreakCount * 0.25) * FeverMultiplier
 */
export function calculateStepScore(
  placedBlocks: number,
  linesCleared: number,
  cascadeStep: number = 1,
  streakCount: number = 0
): number {
  const basePlacement = placedBlocks * 10;
  const lineScore = linesCleared * 100 * cascadeStep;
  const streakMultiplier = 1 + streakCount * 0.25;
  const feverMultiplier = streakCount >= 5 ? 1.5 : 1.0;

  return Math.round((basePlacement + lineScore) * streakMultiplier * feverMultiplier);
}

/**
 * 任务 010 自适应发牌器：
 * 四层过滤引擎：
 * Layer 1: 全局 28 种形态全死扫描 -> 若全死且有空格且双轨限频就绪，破格生成 1x1 Keystone
 * Layer 2: 防猝死兜底（动态衰减权重从有解集选取）
 * Layer 3: 历史同形抑制（降权最近出过的方块）
 * Layer 4: 临界行近失加权（能消行的方块权重大幅提升）
 */
export function getAdaptiveRandomPiece(
  board: BoardState,
  keystoneCooldown: number,
  keystoneUsageCount: number,
  recentBaseNames: string[] = []
): Piece {
  // 1. 扫描 28 个姿态在当前棋盘中的可行性
  const playableTemplates: (typeof PIECE_TEMPLATES)[0][] = [];
  for (const template of PIECE_TEMPLATES) {
    const dummyPiece: Piece = {
      id: 'dummy',
      name: template.name,
      shape: template.shape,
      color: template.color,
      borderColor: template.borderColor,
    };
    if (canPieceFitAnywhere(board, dummyPiece)) {
      playableTemplates.push(template);
    }
  }

  // Layer 1: 绝对死局破格救援
  const emptyCount = countEmptyCells(board);
  if (playableTemplates.length === 0 && emptyCount >= 1 && keystoneCooldown <= 0 && keystoneUsageCount < 2) {
    return createKeystonePiece();
  }

  // 若无可用且无法生成基石，保底常规随机
  if (playableTemplates.length === 0) {
    return getRandomPiece();
  }

  // Layer 2, 3, 4: 从合法候选集中加权轮盘选取
  const weightedCandidates = playableTemplates.map((tpl) => {
    let weight = 100;

    // Layer 3: 历史同形抑制（如果与最近出现的形态基础名字一致，降权 60%）
    const baseName = tpl.name.split('-')[1]; // e.g. "I", "O", "T"
    if (recentBaseNames.includes(baseName)) {
      weight *= 0.4;
    }

    // Layer 4: 近失加权（如果该方块能在棋盘上直接促成消除，提升权重）
    let canClear = false;
    const dummyPiece: Piece = {
      id: 'test',
      name: tpl.name,
      shape: tpl.shape,
      color: tpl.color,
      borderColor: tpl.borderColor,
    };

    outerLoop:
    for (let r = 0; r <= BOARD_SIZE - tpl.shape.length; r++) {
      for (let c = 0; c <= BOARD_SIZE - tpl.shape[0].length; c++) {
        if (canPlacePiece(board, dummyPiece, r, c)) {
          const sim = getSimulatedClearLines(board, dummyPiece, r, c);
          if (sim.totalLines > 0) {
            canClear = true;
            break outerLoop;
          }
        }
      }
    }

    if (canClear) {
      weight *= 1.8; // 能消行的方块权重提升 80%
    }

    return { template: tpl, weight };
  });

  // 轮盘赌抽样
  const totalWeight = weightedCandidates.reduce((acc, curr) => acc + curr.weight, 0);
  let randomRoll = Math.random() * totalWeight;
  let chosenTemplate = weightedCandidates[0].template;

  for (const item of weightedCandidates) {
    if (randomRoll <= item.weight) {
      chosenTemplate = item.template;
      break;
    }
    randomRoll -= item.weight;
  }

  return {
    name: chosenTemplate.name,
    shape: chosenTemplate.shape,
    color: chosenTemplate.color,
    borderColor: chosenTemplate.borderColor,
    id: `${chosenTemplate.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

/**
 * 任务 010 濒死拦截与就地重构（Emergency In-Place Morph）:
 * 核心安全气囊：当托盘中所有剩余方块全死时，若冷却与单局次数就绪且有空格，
 * 立即在托盘中就地重构首个死方块为 1x1 Keystone 琥珀微晶基石，逆转 Game Over！
 */
export function tryEmergencyKeystoneRescue(
  board: BoardState,
  pieces: (Piece | null)[],
  cooldown: number,
  usageCount: number
): { rescued: boolean; updatedPieces: (Piece | null)[] } {
  const availablePieces = pieces.filter((p): p is Piece => p !== null);
  if (availablePieces.length === 0) {
    return { rescued: false, updatedPieces: pieces };
  }

  const isAnyPlayable = availablePieces.some((p) => canPieceFitAnywhere(board, p));
  if (isAnyPlayable) {
    return { rescued: false, updatedPieces: pieces };
  }

  // 托盘全死！检验双轨限频与空格条件
  const emptyCells = countEmptyCells(board);
  if (emptyCells >= 1 && cooldown <= 0 && usageCount < 2) {
    const nextPieces = [...pieces];
    // 找到首个不可用的方块，就地重构为 1x1 Keystone
    const deadSlotIndex = nextPieces.findIndex((p) => p !== null);
    if (deadSlotIndex !== -1) {
      nextPieces[deadSlotIndex] = createKeystonePiece();
      return { rescued: true, updatedPieces: nextPieces };
    }
  }

  return { rescued: false, updatedPieces: pieces };
}



