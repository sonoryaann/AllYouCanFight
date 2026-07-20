"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { loginWithGoogle, logout, deleteAccount } from "@/lib/auth/auth";
import { updateDisplayName } from "@/lib/db/profiles";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const PLACEHOLDER_SECTIONS = [
  {
    title: "Statistiche",
    description: "I tuoi numeri: pezzi mangiati, partite giocate e record personali.",
  },
  {
    title: "Storico partite",
    description: "L'elenco di tutte le partite a cui hai preso parte.",
  },
  {
    title: "Piatti più ordinati",
    description: "La classifica dei tuoi piatti preferiti.",
  },
  {
    title: "Badge",
    description: "I riconoscimenti guadagnati nelle tue sfide.",
  },
];

export default function ProfiloPage() {
  const router = useRouter();
  const { loading, isLoggedIn, user, profile: authProfile } = useAuth();

  const [profile, setProfile] = useState(authProfile);
  const [name, setName] = useState("");
  const [nameSeeded, setNameSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Deliberate: syncs local editable copy with the auth-derived profile
    // (which loads asynchronously) so name edits can be reflected optimistically.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(authProfile);
  }, [authProfile]);

  useEffect(() => {
    if (!nameSeeded && profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(profile.display_name ?? "");
      setNameSeeded(true);
    }
  }, [profile, nameSeeded]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Inserisci un nome.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setSaved(false);
    try {
      await updateDisplayName(user.id, trimmed);
      setProfile((p) => (p ? { ...p, display_name: trimmed } : p));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      setNameError("Impossibile salvare il nome. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      router.push("/");
    } catch (err) {
      console.error(err);
      setDeleteError("Impossibile eliminare l'account. Riprova tra poco.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-rice px-4 py-10">
        <p className="text-nori-soft">Caricamento…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 flex-col items-center bg-rice px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <section className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
            <h1 className="font-display text-xl font-semibold text-nori">Profilo</h1>
            <p className="text-nori-soft">
              Accedi con Google per avere un profilo e salvare i tuoi progressi.
            </p>
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="tap-active flex h-14 w-full items-center justify-center rounded-2xl bg-nori font-display text-lg font-semibold text-white shadow-lg shadow-nori/20"
            >
              Accedi con Google
            </button>
          </section>
          <Link
            href="/"
            className="tap-active flex h-12 items-center justify-center rounded-xl px-6 text-center font-medium text-nori-soft ring-1 ring-soy-soft/40"
          >
            ← Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  const initial = (profile?.display_name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-salmon-soft font-display text-3xl font-bold text-salmon-dark">
              {initial}
            </div>
          )}
          <h1 className="font-display text-xl font-semibold text-nori">
            {profile?.display_name ?? "Giocatore"}
          </h1>
          {profile?.creato_il && (
            <p className="text-sm text-nori-soft">
              Membro dal {formatDate(profile.creato_il)}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display text-lg font-semibold text-nori">Il tuo nome</h2>
          <form onSubmit={handleSaveName} className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              disabled={saving}
              className="h-14 rounded-2xl border-2 border-soy-soft bg-rice-dim px-4 text-lg text-nori outline-none focus:border-salmon transition-colors"
            />
            {nameError && (
              <p role="alert" className="text-sm font-medium text-salmon-dark">
                {nameError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="tap-active flex h-12 flex-1 items-center justify-center rounded-xl bg-salmon font-display font-semibold text-white shadow-lg shadow-salmon/30 disabled:opacity-60"
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
              {saved && (
                <span className="text-sm font-medium text-wasabi-dark">Salvato ✓</span>
              )}
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-card/60 p-6 shadow-md shadow-nori/5 ring-1 ring-soy-soft/30">
          <h2 className="font-display text-lg font-semibold text-nori-soft">I tuoi progressi</h2>
          <div className="flex flex-col gap-3">
            {PLACEHOLDER_SECTIONS.map((s) => (
              <div
                key={s.title}
                className="flex flex-col gap-1 rounded-xl bg-rice-dim/60 p-4 opacity-70"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-nori-soft">
                    {s.title}
                  </h3>
                  <span className="rounded-full bg-soy-soft px-2 py-0.5 text-xs font-semibold text-nori-soft">
                    Presto disponibile
                  </span>
                </div>
                <p className="text-sm text-nori-soft/80">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="tap-active flex h-12 items-center justify-center rounded-xl bg-nori font-display font-semibold text-white"
          >
            Logout
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="tap-active flex h-12 items-center justify-center rounded-xl font-medium text-salmon-dark ring-1 ring-salmon-soft"
          >
            Elimina account
          </button>
        </section>

        <Link
          href="/"
          className="tap-active flex h-12 items-center justify-center rounded-xl px-6 text-center font-medium text-nori-soft ring-1 ring-soy-soft/40"
        >
          ← Torna alla home
        </Link>
      </div>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-nori/40 backdrop-blur-sm sm:items-center"
          onClick={() => !deleting && setConfirmingDelete(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conferma eliminazione account"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl"
          >
            <h2 className="font-display mb-2 text-lg font-semibold text-nori">
              Eliminare il tuo account?
            </h2>
            <p className="mb-4 text-nori-soft">
              Questa azione cancella il tuo profilo e tutto lo storico partite in modo
              permanente. Non può essere annullata.
            </p>
            {deleteError && (
              <p role="alert" className="mb-3 text-sm font-medium text-salmon-dark">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="tap-active flex h-12 items-center justify-center rounded-xl bg-salmon-dark font-display font-semibold text-white disabled:opacity-60"
              >
                {deleting ? "Eliminazione…" : "Sì, elimina il mio account"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="tap-active flex h-12 items-center justify-center rounded-xl font-medium text-nori-soft ring-1 ring-soy-soft/40"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
