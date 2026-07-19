"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonSession } from "@/lib/supabase/client";
import { getLobbyByCode } from "@/lib/db/lobbies";
import { getMyPlayer, getPlayers } from "@/lib/db/players";
import { getDishes } from "@/lib/db/dishes";
import { getLobbyOrders } from "@/lib/db/orders";
import { computeAwards, AWARDS, type AwardId, type PlayerAward } from "@/lib/logic/awards";
import { computeLeaderboard } from "@/lib/logic/scoring";
import type { LeaderboardEntry } from "@/lib/logic/scoring";
import { AwardCard } from "@/components/AwardCard";
import { BadgeShareActions } from "@/components/BadgeShareActions";
import { badgeAsset } from "@/lib/logic/badges";

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [playerAwards, setPlayerAwards] = useState<PlayerAward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!code) return;
      try {
        await ensureAnonSession();
        const lobby = await getLobbyByCode(code);
        if (!lobby) {
          if (!cancelled) {
            setError("Partita non trovata. Controlla il codice.");
            setStatus("error");
          }
          return;
        }

        const me = await getMyPlayer(lobby.id);
        const [players, dishes, orders] = await Promise.all([
          getPlayers(lobby.id),
          getDishes(lobby.id),
          getLobbyOrders(lobby.id),
        ]);
        if (cancelled) return;

        const awards = computeAwards(players, dishes, orders);
        const board = computeLeaderboard(players, dishes, orders);

        setMyPlayerId(me?.id ?? null);
        setPlayerAwards(awards);
        setLeaderboard(board);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Impossibile caricare i risultati. Riprova tra poco.");
          setStatus("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-rice px-4">
        <p className="text-nori-soft">Caricamento dei risultati…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-rice px-4 text-center">
        <p className="text-lg font-medium text-salmon-dark">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="tap-active h-12 rounded-xl bg-nori px-6 font-display text-white"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  const me = playerAwards.find((pa) => pa.player_id === myPlayerId) ?? null;

  // Which usernames hold each award — for the "Classifiche" awards section.
  const winnersByAward: Record<AwardId, string[]> = {
    campione: [],
    re_salmone: [],
    sashimi: [],
    senza_fondo: [],
    palato_fino: [],
    esploratore: [],
    partecipante: [],
  };
  for (const pa of playerAwards) {
    for (const a of pa.awards) winnersByAward[a].push(pa.username);
  }
  const awardOrder: AwardId[] = [
    "campione",
    "re_salmone",
    "sashimi",
    "senza_fondo",
    "palato_fino",
    "esploratore",
    "partecipante",
  ];

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-8 pb-14">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl">🎉</span>
          <h1 className="font-display text-3xl font-bold text-nori">Partita conclusa!</h1>
          <p className="max-w-xs text-sm text-nori-soft">
            Ecco come è andata la battaglia all-you-can-eat.
          </p>
        </header>

        {me && (
          <section className="flex flex-col gap-4">
            <h2 className="text-center font-display text-lg font-semibold text-nori">
              {me.awards.length > 1 ? "I tuoi premi" : "Il tuo premio"}
            </h2>
            <div className="flex flex-col gap-4">
              {me.awards.map((awardId) => (
                <AwardCard
                  key={awardId}
                  awardId={awardId}
                  username={me.username}
                  variant="featured"
                  actions={
                    <BadgeShareActions
                      badgeUrl={badgeAsset(awardId)}
                      username={me.username}
                      titolo={AWARDS[awardId].titolo}
                    />
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-nori">🏅 Classifiche</h2>
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40">
            {awardOrder.map((awardId) => {
              const winners = winnersByAward[awardId];
              if (winners.length === 0) return null;
              return (
                <div key={awardId} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-rice-dim ring-1 ring-soy-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/badges/${awardId}.png`} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="truncate text-sm font-medium text-nori">{AWARDS[awardId].titolo}</span>
                  </div>
                  <span className="shrink-0 truncate text-right text-sm font-semibold text-salmon-dark">
                    {winners.join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-nori">📊 Classifica finale</h2>
          <div className="flex flex-col gap-3">
            {leaderboard.map((entry, index) => {
              const isMe = entry.player_id === myPlayerId;
              return (
                <div
                  key={entry.player_id}
                  className={`flex items-center justify-between gap-2 rounded-2xl p-4 shadow-lg shadow-nori/5 ring-1 ${
                    isMe ? "bg-salmon-soft ring-salmon/40" : "bg-card ring-soy-soft/40"
                  }`}
                >
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
              );
            })}
          </div>
        </section>

        <button
          onClick={() => router.push("/")}
          className="tap-active h-12 rounded-xl bg-nori font-display font-semibold text-white shadow-lg"
        >
          Torna alla home
        </button>
      </div>
    </div>
  );
}
