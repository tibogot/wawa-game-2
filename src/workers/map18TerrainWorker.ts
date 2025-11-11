import { createNoise2D } from "simplex-noise";
import alea from "alea";

type TerrainRequestMessage = {
  size: number;
  segments: number;
  verticalScale: number;
  seed: number;
};

type TerrainResponseMessage = {
  heights: ArrayBuffer;
  widthSegments: number;
  heightSegments: number;
  minHeight: number;
  maxHeight: number;
};

const ctx = self as unknown as {
  onmessage: (event: MessageEvent<TerrainRequestMessage>) => void;
  postMessage: (
    message: TerrainResponseMessage,
    transfer: Transferable[]
  ) => void;
};

const handleMessage = (event: MessageEvent<TerrainRequestMessage>) => {
  const { size, segments, verticalScale, seed } = event.data;

  const prng = alea(seed);

  const baseNoise = createNoise2D(prng);
  const ridgeNoise = createNoise2D(prng);
  const erosionNoise = createNoise2D(prng);
  const detailNoise = createNoise2D(prng);

  const stride = segments + 1;
  const heights = new Float32Array(stride * stride);

  const halfSize = size / 2;

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let zIndex = 0; zIndex <= segments; zIndex++) {
    const normalizedZ = zIndex / segments;
    const sampleZ = -halfSize + normalizedZ * size;

    for (let xIndex = 0; xIndex <= segments; xIndex++) {
      const normalizedX = xIndex / segments;
      const sampleX = -halfSize + normalizedX * size;

      const height = computeHeight(
        sampleX,
        sampleZ,
        baseNoise,
        ridgeNoise,
        erosionNoise,
        detailNoise
      );

      const scaledHeight = height * verticalScale;

      const vertexIndex = zIndex * stride + xIndex;
      heights[vertexIndex] = scaledHeight;

      if (scaledHeight < minHeight) {
        minHeight = scaledHeight;
      }
      if (scaledHeight > maxHeight) {
        maxHeight = scaledHeight;
      }
    }
  }

  const response: TerrainResponseMessage = {
    heights: heights.buffer,
    widthSegments: segments,
    heightSegments: segments,
    minHeight,
    maxHeight,
  };

  ctx.postMessage(response, [heights.buffer]);
};

ctx.onmessage = handleMessage;

function computeHeight(
  x: number,
  z: number,
  baseNoise: ReturnType<typeof createNoise2D>,
  ridgeNoise: ReturnType<typeof createNoise2D>,
  erosionNoise: ReturnType<typeof createNoise2D>,
  detailNoise: ReturnType<typeof createNoise2D>
): number {
  const { height: rawHeight, mountainMask } = sampleBaseHeight(
    x,
    z,
    baseNoise,
    ridgeNoise,
    erosionNoise,
    detailNoise
  );

  const sampleStep = 22;

  const forwardX = sampleBaseHeight(
    x + sampleStep,
    z,
    baseNoise,
    ridgeNoise,
    erosionNoise,
    detailNoise
  ).height;
  const backwardX = sampleBaseHeight(
    x - sampleStep,
    z,
    baseNoise,
    ridgeNoise,
    erosionNoise,
    detailNoise
  ).height;
  const forwardZ = sampleBaseHeight(
    x,
    z + sampleStep,
    baseNoise,
    ridgeNoise,
    erosionNoise,
    detailNoise
  ).height;
  const backwardZ = sampleBaseHeight(
    x,
    z - sampleStep,
    baseNoise,
    ridgeNoise,
    erosionNoise,
    detailNoise
  ).height;

  const gradX = (forwardX - backwardX) / (2 * sampleStep);
  const gradZ = (forwardZ - backwardZ) / (2 * sampleStep);
  const slope = Math.sqrt(gradX * gradX + gradZ * gradZ);

  const slopeLimit = lerp(0.18, 0.78, Math.pow(mountainMask, 0.85));

  let height = rawHeight;

  if (slope > slopeLimit) {
    const neighborAverage =
      (forwardX + backwardX + forwardZ + backwardZ + height) / 5;
    const smoothingStrength = clamp(
      (slope - slopeLimit) / Math.max(0.0001, 1.25 - slopeLimit),
      0,
      1
    );
    const mountainRelief = Math.pow(mountainMask, 1.5) * 0.8;
    const flattenStrength = smoothingStrength * (1 - mountainRelief);
    height = lerp(height, neighborAverage, flattenStrength);
  }

  const highMask = smoothstep(0.82, 1.15, rawHeight);
  height = lerp(height, rawHeight, highMask);

  return clamp(height, -0.3, 1.35);
}

function fbm(
  noise: ReturnType<typeof createNoise2D>,
  x: number,
  z: number,
  octaves: number,
  frequency: number,
  lacunarity: number,
  gain: number
): number {
  let amplitude = 1;
  let value = 0;
  let sum = 0;
  let currentFrequency = frequency;

  for (let i = 0; i < octaves; i++) {
    value += noise(x * currentFrequency, z * currentFrequency) * amplitude;
    sum += amplitude;
    amplitude *= gain;
    currentFrequency *= lacunarity;
  }

  if (sum === 0) {
    return 0;
  }

  return value / sum;
}

function ridge(
  noise: ReturnType<typeof createNoise2D>,
  x: number,
  z: number,
  octaves: number,
  frequency: number,
  lacunarity: number,
  gain: number
): number {
  let amplitude = 0.5;
  let value = 0;
  let totalWeight = 0;
  let currentFrequency = frequency;

  for (let i = 0; i < octaves; i++) {
    const n = noise(x * currentFrequency, z * currentFrequency);
    const inverted = 1 - Math.abs(n);
    value += inverted * inverted * amplitude;
    totalWeight += amplitude;

    amplitude *= gain;
    currentFrequency *= lacunarity;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return value / totalWeight;
}
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleBaseHeight(
  x: number,
  z: number,
  baseNoise: ReturnType<typeof createNoise2D>,
  ridgeNoise: ReturnType<typeof createNoise2D>,
  erosionNoise: ReturnType<typeof createNoise2D>,
  detailNoise: ReturnType<typeof createNoise2D>
): { height: number; mountainMask: number } {
  const lowlands = fbm(baseNoise, x, z, 4, 1 / 3200, 2.05, 0.6);
  const midlands = fbm(baseNoise, x + 3400, z - 4100, 4, 1 / 1600, 2.0, 0.6);
  let height = lowlands * 0.65 + midlands * 0.35;

  const valleyBands = fbm(
    erosionNoise,
    x - 5400,
    z + 5400,
    3,
    1 / 5200,
    2.0,
    0.55
  );
  height -= valleyBands * 0.18;

  const gentleHills = fbm(
    erosionNoise,
    x + 2100,
    z + 2100,
    3,
    1 / 900,
    2.05,
    0.62
  );
  height += gentleHills * 0.16;

  const softDetail = fbm(
    detailNoise,
    x * 0.22 - 680,
    z * 0.22 + 680,
    2,
    1 / 320,
    2.4,
    0.7
  );
  height += softDetail * 0.04;

  const hillClusters = fbm(
    baseNoise,
    x - 1200,
    z + 1200,
    4,
    1 / 1400,
    2.0,
    0.6
  );
  height += hillClusters * 0.14;

  const valleyMask = smoothstep(-0.3, 0.45, height);
  height = lerp(height, height * 0.55 + 0.03, 1 - valleyMask);

  const mountainCenterX = 480;
  const mountainCenterZ = -460;
  const dx = x - mountainCenterX;
  const dz = z - mountainCenterZ;
  const distanceToMountain = Math.sqrt(dx * dx + dz * dz);
  const mountainRadius = 380;
  let mountainMask = smoothstep(
    mountainRadius * 0.65,
    mountainRadius * 0.32,
    distanceToMountain
  );
  mountainMask = Math.pow(mountainMask, 1.35);
  const mountainHeight =
    mountainMask * (0.9 + 0.6 * smoothstep(0.25, 0.0, mountainMask));
  height += mountainHeight;

  const accessibleSmoothing = smoothstep(-0.1, 0.75, height);
  height = lerp(height * 0.58 + 0.02, height, accessibleSmoothing);

  return {
    height: clamp(height, -0.35, 1.4),
    mountainMask,
  };
}

export {};
