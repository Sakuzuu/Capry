"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { SectionHeading } from "@/components/section-heading";
import { toMapLngLat } from "./coordinates";
import { applyCapryMapTheme } from "./map-theme";
import { eventName, eventSchedule, markerLevel, quitoCenter, type LiveEvent } from "./live-event";
import { EventCard } from "./event-card";
import { PublishForm } from "./publish-form";
import type { Coordinates } from "./coordinates";

const mapStyle = "https://tiles.openfreemap.org/styles/dark";
export function MapSection({ canPublish }: { canPublish: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerClassRef = useRef<typeof import("maplibre-gl").Marker | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const reloadEventsRef = useRef<(() => void) | null>(null);
  const publishingRef = useRef(false);
  const pickMarkerRef = useRef<Marker | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<Coordinates | null>(null);
  const selectedEvent = events.find((event) => event.id === selectedId);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const markers = markersRef.current;
    async function loadEvents(map: MapLibreMap) {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const bounds = map.getBounds();
      const params = new URLSearchParams({
        west: String(bounds.getWest()), south: String(bounds.getSouth()),
        east: String(bounds.getEast()), north: String(bounds.getNorth()),
      });
      setLoading(true);
      try {
        const response = await fetch(`/api/events?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Events unavailable");
        const data: LiveEvent[] = await response.json();
        if (!disposed && !controller.signal.aborted) {
          setEvents(data);
          setEventsError(false);
        }
      } catch {
        if (!disposed && !controller.signal.aborted) setEventsError(true);
      } finally {
        if (!disposed && !controller.signal.aborted) setLoading(false);
      }
    }
    async function mountMap() {
      const maplibre = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      markerClassRef.current = maplibre.Marker;
      const map = new maplibre.Map({
        container: containerRef.current, style: mapStyle,
        center: toMapLngLat(quitoCenter), zoom: 12,
      });
      mapRef.current = map;
      reloadEventsRef.current = () => { void loadEvents(map); };
      map.scrollZoom.disable();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.once("load", () => { applyCapryMapTheme(map); void loadEvents(map); });
      map.on("moveend", () => { clearTimeout(timer); timer = setTimeout(() => void loadEvents(map), 250); });
      map.on("click", (event) => {
        if (publishingRef.current) setPickedPoint({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
      });
      map.on("error", () => { if (!map.loaded()) setMapError(true); });
    }
    void mountMap().catch(() => { if (!disposed) setMapError(true); });
    return () => {
      disposed = true;
      clearTimeout(timer);
      requestRef.current?.abort();
      reloadEventsRef.current = null;
      markers.clear();
      pickMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    publishingRef.current = publishing;
  }, [publishing]);

  useEffect(() => {
    pickMarkerRef.current?.remove();
    pickMarkerRef.current = null;
    if (publishing && pickedPoint && mapRef.current && markerClassRef.current) {
      pickMarkerRef.current = new markerClassRef.current({ color: "#c5a8ff" })
        .setLngLat(toMapLngLat(pickedPoint)).addTo(mapRef.current);
    }
  }, [publishing, pickedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    if (!map || !MarkerClass) return;
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
    for (const event of events) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `party-map-pin level-${markerLevel(event)}${event.id === selectedIdRef.current ? " is-selected" : ""}`;
      element.setAttribute("aria-label", `Ver ${eventName(event)}`);
      const face = document.createElement("span");
      face.className = "party-map-pin-face";
      face.setAttribute("aria-hidden", "true");
      face.textContent = "♪";
      element.appendChild(face);
      element.addEventListener("click", () => setSelectedId(event.id));
      const marker = new MarkerClass({ element, anchor: "center" })
        .setLngLat(toMapLngLat(event)).addTo(map);
      markersRef.current.set(event.id, marker);
    }
  }, [events]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    for (const [id, marker] of markersRef.current) {
      marker.getElement()?.classList.toggle("is-selected", id === selectedId);
    }
  }, [selectedId, events]);

  function selectEvent(event: LiveEvent) {
    setSelectedId(event.id);
    mapRef.current?.flyTo({ center: toMapLngLat(event), zoom: Math.max(mapRef.current.getZoom(), 13), duration: 600, essential: true });
  }

  function finishPublishing(id: string, point: Coordinates) {
    setPublishing(false);
    setPickedPoint(null);
    setSelectedId(id);
    mapRef.current?.jumpTo({ center: toMapLngLat(point), zoom: Math.max(mapRef.current.getZoom(), 13) });
    reloadEventsRef.current?.();
  }

  return (
    <section className="map-section" id="mapa" aria-labelledby="map-title">
      <SectionHeading eyebrow="Explora la ciudad" id="map-title" title="El mapa de las fiestas" accessory={canPublish ? <button className="publish-open" type="button" onClick={() => setPublishing((value) => !value)}>{publishing ? "Cerrar publicación" : "Publicar una fiesta"}</button> : <a className="publish-open" href="/acceder">Inicia sesión para publicar</a>} />
      <p className="map-intro">Descubre fiestas visibles en Quito según la zona del mapa. Si encuentras una fiesta cercana, podrás confirmar si es la misma o publicar una distinta.</p>
      <div className="map-experience">
        <div className="map-panel">
          <div ref={containerRef} className={`map-canvas${publishing ? " is-picking" : ""}`} role="application" aria-label="Mapa de fiestas en Quito" />
          {mapError && <p className="map-error">El mapa no pudo cargarse. Puedes explorar los eventos desde la lista.</p>}
          {eventsError && <p className="map-error">No se pudieron cargar los eventos. Mueve el mapa para reintentar.</p>}
          {selectedEvent ? <EventCard key={selectedEvent.id} initialEvent={selectedEvent} canInteract={canPublish} onClose={() => setSelectedId(null)} onUpdate={() => reloadEventsRef.current?.()} /> :
            <p className="map-hint">{publishing ? pickedPoint ? "Lugar elegido. Completa el formulario." : "Toca el mapa para elegir el lugar." : loading ? "Buscando fiestas…" : events.length ? "Selecciona una fiesta del mapa o la lista" : "Aún no hay fiestas visibles en esta zona"}</p>}
        </div>
        <aside className="map-list" aria-label="Lista de fiestas visibles">
          <div className="map-list-heading"><div><span>EN ESTA ZONA</span><h3>Explora las fiestas</h3></div><span className="map-list-count">{events.length} {events.length === 1 ? "fiesta" : "fiestas"}</span></div>
          <div className="map-list-items">
            {!loading && !events.length && <p className="map-list-empty">No hay fiestas visibles aquí. Mueve el mapa para explorar otra zona.</p>}
            {events.map((event) => (
              <button className={`map-list-item${event.id === selectedId ? " is-selected" : ""}`} type="button" key={event.id} onClick={() => selectEvent(event)} aria-pressed={event.id === selectedId}>
                <span className={`map-list-dot level-${markerLevel(event)}`} aria-hidden="true" />
                <span className="map-list-item-copy"><strong>{eventName(event)}</strong><span>{eventSchedule(event)}</span></span>
                <span className="map-list-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          {publishing && <PublishForm point={pickedPoint} onDone={finishPublishing} onClose={() => { setPublishing(false); setPickedPoint(null); }} />}
          <p className="map-list-note">Los niveles de aforo se basan en reportes de las últimas dos horas.</p>
        </aside>
      </div>
    </section>
  );
}
