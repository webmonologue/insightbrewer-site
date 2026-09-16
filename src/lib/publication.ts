/** Build-time publication gate shared by listings and static article routes. */
export function isPublished(post: { data: { pubDate: Date; draft?: boolean } }, now = new Date()): boolean {
  return post.data.draft !== true && Number.isFinite(post.data.pubDate.valueOf()) && post.data.pubDate.valueOf() <= now.valueOf();
}

/** Newest publication first; stable route IDs break ties without locale dependence. */
export function comparePublicationDate(
  a: { id: string; data: { pubDate: Date } },
  b: { id: string; data: { pubDate: Date } },
): number {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
