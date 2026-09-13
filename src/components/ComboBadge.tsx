import React from 'react';
import { Shield, ShieldAlert, Zap, Flame } from 'lucide-react';

interface ComboBadgeProps {
  streakCount: number;
  comboShield: boolean;
  isCascading?: boolean;
}

export const ComboBadge: React.FC<ComboBadgeProps> = ({
  streakCount,
  comboShield,
  isCascading = false,
}) => {
  if (streakCount <= 0) {
    return null;
  }

  const isFever = streakCount >= 5;
  const isGodlike = streakCount >= 10;
  const isDyingStreak = !comboShield; // 护盾已消耗，进入濒死抢救态

  return (
    <div
      id="combo-badge-container"
      className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md select-none transition-all duration-300 shadow-lg ${
        isDyingStreak
          ? 'bg-rose-950/90 border border-rose-500/80 shadow-rose-500/30 animate-pulse'
          : isGodlike
          ? 'bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-amber-900/90 border border-pink-400/80 shadow-pink-500/40'
          : isFever
          ? 'bg-gradient-to-r from-amber-950/90 to-rose-950/90 border border-amber-400/80 shadow-amber-500/30 ring-1 ring-amber-400/40'
          : 'bg-slate-900/90 border border-sky-400/60 shadow-sky-500/20'
      }`}
    >
      {/* Dynamic Mode Icon */}
      {isDyingStreak ? (
        <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
      ) : isGodlike ? (
        <Zap className="w-4 h-4 text-pink-300 fill-pink-400 animate-pulse" />
      ) : isFever ? (
        <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
      ) : (
        <Shield className="w-3.5 h-3.5 text-sky-400 fill-sky-400/40" />
      )}

      {/* Streak Text */}
      <div className="flex items-center gap-1">
        <span
          className={`font-black text-xs sm:text-sm tracking-wider uppercase ${
            isDyingStreak
              ? 'text-rose-300'
              : isGodlike
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200'
              : isFever
              ? 'text-amber-300 font-extrabold'
              : 'text-sky-300'
          }`}
        >
          {isDyingStreak
            ? '濒死警报'
            : isGodlike
            ? '超神连击'
            : isFever
            ? '狂热连击'
            : '跨步连击'}
        </span>

        <span
          className={`font-mono font-black text-sm sm:text-base ${
            isDyingStreak
              ? 'text-rose-200'
              : isGodlike
              ? 'text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]'
              : isFever
              ? 'text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              : 'text-sky-200'
          }`}
        >
          {streakCount}x
        </span>
      </div>

      {/* Shield status indicator */}
      {comboShield && (
        <div
          title="连击护盾充能中 (允许 1 步容错)"
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] ml-0.5"
        />
      )}

      {/* Dying last chance indicator */}
      {isDyingStreak && (
        <span className="text-[10px] text-rose-300 font-bold tracking-tighter ml-0.5 animate-pulse">
          急救!
        </span>
      )}
    </div>
  );
};
