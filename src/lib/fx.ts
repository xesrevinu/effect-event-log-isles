import { isSoundName, RECIPES } from "@/lib/cuelume-palette";

type SoundName = keyof typeof RECIPES;

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let enabled = true;
let started = false;
const watchers = new Set<(on: boolean) => void>();

function ac() {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

function bus(audio: AudioContext) {
  if (output) return output;
  const gain = audio.createGain();
  gain.gain.value = 5;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.08;
  gain.connect(limiter).connect(audio.destination);
  output = gain;
  return output;
}

// One shared 1s noise buffer: noise layers used to allocate + fill a fresh
// AudioBuffer per cue (press fires on every pointerdown).
let noiseBuffer: AudioBuffer | null = null;
function sharedNoise(audio: AudioContext) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== audio.sampleRate) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function render(audio: AudioContext, name: SoundName, volume: number) {
  const recipe = RECIPES[name];
  const master = audio.createGain();
  master.gain.value = recipe.masterGain * Math.min(1, Math.max(0, volume));
  master.connect(bus(audio));
  const now = audio.currentTime;
  for (const raw of recipe.layers) {
    const layer = raw as {
      kind: string;
      offset?: number;
      attack: number;
      decay: number;
      peak: number;
      waveform?: OscillatorType;
      frequency?: number;
      detune?: number;
      glideTo?: number;
      glideTime?: number;
      filterType?: BiquadFilterType;
      filterFrequency?: number;
      filterQ?: number;
    };
    const start = now + (layer.offset ?? 0);
    if (layer.kind === "tone") {
      const osc = audio.createOscillator();
      osc.type = layer.waveform ?? "sine";
      osc.frequency.setValueAtTime(layer.frequency ?? 440, start);
      if (layer.detune) osc.detune.value = layer.detune;
      if (layer.glideTo !== undefined) {
        const glide = layer.glideTime ?? layer.attack + layer.decay;
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.glideTo ?? 440), start + glide);
      }
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(layer.peak, start + layer.attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + layer.attack + layer.decay);
      osc.connect(g).connect(master);
      osc.start(start);
      osc.stop(start + layer.attack + layer.decay + 0.05);
    } else {
      const duration = layer.attack + layer.decay + 0.05;
      const source = audio.createBufferSource();
      source.buffer = sharedNoise(audio);
      source.loop = true;
      const filter = audio.createBiquadFilter();
      filter.type = layer.filterType ?? "lowpass";
      filter.frequency.value = layer.filterFrequency ?? 1200;
      if (layer.filterQ !== undefined) filter.Q.value = layer.filterQ;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(layer.peak, start + layer.attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + layer.attack + layer.decay);
      source.connect(filter).connect(g).connect(master);
      source.start(start);
      source.stop(start + duration);
    }
  }
  window.setTimeout(() => master.disconnect(), 1400);
}

export function unlockAudio() {
  const audio = ac();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  try {
    const buf = audio.createBuffer(1, 1, audio.sampleRate);
    const src = audio.createBufferSource();
    src.buffer = buf;
    src.connect(audio.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

export function armAudio() {
  enabled = true;
  watchers.forEach((fn) => fn(true));
  unlockAudio();
  playCue("ready", 1);
}

export function playCue(name: SoundName, volume = 1) {
  if (!enabled || !isSoundName(name)) return;
  const audio = ac();
  if (!audio) return;
  const kick = () => {
    if (enabled && audio.state === "running") render(audio, name, volume);
  };
  if (audio.state === "running") kick();
  else void audio.resume().then(kick);
}

export function setSfxEnabled(on: boolean) {
  enabled = on;
  watchers.forEach((fn) => fn(on));
  if (on) {
    unlockAudio();
    playCue("ready", 0.95);
  }
}

export function watchSfx(fn: (on: boolean) => void) {
  watchers.add(fn);
  return () => {
    watchers.delete(fn);
  };
}

export function sfxEnabled() {
  return enabled;
}

export function startCues() {
  if (typeof window === "undefined" || started) return;
  started = true;
  window.addEventListener("pointerdown", (event) => {
    unlockAudio();
    if (!(event.target instanceof Element)) return;
    const btn = event.target.closest("button, [data-cuelume-press]");
    if (!btn) return;
    if (btn instanceof HTMLButtonElement && btn.disabled) return;
    playCue("press", 0.8);
  }, true);
  window.addEventListener("click", () => unlockAudio(), true);
}

export const sfx = {
  stamp: () => playCue("pulse", 0.95),
  step: () => playCue("tick", 0.8),
  commit: () => playCue("success", 1),
  reject: () => playCue("error", 1),
  ferry: () => playCue("page", 0.95),
  arrive: () => playCue("arrival", 0.88),
  wipe: () => playCue("droplet", 0.95),
  rebuild: () => playCue("bloom", 0.95),
  win: () => playCue("sparkle", 1),
};

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function wait(ms: number) {
  if (prefersReducedMotion()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
