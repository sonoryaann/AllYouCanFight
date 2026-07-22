"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { loginWithGoogle, logout } from "@/lib/auth/auth";

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { loading, isLoggedIn, profile } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.refresh();
  };

  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="tap-active fixed right-3 top-3 z-40 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card text-xl text-nori shadow-md ring-1 ring-soy-soft/40"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-nori/40"
          />

          <div className="absolute right-0 top-0 flex h-full w-full max-w-xs flex-col gap-6 bg-rice p-5 shadow-2xl ring-1 ring-soy-soft/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="h-11 w-11 animate-pulse rounded-full bg-soy-soft" />
                ) : profile ? (
                  <>
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- needs referrerPolicy for googleusercontent.com avatars
                      <img
                        src={profile.avatar_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-salmon-soft font-display text-lg font-bold text-salmon-dark">
                        {initial}
                      </div>
                    )}
                    <span className="font-display font-semibold text-nori">
                      {profile.display_name ?? "Giocatore"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-soy-soft font-display text-lg font-bold text-nori-soft">
                      ?
                    </div>
                    <span className="text-sm font-medium text-nori-soft">Ospite</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Chiudi menu"
                className="tap-active flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-nori-soft"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="tap-active flex min-h-11 items-center justify-center rounded-xl bg-salmon px-4 font-display font-semibold text-white shadow-lg shadow-salmon/30"
              >
                🍣 Gioca
              </Link>

              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    loginWithGoogle();
                  }}
                  className="tap-active flex min-h-11 items-center justify-center rounded-xl bg-nori px-4 font-display font-semibold text-white"
                >
                  Accedi con Google
                </button>
              )}

              {isLoggedIn && (
                <Link
                  href="/profilo"
                  onClick={() => setOpen(false)}
                  className="tap-active flex min-h-11 items-center rounded-xl px-4 font-medium text-nori ring-1 ring-soy-soft/40"
                >
                  Profilo
                </Link>
              )}

              <div className="flex min-h-11 items-center justify-between rounded-xl px-4 text-nori-soft ring-1 ring-soy-soft/40">
                <span>Classifiche</span>
                <span className="rounded-full bg-wasabi-soft px-2 py-0.5 text-xs font-semibold text-wasabi-dark">
                  presto
                </span>
              </div>

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="tap-active flex min-h-11 items-center rounded-xl px-4 font-medium text-nori ring-1 ring-soy-soft/40"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/privacy"
                  onClick={() => setOpen(false)}
                  className="tap-active flex min-h-11 items-center rounded-xl px-4 font-medium text-nori-soft ring-1 ring-soy-soft/40"
                >
                  Privacy
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
