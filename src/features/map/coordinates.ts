export type Coordinates = Readonly<{
  latitude: number;
  longitude: number;
}>;

// MapLibre and GeoJSON expect [longitude, latitude]. Event data keeps named
// fields, and this is the only place that changes their order for the map.
export function toMapLngLat({ latitude, longitude }: Coordinates): [number, number] {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("Invalid latitude");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("Invalid longitude");
  }
  return [longitude, latitude];
}
