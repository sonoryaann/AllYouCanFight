import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { upsertProfile } from "@/lib/db/profiles";
import { displayNameFromUser } from "@/lib/logic/displayName";

export async function loginWithGoogle(): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const redirectTo = `${window.location.origin}/auth/callback`;

  if (data.user?.is_anonymous) {
    const { error } = await sb.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    }
    return;
  }

  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

export async function completeOAuth(): Promise<void> {
  const sb = getSupabase();
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    await sb.auth.exchangeCodeForSession(window.location.href);
  }
  await ensureProfile();
}

export async function ensureProfile(): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user && !data.user.is_anonymous) {
    await upsertProfile({
      id: data.user.id,
      display_name: displayNameFromUser(data.user.user_metadata),
      avatar_url: data.user.user_metadata?.avatar_url ?? null,
    });
  }
}

export async function logout(): Promise<void> {
  const sb = getSupabase();
  await sb.auth.signOut();
  await ensureAnonSession();
}

export async function deleteAccount(): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("delete_my_account");
  if (error) throw error;
  await sb.auth.signOut();
}
