// URL builders for the bundled media under public/ (synced from ../assets).

export function spriteUrl(speciesId: string): string {
  return `/sprites/${speciesId}.png`;
}
export function itemIconUrlById(itemId: string): string {
  return `/items/${itemId}.png`;
}
export function typeIconUrl(type: string): string {
  return `/types/${type.trim().toLowerCase()}.gif`;
}
export function categoryIconUrl(category: string): string {
  return `/categories/${category.trim().toLowerCase()}.png`;
}
