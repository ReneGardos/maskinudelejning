/** Strukturerede data til Google (schema.org). "<" escapes, så indholdet aldrig kan lukke script-tagget. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
}
