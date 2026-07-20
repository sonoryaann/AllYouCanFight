"use client";

import { useState } from "react";
import { addOrder } from "@/lib/db/orders";
import { AddCustomDishDialog } from "@/components/AddCustomDishDialog";
import { CategoryAccordion, DishSearchInput } from "@/components/CategoryAccordion";
import { filterDishes, groupByCategory } from "@/lib/logic/dishSearch";
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
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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

  async function handleAdd(dishId: string) {
    setPendingId(dishId);
    setError(null);
    try {
      await addOrder(playerId, dishId);
      onOrdered?.();
    } catch (err) {
      console.error(err);
      setError("Impossibile ordinare il piatto. Riprova.");
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

      <DishSearchInput value={query} onChange={setQuery} />

      {error && (
        <p role="alert" className="rounded-xl bg-salmon-soft px-4 py-3 text-sm font-medium text-salmon-dark">
          {error}
        </p>
      )}

      {dishes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <span className="text-5xl">🍱</span>
          <p className="text-nori-soft">Il menu è ancora vuoto.</p>
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-nori-soft">Nessun piatto trovato per &ldquo;{query.trim()}&rdquo;.</p>
        </div>
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
            </CategoryAccordion>
          );
        })
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
