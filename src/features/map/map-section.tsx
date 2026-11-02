import { SectionHeading } from "@/components/section-heading";

export function MapSection() {
  return (
    <section className="map-section" id="mapa" aria-labelledby="map-title">
      <SectionHeading
        eyebrow="Explora la ciudad"
        id="map-title"
        title="El mapa de las fiestas"
        accessory={<span className="phase-badge">Primera etapa</span>}
      />
      <div className="map-preview">
        <div className="map-grid" aria-hidden="true" />
        <div className="map-center">
          <span className="map-icon" aria-hidden="true">⌖</span>
          <h3>Pronto podrás explorar Quito aquí</h3>
          <p>Estamos preparando el mapa y las primeras funciones de Capry.</p>
        </div>
        <span className="map-coordinate">-0.1807, -78.4678</span>
      </div>
    </section>
  );
}
