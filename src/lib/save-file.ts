import { isNativeApp } from "./platform";

/**
 * Hands the learner a text file. A browser downloads it. An app's web view can't, so the phone
 * apps write it to the app's cache and open the share sheet, where it can be saved to Files or
 * sent on. Closing the share sheet is not an error.
 */
export async function saveTextFile(name: string, text: string, type: string): Promise<void> {
  if (!isNativeApp()) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: name, files: [uri] });
  } catch (error) {
    if (!/cancel/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
}
