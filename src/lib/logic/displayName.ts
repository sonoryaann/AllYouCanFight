export function displayNameFromUser(
  meta: { full_name?: string; name?: string; email?: string } | null | undefined,
): string {
  if (!meta) return "Giocatore";
  if (meta.full_name) return meta.full_name;
  if (meta.name) return meta.name;
  if (meta.email) return meta.email.split("@")[0];
  return "Giocatore";
}
