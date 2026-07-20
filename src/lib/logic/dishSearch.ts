import type { DishRow } from "@/lib/logic/scoring";

/** Client-side filter over dish name/category, case-insensitive and trimmed. */
export function filterDishes(dishes: DishRow[], query: string): DishRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return dishes;
  return dishes.filter(
    (d) => d.nome.toLowerCase().includes(q) || d.categoria.toLowerCase().includes(q)
  );
}

/** Groups dishes by category, preserving the order dishes already arrive in. */
export function groupByCategory(dishes: DishRow[]): Map<string, DishRow[]> {
  const grouped = new Map<string, DishRow[]>();
  for (const d of dishes) {
    const list = grouped.get(d.categoria) ?? [];
    list.push(d);
    grouped.set(d.categoria, list);
  }
  return grouped;
}
