// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { LegalFooter } from "./LegalFooter";

afterEach(cleanup);

describe("LegalFooter", () => {
  it("offers Privacy, Terms, Acknowledgments and Support as one labeled navigation", () => {
    render(<LegalFooter />);
    const nav = screen.getByRole("navigation", { name: "Legal and support" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(links).toEqual([
      ["Privacy", "/legal/privacy"],
      ["Terms", "/legal/terms"],
      ["Acknowledgments", "/legal/acknowledgements"],
      ["Support", "/support"],
    ]);
  });
});
