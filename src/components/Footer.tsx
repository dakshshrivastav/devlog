import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0e0e0f] border-t border-[#2a2a2b]/30 py-8 mt-16">
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-4 text-xs text-[#8f9194]">
        <div className="flex flex-col gap-1">
          <span className="font-headline text-sm font-light text-white tracking-tight">devlog</span>
          <p className="max-w-[68ch] leading-relaxed">
            Designed for quiet contemplation and deliberate creation. Free of telemetry, syntactic tension, and distraction.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-[11px] text-[#8f9194]">
          <span>Active Session: 14m 28s</span>
          <span className="text-[#353436]">·</span>
          <span>Hardware Lab Alpha</span>
          <span className="text-[#353436]">·</span>
          <span className="text-[#c5c7c9]">ESP32 Node 01</span>
          <span className="text-[#353436]">·</span>
          <span>© Devlog Quiet Systems</span>
        </div>
      </div>
    </footer>
  );
};
