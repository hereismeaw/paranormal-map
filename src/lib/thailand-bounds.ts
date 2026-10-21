export const THAILAND_BOUNDS = {
  west: 97.3,
  south: 5.5,
  east: 105.7,
  north: 20.6,
};
export const thailandMaxBounds: [[number, number], [number, number]] = [
  [THAILAND_BOUNDS.west, THAILAND_BOUNDS.south],
  [THAILAND_BOUNDS.east, THAILAND_BOUNDS.north],
];
export function inThailandView(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= THAILAND_BOUNDS.south &&
    lat <= THAILAND_BOUNDS.north &&
    lng >= THAILAND_BOUNDS.west &&
    lng <= THAILAND_BOUNDS.east
  );
}
