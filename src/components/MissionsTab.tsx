"use client";

import { computeGrade, gradeProgress, type EatenDish, type MissionProgress } from "@/lib/logic/missions";

function sortMissions(missions: MissionProgress[]): MissionProgress[] {
  return [...missions].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    const aProx = a.next ? a.value / a.next : 1;
    const bProx = b.next ? b.value / b.next : 1;
    if (bProx !== aProx) return bProx - aProx;
    return a.def.id.localeCompare(b.def.id);
  });
}

export function MissionsTab({ eaten }: { eaten: EatenDish[] }) {
  const { missions, score, grade } = computeGrade(eaten);
  const prog = gradeProgress(score);
  const sorted = sortMissions(missions);

  return (
    <div className="flex flex-col gap-5 pb-24">
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40">
        <div className="flex items-center gap-3">
          <span className="text-5xl">{grade.emoji}</span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-xl font-bold text-nori">{grade.nome}</span>
            <span className="text-sm text-nori-soft">
              Punteggio {score}
              {prog.next && (
                <>
                  {" "}
                  · Prossimo: {prog.next.emoji} {prog.next.nome}
                </>
              )}
            </span>
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-rice-dim">
          <div
            className="h-full rounded-full bg-salmon transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(prog.ratio * 100)}%` }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-soy">Missioni</h3>
        <div className="flex flex-col gap-2">
          {sorted.map((m) => {
            const ratio = m.next ? Math.min(1, m.value / m.next) : 1;
            return (
              <div
                key={m.def.id}
                className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3 shadow-lg shadow-nori/5 ring-1 ring-soy-soft/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-2xl">{m.def.emoji}</span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-base font-semibold text-nori">
                        {m.def.titolo}
                      </span>
                      <span className="truncate text-xs text-nori-soft">{m.def.descrizione}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-wasabi-soft px-2.5 py-1 text-xs font-semibold text-wasabi-dark">
                    Lv {m.level}/5
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-rice-dim">
                  <div
                    className="h-full rounded-full bg-wasabi transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-nori-soft">
                  {m.next === null ? "MAX" : `${m.value}/${m.next}`}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
