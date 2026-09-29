import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_DOCS } from "./legal";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

/**
 * Privacy, Terms, Acknowledgements and Support have to be reachable before someone has an
 * account, and from settings once they do. These checks keep a screen from quietly losing them.
 */
describe("legal and support links", () => {
  it("appear on every screen a signed-out person can reach first", () => {
    for (const file of [
      "src/routes/auth.tsx",
      "src/routes/onboarding.tsx",
      "src/routes/consent.tsx",
      "src/routes/support.tsx",
      "src/routes/legal.acknowledgements.tsx",
      "src/components/LegalScreen.tsx",
    ]) {
      expect(read(file), file).toContain("<LegalFooter");
    }
  });

  it("go to the four places the footer promises", () => {
    const footer = read("src/components/LegalFooter.tsx");
    for (const to of ["/legal/privacy", "/legal/terms", "/legal/acknowledgements", "/support"]) {
      expect(footer).toContain(`"${to}"`);
    }
  });

  it("are all in settings, and in the legal index", () => {
    const settings = read("src/components/LegalLinksSection.tsx");
    const index = read("src/routes/legal.index.tsx");
    for (const source of [settings, index]) {
      expect(source).toContain("/legal/acknowledgements");
      expect(source).toContain("/support");
      expect(source).toContain("LEGAL_DOCS");
    }
    const routes = LEGAL_DOCS.map((d) => d.route);
    expect(routes).toContain("/legal/privacy");
    expect(routes).toContain("/legal/terms");
  });

  it("don't invent a contact address", () => {
    const invented = ["src/components/ReportContentButton.tsx", "src/routes/support.tsx"].filter(
      (file) => /[\w.-]+@[\w-]+\.\w+/.test(read(file)),
    );
    expect(invented).toEqual([]);
  });
});
