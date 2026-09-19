/**
 * Draws a share card for a completed unit on a canvas and hands it to the OS
 * share sheet, falling back to a download. Everything on the card is a real
 * number from the learner's own run.
 */

export type ShareCard = {
  unitTitle: string;
  emoji: string;
  accuracy: number;
  streak: number;
  lessons: number;
  accent: string;
};

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareImage(card: ShareCard): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#14151c";
  ctx.fillRect(0, 0, W, H);

  // Accent glow behind the badge.
  const glow = ctx.createRadialGradient(W / 2, 470, 20, W / 2, 470, 460);
  glow.addColorStop(0, card.accent);
  glow.addColorStop(1, "rgba(20,21,28,0)");
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 940);
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(237,235,230,0.62)";
  ctx.font = "600 34px 'Nunito Sans', system-ui, sans-serif";
  ctx.fillText("LAMPPOST · CRITICAL THINKING", W / 2, 130);

  // Badge medallion.
  ctx.beginPath();
  ctx.arc(W / 2, 430, 190, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = card.accent;
  ctx.stroke();
  ctx.font = "170px system-ui, 'Apple Color Emoji', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(card.emoji, W / 2, 490);

  ctx.fillStyle = card.accent;
  ctx.font = "700 38px 'Nunito Sans', system-ui, sans-serif";
  ctx.fillText("UNIT COMPLETE", W / 2, 720);

  ctx.fillStyle = "#edebe6";
  ctx.font = "600 84px Lora, Georgia, serif";
  const title = card.unitTitle.length > 22 ? `${card.unitTitle.slice(0, 21)}…` : card.unitTitle;
  ctx.fillText(title, W / 2, 830);

  // Stats row.
  const stats: [string, string][] = [
    [`${card.accuracy}%`, "accuracy"],
    [`${card.streak}`, card.streak === 1 ? "day streak" : "day streak"],
    [`${card.lessons}`, "lessons"],
  ];
  const boxW = 280;
  const gap = 30;
  const startX = (W - (boxW * 3 + gap * 2)) / 2;
  stats.forEach(([value, label], i) => {
    const x = startX + i * (boxW + gap);
    rounded(ctx, x, 940, boxW, 220, 40);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = "#edebe6";
    ctx.font = "700 76px 'Nunito Sans', system-ui, sans-serif";
    ctx.fillText(value, x + boxW / 2, 1055);
    ctx.fillStyle = "rgba(237,235,230,0.6)";
    ctx.font = "600 30px 'Nunito Sans', system-ui, sans-serif";
    ctx.fillText(label, x + boxW / 2, 1105);
  });

  ctx.fillStyle = "rgba(237,235,230,0.45)";
  ctx.font = "500 32px 'Nunito Sans', system-ui, sans-serif";
  ctx.fillText("Training clearer thinking, one unit at a time.", W / 2, 1255);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** Shares the rendered card, or downloads it when sharing files isn't supported. */
export async function shareUnitCard(card: ShareCard) {
  const blob = await renderShareImage(card);
  if (!blob) return;
  const file = new File([blob], `lamppost-${card.unitTitle.toLowerCase().replace(/\W+/g, "-")}.png`, {
    type: "image/png",
  });
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
      /* cancelled: fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
