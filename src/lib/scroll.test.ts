// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { scrollToTop } from "./scroll";

const scrolls = (el: HTMLElement, height: number) => {
  el.style.overflowY = "auto";
  Object.defineProperty(el, "scrollHeight", { value: height, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 500, configurable: true });
};

describe("scrollToTop", () => {
  it("scrolls the pane the element sits in, not only the window", () => {
    const pane = document.createElement("div");
    const inner = document.createElement("div");
    const target = document.createElement("h1");
    pane.append(inner);
    inner.append(target);
    document.body.append(pane);
    scrolls(pane, 2000);
    pane.scrollTop = 900;

    scrollToTop(target);
    expect(pane.scrollTop).toBe(0);
    pane.remove();
  });

  it("leaves a pane alone when it has nothing to scroll", () => {
    const pane = document.createElement("div");
    const target = document.createElement("p");
    pane.append(target);
    document.body.append(pane);
    scrolls(pane, 400);
    expect(() => scrollToTop(target)).not.toThrow();
    expect(() => scrollToTop(null)).not.toThrow();
    pane.remove();
  });
});
