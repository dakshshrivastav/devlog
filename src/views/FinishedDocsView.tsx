import React, { useState } from 'react';
import { ActiveView } from '../types';

interface FinishedDocsViewProps {
  onSelectView: (view: ActiveView) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
  onOpenExport: () => void;
  openGapsCount: number;
}

export const FinishedDocsView: React.FC<FinishedDocsViewProps> = ({
  onSelectView,
  onOpenPhotoLightbox,
  onOpenExport,
  openGapsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'readme' | 'observer' | 'diagrams' | 'bom' | 'troubleshoot' | 'gaps'>('readme');
  const [copyStatus, setCopyStatus] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCopyReadme = () => {
    const readmeContent = `# ESP32 Relay Controller with Inductive Kickback Protection
Dual-channel switching circuit with flyback diode snubbing and environmental telemetry.

## 1. OVERVIEW
A simple controller board using an ESP32-WROOM-32 to drive a 5V mechanical relay and poll a BME280 environmental sensor over I2C. [voice 14:02]

## 2. HARDWARE ARCHITECTURE & SCHEMATIC
The ESP32 GPIO 5 switches the relay through a 2N2222 transistor driver. A 1N4007 flyback diode is installed antiparallel across the relay coil to protect the 3.3V rail from inductive voltage spikes. [photo 2]

SCHEMATIC:
ESP32 GPIO 5 ──[ 1kΩ ]──> Base (2N2222)
+5V Rail ──────┬───────── Coil (+) [Relay]
               │           │
           [1N4007]        │ (Antiparallel Diode)
               ▲           │
               └───────── Coil (-) ──> Collector (2N2222)
Emitter (2N2222) ──> GND

## 3. TROUBLESHOOTING & ROOT CAUSE
Problem: ESP32 browned out and reset every time the relay turned off.
Root cause: Inductive back-EMF spiked back into the common ground plane, causing the 3.3V regulator to drop below 2.7V.
Fix: 1N4007 diode clamped the spike at ~0.7V. [voice 14:14]

## 4. BILL OF MATERIALS
- ESP32 DevKit v1 (WROOM-32) - Qty: 1 [commit 32c9e1]
- 5V SPDT Mechanical Relay Module - Qty: 1 [photo 1]
- 1N4007 1A Rectifier Diode (Flyback) - Qty: 1 [photo 2]
- BME280 I2C Sensor Module (3.3V) - Qty: 1 [voice 08:30]
`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readmeContent);
    }
    setCopyStatus(true);
    setToastMsg('Copied README.md to clipboard');
    setTimeout(() => {
      setCopyStatus(false);
      setToastMsg(null);
    }, 2500);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Top Banner */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#2a2a2b]/40">
          <div className="flex flex-col gap-2 max-w-[72ch]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8f9194]">
              Build Session Log · esp32-relay-ctrl
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
              Finished Documentation
            </h1>
            <p className="text-sm sm:text-base text-[#c5c7c9] font-light leading-relaxed">
              Generated from 14 minutes of speech, 2 bench photos, and 3 git commits.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1c1b1c] rounded-full text-white text-xs font-mono border border-[#2a2a2b]">
              <span className="w-2 h-2 rounded-full bg-[#c6c6cf]"></span>
              <span>Source Tagged · 3 Commits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Typographic Pivot Navigation */}
      <div className="w-full flex items-center gap-6 sm:gap-8 overflow-x-auto pb-3 mb-8 scrollbar-none border-b border-[#2a2a2b]/40 text-xs sm:text-sm font-headline">
        <button
          onClick={() => setActiveTab('readme')}
          className={`shrink-0 transition-colors ${
            activeTab === 'readme'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          README.md
        </button>

        <button
          onClick={() => setActiveTab('observer')}
          className={`shrink-0 transition-colors ${
            activeTab === 'observer'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          OBSERVER_NOTES.md
        </button>

        <button
          onClick={() => setActiveTab('diagrams')}
          className={`shrink-0 transition-colors ${
            activeTab === 'diagrams'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          diagrams/system.mmd
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`shrink-0 transition-colors ${
            activeTab === 'bom'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          BOM.md
        </button>

        <button
          onClick={() => setActiveTab('troubleshoot')}
          className={`shrink-0 transition-colors ${
            activeTab === 'troubleshoot'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          TROUBLESHOOTING.md
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`shrink-0 transition-colors ${
            activeTab === 'gaps'
              ? 'text-white font-medium border-b-2 border-white pb-2.5'
              : 'text-[#8f9194] hover:text-white pb-2.5'
          }`}
        >
          GAPS.md ({openGapsCount})
        </button>
      </div>

      {/* Main Editorial Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* The Reader / Left Publication View */}
        <article className="xl:col-span-8 flex flex-col gap-8 bg-[#1c1b1c] rounded-xl p-6 sm:p-8 md:p-10 border border-[#2a2a2b] shadow-md">
          {activeTab === 'readme' ? (
            <>
              <header className="flex flex-col gap-3 pb-6 border-b border-[#2a2a2b]/60">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#8f9194]">
                  <span>DOCS // README.MD · COMMIT 8A19F3</span>
                  <span className="flex items-center gap-1.5 text-white">
                    <span className="material-symbols-outlined text-[16px] text-white">verified</span>
                    Ground truth referenced
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-white font-light tracking-tight">
                    # ESP32 Relay Controller with Inductive Kickback Protection
                  </h2>
                  <p className="text-sm sm:text-base text-[#c5c7c9] max-w-[68ch] leading-relaxed font-light">
                    Dual-channel switching circuit with flyback diode snubbing and environmental telemetry.
                  </p>
                </div>
              </header>

              {/* 1. Overview */}
              <div className="flex flex-col gap-2 max-w-[68ch]">
                <span className="text-xs font-mono uppercase tracking-wider text-white font-medium">
                  1. Overview
                </span>
                <p className="text-sm sm:text-base text-[#e5e2e3] font-light leading-relaxed">
                  A simple controller board using an ESP32-WROOM-32 to drive a 5V mechanical relay and poll a BME280 environmental sensor over I2C.{' '}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#201f20] text-white font-mono text-xs border border-[#2a2a2b]">
                    <span className="material-symbols-outlined text-[13px] text-[#c6c6cf]">mic</span>
                    [voice 14:02]
                  </span>
                </p>
              </div>

              {/* 2. Hardware Architecture & Schematic */}
              <div className="flex flex-col gap-3 max-w-[68ch]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-white font-medium">
                    2. Hardware Architecture &amp; Schematic
                  </span>
                  <span className="text-xs font-mono text-[#8f9194]">GPIO 5 · 2N2222 Driver</span>
                </div>
                <p className="text-sm sm:text-base text-[#e5e2e3] font-light leading-relaxed">
                  The ESP32 GPIO 5 switches the relay through a 2N2222 transistor driver. A 1N4007 flyback diode is installed antiparallel across the relay coil to protect the 3.3V rail from inductive voltage spikes.{' '}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#201f20] text-white font-mono text-xs border border-[#2a2a2b]">
                    <span className="material-symbols-outlined text-[13px] text-[#c6c6cf]">photo_camera</span>
                    [photo 2]
                  </span>
                </p>

                {/* ASCII Schematic snippet */}
                <div className="w-full bg-[#161618] rounded-lg p-5 font-mono text-xs text-[#c5c7c9] overflow-x-auto leading-relaxed border border-[#2a2a2b] shadow-inner">
                  <div className="text-[#8f9194] text-[11px] mb-2 font-mono">
                    SCHEMATIC SNIPPET // POWER &amp; COIL SNUBBER
                  </div>
                  <pre className="text-white">
{`ESP32 GPIO 5 ──[ 1kΩ ]──> Base (2N2222)
+5V Rail ──────┬───────── Coil (+) [Relay]
               │           │
           [1N4007]        │ (Antiparallel Diode)
               ▲           │
               └───────── Coil (-) ──> Collector (2N2222)
Emitter (2N2222) ──> GND`}
                  </pre>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() =>
                    onOpenPhotoLightbox(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCD5to5A76d0i_TmL_hICdVtrTHk-hvjDKYCkDP7Zg6VXl7RY-lX_II1Cp2LCatMi1tQ_YKqoJSl3M8lbiRsadXgiq0VAcpdsz4a_Ms7aZsLeEoySMt4mdQbXD4tRI-YZS-HueKfLZ-4p7NGcnFCe4OPQP1lgot_eQD1A7jzbisdHJm3cSSD5l1zfA8DYHJA_Ypi1xdu6W2t48TNU2Hozbu_XaKjtm99JXhVQsMmfvYUNOMLaY4Ny8M1Q',
                      'Bench Photo 1: ESP32 + 2N2222 Breadboard',
                      'Verified pinout configuration [photo 1]'
                    )
                  }
                  className="relative rounded-lg overflow-hidden bg-[#161618] h-56 group border border-[#2a2a2b] cursor-pointer"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD5to5A76d0i_TmL_hICdVtrTHk-hvjDKYCkDP7Zg6VXl7RY-lX_II1Cp2LCatMi1tQ_YKqoJSl3M8lbiRsadXgiq0VAcpdsz4a_Ms7aZsLeEoySMt4mdQbXD4tRI-YZS-HueKfLZ-4p7NGcnFCe4OPQP1lgot_eQD1A7jzbisdHJm3cSSD5l1zfA8DYHJA_Ypi1xdu6W2t48TNU2Hozbu_XaKjtm99JXhVQsMmfvYUNOMLaY4Ny8M1Q"
                    alt="Breadboard"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent p-4 flex flex-col justify-end">
                    <span className="text-xs text-white font-medium">Bench Photo 1: ESP32 + 2N2222 Breadboard</span>
                    <span className="text-[11px] text-[#8f9194] font-mono">Verified pinout configuration [photo 1]</span>
                  </div>
                </div>

                <div
                  onClick={() =>
                    onOpenPhotoLightbox(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCLQEHJjfIpOg1lbDzjppmPSj4_4hyMU4KOeT2YZB58OU6rz8jcyxd3AL6jFraEjTsmXz8JxsK325-ArLbRj4_HlRjc6P2hJjnurfiGZE14OpDp1e-iIhOxezcpVZPekHjO8zYxtVtpMpcyOuCo2uT8xV4Adsqc8dI054b_aEEoCiAQ3VtK1fXNy1etreON3RryVUjeil7K_67LIF0e4Ftr_9Pj5yuHtxejDDw98UIuVmdFK2z5ijU_xw',
                      'Bench Photo 2: 1N4007 Diode Placement',
                      'Cathode facing 5V rail on relay screw terminals [photo 2]'
                    )
                  }
                  className="relative rounded-lg overflow-hidden bg-[#161618] h-56 group border border-[#2a2a2b] cursor-pointer"
                >
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLQEHJjfIpOg1lbDzjppmPSj4_4hyMU4KOeT2YZB58OU6rz8jcyxd3AL6jFraEjTsmXz8JxsK325-ArLbRj4_HlRjc6P2hJjnurfiGZE14OpDp1e-iIhOxezcpVZPekHjO8zYxtVtpMpcyOuCo2uT8xV4Adsqc8dI054b_aEEoCiAQ3VtK1fXNy1etreON3RryVUjeil7K_67LIF0e4Ftr_9Pj5yuHtxejDDw98UIuVmdFK2z5ijU_xw"
                    alt="Diode placement"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent p-4 flex flex-col justify-end">
                    <span className="text-xs text-white font-medium">Bench Photo 2: 1N4007 Diode Placement</span>
                    <span className="text-[11px] text-[#8f9194] font-mono">Cathode facing 5V rail on relay screw terminals [photo 2]</span>
                  </div>
                </div>
              </div>

              {/* 3. Troubleshooting */}
              <div className="flex flex-col gap-3 max-w-[68ch]">
                <span className="text-xs font-mono uppercase tracking-wider text-white font-medium">
                  3. Troubleshooting &amp; Root Cause
                </span>
                <div className="p-4 bg-[#161618] rounded-lg border border-[#2a2a2b] flex items-start gap-3">
                  <span className="font-headline text-lg text-white font-light">!</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-white">Problem &amp; Root Cause Analysis</span>
                    <p className="text-xs text-[#8f9194] leading-relaxed">
                      Problem: ESP32 browned out and reset every time the relay turned off. Root cause: Inductive back-EMF spiked back into the common ground plane, causing the 3.3V regulator to drop below 2.7V. Fix: 1N4007 diode clamped the spike at ~0.7V.{' '}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#201f20] text-white font-mono text-[11px]">
                        <span className="material-symbols-outlined text-[13px] text-[#c6c6cf]">mic</span>
                        [voice 14:14]
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Bill of Materials */}
              <div className="flex flex-col gap-3 max-w-[68ch]">
                <span className="text-xs font-mono uppercase tracking-wider text-white font-medium">
                  4. Bill of Materials
                </span>
                <div className="flex flex-col gap-1 bg-[#161618] rounded-lg p-4 font-mono text-xs border border-[#2a2a2b]">
                  <div className="flex justify-between py-1.5 border-b border-[#2a2a2b] text-[#e5e2e3]">
                    <span>ESP32 DevKit v1 (WROOM-32)</span>
                    <span className="text-[#8f9194]">Qty: 1 [commit 32c9e1]</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#2a2a2b] text-[#e5e2e3]">
                    <span>5V SPDT Mechanical Relay Module</span>
                    <span className="text-[#8f9194]">Qty: 1 [photo 1]</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#2a2a2b] text-[#e5e2e3]">
                    <span>1N4007 1A Rectifier Diode (Flyback)</span>
                    <span className="text-[#8f9194]">Qty: 1 [photo 2]</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#e5e2e3]">
                    <span>BME280 I2C Sensor Module (3.3V)</span>
                    <span className="text-[#8f9194]">Qty: 1 [voice 08:30]</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2b]/60 text-xs font-mono text-[#8f9194]">
                <span>devlog session #44 · commit 8a19f3</span>
                <span className="text-white">Ready for export</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#2a2a2b]/60 pb-3">
                <span className="text-sm font-mono text-white">DOCS // {activeTab.toUpperCase()}.MD</span>
                <button
                  onClick={() => setActiveTab('readme')}
                  className="text-xs text-[#8f9194] hover:text-white"
                >
                  Back to README.md
                </button>
              </div>
              <div className="p-6 bg-[#161618] rounded-lg font-mono text-xs text-[#c5c7c9] border border-[#2a2a2b] leading-relaxed">
                {activeTab === 'observer' && (
                  <div>
                    <h3 className="text-white text-sm mb-2 font-headline"># Observer Notes</h3>
                    <p>- 14:02: Resets observed on GPIO 5 trigger.</p>
                    <p>- 14:08: Oscilloscope captures 2.65V drop on 3.3V power bus.</p>
                    <p>- 14:10: Software debounce test (commit c4e12a) did not resolve reboot.</p>
                    <p>- 14:12: 1N4007 diode soldered across coil.</p>
                    <p>- 14:14: Verified voltage stability across 50 cycles.</p>
                  </div>
                )}
                {activeTab === 'diagrams' && (
                  <div>
                    <h3 className="text-white text-sm mb-2 font-headline"># System Architecture</h3>
                    <p>Refer to `diagrams/system.mmd`.</p>
                    <p>Includes power step-down, relay actuator, flyback diode loop, and microcontroller logic.</p>
                  </div>
                )}
                {activeTab === 'bom' && (
                  <div>
                    <h3 className="text-white text-sm mb-2 font-headline"># Bill of Materials</h3>
                    <p>U1: ESP32 DevKit v1 | 1 pcs</p>
                    <p>K1: 5V SPDT Mechanical Relay Module | 1 pcs</p>
                    <p>D1: 1N4007 Rectifier Diode (Flyback) | 1 pcs</p>
                    <p>MOD1: BME280 I2C Sensor Module | 1 pcs</p>
                  </div>
                )}
                {activeTab === 'troubleshoot' && (
                  <div>
                    <h3 className="text-white text-sm mb-2 font-headline"># Troubleshooting</h3>
                    <p>Anomaly: Brownout reset caused by inductive kickback.</p>
                    <p>Equation: V = -L * (di/dt)</p>
                    <p>Fix: Antiparallel silicon diode across coil terminals.</p>
                  </div>
                )}
                {activeTab === 'gaps' && (
                  <div>
                    <h3 className="text-white text-sm mb-2 font-headline"># GAPS</h3>
                    <p>Open items pending user bench verification: {openGapsCount} item(s).</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>

        {/* Quiet Confidence & Export Controls / Right Column */}
        <aside className="xl:col-span-4 flex flex-col gap-6">
          {/* Evidence Verification */}
          <div className="bg-[#1c1b1c] rounded-xl p-6 border border-[#2a2a2b] shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[20px]">
                  verified_user
                </span>
                <span className="font-headline text-lg text-white font-light">
                  Evidence Verification
                </span>
              </div>
              <span className="text-xs font-mono text-white px-2 py-0.5 rounded bg-[#201f20] border border-[#2a2a2b]">
                100% Sourced
              </span>
            </div>

            <p className="text-xs text-[#8f9194] leading-relaxed">
              100% of claims cite a source tag ([voice], [photo], [commit]). {openGapsCount} gap{openGapsCount !== 1 ? 's' : ''} flagged for builder review.
            </p>

            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex items-start gap-3 p-2.5 bg-[#161618] rounded-lg border border-[#2a2a2b]">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px] shrink-0 mt-0.5">
                  mic
                </span>
                <div className="flex flex-col">
                  <span className="text-white font-medium">14 minutes of speech logs</span>
                  <span className="text-[#8f9194]">4 verified voice statements</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-[#161618] rounded-lg border border-[#2a2a2b]">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px] shrink-0 mt-0.5">
                  photo_camera
                </span>
                <div className="flex flex-col">
                  <span className="text-white font-medium">2 bench photos</span>
                  <span className="text-[#8f9194]">Hardware pinout &amp; diode placement</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-[#161618] rounded-lg border border-[#2a2a2b]">
                <span className="material-symbols-outlined text-[#8f9194] text-[18px] shrink-0 mt-0.5">
                  commit
                </span>
                <div className="flex flex-col">
                  <span className="text-white font-medium">3 git commits</span>
                  <span className="text-[#8f9194]">Pin assignment &amp; brownout patch</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => onSelectView('observations')}
              className="flex items-center gap-3 p-3 bg-[#201f20] rounded-lg border border-[#353436] cursor-pointer hover:border-[#8f9194] transition-colors"
            >
              <span className="material-symbols-outlined text-[#ffb4ab] text-[22px]">
                pending_actions
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-white font-medium">
                  {openGapsCount} Review Item{openGapsCount !== 1 ? 's' : ''} in GAPS.md
                </span>
                <span className="text-[11px] text-[#8f9194]">
                  Coil spec &amp; operating voltage confirmation
                </span>
              </div>
            </div>
          </div>

          {/* Export files */}
          <div className="bg-[#1c1b1c] rounded-xl p-6 border border-[#2a2a2b] shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <span className="font-headline text-lg text-white font-light">Export files</span>
              <span className="text-xs font-mono text-[#8f9194]">Bundle Ready</span>
            </div>

            <button
              onClick={onOpenExport}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-[#e2e2e4] text-[#131314] rounded-lg font-medium text-xs sm:text-sm transition-all shadow"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download documentation bundle (.zip)</span>
            </button>

            <div className="flex flex-col gap-2 pt-1 text-xs">
              <button
                onClick={handleCopyReadme}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#161618] hover:bg-[#201f20] rounded-lg text-white transition-colors border border-[#2a2a2b]"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">
                    content_copy
                  </span>
                  <span>Copy README.md to clipboard</span>
                </span>
                <span className="font-mono text-[#8f9194]">
                  {copyStatus ? '✓ Copied' : 'Cmd+C'}
                </span>
              </button>

              <button
                onClick={() => onSelectView('system-diagrams')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#161618] hover:bg-[#201f20] rounded-lg text-white transition-colors border border-[#2a2a2b]"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">
                    schema
                  </span>
                  <span>Export Mermaid diagrams (.mmd)</span>
                </span>
                <span className="material-symbols-outlined text-[#8f9194] text-[15px]">
                  arrow_outward
                </span>
              </button>

              <button
                onClick={() => onSelectView('observations')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#161618] hover:bg-[#201f20] rounded-lg text-white transition-colors border border-[#2a2a2b]"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8f9194] text-[16px]">
                    flag
                  </span>
                  <span>View GAPS.md ({openGapsCount} open)</span>
                </span>
                <span className="material-symbols-outlined text-[#8f9194] text-[15px]">
                  arrow_outward
                </span>
              </button>
            </div>

            <div className="p-3 bg-[#161618] rounded-lg border border-[#2a2a2b] text-[11px] font-mono text-[#8f9194] flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>Files in Bundle</span>
                <span className="text-white">6 markdown &amp; mmd assets</span>
              </div>
              <div className="flex justify-between">
                <span>Repo Branch</span>
                <span className="text-white">main · esp32-relay</span>
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
