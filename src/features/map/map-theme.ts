import type { Map as MapLibreMap } from "maplibre-gl";

type ColorProperty = "background-color" | "fill-color" | "fill-outline-color" | "line-color";

const layerColors: ReadonlyArray<readonly [string, ColorProperty, string]> = [
  ["background", "background-color", "#231d2e"],
  ["water", "fill-color", "#191626"],
  ["waterway", "line-color", "#262039"],
  ["landcover_ice_shelf", "fill-color", "#231d2e"],
  ["landcover_glacier", "fill-color", "#282238"],
  ["landuse_residential", "fill-color", "#292333"],
  ["landcover_wood", "fill-color", "#302a3d"],
  ["landuse_park", "fill-color", "#302a3d"],
  ["building", "fill-color", "#221d2d"],
  ["building", "fill-outline-color", "#3a3149"],
  ["highway_path", "line-color", "#50425e"],
  ["highway_minor", "line-color", "#4b3d59"],
  ["highway_major_casing", "line-color", "#32293f"],
  ["highway_major_inner", "line-color", "#655175"],
  ["highway_major_subtle", "line-color", "#6b5680"],
  ["highway_motorway_casing", "line-color", "#352b45"],
  ["highway_motorway_inner", "line-color", "#78618c"],
  ["highway_motorway_subtle", "line-color", "#715b82"],
  ["railway", "line-color", "#655272"],
  ["railway_minor", "line-color", "#655272"],
  ["railway_transit", "line-color", "#655272"],
];

export function applyCapryMapTheme(map: MapLibreMap) {
  for (const [layerId, property, color] of layerColors) {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, color);
  }

  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") continue;
    const isPlace = layer.id.startsWith("place_");
    const isStreet = layer.id.startsWith("highway_name");
    if (!isPlace && !isStreet && layer.id !== "water_name") continue;
    map.setPaintProperty(layer.id, "text-color", "#ffffff");
    map.setPaintProperty(layer.id, "text-halo-color", "#181321");
    map.setPaintProperty(layer.id, "text-halo-width", 1.7);
    map.setPaintProperty(layer.id, "text-halo-blur", 0.2);
    if (isStreet) map.setLayoutProperty(layer.id, "text-size", 12);
    if (isPlace && !layer.id.includes("country")) {
      map.setLayoutProperty(layer.id, "text-size", layer.id === "place_city_large" ? 16 : 12);
    }
  }
}
