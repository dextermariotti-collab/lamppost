import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ writeFile: vi.fn(), share: vi.fn() }));
vi.mock("./platform", () => ({ isNativeApp: () => true }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
  Filesystem: { writeFile: h.writeFile },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: h.share } }));

const { saveTextFile } = await import("./save-file");

beforeEach(() => {
  vi.clearAllMocks();
  h.writeFile.mockResolvedValue({ uri: "file:///cache/lamppost-data.json" });
  h.share.mockResolvedValue({});
});

describe("handing the learner a file in the app", () => {
  it("writes it to the app's cache and opens the share sheet", async () => {
    await saveTextFile("lamppost-data.json", "{}", "application/json");
    expect(h.writeFile).toHaveBeenCalledWith({
      path: "lamppost-data.json",
      data: "{}",
      directory: "CACHE",
      encoding: "utf8",
    });
    expect(h.share).toHaveBeenCalledWith({
      title: "lamppost-data.json",
      files: ["file:///cache/lamppost-data.json"],
    });
  });

  it("treats closing the share sheet as fine, and anything else as a failure", async () => {
    h.share.mockRejectedValueOnce(new Error("Share canceled"));
    await expect(saveTextFile("a.json", "{}", "application/json")).resolves.toBeUndefined();
    h.share.mockRejectedValueOnce(new Error("No space left"));
    await expect(saveTextFile("a.json", "{}", "application/json")).rejects.toThrow("No space");
  });
});
