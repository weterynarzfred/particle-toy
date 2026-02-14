import { settings } from "./settings";
import { purgeSpriteCache, resizeCanvas } from "./main";

const STORAGE_KEY = "particle-sim-settings";

const config = {
  damping: { min: 0, max: 3, step: 0.01, tooltip: "Velocity damping" },
  attraction: { min: 0, max: 10, step: 0.1, tooltip: "Particle attraction force" },
  repel: { min: 0, max: 10, step: 0.1, tooltip: "Particle repulsion force during collisions" },
  centralGravity: { min: -100, max: 100, step: 0.1, tooltip: "Gravity toward center of the image" },
  lightnessOffset: { min: -100, max: 100, step: 1, tooltip: "Particle lightness offset" },
  smudge: { min: 0, max: 1, step: 0.01, tooltip: "Trails behind particles" },
  particleCount: { min: 1, max: 5000, step: 1, tooltip: "Number of simulated particles" },
  particleRadius: { min: 0.5, max: 30, step: 0.5, tooltip: "Particle radius" },
  cellSize: { min: 30, max: 200, step: 1, tooltip: "Spatial grid cell size, larger values consider forces between particles that are further apart at the cost of performance" },
};

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    Object.assign(settings, parsed);
  } catch { }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function createControl(key, parent) {
  const meta = config[key];
  const wrapper = document.createElement("div");
  wrapper.className = "control";

  const label = document.createElement("label");
  label.textContent = key;
  label.title = meta.tooltip;
  label.className = "control-label";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = meta.min;
  slider.max = meta.max;
  slider.step = meta.step;
  slider.value = settings[key];
  slider.title = meta.tooltip;

  const number = document.createElement("input");
  number.type = "number";
  number.min = meta.min;
  number.max = meta.max;
  number.step = meta.step;
  number.value = settings[key];
  number.title = meta.tooltip;

  const update = (value, fromText = false) => {
    const numeric = Number(value);
    settings[key] = numeric;
    slider.value = numeric;
    if (!fromText) {
      number.value = numeric;
    }

    if (key === "cellSize") {
      resizeCanvas();
    } else if (key === "lightnessOffset") {
      purgeSpriteCache();
    }

    saveSettings();
  };

  slider.addEventListener("input", (e) => update(e.target.value));
  number.addEventListener("input", (e) => update(e.target.value, true));

  wrapper.appendChild(label);
  wrapper.appendChild(slider);
  wrapper.appendChild(number);
  parent.appendChild(wrapper);
}

export function initControlPanel() {
  loadSettings();

  const panel = document.getElementById("control-panel");
  panel.innerHTML = "";

  Object.keys(config).forEach((key) => {
    createControl(key, panel);
  });
}
