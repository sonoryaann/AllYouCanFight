"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLobby } from "@/lib/db/lobbies";
import { useAuth } from "@/lib/auth/useAuth";

export function CreateForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const [username, setUsername] = useState("");
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
      const { code } = await createLobby(trimmed);
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
        type="submit"
        disabled={loading}
        className="tap-active flex h-14 items-center justify-center rounded-2xl bg-salmon text-lg font-display font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-60"
      >
        {loading ? "Creazione in corso…" : "🍣 Crea Partita"}
      </button>
    </form>
  );
}
