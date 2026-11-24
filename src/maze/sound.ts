let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let outputBus: AudioNode | null = null;

/** Shared bus: dry + small-room reverb into a gentle compressor. */
function getOutput(ctx: AudioContext): AudioNode {
  if (outputBus && outputBus.context === ctx) return outputBus;

  const input = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.2;
  compressor.connect(ctx.destination);

  const length = Math.floor(ctx.sampleRate * 1.3);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.5);
    }
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = ir;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 3800;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;

  input.connect(compressor);
  input.connect(reverb);
  reverb.connect(damp);
  damp.connect(wet);
  wet.connect(compressor);

  outputBus = input;
  return input;
}

function panned(ctx: AudioContext, pan: number): AudioNode {
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(getOutput(ctx));
  return panner;
}

/** Fixed-pitch sine partial with an exponential decay (no pitch sweep). */
function playPartial(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  decaySec: number,
  amp: number,
  attackSec = 0.004,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(amp, startTime + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decaySec);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + decaySec + 0.02);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function playFilteredNoise(
  ctx: AudioContext,
  startTime: number,
  durationSec: number,
  filterFreq: number,
  q: number,
  volume: number,
  filterType: BiquadFilterType = 'bandpass',
  dest: AudioNode = getOutput(ctx),
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, startTime);
  filter.Q.setValueAtTime(q, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  src.start(startTime, Math.random() * 0.1);
  src.stop(startTime + durationSec + 0.01);
}

/**
 * Marimba / kalimba-like struck bar: inharmonic overtones that die fast,
 * a slightly detuned second fundamental for natural beating, soft mallet.
 */
function playAcousticPluck(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  durationSec: number,
  volume: number,
  pan = 0,
): void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, startTime);

  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.setValueAtTime(Math.min(6000, freq * 6), startTime);
  warmth.frequency.exponentialRampToValueAtTime(
    Math.max(500, freq * 1.5),
    startTime + durationSec,
  );

  const out = panned(ctx, pan);
  master.connect(warmth);
  warmth.connect(out);

  const detune = 1 + (Math.random() * 0.004 + 0.002);
  playPartial(ctx, master, freq, startTime, durationSec, 0.75);
  playPartial(ctx, master, freq * detune, startTime, durationSec * 0.9, 0.3);
  // Tuned-bar overtone ratios (~4x and ~10x), decaying much faster
  playPartial(ctx, master, freq * 3.93, startTime, durationSec * 0.18, 0.16, 0.002);
  playPartial(ctx, master, freq * 9.7, startTime, durationSec * 0.06, 0.05, 0.001);

  // Soft felt mallet
  playFilteredNoise(ctx, startTime, 0.018, freq * 2, 0.9, volume * 0.25, 'lowpass', out);
}

/** Soft footstep-like shuffle: brushed noise with a faint low body. */
export function playStepSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const jitter = 0.9 + Math.random() * 0.2;
  const out = panned(ctx, (Math.random() - 0.5) * 0.3);

  playFilteredNoise(ctx, now, 0.045, 1400 * jitter, 0.7, 0.05, 'bandpass', out);
  playFilteredNoise(ctx, now, 0.035, 260 * jitter, 0.8, 0.07, 'lowpass', out);
}

/** Muted wooden knock when bumping into a wall. */
export function playWallBumpSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const jitter = 0.94 + Math.random() * 0.12;
  const out = getOutput(ctx);

  playFilteredNoise(ctx, now, 0.05, 420 * jitter, 1.2, 0.12, 'lowpass', out);
  // Wooden body resonances (inharmonic, fixed pitch)
  playPartial(ctx, out, 118 * jitter, now, 0.09, 0.07, 0.002);
  playPartial(ctx, out, 118 * 2.6 * jitter, now, 0.045, 0.035, 0.001);
}

const COLLECT_PENTATONIC = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
];

/** Warm wooden xylophone / kalimba note rising with each collected circle. */
export function playCollectSound(collectedCount: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const idx = Math.min(
    COLLECT_PENTATONIC.length - 1,
    Math.max(0, (collectedCount - 1) % COLLECT_PENTATONIC.length),
  );
  const note = COLLECT_PENTATONIC[idx];
  const pan = (idx / (COLLECT_PENTATONIC.length - 1) - 0.5) * 0.6;
  playAcousticPluck(ctx, note, now, 0.6, 0.16, pan);
  playAcousticPluck(ctx, note * 1.5, now + 0.06, 0.45, 0.07, -pan);
}

/** Warm acoustic harp / kalimba victory chord arpeggio. */
export function playWinSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 987.77, 1046.5];
  chord.forEach((freq, i) => {
    const isLast = i === chord.length - 1;
    playAcousticPluck(
      ctx,
      freq,
      now + i * 0.09,
      isLast ? 1.4 : 0.8,
      isLast ? 0.16 : 0.12,
      (i / (chord.length - 1) - 0.5) * 0.8,
    );
  });
}

let lastMarbleBumpAt = 0;

/** Crisp glassy/wooden marble clack scaled by impact intensity (0..1). */
export function playMarbleBumpSound(intensity = 0.7): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const nowMs = performance.now();
  if (nowMs - lastMarbleBumpAt < 90) return;
  lastMarbleBumpAt = nowMs;

  const clamped = Math.max(0.15, Math.min(1, intensity));
  const now = ctx.currentTime;
  const jitter = 0.94 + Math.random() * 0.12;

  const out = getOutput(ctx);
  playFilteredNoise(ctx, now, 0.02, 3200 * jitter, 1.5, 0.08 * clamped, 'bandpass', out);
  // Glass-like inharmonic ring
  const base = 2100 * jitter;
  playPartial(ctx, out, base, now, 0.07, 0.05 * clamped, 0.001);
  playPartial(ctx, out, base * 2.76, now, 0.035, 0.025 * clamped, 0.001);
  playPartial(ctx, out, 260 * jitter, now, 0.04, 0.05 * clamped, 0.001);
}

let rollingNodes: {
  source: AudioBufferSourceNode;
  bandpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  gain: GainNode;
} | null = null;

function createRollingNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 1.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink-ish smoothed noise for a warm wooden-track marble rumble
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    data[i] = (b0 + b1 + b2 + white * 0.04) * 1.8;
  }
  return buffer;
}

/**
 * Continuously updates a procedural marble-rolling rumble.
 * Pass speedNormalized in [0, 1]; 0 silences it smoothly.
 */
export function setMarbleRollingSpeed(speedNormalized: number): void {
  const clamped = Math.max(0, Math.min(1, speedNormalized));
  if (clamped < 0.03) {
    if (rollingNodes && audioCtx) {
      rollingNodes.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    }
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (!rollingNodes) {
    const source = ctx.createBufferSource();
    source.buffer = createRollingNoiseBuffer(ctx);
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 320;
    bandpass.Q.value = 1.6;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1100;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(getOutput(ctx));
    source.start();

    rollingNodes = { source, bandpass, lowpass, gain };
  }

  const now = ctx.currentTime;
  const targetFreq = 210 + clamped * 560;
  const targetGain = 0.015 + clamped * 0.095;
  rollingNodes.bandpass.frequency.setTargetAtTime(targetFreq, now, 0.05);
  rollingNodes.lowpass.frequency.setTargetAtTime(650 + clamped * 1100, now, 0.05);
  rollingNodes.gain.gain.setTargetAtTime(targetGain, now, 0.045);
}

export function stopMarbleRollingSound(): void {
  if (!rollingNodes) return;
  try {
    if (audioCtx) {
      rollingNodes.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.02);
    }
    rollingNodes.source.stop();
    rollingNodes.source.disconnect();
  } catch {
    // Ignore if already stopped
  }
  rollingNodes = null;
}
