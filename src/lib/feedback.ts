import { useCallback, useEffect, useState } from "react";

/**
 * Sound and haptics for the reward loop.
 *
 * Tones are synthesised so there are no audio files to load, and both channels
 * are user-controlled from Settings. Nothing here is required for progress: if
 * the browser blocks audio or has no vibration motor, the cue just does nothing.
 */

export type Cue = "correct" | "wrong" | "levelup" | "streak";

export type FeedbackPrefs = { sound: boolean; haptics: boolean };

const KEY = "lamppost-feedback-v1";
const EVENT = "lamppost-feedback-change";

export const DEFAULT_PREFS: FeedbackPrefs = { sound: true, haptics: true };

export function readFeedbackPrefs(): FeedbackPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<FeedbackPrefs>;
    return {
      sound: parsed.sound !== false,
      haptics: parsed.haptics !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveFeedbackPrefs(prefs: FeedbackPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function useFeedbackPrefs() {
  const [prefs, setPrefs] = useState<FeedbackPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    const sync = () => setPrefs(readFeedbackPrefs());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((patch: Partial<FeedbackPrefs>) => {
    const next = { ...readFeedbackPrefs(), ...patch };
    saveFeedbackPrefs(next);
    setPrefs(next);
  }, []);

  return { prefs, set };
}

/** Short note sequences, in Hz, with a duration each. */
const TONES: Record<Cue, { hz: number; ms: number }[]> = {
  correct: [
    { hz: 660, ms: 90 },
    { hz: 880, ms: 130 },
  ],
  wrong: [
    { hz: 300, ms: 110 },
    { hz: 220, ms: 150 },
  ],
  levelup: [
    { hz: 523, ms: 90 },
    { hz: 659, ms: 90 },
    { hz: 784, ms: 180 },
  ],
  streak: [
    { hz: 440, ms: 80 },
    { hz: 587, ms: 80 },
    { hz: 740, ms: 160 },
  ],
};

const BUZZ: Record<Cue, number | number[]> = {
  correct: 18,
  wrong: [26, 60, 26],
  levelup: [20, 50, 20, 50, 40],
  streak: [14, 40, 30],
};

type WindowWithAudio = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithAudio;
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays the sound and fires the haptic for one cue, honouring the prefs. */
export function playCue(kind: Cue) {
  const prefs = readFeedbackPrefs();

  if (prefs.haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(BUZZ[kind]);
    } catch {
      /* ignore */
    }
  }

  if (!prefs.sound) return;
  const ctx = audio();
  if (!ctx) return;
  let at = ctx.currentTime;
  for (const note of TONES[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "wrong" ? "sawtooth" : "sine";
    osc.frequency.value = note.hz;
    const seconds = note.ms / 1000;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.09, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
    at += seconds * 0.85;
  }
}
