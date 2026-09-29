import { vi } from "vitest";
import { DEFAULT_STATE, type ProgressState } from "@/lib/progress-core";

/** A stand-in for `useProgress()` with every action a spy, for component tests. */
export function stubProgress(overrides: Partial<ProgressState> = {}, hydrated = true) {
  return {
    state: { ...DEFAULT_STATE, ...overrides },
    hydrated,
    openChest: vi.fn(),
    buyFreeze: vi.fn(),
    buyHint: vi.fn(),
    unlockCosmetic: vi.fn(),
    spendHint: vi.fn(),
  };
}
