import React from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Sliders,
  Sparkles,
  X,
  Radio,
  Headphones,
} from 'lucide-react';
import { AudioPreferences, BGMRuntimeState } from '../types';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: AudioPreferences;
  onUpdatePreferences: (partial: Partial<AudioPreferences>) => void;
  bgmRuntime: BGMRuntimeState;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  bgmRuntime,
}) => {
  if (!isOpen) return null;

  const chordNames = ['Dm9', 'G13', 'Cmaj9', 'Am11'];
  const currentChordName = chordNames[bgmRuntime.currentChordIndex] || 'Dm9';

  return (
    <div
      id="audio-settings-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="audio-settings-card"
        className="w-full max-w-sm rounded-2xl bg-slate-900/95 border border-amber-500/30 p-5 shadow-2xl text-slate-100 backdrop-blur-md relative overflow-hidden"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-400">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-amber-200">
                声学引擎与自适应音频
              </h3>
              <p className="text-[11px] text-slate-400">
                阳光午后 · 咖啡馆 Lo-Fi & 拇指琴禅意心流
              </p>
            </div>
          </div>
          <button
            id="close-audio-settings-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 核心控件区 */}
        <div className="mt-4 space-y-4">
          {/* 1. 背景音乐 (BGM) */}
          <div
            id="bgm-control-group"
            className="rounded-xl bg-slate-950/40 border border-slate-800/70 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Music
                  size={16}
                  className={preferences.bgmMuted ? 'text-slate-500' : 'text-amber-400'}
                />
                <span className="text-xs font-semibold">午后 Lo-Fi 拇指琴 BGM</span>
              </div>
              <button
                id="toggle-bgm-mute-btn"
                onClick={() =>
                  onUpdatePreferences({ bgmMuted: !preferences.bgmMuted })
                }
                className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
                  preferences.bgmMuted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {preferences.bgmMuted ? '已静音' : '播放中'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="bgm-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={preferences.bgmMuted}
                value={preferences.bgmMuted ? 0 : preferences.bgmVolume}
                onChange={(e) =>
                  onUpdatePreferences({
                    bgmVolume: parseFloat(e.target.value),
                    bgmMuted: false,
                  })
                }
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right">
                {preferences.bgmMuted
                  ? '0%'
                  : `${Math.round(preferences.bgmVolume * 100)}%`}
              </span>
            </div>

            {/* BGM 运行态势监控 */}
            {!preferences.bgmMuted && (
              <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-amber-300/90">
                  <Radio size={10} className="animate-pulse text-amber-400" />
                  {currentChordName} 爵士和弦
                </span>
                <span>{bgmRuntime.bpm} BPM</span>
                <span>
                  {bgmRuntime.layer4FeverGain > 0
                    ? '🎵 摇摆大提琴'
                    : bgmRuntime.layer3ShimmerGain > 0.06
                    ? '✨ 暖阳微风'
                    : '☕ 咖啡电钢琴'}
                </span>
              </div>
            )}
          </div>

          {/* 2. 游戏音效 (SFX) */}
          <div
            id="sfx-control-group"
            className="rounded-xl bg-slate-950/40 border border-slate-800/70 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {preferences.sfxMuted ? (
                  <VolumeX size={16} className="text-slate-500" />
                ) : (
                  <Volume2 size={16} className="text-amber-400" />
                )}
                <span className="text-xs font-semibold">落子与消除音效</span>
              </div>
              <button
                id="toggle-sfx-mute-btn"
                onClick={() =>
                  onUpdatePreferences({ sfxMuted: !preferences.sfxMuted })
                }
                className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
                  preferences.sfxMuted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {preferences.sfxMuted ? '已静音' : '开启中'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="sfx-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={preferences.sfxMuted}
                value={preferences.sfxMuted ? 0 : preferences.sfxVolume}
                onChange={(e) =>
                  onUpdatePreferences({
                    sfxVolume: parseFloat(e.target.value),
                    sfxMuted: false,
                  })
                }
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right">
                {preferences.sfxMuted
                  ? '0%'
                  : `${Math.round(preferences.sfxVolume * 100)}%`}
              </span>
            </div>
          </div>

          {/* 3. 声学增强开关 */}
          <div
            id="acoustic-options-group"
            className="grid grid-cols-2 gap-2 text-xs"
          >
            {/* 空间声相 */}
            <button
              id="toggle-spatial-panner-btn"
              onClick={() =>
                onUpdatePreferences({
                  spatialPannerEnabled: !preferences.spatialPannerEnabled,
                })
              }
              className={`flex items-center gap-1.5 p-2.5 rounded-xl border transition-all text-left ${
                preferences.spatialPannerEnabled
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                  : 'bg-slate-950/30 border-slate-800 text-slate-500'
              }`}
            >
              <Headphones size={15} className="shrink-0" />
              <div>
                <div className="font-semibold text-[11px]">3D 空间声相</div>
                <div className="text-[9px] opacity-70">
                  {preferences.spatialPannerEnabled ? '棋盘左右声道' : '单声道居中'}
                </div>
              </div>
            </button>

            {/* 宇宙微混响 */}
            <button
              id="toggle-reverb-btn"
              onClick={() =>
                onUpdatePreferences({
                  reverbEnabled: !preferences.reverbEnabled,
                })
              }
              className={`flex items-center gap-1.5 p-2.5 rounded-xl border transition-all text-left ${
                preferences.reverbEnabled
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                  : 'bg-slate-950/30 border-slate-800 text-slate-500'
              }`}
            >
              <Sparkles size={15} className="shrink-0" />
              <div>
                <div className="font-semibold text-[11px]">算法空间混响</div>
                <div className="text-[9px] opacity-70">
                  {preferences.reverbEnabled ? '1.4s 温暖原木余韵' : '纯干声直出'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 底部小贴士 */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 text-center text-[11px] text-slate-400">
          💡 智能侧链闪避：高能消除与大连击爆发时 BGM 呼吸避让
        </div>
      </div>
    </div>
  );
};
