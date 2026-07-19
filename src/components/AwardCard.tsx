"use client";

import Image from "next/image";
import type { AwardId } from "@/lib/logic/awards";
import { AWARDS } from "@/lib/logic/awards";
import { badgeAsset } from "@/lib/logic/badges";

export interface AwardCardProps {
  awardId: AwardId;
  username?: string;
  /** Sushi grade line (emoji + nome), e.g. "🥇 Sushi d'Oro". Featured variant only. */
  grado?: string;
  /** "featured" = large, screenshot-worthy hero card. "compact" = small list row. */
  variant?: "featured" | "compact";
  /**
   * Slot for future actions (e.g. Task 14 download/share buttons). Rendered
   * below the card body when provided; intentionally unimplemented here.
   */
  actions?: React.ReactNode;
}

export function AwardCard({ awardId, username, grado, variant = "featured", actions }: AwardCardProps) {
  const award = AWARDS[awardId];

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-soy-soft/40">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-rice-dim ring-2 ring-soy-soft">
          <Image src={badgeAsset(awardId)} alt={award.titolo} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-nori">{award.titolo}</p>
          {username && <p className="truncate text-xs text-nori-soft">{username}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center shadow-xl shadow-nori/10 ring-1 ring-soy-soft/40">
      <div className="relative h-40 w-40 overflow-hidden rounded-full bg-rice-dim shadow-lg ring-4 ring-salmon/40">
        <Image src={badgeAsset(awardId)} alt={award.titolo} fill sizes="160px" className="object-cover" priority />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-2xl font-bold text-nori">{award.titolo}</h3>
        {username && (
          <p className="font-display text-lg font-semibold text-salmon-dark">{username}</p>
        )}
        {grado && (
          <p className="font-display text-sm font-bold text-soy">{grado}</p>
        )}
        <p className="text-sm text-nori-soft">{award.descrizione}</p>
      </div>
      {actions && <div className="mt-1 flex w-full items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
