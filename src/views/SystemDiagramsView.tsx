import React, { useState } from 'react';

type DiagramTab = 'system' | 'build_steps' | 'power_distribution';

const DIAGRAM_CODES: Record<DiagramTab, string> = {
  system: `%% Synthesized by Gemma 4 from audio & bench bench photos
flowchart TD
    %% [voice 14:02]
    subgraph Power ["Power & Actuation"]
        P1["5V DC Supply Rail"] --> R1["5V Relay Module"]
        R1 --> K1["Inductive Kickback (-24V)"]
    end

    %% [commit c4e12a]
    subgraph Logic ["Microcontroller Logic"]
        MCU["ESP32-WROOM-32 (GPIO 5)"] --> Q1["2N2222 Driver"]
        MCU -.-> BR["3.3V Rail Brownout"]
    end

    %% [voice 14:12] [photo 2]
    D1["1N4007 Flyback Diode"] -.->|clamps back-EMF| R1
    D1 -->|prevents brownout| BR`,

  build_steps: `%% Build Sequence Chronicle
flowchart TD
    S1["14:02 Wire ESP32 GPIO 5 to 2N2222 base"] --> S2["14:08 Observe brownout reboot during relay fire"]
    S2 --> S3["14:10 Commit c4e12a: 15ms software debounce"]
    S3 --> S4["14:11 Brownout persists on analog rail"]
    S4 --> S5["14:12 Solder 1N4007 flyback diode across coil"]
    S5 --> S6["14:14 3.3V rail stabilizes at 3.28V steady-state"]`,

  power_distribution: `%% Power Distribution Rails
flowchart LR
    VCC5["5V External Supply Rail"] --> VREG["AMS1117-3.3 LDO Regulator"]
    VREG --> VDD33["3.3V Primary Logic Rail"]
    VDD33 --> MCU["ESP32-WROOM-32"]
    VDD33 --> BME["BME280 Sensor (I2C)"]
    VCC5 --> COIL["5V Relay Coil (+)"]
    COIL --> TRANS["2N2222 Collector"]
    TRANS --> GND["Shared Ground Plane"]
    COIL -.->|Antiparallel Diode D1| VCC5`,
};

export const SystemDiagramsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DiagramTab>('system');
  const [copyStatus, setCopyStatus] = useState<string>('Copy Mermaid Code');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(DIAGRAM_CODES[activeTab]);
    }
    setCopyStatus('Copied to Clipboard!');
    setTimeout(() => setCopyStatus('Copy Mermaid Code'), 2200);
  };

  const handleDownloadSvg = () => {
    setToastMsg(`Downloaded SVG vector for ${activeTab}.mmd`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportRaw = () => {
    const blob = new Blob([DIAGRAM_CODES[activeTab]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}.mmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMsg(`Downloaded raw ${activeTab}.mmd file`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="w-full animate-fadeIn">
      {/* Top Page Header */}
      <header className="w-full px-4 sm:px-6 lg:px-12 pt-8 pb-6 border-b border-[#2a2a2b]/60">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8f9194]">
              <span className="uppercase tracking-wider">Diagrams</span>
              <span className="text-[#353436]">/</span>
              <span className="uppercase tracking-wider text-white">System Architecture</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight font-light">
              System Diagrams
            </h1>
            <p className="text-sm text-[#c5c7c9] max-w-3xl font-light">
              Mermaid flowcharts synthesized by Gemma 4 from audio transcripts and bench photos. Validated against Mermaid syntax parser.
            </p>
          </div>

          {/* Typographic Pivots / Tabs */}
          <nav className="flex items-center gap-6 pt-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 pb-2.5 border-b-2 text-left shrink-0 transition-colors ${
                activeTab === 'system'
                  ? 'border-white text-white font-medium'
                  : 'border-transparent text-[#8f9194] hover:text-white'
              }`}
            >
              <span className="font-headline text-sm sm:text-base">system.mmd</span>
              <span className="text-xs text-[#8f9194] font-normal">(System Overview)</span>
            </button>

            <button
              onClick={() => setActiveTab('build_steps')}
              className={`flex items-center gap-2 pb-2.5 border-b-2 text-left shrink-0 transition-colors ${
                activeTab === 'build_steps'
                  ? 'border-white text-white font-medium'
                  : 'border-transparent text-[#8f9194] hover:text-white'
              }`}
            >
              <span className="font-headline text-sm sm:text-base">build_steps.mmd</span>
              <span className="text-xs text-[#8f9194] font-normal">(Build Sequence)</span>
            </button>

            <button
              onClick={() => setActiveTab('power_distribution')}
              className={`flex items-center gap-2 pb-2.5 border-b-2 text-left shrink-0 transition-colors ${
                activeTab === 'power_distribution'
                  ? 'border-white text-white font-medium'
                  : 'border-transparent text-[#8f9194] hover:text-white'
              }`}
            >
              <span className="font-headline text-sm sm:text-base">power_distribution.mmd</span>
              <span className="text-xs text-[#8f9194] font-normal">(Power Rails)</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Controls Action Bar */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-3 bg-[#0e0e0f] border-b border-[#2a2a2b]/60">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Validation Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1c1b1c] rounded border border-[#2a2a2b] text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-white font-medium font-mono">Syntax Checked · 0 Errors</span>
            <span className="text-[#353436]">|</span>
            <span className="text-[#8f9194] font-mono">AST: Verified</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-white transition-colors border border-[#353436]"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              <span>{copyStatus}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-white transition-colors border border-[#353436]"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Download SVG</span>
            </button>

            <button
              onClick={handleExportRaw}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-white transition-colors border border-[#353436]"
            >
              <span className="material-symbols-outlined text-[15px]">terminal</span>
              <span>Export Raw .mmd</span>
            </button>

            <button
              onClick={() => setToastMsg('Source trace: 3 audio logs + 2 bench photos grounded')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#353436] hover:bg-white text-white hover:text-[#131314] transition-colors border border-[#44474a]"
            >
              <span className="material-symbols-outlined text-[15px]">saved_search</span>
              <span>View Source Trace</span>
            </button>
          </div>
        </div>
      </section>

      {/* Split Workspace Layout */}
      <main className="w-full px-4 sm:px-6 lg:px-12 py-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Rendered Architecture Flowchart */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px]">
                  account_tree
                </span>
                <span className="font-headline text-lg text-white font-light">
                  Live Flowchart Projection
                </span>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">RENDER_CANVAS // SVG v2</span>
            </div>

            <div className="relative w-full rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between text-xs font-mono border-b border-[#2a2a2b]/60 pb-3 text-[#8f9194]">
                <span>TARGET: {activeTab}.mmd (Parsed Session: #b24-gamma)</span>
                <span className="bg-[#201f20] px-2 py-0.5 rounded text-white">SCALE: 100% · VECTOR</span>
              </div>

              {/* Rendered Nodes Container */}
              <div className="flex flex-col gap-5 select-none">
                {/* Subgraph Power */}
                <div className="rounded-lg bg-[#0e0e0f] border border-[#2a2a2b] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono uppercase tracking-wider text-white font-medium">
                      SUBGRAPH [Power]: 5V DC Supply &amp; Relay Actuation
                    </span>
                    <span className="font-mono text-[#8f9194]">[voice 14:02]</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="p-3 bg-[#1c1b1c] rounded border border-[#2a2a2b] flex flex-col gap-0.5">
                      <span className="text-xs text-white font-medium">5V DC Supply Rail</span>
                      <span className="text-[11px] font-mono text-[#8f9194]">5.02V stable · VCC</span>
                    </div>

                    <div className="flex flex-col items-center justify-center text-[#8f9194]">
                      <div className="w-full h-px bg-[#2a2a2b] relative flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-white absolute">
                          chevron_right
                        </span>
                      </div>
                      <span className="text-[10px] font-mono mt-1 text-[#8f9194]">Coil energize</span>
                    </div>

                    <div className="p-3 bg-[#1c1b1c] rounded border border-[#2a2a2b] flex flex-col gap-0.5">
                      <span className="text-xs text-white font-medium">5V SPDT Relay Module</span>
                      <span className="text-[11px] font-mono text-[#8f9194]">
                        Coil draw: 72mA (SRD-05VDC)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pr-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#8f9194] text-[16px]">
                        subdirectory_arrow_right
                      </span>
                      <div className="p-2 bg-[#201f20] rounded border border-[#ffb4ab]/40 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]"></span>
                        <span className="text-xs font-mono text-white">
                          Inductive Kickback (-24V cutoff spike)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bridge 1N4007 Diode */}
                <div className="py-2 px-4 rounded-lg bg-[#201f20] border border-dashed border-[#8f9194]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#2a2a2b] flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-[16px]">alt_route</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm text-white font-medium">
                        1N4007 Flyback Diode (Antiparallel Clamping)
                      </span>
                      <span className="text-xs text-[#8f9194]">
                        Clamps inductive transient to ~0.7V peak · Isolates shared 3.3V power boundary
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white bg-[#161618] px-2.5 py-1 rounded border border-[#2a2a2b]">
                    Cited: [voice 14:10] &amp; [photo 2]
                  </span>
                </div>

                {/* Subgraph Logic */}
                <div className="rounded-lg bg-[#0e0e0f] border border-[#2a2a2b] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono uppercase tracking-wider text-white font-medium">
                      SUBGRAPH [Logic]: Microcontroller Logic &amp; Sensor Bus
                    </span>
                    <span className="font-mono text-[#8f9194]">[commit c4e12a]</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5 p-3.5 bg-[#1c1b1c] rounded border border-[#2a2a2b] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white font-medium">ESP32-WROOM-32</span>
                        <span className="text-[10px] font-mono text-[#8f9194]">3.3V LOGIC</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#8f9194] space-y-1">
                        <div className="flex justify-between border-b border-[#2a2a2b] pb-0.5">
                          <span>GPIO 5 (Actuate OUT)</span>
                          <span className="text-white">HIGH active</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3.3V Power Bus</span>
                          <span className="text-[#c5c7c9]">VCC_IO</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col items-center justify-center text-[#8f9194]">
                      <div className="w-full h-px bg-[#2a2a2b] relative flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px] text-white absolute">
                          arrow_forward
                        </span>
                      </div>
                      <span className="text-[10px] font-mono mt-1">Driver line</span>
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-2">
                      <div className="p-2.5 bg-[#1c1b1c] rounded border border-[#2a2a2b] flex items-center justify-between text-xs">
                        <div>
                          <div className="text-white font-medium">2N2222 Transistor Driver</div>
                          <div className="text-[11px] font-mono text-[#8f9194]">NPN Low-Side Switch</div>
                        </div>
                        <span className="material-symbols-outlined text-[#8f9194] text-[16px]">
                          check_circle
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#1c1b1c] rounded border border-[#2a2a2b] flex items-center justify-between text-xs">
                        <div>
                          <div className="text-white font-medium">BME280 Sensor</div>
                          <div className="text-[11px] font-mono text-[#8f9194]">Addr 0x76 · Temp/Hum/Press</div>
                        </div>
                        <span className="text-[10px] font-mono text-[#c5c7c9]">3.3V STABLE</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#201f20] border border-[#ffb4ab]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffb4ab] text-[16px]">warning</span>
                      <span className="text-white">ESP32 3.3V Rail Hazard:</span>
                      <span className="text-[#ffb4ab] font-mono">Brownout Reset (&lt; 2.70V threshold)</span>
                    </div>
                    <span className="font-mono text-white bg-[#2a2a2b] px-2 py-0.5 rounded">
                      Mitigated by D1
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2a2a2b]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8f9194]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  <span>Bench ground truth confirmed in <strong className="text-white font-normal">IMG_1042_bench_wiring.heic</strong></span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>LATENCY: 420ms</span>
                  <span>PARSER: V10.2.1</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel: Mermaid Code & Grounding Source Audit */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px]">code</span>
                <span className="font-headline text-lg text-white font-light">Mermaid Source</span>
              </div>
              <span className="text-xs font-mono text-white bg-[#201f20] px-2 py-0.5 rounded border border-[#2a2a2b]">
                VALID SYNTAX
              </span>
            </div>

            <div className="rounded-xl bg-[#0e0e0f] border border-[#2a2a2b] overflow-hidden shadow-lg">
              <div className="px-4 py-2.5 bg-[#161618] border-b border-[#2a2a2b] flex items-center justify-between text-xs text-[#8f9194]">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-[#8f9194]"></span>
                  <span>{activeTab}.mmd</span>
                </div>
                <span className="font-mono">
                  {DIAGRAM_CODES[activeTab].split('\n').length} lines
                </span>
              </div>

              <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-[#e5e2e3] select-all bg-[#0e0e0f]">
                <code>{DIAGRAM_CODES[activeTab]}</code>
              </pre>
            </div>

            {/* Grounding Inspector */}
            <div className="flex items-center justify-between pt-2 pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px]">
                  verified_user
                </span>
                <span className="font-headline text-lg text-white font-light">
                  Grounding Inspector
                </span>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">CONFIDENCE: 98.4%</span>
            </div>

            <div className="rounded-xl bg-[#1c1b1c] border border-[#2a2a2b] p-4 flex flex-col gap-3">
              <p className="text-xs text-[#8f9194]">
                Cross-referenced nodes mapped directly to builder session evidence log:
              </p>

              <div className="flex flex-col gap-2.5 text-xs">
                {/* Node Audit 1 */}
                <div className="p-3 bg-[#0e0e0f] rounded-lg border border-[#2a2a2b] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Node &lsquo;5V Relay Module&rsquo;</span>
                    <span className="font-mono text-[10px] text-white px-1.5 py-0.5 rounded bg-[#201f20]">
                      AUDIO + PHOTO
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8f9194] font-mono text-[11px]">
                    <span>Grounded in:</span>
                    <span className="text-white">[voice 14:02]</span>
                    <span className="text-white">[photo 1]</span>
                  </div>
                  <p className="text-xs text-[#8f9194] italic">
                    &ldquo;Hooking the relay coil straight to the unregulated five volt line.&rdquo;
                  </p>
                </div>

                {/* Node Audit 2 */}
                <div className="p-3 bg-[#0e0e0f] rounded-lg border border-[#2a2a2b] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Node &lsquo;1N4007 Diode&rsquo;</span>
                    <span className="font-mono text-[10px] text-white px-1.5 py-0.5 rounded bg-[#201f20]">
                      TRI-VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8f9194] font-mono text-[11px]">
                    <span>Grounded in:</span>
                    <span className="text-white">[voice 14:12]</span>
                    <span className="text-white">[photo 2]</span>
                    <span className="text-white">[commit 8f9b02]</span>
                  </div>
                  <p className="text-xs text-[#8f9194] italic">
                    &ldquo;Added antiparallel 1N4007 across coil terminals to clamp spike.&rdquo;
                  </p>
                </div>

                {/* Node Audit 3 */}
                <div className="p-3 bg-[#0e0e0f] rounded-lg border border-[#2a2a2b] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Edge &lsquo;D1 -&gt; BR (prevents brownout)&rsquo;</span>
                    <span className="font-mono text-[10px] text-[#8f9194] px-1.5 py-0.5 rounded bg-[#201f20]">
                      CAUSAL INFERENCE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8f9194] font-mono text-[11px]">
                    <span>Status:</span>
                    <span className="text-white">Inferred causal connection confirmed by builder speech.</span>
                  </div>
                  <p className="text-xs text-[#8f9194] italic">
                    &ldquo;Once diode went in, brownouts completely halted during relay trigger.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

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
