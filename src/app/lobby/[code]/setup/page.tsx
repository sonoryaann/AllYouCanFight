"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonSession } from "@/lib/supabase/client";
import { getLobbyByCode, startGame } from "@/lib/db/lobbies";
import { getMyPlayer, getPlayers } from "@/lib/db/players";
import { getDishes } from "@/lib/db/dishes";
import { useLobbyChannel } from "@/lib/realtime/useLobbyChannel";
import { DishStepper } from "@/components/DishStepper";
import { AddCustomDishForm } from "@/components/AddCustomDishForm";
import type { DishRow } from "@/lib/logic/scoring";

interface Player {
  id: string;
  username: string;
  ruolo: string;
}

export default function SetupPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();

  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "redirecting">("loading");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const lobbyIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const id = lobbyIdRef.current;
    if (!id) return;
    try {
      const [d, p] = await Promise.all([getDishes(id), getPlayers(id)]);
      setDishes(d);
      setPlayers(p);
    } catch (err) {
      console.error(err);
    }
  }, []);

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
        if (!me || me.ruolo !== "host") {
          if (!cancelled) {
            setStatus("redirecting");
            router.replace(`/lobby/${code}/play`);
          }
          return;
        }
        if (cancelled) return;
        lobbyIdRef.current = lobby.id;
        setLobbyId(lobby.id);
        const [d, p] = await Promise.all([getDishes(lobby.id), getPlayers(lobby.id)]);
        if (cancelled) return;
        setDishes(d);
        setPlayers(p);
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

  useLobbyChannel(lobbyId, refresh);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStart() {
    if (!lobbyId) return;
    setStarting(true);
    try {
      await startGame(lobbyId);
      router.push(`/lobby/${code}/play`);
    } catch (err) {
      console.error(err);
      setError("Impossibile avviare la partita. Riprova.");
      setStarting(false);
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

  const grouped = new Map<string, DishRow[]>();
  for (const d of dishes) {
    const list = grouped.get(d.categoria) ?? [];
    list.push(d);
    grouped.set(d.categoria, list);
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-8 pb-28 sm:py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-2xl font-bold text-nori">Setup Partita</h1>
          <button
            onClick={handleCopy}
            className="tap-active flex items-center gap-3 rounded-2xl bg-card px-6 py-4 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40"
          >
            <span className="font-display text-3xl font-extrabold tracking-widest text-salmon">
              {code}
            </span>
            <span className="text-sm font-medium text-nori-soft">
              {copied ? "Copiato! ✓" : "Copia codice"}
            </span>
          </button>
          <p className="text-sm text-nori-soft">Condividi il codice con i tuoi amici.</p>
        </header>

        <section className="rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-3 text-lg font-semibold text-nori">
            Giocatori ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-sm text-nori-soft">In attesa che qualcuno si unisca…</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
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
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-3 text-lg font-semibold text-nori">Menu &amp; punti</h2>
          <div className="flex flex-col gap-4">
            {[...grouped.entries()].map(([categoria, list]) => (
              <div key={categoria} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-soy">
                  {categoria}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {list.map((dish) => (
                    <DishStepper key={dish.id} dish={dish} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-3 text-lg font-semibold text-nori">Piatto fuori menu</h2>
          {lobbyId && <AddCustomDishForm lobbyId={lobbyId} onAdded={refresh} />}
        </section>

        {error && (
          <p role="alert" className="text-center text-sm font-medium text-salmon-dark">
            {error}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-soy-soft/40 bg-rice/95 p-4 backdrop-blur">
        <button
          onClick={handleStart}
          disabled={starting}
          className="tap-active mx-auto flex h-14 w-full max-w-md items-center justify-center rounded-2xl bg-salmon font-display text-lg font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-50"
        >
          {starting ? "Avvio…" : "🚀 Avvia partita"}
        </button>
      </div>
    </div>
  );
}
