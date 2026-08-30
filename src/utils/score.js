/** Единый порог цвета для compliance score по всему приложению. */
export function getScoreTone(score) {
  if (score == null) return { text: "text-zinc-400", ring: "#52525b" };
  if (score >= 80) return { text: "text-emerald-300", ring: "#34d399" };
  if (score >= 50) return { text: "text-amber-300", ring: "#fbbf24" };
  return { text: "text-rose-300", ring: "#fb7185" };
}
