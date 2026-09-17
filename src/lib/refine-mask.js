/**
 * Cleans up the model's alpha mask before it is applied to the photo.
 *
 * The segmentation model often leaves two kinds of artefact:
 *  - faint "haze": background pixels with low but non-zero alpha, which show
 *    up as a tinted veil around the subject;
 *  - stray islands: small patches of background (ground, furniture) that the
 *    model half-believes are foreground.
 *
 * Both are removed here. Work that needs the whole image (finding islands,
 * measuring distance to the subject) runs on a copy no larger than
 * ANALYSIS_SIZE, which is the resolution the model predicted at anyway.
 */

const ANALYSIS_SIZE = 1024;

export const REFINE_DEFAULTS = {
  /** Alpha at or above this counts as "subject" when finding islands. */
  solidAlpha: 128,
  /** Islands smaller than this fraction of the largest one are dropped. */
  minIslandRatio: 0.02,
  /** Soft pixels further than this from the subject are cleared (fraction of the short side). */
  keepMargin: 0.02,
  /** Alpha below this becomes fully transparent. */
  floor: 20,
  /** Alpha above this becomes fully opaque. */
  ceiling: 235,
};

/** Area-average downscale of a single-channel mask. */
function downscale(alpha, width, height, scale) {
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const out = new Uint8Array(w * h);
  const counts = new Uint32Array(w * h);
  const sums = new Uint32Array(w * h);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(h - 1, Math.floor(y * scale));
    const row = y * width;
    const outRow = sy * w;
    for (let x = 0; x < width; x++) {
      const i = outRow + Math.min(w - 1, Math.floor(x * scale));
      sums[i] += alpha[row + x];
      counts[i] += 1;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = counts[i] ? Math.round(sums[i] / counts[i]) : 0;
  return { data: out, width: w, height: h };
}

/**
 * Label 8-connected regions of `solid` pixels. Returns the label of every
 * pixel (0 = background) and the area of each label.
 */
function labelIslands(solid, width, height) {
  const labels = new Int32Array(width * height);
  const areas = [0];
  const stack = new Int32Array(width * height);
  let next = 1;
  for (let start = 0; start < solid.length; start++) {
    if (!solid[start] || labels[start]) continue;
    let top = 0;
    let area = 0;
    stack[top++] = start;
    labels[start] = next;
    while (top) {
      const i = stack[--top];
      area++;
      const x = i % width;
      const y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (solid[j] && !labels[j]) {
            labels[j] = next;
            stack[top++] = j;
          }
        }
      }
    }
    areas.push(area);
    next++;
  }
  return { labels, areas };
}

/** Two-pass chamfer distance (in pixels) from every pixel to the nearest `seed`. */
function distanceFrom(seed, width, height) {
  const far = 1e9;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = seed[i] ? 0 : far;
  const diag = Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) {
        d = Math.min(d, dist[i - width] + 1);
        if (x > 0) d = Math.min(d, dist[i - width - 1] + diag);
        if (x < width - 1) d = Math.min(d, dist[i - width + 1] + diag);
      }
      dist[i] = d;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let d = dist[i];
      if (x < width - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < height - 1) {
        d = Math.min(d, dist[i + width] + 1);
        if (x < width - 1) d = Math.min(d, dist[i + width + 1] + diag);
        if (x > 0) d = Math.min(d, dist[i + width - 1] + diag);
      }
      dist[i] = d;
    }
  }
  return dist;
}

/** Box-blur a small float grid in place (separable running sums). */
function boxBlur(grid, width, height, radius) {
  const tmp = new Float32Array(grid.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += grid[row + Math.min(width - 1, Math.max(0, x))];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum;
      sum += grid[row + Math.min(width - 1, x + radius + 1)] - grid[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
    for (let y = 0; y < height; y++) {
      grid[y * width + x] = sum;
      sum += tmp[Math.min(height - 1, y + radius + 1) * width + x] - tmp[Math.max(0, y - radius) * width + x];
    }
  }
}

/**
 * Remove background colour that bleeds into the subject's soft edges.
 *
 * An edge pixel's colour is a blend: C = a·F + (1 − a)·B. Nearby opaque
 * pixels give an estimate of the subject colour F and nearby transparent
 * pixels one of the background B, both measured on a small grid. Where alpha
 * is high enough the blend is solved for F; for fainter pixels the nearby
 * subject colour is used instead.
 *
 * `rgba` holds the original photo's pixels; `alpha` is the final mask.
 */
export function decontaminateEdges(rgba, alpha, width, height) {
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const fg = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  const bg = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  const fgCount = new Float32Array(w * h);
  const bgCount = new Float32Array(w * h);
  const colOf = new Int32Array(width);
  for (let x = 0; x < width; x++) colOf[x] = Math.min(w - 1, Math.floor(x * scale));

  let edges = 0;
  for (let y = 0; y < height; y++) {
    const cellRow = Math.min(h - 1, Math.floor(y * scale)) * w;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = alpha[i];
      const cell = cellRow + colOf[x];
      if (a >= 250) {
        fg[0][cell] += rgba[i * 4];
        fg[1][cell] += rgba[i * 4 + 1];
        fg[2][cell] += rgba[i * 4 + 2];
        fgCount[cell] += 1;
      } else if (a === 0) {
        bg[0][cell] += rgba[i * 4];
        bg[1][cell] += rgba[i * 4 + 1];
        bg[2][cell] += rgba[i * 4 + 2];
        bgCount[cell] += 1;
      } else {
        edges++;
      }
    }
  }
  if (!edges) return 0;

  const radius = Math.max(2, Math.round(Math.min(w, h) * 0.008));
  for (const grid of [...fg, fgCount, ...bg, bgCount]) boxBlur(grid, w, h, radius);

  for (let y = 0; y < height; y++) {
    const cellRow = Math.min(h - 1, Math.floor(y * scale)) * w;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a8 = alpha[i];
      if (a8 === 0 || a8 >= 250) continue;
      const cell = cellRow + colOf[x];
      if (!fgCount[cell]) continue;
      const a = a8 / 255;
      const hasBg = bgCount[cell] > 0;
      // Trust the solved colour more as alpha rises; faint pixels take the neighbours' colour.
      const solveWeight = hasBg ? Math.min(1, Math.max(0, (a - 0.25) / 0.5)) : 0;
      for (let c = 0; c < 3; c++) {
        const nearFg = fg[c][cell] / fgCount[cell];
        let value = nearFg;
        if (solveWeight > 0) {
          const nearBg = bg[c][cell] / bgCount[cell];
          const solved = (rgba[i * 4 + c] - (1 - a) * nearBg) / a;
          value = solveWeight * solved + (1 - solveWeight) * nearFg;
        }
        rgba[i * 4 + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
  return edges;
}

/**
 * Refine `alpha` (width × height, one byte per pixel) in place.
 * Returns a short summary, useful for tests.
 */
export function refineMask(alpha, width, height, options = {}) {
  const o = { ...REFINE_DEFAULTS, ...options };
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(width, height));
  const small = scale < 1 ? downscale(alpha, width, height, scale) : { data: alpha, width, height };

  const solid = new Uint8Array(small.data.length);
  for (let i = 0; i < solid.length; i++) solid[i] = small.data[i] >= o.solidAlpha ? 1 : 0;
  const { labels, areas } = labelIslands(solid, small.width, small.height);
  // A loop, not Math.max(...areas): a noisy mask can have more islands than
  // a function call accepts arguments.
  let largest = 0;
  for (const area of areas) if (area > largest) largest = area;

  // Nothing confidently detected: leave the mask alone rather than erase it.
  if (largest < small.data.length * 0.002) {
    return { refined: false, islands: areas.length - 1, removedIslands: 0 };
  }

  const minArea = largest * o.minIslandRatio;
  const keptIsland = areas.map((area) => area >= minArea);
  const seed = new Uint8Array(solid.length);
  for (let i = 0; i < seed.length; i++) seed[i] = keptIsland[labels[i]] && labels[i] ? 1 : 0;

  // At least a few grid cells, or thin images lose their soft edges entirely.
  const margin = Math.max(3, o.keepMargin * Math.min(small.width, small.height));
  const dist = distanceFrom(seed, small.width, small.height);

  // Inside the subject, near-opaque pixels become opaque and faint ones are
  // dropped. Outside it, alpha is only ever reduced: faint pixels are cleared
  // and the rest fade out with distance, so nothing next to the subject (a
  // wall, a door) becomes more visible than the model made it.
  const range = o.ceiling - o.floor;
  const colOf = new Int32Array(width);
  for (let x = 0; x < width; x++) colOf[x] = Math.min(small.width - 1, Math.floor(x * scale));
  for (let y = 0; y < height; y++) {
    const cellRow = Math.min(small.height - 1, Math.floor(y * scale)) * small.width;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      const a = alpha[i];
      const d = dist[cellRow + colOf[x]];
      if (a <= o.floor || d >= margin) {
        alpha[i] = 0;
      } else if (d === 0) {
        alpha[i] = a >= o.ceiling ? 255 : Math.round(((a - o.floor) / range) * 255);
      } else {
        alpha[i] = Math.round(a * (1 - d / margin));
      }
    }
  }

  return {
    refined: true,
    islands: areas.length - 1,
    removedIslands: keptIsland.filter((kept, label) => label && !kept).length,
  };
}
