/** Where an entry's image lives in R2: under its owner's id. */
export function imageKeyFor(userId: string, entryId: string): string {
  return `users/${encodeURIComponent(userId)}/${entryId}`;
}
