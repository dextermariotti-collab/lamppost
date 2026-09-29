// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepView } from "@/components/steps/StepView";
import { LESSONS } from "@/lib/curriculum";
import { authoredUnits, loadLessonScript } from "./index";

afterEach(cleanup);

/** Every authored step has to draw without throwing, whatever data it carries. */
describe("every authored step renders", () => {
  it("draws all steps of all lessons", async () => {
    const onResolve = vi.fn();
    let drawn = 0;
    for (const lesson of LESSONS.filter((l) => authoredUnits().includes(l.unitId))) {
      const loaded = await loadLessonScript(lesson.unitId, lesson.id);
      expect(loaded.ok, lesson.id).toBe(true);
      if (!loaded.ok) continue;
      for (const step of loaded.script.steps) {
        const { container, unmount } = render(<StepView step={step} onResolve={onResolve} />);
        expect(container.textContent?.length, `${lesson.id}/${step.id}`).toBeGreaterThan(10);
        unmount();
        drawn += 1;
      }
    }
    expect(drawn).toBeGreaterThan(250);
  });
});
