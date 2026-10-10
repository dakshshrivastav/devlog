import { useEffect, useRef, useState } from 'react';
import type { LiveTokenResponse } from '../../shared/schema';
import { api } from '../lib/api';

const WORKLET_SOURCE = `
class DevlogPcm16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.buffer = [];
    this.accumulator = 0;
    this.accumulatorCount = 0;
    this.targetRate = 16000;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.accumulator += channel[i];
      this.accumulatorCount += 1;
      this.phase += this.targetRate;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        this.buffer.push(this.accumulator / this.accumulatorCount);
        this.accumulator = 0;
        this.accumulatorCount = 0;
      }
    }
    while (this.buffer.length >= 2048) {
      const block = this.buffer.splice(0, 2048);
      let sum = 0;
      for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
      this.port.postMessage({ samples: block, rms: Math.sqrt(sum / block.length) });
    }
    return true;
  }
}
registerProcessor('devlog-pcm16', DevlogPcm16Processor);
`;

export function LiveCaptureController({
  sessionId,
  token,
  onEnded,
  onCommitted,
}: {
  sessionId: string;
  token: LiveTokenResponse;
  onEnded: () => void;
  onCommitted: () => void;
}) {
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const [meter, setMeter] = useState(0);
  const [ending, setEnding] = useState(false);
  const stopRef = useRef<() => Promise<void>>(async () => undefined);
  const startRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let worklet: AudioWorkletNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let silentSink: GainNode | null = null;
    let eventQueue = Promise.resolve();
    const pendingKey = `devlog:${sessionId}:pending-scribe-events`;
    let pendingEvents: { receivedAt: string; event: unknown }[] = [];
    try {
      const stored = sessionStorage.getItem(pendingKey);
      if (stored) pendingEvents = JSON.parse(stored) as typeof pendingEvents;
    } catch { pendingEvents = []; }
    let stopping = false;
    let reconnectAttempt = 0;
    let connectionGeneration = 0;
    let reconnectTimer: number | undefined;
    let firstConnection = true;
    let nonRetryableClose = false;

    const cleanup = async () => {
      stopping = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      worklet?.disconnect();
      source?.disconnect();
      silentSink?.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Devlog session ended');
      if (context && context.state !== 'closed') await context.close().catch(() => undefined);
      setConnected(false);
      setMeter(0);
    };
    const flushPendingEvents = (): Promise<void> => {
      const task = eventQueue.then(async () => {
        while (pendingEvents.length) {
          const next = pendingEvents[0];
          const result = await api.liveEvents(sessionId, next.event, next.receivedAt);
          pendingEvents = pendingEvents.slice(1);
          try {
            if (pendingEvents.length) sessionStorage.setItem(pendingKey, JSON.stringify(pendingEvents));
            else sessionStorage.removeItem(pendingKey);
          } catch { /* The server has the event; browser storage is only a retry queue. */ }
          if (result.committed > 0) onCommitted();
        }
      });
      eventQueue = task.catch((cause) => {
        if (!disposed) setError(cause instanceof Error ? `Transcript event is queued locally: ${cause.message}` : 'Transcript event is queued locally until the server is reachable.');
      });
      return task;
    };

    const sendRawEvent = (event: unknown) => {
      pendingEvents.push({ receivedAt: new Date().toISOString(), event });
      try { sessionStorage.setItem(pendingKey, JSON.stringify(pendingEvents)); }
      catch { setError('Browser storage is full; this provider event could not be queued locally.'); }
      void flushPendingEvents();
    };

    stopRef.current = async () => {
      await flushPendingEvents();
      await cleanup();
    };

    const floatToBase64 = (samples: number[]) => {
      const pcm = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const value = Math.max(-1, Math.min(1, samples[i]));
        pcm[i] = value < 0 ? value * 32768 : value * 32767;
      }
      const bytes = new Uint8Array(pcm.buffer);
      let binary = '';
      const block = 0x8000;
      for (let i = 0; i < bytes.length; i += block) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + block, bytes.length)));
      }
      return btoa(binary);
    };

    const openSocket = async (credentials: LiveTokenResponse) => {
      if (disposed || stopping) return;
      const generation = ++connectionGeneration;
      const endpoint = new URL(credentials.url);
      endpoint.searchParams.set('model_id', credentials.model);
      endpoint.searchParams.set('token', credentials.token);
      endpoint.searchParams.set('audio_format', credentials.audioFormat);
      endpoint.searchParams.set('commit_strategy', 'vad');
      endpoint.searchParams.set('include_timestamps', 'true');
      endpoint.searchParams.set('keepalive_interval_ms', '5000');
      credentials.keyterms?.forEach((term) => endpoint.searchParams.append('keyterms', term));
      const nextSocket = new WebSocket(endpoint);
      socket = nextSocket;
      nextSocket.onopen = () => {
        if (disposed || generation !== connectionGeneration) return;
        reconnectAttempt = 0;
        nonRetryableClose = false;
        setError(null);
        setConnected(true);
        setStarting(false);
        void flushPendingEvents();
      };
      nextSocket.onmessage = (message) => {
        if (disposed || generation !== connectionGeneration) return;
        try {
          const event = JSON.parse(String(message.data)) as { message_type?: string; text?: string; error?: string };
          sendRawEvent(event);
          if (event.message_type === 'partial_transcript') setPartial(event.text ?? '');
          if (event.message_type === 'committed_transcript' || event.message_type === 'committed_transcript_with_timestamps') setPartial('');
          if (['auth_error', 'quota_exceeded', 'error', 'rate_limited', 'commit_throttled', 'queue_overflow'].includes(event.message_type ?? '')) {
            setError(event.error ?? event.text ?? JSON.stringify(event));
          }
          if (['auth_error', 'quota_exceeded', 'unaccepted_terms'].includes(event.message_type ?? '')) nonRetryableClose = true;
        } catch {
          sendRawEvent({ message_type: 'unparsed_provider_message', raw: String(message.data) });
        }
      };
      nextSocket.onerror = () => {
        if (!disposed && generation === connectionGeneration) setError('Realtime connection interrupted; attempting to reconnect.');
      };
      nextSocket.onclose = (event) => {
        if (disposed || stopping || generation !== connectionGeneration) return;
        setConnected(false);
        setStarting(false);
        setError(`Realtime socket closed (${event.code}${event.reason ? ` · ${event.reason}` : ''}).`);
        if (nonRetryableClose) {
          setError(`Realtime connection refused (${event.code}${event.reason ? ` · ${event.reason}` : ''}). Check the provider key, account quota, and accepted terms.`);
          return;
        }
        if (reconnectAttempt >= 5) {
          setError(`Realtime connection stopped after 5 reconnect attempts (${event.code}${event.reason ? ` · ${event.reason}` : ''}).`);
          return;
        }
        setStarting(true);
        reconnectAttempt += 1;
        const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 12000) + Math.round(Math.random() * 250);
        reconnectTimer = window.setTimeout(() => {
          void api.liveToken(sessionId).then(openSocket).catch((cause) => {
            if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not refresh the Scribe token.');
          });
        }, delay);
      };
    };

    async function connect(credentials: LiveTokenResponse) {
      setStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not expose microphone capture. Use HTTPS or localhost.');
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (disposed) return;
        context = new AudioContext();
        await context.resume();
        const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'text/javascript' }));
        await context.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);
        if (disposed) return;
        source = context.createMediaStreamSource(stream);
        worklet = new AudioWorkletNode(context, 'devlog-pcm16', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
        silentSink = context.createGain();
        silentSink.gain.value = 0;
        source.connect(worklet);
        worklet.connect(silentSink);
        silentSink.connect(context.destination);

        worklet.port.onmessage = (event: MessageEvent<{ samples: number[]; rms: number }>) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) return;
          setMeter(Math.max(0, Math.min(1, event.data.rms * 4)));
          socket.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: floatToBase64(event.data.samples),
            commit: false,
            sample_rate: 16000,
          }));
        };
        await openSocket(credentials);
      } catch (cause) {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : 'Could not open the microphone.');
          setStarting(false);
          await cleanup();
        }
      }
    }

    startRef.current = () => {
      const credentials = firstConnection ? Promise.resolve(token) : api.liveToken(sessionId);
      firstConnection = false;
      void credentials.then(connect).catch((cause) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not refresh the Scribe token.');
      });
    };
    return () => {
      disposed = true;
      void flushPendingEvents().catch(() => undefined).finally(cleanup);
    };
  }, [sessionId, token, onCommitted]);

  const stop = async () => {
    if (ending) return;
    setEnding(true);
    try {
      await stopRef.current();
      await api.endLive(sessionId);
      onEnded();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not close the live session.');
      setEnding(false);
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-xl border border-line-strong bg-surface-1/95 p-3 shadow-2xl backdrop-blur sm:inset-x-6 sm:p-4">
      <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? 'animate-pulse bg-white' : 'bg-alert'}`} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-xs text-white"><span>{connected ? 'Listening · Scribe v2 Realtime' : starting ? 'Connecting microphone…' : 'Live session ready'}</span><span className="font-mono text-muted">16 kHz PCM</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-white transition-all" style={{ width: `${Math.round(meter * 100)}%` }} /></div></div>{!connected && !starting && <button disabled={ending} onClick={() => startRef.current()} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-3 px-3 py-2 text-xs text-white disabled:opacity-50"><span className="material-symbols-outlined text-base">mic</span>{error ? 'Retry microphone' : 'Start microphone'}</button>}<button disabled={ending} onClick={() => void stop()} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-surface-0 disabled:opacity-50"><span className="material-symbols-outlined text-base">stop_circle</span>{ending ? 'Finishing…' : 'End session'}</button></div>
      {(partial || error) && <div className={`mt-3 border-t border-line pt-3 text-xs ${error ? 'text-alert' : 'text-body'}`}>{error ?? <><span className="mr-2 font-mono text-muted">Live speech</span>{partial}</>}</div>}
    </div>
  );
}
