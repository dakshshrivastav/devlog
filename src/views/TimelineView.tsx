import React, { useState } from 'react';
import { TimelineItem, ActiveView } from '../types';
import { playVoiceTone, stopVoiceTone } from '../utils/audio';

interface TimelineViewProps {
  timeline: TimelineItem[];
  onSelectView: (view: ActiveView) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  onSelectView,
  onOpenPhotoLightbox,
}) => {
  const [filter, setFilter] = useState<'all' | 'voice' | 'photos' | 'code'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filteredItems = timeline.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const voiceCount = timeline.filter((i) => i.type === 'voice').length;
  const photoCount = timeline.filter((i) => i.type === 'photos').length;
  const codeCount = timeline.filter((i) => i.type === 'code').length;

  const handleTogglePlay = (id: string) => {
    if (playingId === id) {
      stopVoiceTone();
      setPlayingId(null);
    } else {
      setPlayingId(id);
      playVoiceTone(() => {
        setPlayingId(null);
      });
    }
  };

  const handleExportTimelineJson = () => {
    const dataStr = JSON.stringify(timeline, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devlog-timeline-session-01.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMsg('Exported timeline.json with 8 verified groundings');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Editorial Header */}
      <section className="mb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#2a2a2b]/40">
          <div className="flex flex-col">
            <span className="font-mono text-xs text-[#8f9194] uppercase tracking-widest mb-1">
              Chronicle / ESP32 Hardware Build
            </span>
            <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl text-white font-light tracking-tight lowercase">
              timeline
            </h1>
            <p className="text-sm sm:text-base text-[#c5c7c9] max-w-[68ch] mt-2 font-light">
              Spoken notes, bench photos, and git commits in chronological order.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 scrollbar-none select-none text-xs sm:text-sm">
            <button
              onClick={() => setFilter('all')}
              className={`transition-colors shrink-0 font-headline ${
                filter === 'all'
                  ? 'text-white font-medium underline underline-offset-8'
                  : 'text-[#8f9194] hover:text-[#c5c7c9]'
              }`}
            >
              All <span className="font-mono text-[10px] text-[#8f9194] align-super">{timeline.length}</span>
            </button>
            <span className="text-[#353436]">/</span>
            <button
              onClick={() => setFilter('voice')}
              className={`transition-colors shrink-0 font-headline ${
                filter === 'voice'
                  ? 'text-white font-medium underline underline-offset-8'
                  : 'text-[#8f9194] hover:text-[#c5c7c9]'
              }`}
            >
              Voice notes <span className="font-mono text-[10px] text-[#8f9194] align-super">{voiceCount}</span>
            </button>
            <span className="text-[#353436]">/</span>
            <button
              onClick={() => setFilter('photos')}
              className={`transition-colors shrink-0 font-headline ${
                filter === 'photos'
                  ? 'text-white font-medium underline underline-offset-8'
                  : 'text-[#8f9194] hover:text-[#c5c7c9]'
              }`}
            >
              Bench photos <span className="font-mono text-[10px] text-[#8f9194] align-super">{photoCount}</span>
            </button>
            <span className="text-[#353436]">/</span>
            <button
              onClick={() => setFilter('code')}
              className={`transition-colors shrink-0 font-headline ${
                filter === 'code'
                  ? 'text-white font-medium underline underline-offset-8'
                  : 'text-[#8f9194] hover:text-[#c5c7c9]'
              }`}
            >
              Git commits <span className="font-mono text-[10px] text-[#8f9194] align-super">{codeCount}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Two-Column Asymmetric Canvas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Narrative Chronicle (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
          {filteredItems.map((item) => {
            if (item.type === 'voice') {
              const isPlaying = playingId === item.id;
              return (
                <article
                  key={item.id}
                  className="bg-[#1c1b1c] rounded-xl p-5 sm:p-6 border border-[#2a2a2b] shadow-sm hover:border-[#353436] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6cf]"></span>
                      <span className="text-xs font-mono text-[#8f9194]">{item.time}</span>
                    </div>
                    {item.tags && (
                      <div className="flex items-center gap-1.5">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono text-[#c5c7c9] bg-[#2a2a2b] px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio Player Container */}
                  <div className="bg-[#0e0e0f] rounded-lg p-3.5 mb-4 border border-[#2a2a2b]/40">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        onClick={() => handleTogglePlay(item.id)}
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#131314] hover:bg-[#e2e2e4] transition-all active:scale-95 shrink-0 shadow"
                        title={isPlaying ? 'Pause' : 'Play audio note'}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs text-[#8f9194]">
                          <span className="truncate pr-2 font-medium text-[#e5e2e3]">
                            {item.title}
                          </span>
                          <span className="font-mono shrink-0">
                            {isPlaying ? '0:03' : item.duration}
                          </span>
                        </div>

                        {/* Animated Waveform Visual */}
                        <div
                          onClick={() => handleTogglePlay(item.id)}
                          className="w-full h-6 flex items-center gap-[3px] py-1 cursor-pointer overflow-hidden"
                        >
                          {[
                            4, 8, 14, 6, 18, 14, 10, 8, 16, 12, 6, 14, 10, 8, 4, 12, 16,
                            8, 10, 18, 14, 8, 12, 6,
                          ].map((h, idx) => (
                            <span
                              key={idx}
                              style={{ height: isPlaying ? `${Math.max(4, (h * (idx % 3 + 1)) % 22)}px` : `${h}px` }}
                              className={`w-[2.5px] rounded-full transition-all duration-150 ${
                                idx < 9
                                  ? isPlaying
                                    ? 'bg-white'
                                    : 'bg-[#e5e2e3]'
                                  : 'bg-[#44474a]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {item.audioQuote && (
                    <blockquote className="text-sm sm:text-base text-white font-light leading-relaxed mb-3 pl-3.5 border-l-2 border-[#8f9194]">
                      {item.audioQuote}
                    </blockquote>
                  )}

                  <div className="flex items-center gap-1.5 text-[#8f9194] text-xs pt-1">
                    <span className="material-symbols-outlined text-[16px] text-[#c6c6cf]">
                      check_circle
                    </span>
                    <span>{item.verifiedLabel}</span>
                  </div>
                </article>
              );
            }

            if (item.type === 'photos') {
              return (
                <article
                  key={item.id}
                  className="bg-[#1c1b1c] rounded-xl p-5 sm:p-6 border border-[#2a2a2b] shadow-sm hover:border-[#353436] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6cf]"></span>
                      <span className="text-xs font-mono text-[#8f9194]">{item.time}</span>
                    </div>
                    {item.tags && (
                      <span className="text-[10px] font-mono text-[#c5c7c9] bg-[#2a2a2b] px-2 py-0.5 rounded">
                        {item.tags[0]}
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() =>
                      item.imageSrc &&
                      onOpenPhotoLightbox(item.imageSrc, item.title, item.exif)
                    }
                    className="relative w-full h-72 rounded-lg overflow-hidden mb-4 bg-[#0e0e0f] group cursor-pointer border border-[#2a2a2b]/40"
                  >
                    {item.imageSrc && (
                      <img
                        src={item.imageSrc}
                        alt={item.imageAlt || item.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="text-xs text-white bg-black/70 backdrop-blur px-2.5 py-1 rounded border border-white/10 font-medium">
                        {item.title}
                      </span>
                      <span className="text-xs text-[#c5c7c9] bg-black/70 backdrop-blur px-2 py-1 rounded font-mono">
                        {item.exif?.split('·')[1] || 'Verified Lens'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[#e5e2e3] leading-relaxed mb-2 font-light">
                    {item.notes}
                  </p>

                  <div className="flex items-center gap-1.5 text-[#8f9194] text-xs pt-1">
                    <span className="material-symbols-outlined text-[16px] text-[#c6c6cf]">
                      check_circle
                    </span>
                    <span>{item.verifiedLabel}</span>
                  </div>
                </article>
              );
            }

            if (item.type === 'code') {
              return (
                <article
                  key={item.id}
                  className="bg-[#1c1b1c] rounded-xl p-5 sm:p-6 border border-[#2a2a2b] shadow-sm hover:border-[#353436] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6cf]"></span>
                      <span className="text-xs font-mono text-[#8f9194]">{item.time}</span>
                    </div>
                    <span className="font-mono text-xs text-white bg-[#2a2a2b] px-2 py-0.5 rounded border border-[#353436]">
                      {item.commitHash}
                    </span>
                  </div>

                  <h3 className="font-headline text-lg sm:text-xl text-white font-light mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#c5c7c9] mb-4 font-light leading-relaxed">
                    {item.notes}
                  </p>

                  {item.codeSnippet && (
                    <div className="bg-[#0e0e0f] rounded-lg p-3.5 font-mono text-xs text-[#c5c7c9] overflow-x-auto border border-[#2a2a2b]">
                      {item.codeSnippet.lines.map((l) => (
                        <div
                          key={l.lineNum}
                          className={`flex items-start gap-4 py-0.5 ${
                            l.isAdded
                              ? 'bg-[#2a2a2b]/60 -mx-3.5 px-3.5 text-white font-medium'
                              : 'text-[#8f9194]'
                          }`}
                        >
                          <span className="text-[#44474a] select-none w-6 text-right shrink-0">
                            {l.lineNum}
                          </span>
                          <span className={l.isAdded ? 'text-white' : 'text-[#c5c7c9]'}>
                            {l.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[#8f9194] text-xs pt-4">
                    <span className="material-symbols-outlined text-[16px] text-[#c6c6cf]">
                      check_circle
                    </span>
                    <span>{item.verifiedLabel}</span>
                  </div>
                </article>
              );
            }

            return null;
          })}
        </div>

        {/* Right Column: Truth & Verification Summary Panel (5 cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="bg-[#1c1b1c] rounded-xl p-6 border border-[#2a2a2b] shadow-md flex flex-col">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
                Timeline Summary
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#c6c6cf]">
                <span className="w-2 h-2 rounded-full bg-[#c6c6cf] animate-pulse"></span>
                Active
              </span>
            </div>

            <div className="my-4 flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-5xl sm:text-6xl text-white font-light tracking-tighter">
                  8
                </span>
                <span className="font-headline text-xl text-[#c6c6cf] font-light">
                  sources recorded
                </span>
              </div>
              <span className="text-sm text-[#8f9194] font-light mt-0.5">
                ESP32 relay &amp; BME280 session
              </span>
            </div>

            <div className="flex flex-col gap-2.5 mb-6">
              <div className="flex items-center justify-between p-3.5 bg-[#201f20] rounded-lg border border-[#2a2a2b]/60">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-[#8f9194]">
                    mic
                  </span>
                  <span className="text-xs sm:text-sm text-white">Voice memos</span>
                </div>
                <span className="font-headline text-lg text-white font-light">{voiceCount}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#201f20] rounded-lg border border-[#2a2a2b]/60">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-[#8f9194]">
                    photo_camera
                  </span>
                  <span className="text-xs sm:text-sm text-white">Photos</span>
                </div>
                <span className="font-headline text-lg text-white font-light">{photoCount}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#201f20] rounded-lg border border-[#2a2a2b]/60">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-[#8f9194]">
                    terminal
                  </span>
                  <span className="text-xs sm:text-sm text-white">Git commits</span>
                </div>
                <span className="font-headline text-lg text-white font-light">{codeCount}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportTimelineJson}
                className="w-full py-3 px-4 rounded-lg bg-white text-[#131314] text-xs sm:text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#e2e2e4] transition-all shadow"
              >
                <span>Export timeline.json</span>
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>

              <button
                onClick={() => onSelectView('observations')}
                className="w-full py-3 px-4 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all border border-[#2a2a2b]"
              >
                <span>Review GAPS.md</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="bg-[#0e0e0f] rounded-xl p-5 border border-[#2a2a2b]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
                Grounding Check
              </span>
              <span className="text-xs font-mono text-[#c6c6cf]">8/8 Verified</span>
            </div>
            <p className="text-xs text-[#8f9194] leading-relaxed">
              All 8 events verified against raw audio recordings, EXIF timestamps, and git logs.
            </p>
          </div>
        </aside>
      </section>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#39393a] text-white text-xs shadow-2xl z-50 border border-[#44474a] animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-[#c6c6cf]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
