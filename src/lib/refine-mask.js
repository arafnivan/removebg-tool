/**
 * Post-processing for the model's alpha mask.
 *
 *  - cleanMask: a levels curve. Faint haze becomes fully transparent and
 *    near-opaque pixels become fully opaque, while the soft ramp in between
 *    (hair, fur, motion blur) is kept. Nothing is removed by position or
 *    size: earlier versions dropped "stray islands", which also erased text,
 *    second objects and hair strands.
 *
 *  - estimateForeground: removes background colour that bleeds into soft
 *    edges, using Blur-Fusion (Forte & Pitié, "Approximate Fast Foreground
 *    Colour Estimation", ICIP 2021). Without it a subject shot against a
 *    blue wall keeps a blue fringe in its hair.
 */

/** Long side of the grid the coarse foreground pass runs on. */
const COARSE_SIZE = 1024;

/**
 * Map alpha through a linear ramp: at or below `floor` → 0, at or above
 * `ceiling` → 255. Works in place on a one-byte-per-pixel mask.
 */
export function cleanMask(alpha, { floor = 10, ceiling = 240 } = {}) {
  const lut = new Uint8Array(256);
  for (let a = 0; a < 256; a++) {
    lut[a] = a <= floor ? 0 : a >= ceiling ? 255 : Math.round(((a - floor) / (ceiling - floor)) * 255);
  }
  for (let i = 0; i < alpha.length; i++) alpha[i] = lut[alpha[i]];
}

/**
 * Box-blur a float grid in place with separable running sums. Only a single
 * line buffer is allocated, which matters for full-resolution grids.
 * Edges are clamped, so the result is a proper average everywhere.
 */
export function boxBlur(grid, width, height, radius) {
  if (radius < 1) return;
  const line = new Float32Array(Math.max(width, height));
  const norm = 1 / (2 * radius + 1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) line[x] = grid[row + x];
    let sum = line[0] * (radius + 1);
    for (let x = 1; x <= radius; x++) sum += line[Math.min(width - 1, x)];
    for (let x = 0; x < width; x++) {
      grid[row + x] = sum * norm;
      sum += line[Math.min(width - 1, x + radius + 1)] - line[Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) line[y] = grid[y * width + x];
    let sum = line[0] * (radius + 1);
    for (let y = 1; y <= radius; y++) sum += line[Math.min(height - 1, y)];
    for (let y = 0; y < height; y++) {
      grid[y * width + x] = sum * norm;
      sum += line[Math.min(height - 1, y + radius + 1)] - line[Math.max(0, y - radius)];
    }
  }
}

const EPS = 1e-5;

/**
 * One Blur-Fusion step on a grid. `image`, `fg` and `bg` hold three float
 * channels in [0, 1] (arrays of length 3, one grid each), `alpha` is a float
 * grid in [0, 1]. Returns the new foreground and the blurred background.
 */
function blurFusion(image, fg, bg, alpha, width, height, radius) {
  const n = width * height;
  const blurredAlpha = Float32Array.from(alpha);
  boxBlur(blurredAlpha, width, height, radius);
  const outFg = [];
  const outBg = [];
  for (let c = 0; c < 3; c++) {
    const bF = new Float32Array(n);
    const bB = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      bF[i] = fg[c][i] * alpha[i];
      bB[i] = bg[c][i] * (1 - alpha[i]);
    }
    boxBlur(bF, width, height, radius);
    boxBlur(bB, width, height, radius);
    const f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = alpha[i];
      const F = bF[i] / (blurredAlpha[i] + EPS);
      const B = bB[i] / (1 - blurredAlpha[i] + EPS);
      bB[i] = B;
      f[i] = Math.min(1, Math.max(0, F + a * (image[c][i] - a * F - (1 - a) * B)));
    }
    outFg.push(f);
    outBg.push(bB);
  }
  return { fg: outFg, bg: outBg };
}

/** Area-average downscale of the RGB channels and alpha to floats in [0, 1]. */
function coarseGrids(rgba, alpha, width, height, w, h) {
  const n = w * h;
  const image = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  const a = new Float32Array(n);
  const counts = new Float32Array(n);
  const sx = w / width;
  const sy = h / height;
  for (let y = 0; y < height; y++) {
    const row = Math.min(h - 1, Math.floor(y * sy)) * w;
    for (let x = 0; x < width; x++) {
      const cell = row + Math.min(w - 1, Math.floor(x * sx));
      const i = y * width + x;
      image[0][cell] += rgba[i * 4];
      image[1][cell] += rgba[i * 4 + 1];
      image[2][cell] += rgba[i * 4 + 2];
      a[cell] += alpha[i];
      counts[cell] += 1;
    }
  }
  for (let i = 0; i < n; i++) {
    const k = counts[i] ? 1 / (255 * counts[i]) : 0;
    image[0][i] *= k;
    image[1][i] *= k;
    image[2][i] *= k;
    a[i] *= k;
  }
  return { image, alpha: a };
}

/** Bilinear sample of a coarse grid at full-resolution pixel (x, y). */
function makeSampler(width, height, w, h) {
  const sx = w / width;
  const sy = h / height;
  const x0 = new Int32Array(width);
  const x1 = new Int32Array(width);
  const fx = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const gx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
    x0[x] = Math.floor(gx);
    x1[x] = Math.min(w - 1, x0[x] + 1);
    fx[x] = gx - x0[x];
  }
  return {
    row(y) {
      const gy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
      const y0 = Math.floor(gy);
      return { r0: y0 * w, r1: Math.min(h - 1, y0 + 1) * w, fy: gy - y0 };
    },
    at(grid, { r0, r1, fy }, x) {
      const a = grid[r0 + x0[x]] + (grid[r0 + x1[x]] - grid[r0 + x0[x]]) * fx[x];
      const b = grid[r1 + x0[x]] + (grid[r1 + x1[x]] - grid[r1 + x0[x]]) * fx[x];
      return a + (b - a) * fy;
    },
  };
}

/**
 * Replace the colour of every partly transparent pixel with its estimated
 * foreground colour. `rgba` holds the original photo (modified in place),
 * `alpha` the final mask (one byte per pixel). Returns the number of pixels
 * that were changed.
 *
 * The first, wide pass runs on a grid no larger than COARSE_SIZE; the second,
 * narrow pass runs at full resolution and allocates three float grids.
 */
export function estimateForeground(rgba, alpha, width, height) {
  let soft = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > 0 && alpha[i] < 255) soft++;
  if (!soft) return 0;

  // Pass 1: coarse, wide radius. Gives a smooth foreground and background.
  const scale = Math.min(1, COARSE_SIZE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const coarse = coarseGrids(rgba, alpha, width, height, w, h);
  const wide = Math.max(4, Math.round(Math.max(w, h) * 0.06));
  const pass1 = blurFusion(coarse.image, coarse.image, coarse.image, coarse.alpha, w, h, wide);

  // Pass 2: full resolution, narrow radius. F starts as the photo where the
  // subject is opaque and as the coarse estimate elsewhere.
  const n = width * height;
  const radius = Math.max(3, Math.round(Math.max(width, height) * 0.004));
  const sampler = makeSampler(width, height, w, h);
  const blurredAlpha = new Float32Array(n);
  for (let i = 0; i < n; i++) blurredAlpha[i] = alpha[i] / 255;
  boxBlur(blurredAlpha, width, height, radius);

  const bF = new Float32Array(n);
  const bB = new Float32Array(n);
  const out = new Uint8ClampedArray(soft * 3);
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < height; y++) {
      const s = sampler.row(y);
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const a = alpha[i] / 255;
        const F = alpha[i] === 255 ? rgba[i * 4 + c] / 255 : sampler.at(pass1.fg[c], s, x);
        bF[i] = F * a;
        bB[i] = sampler.at(pass1.bg[c], s, x) * (1 - a);
      }
    }
    boxBlur(bF, width, height, radius);
    boxBlur(bB, width, height, radius);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const a8 = alpha[i];
      if (a8 === 0 || a8 === 255) continue;
      const a = a8 / 255;
      const F = bF[i] / (blurredAlpha[i] + EPS);
      const B = bB[i] / (1 - blurredAlpha[i] + EPS);
      const value = F + a * (rgba[i * 4 + c] / 255 - a * F - (1 - a) * B);
      out[k++ * 3 + c] = Math.round(value * 255);
    }
  }
  let k = 0;
  for (let i = 0; i < n; i++) {
    const a8 = alpha[i];
    if (a8 === 0 || a8 === 255) continue;
    rgba[i * 4] = out[k * 3];
    rgba[i * 4 + 1] = out[k * 3 + 1];
    rgba[i * 4 + 2] = out[k * 3 + 2];
    k++;
  }
  return soft;
}
