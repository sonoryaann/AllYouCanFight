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
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get("error");
  const errorDesc = params.get("error_description") ?? "";
  if (errorParam) {
    // If the anonymous->Google LINK failed because that Google identity
    // already exists, restart as a normal sign-in (this redirects away).
    if (/already|exists|linked/i.test(errorParam + " " + errorDesc)) {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return; // browser redirects to Google
    }
    throw new Error(errorDesc || errorParam);
  }
  const code = params.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(window.location.href);
    if (error) throw error;
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
