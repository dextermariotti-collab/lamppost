/**
 * Draws a share card for a completed unit on a canvas and hands it to the OS
 * share sheet, falling back to a download. Everything on the card is a real
 * number from the learner's own run.
 */

export type ShareCard = {
  unitTitle: string;
  /** The unit's line number and colors, drawn as its bullet. */
  line: number;
  lineColor: string;
  lineOn: string;
  accuracy: number;
  streak: number;
  lessons: number;
};

export async function renderShareImage(card: ShareCard): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // A day sign: pavement ground, black lettering, the unit's line bullet.
  ctx.fillStyle = "#f1f1ee";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#525861";
  ctx.font = "700 34px Overpass, system-ui, sans-serif";
  ctx.fillText("LAMPPOST · CRITICAL THINKING", W / 2, 130);

  // The unit's bullet, with a line running through it.
  ctx.fillStyle = card.lineColor;
  ctx.fillRect(0, 418, W, 24);
  ctx.fillRect(W / 2 - 150, 280, 300, 300);
  ctx.fillStyle = card.lineOn;
  ctx.font = "800 200px Overpass, system-ui, sans-serif";
  ctx.fillText(String(card.line), W / 2, 505);

  ctx.fillStyle = "#525861";
  ctx.font = "700 38px Overpass, system-ui, sans-serif";
  ctx.fillText("UNIT COMPLETE", W / 2, 720);

  ctx.fillStyle = "#111418";
  ctx.font = "800 84px Overpass, system-ui, sans-serif";
  const title = card.unitTitle.length > 22 ? `${card.unitTitle.slice(0, 21)}…` : card.unitTitle;
  ctx.fillText(title, W / 2, 830);

  // Stats as three signs.
  const stats: [string, string][] = [
    [`${card.accuracy}%`, "accuracy"],
    [`${card.streak}`, "day streak"],
    [`${card.lessons}`, "lessons"],
  ];
  const boxW = 280;
  const gap = 30;
  const startX = (W - (boxW * 3 + gap * 2)) / 2;
  stats.forEach(([value, label], i) => {
    const x = startX + i * (boxW + gap);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, 940, boxW, 220);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#111418";
    ctx.strokeRect(x + 3, 943, boxW - 6, 214);
    ctx.fillStyle = "#111418";
    ctx.font = "800 76px Overpass, system-ui, sans-serif";
    ctx.fillText(value, x + boxW / 2, 1055);
    ctx.fillStyle = "#525861";
    ctx.font = "700 30px Overpass, system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), x + boxW / 2, 1105);
  });

  ctx.fillStyle = "#525861";
  ctx.font = "600 32px Overpass, system-ui, sans-serif";
  ctx.fillText("Look where the light is, then look further.", W / 2, 1255);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** Shares the rendered card, or downloads it when sharing files isn't supported. */
export async function shareUnitCard(card: ShareCard) {
  const blob = await renderShareImage(card);
  if (!blob) return;
  const file = new File(
    [blob],
    `lamppost-${card.unitTitle.toLowerCase().replace(/\W+/g, "-")}.png`,
    {
      type: "image/png",
    },
  );
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: "Lamppost",
        text: `${card.unitTitle} — unit complete.`,
      });
      return;
    } catch {
      /* canceled: fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
