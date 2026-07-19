"use client";

import type { LeaderboardEntry } from "@/lib/logic/scoring";

export function Leaderboard({
  entries,
  myPlayerId,
}: {
  entries: LeaderboardEntry[];
  myPlayerId: string | null;
}) {
  const maxPunti = Math.max(1, ...entries.map((e) => e.punti));
  const allZero = entries.length > 0 && entries.every((e) => e.punti === 0);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="text-5xl">🍽️</span>
        <p className="text-nori-soft">Nessun giocatore ancora in gara.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {allZero && (
        <p className="text-center text-sm text-nori-soft">
          Tutti a zero punti… che la sfida abbia inizio! 🥢
        </p>
      )}
      {entries.map((entry, index) => {
        const isMe = entry.player_id === myPlayerId;
        const widthPct = Math.max(4, Math.round((entry.punti / maxPunti) * 100));
        return (
          <div
            key={entry.player_id}
            className={`rounded-2xl p-4 shadow-lg shadow-nori/5 ring-1 transition-colors ${
              isMe ? "bg-salmon-soft ring-salmon/40" : "bg-card ring-soy-soft/40"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-display text-sm font-bold text-soy">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <span className="truncate font-display text-base font-semibold text-nori">
                  {entry.username}
                  {isMe && <span className="ml-1 text-salmon-dark">(tu)</span>}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="font-display text-lg font-bold text-nori">{entry.punti} pt</span>
                <span className="text-xs text-nori-soft">{entry.pezzi} pezzi</span>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-rice-dim">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                  isMe ? "bg-salmon" : "bg-wasabi"
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
