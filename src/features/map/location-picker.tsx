"use client";

import { useEffect, useRef, useState } from "react";
import { toMapLngLat, type Coordinates } from "./coordinates";
import { quitoCenter } from "./live-event";
import { applyCapryMapTheme } from "./map-theme";

export function LocationPicker({ point, onPick }: { point: Coordinates | null; onPick: (point: Coordinates) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onPick);
  useEffect(() => { callback.current = onPick; }, [onPick]);
  const initialPoint = useRef(point);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    let marker: import("maplibre-gl").Marker | undefined;
    void import("maplibre-gl").then((lib) => {
      if (disposed || !container.current) return;
      lib.setWorkerUrl("/maplibre-gl-worker.mjs");
      map = new lib.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/dark", center: toMapLngLat(initialPoint.current ?? quitoCenter), zoom: 13 });
      mapRef.current = map;
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      map.once("load", () => { if (map) applyCapryMapTheme(map); });
      marker = new lib.Marker({ color: "#c5a8ff" });
      markerRef.current = marker;
      if (initialPoint.current) marker.setLngLat(toMapLngLat(initialPoint.current)).addTo(map);
      map.on("click", ({ lngLat }) => {
        if (!map) return;
        marker?.setLngLat(lngLat).addTo(map);
        callback.current({ latitude: lngLat.lat, longitude: lngLat.lng });
      });
      map.on("error", () => { if (map && !map.loaded() && !disposed) setFailed(true); });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; marker?.remove(); map?.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);
  useEffect(() => {
    initialPoint.current = point;
    if (point && mapRef.current && markerRef.current) markerRef.current.setLngLat(toMapLngLat(point)).addTo(mapRef.current);
    else if (!point) markerRef.current?.remove();
  }, [point]);
  return <div className="location-picker">
    <div ref={container} className="location-picker-map map-canvas" role="application" aria-label="Toca el mapa para ubicar la fiesta" />
    <p className="location-picker-hint">{failed ? "No pudimos cargar el mapa. Puedes indicar las coordenadas abajo." : point ? "Punto elegido. Puedes tocar otro lugar para ajustarlo." : "Acerca el mapa y toca el lugar de la fiesta."}</p>
  </div>;
}
