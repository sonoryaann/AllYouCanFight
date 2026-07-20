"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOAuth } from "@/lib/auth/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const ran = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        await completeOAuth();
        router.replace("/");
      } catch (err) {
        console.error("Errore durante il login con Google:", err);
        setError(true);
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-rice px-4 py-10 text-center">
        <p className="font-display text-lg font-semibold text-nori">Accesso non riuscito. Riprova.</p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="tap-active flex min-h-11 items-center justify-center rounded-xl bg-nori px-4 font-display font-semibold text-white"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-rice px-4 py-10 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-soy-soft border-t-salmon" />
      <p className="font-display text-lg font-semibold text-nori">Accesso in corso…</p>
      <p className="text-sm text-nori-soft">Ti reindirizziamo alla home.</p>
    </div>
  );
}
