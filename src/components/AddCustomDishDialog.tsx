"use client";

import { useState } from "react";
import { addCustomDish } from "@/lib/db/dishes";

export function AddCustomDishDialog({
  lobbyId,
  onClose,
  onAdded,
}: {
  lobbyId: string;
  onClose: () => void;
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
      onAdded?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Impossibile aggiungere il piatto. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-nori/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi piatto fuori menu"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-nori">Piatto fuori menu</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="tap-active flex h-9 w-9 items-center justify-center rounded-full bg-rice-dim text-lg text-nori-soft"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-nori-soft">Nome piatto</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Sashimi speciale"
              maxLength={40}
              disabled={loading}
              autoFocus
              className="h-12 rounded-xl border-2 border-soy-soft bg-rice-dim px-3 text-base text-nori placeholder:text-nori-soft/50 outline-none focus:border-salmon transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-nori-soft">Punti</span>
            <input
              type="number"
              min={1}
              value={punti}
              onChange={(e) => setPunti(Number(e.target.value))}
              disabled={loading}
              className="h-12 w-24 rounded-xl border-2 border-soy-soft bg-rice-dim px-3 text-center text-base text-nori outline-none focus:border-salmon transition-colors"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-salmon-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="tap-active flex h-12 items-center justify-center rounded-xl bg-salmon font-display text-base font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-60"
          >
            {loading ? "Aggiunta…" : "Aggiungi al menu"}
          </button>
        </form>
      </div>
    </div>
  );
}
