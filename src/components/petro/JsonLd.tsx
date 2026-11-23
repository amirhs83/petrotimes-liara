/**
 * JSON-LD renderer — emits the structured-data graph inside the component
 * tree. Google (and every other crawler) reads JSON-LD from anywhere in the
 * DOM, and this is the pattern Next.js itself documents for App Router.
 *
 * `<` is escaped to keep the payload JSON-safe even if a title ever
 * contains an opening tag character.
 */
export function JsonLd({ graph }: { graph: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
