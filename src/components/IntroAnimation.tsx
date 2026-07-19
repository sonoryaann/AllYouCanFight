"use client";

import { useEffect, useRef, useState } from "react";
import { Chopstick } from "@/components/Logo";

type Phase = "words" | "battle" | "logo" | "fadeout";

const WORDS = ["ALL", "YOU", "CAN", "FIGHT"];

// Timeline (ms) — total ~3.65s, within the ~3-4s target.
const WORDS_MS = 1350;
const BATTLE_MS = 1300;
const LOGO_MS = 600;
const FADE_MS = 400;

export function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("words");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    onDone();
  };

  useEffect(() => {
    timers.current.push(
      setTimeout(() => setPhase("battle"), WORDS_MS),
      setTimeout(() => setPhase("logo"), WORDS_MS + BATTLE_MS),
      setTimeout(() => setPhase("fadeout"), WORDS_MS + BATTLE_MS + LOGO_MS),
      setTimeout(finish, WORDS_MS + BATTLE_MS + LOGO_MS + FADE_MS),
    );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-rice ${
        phase === "fadeout" ? "intro-fadeout opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 40%, var(--color-soy-soft) 0%, var(--color-rice) 70%)",
      }}
      role="dialog"
      aria-label="Intro"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={finish}
        className="tap-active absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card px-4 text-sm font-semibold text-nori shadow-md ring-1 ring-soy-soft/50"
      >
        Salta
      </button>

      {phase === "words" && (
        <div className="intro-shake-words flex flex-col items-center gap-1 text-center">
          {WORDS.map((word, i) => (
            <span
              key={word}
              className={`intro-word intro-word--${i + 1} font-display text-5xl font-extrabold uppercase tracking-tight text-nori sm:text-7xl`}
            >
              {word}
              {i === WORDS.length - 1 ? (
                <span className="text-salmon">!</span>
              ) : null}
            </span>
          ))}
        </div>
      )}

      {(phase === "battle" || phase === "logo") && (
        <div className="relative flex flex-col items-center gap-6">
          <svg
            width={200}
            height={200}
            viewBox="0 0 200 200"
            className="relative"
            role="img"
            aria-label="All You Can Fight"
          >
            <g transform="translate(100,100)">
              <g
                className={
                  phase === "battle"
                    ? "intro-chopstick-left"
                    : "intro-chopstick-settled-left"
                }
              >
                <g transform="scale(2)">
                  <Chopstick />
                </g>
              </g>
              <g
                className={
                  phase === "battle"
                    ? "intro-chopstick-right"
                    : "intro-chopstick-settled-right"
                }
              >
                <g transform="scale(2)">
                  <Chopstick />
                </g>
              </g>
            </g>
          </svg>

          {phase === "battle" && (
            <>
              <span
                className="intro-spark intro-spark--1 pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-salmon blur-sm"
                aria-hidden
              />
              <span
                className="intro-spark intro-spark--2 pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wasabi blur-sm"
                aria-hidden
              />
            </>
          )}

          {phase === "logo" && (
            <span className="intro-logo-reveal font-display text-2xl font-extrabold uppercase tracking-tight text-nori sm:text-3xl">
              All You Can <span className="text-salmon">Fight</span>
            </span>
          )}
        </div>
      )}

      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-nori-soft/50">
        built with love for Alice ❤
      </p>
    </div>
  );
}
