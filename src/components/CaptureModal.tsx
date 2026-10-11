import { useRef, useState } from 'react';
import { api } from '../lib/api';

export function CaptureModal({
  sessionId,
  sessionMode,
  cloudRunEphemeral,
  videoUploadsEnabled,
  maxCaptureRequestBytes,
  onClose,
  onUploaded,
  onProcess,
  onStartLive,
}: {
  sessionId: string;
  sessionMode: 'batch' | 'live';
  cloudRunEphemeral: boolean;
  videoUploadsEnabled: boolean;
  maxCaptureRequestBytes: number | null;
  onClose: () => void;
  onUploaded: () => Promise<void>;
  onProcess: () => Promise<void>;
  onStartLive: () => Promise<void>;
}) {
  const audioRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');
  const [keyterms, setKeyterms] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAndProcess = async () => {
    setBusy(true);
    setError(null);
    try {
      const audio = [...(audioRef.current?.files ?? [])];
      const photos = [...(photoRef.current?.files ?? [])];
      const videos = [...(videoRef.current?.files ?? [])];
      const selectedBytes = [...audio, ...photos, ...videos].reduce((sum, file) => sum + file.size, 0);
      if (maxCaptureRequestBytes && selectedBytes > maxCaptureRequestBytes - 1024 * 1024) {
        throw new Error(`Keep all selected files below ${Math.floor((maxCaptureRequestBytes - 1024 * 1024) / (1024 * 1024))} MiB total for this upload.`);
      }
      if (audioRef.current?.files?.length || photoRef.current?.files?.length || videoRef.current?.files?.length || notes.trim() || keyterms.trim()) {
        await api.upload(sessionId, {
          audio,
          photos,
          videos,
          notes,
          keyterms,
        });
      }
      if (repoPath.trim()) await api.patchSession(sessionId, { repoPath: repoPath.trim() });
      await onUploaded();
      await onProcess();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not process this capture.');
    } finally {
      setBusy(false);
    }
  };

  const startLive = async () => {
    setBusy(true);
    setError(null);
    try {
      if (audioRef.current?.files?.length || photoRef.current?.files?.length || notes.trim() || keyterms.trim()) {
        await api.upload(sessionId, {
          audio: [...(audioRef.current?.files ?? [])],
          photos: [...(photoRef.current?.files ?? [])],
          videos: [],
          notes,
          keyterms,
        });
      }
      if (repoPath.trim()) await api.patchSession(sessionId, { repoPath: repoPath.trim() });
      await onUploaded();
      await onStartLive();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start live capture.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-surface-1 px-5 py-4"><div><div className="font-headline text-lg font-light text-white">Add session evidence</div><div className="mt-1 text-xs text-muted">Audio, video, bench photos, notes and repository history feed the same timeline.</div></div><button onClick={onClose} className="text-muted hover:text-white"><span className="material-symbols-outlined">close</span></button></div>
        <div className="space-y-5 p-5">
          {sessionMode === 'live' && <div className="rounded-lg border border-line bg-surface-0 p-4"><div className="flex items-center gap-2 text-sm text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />Live microphone capture</div><p className="mt-2 text-xs leading-relaxed text-muted">Prepare a short-lived Scribe v2 Realtime token here. The next step asks for microphone permission; committed transcript events are saved before synthesis.</p><button disabled={busy} onClick={() => void startLive()} className="mt-4 rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-surface-0 disabled:opacity-50">{busy ? 'Preparing…' : 'Prepare live session'}</button></div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FilePicker inputRef={audioRef} icon="mic" label="Audio recordings" detail="WAV, MP3, M4A, WebM, OGG" accept="audio/*,.flac" multiple />
            <FilePicker inputRef={photoRef} icon="photo_camera" label="Bench photos" detail="JPG, PNG, WebP, HEIC" accept="image/*,.heic,.heif" multiple />
            {sessionMode === 'batch' && videoUploadsEnabled && <FilePicker inputRef={videoRef} icon="videocam" label="Video walkthroughs" detail="MP4, MOV, WebM, MKV · up to 4 clips" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.m4v,.avi" multiple />}
          </div>
          {!cloudRunEphemeral && <label className="block"><span className="mb-2 block text-xs text-body">Repository path on this machine</span><input value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="/home/you/project-firmware" className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2.5 font-mono text-xs text-white outline-none placeholder:text-muted focus:border-line-strong" /><span className="mt-1 block text-[10px] text-muted">The local server reads commits with git. This path is never sent to an external provider.</span></label>}
          {cloudRunEphemeral && <p className="rounded-lg border border-line bg-surface-0 p-3 text-xs text-muted">Repository paths on your computer are not available to this temporary deployment. Add build context as notes or voice evidence instead.</p>}
          <label className="block"><span className="mb-2 block text-xs text-body">Bench notes <span className="text-muted">· optional</span></span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations, measurements read aloud, context for this session…" className="w-full resize-y rounded-lg border border-line bg-surface-0 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-muted focus:border-line-strong" /></label>
          <label className="block"><span className="mb-2 block text-xs text-body">Technical keyterms <span className="text-muted">· optional, one per line</span></span><textarea value={keyterms} onChange={(e) => setKeyterms(e.target.value)} rows={2} placeholder="ESP32-WROOM-32\nSRD-05VDC-SL-C\nGPIO 5" className="w-full resize-y rounded-lg border border-line bg-surface-0 px-3 py-2.5 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-muted focus:border-line-strong" /></label>
          {error && <div className="rounded-lg border border-alert/30 bg-alert-deep/15 p-3 text-xs text-alert">{error}</div>}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-line pt-4 sm:flex-row sm:items-center"><p className="max-w-md text-[10px] leading-relaxed text-muted">{videoUploadsEnabled ? 'Video audio is transcribed and a few frames are sampled for Gemma. Raw captures stay on this server; provider keys stay server-side.' : 'This temporary deployment accepts audio and photos only. Sessions and captures are stored temporarily and may disappear when the service restarts.'}</p><button disabled={busy} onClick={() => void uploadAndProcess()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-surface-0 disabled:opacity-50"><span className="material-symbols-outlined text-base">{busy ? 'progress_activity' : 'auto_awesome'}</span>{busy ? 'Uploading & processing…' : 'Upload and synthesize'}</button></div>
        </div>
      </div>
    </div>
  );
}

function FilePicker({ inputRef, icon, label, detail, accept, multiple }: { inputRef: React.RefObject<HTMLInputElement | null>; icon: string; label: string; detail: string; accept: string; multiple?: boolean }) {
  const [names, setNames] = useState<string[]>([]);
  return <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-dashed border-line-strong bg-surface-0 p-4 text-left transition-colors hover:border-muted"><input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => setNames([...Array.from(e.target.files ?? [])].map((f) => f.name))} /><span className="material-symbols-outlined text-xl text-white">{icon}</span><span className="mt-2 block text-xs text-white">{label}</span><span className="mt-1 block text-[10px] text-muted">{names.length ? `${names.length} selected · ${names.slice(0, 2).join(', ')}` : detail}</span></button>;
}
