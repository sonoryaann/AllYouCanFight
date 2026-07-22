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

export async function updateAvatarUrl(id: string, avatar_url: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("profiles").update({ avatar_url }).eq("id", id);
  if (error) throw error;
}

export async function changeAvatar(userId: string, file: File): Promise<string> {
  const sb = getSupabase();
  const path = `${userId}/avatar`; // fixed path, overwritten each change (single file per user)
  const { error } = await sb.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`; // cache-bust so the new image shows immediately
  await updateAvatarUrl(userId, url);
  return url;
}
