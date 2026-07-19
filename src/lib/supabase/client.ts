import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}

export async function ensureAnonSession(): Promise<string> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user) return data.user.id;
  const { data: signIn, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signIn.user!.id;
}
