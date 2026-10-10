import React, { useState } from 'react';
import { GapItem, ObserverLogEntry } from '../types';

interface ObservationsViewProps {
  observerLogs: ObserverLogEntry[];
  gaps: GapItem[];
  onResolveGap: (gapId: string, answer: string) => void;
  onOpenPhotoLightbox: (src: string, caption?: string, meta?: string) => void;
}

export const ObservationsView: React.FC<ObservationsViewProps> = ({
  observerLogs,
  gaps,
  onResolveGap,
  onOpenPhotoLightbox,
}) => {
  const [answerInputs, setAnswerInputs] = useState<{ [id: string]: string }>({
    'gap-01': '',
    'gap-02': '',
  });
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);

  const openGaps = gaps.filter((g) => g.status === 'open');

  const handleSubmitAnswer = (gapId: string, defaultAnswer?: string) => {
    const ans = defaultAnswer || answerInputs[gapId]?.trim();
    if (ans) {
      onResolveGap(gapId, ans);
      setAnswerInputs({ ...answerInputs, [gapId]: '' });
    }
  };

  const handleSimulateVoiceAnswer = (gapId: string, text: string) => {
    setActiveRecordingId(gapId);
    setTimeout(() => {
      onResolveGap(gapId, text);
      setActiveRecordingId(null);
    }, 1500);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 animate-fadeIn">
      {/* Header */}
      <section className="mb-10 flex flex-col gap-2">
        <span className="text-xs font-mono text-[#8f9194] uppercase tracking-widest">
          OBSERVATIONS &amp; GAPS
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
          Observations &amp; Questions
        </h1>
        <p className="text-base text-[#c5c7c9] max-w-[68ch] leading-relaxed font-light">
          Third-person record of what happened during the build, plus questions for what the docs are still missing.
        </p>
      </section>

      {/* Metrics Banner */}
      <div className="w-full bg-[#1c1b1c] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 border border-[#2a2a2b] shadow-sm mb-12">
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-2xl text-white font-light">
            0{observerLogs.length}
          </span>
          <span className="text-xs text-[#8f9194]">observer notes</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-2xl text-white font-light">
            0{openGaps.length}
          </span>
          <span className="text-xs text-[#8f9194]">open gap questions</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-headline text-2xl text-white font-light">00</span>
          <span className="text-xs text-[#8f9194]">unverified claims</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs text-[#8f9194] font-mono">
          <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
          <span>Grounded in audio, captures &amp; git</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Observer's Log */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-1 pb-2 border-b border-[#2a2a2b]/40">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl text-white font-light tracking-tight">
                Observer&apos;s Log
              </h2>
              <span className="text-xs font-mono text-[#8f9194] px-2.5 py-0.5 bg-[#201f20] rounded-full border border-[#2a2a2b]">
                Session 01
              </span>
            </div>
            <p className="text-xs text-[#8f9194] max-w-[60ch] leading-relaxed">
              Written neutrally from the perspective of an outside observer watching the build bench.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {observerLogs.map((entry) => (
              <article
                key={entry.id}
                className="bg-[#1c1b1c] rounded-xl p-5 sm:p-6 flex flex-col gap-2.5 border border-[#2a2a2b] shadow-sm hover:border-[#353436] transition-colors"
              >
                <div className="flex items-center justify-between text-[#8f9194] text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-white">
                    <span className="material-symbols-outlined text-[15px] text-[#c6c6cf]">
                      {entry.type === 'speech'
                        ? 'mic'
                        : entry.type === 'photo'
                        ? 'photo_camera'
                        : 'terminal'}
                    </span>
                    <span>{entry.time} · {entry.type}</span>
                  </span>
                  <span>{entry.sourceLabel}</span>
                </div>

                <p className="text-sm sm:text-base text-white font-light leading-relaxed">
                  {entry.title}
                </p>

                {entry.imageSrc && (
                  <div
                    onClick={() =>
                      entry.imageSrc &&
                      onOpenPhotoLightbox(entry.imageSrc, entry.imageCaption, entry.imageMeta)
                    }
                    className="pt-2 flex items-center gap-4 cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0e0e0f] shrink-0 border border-[#2a2a2b]">
                      <img
                        src={entry.imageSrc}
                        alt="Trace capture"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs text-white font-medium group-hover:underline">
                        {entry.imageCaption}
                      </span>
                      <span className="text-xs text-[#8f9194] font-mono mt-0.5">
                        {entry.imageMeta}
                      </span>
                    </div>
                  </div>
                )}

                {entry.sparkline && (
                  <div className="w-full pt-1">
                    <div className="w-full h-10 bg-[#0e0e0f] rounded-lg p-2 flex items-center border border-[#2a2a2b]">
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        preserveAspectRatio="none"
                        viewBox="0 0 300 36"
                      >
                        <path
                          d="M0 24 Q 40 28, 80 18 T 160 14 T 230 10 T 300 8"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.5"
                        />
                        <circle cx="300" cy="8" r="3" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex items-center gap-2 text-[#8f9194] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#353436]"></span>
                  <span>{entry.tag}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Right Column: Questions (GAPS.md) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-1 pb-2 border-b border-[#2a2a2b]/40">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl text-white font-light tracking-tight">
                Questions (GAPS.md)
              </h2>
              <span className="text-xs font-mono text-white px-2.5 py-0.5 bg-[#201f20] rounded-full border border-[#2a2a2b]">
                {openGaps.length} Open Gap{openGaps.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-[#8f9194] leading-relaxed">
              Targeted clarification questions to resolve missing specification details before export.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className={`rounded-xl p-5 sm:p-6 flex flex-col gap-3.5 border transition-all ${
                  gap.status === 'resolved'
                    ? 'bg-[#161618] border-[#2a2a2b] opacity-80'
                    : 'bg-[#1c1b1c] border-[#2a2a2b] shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-headline text-2xl text-[#8f9194] font-light shrink-0">
                    {gap.number}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-headline text-base text-white font-light leading-snug">
                      {gap.question}
                    </h3>
                    <span className="text-xs text-[#8f9194] leading-relaxed">
                      {gap.description}
                    </span>
                  </div>
                </div>

                {gap.status === 'resolved' ? (
                  <div className="p-3 bg-[#0e0e0f] rounded-lg border border-[#2a2a2b] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-[16px] text-white">
                        check_circle
                      </span>
                      <span>Answer: <strong>{gap.resolvedAnswer}</strong></span>
                    </div>
                    <span className="text-[#8f9194] font-mono">Resolved</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-[#2a2a2b]/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() =>
                          handleSimulateVoiceAnswer(
                            gap.id,
                            gap.id === 'gap-01'
                              ? 'Songle SRD-05VDC-SL-C, 70 ohm coil measured'
                              : '3.3V VCC via regulator'
                          )
                        }
                        disabled={activeRecordingId === gap.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#201f20] hover:bg-[#2a2a2b] text-white text-xs border border-[#353436]"
                      >
                        <span className="material-symbols-outlined text-[15px]">mic</span>
                        <span>
                          {activeRecordingId === gap.id
                            ? 'Transcribing audio...'
                            : 'Record spoken answer'}
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          handleSubmitAnswer(
                            gap.id,
                            gap.id === 'gap-01'
                              ? 'Songle SRD-05VDC-SL-C, 70 ohm coil'
                              : '3.3V logic rail'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#201f20] hover:bg-[#2a2a2b] text-[#c5c7c9] hover:text-white text-xs border border-[#353436]"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Auto-fill standard</span>
                      </button>

                      <button
                        onClick={() => onResolveGap(gap.id, 'Deferred for revision 2')}
                        className="text-xs text-[#8f9194] hover:text-white transition-colors ml-auto px-2 py-1"
                      >
                        Skip for now
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={answerInputs[gap.id] || ''}
                        onChange={(e) =>
                          setAnswerInputs({ ...answerInputs, [gap.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitAnswer(gap.id);
                        }}
                        placeholder={
                          gap.id === 'gap-01'
                            ? 'e.g. Songle SRD-05VDC-SL-C, 70 ohm coil'
                            : 'e.g. 3.3V VCC from AP2112K LDO'
                        }
                        className="flex-1 bg-[#0e0e0f] text-white placeholder-[#8f9194] px-3.5 py-2 rounded-lg text-xs font-body border border-[#2a2a2b] focus:outline-none focus:border-[#8f9194]"
                      />
                      <button
                        onClick={() => handleSubmitAnswer(gap.id)}
                        className="px-3 py-2 bg-white text-[#131314] rounded-lg text-xs font-medium hover:bg-[#e2e2e4] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* GAPS Sync Card */}
            <div className="bg-[#1c1b1c] rounded-xl p-5 flex flex-col gap-1.5 border border-[#2a2a2b] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono text-white">
                <span className="material-symbols-outlined text-[18px] text-[#c6c6cf]">
                  description
                </span>
                <span>GAPS.md Sync Active</span>
              </div>
              <p className="text-xs text-[#8f9194] leading-relaxed">
                Answering these clarifies hardware specifications and resolves blockers in the exported documentation bundle.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
