export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" aria-hidden="true" /> La noche se mueve en Quito</p>
        <h1 id="hero-title">Encuentra el pulso de <em>la noche.</em></h1>
        <p className="hero-description">
          Descubre fiestas en el mapa, mira cuántas personas planean ir y conoce el ambiente
          con los reportes de quienes están allí.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="#mapa">Explorar el mapa <span aria-hidden="true">↗</span></a>
          <a className="hero-secondary" href="#como-funciona">Así funciona <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-meta" aria-label="Información de Capry">
          <span><span className="hero-meta-dot" aria-hidden="true" /> Hecho para Quito</span>
          <span className="hero-meta-divider" aria-hidden="true" />
          <span>Actualizado por la comunidad</span>
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-visual-photo" />
        <div className="hero-visual-top"><span className="hero-visual-brand">CAPRY / QUITO</span></div>
        <div className="hero-visual-bottom">
          <span className="hero-visual-kicker">LA CIUDAD DESPUÉS DE OSCURECER</span>
          <strong>Tu próxima historia<br />empieza aquí.</strong>
          <span className="hero-visual-rule" />
          <span className="hero-visual-foot">Ubicación <span>·</span> Horario <span>·</span> Aforo</span>
        </div>
        <div className="hero-floating-tag"><span aria-hidden="true">✦</span> Explora lo que sucede</div>
      </div>
    </section>
  );
}
