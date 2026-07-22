"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { JoinForm } from "@/components/JoinForm";
import { IntroAnimation } from "@/components/IntroAnimation";
import { Logo } from "@/components/Logo";
import { shouldPlayIntro } from "@/lib/logic/intro";
import { loginWithGoogle } from "@/lib/auth/auth";

export default function Home() {
  // Start false so SSR and the first client render always match (no
  // hydration flash of the overlay). Decided for real after mount.
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Deliberate: this effect exists solely to sync `showIntro` with
    // browser-only state (matchMedia) after mount, which is unavailable
    // during SSR/first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIntro(shouldPlayIntro(prefersReducedMotion));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authRetry = params.get("auth");
    const authError = params.get("auth_error");

    if (authRetry === "retry") {
      loginWithGoogle().catch((err) => {
        console.error("Errore nel riavvio del login con Google:", err);
      });
    }
    if (authError) {
      console.error("Errore di autenticazione:", authError);
    }
    if (authRetry || authError) {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const finishIntro = () => {
    setShowIntro(false);
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-10 sm:py-16">
      {showIntro && <IntroAnimation onDone={finishIntro} />}
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <Logo size={72} withWordmark />
          <p className="max-w-xs text-base text-nori-soft">
            Conta i pezzi, sfida gli amici e vinci la cena all-you-can-eat.
          </p>
        </header>

        <section className="rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-4 text-xl font-semibold text-nori">
            Crea una nuova partita
          </h2>
          <CreateForm />
        </section>

        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-soy-soft" />
          <span className="text-sm font-medium text-nori-soft">oppure</span>
          <div className="h-px flex-1 bg-soy-soft" />
        </div>

        <section className="rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-4 text-xl font-semibold text-nori">
            Unisciti a una partita
          </h2>
          <JoinForm />
        </section>

        <footer className="pt-2 text-center">
          <Link href="/privacy" className="text-xs text-nori-soft underline hover:text-nori">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </div>
  );
}
