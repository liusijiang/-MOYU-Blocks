import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BoardState,
  Piece,
  ActiveDragState,
  PreviewPlacement,
  EliminationPreview,
  EliminationToast,
  PlacedPieceEntity,
  UserProfile,
  ScoreRankContext,
} from './types';
import {
  createEmptyBoard,
  canPlacePiece,
  placePieceOnBoard,
  checkAndClearLines,
  canPieceFitAnywhere,
  getSimulatedClearLines,
  splitAndTrimCutEntities,
  computeGravityCascadeDrops,
  checkAndSpawnGravityBlock,
  rebuildBoardFromEntities,
} from './utils/gameLogic';
import { getRandomPiece, generateInitialPieces } from './constants/pieces';
import { Board } from './components/Board';
import { PieceTray } from './components/PieceTray';
import { DragOverlay } from './components/DragOverlay';
import { AuthModal } from './components/AuthModal';
import { RankStatusBar } from './components/RankStatusBar';
import { LeaderboardModal } from './components/LeaderboardModal';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  User,
  LogIn,
  CloudCheck,
} from 'lucide-react';
import { sound } from './utils/audio';
import {
  GRAVITY_KINETICS_CONFIG,
  calculateGravityDropDuration,
} from './constants/physicsAudioConfig';
import {
  getStoredUser,
  saveStoredUser,
  fetchScoreRankContext,
  upsertHighScore,
  saveGameProgress,
  fetchGameProgress,
  clearGameProgress,
} from './utils/memfire';

export default function App() {
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard());
  const [placedPieces, setPlacedPieces] = useState<PlacedPieceEntity[]>([]);
  const [pieces, setPieces] = useState<Piece[]>(() => generateInitialPieces(3));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('block_puzzle_best_score');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isCascading, setIsCascading] = useState<boolean>(false);
  const [isGlobalGravityPulseActive, setIsGlobalGravityPulseActive] = useState<boolean>(false);
  const [fallDuration, setFallDuration] = useState<number>(240);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearingCols, setClearingCols] = useState<number[]>([]);

  // 任务 007: 用户系统与排行榜状态
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [rankContext, setRankContext] = useState<ScoreRankContext | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Dragging and preview state
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [previewPlacement, setPreviewPlacement] = useState<PreviewPlacement | null>(null);
  const [simulatedClears, setSimulatedClears] = useState<EliminationPreview | null>(null);
  const [eliminationToast, setEliminationToast] = useState<EliminationToast | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Board reference for geometry raycasting
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Responsive discrete cell pixel size (30px on mobile, 36px on sm, 39px on md)
  const [cellPixelSize, setCellPixelSize] = useState<number>(36);

  useEffect(() => {
    const updateCellSize = () => {
      const winW = window.innerWidth;
      if (winW >= 768) {
        setCellPixelSize(39);
      } else if (winW >= 640) {
        setCellPixelSize(36);
      } else {
        setCellPixelSize(30);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  // 1. 实时获取分数在全服的排位与分差
  const refreshRankContext = useCallback(async (currentScoreVal: number) => {
    try {
      const ctx = await fetchScoreRankContext(currentScoreVal);
      setRankContext(ctx);
    } catch (err) {
      console.error('refreshRankContext err', err);
    }
  }, []);

  useEffect(() => {
    refreshRankContext(score);
  }, [score, refreshRankContext]);

  // 2. 初始挂载或用户变更时：检测云端未完成对局
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    fetchGameProgress(currentUser.id).then((progress) => {
      if (!isMounted || !progress || progress.isGameOver) return;
      if (progress.score > 0 && progress.boardData && progress.boardData.length === 10) {
        // 恢复云端进行中对局
        setBoard(progress.boardData);
        setPlacedPieces(progress.placedPieces || []);
        if (progress.currentPieces && progress.currentPieces.length > 0) {
          // 过滤掉可能存在的 null 填充
          const validPieces = progress.currentPieces.filter(Boolean) as Piece[];
          if (validPieces.length > 0) {
            setPieces(validPieces);
          }
        }
        setScore(progress.score);
        setIsCloudSynced(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // 3. 落子与重力连锁结算完全结束后 (isCascading === false)：自动将进度同步到 MemFireDB
  useEffect(() => {
    if (!currentUser || isCascading || score === 0 || gameOver) return;

    const timer = setTimeout(() => {
      saveGameProgress({
        userId: currentUser.id,
        username: currentUser.username,
        score: score,
        boardData: board,
        placedPieces: placedPieces,
        currentPieces: pieces,
        isGameOver: false,
        updatedAt: new Date().toISOString(),
      }).then((success) => {
        if (success) {
          setIsCloudSynced(true);
          setTimeout(() => setIsCloudSynced(false), 2000);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser, isCascading, score, board, placedPieces, pieces, gameOver]);

  // Update high score & Sync to MemFireDB Leaderboard
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('block_puzzle_best_score', score.toString());
      if (currentUser) {
        upsertHighScore(currentUser.id, currentUser.username, score);
      }
    }
  }, [score, bestScore, currentUser]);

  // Selected piece derived from selectedSlotIndex
  const selectedPiece =
    selectedSlotIndex !== null && pieces[selectedSlotIndex]
      ? pieces[selectedSlotIndex]
      : null;

  // Check if any of the candidate pieces can fit anywhere on board
  const checkGameOver = useCallback(
    (currentBoard: BoardState, candidatePieces: Piece[]) => {
      const hasAnyMove = candidatePieces.some((piece) =>
        canPieceFitAnywhere(currentBoard, piece)
      );
      return !hasAnyMove;
    },
    []
  );

  // Raycasting helper: calculates board (row, col) from pointer coordinates
  const calculateBoardTarget = useCallback(
    (clientX: number, clientY: number, anchorX: number, anchorY: number, piece: Piece) => {
      if (!boardRef.current) return null;

      const boardRect = boardRef.current.getBoundingClientRect();
      const currentCellSize = cellPixelSize;

      const pieceLeft = clientX - anchorX;
      const pieceTop = clientY - anchorY;

      const relX = pieceLeft - boardRect.left;
      const relY = pieceTop - boardRect.top;

      const col = Math.round(relX / currentCellSize);
      const row = Math.round(relY / currentCellSize);

      // Check proximity to board
      const pieceRows = piece.shape.length;
      const pieceCols = piece.shape[0].length;

      const isNearby =
        row >= -1 &&
        row <= 10 - pieceRows + 1 &&
        col >= -1 &&
        col <= 10 - pieceCols + 1;

      if (!isNearby) {
        return null;
      }

      const isValid = canPlacePiece(board, piece, row, col);
      return { row, col, isValid };
    },
    [board, cellPixelSize]
  );

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Place piece logic and immediate slot refill with Gravity Debris & Gravity Block Cascade
  const executePlacePiece = useCallback(
    async (piece: Piece, slotIndex: number, row: number, col: number) => {
      if (gameOver || isCascading) return;

      if (!canPlacePiece(board, piece, row, col)) {
        return;
      }

      setIsCascading(true);

      try {
        // 1. Calculate placed blocks count
        const placedBlocks = piece.shape.flat().filter((v) => v === 1).length;

        // Immediate tactile placement snap sound (T=0ms) - plays for EVERY piece placement!
        sound.playPiecePlaced(placedBlocks);

        // 2. Put piece on board
        const boardWithPiece = placePieceOnBoard(board, piece, row, col);

        // Construct placed entity
        const newEntity: PlacedPieceEntity = {
          id: `${piece.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          color: piece.color,
          startRow: row,
          startCol: col,
          shape: piece.shape.map((r) => [...r]),
          isDebris: false,
          isGravityBlock: false,
        };
        let currentEntities: PlacedPieceEntity[] = [...placedPieces, newEntity];

        // 3. Immediately refill ONLY this placed piece's slot!
        const nextPieces = [...pieces];
        nextPieces[slotIndex] = getRandomPiece();
        setPieces(nextPieces);

        // Reset selection and previews
        setSelectedSlotIndex(null);
        setActiveDrag(null);
        setPreviewPlacement(null);
        setSimulatedClears(null);

        // Render placed piece immediately
        setPlacedPieces(currentEntities);
        setBoard(boardWithPiece);

        let currentBoard = boardWithPiece;
        let cascadeStep = 1;
        let hasMoreCascade = true;

        while (hasMoreCascade && cascadeStep <= 10) {
          // 4. Check line eliminations
          const { clearedRows, clearedCols, totalLines } = checkAndClearLines(currentBoard);

          if (totalLines === 0) {
            // If no lines cleared at all on initial drop
            if (cascadeStep === 1) {
              setScore((prev) => prev + placedBlocks);
            }
            break;
          }

          // Check if any existing 1x1 Gravity Block on board was eliminated
          const clearedGravityCores = currentEntities.filter(
            (e) =>
              e.isGravityBlock &&
              (clearedRows.includes(e.startRow) || clearedCols.includes(e.startCol))
          );
          const isGlobalSurge = clearedGravityCores.length > 0;

          // Check if this step qualifies for spawning a new 1x1 Gravity Block
          // Rule: 2+ rows, or 2+ cols, or 1+ row AND 1+ col
          const spawnedGravityBlock = checkAndSpawnGravityBlock(
            currentBoard,
            clearedRows,
            clearedCols
          );

          // Calculate score
          const stepScore = totalLines * 100 * totalLines * cascadeStep;
          setScore((prev) => prev + stepScore + (cascadeStep === 1 ? placedBlocks : 0));

          // Audio & Notification Toast
          let toastTitle = '';
          if (isGlobalSurge) {
            sound.playGlobalGravityPulse();
            toastTitle = `引力核心引爆! 全局碎片重力触发 (+${stepScore})`;
          } else if (cascadeStep > 1) {
            sound.playCascadeCombo(cascadeStep);
            toastTitle = `连环消除 x${cascadeStep}! 重力连锁 (+${stepScore})`;
          } else {
            sound.playDebrisFracture();
            if (clearedRows.length > 0 && clearedCols.length > 0) {
              toastTitle = `横纵连消 (+${totalLines}线)!`;
            } else if (totalLines >= 3) {
              toastTitle = `三线连消 (+${totalLines}线)!`;
            } else if (totalLines === 2) {
              toastTitle = `双线同消 (+2线)!`;
            } else {
              toastTitle = clearedRows.length > 0 ? '消除 1 行' : '消除 1 列';
            }
          }

          const toastId = `${Date.now()}_${Math.random()}`;
          setEliminationToast({
            id: toastId,
            title: toastTitle,
            scoreBonus: stepScore,
            totalLines,
          });

          // Automatically dismiss toast after 2 seconds
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          toastTimeoutRef.current = setTimeout(() => {
            setEliminationToast(null);
          }, 2000);

          // Line elimination flash (220ms)
          setClearingRows(clearedRows);
          setClearingCols(clearedCols);
          if (isGlobalSurge) {
            setIsGlobalGravityPulseActive(true);
          }

          await sleep(220);

          setClearingRows([]);
          setClearingCols([]);
          if (isGlobalSurge) {
            setTimeout(() => setIsGlobalGravityPulseActive(false), 500);
          }

          // 5. BFS topological cutting into 4-connected components & debris
          const { remainingEntities, newlyCreatedDebrisIds } = splitAndTrimCutEntities(
            currentEntities,
            clearedRows,
            clearedCols
          );

          let postCutEntities = remainingEntities;
          if (spawnedGravityBlock) {
            postCutEntities = [...postCutEntities, spawnedGravityBlock];
            sound.playGravityBlockSpawn();
          }

          currentBoard = rebuildBoardFromEntities(postCutEntities);
          currentEntities = postCutEntities;
          setPlacedPieces(currentEntities);
          setBoard(currentBoard);

          // Anticipation Hang-Time (110ms):
          // Let the player visually register the cut debris suspended in mid-air before plunging!
          await sleep(GRAVITY_KINETICS_CONFIG.anticipationHangTimeMs);

          // 6. Determine which debris should fall
          let targetDebrisIds: Set<string>;
          if (isGlobalSurge) {
            // Global surge: ALL debris + any gravity blocks on board drop
            targetDebrisIds = new Set(
              currentEntities
                .filter((e) => e.isDebris || e.isGravityBlock)
                .map((e) => e.id)
            );
          } else {
            // Local surge: newly created debris + any gravity blocks that may be floating
            targetDebrisIds = new Set([
              ...newlyCreatedDebrisIds,
              ...currentEntities.filter((e) => e.isGravityBlock).map((e) => e.id),
            ]);
          }

          if (targetDebrisIds.size === 0) {
            break;
          }

          // Compute gravity cascade drops
          const dropResult = computeGravityCascadeDrops(
            currentBoard,
            currentEntities,
            targetDebrisIds
          );

          if (!dropResult.hasMovement) {
            // Everything has settled
            break;
          }

          // Calculate dynamic fall duration based on the max drop distance
          const dropDuration = calculateGravityDropDuration(dropResult.maxDistance);
          setFallDuration(dropDuration);

          // Debris falling sound with steep downward exponential ramp
          sound.playDebrisFalling();

          // Apply updated positions (triggers smooth CSS vertical glide with Ease-In gravity curve)
          setPlacedPieces(dropResult.updatedEntities);
          setBoard(dropResult.updatedBoard);
          currentEntities = dropResult.updatedEntities;
          currentBoard = dropResult.updatedBoard;

          // Wait for dynamic fall animation to reach ground
          await sleep(dropDuration);

          // Landing impact thud
          sound.playDebrisLanding(dropResult.maxDistance);

          // Settle pause before next cascade step check
          await sleep(GRAVITY_KINETICS_CONFIG.settlePauseMs);

          // Next cascade step to check if settled debris formed new full lines
          cascadeStep++;
        }

        // Final sync
        setPlacedPieces(currentEntities);
        setBoard(currentBoard);

        // Check game over
        if (checkGameOver(currentBoard, nextPieces)) {
          setGameOver(true);
        }
      } finally {
        setIsCascading(false);
      }
    },
    [board, gameOver, isCascading, pieces, placedPieces, checkGameOver]
  );

  // Setup active pointer drag
  const handlePointerStartDrag = (
    piece: Piece,
    slotIndex: number,
    clientX: number,
    clientY: number,
    isTouch: boolean
  ) => {
    if (gameOver || isCascading) return;

    // Piece dimensions in 1:1 board cell size
    const pieceWidth = piece.shape[0].length * cellPixelSize;
    const pieceHeight = piece.shape.length * cellPixelSize;

    // Anchor: center on mouse; on touch, lift up by 55px to avoid finger occlusion
    const anchorX = pieceWidth / 2;
    const anchorY = isTouch ? pieceHeight + 50 : pieceHeight / 2;

    const initialDrag: ActiveDragState = {
      piece,
      slotIndex,
      currentX: clientX,
      currentY: clientY,
      startX: clientX,
      startY: clientY,
      anchorX,
      anchorY,
      isTouch,
    };

    setActiveDrag(initialDrag);

    // Initial raycast
    const target = calculateBoardTarget(clientX, clientY, anchorX, anchorY, piece);
    setPreviewPlacement(target);
    if (target && target.isValid) {
      const sim = getSimulatedClearLines(board, piece, target.row, target.col);
      setSimulatedClears(sim.totalLines > 0 ? sim : null);
    } else {
      setSimulatedClears(null);
    }
  };

  // Global window listeners for follow-hand dragging
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      // High-frequency follow-hand update
      setActiveDrag((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
        };
      });

      // Update board geometric projection
      const target = calculateBoardTarget(
        e.clientX,
        e.clientY,
        activeDrag.anchorX,
        activeDrag.anchorY,
        activeDrag.piece
      );
      setPreviewPlacement(target);

      // Pre-placement elimination preview
      if (target && target.isValid) {
        const sim = getSimulatedClearLines(
          board,
          activeDrag.piece,
          target.row,
          target.col
        );
        setSimulatedClears(sim.totalLines > 0 ? sim : null);
      } else {
        setSimulatedClears(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const movedDistance = Math.hypot(
        e.clientX - activeDrag.startX,
        e.clientY - activeDrag.startY
      );

      // If user tapped/clicked without substantial movement (< 6px), toggle selection
      if (movedDistance < 6) {
        setSelectedSlotIndex((prev) =>
          prev === activeDrag.slotIndex ? null : activeDrag.slotIndex
        );
        setActiveDrag(null);
        setPreviewPlacement(null);
        setSimulatedClears(null);
        return;
      }

      // Check drop target
      const target = calculateBoardTarget(
        e.clientX,
        e.clientY,
        activeDrag.anchorX,
        activeDrag.anchorY,
        activeDrag.piece
      );

      if (target && target.isValid) {
        // Successful drop!
        executePlacePiece(
          activeDrag.piece,
          activeDrag.slotIndex,
          target.row,
          target.col
        );
      }

      setActiveDrag(null);
      setPreviewPlacement(null);
      setSimulatedClears(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, board, calculateBoardTarget, executePlacePiece]);

  // Click-to-place fallback from selection
  const handleBoardCellClick = (r: number, c: number) => {
    if (gameOver || isCascading) return;
    if (selectedPiece && selectedSlotIndex !== null) {
      if (canPlacePiece(board, selectedPiece, r, c)) {
        executePlacePiece(selectedPiece, selectedSlotIndex, r, c);
      }
    }
  };

  // Hover update when in click-to-place mode
  const handleBoardHover = (pos: { row: number; col: number } | null) => {
    if (activeDrag || isCascading) return; // Dragging or cascade in progress
    if (!selectedPiece || !pos) {
      setPreviewPlacement(null);
      setSimulatedClears(null);
      return;
    }

    const isValid = canPlacePiece(board, selectedPiece, pos.row, pos.col);
    setPreviewPlacement({ row: pos.row, col: pos.col, isValid });

    if (isValid) {
      const sim = getSimulatedClearLines(board, selectedPiece, pos.row, pos.col);
      setSimulatedClears(sim.totalLines > 0 ? sim : null);
    } else {
      setSimulatedClears(null);
    }
  };

  // Reset the game
  const handleRestart = () => {
    const freshBoard = createEmptyBoard();
    const freshPieces = generateInitialPieces(3);
    setBoard(freshBoard);
    setPlacedPieces([]);
    setPieces(freshPieces);
    setSelectedSlotIndex(null);
    setActiveDrag(null);
    setPreviewPlacement(null);
    setSimulatedClears(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setEliminationToast(null);
    setScore(0);
    setGameOver(false);
    setIsCascading(false);
    setIsGlobalGravityPulseActive(false);
    setClearingRows([]);
    setClearingCols([]);

    if (currentUser) {
      clearGameProgress(currentUser.id);
    }
  };

  return (
    <div
      id="game-root"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-3 sm:p-6 select-none overflow-hidden"
    >
      {/* Top Header / Score Bar */}
      <header className="w-full max-w-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                摸鱼方块
              </h1>
              {isCloudSynced && (
                <span
                  title="对局进度已自动同步至云端"
                  className="flex items-center space-x-0.5 text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 animate-fade-in"
                >
                  <CloudCheck className="w-3 h-3" />
                  <span>已存档</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 用户登录 / 个人中心按钮 */}
            <button
              id="user-auth-btn"
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title={currentUser ? `已登录: ${currentUser.username}` : '登录 / 注册'}
            >
              {currentUser ? (
                <>
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="max-w-[70px] truncate text-emerald-300 font-semibold">
                    {currentUser.username}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">登录</span>
                </>
              )}
            </button>

            <button
              id="sound-toggle-btn"
              type="button"
              onClick={() => {
                const next = sound.toggleMute();
                setIsMuted(next);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition cursor-pointer"
              title={isMuted ? '开启音效' : '静音'}
              aria-label={isMuted ? '开启音效' : '静音'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <button
              id="restart-btn"
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition cursor-pointer"
              title="重新开始"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置</span>
            </button>
          </div>
        </div>

        {/* Score Counters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">当前得分</span>
            <span id="current-score" className="text-lg font-bold text-emerald-400">
              {score}
            </span>
          </div>

          <div
            onClick={() => setIsLeaderboardModalOpen(true)}
            className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 hover:bg-slate-850 hover:border-amber-500/40 rounded-xl border border-slate-800 cursor-pointer transition-colors"
            title="点击查看全服排行榜"
          >
            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>最高纪录</span>
            </div>
            <span id="best-score" className="text-lg font-bold text-amber-400">
              {bestScore}
            </span>
          </div>
        </div>

        {/* 任务 007: 实时全服差距看板 */}
        <RankStatusBar
          score={score}
          rankContext={rankContext}
          onOpenLeaderboard={() => setIsLeaderboardModalOpen(true)}
          username={currentUser?.username}
        />
      </header>

      {/* Main Board Area (Strictly stabilized & pinned) */}
      <main className="relative my-auto flex flex-col items-center justify-center">
        <Board
          board={board}
          placedPieces={placedPieces}
          selectedPiece={selectedPiece}
          activeDragPiece={activeDrag?.piece ?? null}
          previewPlacement={previewPlacement}
          simulatedClears={simulatedClears}
          eliminationToast={eliminationToast}
          onPlacePiece={handleBoardCellClick}
          onCellHover={handleBoardHover}
          clearingRows={clearingRows}
          clearingCols={clearingCols}
          boardRef={boardRef}
          cellPixelSize={cellPixelSize}
          isGlobalGravityPulseActive={isGlobalGravityPulseActive}
          fallDuration={fallDuration}
        />

        {/* Game Over Dialog Overlay */}
        {gameOver && (
          <div
            id="game-over-modal"
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl p-6 text-center z-40 border border-slate-800 animate-fade-in"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">游戏结束</h2>
            <p className="text-xs text-slate-400 mb-4">当前候选积木均无法放入棋盘</p>
            <div className="text-2xl font-extrabold text-emerald-400 mb-2">
              最终得分: {score}
            </div>
            {rankContext && (
              <div className="text-xs text-amber-300 font-medium mb-5">
                全服预估排位: #{rankContext.currentRank}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsLeaderboardModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition"
              >
                查看排行榜
              </button>
              <button
                id="game-over-restart-btn"
                type="button"
                onClick={handleRestart}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                重新开始
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Pieces Tray (Instant Continuous Refill) */}
      <footer className="w-full flex flex-col items-center">
        <div className="text-xs text-slate-400 mb-1 text-center font-medium">
          {isCascading
            ? '重力连锁结算中...'
            : activeDrag
            ? '拖动至棋盘空白处松开放置'
            : selectedPiece
            ? '已选中积木，点击棋盘空白处放置'
            : '按住拖动或点击选择积木'}
        </div>
        <PieceTray
          pieces={pieces}
          selectedPiece={selectedPiece}
          onSelectPiece={(_p, slotIndex) =>
            setSelectedSlotIndex((prev) => (prev === slotIndex ? null : slotIndex))
          }
          onPointerStartDrag={handlePointerStartDrag}
          board={board}
          activeDragSlotIndex={activeDrag?.slotIndex ?? null}
          disabled={isCascading}
        />
      </footer>

      {/* High performance 120fps hardware-accelerated drag overlay */}
      <DragOverlay dragState={activeDrag} cellPixelSize={cellPixelSize} />

      {/* 任务 007: 模态弹窗系统 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveStoredUser(user);
        }}
        onLogout={() => {
          setCurrentUser(null);
          saveStoredUser(null);
        }}
      />

      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        currentUserId={currentUser?.id}
        currentScore={score}
      />
    </div>
  );
}
