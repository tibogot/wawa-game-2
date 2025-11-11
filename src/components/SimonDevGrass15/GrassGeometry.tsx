import { useMemo } from "react";
import * as THREE from "three";

interface GrassGeometryProps {
  grassHeight: number;
  useFloat16: boolean;
}

/**
 * GrassGeometry - 15-Vertex Grass Blade Geometry Creation
 *
 * Extracted from SimonDevGrass14Simple to separate concerns
 * Creates the 15-vertex grass blade with natural curve and taper
 */
export const useGrassGeometry = ({
  grassHeight,
  useFloat16,
}: GrassGeometryProps) => {
  return useMemo(() => {
    const geometry = new THREE.BufferGeometry();

    // 5 segments, 3 vertices per segment = 15 vertices total
    // Structure: [left edge, center spine, right edge] for each segment

    // Define blade shape parameters
    const segments = 5;
    const baseWidth = 0.1; // Wide base
    const tipWidth = 0.0; // Sharp pointed tip (like image)

    // Height distribution for each segment (0 to 1)
    const segmentHeights = [0.0, 0.15, 0.35, 0.6, 0.8, 1.0];

    // Width at each segment (taper from base to tip)
    const segmentWidths = [
      baseWidth, // Segment 0: base
      0.09, // Segment 1
      0.07, // Segment 2
      0.05, // Segment 3
      0.03, // Segment 4
      tipWidth, // Segment 5: sharp tip (0.0 = all vertices converge)
    ];

    // Curve offsets (backward lean) - parabolic curve
    const curveOffsets = [
      0.0, // Segment 0: no curve at base
      0.01, // Segment 1: slight
      0.04, // Segment 2: more
      0.09, // Segment 3: more
      0.16, // Segment 4: more
      0.25, // Segment 5: max curve at tip
    ];

    const vertices: number[] = [];
    const uvs: number[] = [];

    // Create vertices for each segment
    for (let i = 0; i <= segments; i++) {
      const height = segmentHeights[i] * grassHeight;
      const width = segmentWidths[i];
      const curveOffset = curveOffsets[i];

      // Left edge vertex
      vertices.push(-width, height, curveOffset);
      uvs.push(0, height / grassHeight); // UV: left edge, height-based V

      // Center spine vertex
      vertices.push(0, height, curveOffset);
      uvs.push(0.5, height / grassHeight); // UV: center, height-based V

      // Right edge vertex
      vertices.push(width, height, curveOffset);
      uvs.push(1, height / grassHeight); // UV: right edge, height-based V
    }

    // Use Float16 or Float32 based on setting
    if (useFloat16) {
      // Convert to Float16Array for half precision
      const float16Array = new Float16Array(vertices);
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(float16Array as any, 3)
      );
      console.log("🌾 Using Float16 (half precision) for grass geometry");
    } else {
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(vertices), 3)
      );
      console.log("🌾 Using Float32 (full precision) for grass geometry");
    }

    // Create triangular faces connecting the segments
    const indices: number[] = [];

    for (let seg = 0; seg < segments; seg++) {
      const baseIndex = seg * 3;

      // Left triangle (left edge to center)
      indices.push(
        baseIndex + 0, // current left
        baseIndex + 3, // next left
        baseIndex + 1 // current center
      );

      indices.push(
        baseIndex + 1, // current center
        baseIndex + 3, // next left
        baseIndex + 4 // next center
      );

      // Right triangle (center to right edge)
      indices.push(
        baseIndex + 1, // current center
        baseIndex + 4, // next center
        baseIndex + 2 // current right
      );

      indices.push(
        baseIndex + 2, // current right
        baseIndex + 4, // next center
        baseIndex + 5 // next right
      );
    }

    geometry.setIndex(indices);

    // Add UV coordinates for normal map
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(uvs), 2)
    );

    // Wind influence will be handled as an instanced attribute, not per-vertex

    geometry.computeVertexNormals();

    console.log("🌾 Created 15-vertex grass blade with normals:", {
      vertices: vertices.length / 3,
      triangles: indices.length / 3,
      segments: segments,
    });

    return geometry;
  }, [grassHeight, useFloat16]);
};

export default useGrassGeometry;
