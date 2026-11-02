export function Hero() {
  return (
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
  );
}
