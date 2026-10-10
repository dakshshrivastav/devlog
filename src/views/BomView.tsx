import React, { useState } from 'react';
import { BomItem, BenchTool, GapItem } from '../types';

interface BomViewProps {
  bom: BomItem[];
  tools: BenchTool[];
  gaps: GapItem[];
  onResolveGap: (gapId: string, answer: string) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
}

export const BomView: React.FC<BomViewProps> = ({
  bom,
  tools,
  gaps,
  onResolveGap,
  onOpenPhotoLightbox,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copyTableStatus, setCopyTableStatus] = useState(false);

  const gap1 = gaps.find((g) => g.id === 'gap-01');
  const isGap1Open = gap1?.status === 'open';

  const totalCost = bom.reduce((sum, item) => sum + item.unitCost * item.qty, 0);
  const verifiedCount = bom.filter(
    (item) => item.status === 'Verified' || item.status === 'Verified & Installed'
  ).length;

  const handleExportCsv = () => {
    let csv = 'Component,Designator,Specification,Quantity,Unit Cost,Status\n';
    bom.forEach((b) => {
      csv += `"${b.name}","${b.designator}","${b.spec}",${b.qty},${b.unitCost},"${b.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devlog-bom-purchasing.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMsg('Exported CSV formatted for Digi-Key / Mouser cart upload');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyMarkdownTable = () => {
    let md = '| Component | Desig | Specification | Qty | Sources | Status |\n';
    md += '|---|---|---|---|---|---|\n';
    bom.forEach((b) => {
      md += `| ${b.name} | ${b.designator} | ${b.spec} | ${b.qty} | ${b.sources.join(', ')} | ${b.status} |\n`;
    });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
    }
    setCopyTableStatus(true);
    setToastMsg('Copied Markdown BOM table to clipboard');
    setTimeout(() => {
      setCopyTableStatus(false);
      setToastMsg(null);
    }, 2500);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Header Block */}
      <section className="mb-10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#8f9194] tracking-wider uppercase bg-[#201f20] px-2.5 py-1 rounded border border-[#2a2a2b]">
            SPECIFICATION // HARDWARE AUDIT
          </span>
          <span className="w-1 h-1 rounded-full bg-[#44474a]"></span>
          <span className="text-xs text-[#8f9194] font-mono">BOM.md Revision 0.4</span>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight font-light">
          Bill of Materials &amp; Parts
        </h1>
        <p className="text-base text-[#c5c7c9] max-w-[68ch] leading-relaxed font-light">
          Itemized hardware components, sensors, and tools extracted from spoken notes, workbench photos, and git commit diffs.
        </p>
      </section>

      {/* Key Metrics Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] flex flex-col justify-between shadow-sm">
          <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
            Cataloged Items
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl sm:text-4xl text-white font-light">
              0{bom.length}
            </span>
            <span className="text-xs text-[#8f9194]">components</span>
          </div>
        </div>

        <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
              Verified With P/N
            </span>
            <span className="w-2 h-2 rounded-full bg-white"></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl sm:text-4xl text-white font-light">
              0{verifiedCount}
            </span>
            <span className="text-xs text-[#c5c7c9]">
              {Math.round((verifiedCount / bom.length) * 100)}% spec match
            </span>
          </div>
        </div>

        <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
              Pending Clarification
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">
              priority_high
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl sm:text-4xl text-[#ffb4ab] font-light">
              0{isGap1Open ? '1' : '0'}
            </span>
            <span className="text-xs text-[#8f9194]">in GAPS.md</span>
          </div>
        </div>

        <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] flex flex-col justify-between shadow-sm">
          <span className="text-xs font-mono text-[#8f9194] uppercase tracking-wider">
            Est. Total Cost
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-headline text-3xl sm:text-4xl text-white font-light">
              ${totalCost.toFixed(2)}
            </span>
            <span className="text-xs text-[#8f9194]">USD unit BOM</span>
          </div>
        </div>
      </section>

      {/* Main Layout: Table + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Main Column */}
        <div className="xl:col-span-8 space-y-10 min-w-0">
          {/* Structured Hardware BOM Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[20px]">memory</span>
                <h2 className="font-headline text-xl text-white font-light">
                  Structured Hardware BOM
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">Physical Inventory (Rev 1.2)</span>
            </div>

            {/* Table Container */}
            <div className="bg-[#1c1b1c] rounded-xl overflow-hidden border border-[#2a2a2b] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#161618] text-[#8f9194] font-mono text-xs uppercase tracking-wider border-b border-[#2a2a2b]">
                      <th className="py-3 px-4">Component</th>
                      <th className="py-3 px-3">Desig</th>
                      <th className="py-3 px-4">Specification / Rating</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-4">Source Provenance</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2b]/60 text-xs">
                    {bom.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#201f20]/60 transition-colors"
                      >
                        <td className="py-4 px-4 text-white font-medium">
                          {item.name}
                        </td>
                        <td className="py-4 px-3 font-mono text-[#c5c7c9]">
                          {item.designator}
                        </td>
                        <td className="py-4 px-4 text-[#8f9194] leading-relaxed max-w-[280px]">
                          {item.spec}
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-white">
                          {item.qty}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.sources.map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-[#201f20] px-2 py-0.5 rounded font-mono text-[10px] text-[#c6c6cf] border border-[#2a2a2b]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] ${
                              item.status === 'Needs P/N'
                                ? 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/30'
                                : 'bg-[#201f20] text-white border border-[#2a2a2b]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'Needs P/N' ? 'bg-[#ffb4ab]' : 'bg-white'
                              }`}
                            />
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Bench Tools & Test Equipment */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[20px]">
                  precision_manufacturing
                </span>
                <h2 className="font-headline text-xl text-white font-light">
                  Bench Tools &amp; Test Equipment
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">Calibration Log</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-[#1c1b1c] p-5 rounded-xl border border-[#2a2a2b] flex flex-col justify-between space-y-4 shadow-sm hover:border-[#353436] transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#8f9194]">{tool.code}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                    <h3 className="text-sm text-white font-medium leading-snug">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#8f9194] leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#2a2a2b]/60 flex items-center gap-2 text-[#8f9194] text-xs font-mono">
                    <span className="material-symbols-outlined text-[15px] text-[#c6c6cf]">
                      {tool.icon}
                    </span>
                    <span>{tool.specs}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Provenance Visual Records */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[20px]">
                  photo_camera
                </span>
                <h2 className="font-headline text-xl text-white font-light">
                  Provenance Visual Records
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">Annotated Captures</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() =>
                  onOpenPhotoLightbox(
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuA111LLYj2rR7R7IVNesQAVAdZonKZW_BMXRPTq1RjXP3feppqXm3qmFIGeOLBHxlClxPlf9leQTr3owTTDtZzH-jHNWL3k6VzZ8FnID_wY4qoKjAOWl8LA9Qv3DplHWcFMMmBDxlN48sLz-W5AD_aiXiJeQdfmTFjNaPGD0CrWj0Tp-PwlJkcM2BS6hYaK2cbtYbHft6DJBJRTDEnz3xDKq6iP38fglGX8y0uIzcrfb29eHXNzqaVzvg',
                    '[photo 1] Breadboard Prototype Overview',
                    'ESP32 DevKit wired to 5V relay module on bench'
                  )
                }
                className="bg-[#1c1b1c] rounded-xl overflow-hidden border border-[#2a2a2b] shadow-sm flex flex-col group cursor-pointer"
              >
                <div className="h-44 w-full relative">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA111LLYj2rR7R7IVNesQAVAdZonKZW_BMXRPTq1RjXP3feppqXm3qmFIGeOLBHxlClxPlf9leQTr3owTTDtZzH-jHNWL3k6VzZ8FnID_wY4qoKjAOWl8LA9Qv3DplHWcFMMmBDxlN48sLz-W5AD_aiXiJeQdfmTFjNaPGD0CrWj0Tp-PwlJkcM2BS6hYaK2cbtYbHft6DJBJRTDEnz3xDKq6iP38fglGX8y0uIzcrfb29eHXNzqaVzvg"
                    alt="Breadboard prototype"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur px-2.5 py-0.5 rounded text-xs font-mono text-white">
                    [photo 1] Breadboard Prototype Overview
                  </div>
                </div>
                <div className="p-4 space-y-1 bg-[#161618]">
                  <p className="text-xs text-[#e5e2e3]">Coil pinouts cross-checked with git commit 32c9e1 schematic.</p>
                  <span className="text-[11px] font-mono text-[#8f9194]">Logged 14:02 UTC · Session ID #481</span>
                </div>
              </div>

              <div
                onClick={() =>
                  onOpenPhotoLightbox(
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCJvSeIkb7sNAT8O4D1wEvLoUF8G_y08lXlfIQ7WzIvryoAHy--9028zXD8WErPh4aNlE2JbmE49nGrQ_FJtWl8h8LF0LfjM0vEvbCiBTQkeWShBdQrx5PbaMrr1k5Dp7FZyLlU-lBWwzfzfcEihLeJUsbPaN2SX9H81aRr_ZYDMiHZbYGEwCuboB4s3moVzVTwVuwMNzMwf98Z2L6KJ-7s4sBwxCK04kRUdNgTYPMi_i0YnoT5HoJqxw',
                    '[photo 2] Flyback Diode Clamping Installation',
                    '1N4007 soldered across coil terminals on relay'
                  )
                }
                className="bg-[#1c1b1c] rounded-xl overflow-hidden border border-[#2a2a2b] shadow-sm flex flex-col group cursor-pointer"
              >
                <div className="h-44 w-full relative">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJvSeIkb7sNAT8O4D1wEvLoUF8G_y08lXlfIQ7WzIvryoAHy--9028zXD8WErPh4aNlE2JbmE49nGrQ_FJtWl8h8LF0LfjM0vEvbCiBTQkeWShBdQrx5PbaMrr1k5Dp7FZyLlU-lBWwzfzfcEihLeJUsbPaN2SX9H81aRr_ZYDMiHZbYGEwCuboB4s3moVzVTwVuwMNzMwf98Z2L6KJ-7s4sBwxCK04kRUdNgTYPMi_i0YnoT5HoJqxw"
                    alt="Flyback diode installation"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur px-2.5 py-0.5 rounded text-xs font-mono text-white">
                    [photo 2] Flyback Diode Clamping Installation
                  </div>
                </div>
                <div className="p-4 space-y-1 bg-[#161618]">
                  <p className="text-xs text-[#e5e2e3]">Cathode ring oriented towards positive rail before terminal cinch.</p>
                  <span className="text-[11px] font-mono text-[#8f9194]">Logged 14:12 UTC · Bench TS100 Verified</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          {/* Unresolved BOM Gaps Card */}
          <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab] text-[20px]">
                  report_problem
                </span>
                <h3 className="font-headline text-lg text-white font-light">
                  Unresolved BOM Gaps
                </h3>
              </div>
              <span className="bg-[#93000a]/20 text-[#ffb4ab] px-2 py-0.5 rounded text-xs font-mono border border-[#ffb4ab]/30">
                {isGap1Open ? '1 Pending' : 'Resolved'}
              </span>
            </div>

            {/* Gap 01 Specific Card */}
            {isGap1Open ? (
              <div className="bg-[#161618] p-4 rounded-lg border border-[#2a2a2b] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#ffb4ab] uppercase tracking-wider">
                    GAP-01 · RELAY COIL
                  </span>
                  <span className="text-[#8f9194]">Priority High</span>
                </div>
                <p className="text-xs text-[#e5e2e3] leading-relaxed font-light">
                  Relay module coil resistance unknown. Needed for precise current draw calculation in power budget and brownout risk assessment.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() =>
                      onResolveGap(
                        'gap-01',
                        'Songle SRD-05VDC-SL-C, 70Ω coil nominal'
                      )
                    }
                    className="w-full py-2 px-3 rounded bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs transition-colors flex items-center justify-between border border-[#353436]"
                  >
                    <span>Mark as default 70Ω (Songle nominal)</span>
                    <span className="material-symbols-outlined text-[16px] text-white">check</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#0e0e0f] rounded-lg border border-[#2a2a2b] text-xs text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[16px]">check_circle</span>
                <span>Coil Resistance confirmed: 70Ω (Songle SRD-05VDC-SL-C)</span>
              </div>
            )}

            {/* Mini Rail Telemetry Graph */}
            <div className="space-y-2 pt-2 border-t border-[#2a2a2b]/60">
              <div className="flex items-center justify-between text-xs text-[#8f9194] font-mono">
                <span>Inductive Spike Profile (Transient)</span>
                <span className="text-white">-0.42V Peak</span>
              </div>
              <div className="w-full h-16 bg-[#0e0e0f] rounded-lg p-2 flex items-center border border-[#2a2a2b]">
                <svg className="w-full h-full text-white" fill="none" viewBox="0 0 280 40">
                  <line x1="0" y1="20" x2="280" y2="20" stroke="#353436" strokeDasharray="2 2" strokeWidth="1" />
                  <path
                    d="M 0 20 L 70 20 L 75 19 L 80 20 L 100 20 L 102 36 L 106 14 L 110 22 L 115 19 L 125 20 L 280 20"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <p className="text-xs text-[#8f9194] leading-relaxed">
                Diode D1 clamps inductive kick below safe MCU reverse barrier.
              </p>
            </div>
          </div>

          {/* Export Options Card */}
          <div className="bg-[#1c1b1c] p-5 sm:p-6 rounded-xl border border-[#2a2a2b] space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2b]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-[20px]">download</span>
                <h3 className="font-headline text-lg text-white font-light">Export Options</h3>
              </div>
              <span className="text-xs font-mono text-[#8f9194]">POSIX / Markdown</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const blob = new Blob(
                    [
                      `# Bill of Materials\n\n| Component | Desig | Specification | Qty |\n|---|---|---|---|\n${bom
                        .map((b) => `| ${b.name} | ${b.designator} | ${b.spec} | ${b.qty} |`)
                        .join('\n')}`
                    ],
                    { type: 'text/markdown' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'BOM.md';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setToastMsg('Exported BOM.md');
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="w-full p-3 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors flex items-center justify-between text-left border border-[#2a2a2b] group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[18px]">
                    article
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">Export BOM.md</div>
                    <div className="text-xs text-[#8f9194]">Formatted GitHub Markdown specification</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[16px]">
                  arrow_outward
                </span>
              </button>

              <button
                onClick={handleExportCsv}
                className="w-full p-3 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors flex items-center justify-between text-left border border-[#2a2a2b] group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[18px]">
                    table_chart
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">
                      Export CSV (Digi-Key / Mouser)
                    </div>
                    <div className="text-xs text-[#8f9194]">Standard purchasing cart upload schema</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[16px]">
                  arrow_outward
                </span>
              </button>

              <button
                onClick={handleCopyMarkdownTable}
                className="w-full p-3 rounded-lg bg-[#161618] hover:bg-[#201f20] transition-colors flex items-center justify-between text-left border border-[#2a2a2b] group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[18px]">
                    content_copy
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm text-white font-medium">
                      {copyTableStatus ? 'Copied Table!' : 'Copy Markdown Table'}
                    </div>
                    <div className="text-xs text-[#8f9194]">Copies raw pipe-delimited data to clipboard</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#8f9194] group-hover:text-white text-[16px]">
                  {copyTableStatus ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          {/* Sync State */}
          <div className="bg-[#1c1b1c] p-5 rounded-xl border border-[#2a2a2b] space-y-2.5 shadow-sm text-xs">
            <span className="font-mono text-[#8f9194] uppercase tracking-wider block">
              Sync State
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[#8f9194]">Voice Note Transcriptions</span>
              <span className="text-white font-mono">Synced (2 logs)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8f9194]">Git Workspace Working Tree</span>
              <span className="text-white font-mono">Clean @ c4e12a</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8f9194]">Visual OCR Confidence</span>
              <span className="text-white font-mono">94.8% Average</span>
            </div>
          </div>
        </div>
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
