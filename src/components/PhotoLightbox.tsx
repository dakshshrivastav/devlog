import React from 'react';

interface PhotoLightboxProps {
  imageSrc: string | null;
  caption?: string;
  metadata?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  imageSrc,
  caption,
  metadata,
  onClose,
}) => {
  if (!imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-[#1c1b1c] rounded-xl overflow-hidden border border-[#353436] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2b] bg-[#161618]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c5c7c9] text-[18px]">photo_camera</span>
            <span className="font-headline text-sm font-light text-white tracking-wide">
              {caption || 'Bench Capture Inspection'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[#c5c7c9] hover:text-white hover:bg-[#2a2a2b] transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="relative bg-[#0e0e0f] max-h-[70vh] flex items-center justify-center p-2">
          <img
            src={imageSrc}
            alt={caption || 'Hardware capture'}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded"
          />
        </div>

        {metadata && (
          <div className="px-5 py-3.5 bg-[#1c1b1c] border-t border-[#2a2a2b] flex items-center justify-between text-xs text-[#8f9194]">
            <span className="font-mono">{metadata}</span>
            <span className="text-[#c5c7c9]">Verified Hardware Provenance</span>
          </div>
        )}
      </div>
    </div>
  );
};
