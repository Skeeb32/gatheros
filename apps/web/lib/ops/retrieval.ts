export function retrieve(
  query: string,
  docs: { id: string; title: string; content: string }[],
) {
  const words = [
    ...new Set(query.toLowerCase().match(/[a-z]{3,}/g) || []),
  ].filter(
    (w) =>
      ![
        "the",
        "where",
        "what",
        "does",
        "should",
        "can",
        "are",
        "for",
        "and",
      ].includes(w),
  );
  return docs
    .map((d) => ({
      ...d,
      score: words.reduce(
        (n, w) => n + (d.content.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
