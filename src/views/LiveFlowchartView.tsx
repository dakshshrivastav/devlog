import React, { useState, useEffect } from 'react';
import { ActiveView } from '../types';

interface LiveFlowchartViewProps {
  onSelectView: (view: ActiveView) => void;
  openGapsCount: number;
}

export const LiveFlowchartView: React.FC<LiveFlowchartViewProps> = ({
  onSelectView,
  openGapsCount,
}) => {
  const [isRecording, setIsRecording] = useState(true);
  const [clustersUnified, setClustersUnified] = useState(true);
  const [sidetracks, setSidetracks] = useState<string[]>([]);
  const [waveHeights, setWaveHeights] = useState<number[]>([
    4, 8, 18, 22, 14, 26, 18, 10, 24, 28, 16, 20, 8, 22, 28, 12, 8, 16, 24, 20, 28, 12, 6
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Animated waveform effect when recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setWaveHeights((prev) =>
        prev.map(() => Math.floor(Math.random() * 24) + 6)
      );
    }, 180);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleMarkSidetrack = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSidetracks([...sidetracks, `Sidetrack tagged at ${time}`]);
    setToastMsg(`Sidetrack marker recorded at ${time}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportMmd = () => {
    const mmdContent = `flowchart TD
    %% Synthesized by Devlog Scribe v2
    subgraph ClusterA ["Cluster A: Power & Relay"]
        N1["5V DC Supply (5.02V)"] --> N2["5V Relay Module (72mA)"]
        N2 --> N3["Inductive Kickback (-24V spike)"]
    end
    subgraph ClusterB ["Cluster B: Microcontroller Logic"]
        NB1["ESP32-WROOM-32 (Pin 5)"] --> NB2["Brownout Reset (< 2.7V threshold)"]
    end
    D1["1N4007 Flyback Diode"] -.->|quenches kickback| N2
    D1 -->|prevents brownout| NB2
`;
    const blob = new Blob([mmdContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devlog-live-flowchart.mmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMsg('Exported live-flowchart.mmd');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      {/* Top Audio Ingestion Strip */}
      <section className="w-full bg-[#0e0e0f] border-b border-[#2a2a2b] px-4 sm:px-6 lg:px-10 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-3">
          {/* Upper Strip Metadata & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 bg-[#201f20] px-3.5 py-1 rounded-full border border-[#353436]/50">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRecording ? 'bg-[#ffb4ab] animate-ping' : 'bg-[#8f9194]'
                  }`}
                />
                <span className="font-mono text-xs sm:text-sm text-white tracking-widest">
                  {isRecording ? 'Recording 14m 28s' : 'Recording Paused'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#c5c7c9] text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span>Microphone (Scribe v2 Realtime)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className="bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs font-medium px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 border border-[#353436]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isRecording ? 'pause' : 'play_arrow'}
                </span>
                <span>{isRecording ? 'Pause recording' : 'Resume recording'}</span>
              </button>

              <button
                onClick={handleMarkSidetrack}
                className="bg-[#201f20] hover:bg-[#2a2a2b] text-[#c5c7c9] hover:text-white text-xs font-medium px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 border border-[#353436]"
              >
                <span className="material-symbols-outlined text-[16px]">bookmark_border</span>
                <span>Mark sidetrack</span>
              </button>

              <button
                onClick={() => setClustersUnified(!clustersUnified)}
                className={`text-xs font-medium px-4 py-1.5 rounded transition-all flex items-center gap-1.5 shadow ${
                  clustersUnified
                    ? 'bg-white text-[#131314]'
                    : 'bg-[#2a2a2b] text-white hover:bg-[#353436]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">merge</span>
                <span>{clustersUnified ? 'Clusters Unified' : 'Unify clusters'}</span>
              </button>
            </div>
          </div>

          {/* Waveform Audio Strip & Realtime Stream Ticker */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#1c1b1c] px-4 py-2.5 rounded-lg border border-[#2a2a2b]">
            {/* Audio bar visualization */}
            <div className="md:col-span-3 flex items-center gap-1 h-7 overflow-hidden">
              {waveHeights.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${isRecording ? h : 4}px` }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    i % 3 === 0 ? 'bg-white' : 'bg-[#8f9194]'
                  }`}
                />
              ))}
            </div>

            {/* Live speech transcript ticker */}
            <div className="md:col-span-9 flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider shrink-0">
                Live speech
              </span>
              <div className="truncate text-xs sm:text-sm text-white italic font-light">
                &ldquo;...when the 5V relay kicks on, pin 5 on the ESP32 drops voltage and resets unless we put a flyback diode across the coil...&rdquo;
              </div>
              <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-ping"></span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Viewport: Left Notes Column & Right Flowchart Canvas */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col lg:flex-row gap-8 flex-1">
        {/* LEFT COLUMN: Live Notes */}
        <aside className="w-full lg:w-[360px] shrink-0 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
            <h2 className="font-headline text-lg sm:text-xl text-white font-light tracking-tight">
              Live notes
            </h2>
            <span className="text-xs font-mono bg-[#201f20] px-2 py-0.5 rounded text-[#8f9194]">
              3 chunks
            </span>
          </div>

          {/* Notes Feed */}
          <div className="flex flex-col gap-3">
            {/* Note 1 */}
            <article className="bg-[#1c1b1c] p-4 rounded-xl border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-colors flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#8f9194] font-mono">
                <span>[14:02 · 14:08]</span>
                <span className="bg-[#2a2a2b] text-white px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  WIRING
                </span>
              </div>
              <p className="text-sm text-[#e5e2e3] font-light leading-relaxed">
                ESP32 pin 5 triggers 5V relay. Board resets intermittently.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#8f9194] pt-1">
                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                <span>Added to Cluster A</span>
              </div>
            </article>

            {/* Note 2 */}
            <article className="bg-[#1c1b1c] p-4 rounded-xl border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-colors flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#8f9194] font-mono">
                <span>[14:10 · 14:14]</span>
                <span className="bg-[#2a2a2b] text-white px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  HARDWARE FIX
                </span>
              </div>
              <p className="text-sm text-[#e5e2e3] font-light leading-relaxed">
                Added 1N4007 flyback diode across relay coil terminals.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-white pt-1">
                <span className="material-symbols-outlined text-[14px] text-white">
                  arrow_right_alt
                </span>
                <span>Linked to brownout reset</span>
              </div>
            </article>

            {/* Note 3 */}
            <article className="bg-[#1c1b1c] p-4 rounded-xl border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-colors flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#8f9194] font-mono">
                <span>[14:19 · 14:24]</span>
                <span className="bg-[#2a2a2b] text-white px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  SENSORS
                </span>
              </div>
              <p className="text-sm text-[#e5e2e3] font-light leading-relaxed">
                BME280 sensor reading stabilized on I2C bus.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#8f9194] pt-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>I2C bus stable at 200ms read cycle</span>
              </div>
            </article>

            {/* Live Speech Indicator */}
            <div className="bg-[#0e0e0f] p-3.5 rounded-lg border border-[#2a2a2b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="text-xs text-[#8f9194] italic font-light">
                  Listening to microphone... 16 kHz PCM
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#8f9194]">Live</span>
            </div>
          </div>

          {/* Sidetracks list if any */}
          {sidetracks.length > 0 && (
            <div className="p-3 bg-[#161618] rounded-lg border border-[#2a2a2b] text-xs text-[#8f9194] flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#c5c7c9]">
                Sidetracks
              </span>
              {sidetracks.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[#e5e2e3]">
                  <span className="material-symbols-outlined text-[13px]">bookmark</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Summary Card at Bottom */}
          <div className="bg-[#1c1b1c] p-5 rounded-xl border border-[#2a2a2b] flex flex-col gap-2 mt-auto">
            <span className="text-[11px] font-mono text-[#8f9194] uppercase tracking-wider">
              Session Summary
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-headline text-lg text-white font-light">Session graph</span>
              <span className="text-xs font-mono text-[#8f9194]">ESP32 Workbench</span>
            </div>
            <div className="w-full bg-[#201f20] h-1 rounded-full overflow-hidden my-1">
              <div className="bg-white h-full w-[100%]"></div>
            </div>
            <p className="text-xs text-[#8f9194]">
              Session graph: 8 nodes · 2 clusters · 1 linked connection · {openGapsCount} gaps
            </p>
          </div>
        </aside>

        {/* RIGHT/CENTRAL AREA: Live Flowchart Canvas */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Graph Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between bg-[#0e0e0f] px-5 py-3 rounded-xl border border-[#2a2a2b] gap-3">
            <div className="flex items-center gap-3">
              <span className="font-headline text-base text-white font-light">
                Live flowchart
              </span>
              <span className="text-xs font-mono bg-[#201f20] px-2 py-0.5 rounded text-[#8f9194]">
                Workbench #1
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#8f9194]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8f9194]"></span>
                <span>Cluster A: Power &amp; Relay</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c6c6cf]"></span>
                <span>Cluster B: Microcontroller Logic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="text-white">Unified connection</span>
              </div>
            </div>
          </div>

          {/* Graph Canvas Container */}
          <div className="relative w-full h-[600px] bg-[#0e0e0f] rounded-xl border border-[#2a2a2b] overflow-hidden flex flex-col justify-between p-6 sm:p-8">
            {/* Background Subtle Grid Pattern */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
              height="100%"
              width="100%"
            >
              <defs>
                <pattern id="flowGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e2e3" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#flowGrid)" />
            </svg>

            {/* SVG Connecting Paths Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              preserveAspectRatio="none"
              viewBox="0 0 980 600"
            >
              {/* Flow connections Cluster A */}
              <path d="M 175 140 L 220 140" fill="none" stroke="#44474a" strokeDasharray="3 3" strokeWidth="1.5" />
              <path d="M 360 140 L 400 140" fill="none" stroke="#44474a" strokeWidth="1.5" />

              {/* Flow connections Cluster B */}
              <path d="M 230 460 L 320 460" fill="none" stroke="#44474a" strokeDasharray="3 3" strokeWidth="1.5" />

              {/* Dynamic Convergence Lines */}
              {clustersUnified && (
                <>
                  <path
                    d="M 550 140 C 600 140, 590 200, 640 230 C 660 242, 650 270, 680 290 C 700 300, 710 300, 730 300"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 500 460 C 570 460, 580 390, 620 360 C 650 340, 660 320, 690 310 C 705 305, 715 300, 730 300"
                    fill="none"
                    stroke="#c6c6cf"
                    strokeWidth="2.5"
                  />
                  <circle cx="550" cy="140" r="3.5" fill="#ffffff" />
                  <circle cx="500" cy="460" r="3.5" fill="#c6c6cf" />
                  <circle cx="730" cy="300" r="5" fill="#ffffff" className="animate-ping" />
                </>
              )}
            </svg>

            {/* CLUSTER A: Power & Relay */}
            <div className="relative z-20 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8f9194]">
                  Cluster A
                </span>
                <span className="text-white font-headline text-lg font-light">
                  Power &amp; Relay
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Node A.1 */}
                <div className="bg-[#1c1b1c] px-4 py-3 rounded-lg border border-[#2a2a2b] shadow-sm w-44 hover:border-[#8f9194] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#8f9194] font-mono uppercase block">Node 01</span>
                  <span className="text-sm text-white font-medium block">5V DC Supply</span>
                  <span className="text-xs text-[#8f9194] font-mono block mt-0.5">5.02V measured</span>
                </div>

                {/* Node A.2 */}
                <div className="bg-[#1c1b1c] px-4 py-3 rounded-lg border border-[#2a2a2b] shadow-sm w-44 hover:border-[#8f9194] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#8f9194] font-mono uppercase block">Node 02</span>
                  <span className="text-sm text-white font-medium block">5V Relay Module</span>
                  <span className="text-xs text-[#8f9194] font-mono block mt-0.5">Coil draw: 72mA</span>
                </div>

                {/* Node A.3 */}
                <div className="bg-[#201f20] px-4 py-3 rounded-lg border border-[#ffb4ab]/40 shadow-sm w-52 hover:border-[#ffb4ab] transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#ffb4ab] font-mono uppercase block">Node 03</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
                  </div>
                  <span className="text-sm text-white font-medium block">Inductive Kickback</span>
                  <span className="text-xs text-[#ffb4ab] font-mono block mt-0.5">
                    -24V coil cutoff spike
                  </span>
                </div>
              </div>
            </div>

            {/* CENTRALIZED UNIFIED CONNECTION CARD */}
            {clustersUnified && (
              <div className="relative z-30 self-end mr-2 sm:mr-6 my-auto">
                <div className="w-[320px] sm:w-[360px] bg-[#2a2a2b] p-5 rounded-xl border border-white/20 shadow-2xl hover:scale-[1.01] transition-transform">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span className="text-xs font-mono text-white font-medium tracking-wider uppercase">
                        Unified connection
                      </span>
                    </div>
                    <span className="text-[11px] font-mono bg-[#161618] px-2 py-0.5 rounded text-[#8f9194]">
                      [14:10]
                    </span>
                  </div>
                  <h3 className="font-headline text-lg text-white font-normal tracking-tight mt-1">
                    Add 1N4007 diode
                  </h3>
                  <span className="text-xs text-[#c5c7c9] font-mono block mt-0.5">
                    Connected by builder speech [14:10]
                  </span>
                  <p className="text-xs text-[#e5e2e3] font-light mt-2.5 leading-relaxed">
                    The relay inductive kickback shares a ground plane with the ESP32, pulling the 3.3V rail down to 2.65V. Adding a 1N4007 flyback diode quenches the voltage spike and stops the reset.
                  </p>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#353436]">
                    <div className="flex items-center gap-1.5 text-white text-xs font-mono">
                      <span className="material-symbols-outlined text-[15px] text-[#c6c6cf]">
                        verified
                      </span>
                      <span>Verified in build</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#8f9194] uppercase tracking-widest">
                      0 inferred assumptions
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CLUSTER B: Microcontroller Logic */}
            <div className="relative z-20 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8f9194]">
                  Cluster B
                </span>
                <span className="text-white font-headline text-lg font-light">
                  Microcontroller Logic
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Node B.1 */}
                <div className="bg-[#1c1b1c] px-4 py-3 rounded-lg border border-[#2a2a2b] shadow-sm w-48 hover:border-[#8f9194] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#8f9194] font-mono uppercase block">Node 01</span>
                  <span className="text-sm text-white font-medium block">
                    ESP32-WROOM-32 (Pin 5)
                  </span>
                  <span className="text-xs text-[#8f9194] font-mono block mt-0.5">GPIO trigger</span>
                </div>

                {/* Node B.2 */}
                <div className="bg-[#201f20] px-4 py-3 rounded-lg border border-[#ffb4ab]/40 shadow-sm w-52 hover:border-[#ffb4ab] transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#ffb4ab] font-mono uppercase block">Node 02</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
                  </div>
                  <span className="text-sm text-white font-medium block">Brownout Reset</span>
                  <span className="text-xs text-[#ffb4ab] font-mono block mt-0.5">
                    Rail dips below 2.7V threshold
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Action & Audit Bar */}
      <footer className="w-full bg-[#0e0e0f] border-t border-[#2a2a2b] px-4 sm:px-6 lg:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Summary Statistics */}
        <div className="flex items-center gap-4 text-[#8f9194] text-xs font-mono">
          <span>
            Nodes: <strong className="text-white font-medium">08</strong>
          </span>
          <span>·</span>
          <span>
            Clusters: <strong className="text-white font-medium">02</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span>Unified connections:</span>
            <strong className="text-white font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span> 01
            </strong>
          </span>
          <span>·</span>
          <span>
            Gaps: <strong className="text-white font-medium">{openGapsCount}</strong>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onSelectView('observations')}
            className="bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs font-medium px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 border border-[#353436]"
          >
            <span className="material-symbols-outlined text-[15px]">terminal</span>
            <span>Review GAPS.md</span>
          </button>

          <button
            onClick={handleExportMmd}
            className="bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs font-medium px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 border border-[#353436]"
          >
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            <span>Export Mermaid (.mmd)</span>
          </button>

          <button
            onClick={() => {
              setIsRecording(false);
              setToastMsg('Hardware recording session ended. Document generated.');
              setTimeout(() => setToastMsg(null), 3000);
            }}
            className="bg-white hover:bg-[#e2e2e4] text-[#131314] text-xs font-medium px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 shadow"
          >
            <span className="material-symbols-outlined text-[15px]">stop_circle</span>
            <span>End session</span>
          </button>
        </div>
      </footer>

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
