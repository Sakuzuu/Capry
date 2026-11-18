import { iconPaths } from "@/components/icon-paths";
import { eventName, markerLevel, type LiveEvent } from "./live-event";

// SVG paths keep the musical note identical across iOS and desktop fonts.
export function createEventMarker(event: LiveEvent, selected: boolean, onSelect: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `party-map-pin level-${markerLevel(event)}${selected ? " is-selected" : ""}`;
  button.setAttribute("aria-label", `Ver ${eventName(event)}`);
  button.setAttribute("aria-pressed", String(selected));
  const face = document.createElement("span");
  face.className = "party-map-pin-face";
  face.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", focusable: "false" })) svg.setAttribute(key, value);
  for (const d of iconPaths.music) {
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  face.appendChild(svg);
  button.appendChild(face);
  button.addEventListener("click", (click) => { click.stopPropagation(); onSelect(); });
  return button;
}
