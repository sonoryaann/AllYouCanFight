"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLobby } from "@/lib/db/lobbies";
import { useAuth } from "@/lib/auth/useAuth";

export function CreateForm() {
  const router = useRouter();
  const { profile, isLoggedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [ranked, setRanked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username && profile?.display_name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername(profile.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Inserisci un nome per continuare.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { code } = await createLobby(trimmed, ranked);
      router.push(`/lobby/${code}/setup`);
    } catch (err) {
      console.error(err);
      setError("Impossibile creare la partita. Riprova tra poco.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="create-username" className="text-sm font-medium text-nori-soft">
          Il tuo nome
        </label>
        <input
          id="create-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="es. Federico"
          maxLength={24}
          className="h-14 rounded-2xl border-2 border-soy-soft bg-rice-dim px-4 text-lg text-nori placeholder:text-nori-soft/50 outline-none focus:border-salmon transition-colors"
          disabled={loading}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-salmon-dark">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => isLoggedIn && setRanked((v) => !v)}
        aria-pressed={ranked}
        disabled={!isLoggedIn}
        className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
          ranked ? "border-salmon bg-salmon-soft" : "border-soy-soft bg-rice-dim"
        } ${!isLoggedIn ? "opacity-60" : "tap-active"}`}
      >
        <span className="flex flex-col">
          <span className="font-display font-semibold text-nori">🏆 Partita Ranked</span>
          <span className="text-xs text-nori-soft">
            {isLoggedIn
              ? "I punti contano per la classifica globale. Menu ufficiale, punti non modificabili."
              : "Accedi con Google per giocare Ranked."}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            ranked ? "bg-salmon" : "bg-soy-soft"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              ranked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>
      <button
        type="submit"
        disabled={loading}
        className="tap-active flex h-14 items-center justify-center rounded-2xl bg-salmon text-lg font-display font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-60"
      >
        {loading ? "Creazione in corso…" : "🍣 Crea Partita"}
      </button>
    </form>
  );
}
