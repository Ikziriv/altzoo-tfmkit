const thumbnails = import.meta.glob('../assets/thumbs/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function thumbnailUrl(id: string) {
  return thumbnails[`../assets/thumbs/${id}.png`];
}
