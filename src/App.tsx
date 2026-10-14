import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OfficeScene } from './three/OfficeScene';
import { HeaderNav } from './components/HeaderNav';
import { BottomDock } from './components/BottomDock';
import { ZoneDetailsModal } from './components/ZoneDetailsModal';
import { BrandingModal } from './components/BrandingModal';
import { ContactModal } from './components/ContactModal';
import { BrandingConfig, GraphicsQuality, TimeOfDay, ZoneId } from './types';
import { INITIAL_BRANDING, OFFICE_ZONES, TOUR_STEPS } from './data/officeData';
import { sounds } from './audio/soundEffects';
import { Building2, Loader2, Sparkles, Zap } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeScene | null>(null);

  // Mobile Device Detection (Used for initial default quality)
  const isMobile =
    typeof window !== 'undefined' &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
      window.innerWidth < 768);

  // App State
  const [branding, setBranding] = useState<BrandingConfig>(INITIAL_BRANDING);
  const [activeZone, setActiveZone] = useState<ZoneId>('street');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Graphics Quality (Low by default on mobile devices!)
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(
    isMobile ? 'low' : 'high'
  );

  // Optimization 9: Lightweight Loading Screen
  const [isLoading, setIsLoading] = useState(true);

  // Guided Walkthrough Tour State
  const [isTouring, setIsTouring] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Zone selection & character arrival handlers
  const handleZoneSelect = useCallback((zoneId: ZoneId) => {
    setActiveZone(zoneId);
    setIsDetailsOpen(true);

    const zone = OFFICE_ZONES[zoneId];
    if (sceneRef.current && zone) {
      sceneRef.current.transitionToZone(
        zoneId,
        zone.cameraPosition,
        zone.cameraTarget
      );
    }
  }, []);

  const handleVisitorArrived = useCallback((zoneId: ZoneId) => {
    setActiveZone(zoneId);
    setIsDetailsOpen(true);
  }, []);

  // Initialize Three.js scene once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const initialQ = isMobile ? 'low' : 'high';

    const scene = new OfficeScene(mountRef.current, branding, initialQ, {
      onZoneSelect: (zoneId) => {
        handleZoneSelect(zoneId);
      },
      onVisitorArrived: (zoneId) => {
        handleVisitorArrived(zoneId);
      },
      onSceneReady: () => {
        setIsLoading(false);
      },
    });

    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []); // Run once on mount

  // Graphics Quality switch handler
  const handleQualityChange = (quality: GraphicsQuality) => {
    setGraphicsQuality(quality);
    if (sceneRef.current) {
      sceneRef.current.setGraphicsQuality(quality);
    }
    sounds.playClick();
  };

  // Update Branding when changed
  const handleSaveBranding = (newBranding: BrandingConfig) => {
    setBranding(newBranding);
    if (sceneRef.current) {
      sceneRef.current.updateBranding(newBranding);
    }
    sounds.playChime();
  };

  // Lighting changes
  const handleTimeChange = (time: TimeOfDay) => {
    setTimeOfDay(time);
    if (sceneRef.current) {
      sceneRef.current.setTimeOfDay(time);
    }
    sounds.playClick();
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextState = sounds.toggle();
    setSoundEnabled(nextState);
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (sceneRef.current) {
      sceneRef.current.zoomCamera(delta);
    }
  };

  // Reset view
  const handleResetView = () => {
    if (sceneRef.current) {
      sceneRef.current.resetView();
    }
    setActiveZone('street');
    setIsDetailsOpen(false);
  };

  // Tour controls
  const handleToggleTour = () => {
    if (isTouring) {
      setIsTouring(false);
    } else {
      setIsTouring(true);
      setTourStep(0);
      handleZoneSelect(TOUR_STEPS[0]);
    }
  };

  const handleNextTourStep = () => {
    const nextIndex = (tourStep + 1) % TOUR_STEPS.length;
    setTourStep(nextIndex);
    handleZoneSelect(TOUR_STEPS[nextIndex]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 touch-none cursor-grab active:cursor-grabbing"
      />

      {/* Lightweight Loading Screen (Auto-fades out) */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-300">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-7 h-7" />
              <Loader2 className="absolute w-14 h-14 text-emerald-500/30 animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-semibold tracking-wide text-white">
                Loading 3D Campus...
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isMobile ? 'Optimizing for Mobile Performance ⚡' : 'Preparing interactive 3D environment'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <HeaderNav
        branding={branding}
        timeOfDay={timeOfDay}
        onTimeChange={handleTimeChange}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onStartTour={handleToggleTour}
        isTouring={isTouring}
        graphicsQuality={graphicsQuality}
        onQualityChange={handleQualityChange}
        isMobile={isMobile}
      />

      {/* Interactive Zone Modal (appears when arriving or clicking on a room) */}
      {isDetailsOpen && (
        <ZoneDetailsModal
          zone={OFFICE_ZONES[activeZone] || OFFICE_ZONES.reception}
          onClose={() => setIsDetailsOpen(false)}
          onNavigateZone={(id) => handleZoneSelect(id)}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenBranding={() => setIsBrandingOpen(true)}
          onStartTour={handleToggleTour}
        />
      )}

      {/* Bottom Dock Navigation & Camera Controls */}
      <BottomDock
        activeZone={activeZone}
        onSelectZone={handleZoneSelect}
        onZoom={handleZoom}
        onResetView={handleResetView}
        isTouring={isTouring}
        tourStep={tourStep}
        onToggleTour={handleToggleTour}
        onNextTourStep={handleNextTourStep}
        onOpenBranding={() => setIsBrandingOpen(true)}
      />

      {/* Domain & Branding Customizer Modal */}
      {isBrandingOpen && (
        <BrandingModal
          branding={branding}
          onSave={handleSaveBranding}
          onClose={() => setIsBrandingOpen(false)}
        />
      )}

      {/* Contact / Meeting Pitch Modal */}
      {isContactOpen && (
        <ContactModal
          founderName={branding.companyName}
          onClose={() => setIsContactOpen(false)}
        />
      )}
    </div>
  );
}
