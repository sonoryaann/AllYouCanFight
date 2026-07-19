"use client";

import { useState } from "react";
import { shareBadge, downloadBadge } from "@/lib/share/shareBadge";

export interface BadgeShareActionsProps {
  badgeUrl: string;
  username: string;
  titolo: string;
}

/**
 * Share + download buttons for a featured AwardCard. Meant to be passed via
 * AwardCard's `actions` slot — this is the growth loop: shared badge images
 * carry the site URL out into the world.
 */
export function BadgeShareActions({ badgeUrl, username, titolo }: BadgeShareActionsProps) {
  const [pending, setPending] = useState<"share" | "download" | null>(null);

  async function handleShare() {
    if (pending) return;
    setPending("share");
    try {
      await shareBadge({ badgeUrl, username, titolo });
    } catch (err) {
      console.error(err);
    } finally {
      setPending(null);
    }
  }

  async function handleDownload() {
    if (pending) return;
    setPending("download");
    try {
      await downloadBadge({ badgeUrl, username, titolo });
    } catch (err) {
      console.error(err);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={pending !== null}
        className="tap-active flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-salmon px-4 font-display text-sm font-semibold text-white shadow-md disabled:opacity-60"
      >
        {pending === "share" ? "Condivido…" : "📤 Condividi"}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={pending !== null}
        className="tap-active flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-nori px-4 font-display text-sm font-semibold text-white shadow-md disabled:opacity-60"
      >
        {pending === "download" ? "Scarico…" : "⬇️ Scarica"}
      </button>
    </>
  );
}
