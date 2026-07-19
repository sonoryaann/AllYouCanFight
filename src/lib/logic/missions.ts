export interface EatenDish {
  nome: string;
  categoria: string;
  punti: number;
  quantita_ordinata: number;
  quantita_mangiata: number;
  stato: "in_attesa" | "consegnato";
}

export interface PlayerStats {
  nigiri: number; uramaki: number; hosomaki: number; sashimi: number;
  gunkan: number; temaki: number; fritti: number; dolci: number;
  maki: number; crudo: number;
  salmone: number; tonno: number; gambero: number; branzino: number;
  anguilla: number; veg: number; tempura: number; spicy: number;
  gourmet: number; economici: number; puntiTotali: number;
  distinctDishes: number; distinctCategories: number;
  pezziTotali: number; distinctOrders: number; completedOrders: number; fuoriMenu: number;
}

const CATEGORY_FIELD: Record<string, keyof PlayerStats> = {
  Nigiri: "nigiri", Uramaki: "uramaki", Hosomaki: "hosomaki", Sashimi: "sashimi",
  Gunkan: "gunkan", Temaki: "temaki", Fritti: "fritti", Dolci: "dolci",
};

export function computePlayerStats(eaten: EatenDish[]): PlayerStats {
  const s: PlayerStats = {
    nigiri: 0, uramaki: 0, hosomaki: 0, sashimi: 0, gunkan: 0, temaki: 0, fritti: 0, dolci: 0,
    maki: 0, crudo: 0, salmone: 0, tonno: 0, gambero: 0, branzino: 0, anguilla: 0, veg: 0,
    tempura: 0, spicy: 0, gourmet: 0, economici: 0, puntiTotali: 0, distinctDishes: 0,
    distinctCategories: 0, pezziTotali: 0, distinctOrders: 0, completedOrders: 0, fuoriMenu: 0,
  };
  const categories = new Set<string>();
  for (const d of eaten) {
    if (d.quantita_ordinata > 0) s.distinctOrders += 1;
    if (d.stato === "consegnato") s.completedOrders += 1;
    const m = d.quantita_mangiata;
    if (m <= 0) continue;
    s.pezziTotali += m;
    s.puntiTotali += m * d.punti;
    if (d.punti >= 3) s.gourmet += m;
    if (d.punti === 1) s.economici += m;
    s.distinctDishes += 1;
    categories.add(d.categoria);
    const cf = CATEGORY_FIELD[d.categoria];
    if (cf) (s[cf] as number) += m;
    if (d.categoria === "Fuori Menu") s.fuoriMenu += m;
    const n = d.nome.toLowerCase();
    if (/salmone/.test(n)) s.salmone += m;
    if (/tonno/.test(n)) s.tonno += m;
    if (/gamber/.test(n)) s.gambero += m;
    if (/branzino/.test(n)) s.branzino += m;
    if (/anguilla/.test(n)) s.anguilla += m;
    if (/avocado|verdur|edamame|cetriolo/.test(n)) s.veg += m;
    if (/tempura/.test(n)) s.tempura += m;
    if (/spicy/.test(n)) s.spicy += m;
  }
  s.maki = s.uramaki + s.hosomaki;
  s.crudo = s.nigiri + s.sashimi;
  s.distinctCategories = categories.size;
  return s;
}

export interface MissionDef {
  id: string;
  emoji: string;
  titolo: string;
  descrizione: string;
  stat: keyof PlayerStats;
  tiers: number[];
}

export const MISSIONS: MissionDef[] = [
  { id: "nigiri", emoji: "🍣", titolo: "Divoratore di Nigiri", descrizione: "Mangia nigiri", stat: "nigiri", tiers: [1, 3, 6, 10, 15] },
  { id: "uramaki", emoji: "🌊", titolo: "Maestro Uramaki", descrizione: "Mangia uramaki", stat: "uramaki", tiers: [1, 3, 6, 10, 15] },
  { id: "hosomaki", emoji: "🎋", titolo: "Minimalista Hosomaki", descrizione: "Mangia hosomaki", stat: "hosomaki", tiers: [1, 2, 4, 6, 9] },
  { id: "sashimi", emoji: "🐟", titolo: "Signore del Sashimi", descrizione: "Mangia sashimi", stat: "sashimi", tiers: [1, 2, 4, 6, 9] },
  { id: "gunkan", emoji: "🛶", titolo: "Capitano Gunkan", descrizione: "Mangia gunkan", stat: "gunkan", tiers: [1, 2, 3, 5, 7] },
  { id: "temaki", emoji: "🌯", titolo: "Artista del Temaki", descrizione: "Mangia temaki", stat: "temaki", tiers: [1, 2, 3, 4, 6] },
  { id: "fritti", emoji: "🔥", titolo: "Amante del Fritto", descrizione: "Mangia piatti fritti", stat: "fritti", tiers: [1, 2, 3, 5, 7] },
  { id: "dolci", emoji: "🍡", titolo: "Goloso", descrizione: "Mangia dolci", stat: "dolci", tiers: [1, 2, 3, 4, 5] },
  { id: "maki", emoji: "🌀", titolo: "Re dei Maki", descrizione: "Mangia uramaki e hosomaki", stat: "maki", tiers: [2, 5, 9, 14, 20] },
  { id: "crudo", emoji: "🍥", titolo: "Purista del Crudo", descrizione: "Mangia nigiri e sashimi", stat: "crudo", tiers: [2, 5, 9, 14, 20] },
  { id: "salmone", emoji: "🧡", titolo: "Salmon Addict", descrizione: "Mangia piatti al salmone", stat: "salmone", tiers: [1, 3, 5, 8, 12] },
  { id: "tonno", emoji: "🔴", titolo: "Cacciatore di Tonno", descrizione: "Mangia piatti al tonno", stat: "tonno", tiers: [1, 3, 5, 8, 12] },
  { id: "gambero", emoji: "🦐", titolo: "Amico dei Gamberi", descrizione: "Mangia piatti al gambero", stat: "gambero", tiers: [1, 2, 3, 5, 7] },
  { id: "branzino", emoji: "🐠", titolo: "Intenditore di Branzino", descrizione: "Mangia piatti al branzino", stat: "branzino", tiers: [1, 2, 3, 4, 5] },
  { id: "anguilla", emoji: "🥢", titolo: "Coraggioso", descrizione: "Mangia anguilla", stat: "anguilla", tiers: [1, 2, 3, 4, 5] },
  { id: "veg", emoji: "🥗", titolo: "Salutista", descrizione: "Mangia piatti vegetali", stat: "veg", tiers: [1, 2, 3, 5, 7] },
  { id: "tempura", emoji: "🍤", titolo: "Maestro Tempura", descrizione: "Mangia tempura", stat: "tempura", tiers: [1, 2, 3, 4, 6] },
  { id: "spicy", emoji: "🌶️", titolo: "Palato di Fuoco", descrizione: "Mangia piatti spicy", stat: "spicy", tiers: [1, 2, 3, 4, 5] },
  { id: "punti", emoji: "🏆", titolo: "Collezionista di Punti", descrizione: "Accumula punti", stat: "puntiTotali", tiers: [5, 15, 30, 50, 75] },
  { id: "buongustaio", emoji: "💎", titolo: "Buongustaio", descrizione: "Mangia piatti da 3+ punti", stat: "gourmet", tiers: [1, 2, 4, 6, 9] },
  { id: "economico", emoji: "🪙", titolo: "Risparmiatore", descrizione: "Mangia piatti da 1 punto", stat: "economici", tiers: [2, 5, 9, 14, 20] },
  { id: "esploratore", emoji: "🧭", titolo: "Esploratore", descrizione: "Prova piatti diversi", stat: "distinctDishes", tiers: [2, 4, 7, 10, 14] },
  { id: "varieta", emoji: "🎨", titolo: "Palato Versatile", descrizione: "Prova categorie diverse", stat: "distinctCategories", tiers: [2, 3, 4, 6, 8] },
  { id: "abbuffata", emoji: "♾️", titolo: "Senza Fondo", descrizione: "Mangia più pezzi possibile", stat: "pezziTotali", tiers: [5, 10, 20, 35, 50] },
  { id: "ordinatore", emoji: "📋", titolo: "Ordinatore Seriale", descrizione: "Ordina piatti diversi", stat: "distinctOrders", tiers: [3, 6, 10, 15, 20] },
  { id: "nessuno_spreco", emoji: "✅", titolo: "Nessuno Spreco", descrizione: "Completa i tuoi ordini", stat: "completedOrders", tiers: [2, 4, 7, 11, 15] },
  { id: "fuori_menu", emoji: "🆕", titolo: "Fuori dagli Schemi", descrizione: "Mangia piatti fuori menu", stat: "fuoriMenu", tiers: [1, 2, 3, 4, 5] },
];

export function missionLevel(value: number, tiers: number[]): number {
  let level = 0;
  for (const t of tiers) {
    if (value >= t) level += 1;
    else break;
  }
  return level;
}

export interface MissionProgress {
  def: MissionDef;
  value: number;
  level: number;
  next: number | null;
}

export function computeMissions(stats: PlayerStats): MissionProgress[] {
  return MISSIONS.map((def) => {
    const value = stats[def.stat];
    const level = missionLevel(value, def.tiers);
    const next = level < def.tiers.length ? def.tiers[level] : null;
    return { def, value, level, next };
  });
}

export interface Grade {
  id: string;
  emoji: string;
  nome: string;
  min: number;
}

export const GRADES: Grade[] = [
  { id: "riso", emoji: "🍚", nome: "Chicco di Riso", min: 0 },
  { id: "apprendista", emoji: "🥢", nome: "Apprendista", min: 5 },
  { id: "bronzo", emoji: "🥉", nome: "Sushi di Bronzo", min: 12 },
  { id: "argento", emoji: "🥈", nome: "Sushi d'Argento", min: 22 },
  { id: "oro", emoji: "🥇", nome: "Sushi d'Oro", min: 35 },
  { id: "platino", emoji: "💎", nome: "Sushi di Platino", min: 50 },
  { id: "maestro", emoji: "🔥", nome: "Maestro del Sushi", min: 70 },
  { id: "granmaestro", emoji: "🐉", nome: "Gran Maestro del Sushi", min: 95 },
  { id: "leggenda", emoji: "👑", nome: "Leggenda del Sushi", min: 120 },
];

export function gradeScore(missions: Pick<MissionProgress, "level">[]): number {
  return missions.reduce((sum, m) => sum + m.level, 0);
}

export function gradeForScore(score: number): Grade {
  let current = GRADES[0];
  for (const g of GRADES) if (score >= g.min) current = g;
  return current;
}

export function gradeProgress(score: number): { current: Grade; next: Grade | null; ratio: number } {
  const current = gradeForScore(score);
  const idx = GRADES.findIndex((g) => g.id === current.id);
  const next = idx < GRADES.length - 1 ? GRADES[idx + 1] : null;
  if (!next) return { current, next: null, ratio: 1 };
  const span = next.min - current.min;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (score - current.min) / span)) : 0;
  return { current, next, ratio };
}

export function computeGrade(eaten: EatenDish[]): {
  stats: PlayerStats;
  missions: MissionProgress[];
  score: number;
  grade: Grade;
} {
  const stats = computePlayerStats(eaten);
  const missions = computeMissions(stats);
  const score = gradeScore(missions);
  const grade = gradeForScore(score);
  return { stats, missions, score, grade };
}
