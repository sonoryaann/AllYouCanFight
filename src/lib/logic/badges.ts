import type { AwardId } from "./awards";

export function badgeAsset(id: AwardId): string {
  return `/badges/${id}.png`;
}
