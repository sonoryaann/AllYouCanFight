"use client";

export type TabId = "classifica" | "menu" | "ordini";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "classifica", label: "Classifica", icon: "🏆" },
  { id: "menu", label: "Menu", icon: "🍱" },
  { id: "ordini", label: "I Miei Ordini", icon: "🍣" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-soy-soft/40 bg-rice/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex w-full max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`tap-active flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-salmon" : "text-nori-soft"
              }`}
            >
              <span className={`text-2xl transition-transform ${isActive ? "scale-110" : ""}`}>
                {tab.icon}
              </span>
              <span className={isActive ? "font-display font-semibold" : ""}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
