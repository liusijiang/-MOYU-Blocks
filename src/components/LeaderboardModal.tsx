import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { fetchLeaderboard } from '../utils/memfire';
import { Trophy, Crown, Medal, X, RotateCw, User } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentScore: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentScore,
}) => {
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLeaderboard(50);
    setList(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 计算当前玩家在当前榜单中的位置
  const myIndex = list.findIndex((item) => item.userId === currentUserId);
  const myEntry = myIndex !== -1 ? list[myIndex] : null;

  return (
    <div
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="leaderboard-container"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100"
      >
        {/* 顶部 Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>全服分数排行榜</span>
                <span className="text-[11px] font-normal text-amber-400/80 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Top 50
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">实时竞逐，落子沉淀真实力</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="刷新榜单"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 列表主体 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/40">
          {loading && list.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RotateCw className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-500" />
              正在同步全服高分榜...
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              全服榜单虚位以待，快来打出第一局高分！
            </div>
          ) : (
            list.map((item, index) => {
              const rank = index + 1;
              const isMe = item.userId === currentUserId;

              return (
                <div
                  key={item.id}
                  className={`pt-2 flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    isMe
                      ? 'bg-amber-500/15 border border-amber-500/40'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* 排名徽章 */}
                    <div className="w-7 h-7 flex items-center justify-center font-bold text-xs">
                      {rank === 1 ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                          <Crown className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-7 h-7 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center">
                          <Medal className="w-4 h-4 text-slate-200" />
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center">
                          <Medal className="w-4 h-4 text-amber-600" />
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400">#{rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-xs font-bold ${
                            isMe ? 'text-amber-300' : 'text-slate-200'
                          }`}
                        >
                          {item.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-medium border border-amber-500/30">
                            我
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        达成于 {new Date(item.achievedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-black text-amber-400">
                      {item.highScore.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-slate-500">分</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部吸底: 我的即时状态 */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">当前局对战分</span>
              <strong className="text-white font-mono text-xs">
                {currentScore.toLocaleString()} 分
              </strong>
            </div>
          </div>

          <div className="text-right">
            <span className="text-slate-400 text-[11px] block">全服历史最高</span>
            <span className="font-mono font-bold text-amber-400">
              {myEntry ? `${myEntry.highScore.toLocaleString()} (Rank #${myIndex + 1})` : '暂未上榜'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
