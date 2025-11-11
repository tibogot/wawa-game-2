import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

interface HeightMapData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  minHeight: number;
  maxHeight: number;
  heightRange: number;
  peakOffset: number;
}

interface UseHeightMapLookupParams {
  heightmapPath: string;
  size: number;
  heightScale: number;
  centerRegionSize?: number;
}

/**
 * Hook to extract height values from a heightmap texture
 * Uses the same logic as HeightMapUnreal component for consistency
 */
export function useHeightMapLookup({
  heightmapPath,
  size,
  heightScale,
  centerRegionSize = 5,
}: UseHeightMapLookupParams) {
  const heightMapDataRef = useRef<HeightMapData | null>(null);

  useEffect(() => {
    // Load and process heightmap
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = heightmapPath;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Calculate min/max heights for normalization
      let minHeight = 1;
      let maxHeight = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const height = imageData.data[i] / 255;
        if (height < minHeight) minHeight = height;
        if (height > maxHeight) maxHeight = height;
      }

      const heightRange = maxHeight - minHeight;

      // Find max height at center region (for centering on Y=0)
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      let maxCenterHeight = 0;

      for (let dx = -centerRegionSize; dx <= centerRegionSize; dx++) {
        for (let dy = -centerRegionSize; dy <= centerRegionSize; dy++) {
          const x = Math.max(0, Math.min(canvas.width - 1, centerX + dx));
          const y = Math.max(0, Math.min(canvas.height - 1, centerY + dy));
          const pixelIndex = (y * canvas.width + x) * 4;
          const height = imageData.data[pixelIndex] / 255;
          if (height > maxCenterHeight) {
            maxCenterHeight = height;
          }
        }
      }

      // Calculate offset to place center peak at Y=0
      const normalizedMaxCenterHeight =
        (maxCenterHeight - minHeight) / heightRange;
      const peakOffset = -(normalizedMaxCenterHeight * heightScale);

      heightMapDataRef.current = {
        data: imageData.data,
        width: canvas.width,
        height: canvas.height,
        minHeight,
        maxHeight,
        heightRange,
        peakOffset,
      };

      console.log("✅ Heightmap hook loaded!", {
        width: canvas.width,
        height: canvas.height,
        peakOffset: peakOffset.toFixed(2),
        centerHeight: (
          normalizedMaxCenterHeight * heightScale +
          peakOffset
        ).toFixed(2),
      });
    };
  }, [heightmapPath, heightScale, centerRegionSize]);

  /**
   * Get height at world position (x, z)
   * Returns the Y coordinate in world space
   */
  const getHeightAt = useCallback(
    (worldX: number, worldZ: number): number => {
      if (!heightMapDataRef.current) return 0;

      const { data, width, height, minHeight, heightRange, peakOffset } =
        heightMapDataRef.current;

      // Convert world coordinates to texture coordinates (0-1)
      const u = (worldX + size / 2) / size;
      const v = (worldZ + size / 2) / size;

      // Clamp to valid range
      const clampedU = Math.max(0, Math.min(1, u));
      const clampedV = Math.max(0, Math.min(1, v));

      // Get pixel coordinates
      const pixelX = Math.floor(clampedU * (width - 1));
      const pixelY = Math.floor(clampedV * (height - 1));

      // Get pixel index (RGBA format)
      const pixelIndex = (pixelY * width + pixelX) * 4;

      // Use red channel for height (grayscale heightmap)
      const rawHeight = data[pixelIndex] / 255;

      // Normalize height using same logic as geometry
      const normalizedHeight =
        heightRange > 0 ? (rawHeight - minHeight) / heightRange : 0;

      // Apply height scale and peak offset
      return normalizedHeight * heightScale + peakOffset;
    },
    [size]
  );

  /**
   * Get height with bilinear interpolation for smoother results
   */
  const getHeightAtSmooth = useCallback(
    (worldX: number, worldZ: number): number => {
      if (!heightMapDataRef.current) return 0;

      const { data, width, height, minHeight, heightRange, peakOffset } =
        heightMapDataRef.current;

      // Convert world coordinates to texture coordinates (0-1)
      const u = (worldX + size / 2) / size;
      const v = (worldZ + size / 2) / size;

      // Clamp to valid range
      const clampedU = Math.max(0, Math.min(1, u));
      const clampedV = Math.max(0, Math.min(1, v));

      // Get fractional pixel coordinates
      const fx = clampedU * (width - 1);
      const fy = clampedV * (height - 1);

      // Get surrounding pixels
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);

      // Calculate interpolation factors
      const tx = fx - x0;
      const ty = fy - y0;

      // Sample four corners
      const getHeight = (x: number, y: number) => {
        const pixelIndex = (y * width + x) * 4;
        const rawHeight = data[pixelIndex] / 255;
        const normalizedHeight =
          heightRange > 0 ? (rawHeight - minHeight) / heightRange : 0;
        return normalizedHeight * heightScale + peakOffset;
      };

      const h00 = getHeight(x0, y0);
      const h10 = getHeight(x1, y0);
      const h01 = getHeight(x0, y1);
      const h11 = getHeight(x1, y1);

      // Bilinear interpolation
      const h0 = h00 * (1 - tx) + h10 * tx;
      const h1 = h01 * (1 - tx) + h11 * tx;

      return h0 * (1 - ty) + h1 * ty;
    },
    [size]
  );

  /**
   * Check if a point is within terrain bounds
   */
  const isInBounds = useCallback(
    (worldX: number, worldZ: number): boolean => {
      const halfSize = size / 2;
      return Math.abs(worldX) <= halfSize && Math.abs(worldZ) <= halfSize;
    },
    [size]
  );

  return {
    getHeightAt,
    getHeightAtSmooth,
    isInBounds,
    isReady: heightMapDataRef.current !== null,
  };
}
