export const coverPresets = [
  { id: "night", label: "Noche violeta", src: "/party-night-out.jpeg" },
  { id: "aurora", label: "Aurora", src: "/covers/aurora.svg" },
  { id: "pulse", label: "Pulso", src: "/covers/pulse.svg" },
] as const;
export type CoverPreset = typeof coverPresets[number]["id"];
export function presetSource(id: string | null | undefined) {
  return coverPresets.find((cover) => cover.id === id)?.src ?? coverPresets[0].src;
}
