"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { getProfile, type Profile } from "@/lib/db/profiles";

export interface UseAuthResult {
  loading: boolean;
  user: User | null;
  isLoggedIn: boolean;
  isAnonymous: boolean;
  profile: Profile | null;
}

export function useAuth(): UseAuthResult {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabase();

    async function loadProfile(u: User | null) {
      if (u && u.is_anonymous === false) {
        try {
          const p = await getProfile(u.id);
          if (!cancelled) setProfile(p);
        } catch (err) {
          console.error("Errore nel caricamento del profilo:", err);
          if (!cancelled) setProfile(null);
        }
      } else if (!cancelled) {
        setProfile(null);
      }
    }

    (async () => {
      const { data } = await sb.auth.getUser();
      if (cancelled) return;
      setUser(data.user ?? null);
      await loadProfile(data.user ?? null);
      if (!cancelled) setLoading(false);
    })();

    const { data: subscription } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = !!user && user.is_anonymous === false;
  const isAnonymous = !!user && user.is_anonymous === true;

  return { loading, user, isLoggedIn, isAnonymous, profile };
}
