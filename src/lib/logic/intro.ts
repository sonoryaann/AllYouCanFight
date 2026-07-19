export function shouldPlayIntro(seen: string | null, prefersReducedMotion: boolean): boolean {
  return seen !== "1" && !prefersReducedMotion;
}
