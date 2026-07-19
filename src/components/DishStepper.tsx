"use client";

import { useState } from "react";
import { updateDishPoints } from "@/lib/db/dishes";
import type { DishRow } from "@/lib/logic/scoring";

export function DishStepper({ dish }: { dish: DishRow }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function bump(delta: number) {
    const next = Math.max(0, dish.punti + delta);
    if (next === dish.punti) return;
    setPending(true);
    setError(null);
    try {
      await updateDishPoints(dish.id, next);
    } catch (err) {
      console.error(err);
      setError("Impossibile aggiornare i punti. Riprova.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-rice-dim px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-base text-nori">{dish.nome}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={pending || dish.punti <= 0}
            aria-label={`Diminuisci punti per ${dish.nome}`}
            className="tap-active flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-semibold text-salmon-dark shadow ring-1 ring-soy-soft/50 disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center font-display text-lg font-semibold text-nori">
            {dish.punti}
          </span>
          <button
            type="button"
            onClick={() => bump(1)}
            disabled={pending}
            aria-label={`Aumenta punti per ${dish.nome}`}
            className="tap-active flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-semibold text-wasabi-dark shadow ring-1 ring-soy-soft/50 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-right text-xs font-medium text-salmon-dark">
          {error}
        </p>
      )}
    </div>
  );
}
