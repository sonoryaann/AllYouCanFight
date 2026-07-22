import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/db/profiles";
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

export async function ensureProfile(): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return;
  const existing = await getProfile(user.id);
  if (existing) return; // don't clobber existing display_name/avatar
  await upsertProfile({
    id: user.id,
    display_name: displayNameFromUser(user.user_metadata),
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  });
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
