// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ native: true, writeFile: vi.fn(), share: vi.fn() }));
vi.mock("./platform", () => ({ isNativeApp: () => h.native }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: { writeFile: h.writeFile },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: h.share } }));

const { shareUnitCard } = await import("./share-image");

const card = {
  unitTitle: "What's the claim?",
  line: 1,
  lineColor: "#0a5",
  lineOn: "#fff",
  accuracy: 90,
  streak: 4,
  lessons: 5,
};
const webShare = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  h.native = true;
  h.writeFile.mockResolvedValue({ uri: "file:///cache/lamppost-what-s-the-claim-.png" });
  h.share.mockResolvedValue({});
  const ctx = new Proxy(
    {},
    {
      get: (_target, prop) =>
        typeof prop === "string" && /^(fill|stroke)(Rect|Text)$/.test(prop)
          ? () => undefined
          : undefined,
      set: () => true,
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    callback(new Blob(["png-bytes"], { type: "image/png" }));
  };
  Object.assign(navigator, { share: webShare, canShare: () => true });
  webShare.mockResolvedValue(undefined);
});

describe("sharing a unit card in the app", () => {
  it("writes the image to the app's cache and opens the share sheet with it", async () => {
    await shareUnitCard(card);
    expect(h.writeFile).toHaveBeenCalledWith({
      path: "lamppost-what-s-the-claim-.png",
      data: btoa("png-bytes"),
      directory: "CACHE",
    });
    expect(h.share).toHaveBeenCalledWith({
      title: "Lamppost",
      text: "What's the claim? — unit complete.",
      files: ["file:///cache/lamppost-what-s-the-claim-.png"],
    });
    expect(webShare).not.toHaveBeenCalled();
  });

  it("treats closing the share sheet as fine, and anything else as a failure", async () => {
    h.share.mockRejectedValueOnce(new Error("Share canceled"));
    await expect(shareUnitCard(card)).resolves.toBeUndefined();
    h.share.mockRejectedValueOnce(new Error("No space left"));
    await expect(shareUnitCard(card)).rejects.toThrow("No space");
  });
});

describe("sharing a unit card on the web", () => {
  it("still uses the browser's share sheet and never the app's", async () => {
    h.native = false;
    await shareUnitCard(card);
    expect(webShare).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Lamppost", text: "What's the claim? — unit complete." }),
    );
    expect(h.writeFile).not.toHaveBeenCalled();
    expect(h.share).not.toHaveBeenCalled();
  });
});
