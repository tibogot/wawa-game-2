import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { useFrame, useThree } from "@react-three/fiber";
import { Water } from "three/examples/jsm/objects/Water.js";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

export const Lake = ({
  position = [0, 0, 0],
  size = 100,
  segments = 32,
  ...props
}) => {
  const waterRef = useRef();
  const { scene } = useThree();

  // Lake controls using Leva
  const {
    lakeEnabled,
    lakeSize,
    lakePositionX,
    lakePositionY,
    lakePositionZ,
    waterColorHex,
    sunColorHex,
    distortionScale,
    sunDirectionX,
    sunDirectionY,
    sunDirectionZ,
  } = useControls("🏞️ Lake", {
    lakeEnabled: {
      value: true,
      label: "Enabled",
    },
    lakeSize: {
      value: size,
      min: 100,
      max: 2000,
      step: 50,
      label: "Size",
    },
    lakePositionX: {
      value: position[0],
      min: -2000,
      max: 2000,
      step: 10,
      label: "Position X",
    },
    lakePositionY: {
      value: position[1],
      min: -100,
      max: 100,
      step: 1,
      label: "Position Y",
    },
    lakePositionZ: {
      value: position[2],
      min: -2000,
      max: 2000,
      step: 10,
      label: "Position Z",
    },
    waterColorHex: {
      value: "#001e0f",
      label: "Water Color",
    },
    sunColorHex: {
      value: "#ffffff",
      label: "Sun Color",
    },
    distortionScale: {
      value: 3.7,
      min: 0,
      max: 10,
      step: 0.1,
      label: "Distortion Scale",
    },
    sunDirectionX: {
      value: 0.7071,
      min: -1,
      max: 1,
      step: 0.01,
      label: "Sun Direction X",
    },
    sunDirectionY: {
      value: 0.7071,
      min: -1,
      max: 1,
      step: 0.01,
      label: "Sun Direction Y",
    },
    sunDirectionZ: {
      value: 0,
      min: -1,
      max: 1,
      step: 0.01,
      label: "Sun Direction Z",
    },
  });

  // Convert hex strings to hex numbers for Three.js
  const waterColor = useMemo(
    () => parseInt(waterColorHex.replace("#", ""), 16),
    [waterColorHex]
  );
  const sunColor = useMemo(
    () => parseInt(sunColorHex.replace("#", ""), 16),
    [sunColorHex]
  );

  // Create procedural water normal map texture with Simplex noise
  const waterNormals = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Create Simplex noise generators for different octaves with different seeds
    const noise1 = createNoise2D(alea(12345));
    const noise2 = createNoise2D(alea(67890));
    const noise3 = createNoise2D(alea(54321));
    const noise4 = createNoise2D(alea(98765));

    // Create a procedural noise-based normal map for water
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const scale = 0.02; // Controls the frequency of waves

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Sample multiple octaves of noise for realistic water patterns
        const xPos = x * scale;
        const yPos = y * scale;

        const n1 = noise1(xPos, yPos) * 0.4;
        const n2 = noise2(xPos * 2.0, yPos * 2.0) * 0.3;
        const n3 = noise3(xPos * 4.0, yPos * 4.0) * 0.2;
        const n4 = noise4(xPos * 8.0, yPos * 8.0) * 0.1;

        const height = n1 + n2 + n3 + n4;

        // Calculate normal from height gradient
        const eps = 1.0;
        const heightR =
          noise1(xPos + eps, yPos) * 0.4 +
          noise2((xPos + eps) * 2.0, yPos * 2.0) * 0.3 +
          noise3((xPos + eps) * 4.0, yPos * 4.0) * 0.2 +
          noise4((xPos + eps) * 8.0, yPos * 8.0) * 0.1;

        const heightU =
          noise1(xPos, yPos + eps) * 0.4 +
          noise2(xPos * 2.0, (yPos + eps) * 2.0) * 0.3 +
          noise3(xPos * 4.0, (yPos + eps) * 4.0) * 0.2 +
          noise4(xPos * 8.0, (yPos + eps) * 8.0) * 0.1;

        // Calculate gradient to get normal vector
        const dx = (heightR - height) * 0.5;
        const dy = (heightU - height) * 0.5;
        const dz = 1.0;

        // Normalize the normal vector
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = dx / length;
        const ny = dy / length;
        const nz = dz / length;

        // Normal map encoding: RGB = (N.x, N.y, N.z) mapped from [-1, 1] to [0, 255]
        data[idx] = (nx * 0.5 + 0.5) * 255; // R = X
        data[idx + 1] = (ny * 0.5 + 0.5) * 255; // G = Y
        data[idx + 2] = (nz * 0.5 + 0.5) * 255; // B = Z
        data[idx + 3] = 255; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Create water object
  const water = useMemo(() => {
    if (!waterNormals) return null;

    const waterGeometry = new THREE.PlaneGeometry(lakeSize, lakeSize);

    const waterObj = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(
        sunDirectionX,
        sunDirectionY,
        sunDirectionZ
      ),
      sunColor: sunColor,
      waterColor: waterColor,
      distortionScale: distortionScale,
      fog: scene.fog !== undefined,
    });

    waterObj.rotation.x = -Math.PI / 2;

    return waterObj;
  }, [
    lakeSize,
    waterNormals,
    sunColor,
    waterColor,
    distortionScale,
    scene,
    sunDirectionX,
    sunDirectionY,
    sunDirectionZ,
  ]);

  // Store reference for animation
  useEffect(() => {
    waterRef.current = water;
  }, [water]);

  // Update water uniforms from controls
  useEffect(() => {
    if (!waterRef.current) return;

    const water = waterRef.current;
    if (water.material.uniforms) {
      if (water.material.uniforms.sunColor) {
        water.material.uniforms.sunColor.value.setHex(sunColor);
      }
      if (water.material.uniforms.waterColor) {
        water.material.uniforms.waterColor.value.setHex(waterColor);
      }
      if (water.material.uniforms.distortionScale) {
        water.material.uniforms.distortionScale.value = distortionScale;
      }
      if (water.material.uniforms.sunDirection) {
        water.material.uniforms.sunDirection.value.set(
          sunDirectionX,
          sunDirectionY,
          sunDirectionZ
        );
      }
    }
  }, [
    sunColor,
    waterColor,
    distortionScale,
    sunDirectionX,
    sunDirectionY,
    sunDirectionZ,
  ]);

  // Animate water
  useFrame((state, delta) => {
    if (waterRef.current && waterRef.current.material.uniforms) {
      if (waterRef.current.material.uniforms.time) {
        waterRef.current.material.uniforms.time.value += delta;
      }
    }
  });

  if (!lakeEnabled || !water) {
    return null;
  }

  return (
    <primitive
      object={water}
      position={[lakePositionX, lakePositionY, lakePositionZ]}
      {...props}
    />
  );
};
