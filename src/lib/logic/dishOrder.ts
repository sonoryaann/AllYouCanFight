// Deterministic display order for lobby dishes.
//
// Dishes are sorted by a fixed culinary category order, then alphabetically by
// name. This keeps positions STABLE across refetches: editing a dish's points
// (an UPDATE) must never change where it appears in the list. Unknown
// categories (future custom ones) sort after the known set, alphabetically.

export const CATEGORY_ORDER: string[] = [
  "Antipasti",
  "Nigiri",
  "Gunkan",
  "Hosomaki",
  "Uramaki",
  "Futomaki",
  "Temaki",
  "Roll Speciali",
  "Sashimi",
  "Tartare & Tataki",
  "Poke",
  "Fritti",
  "Dolci",
  "Fuori Menu",
];

const rank = (categoria: string): number => {
  const i = CATEGORY_ORDER.indexOf(categoria);
  // Known categories keep their fixed rank; unknown ones go after all known.
  return i === -1 ? CATEGORY_ORDER.length : i;
};

export function orderDishes<T extends { categoria: string; nome: string }>(dishes: T[]): T[] {
  return [...dishes].sort((a, b) => {
    const ra = rank(a.categoria);
    const rb = rank(b.categoria);
    if (ra !== rb) return ra - rb;
    // Same rank: unknown categories tie at the same rank, so order them by
    // category name first, then by dish name — both stable.
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.nome.localeCompare(b.nome);
  });
}
