// Web Audio engine — port of the original AudioProvider class (chunk app/layout module 68262) and the clip
// table (module 32682). See docs/recon/intro-and-chrome.md §9.
//
// Graph per playClip():  src → lowpass(10 kHz) → dry(1) → master ;  lowpass → convolver(2 s noise) → wet(0) → master
// The per-clip `gain` node (clip volume) is created but NEVER connected (original quirk ⇒ every clip plays at
// unity gain). Set APPLY_CLIP_VOLUMES = true to apply the designers' intended volumes instead.
//
// Olwtelet: ONE engine per document (`audioEngine` below), so remounts or route changes can never create a second
// AudioContext. The provider creates the context at mount; under the browsers' autoplay policy it may start
// "suspended", and unlock() resumes it from the first real user activation (any click, tap or key, see
// SoundProvider). The master gain starts at 0 and the provider fades it in when sound is enabled.
import gsap from 'gsap';

export type ClipName = 'click' | 'grid' | 'load' | 'other' | 'project' | 'riser' | 'swipe' | 'whoosh';
export interface ClipDef {
  name: ClipName;
  src: string;
  volume: number;
  type: 'effect' | 'background';
}

/** Module 32682 (paths are site-root, served from public/assets/sounds). */
export const CLIPS: Record<ClipName, ClipDef> = {
  click: { name: 'click', src: '/assets/sounds/click.mp3', volume: 0.1, type: 'effect' },
  grid: { name: 'grid', src: '/assets/sounds/grid.mp3', volume: 0.85, type: 'background' },
  load: { name: 'load', src: '/assets/sounds/load.mp3', volume: 1, type: 'effect' },
  other: { name: 'other', src: '/assets/sounds/other.mp3', volume: 0.3, type: 'background' },
  project: { name: 'project', src: '/assets/sounds/project.mp3', volume: 0.2, type: 'background' },
  riser: { name: 'riser', src: '/assets/sounds/riser.mp3', volume: 0.1, type: 'effect' },
  swipe: { name: 'swipe', src: '/assets/sounds/swipe.mp3', volume: 0.2, type: 'effect' },
  whoosh: { name: 'whoosh', src: '/assets/sounds/whoosh.mp3', volume: 0.1, type: 'effect' },
};

/** false = original behaviour (dangling per-clip gain ⇒ unity gain). */
export const APPLY_CLIP_VOLUMES = false;

export interface ClipNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  reverb: ConvolverNode;
  wetGain: GainNode;
  dryGain: GainNode;
}

interface LoadedClip {
  name: ClipName;
  volume: number;
  buffer: AudioBuffer;
}

export class AudioEngine {
  context: AudioContext | null = null;
  gain: GainNode | null = null;
  private clips: LoadedClip[] = [];
  private bytes = new Map<ClipName, Promise<ArrayBuffer | null>>();
  private decoding = new Map<ClipName, Promise<LoadedClip | null>>();
  /** mute state requested before the context existed (applied immediately at init) */
  desiredMuted = true;
  /** true once the context has been running at least once (never cleared: a later iOS "interrupted" keeps loops) */
  everRan = false;
  /** a resume() started from a real user activation is pending */
  private resuming = false;
  private subs = new Set<() => void>();

  /** React external-store subscription to the context state (running / everRan). */
  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  };
  isRunning = () => this.context?.state === 'running';
  hasEverRun = () => this.everRan;
  private notify() {
    if (this.isRunning()) this.everRan = true;
    this.subs.forEach((f) => f());
  }

  /** Create the AudioContext + master gain (at provider mount; idempotent). */
  init() {
    if (this.context || typeof window === 'undefined') return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.gain = this.context.createGain();
    this.gain.gain.value = this.desiredMuted ? 0 : 1;
    this.gain.connect(this.context.destination);
    this.context.addEventListener('statechange', () => this.notify());
    this.notify(); // autoplay allowed: the context may already be running
  }

  /**
   * Resume a suspended / interrupted context. Call it synchronously inside a user-activation event handler (Safari
   * requires the call in the gesture's own task). Events without user activation (a touch that ended a scroll, wheel)
   * are ignored where the browser exposes navigator.userActivation, so they cannot leave a resume pending.
   */
  unlock() {
    const c = this.context;
    if (!c) return;
    const st = c.state as string;
    if (st !== 'suspended' && st !== 'interrupted') return;
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (ua && !ua.isActive) return;
    this.resuming = true;
    c.resume()
      .catch(() => {})
      .finally(() => {
        this.resuming = false;
        this.notify();
      });
  }

  mute(immediate = false) {
    this.desiredMuted = true;
    if (!this.gain) return;
    if (immediate) {
      gsap.killTweensOf(this.gain.gain);
      this.gain.gain.value = 0;
      return;
    }
    gsap.to(this.gain.gain, { value: 0, duration: 0.5, ease: 'sine.out' });
  }

  unmute() {
    this.desiredMuted = false;
    if (!this.gain) return;
    gsap.to(this.gain.gain, { value: 1, duration: 0.5, ease: 'sine.out' });
  }

  /** Fetch the bytes (no decoding — no AudioContext needed). */
  prefetch(def: ClipDef): Promise<ArrayBuffer | null> {
    let p = this.bytes.get(def.name);
    if (!p) {
      p = fetch(def.src)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load clip: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .catch((e) => {
          console.warn('error loading clip', def.name, e);
          // Olwtelet: forget the failure, so the next request fetches again (a short network drop no longer silences
          // that loop for the rest of the visit)
          this.bytes.delete(def.name);
          return null;
        });
      this.bytes.set(def.name, p);
    }
    return p;
  }

  private getClip(name: ClipName) {
    return this.clips.find((c) => c.name === name);
  }

  async loadClip(def: ClipDef): Promise<LoadedClip | null> {
    const have = this.getClip(def.name);
    if (have) return have;
    let p = this.decoding.get(def.name);
    if (!p) {
      p = (async () => {
        const ab = await this.prefetch(def);
        if (!ab || !this.context) return null;
        try {
          // decodeAudioData detaches the buffer: decode a copy so a later retry still works
          const buffer = await this.context.decodeAudioData(ab.slice(0));
          const clip = { name: def.name, volume: def.volume, buffer };
          this.clips.push(clip);
          return clip;
        } catch (e) {
          console.warn('error decoding clip', def.name, e);
          return null;
        }
      })();
      this.decoding.set(def.name, p);
    }
    const r = await p;
    if (!r) this.decoding.delete(def.name);
    return r;
  }

  /** Decode every already-fetched clip (called right after init). */
  decodeAll() {
    for (const name of this.bytes.keys()) void this.loadClip(CLIPS[name]);
  }

  /** an effect started on a suspended context would be queued and play together with the others at unlock */
  private effectAllowed(def: ClipDef) {
    return def.type !== 'effect' || this.isRunning() || this.resuming;
  }

  async playClip(def: ClipDef): Promise<ClipNodes | null> {
    if (!this.context || !this.gain) return null; // original logs an error here; no context ⇒ nothing audible anyway
    if (!this.effectAllowed(def)) return null;
    const clip = this.getClip(def.name) ?? (await this.loadClip(def));
    if (!clip || !this.context || !this.gain) return null;
    if (!this.effectAllowed(def)) return null;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    const gain = ctx.createGain();
    gain.gain.value = clip.volume;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1e4;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeReverbBuffer(2);
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    wetGain.gain.value = 0;
    dryGain.gain.value = 1;
    source.connect(filter);
    if (APPLY_CLIP_VOLUMES) {
      filter.connect(gain);
      gain.connect(dryGain);
    } else {
      filter.connect(dryGain);
    }
    dryGain.connect(this.gain);
    filter.connect(reverb);
    reverb.connect(wetGain);
    wetGain.connect(this.gain);
    source.start();
    return { source, gain, filter, reverb, wetGain, dryGain };
  }

  private makeReverbBuffer(seconds: number): AudioBuffer {
    const ctx = this.context!;
    const rate = ctx.sampleRate;
    const len = rate * seconds;
    const buf = ctx.createBuffer(2, len, rate);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);
    for (let i = 0; i < len; i++) {
      l[i] = (2 * Math.random() - 1) * Math.pow(1 - i / len, 2);
      r[i] = (2 * Math.random() - 1) * Math.pow(1 - i / len, 2);
    }
    return buf;
  }
}

/** The single engine of the document (shared by every SoundProvider render; init() is idempotent and SSR-safe). */
export const audioEngine = new AudioEngine();
