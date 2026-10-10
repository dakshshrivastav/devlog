import React, { useState } from 'react';
import { THOUGHT_NODES } from '../data/mockData';

interface LivingMapViewProps {
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
}

export const LivingMapView: React.FC<LivingMapViewProps> = ({
  onOpenPhotoLightbox,
}) => {
  const [unified, setUnified] = useState(false);
  const [uncluttered, setUncluttered] = useState(false);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);

  const handleThoughtHover = (targetId: string) => {
    setHighlightedTarget(targetId);
  };

  const handleThoughtLeave = () => {
    setHighlightedTarget(null);
  };

  const isHighlighted = (target: string) => {
    if (!highlightedTarget) return true;
    return highlightedTarget === target;
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn relative">
      {/* Ambient Luminous Underglow */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[500px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[350px] h-[350px] bg-white/[0.015] blur-[140px] rounded-full" />

      {/* Editorial Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#2a2a2b]/40">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            <span className="text-xs font-mono text-[#8f9194] uppercase tracking-widest">
              Active Synthesis
            </span>
            <span className="text-xs text-[#44474a]">/</span>
            <span className="text-xs text-[#8f9194]">Voice Feed Online</span>
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl text-white font-light tracking-tight lowercase">
            living map
          </h1>
          <p className="text-sm sm:text-base text-[#c5c7c9] max-w-[68ch] mt-2 font-light">
            Real-time structure formed directly from your voice.
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-3 self-start md:self-end">
          <button
            onClick={() => setUnified(!unified)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
              unified
                ? 'bg-white text-[#131314] border-white shadow-md'
                : 'bg-[#201f20] hover:bg-[#2a2a2b] text-white border-[#2a2a2b]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {unified ? 'done_all' : 'auto_fix_high'}
            </span>
            <span>{unified ? 'Ideas Unified' : 'Connect related ideas'}</span>
          </button>

          <div className="h-6 w-px bg-[#2a2a2b]"></div>

          <button
            onClick={() => setUncluttered(!uncluttered)}
            className={`px-3 py-2 text-xs rounded transition-colors ${
              uncluttered
                ? 'text-white bg-[#2a2a2b]'
                : 'text-[#8f9194] hover:text-white'
            }`}
          >
            {uncluttered ? 'Restore Stream' : 'Unclutter View'}
          </button>
        </div>
      </header>

      {/* Asymmetric Living Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative">
        {/* Left Column: Stream of Thought */}
        <aside
          className={`lg:col-span-4 flex flex-col gap-6 transition-all duration-300 ${
            uncluttered ? 'opacity-25 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex items-baseline justify-between border-b border-[#2a2a2b]/40 pb-2">
            <h2 className="font-headline text-lg sm:text-xl text-white font-light">
              Stream of thought
            </h2>
            <span className="text-xs text-[#8f9194] font-mono">Spoken chronologically</span>
          </div>

          <div className="flex flex-col gap-3.5">
            {THOUGHT_NODES.map((th) => (
              <div
                key={th.id}
                onMouseEnter={() => handleThoughtHover(th.targetId)}
                onMouseLeave={handleThoughtLeave}
                className="p-5 bg-[#1c1b1c] hover:bg-[#201f20] transition-all rounded-xl border border-[#2a2a2b] hover:border-[#8f9194]/40 cursor-pointer shadow-sm relative group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-white rounded-l transition-colors" />
                <div className="flex items-center justify-between text-xs text-[#8f9194] mb-1.5">
                  <span className="text-white font-medium font-mono">{th.title}</span>
                  <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">
                    arrow_outward
                  </span>
                </div>
                <p className="text-sm text-[#e5e2e3] font-light leading-relaxed">
                  {th.text}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8f9194]">
                  <span className="material-symbols-outlined text-[15px]">{th.icon}</span>
                  <span>{th.extractedNote}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Ambient Observation Capsule */}
          <div className="p-4 bg-[#0e0e0f] rounded-xl border border-[#2a2a2b] shadow-sm">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#8f9194] text-[18px] shrink-0 mt-0.5">
                hearing
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-white font-medium">Listening actively</span>
                <p className="text-xs text-[#8f9194] leading-relaxed">
                  Devlog synthesizes spoken sentences into spatial modules without manual tagging or syntactic notation.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Visual Canvas (System Flow) */}
        <main
          className={`${
            uncluttered ? 'lg:col-span-12' : 'lg:col-span-8'
          } flex flex-col gap-6 transition-all duration-300`}
        >
          <div className="flex items-baseline justify-between border-b border-[#2a2a2b]/40 pb-2">
            <div className="flex items-baseline gap-2">
              <h2 className="font-headline text-lg sm:text-xl text-white font-light">
                System architecture
              </h2>
              <span className="text-xs text-[#8f9194] font-mono">Live diagram</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#8f9194]">
              <span>2 clusters</span>
              <span>·</span>
              <span>4 modules linked</span>
            </div>
          </div>

          {/* Canvas Background Container */}
          <div className="w-full bg-[#1c1b1c] rounded-xl p-6 sm:p-8 relative border border-[#2a2a2b] shadow-md overflow-hidden min-h-[560px] flex flex-col justify-between">
            {/* Structural Guide Lines SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none text-[#353436]"
              preserveAspectRatio="none"
              viewBox="0 0 800 560"
            >
              {/* Power Path */}
              <path
                d="M 280 140 C 370 140, 420 140, 520 140"
                fill="none"
                stroke={unified ? '#ffffff' : 'currentColor'}
                strokeDasharray={unified ? '0' : '3 3'}
                strokeWidth={unified ? '2' : '1.5'}
                className="transition-all duration-500"
              />
              {/* Bus Path */}
              <path
                d="M 280 420 C 370 420, 420 420, 520 420"
                fill="none"
                stroke={unified ? '#ffffff' : 'currentColor'}
                strokeDasharray={unified ? '0' : '3 3'}
                strokeWidth={unified ? '2' : '1.5'}
                className="transition-all duration-500"
              />
              {/* Cross-affinity link */}
              <path
                d="M 280 390 C 400 390, 430 210, 560 185"
                fill="none"
                stroke={unified ? '#c6c6cf' : 'currentColor'}
                strokeWidth={unified ? '2' : '1'}
                opacity={unified ? 0.8 : 0.3}
                className="transition-all duration-500"
              />
            </svg>

            {/* Group 1: Power Architecture */}
            <div
              className={`relative z-10 flex flex-col gap-4 transition-all duration-300 ${
                isHighlighted('power-group') || isHighlighted('diode-node')
                  ? 'opacity-100 scale-[1.005]'
                  : 'opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white">01</span>
                  <span className="h-3 w-px bg-[#353436]"></span>
                  <h3 className="font-headline text-base text-white font-light">
                    Power Architecture
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8f9194]">Regulated Loop</span>
              </div>

              {/* Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node 1 */}
                <div className="p-4 sm:p-5 bg-[#201f20] rounded-lg border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8f9194] mb-2 font-mono">
                    <span className="uppercase tracking-wider">Supply Source</span>
                    <span className="w-2 h-2 rounded-full bg-[#c6c6cf]"></span>
                  </div>
                  <h4 className="font-headline text-base text-white font-normal">
                    5V Power Step-Down
                  </h4>
                  <p className="text-xs text-[#8f9194] mt-1 leading-relaxed">
                    Buck conversion isolating board electronics from incoming spikes.
                  </p>
                  <div className="mt-4 pt-2 border-t border-[#2a2a2b]/60 flex items-center justify-between text-xs font-mono text-[#8f9194]">
                    <span>5.01V Measured</span>
                    <span className="text-white">Nominal</span>
                  </div>
                </div>

                {/* Node 2 */}
                <div
                  className={`p-4 sm:p-5 bg-[#201f20] rounded-lg border transition-all shadow-sm ${
                    highlightedTarget === 'diode-node'
                      ? 'border-white bg-[#2a2a2b]'
                      : 'border-[#2a2a2b] hover:border-[#8f9194]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#8f9194] mb-2 font-mono">
                    <span className="uppercase tracking-wider">Actuator Output</span>
                    <span className="material-symbols-outlined text-[16px] text-white">
                      toggle_on
                    </span>
                  </div>
                  <h4 className="font-headline text-base text-white font-normal">
                    Relay Module
                  </h4>
                  <p className="text-xs text-[#8f9194] mt-1 leading-relaxed">
                    Switching 5V DC load across pin 5 logic line.
                  </p>
                  <div className="mt-4 p-2 bg-[#2a2a2b] rounded flex items-center gap-2 text-white text-xs border border-[#353436]/50">
                    <span className="material-symbols-outlined text-[16px] text-[#c6c6cf]">
                      shield
                    </span>
                    <span>Protected with flyback diode</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inset Separation Bar */}
            <div className="relative py-2 flex items-center justify-center my-4">
              <span className="px-4 py-1 bg-[#201f20] border border-[#2a2a2b] rounded-full text-[#8f9194] text-xs font-mono tracking-wider">
                Galvanic isolation maintained between tiers
              </span>
            </div>

            {/* Group 2: Sensor Bus */}
            <div
              className={`relative z-10 flex flex-col gap-4 transition-all duration-300 ${
                isHighlighted('sensor-group') ? 'opacity-100 scale-[1.005]' : 'opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white">02</span>
                  <span className="h-3 w-px bg-[#353436]"></span>
                  <h3 className="font-headline text-base text-white font-light">
                    Sensor Bus
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8f9194]">I2C Master</span>
              </div>

              {/* Sensor Nodes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node 3 */}
                <div className="p-4 sm:p-5 bg-[#201f20] rounded-lg border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8f9194] mb-2 font-mono">
                    <span className="uppercase tracking-wider">Processing Unit</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  </div>
                  <h4 className="font-headline text-base text-white font-normal">
                    ESP32 Controller
                  </h4>
                  <p className="text-xs text-[#8f9194] mt-1 leading-relaxed">
                    Coordinates relay triggering and samples environment bus safely.
                  </p>
                  <div className="mt-4 pt-2 border-t border-[#2a2a2b]/60 flex items-center justify-between text-xs font-mono text-[#8f9194]">
                    <span>Heartbeat stable</span>
                    <span className="text-white">Dual-core</span>
                  </div>
                </div>

                {/* Node 4 */}
                <div className="p-4 sm:p-5 bg-[#201f20] rounded-lg border border-[#2a2a2b] hover:border-[#8f9194]/40 transition-all shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8f9194] mb-2 font-mono">
                    <span className="uppercase tracking-wider">Telemetry</span>
                    <span className="material-symbols-outlined text-[16px] text-white">
                      air
                    </span>
                  </div>
                  <h4 className="font-headline text-base text-white font-normal">
                    Temperature &amp; Pressure Sensor
                  </h4>
                  <p className="text-xs text-[#8f9194] mt-1 leading-relaxed">
                    BMP280 high precision digital barometer on short wire leads.
                  </p>
                  <div className="mt-4 pt-2 border-t border-[#2a2a2b]/60 flex items-center justify-between text-xs font-mono text-[#8f9194]">
                    <span>Sample cadence 2.0s</span>
                    <span className="text-white">Calibrated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ambient Graph Metadata Footnote */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-[#8f9194]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-white">
                check_circle
              </span>
              <span>All connections verified against what you spoke. 2 system groups identified.</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>Graph latency: 12ms</span>
              <span>·</span>
              <button
                onClick={() => {
                  setHighlightedTarget(null);
                  setUnified(false);
                }}
                className="text-white hover:underline"
              >
                Reset view
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Editorial Storyboard Context / Photographic Narrative Integration */}
      <div className="mt-16 pt-8 border-t border-[#2a2a2b]/40 flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#8f9194]">
              Physical Bench Context
            </span>
            <h3 className="font-headline text-xl text-white font-light mt-1">
              Hardware workspace snapshots
            </h3>
          </div>
          <span className="text-xs font-mono text-[#8f9194]">
            Archived automatically from spoken moments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo card 1 */}
          <div
            onClick={() =>
              onOpenPhotoLightbox(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuD-Hg28kc_eFdSi7H7p7cra3DEmraBDtPYao--ZRXewsv1ZVtXM5E1eMmgF86e8DoGx6NytKj3DqoHZ0E--N6pZVDZUI9F0hwBucRtdCDmcReOADmn2evyRZIY6RBhXyaV9LdNn0vUxwUmKkGeqy7rGKOrRLmsIUm60p0m3iblHnhUHoxE9AKKtQWZo4TJsDxTEK6ityGqW3MGQuepY6u0qElfgR8p1MZC3ijP1eTjC56hz_DQxPOZrJw',
                '14:02 Power Bench',
                'ESP32 pin 5 logic setup · Diffused studio workbench'
              )
            }
            className="group relative rounded-xl overflow-hidden bg-[#1c1b1c] border border-[#2a2a2b] shadow-sm aspect-[16/10] cursor-pointer"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-Hg28kc_eFdSi7H7p7cra3DEmraBDtPYao--ZRXewsv1ZVtXM5E1eMmgF86e8DoGx6NytKj3DqoHZ0E--N6pZVDZUI9F0hwBucRtdCDmcReOADmn2evyRZIY6RBhXyaV9LdNn0vUxwUmKkGeqy7rGKOrRLmsIUm60p0m3iblHnhUHoxE9AKKtQWZo4TJsDxTEK6ityGqW3MGQuepY6u0qElfgR8p1MZC3ijP1eTjC56hz_DQxPOZrJw"
              alt="ESP32 devkit setup"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/90 via-[#0e0e0f]/20 to-transparent"></div>
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col">
              <span className="text-xs font-mono text-[#8f9194]">14:02 Power Bench</span>
              <span className="text-sm text-white font-light">ESP32 pin 5 logic setup</span>
            </div>
          </div>

          {/* Photo card 2 */}
          <div
            onClick={() =>
              onOpenPhotoLightbox(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuAE_mZBQF9gy4lEqfYk9ujZDogPUWAtEjl6PT6m9pG7FvaKfVhOP-pCtSYDaT2I7rzsOXKcUInCR9V83ZtfQ4VL4Q5fiTZc74jcLCEkQ494Q25eEXvvsScIxtIgLznziNo4TdcXv4VbbJDQMuOhjIDBQq0--lJot9xRm-iWD1Y4x8NIEoBVuoojLWmEtPVTAmPsKkmPxeImDz8qw1r13k9ZT2cDfRUyA5gpC-QibKvg0zTcz5PYt-dcQw',
                '14:10 Coil Terminals',
                'Flyback diode noise suppressor · 1N4007 terminal macro'
              )
            }
            className="group relative rounded-xl overflow-hidden bg-[#1c1b1c] border border-[#2a2a2b] shadow-sm aspect-[16/10] cursor-pointer"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAE_mZBQF9gy4lEqfYk9ujZDogPUWAtEjl6PT6m9pG7FvaKfVhOP-pCtSYDaT2I7rzsOXKcUInCR9V83ZtfQ4VL4Q5fiTZc74jcLCEkQ494Q25eEXvvsScIxtIgLznziNo4TdcXv4VbbJDQMuOhjIDBQq0--lJot9xRm-iWD1Y4x8NIEoBVuoojLWmEtPVTAmPsKkmPxeImDz8qw1r13k9ZT2cDfRUyA5gpC-QibKvg0zTcz5PYt-dcQw"
              alt="1N4007 diode across coil"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/90 via-[#0e0e0f]/20 to-transparent"></div>
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col">
              <span className="text-xs font-mono text-[#8f9194]">14:10 Coil Terminals</span>
              <span className="text-sm text-white font-light">
                Flyback diode noise suppressor
              </span>
            </div>
          </div>

          {/* Photo card 3 */}
          <div
            onClick={() =>
              onOpenPhotoLightbox(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuD6KJ2grS-IzyWqfk9755zMxxRVMO1YA3yxzaqGMbQPXZZJwijN0sRRdHmX4Ga7g09Dm4kedXEA8vFJ_hLyWDW-oktSdq2Fw6IAn3FS7rtXBa8U50TxbKCPnSe1Jg7Wd7YOCRvGylI_9YT34H828pbQvBqcaKmxjE62ZztEiFpdEk3YBB4HFiqo3GfsqjrVY2Y8g7dlObzlb_5Q28piqAHl8N23ZK91W5LZHTaC8HATPaCxoDW9wTTUFw',
                '14:19 Sensor Assembly',
                'BMP280 barometric calibration run on desk'
              )
            }
            className="group relative rounded-xl overflow-hidden bg-[#1c1b1c] border border-[#2a2a2b] shadow-sm aspect-[16/10] cursor-pointer"
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6KJ2grS-IzyWqfk9755zMxxRVMO1YA3yxzaqGMbQPXZZJwijN0sRRdHmX4Ga7g09Dm4kedXEA8vFJ_hLyWDW-oktSdq2Fw6IAn3FS7rtXBa8U50TxbKCPnSe1Jg7Wd7YOCRvGylI_9YT34H828pbQvBqcaKmxjE62ZztEiFpdEk3YBB4HFiqo3GfsqjrVY2Y8g7dlObzlb_5Q28piqAHl8N23ZK91W5LZHTaC8HATPaCxoDW9wTTUFw"
              alt="BMP280 sensor assembly"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/90 via-[#0e0e0f]/20 to-transparent"></div>
            <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col">
              <span className="text-xs font-mono text-[#8f9194]">14:19 Sensor Assembly</span>
              <span className="text-sm text-white font-light">
                Barometric calibration run
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
