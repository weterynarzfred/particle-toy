import { MAX_PARTICLE_COUNT, PARTICLE_PROPS, settings } from "./settings";
import { initControlPanel } from "./controlPanel";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const frameTimeElement = document.getElementById('frame-time');

let gridCols = 0;
let gridRows = 0;
let gridHeads;

// positions
const px = new Float32Array(MAX_PARTICLE_COUNT);
const py = new Float32Array(MAX_PARTICLE_COUNT);

// velocities
const vx = new Float32Array(MAX_PARTICLE_COUNT);
const vy = new Float32Array(MAX_PARTICLE_COUNT);

// other
const particleTypes = new Int8Array(MAX_PARTICLE_COUNT);
const nextParticle = new Int32Array(MAX_PARTICLE_COUNT);

initControlPanel();

function rebuildGrid() {
  gridHeads.fill(-1);

  for (let i = 0; i < settings.particleCount; i++) {
    const cx = (px[i] / settings.cellSize) | 0;
    const cy = (py[i] / settings.cellSize) | 0;

    const cellIndex = cy * gridCols + cx;

    nextParticle[i] = gridHeads[cellIndex];
    gridHeads[cellIndex] = i;
  }
}

function forEachNeighborPair(fn) {
  for (let i = 0; i < settings.particleCount; i++) {
    const cx = (px[i] / settings.cellSize) | 0;
    const cy = (py[i] / settings.cellSize) | 0;

    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= gridRows) continue;

      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= gridCols) continue;

        let p = gridHeads[gy * gridCols + gx];

        while (p !== -1) {
          if (p > i) {
            const dx = px[p] - px[i];
            const dy = py[p] - py[i];

            if (dx * dx + dy * dy <= settings.cellSize * settings.cellSize) {
              fn(i, p, dx, dy);
            }
          }

          p = nextParticle[p];
        }
      }
    }
  }
}

function interactParticles() {
  forEachNeighborPair((i, j, dx, dy) => {
    const d2 = dx * dx + dy * dy + 0.001;

    if (d2 < settings.particleRadius * settings.particleRadius * 4) {
      const force = -settings.repel / d2;
      const fx = dx * force;
      const fy = dy * force;
      vx[i] += fx; vy[i] += fy;
      vx[j] -= fx; vy[j] -= fy;
      // return;
    }

    const ti = particleTypes[i] | 0;
    const tj = particleTypes[j] | 0;

    // Directional coefficients:
    // i experiencing force due to j, and j due to i
    const cij = PARTICLE_PROPS[ti][tj + 1];
    const cji = PARTICLE_PROPS[tj][ti + 1];

    // Base magnitude
    const base = settings.attraction / d2;

    // Apply per-particle coefficient (directional)
    const fi = base * cij;
    const fj = base * cji;

    // Force on i points toward j: (dx, dy) * fi
    // Force on j points toward i: (-dx, -dy) * fj  == (dx, dy) * (-fj)
    const fxI = dx * fi;
    const fyI = dy * fi;

    const fxJ = dx * fj;
    const fyJ = dy * fj;

    vx[i] += fxI; vy[i] += fyI;
    vx[j] -= fxJ; vy[j] -= fyJ;
  });
}


const spriteCache = new Map();
function getSprite(particleType, speedBucket, r) {
  const key = `${particleType}:${speedBucket}:${r}`;
  let c = spriteCache.get(key);
  if (c) return c;

  c = document.createElement("canvas");
  const size = (r + 2 + 10) * 2;
  c.width = c.height = size;

  const g = c.getContext("2d");
  g.translate(size / 2, size / 2);

  const a = Math.sqrt(speedBucket) * 7 + settings.lightnessOffset;
  g.fillStyle = `hsl(${PARTICLE_PROPS[particleType][0]}, 100%, ${a}%)`;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();

  spriteCache.set(key, c);
  return c;
}

export function purgeSpriteCache() {
  spriteCache.clear();
}

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.fillStyle = "rgb(20, 15, 11)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gridCols = Math.ceil(canvas.width / settings.cellSize);
  gridRows = Math.ceil(canvas.height / settings.cellSize);

  gridHeads = new Int32Array(gridCols * gridRows);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

for (let i = 0; i < MAX_PARTICLE_COUNT; i++) {
  px[i] = Math.random() * canvas.width;
  py[i] = Math.random() * canvas.height;

  particleTypes[i] = Math.floor(Math.random() * PARTICLE_PROPS.length);
}

function updateParticles() {
  for (let i = 0; i < settings.particleCount; i++) {
    const dx = px[i] - canvas.width / 2;
    const dy = py[i] - canvas.height / 2;
    const d2 = dx * dx + dy * dy + 0.001;
    if (d2 > 2000) {
      vx[i] -= 2 * settings.centralGravity / d2 * dx;
      vy[i] -= 2 * settings.centralGravity / d2 * dy;
    }

    vx[i] /= 1 + settings.damping;
    vy[i] /= 1 + settings.damping;

    px[i] += vx[i];
    py[i] += vy[i];

    if (px[i] <= settings.particleRadius) {
      px[i] = settings.particleRadius;
      vx[i] *= -1;
    } else if (px[i] >= canvas.width - settings.particleRadius) {
      px[i] = canvas.width - settings.particleRadius;
      vx[i] *= -1;
    }

    if (py[i] <= settings.particleRadius) {
      py[i] = settings.particleRadius;
      vy[i] *= -1;
    } else if (py[i] >= canvas.height - settings.particleRadius) {
      py[i] = canvas.height - settings.particleRadius;
      vy[i] *= -1;
    }
  }
}

function drawParticles(ctx) {
  for (let i = 0; i < settings.particleCount; i++) {
    const particleType = particleTypes[i];
    const speedBucket = Math.min(vx[i] * vx[i] + vy[i] * vy[i], 99) | 0;

    const s = getSprite(particleType, speedBucket, settings.particleRadius);

    ctx.drawImage(
      s,
      px[i] - s.width / 2,
      py[i] - s.height / 2
    );
  }
}

let fpsRefreshCounter = 0;
let startTime = new Date().getTime();
function animate() {
  ctx.fillStyle = `rgb(17, 13, 9, ${1 - settings.smudge})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "lighter";

  updateParticles();
  rebuildGrid();
  interactParticles();
  drawParticles(ctx);

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(animate);

  if (fpsRefreshCounter >= 50) {
    frameTimeElement.textContent = (new Date().getTime() - startTime) / 50;

    startTime = new Date().getTime();
    fpsRefreshCounter = 0;
  }
  fpsRefreshCounter++;
}

ctx.fillStyle = "rgb(20, 15, 11)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
animate();
