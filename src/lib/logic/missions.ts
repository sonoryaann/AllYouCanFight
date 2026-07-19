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

// Each mission has 10 tiers (levels). The ladders are geometric: level 1 is
// reachable in a single good dinner, but the upper levels escalate steeply so
// that maxing a mission takes many dinners of cumulative play (the retention
// hook toward accounts). Shared curves by how often a metric grows:
//   F frequent · M medium · R rare · C combo · P points · B pieces · D distinct
//   V categories (grows with future menu expansion) · O completed · FM off-menu
const F = [3, 8, 16, 28, 45, 70, 105, 150, 210, 300];
const M = [2, 6, 12, 22, 36, 55, 80, 115, 160, 220];
const R = [2, 5, 10, 18, 30, 46, 68, 96, 132, 180];
const C = [4, 11, 22, 40, 66, 100, 145, 205, 285, 400];
const P = [10, 30, 65, 120, 200, 320, 480, 700, 1000, 1400];
const B = [8, 22, 45, 80, 130, 200, 290, 410, 570, 800];
const D = [3, 6, 9, 12, 16, 20, 25, 30, 36, 42];
const V = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const O = [3, 8, 15, 25, 40, 60, 85, 115, 150, 200];
const FM = [1, 3, 6, 10, 16, 24, 34, 46, 60, 80];

export const MISSIONS: MissionDef[] = [
  { id: "nigiri", emoji: "🍣", titolo: "Divoratore di Nigiri", descrizione: "Mangia nigiri", stat: "nigiri", tiers: F },
  { id: "uramaki", emoji: "🌊", titolo: "Maestro Uramaki", descrizione: "Mangia uramaki", stat: "uramaki", tiers: F },
  { id: "hosomaki", emoji: "🎋", titolo: "Minimalista Hosomaki", descrizione: "Mangia hosomaki", stat: "hosomaki", tiers: M },
  { id: "sashimi", emoji: "🐟", titolo: "Signore del Sashimi", descrizione: "Mangia sashimi", stat: "sashimi", tiers: M },
  { id: "gunkan", emoji: "🛶", titolo: "Capitano Gunkan", descrizione: "Mangia gunkan", stat: "gunkan", tiers: R },
  { id: "temaki", emoji: "🌯", titolo: "Artista del Temaki", descrizione: "Mangia temaki", stat: "temaki", tiers: R },
  { id: "fritti", emoji: "🔥", titolo: "Amante del Fritto", descrizione: "Mangia piatti fritti", stat: "fritti", tiers: M },
  { id: "dolci", emoji: "🍡", titolo: "Goloso", descrizione: "Mangia dolci", stat: "dolci", tiers: R },
  { id: "maki", emoji: "🌀", titolo: "Re dei Maki", descrizione: "Mangia uramaki e hosomaki", stat: "maki", tiers: C },
  { id: "crudo", emoji: "🍥", titolo: "Purista del Crudo", descrizione: "Mangia nigiri e sashimi", stat: "crudo", tiers: C },
  { id: "salmone", emoji: "🧡", titolo: "Salmon Addict", descrizione: "Mangia piatti al salmone", stat: "salmone", tiers: F },
  { id: "tonno", emoji: "🔴", titolo: "Cacciatore di Tonno", descrizione: "Mangia piatti al tonno", stat: "tonno", tiers: F },
  { id: "gambero", emoji: "🦐", titolo: "Amico dei Gamberi", descrizione: "Mangia piatti al gambero", stat: "gambero", tiers: M },
  { id: "branzino", emoji: "🐠", titolo: "Intenditore di Branzino", descrizione: "Mangia piatti al branzino", stat: "branzino", tiers: R },
  { id: "anguilla", emoji: "🥢", titolo: "Coraggioso", descrizione: "Mangia anguilla", stat: "anguilla", tiers: R },
  { id: "veg", emoji: "🥗", titolo: "Salutista", descrizione: "Mangia piatti vegetali", stat: "veg", tiers: M },
  { id: "tempura", emoji: "🍤", titolo: "Maestro Tempura", descrizione: "Mangia tempura", stat: "tempura", tiers: M },
  { id: "spicy", emoji: "🌶️", titolo: "Palato di Fuoco", descrizione: "Mangia piatti spicy", stat: "spicy", tiers: R },
  { id: "punti", emoji: "🏆", titolo: "Collezionista di Punti", descrizione: "Accumula punti", stat: "puntiTotali", tiers: P },
  { id: "buongustaio", emoji: "💎", titolo: "Buongustaio", descrizione: "Mangia piatti da 3+ punti", stat: "gourmet", tiers: M },
  { id: "economico", emoji: "🪙", titolo: "Risparmiatore", descrizione: "Mangia piatti da 1 punto", stat: "economici", tiers: F },
  { id: "esploratore", emoji: "🧭", titolo: "Esploratore", descrizione: "Prova piatti diversi", stat: "distinctDishes", tiers: D },
  { id: "varieta", emoji: "🎨", titolo: "Palato Versatile", descrizione: "Prova categorie diverse", stat: "distinctCategories", tiers: V },
  { id: "abbuffata", emoji: "♾️", titolo: "Senza Fondo", descrizione: "Mangia più pezzi possibile", stat: "pezziTotali", tiers: B },
  { id: "ordinatore", emoji: "📋", titolo: "Ordinatore Seriale", descrizione: "Ordina piatti diversi", stat: "distinctOrders", tiers: D },
  { id: "nessuno_spreco", emoji: "✅", titolo: "Nessuno Spreco", descrizione: "Completa i tuoi ordini", stat: "completedOrders", tiers: O },
  { id: "fuori_menu", emoji: "🆕", titolo: "Fuori dagli Schemi", descrizione: "Mangia piatti fuori menu", stat: "fuoriMenu", tiers: FM },
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

// Grade = sum of all mission levels (max = 27 missions × 10 levels = 270).
// Bands are calibrated so a first strong dinner reaches Apprendista/Bronzo,
// while the top grades require sustained cumulative play. 👑 Sushi King sits at
// the maximum: it is reached only by maxing out every mission.
export const GRADES: Grade[] = [
  { id: "riso", emoji: "🍚", nome: "Chicco di Riso", min: 0 },
  { id: "apprendista", emoji: "🥢", nome: "Apprendista", min: 8 },
  { id: "bronzo", emoji: "🥉", nome: "Sushi di Bronzo", min: 20 },
  { id: "argento", emoji: "🥈", nome: "Sushi d'Argento", min: 40 },
  { id: "oro", emoji: "🥇", nome: "Sushi d'Oro", min: 70 },
  { id: "platino", emoji: "💎", nome: "Sushi di Platino", min: 105 },
  { id: "maestro", emoji: "🔥", nome: "Maestro del Sushi", min: 145 },
  { id: "granmaestro", emoji: "🐉", nome: "Gran Maestro del Sushi", min: 195 },
  { id: "leggenda", emoji: "🐲", nome: "Leggenda del Sushi", min: 245 },
  { id: "sushi_king", emoji: "👑", nome: "Sushi King", min: 270 },
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
