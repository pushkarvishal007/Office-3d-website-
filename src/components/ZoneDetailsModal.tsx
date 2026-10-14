import React from 'react';
import { X, ArrowRight, CheckCircle2, MessageSquare, ExternalLink } from 'lucide-react';
import { OfficeZone, ZoneId } from '../types';

interface ZoneDetailsModalProps {
  zone: OfficeZone;
  onClose: () => void;
  onNavigateZone: (zoneId: ZoneId) => void;
  onOpenContact: () => void;
  onOpenBranding: () => void;
  onStartTour: () => void;
}

export const ZoneDetailsModal: React.FC<ZoneDetailsModalProps> = ({
  zone,
  onClose,
  onNavigateZone,
  onOpenContact,
  onOpenBranding,
  onStartTour,
}) => {
  const dialogue = zone.dialogue;

  const handleOptionClick = (option: { label: string; targetZone?: ZoneId; action?: string }) => {
    if (option.action === 'contact') {
      onOpenContact();
    } else if (option.action === 'branding') {
      onOpenBranding();
    } else if (option.action === 'tour') {
      onStartTour();
    } else if (option.targetZone) {
      onNavigateZone(option.targetZone);
    }
  };

  return (
    <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-40 w-[min(420px,92vw)] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                Zone Active
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {zone.name}
            </h2>
            <p className="text-xs text-slate-400">{zone.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialogue Box (As seen in the video) */}
        {dialogue && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{dialogue.avatar}</span>
              <span className="text-xs font-semibold text-emerald-300">
                {dialogue.speaker}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed italic">
              "{dialogue.text}"
            </p>

            {/* Quick Dialogue Action Buttons */}
            {dialogue.options && dialogue.options.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Quick Actions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {dialogue.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-700/70 hover:bg-emerald-600/30 hover:border-emerald-500/50 border border-slate-600/50 text-left text-xs font-medium text-slate-200 hover:text-white transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{opt.label}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features / Specs */}
        <div className="mt-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            {zone.description}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {zone.features.map((feat, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Bar */}
        {zone.metrics && zone.metrics.length > 0 && (
          <div className="mt-3.5 grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
            {zone.metrics.map((m, idx) => (
              <div key={idx} className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                <span className="block text-[10px] text-slate-400 font-mono">{m.label}</span>
                <span className="block text-xs font-bold text-emerald-400 mt-0.5">{m.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onOpenContact}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Connect &amp; Pitch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
