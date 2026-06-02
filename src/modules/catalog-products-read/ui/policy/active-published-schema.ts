/**
 * Deterministic pick: highest `version` where `state = 'published'`,
 * tie-break `publishedAt` desc, then `id` asc.
 */

export type PublishedSchemaVersionCandidate = {
  id: string;
  categoryId: string;
  version: number;
  state: string;
  publishedAt: string | null;
  locale: string;
};

export type ActivePublishedSchemaVersion = {
  schemaVersionId: string;
  categoryId: string;
  version: number;
  publishedAt: string | null;
  locale: string;
};

export function pickActivePublishedSchemaVersion(
  versions: readonly PublishedSchemaVersionCandidate[],
): ActivePublishedSchemaVersion | null {
  const published = versions.filter((v) => v.state === "published");
  if (published.length === 0) {
    return null;
  }

  const sorted = [...published].sort((a, b) => {
    if (b.version !== a.version) {
      return b.version - a.version;
    }
    const aAt = a.publishedAt ?? "";
    const bAt = b.publishedAt ?? "";
    if (bAt !== aAt) {
      return bAt.localeCompare(aAt);
    }
    return a.id.localeCompare(b.id);
  });

  const top = sorted[0]!;
  return {
    schemaVersionId: top.id,
    categoryId: top.categoryId,
    version: top.version,
    publishedAt: top.publishedAt,
    locale: top.locale,
  };
}
