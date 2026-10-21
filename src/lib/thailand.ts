import type { FeatureCollection, MultiPolygon } from 'geojson';
import raw from '@/data/thailand.json';
import { inThailandView } from './thailand-bounds';

// Country outline from geoBoundaries THA ADM0 simplified, CC BY 4.0.
// https://www.geoboundaries.org/
const boundary = raw as FeatureCollection<MultiPolygon>;

// Ray casting honours offshore islands and interior holes in the country boundary.
function inRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [px, py] = ring[j];
    if (y > lat !== py > lat && lng < ((px - x) * (lat - y)) / (py - y) + x) inside = !inside;
  }
  return inside;
}
export function isInThailand(lat: number, lng: number) {
  if (!inThailandView(lat, lng)) return false;
  return boundary.features.some((feature) => {
    const geometry = feature.geometry;
    if (!geometry || geometry.type !== 'MultiPolygon') return false;
    return geometry.coordinates.some(
      (polygon) =>
        inRing(lng, lat, polygon[0]) && !polygon.slice(1).some((hole) => inRing(lng, lat, hole)),
    );
  });
}
