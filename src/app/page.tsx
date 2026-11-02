const flowLevels = [
  { label: "Bajo", color: "green" },
  { label: "Medio", color: "yellow" },
  { label: "Full", color: "red" },
] as const;

export default function HomePage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Capry, ir al inicio">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>capry<span className="brand-dot">.</span></span>
        </a>
        <span className="location-label"><span aria-hidden="true">●</span> Quito, Ecuador</span>
      </header>

      <main id="inicio">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">La ciudad se mueve</p>
            <h1 id="hero-title">Encuentra dónde está pasando <em>todo.</em></h1>
            <p className="hero-description">
              Un mapa colaborativo para descubrir fiestas en Quito. Conoce cuántas personas
              planean ir y cómo está el ambiente según quienes están allí.
            </p>
            <a className="primary-link" href="#mapa">Conocer el mapa <span aria-hidden="true">↗</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-pin pin-one" />
            <div className="hero-pin pin-two" />
            <div className="hero-pin pin-three" />
            <div className="hero-art-label">QUITO <span>00°13′ S</span></div>
          </div>
        </section>

        <section className="map-section" id="mapa" aria-labelledby="map-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Explora la ciudad</p>
              <h2 id="map-title">El mapa de las fiestas</h2>
            </div>
            <span className="phase-badge">Primera etapa</span>
          </div>
          <div className="map-preview" role="img" aria-label="Vista preliminar del espacio donde aparecerá el mapa de fiestas de Quito">
            <div className="map-grid" aria-hidden="true" />
            <div className="map-center">
              <span className="map-icon" aria-hidden="true">⌖</span>
              <h3>Pronto podrás explorar Quito aquí</h3>
              <p>Estamos preparando el mapa y las primeras funciones de Capry.</p>
            </div>
            <span className="map-coordinate">-0.1807, -78.4678</span>
          </div>
        </section>

        <section className="signals" aria-labelledby="signals-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Dos señales, una mejor idea</p>
              <h2 id="signals-title">Decide con información de la comunidad</h2>
            </div>
          </div>
          <div className="signal-grid">
            <article className="signal-card">
              <span className="signal-number">01 / ANTES</span>
              <div className="signal-symbol people-symbol" aria-hidden="true">↗</div>
              <h3>Personas que planean ir</h3>
              <p>Consulta cuántas personas han indicado que quieren asistir a una fiesta futura.</p>
            </article>
            <article className="signal-card">
              <span className="signal-number">02 / AHORA</span>
              <div className="flow-preview" aria-label="Niveles de aforo: bajo, medio y full">
                {flowLevels.map((level) => (
                  <span className={`flow-level ${level.color}`} key={level.label}>{level.label}</span>
                ))}
              </div>
              <h3>Aforo reportado</h3>
              <p>Ve el nivel que reportan quienes están en el lugar y la hora de la última actualización.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>capry<span className="brand-dot">.</span></span>
        <p>Hecho para descubrir lo que sucede en Quito.</p>
      </footer>
    </div>
  );
}
