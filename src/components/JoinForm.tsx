"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinLobby } from "@/lib/db/players";
import { useAuth } from "@/lib/auth/useAuth";

export function JoinForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const [code, setCode] = useState("");
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
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = username.trim();
    if (!trimmedCode || !trimmedName) {
      setError("Inserisci codice e nome per continuare.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await joinLobby(trimmedCode, trimmedName);
      router.push(`/lobby/${trimmedCode}/play`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      if (/not found/i.test(message)) {
        setError("Codice inesistente. Controlla e riprova.");
      } else {
        setError("Impossibile unirsi alla partita. Riprova tra poco.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="join-code" className="text-sm font-medium text-nori-soft">
          Codice partita
        </label>
        <input
          id="join-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="es. SUSH99"
          maxLength={6}
          autoCapitalize="characters"
          className="h-14 rounded-2xl border-2 border-soy-soft bg-rice-dim px-4 text-lg tracking-widest text-nori placeholder:text-nori-soft/50 outline-none focus:border-wasabi transition-colors"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="join-username" className="text-sm font-medium text-nori-soft">
          Il tuo nome
        </label>
        <input
          id="join-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="es. Federico"
          maxLength={24}
          className="h-14 rounded-2xl border-2 border-soy-soft bg-rice-dim px-4 text-lg text-nori placeholder:text-nori-soft/50 outline-none focus:border-wasabi transition-colors"
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
        className="tap-active flex h-14 items-center justify-center rounded-2xl bg-wasabi text-lg font-display font-semibold text-white shadow-lg shadow-wasabi/30 disabled:opacity-60"
      >
        {loading ? "Ingresso in corso…" : "🥢 Unisciti con Codice"}
      </button>
    </form>
  );
}
