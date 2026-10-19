// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

afterEach(cleanup);

describe("ProgressRing", () => {
  it("fills with the flat primary color, with no gradient and no shared ids", () => {
    const { container } = render(
      <>
        <ProgressRing pct={40} />
        <ProgressRing pct={80} />
      </>,
    );
    expect(container.querySelector("linearGradient, radialGradient")).toBeNull();
    expect(container.querySelectorAll("[id]")).toHaveLength(0);
    const arcs = [...container.querySelectorAll("circle")].filter((c) =>
      c.getAttribute("stroke-dasharray"),
    );
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      expect(arc.getAttribute("class")).toContain("stroke-primary");
      expect(arc.getAttribute("stroke")).toBeNull();
    }
  });
});
