import { flowLevels } from "./flow-levels";

export function CrowdCard() {
  return (
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
  );
}
