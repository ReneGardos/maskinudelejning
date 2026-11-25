// Fælles typer og hjælpere til server actions. Ligger uden for "use server"-filerne, fordi de kun må eksportere async-funktioner.

// Fejlbeskeder i server actions bliver skjult i produktion, når de kastes.
// Derfor returnerer vi et resultat, som klienten kan vise direkte.
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; unauthorized?: boolean }

/** Postgres-fejlkode (fx 23505 = unik værdi findes, 23P01 = overlap), uanset om den ligger i error eller error.cause. */
export function errorCode(error: unknown): string | undefined {
  const err = error as { code?: string; cause?: { code?: string } } | null
  return err?.code ?? err?.cause?.code
}
