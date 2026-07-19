"use client";

import { useState } from "react";
import { addCustomDish } from "@/lib/db/dishes";

export function AddCustomDishForm({
  lobbyId,
  onAdded,
}: {
  lobbyId: string;
  onAdded?: () => void;
}) {
  const [nome, setNome] = useState("");
  const [punti, setPunti] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setError("Inserisci il nome del piatto.");
      return;
    }
    if (!Number.isFinite(punti) || punti < 1) {
      setError("I punti devono essere almeno 1.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addCustomDish(lobbyId, trimmed, punti);
      setNome("");
      setPunti(1);
      onAdded?.();
    } catch (err) {
      console.error(err);
      setError("Impossibile aggiungere il piatto. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome piatto fuori menu"
          maxLength={40}
          disabled={loading}
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-soy-soft bg-rice-dim px-3 text-base text-nori placeholder:text-nori-soft/50 outline-none focus:border-salmon transition-colors"
        />
        <input
          type="number"
          min={1}
          value={punti}
          onChange={(e) => setPunti(Number(e.target.value))}
          disabled={loading}
          className="h-12 w-16 rounded-xl border-2 border-soy-soft bg-rice-dim px-2 text-center text-base text-nori outline-none focus:border-salmon transition-colors"
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
        className="tap-active flex h-12 items-center justify-center rounded-xl bg-soy text-base font-display font-semibold text-white shadow disabled:opacity-60"
      >
        {loading ? "Aggiunta…" : "➕ Aggiungi piatto fuori menu"}
      </button>
    </form>
  );
}
