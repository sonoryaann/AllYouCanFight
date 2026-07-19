"use client";

import { useState } from "react";
import { addOrder } from "@/lib/db/orders";
import { AddCustomDishDialog } from "@/components/AddCustomDishDialog";
import type { DishRow } from "@/lib/logic/scoring";

export function MenuTab({
  lobbyId,
  playerId,
  dishes,
  onOrdered,
}: {
  lobbyId: string;
  playerId: string;
  dishes: DishRow[];
  onOrdered?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showAddDish, setShowAddDish] = useState(false);

  const grouped = new Map<string, DishRow[]>();
  for (const d of dishes) {
    const list = grouped.get(d.categoria) ?? [];
    list.push(d);
    grouped.set(d.categoria, list);
  }

  async function handleAdd(dishId: string) {
    setPendingId(dishId);
    try {
      await addOrder(playerId, dishId);
      onOrdered?.();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setShowAddDish(true)}
        className="tap-active flex h-12 items-center justify-center gap-2 rounded-xl bg-soy font-display text-base font-semibold text-white shadow"
      >
        ➕ Aggiungi piatto fuori menu
      </button>

      {dishes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <span className="text-5xl">🍱</span>
          <p className="text-nori-soft">Il menu è ancora vuoto.</p>
        </div>
      ) : (
        [...grouped.entries()].map(([categoria, list]) => (
          <section key={categoria} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-soy">{categoria}</h3>
            <div className="flex flex-col gap-2">
              {list.map((dish) => {
                const isPending = pendingId === dish.id;
                return (
                  <div
                    key={dish.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-base font-semibold text-nori">
                        {dish.nome}
                      </span>
                      <span className="text-sm text-nori-soft">{dish.punti} pt</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(dish.id)}
                      disabled={isPending}
                      aria-label={`Ordina ${dish.nome}`}
                      className={`tap-active flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg shadow-salmon/30 transition-opacity ${
                        isPending ? "bg-salmon/60" : "bg-salmon"
                      }`}
                    >
                      {isPending ? "…" : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {showAddDish && (
        <AddCustomDishDialog
          lobbyId={lobbyId}
          onClose={() => setShowAddDish(false)}
          onAdded={onOrdered}
        />
      )}
    </div>
  );
}
