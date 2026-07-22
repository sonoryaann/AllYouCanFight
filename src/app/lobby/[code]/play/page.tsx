"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonSession } from "@/lib/supabase/client";
import { getLobbyByCode, endGame, finalizeRankedGame } from "@/lib/db/lobbies";
import { getMyPlayer, getPlayers } from "@/lib/db/players";
import { getDishes } from "@/lib/db/dishes";
import { getMyOrders, type OrderWithDish } from "@/lib/db/orders";
import { getLeaderboard } from "@/lib/db/leaderboard";
import { useLobbyChannel } from "@/lib/realtime/useLobbyChannel";
import { TabBar, type TabId } from "@/components/TabBar";
import { Leaderboard } from "@/components/Leaderboard";
import { MenuTab } from "@/components/MenuTab";
import { MyOrdersTab } from "@/components/MyOrdersTab";
import { MissionsTab } from "@/components/MissionsTab";
import type { DishRow, LeaderboardEntry } from "@/lib/logic/scoring";
import type { EatenDish } from "@/lib/logic/missions";

interface Player {
  id: string;
  username: string;
  ruolo: string;
}

function myOrdersToEaten(orders: OrderWithDish[]): EatenDish[] {
  return orders.map((o) => ({
    nome: o.nome,
    categoria: o.categoria,
    punti: o.punti,
    quantita_ordinata: o.quantita_ordinata,
    quantita_mangiata: o.quantita_mangiata,
    stato: o.stato === "consegnato" ? "consegnato" : "in_attesa",
  }));
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();

  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [tab, setTab] = useState<TabId>("classifica");
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myOrders, setMyOrders] = useState<OrderWithDish[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "redirecting">("loading");
  const [lobbyStato, setLobbyStato] = useState<string>("creata");
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [isRanked, setIsRanked] = useState(false);

  const lobbyIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const refetchAll = useCallback(async () => {
    const lId = lobbyIdRef.current;
    const pId = playerIdRef.current;
    if (!lId || !pId) return;
    try {
      const [lobby, d, p, orders, board] = await Promise.all([
        getLobbyByCode(code),
        getDishes(lId),
        getPlayers(lId),
        getMyOrders(pId),
        getLeaderboard(lId),
      ]);
      setDishes(d);
      setPlayers(p);
      setMyOrders(orders);
      setLeaderboard(board);
      if (lobby) setLobbyStato(lobby.stato);
      if (lobby?.stato === "completata") {
        router.replace(`/lobby/${code}/results`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [code, router]);

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
        if (!me) {
          if (!cancelled) {
            setStatus("redirecting");
            router.replace("/");
          }
          return;
        }
        if (lobby.stato === "completata") {
          if (!cancelled) {
            setStatus("redirecting");
            router.replace(`/lobby/${code}/results`);
          }
          return;
        }
        // The host manages an unstarted game from the setup screen (where the
        // "Avvia partita" button lives) — send them there.
        if (lobby.stato === "creata" && me.ruolo === "host") {
          if (!cancelled) {
            setStatus("redirecting");
            router.replace(`/lobby/${code}/setup`);
          }
          return;
        }
        if (cancelled) return;

        lobbyIdRef.current = lobby.id;
        playerIdRef.current = me.id;
        setLobbyId(lobby.id);
        setPlayerId(me.id);
        setIsHost(me.ruolo === "host");
        setLobbyStato(lobby.stato);
        setIsRanked(lobby.ranked);

        const [d, p, orders, board] = await Promise.all([
          getDishes(lobby.id),
          getPlayers(lobby.id),
          getMyOrders(me.id),
          getLeaderboard(lobby.id),
        ]);
        if (cancelled) return;
        setDishes(d);
        setPlayers(p);
        setMyOrders(orders);
        setLeaderboard(board);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Impossibile caricare la partita. Riprova tra poco.");
          setStatus("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  useLobbyChannel(lobbyId, refetchAll);

  async function handleEndGame() {
    if (!lobbyId) return;
    setEnding(true);
    try {
      if (isRanked) {
        await finalizeRankedGame(lobbyId);
      } else {
        await endGame(lobbyId);
      }
      router.replace(`/lobby/${code}/results`);
    } catch (err) {
      console.error(err);
      setError("Impossibile terminare la partita. Riprova.");
      setEnding(false);
      setConfirmEnd(false);
    }
  }

  if (status === "loading" || status === "redirecting") {
    return (
      <div className="flex flex-1 items-center justify-center bg-rice px-4">
        <p className="text-nori-soft">Caricamento…</p>
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

  if (lobbyStato === "creata") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-rice px-4 py-10 text-center">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="text-6xl">🍣</div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold text-nori">In attesa dell&apos;avvio</h1>
            <p className="text-sm text-nori-soft">
              Sei dentro! La sfida inizierà quando l&apos;host avvia la partita. Potrai ordinare e
              segnare i piatti solo da quel momento.
            </p>
          </div>

          <div className="w-full rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
            <h2 className="font-display mb-3 text-lg font-semibold text-nori">
              Giocatori ({players.length})
            </h2>
            {players.length === 0 ? (
              <p className="text-sm text-nori-soft">Nessun giocatore ancora…</p>
            ) : (
              <ul className="flex flex-wrap justify-center gap-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full bg-wasabi-soft px-3 py-1.5 text-sm font-medium text-wasabi-dark"
                  >
                    {p.ruolo === "host" ? "👑 " : ""}
                    {p.username}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-nori-soft">
            <span className="h-2 w-2 animate-pulse rounded-full bg-salmon" />
            In attesa dell&apos;host…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-6 pb-28">
      <div className="flex w-full max-w-md flex-col gap-5">
        {tab === "classifica" && (
          <>
            <header className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <h1 className="font-display text-2xl font-bold text-nori">🏆 Classifica</h1>
                <span className="text-xs text-nori-soft">
                  {players.length} {players.length === 1 ? "giocatore" : "giocatori"} in gara
                </span>
                {isRanked && (
                  <span className="mt-0.5 w-fit rounded-full bg-salmon-soft px-2 py-0.5 text-[11px] font-semibold text-salmon-dark">
                    🏆 Ranked
                  </span>
                )}
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={() => setConfirmEnd(true)}
                  className="tap-active rounded-xl bg-nori px-3 py-2 text-xs font-semibold text-white shadow"
                >
                  Termina partita
                </button>
              )}
            </header>
            <Leaderboard entries={leaderboard} myPlayerId={playerId} />
          </>
        )}

        {tab === "menu" && lobbyId && playerId && (
          <>
            <h1 className="font-display text-2xl font-bold text-nori">🍱 Menu</h1>
            <MenuTab
              lobbyId={lobbyId}
              playerId={playerId}
              dishes={dishes}
              onOrdered={refetchAll}
            />
          </>
        )}

        {tab === "ordini" && (
          <>
            <h1 className="font-display text-2xl font-bold text-nori">🍣 I Miei Ordini</h1>
            <MyOrdersTab orders={myOrders} onChanged={refetchAll} />
          </>
        )}

        {tab === "missioni" && (
          <>
            <h1 className="font-display text-2xl font-bold text-nori">🎯 Missioni</h1>
            <MissionsTab eaten={myOrdersToEaten(myOrders)} />
          </>
        )}

        {error && (
          <p role="alert" className="text-center text-sm font-medium text-salmon-dark">
            {error}
          </p>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      {confirmEnd && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-nori/40 backdrop-blur-sm sm:items-center"
          onClick={() => !ending && setConfirmEnd(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl"
          >
            <h2 className="font-display mb-2 text-lg font-semibold text-nori">
              Terminare la partita?
            </h2>
            <p className="mb-5 text-sm text-nori-soft">
              Tutti i giocatori verranno portati alla schermata dei risultati finali. Questa azione
              non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                disabled={ending}
                className="tap-active h-12 flex-1 rounded-xl bg-rice-dim font-display font-semibold text-nori disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleEndGame}
                disabled={ending}
                className="tap-active h-12 flex-1 rounded-xl bg-salmon font-display font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-60"
              >
                {ending ? "Attendi…" : "Termina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
