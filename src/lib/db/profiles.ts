import { getSupabase } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  creato_il: string;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, avatar_url, creato_il")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(p: {
  id: string;
  display_name: string;
  avatar_url: string | null;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("profiles").upsert(p, { onConflict: "id" });
  if (error) throw error;
}

export async function updateDisplayName(id: string, display_name: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("profiles").update({ display_name }).eq("id", id);
  if (error) throw error;
}
