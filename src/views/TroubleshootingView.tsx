import React, { useState } from 'react';
import { ActiveView } from '../types';

interface TroubleshootingViewProps {
  onSelectView: (view: ActiveView) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
}

export const TroubleshootingView: React.FC<TroubleshootingViewProps> = ({
  onSelectView,
  onOpenPhotoLightbox,
}) => {
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCopyLog = () => {
    const logText = `[TROUBLESHOOTING.md]
Incident #001: Intermittent Microcontroller Brownout on Relay Actuation
Root Cause: Inductive back-EMF (-24V cutoff spike) from unsuppressed relay coil induced ground bounce, dropping 3.3V rail to 2.65V (below 2.70V BOR threshold).
Fix: 1N4007 flyback diode installed antiparallel across relay coil. Ripple reduced to < 18mV across 50 test actuations.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(logText);
    }
    setCopied(true);
    setToastMsg('Copied troubleshooting log summary to clipboard');
    setTimeout(() => {
      setCopied(false);
      setToastMsg(null);
    }, 2500);
  };

  const handleExportMarkdown = () => {
    const md = `# Troubleshooting Log
## Incident #001: Intermittent Microcontroller Brownout on Relay Actuation
- **Detected**: 14:02:18 UTC
- **Resolved**: 14:14:40 UTC
- **Root Cause**: Inductive kickback V = -L*(di/dt) pulled 3.3V power rail to 2.65V
- **Fix**: Antiparallel 1N4007 diode clamped back-EMF spike to ~0.7V forward drop
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TROUBLESHOOTING.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMsg('Exported TROUBLESHOOTING.md');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Top Editorial Header */}
      <header className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#2a2a2b]/40">
          <div className="flex flex-col gap-2 max-w-[68ch]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8f9194] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Incident Log</span>
              <span>/</span>
              <span>Hardware Root Cause</span>
              <span>/</span>
              <span className="text-white">TROUBLESHOOTING.md</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight font-light">
              Troubleshooting Log
            </h1>
            <p className="text-sm sm:text-base text-[#c5c7c9] leading-relaxed font-light">
              Chronological record of hardware anomalies, symptoms observed on the bench, attempted fixes, and verified resolutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 text-xs font-medium">
            <button
              onClick={handleCopyLog}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] text-white transition-colors border border-[#353436]"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied Log' : 'Copy Log'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#131314] hover:bg-[#e2e2e4] transition-colors shadow"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Export Markdown</span>
            </button>
          </div>
        </div>

        {/* Incident Counter & Bench Status Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-1 shadow-sm">
            <span className="font-headline text-3xl text-white font-light">01</span>
            <span className="text-xs text-[#8f9194]">Incident Recorded</span>
          </div>
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-1 shadow-sm">
            <span className="font-headline text-3xl text-white font-light">01</span>
            <span className="text-xs text-[#8f9194]">Root Cause Identified</span>
          </div>
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-1 shadow-sm">
            <span className="font-headline text-3xl text-white font-light">01</span>
            <span className="text-xs text-[#8f9194]">Verified Resolution</span>
          </div>
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-1 shadow-sm">
            <span className="font-headline text-3xl text-[#8f9194] font-light">00</span>
            <span className="text-xs text-[#8f9194]">Pending Bench Faults</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Detailed Incident Narrative (Cols 8) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <article className="bg-[#1c1b1c] rounded-xl p-6 sm:p-8 md:p-10 flex flex-col gap-8 border border-[#2a2a2b] shadow-md">
            {/* Header Banner */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#201f20] text-white border border-[#2a2a2b]">
                    Incident #001
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#2a2a2b] text-[#c6c6cf]">
                    HARDWARE LEVEL
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#201f20] text-white flex items-center gap-1.5 border border-[#353436]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    RESOLVED
                  </span>
                </div>
                <div className="text-xs font-mono text-[#8f9194] flex items-center gap-2">
                  <span>Phase: Actuation testing</span>
                  <span>·</span>
                  <span>Delta: 12 min</span>
                </div>
              </div>

              <h2 className="font-headline text-2xl sm:text-3xl text-white font-normal tracking-tight">
                Intermittent Microcontroller Brownout on Relay Actuation
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-[#161618] border border-[#2a2a2b] text-xs">
                <div className="flex flex-col">
                  <span className="text-[#8f9194] font-mono">Detected</span>
                  <span className="text-white mt-0.5">14:02:18 UTC</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#8f9194] font-mono">Resolved</span>
                  <span className="text-white mt-0.5">14:14:40 UTC</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#8f9194] font-mono">Telemetry Target</span>
                  <span className="text-white mt-0.5">ESP-WROOM-32 (v2.4)</span>
                </div>
              </div>
            </div>

            {/* 01 / Symptom & Manifestation */}
            <section className="flex flex-col gap-3">
              <span className="text-xs font-mono text-[#8f9194] tracking-widest uppercase">
                01 / Symptom &amp; Manifestation
              </span>
              <p className="text-sm sm:text-base text-[#e5e2e3] font-light leading-relaxed max-w-[68ch]">
                Whenever GPIO pin 5 commanded the 5V electromagnetic relay module to actuate, the ESP32 suffered spontaneous software resets. Debug serial console on UART0 emitted{' '}
                <code className="px-1.5 py-0.5 rounded bg-[#2a2a2b] font-mono text-xs text-white">
                  rst:0x10 (RTCWDT_RTC_RESET)
                </code>{' '}
                followed immediately by internal brownout detector trigger flags.
              </p>

              <div className="p-4 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[#8f9194]">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="material-symbols-outlined text-[16px]">mic</span>
                    <span>Audio Log — Bench Station 01 [voice 14:02]</span>
                  </div>
                  <span>Transcribed</span>
                </div>
                <blockquote className="font-headline text-base text-white italic font-light pl-2 border-l-2 border-[#8f9194]">
                  &ldquo;ESP32 pin 5 triggers the 5V relay. When it flips, the microcontroller reboots spontaneously.&rdquo;
                </blockquote>
              </div>
            </section>

            {/* 02 / Diagnostic Progression */}
            <section className="flex flex-col gap-5">
              <span className="text-xs font-mono text-[#8f9194] tracking-widest uppercase">
                02 / Diagnostic Progression
              </span>

              {/* Step 1 */}
              <div className="p-4 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white uppercase font-mono tracking-wider">
                    Step 1 — Initial Hypothesis (Firmware Logic)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#201f20] text-[#c6c6cf] font-mono">
                    Hypothesis Refuted
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8f9194] font-light leading-relaxed">
                  Suspected GPIO switching slew rate or mechanical bounce on the board inputs inducing interrupt re-entrancy. Added a 15ms software debounce delay prior to and after asserting GPIO 5 in firmware (<code className="text-white font-mono">commit c4e12a</code>).
                </p>
                <div className="flex items-center gap-2 text-xs text-[#8f9194] mt-1">
                  <span className="material-symbols-outlined text-[15px] text-[#ffb4ab]">close</span>
                  <span>Outcome: Ineffective. Brownout reset trigger continued across 100% of actuation events. Proved issue was electrical, not software state corruption.</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white uppercase font-mono tracking-wider">
                    Step 2 — Oscilloscope Rail Probing
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#201f20] text-white font-mono">
                    Anomalous Drop Captured
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#e5e2e3] font-light leading-relaxed">
                  Tapped CH1 on the 3.3V VCC regulator output rail with a Rigol DS1054Z, trigger set to single edge on GPIO 5 rising. Probing captured an instantaneous voltage collapse down to <strong className="text-white font-medium">2.65V</strong> (a <strong className="text-white font-medium">-650mV drop</strong>), sharply undercutting the ESP32 silicon brownout threshold of <strong className="text-white font-medium">2.70V</strong>.
                </p>

                {/* Oscilloscope Capture Visualizer */}
                <div className="w-full bg-[#0e0e0f] rounded-lg p-4 flex flex-col gap-2 border border-[#2a2a2b]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#8f9194]">
                    <span>CH1: 3.3V RAIL [1.00V/div] · TB: 2.00µs/div</span>
                    <span>Captured 14:08:12 UTC · [photo 1]</span>
                  </div>

                  <div className="w-full h-40 relative flex items-center justify-center">
                    <svg className="w-full h-full text-white" fill="none" preserveAspectRatio="none" viewBox="0 0 600 160">
                      <line x1="0" y1="40" x2="600" y2="40" stroke="#353436" strokeDasharray="4 4" strokeWidth="1" />
                      <text x="12" y="34" fill="#8f9194" className="font-mono text-[10px]">Nominal VCC (3.30V)</text>

                      <line x1="0" y1="90" x2="600" y2="90" stroke="#ffb4ab" strokeOpacity="0.4" strokeDasharray="2 4" strokeWidth="1" />
                      <text x="12" y="85" fill="#ffb4ab" className="font-mono text-[10px]">Brownout Trip Floor (2.70V)</text>

                      <path
                        d="M 0 40 L 210 40 C 220 40, 224 45, 226 70 L 232 128 C 235 132, 239 130, 242 110 L 255 60 C 265 42, 280 40, 310 40 L 600 40"
                        stroke="#ffffff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                      <circle cx="232" cy="128" r="3.5" fill="#ffb4ab" />
                      <text x="275" y="146" fill="#ffffff" className="font-mono text-[11px]">
                        Trough: 2.65V (-650mV drop, 4.2µs)
                      </text>
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#8f9194] pt-1 border-t border-[#2a2a2b]/40">
                    <span>Delta T: 4.2 µs duration under 2.70V threshold</span>
                    <span>Rigol DS1054Z · Direct BNC</span>
                  </div>
                </div>

                {/* Scope Photo card */}
                <div
                  onClick={() =>
                    onOpenPhotoLightbox(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnO6ICioZztR9HPAArdmpWWRle0W3FlFWaHcJ-MLKOfP0AhyizJicC36IoS5EcsB1D8BepdoFld1FHgseOtcoPmYfDZLbcvNl1JteCIBGgQeApzbulc5bD1RUgrJvpdiPQ5ML15N9l3dlkPpIw-vj5RR4NACR4UgyPkpiNgja2yOlGHZ-iXMdR2DcLebXyrlTIzm5-fmOgZz6VfexGc-yA3x0L4kqSNwY4ro5EFhYubJ1xBtIpZxYqcw',
                      'photo_1_oscilloscope_trigger.raw',
                      'Bench Camera 02 · 14:08 UTC · Negative spike trace'
                    )
                  }
                  className="relative w-full h-52 rounded-lg overflow-hidden bg-[#0e0e0f] group cursor-pointer border border-[#2a2a2b]"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnO6ICioZztR9HPAArdmpWWRle0W3FlFWaHcJ-MLKOfP0AhyizJicC36IoS5EcsB1D8BepdoFld1FHgseOtcoPmYfDZLbcvNl1JteCIBGgQeApzbulc5bD1RUgrJvpdiPQ5ML15N9l3dlkPpIw-vj5RR4NACR4UgyPkpiNgja2yOlGHZ-iXMdR2DcLebXyrlTIzm5-fmOgZz6VfexGc-yA3x0L4kqSNwY4ro5EFhYubJ1xBtIpZxYqcw"
                    alt="Oscilloscope display"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <div className="flex items-center justify-between w-full text-xs">
                      <span className="font-mono text-white">Evidence Tag: photo_1_oscilloscope_trigger.raw</span>
                      <span className="text-[#8f9194]">Bench Camera 02 · 14:08</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 03 / Root Cause Analysis */}
            <section className="flex flex-col gap-3">
              <span className="text-xs font-mono text-[#8f9194] tracking-widest uppercase">
                03 / Root Cause Analysis
              </span>
              <div className="p-5 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xl text-white font-light">V = -L · (di/dt)</span>
                  <span className="text-xs text-[#8f9194] font-mono">Inductive Kickback Formulation</span>
                </div>
                <p className="text-xs sm:text-sm text-[#e5e2e3] font-light leading-relaxed">
                  The relay coil operates as an inductor with significant stored magnetic energy. When current is abruptly severed by the 2N2222 discrete transistor driver, the collapsing magnetic field generates a back-EMF inductive voltage spike reaching <strong className="text-white font-medium">-24V</strong> across the open switch node.
                </p>
                <p className="text-xs sm:text-sm text-[#8f9194] font-light leading-relaxed">
                  Because the development breadboard used a unified ground rail for both the logic ground return and the relay coil ground sink, this negative inductive pulse coupled directly into the shared ground plane. The sudden ground bounce collapsed the 3.3V low-dropout regulator output for 4.2 microseconds, immediately tripping the silicon brownout watchdog.
                </p>
              </div>
            </section>

            {/* 04 / Solution & Verification */}
            <section className="flex flex-col gap-4">
              <span className="text-xs font-mono text-[#8f9194] tracking-widest uppercase">
                04 / Solution &amp; Verification
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-2">
                  <span className="text-xs font-mono text-white uppercase tracking-wider">
                    Corrective Action Implemented
                  </span>
                  <p className="text-xs text-[#8f9194] leading-relaxed">
                    Soldered a <strong className="text-white font-medium">1N4007 silicon rectifier diode</strong> in antiparallel configuration directly across the relay coil terminals:
                  </p>
                  <div className="p-2.5 rounded bg-[#0e0e0f] flex flex-col gap-0.5 font-mono text-xs text-white border border-[#2a2a2b]">
                    <div>Cathode → +5V Relay VCC Rail</div>
                    <div>Anode → 2N2222 Transistor Collector</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-2">
                  <span className="text-xs font-mono text-white uppercase tracking-wider">
                    Physical Principle
                  </span>
                  <p className="text-xs text-[#8f9194] leading-relaxed">
                    The diode provides a recirculating freewheeling loop. The back-EMF spike is clamped to the <strong className="text-white font-medium">~0.7V forward drop</strong> of the silicon junction, safely dissipating the coil magnetic field energy without ground bounce.
                  </p>
                </div>
              </div>

              {/* Bench Validation Matrix */}
              <div className="p-5 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white uppercase tracking-wider">Bench Validation Matrix</span>
                  <span className="text-[#c6c6cf]">50/50 Cycles Clean</span>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#8f9194]">Pre-fix 3.3V Rail Sag</span>
                      <span className="font-mono text-[#ffb4ab]">-650 mV (Failed)</span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#201f20] overflow-hidden">
                      <div className="bg-[#ffb4ab] h-full w-[85%] rounded"></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white">Post-fix 3.3V Rail Ripple with 1N4007</span>
                      <span className="font-mono text-white">&lt; 18 mV (Clean)</span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#201f20] overflow-hidden">
                      <div className="bg-white h-full w-[4%] rounded"></div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#8f9194] pt-1">
                  Verified across 50 rapid sequential relay actuations (100ms interval toggle script). Zero brownout triggers; UART telemetry showed continuous uptime without CPU clock degradation.
                </p>

                {/* Solder Macro Photo */}
                <div
                  onClick={() =>
                    onOpenPhotoLightbox(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCaiVsPnDgojyVaZDg71hNY52S0HkPlLRz5E_J4r7wqql41gCPBb8g_7yAvQzaERHR7tmec1QKrHyffCbDw32I5q-IgtcUhAkmzerTLzkexGurylb8FUXFMha8D4tQ_1R3DPq8U74ZWyLdoEJtFOeTWwb0yyXHlTJRqtjxLYmvw4U74w-I7R2B9Rn6sxI9xkhMdSOYQnculU1E3AM0ZK9SsPjzgAxymPo0PgrPA9nYbQ26_NFxXNngwtg',
                      'photo_2_flyback_installation.raw',
                      'Confirmed 14:14 UTC · [commit 8f9b02] · Macro Solder'
                    )
                  }
                  className="relative w-full h-52 rounded-lg overflow-hidden bg-[#0e0e0f] group cursor-pointer border border-[#2a2a2b] mt-1"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaiVsPnDgojyVaZDg71hNY52S0HkPlLRz5E_J4r7wqql41gCPBb8g_7yAvQzaERHR7tmec1QKrHyffCbDw32I5q-IgtcUhAkmzerTLzkexGurylb8FUXFMha8D4tQ_1R3DPq8U74ZWyLdoEJtFOeTWwb0yyXHlTJRqtjxLYmvw4U74w-I7R2B9Rn6sxI9xkhMdSOYQnculU1E3AM0ZK9SsPjzgAxymPo0PgrPA9nYbQ26_NFxXNngwtg"
                    alt="Flyback installation macro"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <div className="flex items-center justify-between w-full text-xs">
                      <span className="font-mono text-white">Evidence Tag: photo_2_flyback_installation.raw</span>
                      <span className="text-[#8f9194]">Confirmed 14:14 UTC · [commit 8f9b02]</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cited Logs */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono text-[#8f9194]">
                <span>Cited Logs:</span>
                <span className="px-2 py-0.5 rounded bg-[#201f20] text-white">[voice 14:02]</span>
                <span className="px-2 py-0.5 rounded bg-[#201f20] text-white">[photo 1 14:08]</span>
                <span className="px-2 py-0.5 rounded bg-[#201f20] text-white">[photo 2 14:14]</span>
                <span className="px-2 py-0.5 rounded bg-[#201f20] text-white">[commit 8f9b02]</span>
              </div>
            </section>
          </article>
        </div>

        {/* Right Column: Contextual Engineering Inspector Sidebar (Cols 4) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Related Commits */}
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <span className="font-headline text-base text-white font-light">Related Commits</span>
              <span className="material-symbols-outlined text-[#8f9194] text-[18px]">account_tree</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-medium">c4e12a</span>
                  <span className="text-[#8f9194] uppercase text-[10px]">Reverted</span>
                </div>
                <p className="text-[#e5e2e3]">
                  fix(firmware): add 15ms software debounce delay on relay GPIO 5
                </p>
                <span className="text-[#8f9194] font-mono text-[11px]">Author: Firmware Lead · 14:05</span>
              </div>

              <div className="p-3 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-medium">8f9b02</span>
                  <span className="text-white uppercase text-[10px]">Main</span>
                </div>
                <p className="text-[#e5e2e3]">
                  chore(docs): record 1N4007 flyback diode in BOM and schematics
                </p>
                <span className="text-[#8f9194] font-mono text-[11px]">Author: Hardware Lead · 14:16</span>
              </div>
            </div>
          </div>

          {/* Bench Rules Learned */}
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <span className="font-headline text-base text-white font-light">Bench Rules Learned</span>
              <span className="material-symbols-outlined text-[#8f9194] text-[18px]">lightbulb</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-1">
                <span className="text-xs font-mono text-white uppercase tracking-wide">
                  Rule 01 — Inductive Suppression
                </span>
                <p className="text-xs text-[#8f9194] leading-relaxed">
                  Always populate antiparallel flyback diodes across inductive coils, even on optocoupled boards if logic and switching planes share a ground return path.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#161618] border border-[#2a2a2b] flex flex-col gap-1">
                <span className="text-xs font-mono text-white uppercase tracking-wide">
                  Rule 02 — Domain Boundary
                </span>
                <p className="text-xs text-[#8f9194] leading-relaxed">
                  Software debounce cannot mitigate physical inductive back-EMF ground bounce. Diagnose power rail transients with analog triggers before writing logic workarounds.
                </p>
              </div>
            </div>
          </div>

          {/* Cross References */}
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-2.5 shadow-sm">
            <span className="font-headline text-base text-white font-light pb-1 border-b border-[#2a2a2b]/40">
              Cross References
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <button
                onClick={() => onSelectView('bom-and-parts')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors text-white border border-[#2a2a2b]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">list_alt</span>
                  <span>Bill of Materials (BOM.md)</span>
                </div>
                <span className="font-mono text-[#8f9194]">+1 Part Added</span>
              </button>

              <button
                onClick={() => {
                  setToastMsg('Rigol Raw Waveform CSV exported (248 KB)');
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors text-white border border-[#2a2a2b]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">show_chart</span>
                  <span>Raw Rigol Waveform CSV</span>
                </div>
                <span className="font-mono text-[#8f9194]">248 KB</span>
              </button>

              <button
                onClick={() => onSelectView('system-diagrams')}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors text-white border border-[#2a2a2b]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">schema</span>
                  <span>Schematic v2.4 Revision</span>
                </div>
                <span className="font-mono text-[#8f9194]">D1 Flyback</span>
              </button>
            </div>
          </div>

          {/* Bench Telemetry Card */}
          <div className="p-5 rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
                Bench Telemetry
              </span>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex flex-col">
                <span className="text-[#8f9194]">Bench Supply</span>
                <span className="text-base text-white mt-0.5">5.04 V</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex flex-col">
                <span className="text-[#8f9194]">LDO Output</span>
                <span className="text-base text-white mt-0.5">3.31 V</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex flex-col">
                <span className="text-[#8f9194]">Ambient Temp</span>
                <span className="text-base text-white mt-0.5">22.4 °C</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex flex-col">
                <span className="text-[#8f9194]">ESD Earth</span>
                <span className="text-base text-white mt-0.5">0.08 Ω</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

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
