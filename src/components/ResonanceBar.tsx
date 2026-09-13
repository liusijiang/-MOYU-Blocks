import React from 'react';
import { Atom, Sparkles } from 'lucide-react';

interface ResonanceBarProps {
  energy: number; // 0.0 ~ 100.0
  isFull: boolean;
}

export const ResonanceBar: React.FC<ResonanceBarProps> = ({ energy, isFull }) => {
  const clampedEnergy = Math.max(0, Math.min(100, energy));

  return (
    <div
      id="gravity-resonance-container"
      className="w-full max-w-md px-4 mt-2 mb-1 flex flex-col gap-1 select-none"
    >
      {/* Upper Micro Status Line */}
      <div className="flex items-center justify-between text-[11px] font-medium tracking-tight">
        <div className="flex items-center gap-1.5">
          <Atom
            className={`w-3.5 h-3.5 ${
              isFull
                ? 'text-amber-300 animate-spin'
                : 'text-purple-400'
            }`}
            style={{ animationDuration: isFull ? '2s' : '6s' }}
          />
          <span
            className={
              isFull
                ? 'text-amber-300 font-extrabold flex items-center gap-1'
                : 'text-slate-400'
            }
          >
            {isFull ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                引力大招蓄满·当前首块已赋能!
              </>
            ) : (
              '引力共鸣蓄能'
            )}
          </span>
        </div>

        <span
          className={`font-mono font-bold ${
            isFull
              ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
              : 'text-purple-300'
          }`}
        >
          {Math.floor(clampedEnergy)}%
        </span>
      </div>

      {/* 2.5px Minimalist High-Tech Energy Rail */}
      <div
        id="resonance-track"
        className={`relative w-full h-[5px] rounded-full overflow-hidden bg-slate-900/90 border border-slate-800 ${
          isFull ? 'ring-1 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : ''
        }`}
      >
        {/* Fill Gauge */}
        <div
          className={`h-full transition-all duration-300 ease-out relative ${
            isFull
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300 animate-pulse'
              : 'bg-gradient-to-r from-indigo-600 via-purple-500 to-violet-400'
          }`}
          style={{ width: `${clampedEnergy}%` }}
        >
          {/* Leading white-hot photon head */}
          {clampedEnergy > 3 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white blur-[1px] shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
          )}
        </div>
      </div>
    </div>
  );
};
