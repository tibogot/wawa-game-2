import { useRef, useCallback } from "react";
import * as THREE from "three";

interface PerformanceMetrics {
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  grassInstances: number;
  visibleTiles: number;
  culledTiles: number;
  lodChanges: number;
}

export const usePerformanceMonitor = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    grassInstances: 0,
    visibleTiles: 0,
    culledTiles: 0,
    lodChanges: 0,
  });

  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  const lastMemoryCheck = useRef(0);

  const updateMetrics = useCallback(
    (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      visibleTiles: number,
      culledTiles: number,
      lodChanges: number = 0
    ) => {
      const now = performance.now();
      const frameTime = now - lastFrameTime.current;
      lastFrameTime.current = now;

      // Update frame time (smoothed)
      metricsRef.current.frameTime =
        metricsRef.current.frameTime * 0.9 + frameTime * 0.1;

      // Get renderer info
      const info = renderer.info;
      metricsRef.current.drawCalls = info.render.calls;
      metricsRef.current.triangles = info.render.triangles;

      // Count grass instances
      let grassInstances = 0;
      scene.traverse((child) => {
        if (child.isInstancedMesh) {
          grassInstances += child.count;
        }
      });
      metricsRef.current.grassInstances = grassInstances;

      // Update tile counts
      metricsRef.current.visibleTiles = visibleTiles;
      metricsRef.current.culledTiles = culledTiles;
      metricsRef.current.lodChanges = lodChanges;

      // Memory usage (check every 5 seconds)
      if (now - lastMemoryCheck.current > 5000) {
        if ("memory" in performance) {
          const memory = (performance as any).memory;
          metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        lastMemoryCheck.current = now;
      }

      frameCount.current++;
    },
    []
  );

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  const logMetrics = useCallback(() => {
    const metrics = getMetrics();
    console.log("🌿 Grass Performance Metrics:", {
      "Frame Time (ms)": metrics.frameTime.toFixed(2),
      "Draw Calls": metrics.drawCalls,
      Triangles: metrics.triangles.toLocaleString(),
      "Grass Instances": metrics.grassInstances.toLocaleString(),
      "Visible Tiles": metrics.visibleTiles,
      "Culled Tiles": metrics.culledTiles,
      "LOD Changes": metrics.lodChanges,
      "Memory Usage (MB)": metrics.memoryUsage.toFixed(2),
    });
  }, [getMetrics]);

  const getPerformanceScore = useCallback(() => {
    const metrics = getMetrics();

    // Calculate performance score (0-100)
    let score = 100;

    // Penalize high frame times
    if (metrics.frameTime > 16.67) score -= (metrics.frameTime - 16.67) * 2;

    // Penalize high draw calls
    if (metrics.drawCalls > 100) score -= (metrics.drawCalls - 100) * 0.1;

    // Penalize high memory usage
    if (metrics.memoryUsage > 500) score -= (metrics.memoryUsage - 500) * 0.05;

    // Reward good culling
    const cullingRatio =
      metrics.culledTiles / (metrics.visibleTiles + metrics.culledTiles);
    if (cullingRatio > 0.5) score += 10;

    return Math.max(0, Math.min(100, score));
  }, [getMetrics]);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      memoryUsage: 0,
      grassInstances: 0,
      visibleTiles: 0,
      culledTiles: 0,
      lodChanges: 0,
    };
    frameCount.current = 0;
    lastFrameTime.current = performance.now();
  }, []);

  return {
    updateMetrics,
    getMetrics,
    logMetrics,
    getPerformanceScore,
    resetMetrics,
  };
};
