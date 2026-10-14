import React from 'react';
import { Volume2, VolumeX, Sun, Sunset, Moon, Sparkles, Building2, Sliders, Zap } from 'lucide-react';
import { TimeOfDay, BrandingConfig, GraphicsQuality } from '../types';

interface HeaderNavProps {
  branding: BrandingConfig;
  timeOfDay: TimeOfDay;
  onTimeChange: (time: TimeOfDay) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenBranding: () => void;
  onStartTour: () => void;
  isTouring: boolean;
  graphicsQuality: GraphicsQuality;
  onQualityChange: (quality: GraphicsQuality) => void;
  isMobile: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  branding,
  timeOfDay,
  onTimeChange,
  soundEnabled,
  onToggleSound,
  onOpenBranding,
  onStartTour,
  isTouring,
  graphicsQuality,
  onQualityChange,
  isMobile,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 p-2 sm:p-4 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Brand Badge & Domain */}
      <div className="flex items-center gap-2.5 pointer-events-auto bg-slate-900/85 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border border-slate-700/60 shadow-xl text-white">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-semibold text-xs sm:text-base tracking-wide text-white">
              {branding.companyName}
            </h1>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              3D
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-mono hidden sm:block">
            {branding.domain}
          </p>
        </div>
      </div>

      {/* Right Controls: Quality, Lighting, Audio, Tour, Brand Editor */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Graphics Quality Toggle (Low / High) */}
        <button
          onClick={() => onQualityChange(graphicsQuality === 'low' ? 'high' : 'low')}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-medium transition-all shadow-md ${
            graphicsQuality === 'low'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          }`}
          title={
            graphicsQuality === 'low'
              ? 'Performance Mode (Optimized for Android / Mobile)'
              : 'High Quality Mode (Full Shadows & Soft Lighting)'
          }
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="font-semibold">{graphicsQuality === 'low' ? 'Perf (Low)' : 'High'}</span>
        </button>

        {/* Time of Day Switcher */}
        <div className="flex items-center bg-slate-900/85 backdrop-blur-md p-0.5 sm:p-1 rounded-xl border border-slate-700/60 shadow-lg text-slate-300">
          <button
            onClick={() => onTimeChange('day')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
              timeOfDay === 'day'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                : 'hover:text-white'
            }`}
            title="Day Lighting"
          >
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => onTimeChange('sunset')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
              timeOfDay === 'sunset'
                ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                : 'hover:text-white'
            }`}
            title="Golden Hour / Sunset"
          >
            <Sunset className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => onTimeChange('night')}
            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
              timeOfDay === 'night'
                ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                : 'hover:text-white'
            }`}
            title="Night Mode"
          >
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 sm:p-2 rounded-xl backdrop-blur-md border transition-all ${
            soundEnabled
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900/85 border-slate-700/60 text-slate-400 hover:text-white'
          }`}
          title={soundEnabled ? 'Mute 3D Audio' : 'Enable 3D Sound Effects'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>

        {/* Customize Branding (Hidden on very narrow phones to preserve space, visible in drawer/modal) */}
        <button
          onClick={onOpenBranding}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-500 transition-all shadow-lg"
          title="Customize 3D Billboard & Domain"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Edit Domain</span>
        </button>

        {/* Guided Tour Walkthrough Button */}
        <button
          onClick={onStartTour}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-medium text-xs transition-all shadow-lg ${
            isTouring
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isTouring ? 'Touring' : 'Tour'}</span>
        </button>
      </div>
    </header>
  );
};
