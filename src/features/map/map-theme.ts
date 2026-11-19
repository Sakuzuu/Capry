import type { Map as MapLibreMap } from "maplibre-gl";

type ColorProperty = "background-color" | "fill-color" | "fill-outline-color" | "line-color";

const layerColors: ReadonlyArray<readonly [string, ColorProperty, string]> = [
  ["background", "background-color", "#20192d"],
  ["water", "fill-color", "#141727"],
  ["waterway", "line-color", "#38304e"],
  ["landcover_ice_shelf", "fill-color", "#282034"],
  ["landcover_glacier", "fill-color", "#2d243e"],
  ["landuse_residential", "fill-color", "#292134"],
  ["landcover_wood", "fill-color", "#33253f"],
  ["landuse_park", "fill-color", "#352b47"],
  ["building", "fill-color", "#30263d"],
  ["building", "fill-outline-color", "#53405f"],
  ["highway_path", "line-color", "#554361"],
  ["highway_minor", "line-color", "#574465"],
  ["highway_major_casing", "line-color", "#171020"],
  ["highway_major_inner", "line-color", "#9276a9"],
  ["highway_major_subtle", "line-color", "#846b9b"],
  ["highway_motorway_casing", "line-color", "#1a1326"],
  ["highway_motorway_inner", "line-color", "#ad91c1"],
  ["highway_motorway_subtle", "line-color", "#9277aa"],
  ["railway", "line-color", "#6a537b"],
  ["railway_minor", "line-color", "#594568"],
  ["railway_transit", "line-color", "#6a537b"],
];

export function applyCapryMapTheme(map: MapLibreMap) {
  for (const [layerId, property, color] of layerColors) {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, color);
  }

  // Use the provider's existing geometry: shadows add depth without changing
  // coordinates, camera angle, attribution or the source of the map's data.
  const layers = map.getStyle().layers;
  const road = layers.find((layer) => layer.id === "highway_major_inner");
  if (road?.type === "line" && !map.getLayer("capry-road-light")) {
    map.addLayer({
      ...road,
      id: "capry-road-light",
      paint: {
        "line-color": "#b18bd7",
        "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 11, 5, 14, 11, 18, 28],
        "line-blur": 3,
        "line-opacity": 0.18,
      },
    }, map.getLayer("highway_major_casing") ? "highway_major_casing" : road.id);
  }
  const building = layers.find((layer) => layer.id === "building");
  if (building?.type === "fill" && !map.getLayer("capry-building-shadow")) {
    map.addLayer({
      ...building,
      id: "capry-building-shadow",
      minzoom: 13,
      paint: { "fill-color": "#0f0b19", "fill-opacity": 0.5, "fill-translate": [1, 2] },
    }, building.id);
  }
  if (map.getLayer("landcover_wood")) {
    // The upstream wood-pattern sprite is not always available; a solid tint
    // keeps wooded areas visible and avoids a missing-pattern dependency.
    map.setPaintProperty("landcover_wood", "fill-pattern", undefined);
    map.setPaintProperty("landcover_wood", "fill-opacity", 0.75);
  }
  if (map.getLayer("landuse_park")) map.setPaintProperty("landuse_park", "fill-outline-color", "#50405f");
  if (map.getLayer("building")) map.setPaintProperty("building", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 12, 0.35, 15, 0.85]);

  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    const isPlace = layer.id.startsWith("place_");
    const isStreet = layer.id.startsWith("highway_name");
    if (!isPlace && !isStreet && layer.id !== "water_name") continue;
    map.setPaintProperty(layer.id, "text-color", "#ffffff");
    map.setPaintProperty(layer.id, "text-halo-color", "#1a1326");
    map.setPaintProperty(layer.id, "text-halo-width", 1.9);
    map.setPaintProperty(layer.id, "text-halo-blur", 0.4);
    if (isStreet) map.setLayoutProperty(layer.id, "text-size", 12);
    if (isPlace && !layer.id.includes("country")) {
      map.setLayoutProperty(layer.id, "text-size", layer.id === "place_city_large" ? 16 : 12);
    }
  }
}
