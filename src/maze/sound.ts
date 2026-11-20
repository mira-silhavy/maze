let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

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
  gain.connect(ctx.destination);

  src.start(startTime);
  src.stop(startTime + durationSec + 0.01);
}

/**
 * Acoustic kalimba / marimba-like plucked note with natural harmonic decay
 * and a soft mallet transient.
 */
function playAcousticPluck(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  durationSec: number,
  volume: number,
): void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, startTime);

  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.setValueAtTime(Math.min(4200, freq * 5), startTime);
  warmth.frequency.exponentialRampToValueAtTime(
    Math.max(400, freq * 1.4),
    startTime + durationSec,
  );

  master.connect(warmth);
  warmth.connect(ctx.destination);

  // Fundamental + natural woody overtones that decay faster than fundamental
  const partials: ReadonlyArray<{ ratio: number; amp: number; decay: number }> = [
    { ratio: 1, amp: 1.0, decay: durationSec },
    { ratio: 2, amp: 0.28, decay: durationSec * 0.45 },
    { ratio: 3.98, amp: 0.1, decay: durationSec * 0.2 },
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * p.ratio, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(p.amp, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay);

    osc.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + p.decay + 0.02);
  }

  // Soft mallet click
  playFilteredNoise(ctx, startTime, 0.014, freq * 2.5, 1.4, volume * 0.22);
}

/** Soft paper/pencil brush + subtle woody tap with slight natural pitch variation. */
export function playStepSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const jitter = 0.92 + Math.random() * 0.16;

  // Soft paper/pencil stroke
  playFilteredNoise(ctx, now, 0.028, 1100 * jitter, 1.2, 0.055, 'bandpass');

  // Subtle damped low body
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(185 * jitter, now);
  osc.frequency.exponentialRampToValueAtTime(110 * jitter, now + 0.025);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.032, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.035);
}

/** Muted wooden knock when bumping into a wall. */
export function playWallBumpSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const jitter = 0.94 + Math.random() * 0.12;

  playFilteredNoise(ctx, now, 0.035, 340 * jitter, 1.6, 0.08, 'lowpass');

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(145 * jitter, now);
  osc.frequency.exponentialRampToValueAtTime(72 * jitter, now + 0.055);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.085, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
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
  playAcousticPluck(ctx, note, now, 0.34, 0.14);
  playAcousticPluck(ctx, note * 1.5, now + 0.055, 0.26, 0.065);
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
      now + i * 0.085,
      isLast ? 0.75 : 0.42,
      isLast ? 0.15 : 0.11,
    );
  });
}
