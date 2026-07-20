"use client";

import type { ReactNode } from "react";

/** A single collapsible category section: header with name + count, toggled open/closed. */
export function CategoryAccordion({
  categoria,
  count,
  open,
  onToggle,
  children,
}: {
  categoria: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap-active flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-soy-soft/30 px-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-soy">
          {categoria} <span className="normal-case text-nori-soft">({count})</span>
        </span>
        <span
          aria-hidden="true"
          className={`text-nori-soft transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="flex flex-col gap-2 px-0.5">{children}</div>}
    </section>
  );
}

/** Shared search input for filtering the dish list by name/category. */
export function DishSearchInput({
  value,
  onChange,
  placeholder = "Cerca un piatto…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Cerca un piatto"
      className="h-11 w-full rounded-xl bg-card px-4 text-base text-nori shadow ring-1 ring-soy-soft/40 outline-none placeholder:text-nori-soft/60 focus:ring-2 focus:ring-salmon"
    />
  );
}
