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
import { CategoryAccordion, DishSearchInput } from "@/components/CategoryAccordion";
import { filterDishes, groupByCategory } from "@/lib/logic/dishSearch";
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
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [pointsOpen, setPointsOpen] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
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
        setIsRanked(lobby.ranked);
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

  const isSearching = query.trim().length > 0;
  const filtered = filterDishes(dishes, query);
  const grouped = groupByCategory(filtered);

  function toggleCategory(categoria: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoria)) next.delete(categoria);
      else next.add(categoria);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-8 pb-28 sm:py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-2xl font-bold text-nori">Setup Partita</h1>
          {isRanked && (
            <span className="rounded-full bg-salmon-soft px-3 py-1 text-xs font-semibold text-salmon-dark">
              🏆 Ranked
            </span>
          )}
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
          <h2 className="font-display mb-3 text-lg font-semibold text-nori">Menu</h2>
          <DishSearchInput value={query} onChange={setQuery} />

          {!isRanked && (
            <>
              <button
                type="button"
                onClick={() => setPointsOpen((v) => !v)}
                aria-expanded={pointsOpen}
                className="tap-active mt-4 flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-wasabi-soft px-4 text-left"
              >
                <span className="font-display text-base font-semibold text-wasabi-dark">
                  Personalizza punti
                </span>
                <span
                  aria-hidden="true"
                  className={`text-wasabi-dark transition-transform ${pointsOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              {pointsOpen && (
                <div className="mt-3 flex flex-col gap-4">
                  <p className="text-sm text-nori-soft">
                    I punti di default vanno bene per la maggior parte delle partite: modificali solo se vuoi.
                  </p>
                  {grouped.size === 0 ? (
                    <p className="text-sm text-nori-soft">
                      Nessun piatto trovato per &ldquo;{query.trim()}&rdquo;.
                    </p>
                  ) : (
                    [...grouped.entries()].map(([categoria, list]) => {
                      const open = isSearching || openCategories.has(categoria);
                      return (
                        <CategoryAccordion
                          key={categoria}
                          categoria={categoria}
                          count={list.length}
                          open={open}
                          onToggle={() => toggleCategory(categoria)}
                        >
                          {list.map((dish) => (
                            <DishStepper key={dish.id} dish={dish} />
                          ))}
                        </CategoryAccordion>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {!isRanked && (
          <section className="rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
            <h2 className="font-display mb-3 text-lg font-semibold text-nori">Piatto fuori menu</h2>
            {lobbyId && <AddCustomDishForm lobbyId={lobbyId} onAdded={refresh} />}
          </section>
        )}

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
