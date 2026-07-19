import { describe, it, expect } from "vitest";
import {
  computePlayerStats, computeMissions, missionLevel,
  gradeScore, gradeForScore, gradeProgress, computeGrade,
  MISSIONS, GRADES, type EatenDish,
} from "../../src/lib/logic/missions";

const eat = (nome: string, categoria: string, punti: number, mangiata: number, ordinata = mangiata, stato: EatenDish["stato"] = mangiata >= ordinata ? "consegnato" : "in_attesa"): EatenDish =>
  ({ nome, categoria, punti, quantita_ordinata: ordinata, quantita_mangiata: mangiata, stato });

describe("computePlayerStats", () => {
  it("aggregates categories, combos, ingredients, points and behavior", () => {
    const s = computePlayerStats([
      eat("Nigiri Salmone", "Nigiri", 1, 3),
      eat("Sashimi Tonno", "Sashimi", 3, 2),
      eat("Uramaki Spicy Tonno", "Uramaki", 2, 1),
      eat("Tempura Gamberi", "Fritti", 2, 2),
      eat("Ricciola", "Fuori Menu", 4, 0, 2, "in_attesa"), // ordered, not eaten
    ]);
    expect(s.nigiri).toBe(3);
    expect(s.sashimi).toBe(2);
    expect(s.uramaki).toBe(1);
    expect(s.maki).toBe(1);          // uramaki + hosomaki
    expect(s.crudo).toBe(5);         // nigiri + sashimi
    expect(s.salmone).toBe(3);
    expect(s.tonno).toBe(3);         // sashimi tonno (2) + spicy tonno (1)
    expect(s.spicy).toBe(1);
    expect(s.gambero).toBe(2);       // "Gamberi" matches /gamber/
    expect(s.tempura).toBe(2);
    expect(s.gourmet).toBe(2);       // punti>=3: sashimi tonno (2)
    expect(s.economici).toBe(3);     // punti==1: nigiri salmone (3)
    expect(s.puntiTotali).toBe(3 * 1 + 2 * 3 + 1 * 2 + 2 * 2); // 3+6+2+4 = 15
    expect(s.pezziTotali).toBe(8);
    expect(s.distinctDishes).toBe(4);       // 4 with mangiata>0
    expect(s.distinctCategories).toBe(4);   // Nigiri, Sashimi, Uramaki, Fritti
    expect(s.distinctOrders).toBe(5);       // all 5 have ordinata>0
    expect(s.completedOrders).toBe(4);      // the Fuori Menu one is in_attesa
    expect(s.fuoriMenu).toBe(0);            // it was not eaten
  });
});

describe("missionLevel", () => {
  it("counts thresholds reached; boundary counts; caps at tiers length", () => {
    expect(missionLevel(0, [1, 3, 6])).toBe(0);
    expect(missionLevel(1, [1, 3, 6])).toBe(1);
    expect(missionLevel(3, [1, 3, 6])).toBe(2);
    expect(missionLevel(100, [1, 3, 6])).toBe(3);
  });
});

describe("MISSIONS & computeMissions", () => {
  it("has 27 missions each mapping to a stat with 10 tiers", () => {
    expect(MISSIONS).toHaveLength(27);
    for (const m of MISSIONS) expect(m.tiers).toHaveLength(10);
  });
  it("reports value, level and next threshold", () => {
    const stats = computePlayerStats([eat("Nigiri Salmone", "Nigiri", 1, 6)]);
    const nigiri = computeMissions(stats).find((m) => m.def.id === "nigiri")!;
    expect(nigiri.value).toBe(6);
    expect(nigiri.level).toBe(1);   // tiers 3,8,16,... -> 6 reaches level 1
    expect(nigiri.next).toBe(8);
  });
});

describe("grade", () => {
  it("sums levels into a score", () => {
    expect(gradeScore([{ level: 2 } as never, { level: 3 } as never])).toBe(5);
  });
  it("maps score to the highest band with min<=score (boundaries)", () => {
    expect(gradeForScore(0).nome).toBe("Chicco di Riso");
    expect(gradeForScore(8).nome).toBe("Apprendista");
    expect(gradeForScore(70).nome).toBe("Sushi d'Oro");
    expect(gradeForScore(270).nome).toBe("Sushi King");
    expect(GRADES).toHaveLength(10);
  });
  it("gradeProgress gives 0..1 and null next at the top", () => {
    const p = gradeProgress(8); // Apprendista(8) -> Sushi di Bronzo(20)
    expect(p.current.nome).toBe("Apprendista");
    expect(p.next?.nome).toBe("Sushi di Bronzo");
    expect(p.ratio).toBeCloseTo(0);
    expect(gradeProgress(300).next).toBeNull();  // 300 >= Sushi King (270)
    expect(gradeProgress(300).ratio).toBe(1);
  });
  it("computeGrade ties it together", () => {
    const { score, grade } = computeGrade([eat("Nigiri Salmone", "Nigiri", 1, 6)]);
    expect(score).toBeGreaterThan(0);
    expect(grade.nome).toBeTruthy();
  });
});
