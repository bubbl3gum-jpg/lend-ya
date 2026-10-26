const R = 6371000,
  rad = Math.PI / 180;
export type Point = { latitude: number; longitude: number };
/** Small north-up metric plot only; acceptance always uses existing Haversine policy. */
export function plotPoint(p: Point, centre: Point) {
  return {
    east:
      (p.longitude - centre.longitude) *
      rad *
      R *
      Math.cos(centre.latitude * rad),
    north: (p.latitude - centre.latitude) * rad * R,
  };
}
export function pointFromMeters(
  east: number,
  north: number,
  centre: Point,
): Point {
  return {
    latitude: Math.max(-90, Math.min(90, centre.latitude + north / R / rad)),
    longitude: Math.max(
      -180,
      Math.min(
        180,
        centre.longitude +
          east /
            (R * Math.max(0.000001, Math.cos(centre.latitude * rad))) /
            rad,
      ),
    ),
  };
}
