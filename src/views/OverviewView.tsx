import React, { useState } from 'react';
import { ActiveView, GapItem } from '../types';

interface OverviewViewProps {
  onSelectView: (view: ActiveView) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
  gaps: GapItem[];
  onOpenExport: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onSelectView,
  onOpenPhotoLightbox,
  gaps,
  onOpenExport,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ v: string; t: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const openGapsCount = gaps.filter((g) => g.status === 'open').length;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Top Editorial Header Block */}
      <header className="mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#201f20] font-mono text-xs text-[#c6c6cf] tracking-wider uppercase border border-[#353436]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            SESSION #01 SUMMARY · ESP32-RELAY-CTRL
          </span>
          <span className="text-xs text-[#8f9194]">Target: Hardware Bench Alpha</span>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight max-w-4xl mb-4">
          Session Overview
        </h1>
        <p className="text-base sm:text-lg text-[#c5c7c9] max-w-[68ch] leading-relaxed font-light">
          Synthesized from 14 minutes of spoken audio, 2 bench oscilloscope captures, and 3 git commits on branch{' '}
          <code className="font-mono text-white bg-[#2a2a2b] px-1.5 py-0.5 rounded text-xs">
            main
          </code>
          .
        </p>
      </header>

      {/* Quiet Status Strip (Telemetry Anchors) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-[#0e0e0f] border border-[#2a2a2b]/40 mb-12">
        <div className="flex flex-col gap-1 pl-1">
          <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider">
            Session Duration
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl sm:text-3xl text-white font-light">
              14m 28s
            </span>
            <span className="text-xs text-[#8f9194]">continuous</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 pl-1">
          <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider">
            Evidence Anchors
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl sm:text-3xl text-white font-light">
              08
            </span>
            <span className="text-xs text-[#8f9194]">3 voice · 2 photo · 3 git</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 pl-1">
          <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider">
            Unified Clusters
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl sm:text-3xl text-white font-light">
              02
            </span>
            <span className="text-xs text-[#8f9194]">Power &amp; Microcontroller</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 pl-1">
          <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider">
            Open Observations
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl sm:text-3xl text-white font-light">
              0{openGapsCount}
            </span>
            <span className="text-xs text-[#ffb4ab]">in GAPS.md</span>
          </div>
        </div>
      </section>

      {/* Main Asymmetric 2-Column Work Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
        {/* Primary Narrative & Synthesized Output (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-10">
          {/* Executive Summary */}
          <article className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2b]/40 pb-2">
              <h2 className="font-headline text-xl text-white font-light tracking-tight">
                Executive Summary
              </h2>
              <span className="text-xs text-[#8f9194] font-mono">Verified Sequence</span>
            </div>
            <div className="space-y-4 max-w-[68ch] text-[#e5e2e3] font-light leading-relaxed text-sm sm:text-base">
              <p>
                The builder wired an ESP32 microcontroller to drive a 5V SPDT mechanical relay via a standard 2N2222 NPN transistor driver configuration. During bench actuation tests, triggering GPIO 5 precipitated immediate brownout resets on the core controller.
              </p>
              <p>
                Rigol scope probing confirmed inductive kickback from the unsuppressed relay coil, producing a transient back-EMF spike that pulled the primary 3.3V power bus down to{' '}
                <strong className="text-white font-normal bg-[#2a2a2b] px-1 py-0.5 rounded">2.65V</strong>
                —tripping the ESP32 internal brownout detector threshold (<span className="text-[#c6c6cf] font-mono text-xs">2.80V</span>).
              </p>
              <p>
                The fault was definitively isolated and mitigated during this run by hand-soldering an antiparallel 1N4007 flyback diode across the mechanical relay coil terminals, clamping subsequent collapse transients within safe rails.
              </p>
            </div>
          </article>

          {/* Interactive Oscilloscope Waveform Inspection Visual */}
          <div className="flex flex-col gap-3 p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2a2a2b]/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px]">show_chart</span>
                <span className="text-xs text-white uppercase tracking-wider font-mono">
                  Rigol DS1054Z Capture · CH1 (3.3V Rail) vs CH2 (GPIO 5)
                </span>
              </div>
              <span className="font-mono text-xs text-[#8f9194]">t₀ = 14:08:12 UTC</span>
            </div>

            <div className="w-full bg-[#0e0e0f] p-4 rounded-lg flex flex-col gap-3 relative">
              <div className="flex flex-wrap justify-between items-center text-[#8f9194] font-mono text-xs">
                <span>SCALE: 500mV / DIV</span>
                <span className="text-[#ffb4ab] font-medium">V_min: 2.65V (Brownout Trigger)</span>
                <span>TIMEBASE: 20μs / DIV</span>
              </div>

              {/* Scope Waveform Graph */}
              <div className="relative cursor-crosshair">
                <svg
                  aria-label="Oscilloscope waveform graph"
                  className="w-full h-40 overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 700 120"
                >
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="700" y2="20" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />
                  <line x1="0" y1="60" x2="700" y2="60" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />
                  <line x1="0" y1="100" x2="700" y2="100" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />
                  <line x1="175" y1="0" x2="175" y2="120" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />
                  <line x1="350" y1="0" x2="350" y2="120" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />
                  <line x1="525" y1="0" x2="525" y2="120" stroke="#353436" strokeDasharray="2 4" strokeWidth="1" />

                  {/* Threshold Limit Line (BOR @ 2.80V) */}
                  <line x1="0" y1="80" x2="700" y2="80" stroke="#ffb4ab" strokeOpacity="0.4" strokeDasharray="4 2" strokeWidth="1.5" />
                  <text x="610" y="75" fill="#ffb4ab" className="font-mono text-[10px]">
                    BOR @ 2.80V
                  </text>

                  {/* CH1: 3.3V Rail with Brownout Dip */}
                  <path
                    d="M 0 35 L 260 35 Q 275 35 285 45 L 305 105 Q 315 110 325 90 L 350 40 Q 365 35 385 35 L 700 35"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* Dip annotation point */}
                  <circle
                    cx="305"
                    cy="105"
                    r="4.5"
                    fill="#ffb4ab"
                    className="cursor-pointer hover:r-6 transition-all"
                    onMouseEnter={() => setHoveredPoint({ v: '2.65V sag', t: '4.2µs transient' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <text x="320" y="112" fill="#ffffff" className="font-mono text-[11px]">
                    2.65V Sag (Coil Demagnetization)
                  </text>

                  {/* CH2: GPIO 5 Gate Trigger Logic */}
                  <path
                    d="M 0 115 L 270 115 L 270 95 L 700 95"
                    fill="none"
                    stroke="#8f9194"
                    strokeWidth="1"
                  />
                </svg>

                {hoveredPoint && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#2a2a2b] border border-[#353436] px-3 py-1 rounded text-xs font-mono text-white shadow-xl pointer-events-none">
                    Telemetry: {hoveredPoint.v} · Duration: {hoveredPoint.t}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[#8f9194] text-xs pt-1 border-t border-[#2a2a2b]/40">
                <span>Channel 1: DC Coupled (Primary Core VDD)</span>
                <span>Baseline: 3.31V Steady State</span>
              </div>
            </div>
          </div>

          {/* Key Deliverables Generated */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2b]/40 pb-2">
              <h2 className="font-headline text-xl text-white font-light tracking-tight">
                Key Deliverables Generated
              </h2>
              <span className="text-xs text-[#8f9194] font-mono">6 Artifacts Updated</span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Deliverable 1 */}
              <div
                onClick={() => onSelectView('finished-docs')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    description
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        README.md
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">doc/root</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      ESP32 Relay Controller with Inductive Kickback Protection
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2a2a2b] text-white">
                  Ready
                </span>
              </div>

              {/* Deliverable 2 */}
              <div
                onClick={() => onSelectView('system-diagrams')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    schema
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        diagrams/system.mmd
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">schematic</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      Mermaid architecture diagram with source tags &amp; diode loop
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2a2a2b] text-white">
                  Validated
                </span>
              </div>

              {/* Deliverable 3 */}
              <div
                onClick={() => onSelectView('bom-and-parts')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    inventory_2
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        BOM.md
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">parts</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      4 items cataloged, 1 pending coil resistance spec
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#45464e] text-[#e2e1eb]">
                  In progress
                </span>
              </div>

              {/* Deliverable 4 */}
              <div
                onClick={() => onSelectView('troubleshooting')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    build_circle
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        TROUBLESHOOTING.md
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">diagnostics</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      1 root cause documented, brownout fix verified
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2a2a2b] text-white">
                  Verified
                </span>
              </div>

              {/* Deliverable 5 */}
              <div
                onClick={() => onSelectView('observations')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    visibility
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        OBSERVER_NOTES.md
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">logs</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      5 chronological third-person observations
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2a2a2b] text-white">
                  Recorded
                </span>
              </div>

              {/* Deliverable 6 */}
              <div
                onClick={() => onSelectView('observations')}
                className="flex items-center justify-between p-4 rounded-lg bg-[#1c1b1c] hover:bg-[#201f20] transition-colors border border-[#2a2a2b] cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[#c6c6cf] text-[20px] mt-0.5 group-hover:text-white transition-colors">
                    help_outline
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:underline">
                        GAPS.md
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono">attention</span>
                    </div>
                    <span className="text-xs text-[#c5c7c9] mt-0.5 block">
                      {openGapsCount} targeted question{openGapsCount !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#353436] text-[#c6c6cf]">
                  Needs input
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Evidence Integrity & Quick Inspection (5 Columns) */}
        <aside className="lg:col-span-5 flex flex-col gap-8">
          {/* Hardware Prototype Macro Evidence Card */}
          <div className="flex flex-col gap-3 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
                Visual Proof · 14:12 UTC
              </span>
              <span className="text-xs text-white font-mono">IMG_0821.RAW</span>
            </div>

            <div
              className="relative w-full h-56 rounded-lg overflow-hidden bg-[#0e0e0f] group cursor-pointer"
              onClick={() =>
                onOpenPhotoLightbox(
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBJiE3E9AvvZTAnOBLCyjFaJ4Ajpj1Fif4PjtbRTSiexk2V8Bpae7nCjtPXkJmhttYycUen-PNUJRzQJdIrL1QwzuOYlZ5AkNNBiDbybPfxcMSvTd-0Uzg5zV7ZWPYKQPezLORjD2TSBdYBk8f9UgcDHcvYXw7akvnpIoIKuPH5ovxcgMhN-CLDyQEP6w4D9che4R9uNwnRDTm8MLZ3bPiutnHiXX-PQhz81dxR2NwX0DWx7LIwF5uX1g',
                  '1N4007 Diode Clamping Installation',
                  'Macro Solder Inspection · Cathode facing +5V rail'
                )
              }
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJiE3E9AvvZTAnOBLCyjFaJ4Ajpj1Fif4PjtbRTSiexk2V8Bpae7nCjtPXkJmhttYycUen-PNUJRzQJdIrL1QwzuOYlZ5AkNNBiDbybPfxcMSvTd-0Uzg5zV7ZWPYKQPezLORjD2TSBdYBk8f9UgcDHcvYXw7akvnpIoIKuPH5ovxcgMhN-CLDyQEP6w4D9che4R9uNwnRDTm8MLZ3bPiutnHiXX-PQhz81dxR2NwX0DWx7LIwF5uX1g"
                alt="1N4007 diode soldered across relay coil"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-mono text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                    1N4007 clamped directly across coil
                  </span>
                  <span className="material-symbols-outlined text-white text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    zoom_in
                  </span>
                </div>
              </div>
            </div>

            <span className="text-xs text-[#8f9194] leading-relaxed">
              Confirmed flyback loop distance: 4.2mm trace-equivalent. Zero parasitic oscillations recorded post-install.
            </span>
          </div>

          {/* Evidence Grounding Matrix */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2a2a2b]/40 pb-2">
              <h3 className="font-headline text-lg text-white font-light">
                Evidence Grounding
              </h3>
              <span className="text-xs text-[#8f9194] font-mono">5 Primary Inputs</span>
            </div>

            <div className="flex flex-col rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] divide-y divide-[#2a2a2b]/40">
              {/* Voice */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#201f20] transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] text-[18px] mt-0.5">
                    mic
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">Voice Stream Capture</div>
                    <div className="text-xs text-[#8f9194]">
                      ElevenLabs Scribe v2 synced, word-level alignment
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8f9194] shrink-0">14:02 – 14:14</span>
              </div>

              {/* Scope Trigger */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#201f20] transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] text-[18px] mt-0.5">
                    speed
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">Rigol Scope Trigger</div>
                    <div className="text-xs text-[#8f9194]">
                      2.65V brownout sag capture (DS1054Z)
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8f9194] shrink-0">14:08</span>
              </div>

              {/* Macro inspection */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#201f20] transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] text-[18px] mt-0.5">
                    photo_camera
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">Macro Hardware Inspection</div>
                    <div className="text-xs text-[#8f9194]">
                      1N4007 polarity check &amp; terminal solder inspection
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8f9194] shrink-0">14:12</span>
              </div>

              {/* Commit 1 */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#201f20] transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] text-[18px] mt-0.5">
                    commit
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-white font-medium">Commit</span>
                      <span className="font-mono text-[11px] text-[#c6c6cf] bg-[#2a2a2b] px-1 py-0.2 rounded">
                        c4e12a
                      </span>
                    </div>
                    <div className="text-xs text-[#8f9194]">
                      Software debounce trial before diode installation
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8f9194] shrink-0">14:10</span>
              </div>

              {/* Commit 2 */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#201f20] transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] text-[18px] mt-0.5">
                    commit
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-white font-medium">Commit</span>
                      <span className="font-mono text-[11px] text-[#c6c6cf] bg-[#2a2a2b] px-1 py-0.2 rounded">
                        8f9b02
                      </span>
                    </div>
                    <div className="text-xs text-[#8f9194]">
                      Docs &amp; Mermaid schematic update
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8f9194] shrink-0">14:19</span>
              </div>
            </div>
          </div>

          {/* Open Items in GAPS.md */}
          <div className="flex flex-col gap-3 p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b]">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
                Open Gaps Flagged
              </span>
              <span className="text-xs font-mono text-[#ffb4ab]">
                {openGapsCount} Pending Input
              </span>
            </div>

            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  onClick={() => onSelectView('observations')}
                  className="p-3 rounded-lg bg-[#161618] border border-[#2a2a2b]/60 hover:border-[#8f9194]/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white font-medium group-hover:underline">
                      {gap.question}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        gap.status === 'open' ? 'text-[#ffb4ab] bg-[#93000a]/20' : 'text-[#c6c6cf] bg-[#2a2a2b]'
                      }`}
                    >
                      {gap.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8f9194] leading-relaxed">
                    {gap.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Session Actions & Export Suite */}
          <div className="flex flex-col gap-2.5 pt-1">
            <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider mb-0.5">
              Session Outputs
            </span>
            <button
              onClick={onOpenExport}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] transition-colors text-white text-sm border border-[#2a2a2b]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                <span>Download Documentation Bundle</span>
              </div>
              <span className="font-mono text-xs text-[#8f9194]">.zip</span>
            </button>

            <button
              onClick={() => showToast('Timeline JSON exported with 8 grounded events.')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] transition-colors text-white text-sm border border-[#2a2a2b]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">data_object</span>
                <span>Export Timeline Grounding</span>
              </div>
              <span className="font-mono text-xs text-[#8f9194]">.json</span>
            </button>

            <button
              onClick={() => onSelectView('observations')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#353436] hover:bg-[#39393a] transition-colors text-white text-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                <span>Review {openGapsCount} Open Gap{openGapsCount !== 1 ? 's' : ''}</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#8f9194]">arrow_forward</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Floating Feedback Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#39393a] text-white text-xs shadow-2xl z-50 border border-[#44474a] animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-[#c6c6cf]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
