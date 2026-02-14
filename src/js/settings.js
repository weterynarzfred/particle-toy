import { resizeCanvas } from "./main";

export const MAX_PARTICLE_COUNT = 5000;

export const PARTICLE_PROPS = [
  [0, -0.5, 0.5, 0.1, 0, 0],
  [40, -0.05, 0.5, -1, 0, 0],
  [180, 0, -1, 1, 0, 0],
  [200, 0.191, 0.027, 0.466, 0.945, 0.195],
  [340, 0.639, 0.399, 0.971, 0.365, 0.035]
];

export const settings = {
  damping: 0.02,
  attraction: 2,
  repel: 2,
  centralGravity: 0,
  lightnessOffset: 10,
  smudge: 0.7,
  particleCount: 20,
  particleRadius: 3,
  cellSize: 200,
};

window.settings = settings;
window.resizeCanvas = resizeCanvas;

