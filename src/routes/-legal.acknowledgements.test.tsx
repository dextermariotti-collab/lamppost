// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/LegalFooter", () => ({ LegalFooter: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { FONTS } from "@/lib/acknowledgements";
import { Route } from "./legal.acknowledgements";

const Screen = Route.options.component as () => ReactNode;

afterEach(cleanup);

describe("Acknowledgments", () => {
  it("credits the typefaces as bundled with the app, not loaded from Google Fonts", () => {
    render(<Screen />);
    const typefaces = screen.getByRole("region", { name: "Typefaces" }).textContent!;
    expect(typefaces).toMatch(/Bundled with the app/);
    expect(typefaces).not.toMatch(/Loaded from Google Fonts|contacts Google to fetch/);
    for (const font of FONTS) expect(typefaces).toContain(font.name);
  });
});
