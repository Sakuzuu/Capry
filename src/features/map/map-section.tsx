"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { SectionHeading } from "@/components/section-heading";
import { toMapLngLat } from "./coordinates";
import { applyCapryMapTheme } from "./map-theme";
import { crowdLabel, crowdLevel, eventName, eventSchedule, plannedLevel, quitoCenter, type LiveEvent } from "./live-event";

const mapStyle = "https://tiles.openfreemap.org/styles/dark";
const quitoTime = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" });

function EventSummary({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
  const crowd = crowdLevel(event);
  const reservation = plannedLevel(event.planned_count);
  return (
    <article className="map-event-summary" aria-label={`Ficha de ${eventName(event)}`}>
      <div className="map-event-summary-top">
        <span className="map-event-kicker">{event.status === "planned" ? "Fiesta futura" : "Fiesta en curso"}</span>
        <button type="button" className="map-summary-close" onClick={onClose} aria-label="Cerrar ficha">×</button>
      </div>
      <h3>{eventName(event)}</h3>
      <p className="map-event-time">{eventSchedule(event)}</p>
      <div className="map-event-signals">
        <span className={`map-planned-level level-${reservation}`}>Reserva {crowdLabel(reservation)} · <strong>{event.planned_count}</strong> planean ir</span>
        <span className={`map-crowd-level level-${crowd ?? "none"}`}>Aforo {crowdLabel(crowd)}</span>
      </div>
      {event.last_report_at && <p className="map-event-report">Último reporte: {quitoTime.format(new Date(event.last_report_at))} (hora de Quito)</p>}
    </article>
  );
}

export function MapSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerClassRef = useRef<typeof import("maplibre-gl").Marker | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
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
      map.scrollZoom.disable();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.once("load", () => { applyCapryMapTheme(map); void loadEvents(map); });
      map.on("moveend", () => { clearTimeout(timer); timer = setTimeout(() => void loadEvents(map), 250); });
      map.on("error", () => { if (!map.loaded()) setMapError(true); });
    }
    void mountMap().catch(() => { if (!disposed) setMapError(true); });
    return () => {
      disposed = true;
      clearTimeout(timer);
      requestRef.current?.abort();
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClassRef.current;
    if (!map || !MarkerClass) return;
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
    for (const event of events) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `party-map-pin level-${crowdLevel(event) ?? "none"}${event.id === selectedIdRef.current ? " is-selected" : ""}`;
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

  return (
    <section className="map-section" id="mapa" aria-labelledby="map-title">
      <SectionHeading eyebrow="Explora la ciudad" id="map-title" title="El mapa de las fiestas" accessory={<span className="phase-badge">Eventos de la comunidad</span>} />
      <p className="map-intro">Descubre fiestas visibles en Quito según la zona del mapa. Las publicaciones cercanas con el mismo horario aparecen juntas.</p>
      <div className="map-experience">
        <div className="map-panel">
          <div ref={containerRef} className="map-canvas" role="application" aria-label="Mapa de fiestas en Quito" />
          {mapError && <p className="map-error">El mapa no pudo cargarse. Puedes explorar los eventos desde la lista.</p>}
          {eventsError && <p className="map-error">No se pudieron cargar los eventos. Mueve el mapa para reintentar.</p>}
          {selectedEvent ? <EventSummary event={selectedEvent} onClose={() => setSelectedId(null)} /> :
            <p className="map-hint">{loading ? "Buscando fiestas…" : events.length ? "Selecciona una fiesta del mapa o la lista" : "Aún no hay fiestas visibles en esta zona"}</p>}
        </div>
        <aside className="map-list" aria-label="Lista de fiestas visibles">
          <div className="map-list-heading"><div><span>EN ESTA ZONA</span><h3>Explora las fiestas</h3></div><span className="map-list-count">{events.length} {events.length === 1 ? "fiesta" : "fiestas"}</span></div>
          <div className="map-list-items">
            {!loading && !events.length && <p className="map-list-empty">No hay fiestas visibles aquí. Mueve el mapa para explorar otra zona.</p>}
            {events.map((event) => (
              <button className={`map-list-item${event.id === selectedId ? " is-selected" : ""}`} type="button" key={event.id} onClick={() => selectEvent(event)} aria-pressed={event.id === selectedId}>
                <span className={`map-list-dot level-${crowdLevel(event) ?? "none"}`} aria-hidden="true" />
                <span className="map-list-item-copy"><strong>{eventName(event)}</strong><span>{eventSchedule(event)}</span></span>
                <span className="map-list-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className="map-list-note">Los niveles de aforo se basan en reportes de las últimas dos horas.</p>
        </aside>
      </div>
    </section>
  );
}
