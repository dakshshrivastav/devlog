// Real Web Audio API synthesizer for voice memo playback
let audioCtx: AudioContext | null = null;
let currentOsc: OscillatorNode | null = null;
let currentGain: GainNode | null = null;

export function playVoiceTone(onStop?: () => void) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    stopVoiceTone();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Gentle warm vocal fundamental frequency
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.8);
    osc.frequency.exponentialRampToValueAtTime(196, audioCtx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    currentOsc = osc;
    currentGain = gain;

    osc.onended = () => {
      currentOsc = null;
      currentGain = null;
      if (onStop) onStop();
    };

    osc.stop(audioCtx.currentTime + 1.6);
  } catch {
    // Graceful fallback if audio is blocked
    if (onStop) {
      setTimeout(onStop, 1500);
    }
  }
}

export function stopVoiceTone() {
  if (currentOsc) {
    try {
      currentOsc.stop();
      currentOsc.disconnect();
    } catch {
      // Ignored
    }
    currentOsc = null;
  }
  if (currentGain) {
    try {
      currentGain.disconnect();
    } catch {
      // Ignored
    }
    currentGain = null;
  }
}
