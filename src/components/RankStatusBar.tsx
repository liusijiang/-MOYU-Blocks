import React from 'react';
import { ScoreRankContext } from '../types';
import { Trophy, Crown, TrendingUp } from 'lucide-react';

interface RankStatusBarProps {
  score: number;
  rankContext: ScoreRankContext | null;
  onOpenLeaderboard: () => void;
  username?: string;
}

export const RankStatusBar: React.FC<RankStatusBarProps> = ({
  score,
  rankContext,
  onOpenLeaderboard,
}) => {
  const currentRank = rankContext?.currentRank ?? 1;
  const isTop1 = currentRank === 1 && score > 0;
  const deltaToHigher = rankContext?.deltaToHigher ?? 0;
  const deltaToTop = rankContext?.deltaToTop ?? 0;

  return (
    <div
      id="rank-status-bar"
      onClick={onOpenLeaderboard}
      className="w-full max-w-md mx-auto my-2 px-3 py-2 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-xl backdrop-blur-md shadow-md cursor-pointer transition-all duration-200 group flex items-center justify-between text-xs"
      title="点击查看全服排行榜"
    >
      {/* 排名状态 */}
      <div className="flex items-center space-x-2">
        <div
          className={`p-1.5 rounded-lg flex items-center justify-center ${
            isTop1
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {isTop1 ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Trophy className="w-3.5 h-3.5 text-amber-500" />}
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400">当前排名:</span>
            <span
              className={`font-black text-xs ${
                isTop1 ? 'text-amber-400' : 'text-white'
              }`}
            >
              #{currentRank}
            </span>
          </div>
        </div>
      </div>

      {/* 差距指标看板 */}
      <div className="flex items-center space-x-3 text-[11px]">
        {/* 距离上一名 */}
        {!isTop1 && deltaToHigher > 0 ? (
          <div className="flex items-center space-x-1 text-slate-300">
            <span className="text-slate-500">距上一名:</span>
            <span className="font-bold text-amber-400 font-mono">
              -{deltaToHigher}
            </span>
          </div>
        ) : isTop1 ? (
          <div className="flex items-center space-x-1 text-amber-300 font-bold">
            <span>👑 傲视全服第 1</span>
          </div>
        ) : (
          <div className="text-slate-500">暂无上一名</div>
        )}

        {/* 距离榜首差距 */}
        {!isTop1 && deltaToTop > 0 && (
          <div className="hidden sm:flex items-center space-x-1 text-slate-300 border-l border-slate-800 pl-3">
            <span className="text-slate-500">距榜首:</span>
            <span className="font-bold text-rose-400 font-mono">
              -{deltaToTop}
            </span>
          </div>
        )}
      </div>

      {/* 展开榜单引导 */}
      <div className="flex items-center space-x-1 text-[11px] text-slate-400 group-hover:text-amber-400 transition-colors">
        <TrendingUp className="w-3 h-3 text-amber-500/80" />
        <span className="hidden xs:inline">全服榜</span>
      </div>
    </div>
  );
};
