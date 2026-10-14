import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Play,
  Pause,
  SkipForward,
  Navigation,
  Sliders,
} from 'lucide-react';
import { ZoneId } from '../types';
import { OFFICE_ZONES, TOUR_STEPS } from '../data/officeData';

interface BottomDockProps {
  activeZone: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  onZoom: (delta: number) => void;
  onResetView: () => void;
  isTouring: boolean;
  tourStep: number;
  onToggleTour: () => void;
  onNextTourStep: () => void;
  onOpenBranding?: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeZone,
  onSelectZone,
  onZoom,
  onResetView,
  isTouring,
  tourStep,
  onToggleTour,
  onNextTourStep,
  onOpenBranding,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(960px,96vw)] flex flex-col items-center pointer-events-none select-none transition-all duration-300">
      {/* Collapse Toggle Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="pointer-events-auto mb-1.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-medium shadow-md transition-all hover:bg-slate-800"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show 3D Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock */}
      {!isCollapsed && (
        <div className="pointer-events-auto w-full bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col gap-2 text-white transition-all">
          {/* Top Row: Zone Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
              Zones:
            </span>
            {TOUR_STEPS.map((id) => {
              const zone = OFFICE_ZONES[id];
              const isActive = activeZone === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectZone(id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <Navigation className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{zone.name.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Tour Controls & Camera Manipulation */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-xs">
            {/* Tour Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleTour}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-medium transition-all text-xs ${
                  isTouring
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60'
                }`}
              >
                {isTouring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isTouring ? `Touring (${tourStep + 1}/${TOUR_STEPS.length})` : 'Auto Walk'}</span>
              </button>

              {isTouring && (
                <button
                  onClick={onNextTourStep}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 text-xs"
                  title="Next Zone"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Next</span>
                </button>
              )}

              {onOpenBranding && (
                <button
                  onClick={onOpenBranding}
                  className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 text-xs"
                  title="Edit Domain"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Brand</span>
                </button>
              )}

              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drag to Orbit • Pinch to Zoom</span>
              </div>
            </div>

            {/* Quick Zoom & Reset Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => onZoom(1)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => onZoom(-1)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={onResetView}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 transition-all text-xs"
                title="Reset Camera View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
