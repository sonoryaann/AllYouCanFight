const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateAccessCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}
