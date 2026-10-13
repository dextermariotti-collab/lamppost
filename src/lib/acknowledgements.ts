import { PACKAGES, type PackageLicence } from "./acknowledgements.generated";

export { PACKAGES, type PackageLicence };

/** Typefaces the app loads from Google Fonts, all of which Google Fonts lists under the SIL OFL 1.1. */
export const FONTS = [
  {
    name: "Overpass",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Overpass",
  },
  {
    name: "Overpass Mono",
    license: "SIL Open Font License 1.1",
    url: "https://fonts.google.com/specimen/Overpass+Mono",
  },
] as const;

/** Other things the app is built with that aren't runtime packages. */
export const ALSO_BUILT_WITH = [
  { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com" },
  { name: "shadcn/ui (component patterns)", license: "MIT", url: "https://ui.shadcn.com" },
  { name: "Vite", license: "MIT", url: "https://vite.dev" },
] as const;

/** Groups packages by licence, most common first. */
export function groupByLicence(packages: readonly PackageLicence[] = PACKAGES) {
  const groups = new Map<string, PackageLicence[]>();
  for (const pkg of packages) groups.set(pkg.license, [...(groups.get(pkg.license) ?? []), pkg]);
  return [...groups.entries()]
    .map(([license, items]) => ({ license, items }))
    .sort((a, b) => b.items.length - a.items.length || a.license.localeCompare(b.license));
}

/** The licences a shipped dependency may carry without someone reading it first. */
export const PERMISSIVE = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  // The bundled fonts. The SIL Open Font License allows shipping them inside an app; it only
  // forbids selling the fonts on their own. They are credited under Typefaces as well.
  "OFL-1.1",
]);
