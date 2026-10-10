import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  openGapsCount: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  openGapsCount,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadZip = () => {
    setDownloading(true);
    // Simulate real file package compilation & trigger markdown bundle download
    const bundleContent = `# ESP32 Relay Controller with Inductive Kickback Protection
Session: #01 · esp32-relay-ctrl
Grounding: 100% sourced (14m speech, 2 bench photos, 3 git commits)

## OVERVIEW
Simple controller board using ESP32-WROOM-32 to drive a 5V mechanical relay and poll BME280 sensor over I2C.

## HARDWARE SCHEMATIC
ESP32 GPIO 5 ──[ 1kΩ ]──> Base (2N2222)
+5V Rail ──────┬───────── Coil (+) [Relay]
               │           │
           [1N4007]        │ (Antiparallel Diode)
               ▲           │
               └───────── Coil (-) ──> Collector (2N2222)
Emitter (2N2222) ──> GND

## TROUBLESHOOTING
Issue: Inductive back-EMF pulled 3.3V rail to 2.65V, triggering brownout resets.
Resolution: 1N4007 flyback diode clamped inductive spikes to ~0.7V forward drop.
`;
    const blob = new Blob([bundleContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devlog-esp32-relay-ctrl-documentation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setDownloading(false);
    }, 1500);
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#1c1b1c] rounded-xl border border-[#353436] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2b] bg-[#161618]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white text-[20px]">download</span>
            <h2 className="font-headline text-lg font-light text-white tracking-tight">
              Export Documentation Bundle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[#c5c7c9] hover:text-white hover:bg-[#2a2a2b] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between p-4 bg-[#201f20] rounded-lg border border-[#2a2a2b]">
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">Bundle Status: Ready</span>
              <span className="text-xs text-[#8f9194] mt-0.5">
                6 markdown &amp; mmd assets · branch main @ c4e12a
              </span>
            </div>
            <span className="text-xs font-mono text-[#c6c6cf] bg-[#2a2a2b] px-2.5 py-1 rounded">
              100% Sourced
            </span>
          </div>

          {openGapsCount > 0 && (
            <div className="p-3.5 bg-[#201f20] border border-[#ffb4ab]/30 rounded-lg flex items-center gap-3 text-xs text-[#ffb4ab]">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>
                Note: {openGapsCount} gap question{openGapsCount > 1 ? 's are' : ' is'} still pending in GAPS.md. You can export now or resolve {openGapsCount > 1 ? 'them' : 'it'} first.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
              Included Deliverables
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">article</span>
                <span className="text-[#e5e2e3]">README.md</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">schema</span>
                <span className="text-[#e5e2e3]">diagrams/system.mmd</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">inventory_2</span>
                <span className="text-[#e5e2e3]">BOM.md (4 parts)</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">build</span>
                <span className="text-[#e5e2e3]">TROUBLESHOOTING.md</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">visibility</span>
                <span className="text-[#e5e2e3]">OBSERVER_NOTES.md</span>
              </div>
              <div className="p-2.5 rounded bg-[#161618] border border-[#2a2a2b] flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-[#8f9194]">help_outline</span>
                <span className="text-[#e5e2e3]">GAPS.md</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="w-full py-3 px-4 rounded-lg bg-white text-[#131314] font-medium text-sm hover:bg-[#e2e2e4] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                {downloading ? 'sync' : 'download'}
              </span>
              <span>
                {downloading ? 'Compiling Archive...' : 'Download Documentation Bundle (.zip)'}
              </span>
            </button>

            <button
              onClick={() => handleCopyText('# ESP32 Relay Controller with Inductive Kickback Protection\n...', 'README')}
              className="w-full py-2.5 px-4 rounded-lg bg-[#201f20] hover:bg-[#2a2a2b] text-[#e5e2e3] text-xs font-medium transition-colors flex items-center justify-between border border-[#2a2a2b]"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#8f9194]">content_copy</span>
                <span>Copy full README.md markdown</span>
              </span>
              <span className="font-mono text-[#8f9194]">
                {copied === 'README' ? '✓ Copied' : 'Cmd+C'}
              </span>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#161618] border-t border-[#2a2a2b] flex items-center justify-between text-xs text-[#8f9194]">
          <span>devlog session #44 · commit 8a19f3</span>
          <span className="font-mono">Ready for export</span>
        </div>
      </div>
    </div>
  );
};
