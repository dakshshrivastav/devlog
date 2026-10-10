/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { ActiveView, GapItem, BomItem } from './types';
import {
  INITIAL_TIMELINE,
  INITIAL_GAPS,
  INITIAL_BOM,
  BENCH_TOOLS,
  OBSERVER_LOGS,
} from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PhotoLightbox } from './components/PhotoLightbox';
import { SearchModal } from './components/SearchModal';
import { ExportModal } from './components/ExportModal';

import { OverviewView } from './views/OverviewView';
import { TimelineView } from './views/TimelineView';
import { LivingMapView } from './views/LivingMapView';
import { LiveFlowchartView } from './views/LiveFlowchartView';
import { ObservationsView } from './views/ObservationsView';
import { SystemDiagramsView } from './views/SystemDiagramsView';
import { BomView } from './views/BomView';
import { TroubleshootingView } from './views/TroubleshootingView';
import { FinishedDocsView } from './views/FinishedDocsView';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('living-map');
  const [sessionSeconds, setSessionSeconds] = useState(868); // 14m 28s
  const [isPaused, setIsPaused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    src: string;
    caption?: string;
    meta?: string;
  } | null>(null);

  const [timeline] = useState(INITIAL_TIMELINE);
  const [gaps, setGaps] = useState<GapItem[]>(INITIAL_GAPS);
  const [bom, setBom] = useState<BomItem[]>(INITIAL_BOM);

  // Live session timer
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Global keyboard shortcuts (Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsExportOpen(false);
        setLightboxPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatSessionTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleResolveGap = useCallback((gapId: string, answer: string) => {
    setGaps((prev) =>
      prev.map((g) =>
        g.id === gapId ? { ...g, status: 'resolved', resolvedAnswer: answer } : g
      )
    );

    // If gap-01 (relay coil resistance) is resolved, update the BOM spec
    if (gapId === 'gap-01') {
      setBom((prev) =>
        prev.map((b) =>
          b.id === 'bom-2'
            ? {
                ...b,
                status: 'Verified',
                spec: `${b.spec} · Coil verified: ${answer}`,
              }
            : b
        )
      );
    }
  }, []);

  const openLightbox = (src: string, caption?: string, meta?: string) => {
    setLightboxPhoto({ src, caption, meta });
  };

  const openGapsCount = gaps.filter((g) => g.status === 'open').length;

  return (
    <div className="min-h-screen bg-[#131314] text-[#e5e2e3] font-body flex flex-col selection:bg-[#353436] selection:text-white">
      {/* Editorial Navigation Header */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        sessionTime={formatSessionTime(sessionSeconds)}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 pt-16 sm:pt-16 flex flex-col">
        {activeView === 'living-map' && (
          <LivingMapView onOpenPhotoLightbox={openLightbox} />
        )}

        {activeView === 'overview' && (
          <OverviewView
            onSelectView={setActiveView}
            onOpenPhotoLightbox={openLightbox}
            gaps={gaps}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeView === 'timeline' && (
          <TimelineView
            timeline={timeline}
            onSelectView={setActiveView}
            onOpenPhotoLightbox={openLightbox}
          />
        )}

        {activeView === 'live-flowchart' && (
          <LiveFlowchartView
            onSelectView={setActiveView}
            openGapsCount={openGapsCount}
          />
        )}

        {activeView === 'observations' && (
          <ObservationsView
            observerLogs={OBSERVER_LOGS}
            gaps={gaps}
            onResolveGap={handleResolveGap}
            onOpenPhotoLightbox={openLightbox}
          />
        )}

        {activeView === 'system-diagrams' && <SystemDiagramsView />}

        {activeView === 'bom-and-parts' && (
          <BomView
            bom={bom}
            tools={BENCH_TOOLS}
            gaps={gaps}
            onResolveGap={handleResolveGap}
            onOpenPhotoLightbox={openLightbox}
          />
        )}

        {activeView === 'troubleshooting' && (
          <TroubleshootingView
            onSelectView={setActiveView}
            onOpenPhotoLightbox={openLightbox}
          />
        )}

        {activeView === 'finished-docs' && (
          <FinishedDocsView
            onSelectView={setActiveView}
            onOpenPhotoLightbox={openLightbox}
            onOpenExport={() => setIsExportOpen(true)}
            openGapsCount={openGapsCount}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <Footer />

      {/* Global Interactive Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectView={setActiveView}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        openGapsCount={openGapsCount}
      />

      <PhotoLightbox
        imageSrc={lightboxPhoto ? lightboxPhoto.src : null}
        caption={lightboxPhoto ? lightboxPhoto.caption : undefined}
        metadata={lightboxPhoto ? lightboxPhoto.meta : undefined}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  );
}
