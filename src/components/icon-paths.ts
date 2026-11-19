export const iconPaths = {
  "arrow-up-right": ["M6 18 18 6", "M6 6h12v12"],
  "arrow-right": ["M4 12h16", "m13 5 7 7-7 7"],
  "arrow-left": ["M20 12H4", "m11 5-7 7 7 7"],
  "arrow-down": ["M12 4v16", "m5 13 7 7 7-7"],
  map: ["m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z", "M9 3v15", "M15 6v15"],
  upload: ["M12 16V4", "m6 10 6-6 6 6", "M4 16v4h16v-4"],
  check: ["m5 12 4 4L19 6"],
  close: ["m6 6 12 12", "M18 6 6 18"],
  music: ["M10 18V4l8 3v5l-8-3", "M10 18c0 1.66-1.57 3-3.5 3S3 19.66 3 18s1.57-3 3.5-3 3.5 1.34 3.5 3Z"],
} as const;
export type IconName = keyof typeof iconPaths;
