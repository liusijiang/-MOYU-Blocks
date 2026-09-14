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
  SingularityCrossPreviewState,
  AudioPreferences,
  BGMRuntimeState,
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
  calculateSingularityCrossBlast,
  computeSingularityCrosshairPreview,
  computeStructuralSupportDrops,
  checkAndSpawnGravityBlock,
  rebuildBoardFromEntities,
  getAdaptiveRandomPiece,
  calculateResonanceDelta,
  calculateStepScore,
  findBottomMostCellInPiece,
} from './utils/gameLogic';
import {
  getRandomPiece,
  generateInitialPieces,
  GRAVITY_BLOCK_COLOR,
} from './constants/pieces';
import { Board } from './components/Board';
import { PieceTray } from './components/PieceTray';
import { DragOverlay } from './components/DragOverlay';
import { ComboBadge } from './components/ComboBadge';
import { ResonanceBar } from './components/ResonanceBar';
import { AuthModal } from './components/AuthModal';
import { RankStatusBar } from './components/RankStatusBar';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import {
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Sliders,
  Music,
  User,
  LogIn,
  CloudCheck,
  Crown,
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
  const [shatterShockwaveCenters, setShatterShockwaveCenters] = useState<Array<{ row: number; col: number }>>([]);
  const [singularityBlastCenter, setSingularityBlastCenter] = useState<{ row: number; col: number } | null>(null);
  const [singularityCrossPreview, setSingularityCrossPreview] = useState<SingularityCrossPreviewState | null>(null);
  const [fallDuration, setFallDuration] = useState<number>(240);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearingCols, setClearingCols] = useState<number[]>([]);

  // 任务 018: 自适应音频与多总线偏好状态
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>(() =>
    sound.getPreferences()
  );
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [bgmRuntime, setBgmRuntime] = useState<BGMRuntimeState>(() =>
    sound.getBGMRuntimeState()
  );

  // 任务 007: 用户系统与排行榜状态
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [rankContext, setRankContext] = useState<ScoreRankContext | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // 任务 010: 跨步连击、引力共鸣与自适应微晶基石状态
  const [streakCount, setStreakCount] = useState<number>(0);
  const [comboShield, setComboShield] = useState<boolean>(true);
  const [consecutiveClears, setConsecutiveClears] = useState<number>(0);
  const [resonanceEnergy, setResonanceEnergy] = useState<number>(0);
  const [keystoneCooldownSteps, setKeystoneCooldownSteps] = useState<number>(0);
  const [keystoneUsageCount, setKeystoneUsageCount] = useState<number>(0);
  const [recentShapes, setRecentShapes] = useState<string[]>([]);

  // 监听浏览器用户手势以激活 AudioContext (Autoplay Policy)
  useEffect(() => {
    const handleFirstGesture = () => {
      sound.resumeContext();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // 游戏核心态势与自适应 BGM 引擎联动 (连击数、共鸣槽能量、游戏结束)
  useEffect(() => {
    sound.updateGameState(streakCount, resonanceEnergy, gameOver);
    setBgmRuntime(sound.getBGMRuntimeState());
  }, [streakCount, resonanceEnergy, gameOver]);

  // 当音频浮层打开时，定时刷新 BGM 运行时态（和弦/BPM/层增益）
  useEffect(() => {
    if (!isAudioModalOpen) return;
    const interval = setInterval(() => {
      setBgmRuntime(sound.getBGMRuntimeState());
    }, 400);
    return () => clearInterval(interval);
  }, [isAudioModalOpen]);

  const handleUpdateAudioPreferences = useCallback(
    (partial: Partial<AudioPreferences>) => {
      sound.updatePreferences(partial);
      const updated = sound.getPreferences();
      setAudioPreferences(updated);
      setIsMuted(updated.bgmMuted && updated.sfxMuted);
      setBgmRuntime(sound.getBGMRuntimeState());
    },
    []
  );

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

  // Responsive discrete cell pixel size (24px ~ 30px on mobile In-App WebViews, 36px on sm, 39px on md/desktop)
  const [cellPixelSize, setCellPixelSize] = useState<number>(30);

  useEffect(() => {
    const updateCellSize = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // 1. 宽屏 / 桌面 / 平板（且纵向空间充足）
      if (winW >= 768 && winH >= 760) {
        setCellPixelSize(39);
        return;
      }
      if (winW >= 640 && winH >= 660) {
        setCellPixelSize(36);
        return;
      }

      // 2. 移动端与 In-App WebView（微信/QQ/小红书/抖音等内置视口）
      // 水平方向最大可用尺寸（留出两侧 padding）
      const maxAllowedByWidth = Math.floor((winW - 20) / 10);

      // 垂直高度自适应预算，确保在不同宿主视口下底部均有 130px ~ 200px 的健康留白
      let maxAllowedByHeight = 30;
      if (winH < 540) {
        // 极矮屏（如带三大物理金刚键或聊天窗口顶底双栏）：单元格 24px（棋盘 240px，总高约 370px）
        maxAllowedByHeight = 24;
      } else if (winH < 620) {
        // 典型微信内置视口（~600px）：单元格 26px（棋盘 260px，总高约 400px，留白 200px）
        maxAllowedByHeight = 26;
      } else if (winH < 720) {
        // 中度视口：单元格 28px
        maxAllowedByHeight = 28;
      }

      const finalSize = Math.min(maxAllowedByWidth, maxAllowedByHeight, 30);
      setCellPixelSize(Math.max(22, finalSize));
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

  // Check if any of the candidate pieces can fit anywhere on board (Game Over if none can fit)
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
        const isResonancePiece = Boolean(piece.isResonancePiece);
        const isKeystonePiece = Boolean(piece.isKeystone);

        // 1. Calculate placed blocks count
        const placedBlocks = piece.shape.flat().filter((v) => v === 1).length;

        // Immediate tactile placement snap sound (T=0ms) - plays for EVERY piece placement with spatial panner!
        const pieceCenterCol = col + (piece.shape[0].length - 1) / 2;
        sound.playPiecePlaced(placedBlocks, pieceCenterCol);

        if (isKeystonePiece) {
          setKeystoneCooldownSteps(15);
          setKeystoneUsageCount((prev) => prev + 1);
          sound.playKeystoneSpawnSound();
        }

        // 2. Put piece on board
        let boardWithPiece = placePieceOnBoard(board, piece, row, col);

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

        // 任务 013/014: 引力星块「落盘即爆」（Impact Detonation）核心机制
        let singularityBlast: {
          blastRows: number[];
          blastCols: number[];
          impactCells: Array<{ r: number; c: number }>;
        } | null = null;

        if (isResonancePiece) {
          const bottomCell = findBottomMostCellInPiece(piece.shape);
          const coreRow = row + bottomCell.r;
          const coreCol = col + bottomCell.c;
          newEntity.shape[bottomCell.r][bottomCell.c] = 0; // 从母体剥离该单元格
          boardWithPiece[coreRow][coreCol] = GRAVITY_BLOCK_COLOR;

          const resonanceGravityCoreEntity: PlacedPieceEntity = {
            id: `resonance_core_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            color: GRAVITY_BLOCK_COLOR,
            startRow: coreRow,
            startCol: coreCol,
            shape: [[1]],
            isDebris: false,
            isGravityBlock: true,
          };
          currentEntities.push(resonanceGravityCoreEntity);

          // 奇点落盘触碰瞬间，立刻引爆十字等离子贯穿冲击波！
          singularityBlast = calculateSingularityCrossBlast(coreRow, coreCol);
          sound.playSingularityBurstSound(coreCol);
          setSingularityBlastCenter({ row: coreRow, col: coreCol });
          setTimeout(() => setSingularityBlastCenter(null), 450);
          setResonanceEnergy(0);
        }

        // 3. Immediately refill ONLY this placed piece's slot using Task 010 adaptive engine!
        const nextPieces = [...pieces];
        const generatedPiece = getAdaptiveRandomPiece(
          boardWithPiece,
          keystoneCooldownSteps,
          keystoneUsageCount,
          recentShapes
        );
        nextPieces[slotIndex] = generatedPiece;
        setRecentShapes((prev) => [generatedPiece.name.split('-')[1], ...prev].slice(0, 3));
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
        let totalClearedInTurn = 0;
        let maxCascadeStep = 1;
        let hasTriggeredShatterInTurn = false;
        let isGlobalGravityUnlocked = false;

        while (hasMoreCascade && cascadeStep <= 10) {
          // 4. Check line eliminations
          const scanResult = checkAndClearLines(currentBoard);
          let clearedRows = [...scanResult.clearedRows];
          let clearedCols = [...scanResult.clearedCols];

          // 任务 013/014: 若为引力星块，首轮必出十字全线贯穿消解
          if (cascadeStep === 1 && singularityBlast) {
            clearedRows = Array.from(new Set([...clearedRows, ...singularityBlast.blastRows]));
            clearedCols = Array.from(new Set([...clearedCols, ...singularityBlast.blastCols]));
          }

          const totalLines = clearedRows.length + clearedCols.length;

          if (totalLines === 0) {
            // If no lines cleared at all on initial drop
            if (cascadeStep === 1) {
              const placementScore = calculateStepScore(placedBlocks, 0, 1, streakCount);
              setScore((prev) => prev + placementScore);
            }
            break;
          }

          totalClearedInTurn += totalLines;
          maxCascadeStep = Math.max(maxCascadeStep, cascadeStep);

          // Check if any 1x1 Gravity Block on board was eliminated or singularity center triggered
          const clearedGravityCores = currentEntities.filter(
            (e) =>
              e.isGravityBlock &&
              (clearedRows.includes(e.startRow) || clearedCols.includes(e.startCol))
          );
          const hasShatterShockwave = clearedGravityCores.length > 0 || (cascadeStep === 1 && Boolean(singularityBlast));
          if (hasShatterShockwave) {
            hasTriggeredShatterInTurn = true;
          }
          const shatterCenters = clearedGravityCores.map((c) => ({
            row: c.startRow,
            col: c.startCol,
          }));
          if (cascadeStep === 1 && singularityBlast && shatterCenters.length === 0) {
            shatterCenters.push({
              row: singularityBlast.blastRows[0],
              col: singularityBlast.blastCols[0],
            });
          }

          // 🌟 任务 013/014 核心雪崩引信阈值跃迁：
          // 若本回合触发过 5x5 引力核心裂变震碎，且后续步骤（cascadeStep > 1）碎石沉降激发了任意新的消行（totalLines >= 1），
          // 全局重力大雪崩 100% 确定性解锁！
          if (hasTriggeredShatterInTurn && cascadeStep > 1 && totalLines >= 1) {
            isGlobalGravityUnlocked = true;
          }

          // Check if this step qualifies for spawning a new 1x1 Gravity Block
          // Rule: 2+ rows, or 2+ cols, or 1+ row AND 1+ col
          const spawnedGravityBlock = checkAndSpawnGravityBlock(
            currentBoard,
            clearedRows,
            clearedCols
          );

          // Calculate score using Task 010 unified closed-loop formula + Task 013/014 Singularity Bonus
          let stepScore = calculateStepScore(
            cascadeStep === 1 ? placedBlocks : 0,
            totalLines,
            cascadeStep,
            streakCount
          );
          if (cascadeStep === 1 && isResonancePiece) {
            stepScore += 300; // 奇点十字大招奖励
          }
          setScore((prev) => prev + stepScore);

          // Audio & Notification Toast
          let toastTitle = '';
          if (cascadeStep === 1 && isResonancePiece) {
            toastTitle = `⚡ 引力奇点坍缩! 十字引力波贯穿爆破 (+${stepScore})`;
          } else if (hasShatterShockwave) {
            sound.playGlobalGravityPulse();
            sound.playDebrisFracture();
            toastTitle = `引力核心震碎! 5x5区域积木崩落 (+${stepScore})`;
          } else if (isGlobalGravityUnlocked) {
            sound.playGlobalGravityPulse();
            sound.playCascadeCombo(cascadeStep);
            setIsGlobalGravityPulseActive(true);
            setTimeout(() => setIsGlobalGravityPulseActive(false), 550);
            toastTitle = `⚡ 引力共振过载! 全场积木大雪崩 x${cascadeStep} (+${stepScore})`;
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
          if (hasShatterShockwave) {
            setShatterShockwaveCenters(shatterCenters);
          }

          await sleep(220);

          setClearingRows([]);
          setClearingCols([]);
          if (hasShatterShockwave) {
            setTimeout(() => setShatterShockwaveCenters([]), 450);
          }

          // 5. BFS topological cutting into 4-connected components & debris, plus 5x5 shockwave shattering
          const { remainingEntities } = splitAndTrimCutEntities(
            currentEntities,
            clearedRows,
            clearedCols,
            shatterCenters
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

          // Anticipation Hang-Time (110ms)
          await sleep(GRAVITY_KINETICS_CONFIG.anticipationHangTimeMs);

          // 6. 任务 013/014: 真实支撑力结构沉降系统与全局重力大雪崩
          // 彻底摒弃以往“未被切碎的俄罗斯方块反重力悬空钉在天花板”的缺陷！
          // 自底向上光线投影算法 computeStructuralSupportDrops 精确检测全场每个积木实体：
          // 如果承重柱被拆除（下方被掏空，无任何支撑物），方块整体遵循牛顿物理垂直滑落，
          // 有支撑物的方块则稳稳维持原有形态。
          const dropResult = computeStructuralSupportDrops(
            currentBoard,
            currentEntities
          );

          if (!dropResult.hasMovement) {
            // 全场势能已平衡，无任何实体下落
            break;
          }

          // Calculate dynamic fall duration based on the max drop distance
          const dropDuration = calculateGravityDropDuration(dropResult.maxDistance);
          setFallDuration(dropDuration);

          // Debris falling sound
          sound.playDebrisFalling();

          // Apply updated positions
          setPlacedPieces(dropResult.updatedEntities);
          setBoard(dropResult.updatedBoard);
          currentEntities = dropResult.updatedEntities;
          currentBoard = dropResult.updatedBoard;

          // Wait for dynamic fall animation to reach ground
          await sleep(dropDuration);

          // Landing impact thud (增强真实实体落地厚重撞击声)
          sound.playStructuralThudSound(dropResult.maxDistance);

          // Settle pause before next cascade step check
          await sleep(GRAVITY_KINETICS_CONFIG.settlePauseMs);

          // Next cascade step
          cascadeStep++;
        }

        // Final sync
        setPlacedPieces(currentEntities);
        setBoard(currentBoard);

        // 任务 010: 回合平息后连击与护盾收敛结算
        if (!isKeystonePiece) {
          setKeystoneCooldownSteps((prev) => Math.max(0, prev - 1));
        }

        let nextStreak = streakCount;
        if (totalClearedInTurn > 0) {
          nextStreak = streakCount + 1;
          setStreakCount(nextStreak);
          const nextConsecutive = consecutiveClears + 1;
          setConsecutiveClears(nextConsecutive);

          if (nextConsecutive >= 2 && !comboShield) {
            setComboShield(true);
            sound.playShieldRestoredSound();
          }
          sound.playStreakSound(nextStreak);
        } else {
          setConsecutiveClears(0);
          if (comboShield) {
            // 护盾消耗，保住连击数！
            setComboShield(false);
            sound.playShieldBreakSound();
          } else {
            // 护盾已破且再次未消行，连击归零
            nextStreak = 0;
            setStreakCount(0);
          }
        }

        // 任务 010: 引力共鸣槽蓄能增量与原位附魔
        if (!isResonancePiece) {
          const delta = calculateResonanceDelta(totalClearedInTurn, maxCascadeStep);
          const nextEnergy = Math.min(100, resonanceEnergy + delta);
          setResonanceEnergy(nextEnergy);

          if (nextEnergy >= 100) {
            const targetIdx = nextPieces.findIndex(
              (p) => p !== null && !p.isResonancePiece && !p.isKeystone
            );
            if (targetIdx !== -1) {
              nextPieces[targetIdx] = {
                ...nextPieces[targetIdx]!,
                isResonancePiece: true,
              };
              sound.playShieldRestoredSound();
              setEliminationToast({
                id: `resonance_morph_${Date.now()}`,
                title: '引力共鸣100%! 首块蜕变为引力星块!',
                scoreBonus: 0,
                totalLines: 0,
              });
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = setTimeout(() => {
                setEliminationToast(null);
              }, 3000);
            }
          }
        }
        setPieces(nextPieces);

        // Check game over (with emergency keystone rescue)
        if (checkGameOver(currentBoard, nextPieces)) {
          setGameOver(true);
        }
      } finally {
        setIsCascading(false);
      }
    },
    [
      board,
      gameOver,
      isCascading,
      pieces,
      placedPieces,
      checkGameOver,
      streakCount,
      comboShield,
      consecutiveClears,
      resonanceEnergy,
      keystoneCooldownSteps,
      keystoneUsageCount,
      recentShapes,
    ]
  );

  // 任务 016: 引力奇点十字瞄准预览与音效联动计算
  const updateSingularityCrossPreview = useCallback(
    (piece: Piece | null, target: PreviewPlacement | null) => {
      if (!piece || !piece.isResonancePiece || !target) {
        setSingularityCrossPreview(null);
        return;
      }

      const preview = computeSingularityCrosshairPreview(
        board,
        piece,
        target.row,
        target.col,
        placedPieces,
        target.isValid
      );
      setSingularityCrossPreview(preview);

      // 任务 016 音效：准星瞄准微动刻度音
      sound.playCrosshairAimTick(target.isValid);
      // 扫过场上连锁引力核心时触发高能锁定蜂鸣
      if (preview.chainedGravityCores.length > 0) {
        sound.playChainedCoreLockAlert();
      }
    },
    [board, placedPieces]
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

    // Anchor: center on mouse; on touch, lift up by 68px to avoid finger occlusion (任务 016 规范)
    const anchorX = pieceWidth / 2;
    const anchorY = isTouch ? pieceHeight + 68 : pieceHeight / 2;

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

    // 抓取引力星块即刻触发引力充能低鸣
    if (piece.isResonancePiece) {
      sound.playSingularityChargeWhine();
    }

    // Initial raycast
    const target = calculateBoardTarget(clientX, clientY, anchorX, anchorY, piece);
    setPreviewPlacement(target);
    updateSingularityCrossPreview(piece, target);

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
      updateSingularityCrossPreview(activeDrag.piece, target);

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
        setSingularityCrossPreview(null);
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
      setSingularityCrossPreview(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, board, calculateBoardTarget, executePlacePiece, updateSingularityCrossPreview]);

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
      setSingularityCrossPreview(null);
      return;
    }

    const isValid = canPlacePiece(board, selectedPiece, pos.row, pos.col);
    const target = { row: pos.row, col: pos.col, isValid };
    setPreviewPlacement(target);
    updateSingularityCrossPreview(selectedPiece, target);

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
    setSingularityCrossPreview(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setEliminationToast(null);
    setScore(0);
    setGameOver(false);
    setIsCascading(false);
    setIsGlobalGravityPulseActive(false);
    setShatterShockwaveCenters([]);
    setSingularityBlastCenter(null);
    setClearingRows([]);
    setClearingCols([]);

    // 任务 010 状态重置
    setStreakCount(0);
    setComboShield(true);
    setConsecutiveClears(0);
    setResonanceEnergy(0);
    setKeystoneCooldownSteps(0);
    setKeystoneUsageCount(0);
    setRecentShapes([]);

    if (currentUser) {
      clearGameProgress(currentUser.id);
    }
  };

  return (
    <div
      id="game-root"
      className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start pt-1 pb-[env(safe-area-inset-bottom,16px)] px-2 sm:px-4 select-none overflow-hidden touch-none"
    >
      {/* Top Header / Score & Rank Micro Bar */}
      <header className="w-full max-w-[340px] sm:max-w-md flex flex-col gap-1.5 z-20">
        {/* Row 1: Title & Action Controls */}
        <div className="flex items-center justify-between h-[28px]">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
              摸鱼方块
            </h1>
            {isCloudSynced && (
              <span
                title="对局进度已自动同步至云端"
                className="flex items-center space-x-0.5 text-[9px] text-emerald-400 font-medium px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20"
              >
                <CloudCheck className="w-2.5 h-2.5" />
                <span className="hidden xs:inline">云</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 用户登录 / 个人中心按钮 */}
            <button
              id="user-auth-btn"
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-7 px-2 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              title={currentUser ? `已登录: ${currentUser.username}` : '登录 / 注册'}
            >
              {currentUser ? (
                <>
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[48px] sm:max-w-[64px] truncate text-emerald-300 font-medium">
                    {currentUser.username}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
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
                setAudioPreferences(sound.getPreferences());
              }}
              className="w-7 h-7 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition cursor-pointer"
              title={isMuted ? '开启声音' : '一键静音'}
              aria-label={isMuted ? '开启声音' : '一键静音'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>

            {/* 任务 018: 声学引擎与自适应 BGM 设置按钮 */}
            <button
              id="audio-settings-btn"
              type="button"
              onClick={() => setIsAudioModalOpen(true)}
              className="w-7 h-7 rounded-lg bg-slate-850 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center justify-center transition cursor-pointer relative"
              title="自适应音乐与音频设置"
              aria-label="自适应音乐与音频设置"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              {!audioPreferences.bgmMuted && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping absolute top-1 right-1" />
              )}
            </button>

            <button
              id="restart-btn"
              type="button"
              onClick={handleRestart}
              className="w-7 h-7 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition cursor-pointer"
              title="重新开始"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Score Counters & Realtime Rank Status (3-capsule row) */}
        <div className="grid grid-cols-3 gap-1.5 text-xs h-[26px]">
          <div className="flex items-center justify-between px-2 bg-slate-900/90 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">得分</span>
            <span id="current-score" className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
              {score}
            </span>
          </div>

          <div
            onClick={() => setIsLeaderboardModalOpen(true)}
            className="flex items-center justify-between px-2 bg-slate-900/90 hover:bg-slate-850 hover:border-amber-500/40 rounded-lg border border-slate-800 cursor-pointer transition-colors"
            title="点击查看全服排行榜"
          >
            <div className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>最高</span>
            </div>
            <span id="best-score" className="text-xs sm:text-sm font-bold text-amber-400 font-mono">
              {bestScore}
            </span>
          </div>

          <div
            onClick={() => setIsLeaderboardModalOpen(true)}
            className="flex items-center justify-between px-1.5 bg-slate-900/90 hover:bg-slate-850 hover:border-indigo-500/40 rounded-lg border border-slate-800 cursor-pointer transition-colors"
            title="点击查看全服排行榜与差距"
          >
            <div className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
              <Crown className="w-3 h-3 text-indigo-400" />
              <span className="font-bold text-indigo-300">
                #{rankContext?.currentRank ?? 1}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[48px] font-mono">
              {(rankContext?.deltaToHigher ?? 0) > 0 ? `-${rankContext?.deltaToHigher}` : '登顶'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Board Area (Tightened with Floating HUD) */}
      <main className="relative mt-1 mb-0.5 flex flex-col items-center justify-center">
        {/* 任务 010: 跨步连击与狂热状态浮动徽标 (绝对定位挂载, 连击时浮现, 0 静态占用) */}
        {streakCount > 0 && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in whitespace-nowrap">
            <ComboBadge
              streakCount={streakCount}
              comboShield={comboShield}
              isCascading={isCascading}
            />
          </div>
        )}

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
          shatterShockwaveCenters={shatterShockwaveCenters}
          singularityBlastCenter={singularityBlastCenter}
          singularityCrossPreview={singularityCrossPreview}
          fallDuration={fallDuration}
          isFeverMode={streakCount >= 5}
        />

        {/* 任务 010: 引力共鸣蓄能微光导轨 */}
        <ResonanceBar
          energy={resonanceEnergy}
          isFull={resonanceEnergy >= 100}
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
      <footer className="w-full flex flex-col items-center mt-0.5">
        <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5 text-center font-medium">
          {isCascading
            ? '重力连锁结算中...'
            : activeDrag
            ? '拖动至棋盘松开放置'
            : selectedPiece
            ? '已选中积木，点击棋盘空白放置'
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

      {/* 任务 018: 自适应音频控制浮层 */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        preferences={audioPreferences}
        onUpdatePreferences={handleUpdateAudioPreferences}
        bgmRuntime={bgmRuntime}
      />
    </div>
  );
}
