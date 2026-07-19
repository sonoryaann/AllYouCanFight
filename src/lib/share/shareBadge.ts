/**
 * Badge download + social share — the growth loop. Every shared image
 * carries the site URL so it advertises All You Can Fight on its own.
 *
 * Browser-only: relies on <canvas>, Image, navigator.share/canShare and
 * navigator.clipboard. Only call these from client-side event handlers,
 * never during render/SSR.
 */

export interface BadgeShareOptions {
  badgeUrl: string;
  username: string;
  titolo: string;
  /** Optional sushi grade line (emoji + nome), e.g. "🥇 Sushi d'Oro". */
  grado?: string;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

/**
 * Draws the badge PNG + player username + award title + site branding onto
 * an offscreen canvas and exports it as a PNG blob. Shared by both
 * `shareBadge` and `downloadBadge` so the composition logic lives in one
 * place.
 */
async function composeBadgeImage({ badgeUrl, username, titolo, grado }: BadgeShareOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponibile");

  // Background: warm rice gradient consistent with the app's palette.
  const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, "#fff7ea");
  bgGradient.addColorStop(1, "#ffe8d6");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Badge image, centered, inside a soft circular frame.
  const badgeImg = await loadImage(badgeUrl);
  const badgeSize = 620;
  const badgeX = (CANVAS_WIDTH - badgeSize) / 2;
  const badgeY = 260;

  ctx.save();
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, badgeY + badgeSize / 2, badgeSize / 2 + 24, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
  ctx.restore();

  // Site branding, top of the card.
  ctx.textAlign = "center";
  ctx.fillStyle = "#2b2320";
  ctx.font = "700 56px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("🍣 All You Can Fight", CANVAS_WIDTH / 2, 140);

  // Award title, below the badge.
  ctx.fillStyle = "#c0392b";
  ctx.font = "700 64px 'Segoe UI', system-ui, sans-serif";
  wrapText(ctx, titolo, CANVAS_WIDTH / 2, badgeY + badgeSize + 130, CANVAS_WIDTH - 160, 74);

  // Sushi grade line, between the award title and the username.
  let usernameY = badgeY + badgeSize + 220;
  if (grado) {
    ctx.fillStyle = "#b8860b";
    ctx.font = "700 42px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(grado, CANVAS_WIDTH / 2, badgeY + badgeSize + 195);
    usernameY += 55;
  }

  // Username.
  ctx.fillStyle = "#2b2320";
  ctx.font = "600 48px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(username, CANVAS_WIDTH / 2, usernameY);

  // Footer branding + URL.
  ctx.fillStyle = "#6b5b52";
  ctx.font = "400 36px 'Segoe UI', system-ui, sans-serif";
  const siteUrl = typeof window !== "undefined" ? window.location.origin.replace(/^https?:\/\//, "") : "";
  ctx.fillText(`Sfida i tuoi amici su ${siteUrl}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossibile generare l'immagine del badge"));
    }, "image/png");
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossibile caricare l'immagine: ${src}`));
    img.src = src;
  });
}

/** Simple word-wrap helper for the (short, Italian) award titles. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

/**
 * Triggers a browser download of the composed badge PNG.
 */
export async function downloadBadge(opts: BadgeShareOptions): Promise<void> {
  const blob = await composeBadgeImage(opts);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "sushi-badge.png";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Shares the composed badge PNG via the native Web Share sheet (with the
 * site URL baked into both the image and the share text/url) when
 * available; otherwise falls back to a plain download + clipboard copy of
 * the site URL so the "advertise the site" effect is preserved either way.
 */
export async function shareBadge({ badgeUrl, username, titolo, grado }: BadgeShareOptions): Promise<void> {
  const blob = await composeBadgeImage({ badgeUrl, username, titolo, grado });
  const file = new File([blob], "sushi-badge.png", { type: "image/png" });
  const url = window.location.origin;
  const promoText = `Ho vinto "${titolo}" a All You Can Fight! 🍣 Sfidami: ${url}`;

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], text: promoText, url });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled the native share sheet — not an error.
        return;
      }
      // Any other failure: fall through to the download fallback below.
    }
  }

  await downloadBadge({ badgeUrl, username, titolo, grado });
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access can be denied/unavailable — non-fatal.
    }
  }
}
