/** Build-time publication gate shared by listings and static article routes. */
export function isPublished(post: { data: { pubDate: Date; draft?: boolean } }, now = new Date()): boolean {
  return post.data.draft !== true && Number.isFinite(post.data.pubDate.valueOf()) && post.data.pubDate.valueOf() <= now.valueOf();
}
