"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { SectionHeading } from "@/components/section-heading";
import { exampleEvents, quitoCenter, type ExampleEvent } from "./sample-events";
import { toMapLngLat } from "./coordinates";
import { applyCapryMapTheme } from "./map-theme";

const mapStyle = "https://tiles.openfreemap.org/styles/dark";

function EventSummary({ event, onClose }: { event: ExampleEvent; onClose: () => void }) {
  return (
    <article className="map-event-summary" aria-label={`Ficha de ${event.name}`}>
      <div className="map-event-summary-top">
        <span className="map-event-kicker">Evento de ejemplo · {event.neighborhood}</span>
        <button type="button" className="map-summary-close" onClick={onClose} aria-label="Cerrar ficha">×</button>
      </div>
      <h3>{event.name}</h3>
      <p className="map-event-time">{event.schedule}</p>
      <div className="map-event-signals">
        <span className={`map-planned-level level-${event.plannedLevel}`}>Reserva {event.plannedLabel} · <strong>{event.plannedCount}</strong> planean ir</span>
        <span className={`map-crowd-level level-${event.crowdLevel}`}>Aforo {event.crowdLabel}</span>
      </div>
      <p className="map-event-report">Último reporte de ejemplo: {event.lastReportTime} (hora de Quito)</p>
    </article>
  );
}

export function MapSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const selectedEvent = exampleEvents.find((event) => event.id === selectedId);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");

      const map = new maplibre.Map({
        container: containerRef.current,
        style: mapStyle,
        center: toMapLngLat(quitoCenter),
        zoom: 12,
      });
      map.scrollZoom.disable();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.once("load", () => applyCapryMapTheme(map));

      const markers = new Map<string, Marker>();
      for (const event of exampleEvents) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `party-map-pin level-${event.crowdLevel}`;
        element.setAttribute("aria-label", `Ver ${event.name}`);
        const face = document.createElement("span");
        face.className = "party-map-pin-face";
        face.setAttribute("aria-hidden", "true");
        face.textContent = "♪";
        element.appendChild(face);
        element.addEventListener("click", () => setSelectedId(event.id));
        const marker = new maplibre.Marker({ element, anchor: "center" })
          .setLngLat(toMapLngLat(event.coordinates))
          .addTo(map);
        markers.set(event.id, marker);
      }

      mapRef.current = map;
      markersRef.current = markers;
      const alreadySelected = exampleEvents.find((event) => event.id === selectedIdRef.current);
      if (alreadySelected) {
        markers.get(alreadySelected.id)?.getElement()?.classList.add("is-selected");
        map.jumpTo({ center: toMapLngLat(alreadySelected.coordinates), zoom: 13 });
      }
    }

    void mountMap().catch(() => {
      if (!cancelled) setMapError(true);
    });
    return () => {
      cancelled = true;
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    for (const [id, marker] of markersRef.current) {
      marker.getElement()?.classList.toggle("is-selected", id === selectedId);
    }
  }, [selectedId]);

  function selectEvent(event: ExampleEvent) {
    setSelectedId(event.id);
    mapRef.current?.flyTo({
      center: toMapLngLat(event.coordinates),
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 600,
      essential: true,
    });
  }

  return (
    <section className="map-section" id="mapa" aria-labelledby="map-title">
      <SectionHeading
        eyebrow="Explora la ciudad"
        id="map-title"
        title="El mapa de las fiestas"
        accessory={<span className="phase-badge">Vista de ejemplo</span>}
      />
      <p className="map-intro">Explora cómo se verán las fiestas en Quito. Estos puntos son demostrativos y todavía no representan eventos reales.</p>
      <div className="map-experience">
        <div className="map-panel">
          <div ref={containerRef} className="map-canvas" role="application" aria-label="Mapa de eventos de ejemplo en Quito" />
          {mapError && <p className="map-error">El mapa no pudo cargarse. Puedes explorar los eventos desde la lista.</p>}
          {selectedEvent ? (
            <EventSummary event={selectedEvent} onClose={() => setSelectedId(null)} />
          ) : (
            <p className="map-hint">Selecciona un marcador o un evento de la lista</p>
          )}
        </div>
        <aside className="map-list" aria-label="Lista de eventos de ejemplo">
          <div className="map-list-heading">
            <div>
              <span>EN QUITO</span>
              <h3>Explora los eventos</h3>
            </div>
            <span className="map-list-count">{exampleEvents.length} ejemplos</span>
          </div>
          <div className="map-list-items">
            {exampleEvents.map((event) => (
              <button
                className={`map-list-item${event.id === selectedId ? " is-selected" : ""}`}
                type="button"
                key={event.id}
                onClick={() => selectEvent(event)}
                aria-pressed={event.id === selectedId}
              >
                <span className={`map-list-dot level-${event.crowdLevel}`} aria-hidden="true" />
                <span className="map-list-item-copy">
                  <strong>{event.name}</strong>
                  <span>{event.neighborhood} · {event.schedule}</span>
                </span>
                <span className="map-list-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className="map-list-note">Puntos y señales de aforo simulados para mostrar el funcionamiento del mapa.</p>
        </aside>
      </div>
    </section>
  );
}
