"use client";

import { useState } from "react";
import { markEaten } from "@/lib/db/orders";
import type { OrderWithDish } from "@/lib/db/orders";

export function MyOrdersTab({
  orders,
  onChanged,
}: {
  orders: OrderWithDish[];
  onChanged?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inArrivo = orders.filter((o) => o.stato === "in_attesa");
  const mangiati = orders.filter((o) => o.stato !== "in_attesa");

  async function handleMarkEaten(orderId: string) {
    setPendingId(orderId);
    setError(null);
    try {
      await markEaten(orderId);
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError("Non è stato possibile segnare il piatto come mangiato. Riprova.");
    } finally {
      setPendingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="text-5xl">🥢</span>
        <p className="text-nori-soft">Non hai ancora ordinato nulla. Vai al Menu!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-xl bg-salmon-soft px-4 py-3 text-sm font-medium text-salmon-dark">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-soy">In arrivo</h3>
        {inArrivo.length === 0 ? (
          <p className="text-sm text-nori-soft">Nessun piatto in arrivo al momento.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {inArrivo.map((order) => {
              const isPending = pendingId === order.id;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-base font-semibold text-nori">
                      {order.nome}
                    </span>
                    <span className="text-sm text-nori-soft">
                      {order.quantita_mangiata}/{order.quantita_ordinata} mangiati · {order.punti} pt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkEaten(order.id)}
                    disabled={isPending}
                    className="tap-active shrink-0 rounded-xl bg-wasabi px-4 py-2.5 font-display text-sm font-semibold text-white shadow-lg shadow-wasabi/30 disabled:opacity-60"
                  >
                    {isPending ? "…" : "✅ Mangiato!"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-soy">Mangiati</h3>
        {mangiati.length === 0 ? (
          <p className="text-sm text-nori-soft">Ancora nessun piatto completato.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mangiati.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-rice-dim px-4 py-3 opacity-80"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-base font-semibold text-nori">
                    {order.nome}
                  </span>
                  <span className="text-sm text-nori-soft">
                    {order.quantita_mangiata}/{order.quantita_ordinata} · {order.punti} pt
                  </span>
                </div>
                <span className="shrink-0 text-xl">✔️</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
