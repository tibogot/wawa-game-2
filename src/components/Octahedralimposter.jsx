import React, { useRef, useMemo, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * OctahedralImposter Component
 * Creates an imposter representation of a GLB model by rendering it from 8 octahedral directions
 *
 * @param {string} glbPath - Path to the GLB file
 * @param {number} textureSize - Resolution of each captured view (default: 512)
 * @param {boolean} billboard - Whether the imposter should face the camera (default: false)
 * @param {number} scale - Scale multiplier for the imposter (default: 1)
 */
export function OctahedralImposter({
  glbPath,
  textureSize = 2048,
  billboard = false,
  scale = 1,
  ...props
}) {
  const { gl, scene: mainScene, camera } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();
  const [imposterData, setImposterData] = useState(null);

  // Load the GLB model
  const gltf = useGLTF(glbPath);

  // The 8 octahedral directions
  const directions = useMemo(
    () => [
      new THREE.Vector3(1, 1, 1).normalize(),
      new THREE.Vector3(-1, 1, 1).normalize(),
      new THREE.Vector3(1, -1, 1).normalize(),
      new THREE.Vector3(-1, -1, 1).normalize(),
      new THREE.Vector3(1, 1, -1).normalize(),
      new THREE.Vector3(-1, 1, -1).normalize(),
      new THREE.Vector3(1, -1, -1).normalize(),
      new THREE.Vector3(-1, -1, -1).normalize(),
    ],
    []
  );

  // Generate imposter textures
  useEffect(() => {
    if (!gltf) return;

    const model = gltf.scene.clone();

    // Convert all materials to MeshBasicMaterial for reliable capture
    model.traverse((child) => {
      if (child.isMesh) {
        const originalMat = child.material;

        // Create a basic material that will capture the color/texture reliably
        if (Array.isArray(originalMat)) {
          child.material = originalMat.map(mat => {
            const basicMat = new THREE.MeshBasicMaterial();
            if (mat.map) basicMat.map = mat.map;
            if (mat.color) basicMat.color.copy(mat.color);
            // Preserve transparency settings
            basicMat.transparent = mat.transparent || mat.alphaTest > 0;
            basicMat.alphaTest = mat.alphaTest;
            basicMat.side = mat.side;
            return basicMat;
          });
        } else {
          const basicMat = new THREE.MeshBasicMaterial();
          if (originalMat.map) basicMat.map = originalMat.map;
          if (originalMat.color) basicMat.color.copy(originalMat.color);
          // Preserve transparency settings
          basicMat.transparent = originalMat.transparent || originalMat.alphaTest > 0;
          basicMat.alphaTest = originalMat.alphaTest;
          basicMat.side = originalMat.side;
          child.material = basicMat;
        }

        child.visible = true;
        child.frustumCulled = false;
      }
    });

    // Calculate bounding box and sphere
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const radius = maxDim / 2;

    // Center the model
    model.position.sub(center);

    // Create a temporary scene for rendering
    const captureScene = new THREE.Scene();
    // Transparent background - null means no background (transparent)
    captureScene.background = null;
    captureScene.add(model);

    // No lighting needed for MeshBasicMaterial - it already shows full color
    // We removed lights to match the bright appearance of the original tree

    // Create perspective camera for capturing (simpler to reason about)
    const distance = maxDim * 1.5;
    const captureCamera = new THREE.PerspectiveCamera(50, 1, 0.1, distance * 3);

    const textures = [];

    // Render from each direction
    directions.forEach((direction) => {
      // Create a NEW render target for each direction with better quality settings
      const renderTarget = new THREE.WebGLRenderTarget(textureSize, textureSize, {
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: true,
        samples: 4, // Enable MSAA for antialiasing
      });

      captureCamera.position.copy(direction.clone().multiplyScalar(distance));
      captureCamera.lookAt(0, 0, 0);
      captureCamera.updateMatrixWorld();

      gl.setRenderTarget(renderTarget);
      gl.clear(true, true, true);
      gl.render(captureScene, captureCamera);

      // Read pixels to create a proper texture
      const buffer = new Uint8Array(textureSize * textureSize * 4);
      gl.readRenderTargetPixels(renderTarget, 0, 0, textureSize, textureSize, buffer);

      gl.setRenderTarget(null);

      // Create a DataTexture from the pixel data with mipmaps
      const texture = new THREE.DataTexture(
        buffer,
        textureSize,
        textureSize,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.flipY = false;

      textures.push(texture);

      // Dispose of the render target after reading
      renderTarget.dispose();
    });

    // Cleanup capture scene geometry/materials
    captureScene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // Calculate the Y offset needed to place the bottom at ground level
    // The model is centered, so we need to know where the bottom was originally
    const bottomY = box.min.y; // Original bottom position before centering
    const yOffset = -bottomY; // Offset needed to put bottom at y=0

    setImposterData({
      textures,
      size: maxDim,
      radius,
      yOffset, // Add this so we can use it for positioning
    });
  }, [gltf, gl, directions, textureSize]);

  // Custom shader material for the imposter
  const shaderMaterial = useMemo(() => {
    if (!imposterData) return null;

    return new THREE.ShaderMaterial({
      uniforms: {
        map0: { value: imposterData.textures[0] },
        map1: { value: imposterData.textures[1] },
        map2: { value: imposterData.textures[2] },
        map3: { value: imposterData.textures[3] },
        map4: { value: imposterData.textures[4] },
        map5: { value: imposterData.textures[5] },
        map6: { value: imposterData.textures[6] },
        map7: { value: imposterData.textures[7] },
        dir0: { value: directions[0] },
        dir1: { value: directions[1] },
        dir2: { value: directions[2] },
        dir3: { value: directions[3] },
        dir4: { value: directions[4] },
        dir5: { value: directions[5] },
        dir6: { value: directions[6] },
        dir7: { value: directions[7] },
        uCameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map0;
        uniform sampler2D map1;
        uniform sampler2D map2;
        uniform sampler2D map3;
        uniform sampler2D map4;
        uniform sampler2D map5;
        uniform sampler2D map6;
        uniform sampler2D map7;
        
        uniform vec3 dir0;
        uniform vec3 dir1;
        uniform vec3 dir2;
        uniform vec3 dir3;
        uniform vec3 dir4;
        uniform vec3 dir5;
        uniform vec3 dir6;
        uniform vec3 dir7;
        
        uniform vec3 uCameraPosition;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        
        void main() {
          vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
          
          // Find the best matching direction
          float maxDot = dot(viewDir, dir0);
          int bestIndex = 0;
          
          float d1 = dot(viewDir, dir1);
          if (d1 > maxDot) { maxDot = d1; bestIndex = 1; }
          
          float d2 = dot(viewDir, dir2);
          if (d2 > maxDot) { maxDot = d2; bestIndex = 2; }
          
          float d3 = dot(viewDir, dir3);
          if (d3 > maxDot) { maxDot = d3; bestIndex = 3; }
          
          float d4 = dot(viewDir, dir4);
          if (d4 > maxDot) { maxDot = d4; bestIndex = 4; }
          
          float d5 = dot(viewDir, dir5);
          if (d5 > maxDot) { maxDot = d5; bestIndex = 5; }
          
          float d6 = dot(viewDir, dir6);
          if (d6 > maxDot) { maxDot = d6; bestIndex = 6; }
          
          float d7 = dot(viewDir, dir7);
          if (d7 > maxDot) { maxDot = d7; bestIndex = 7; }
          
          // Blend between the two best matching views for smoother transitions
          float secondBestDot = -1.0;
          int secondBestIndex = 0;

          // Find second best view
          for (int i = 0; i < 8; i++) {
            if (i == bestIndex) continue;
            float d = 0.0;
            if (i == 0) d = dot(viewDir, dir0);
            else if (i == 1) d = dot(viewDir, dir1);
            else if (i == 2) d = dot(viewDir, dir2);
            else if (i == 3) d = dot(viewDir, dir3);
            else if (i == 4) d = dot(viewDir, dir4);
            else if (i == 5) d = dot(viewDir, dir5);
            else if (i == 6) d = dot(viewDir, dir6);
            else if (i == 7) d = dot(viewDir, dir7);

            if (d > secondBestDot) {
              secondBestDot = d;
              secondBestIndex = i;
            }
          }

          // Calculate blend factor
          float blendFactor = smoothstep(0.7, 1.0, maxDot);

          // Sample both textures
          vec4 color1, color2;
          if (bestIndex == 0) color1 = texture2D(map0, vUv);
          else if (bestIndex == 1) color1 = texture2D(map1, vUv);
          else if (bestIndex == 2) color1 = texture2D(map2, vUv);
          else if (bestIndex == 3) color1 = texture2D(map3, vUv);
          else if (bestIndex == 4) color1 = texture2D(map4, vUv);
          else if (bestIndex == 5) color1 = texture2D(map5, vUv);
          else if (bestIndex == 6) color1 = texture2D(map6, vUv);
          else color1 = texture2D(map7, vUv);

          if (secondBestIndex == 0) color2 = texture2D(map0, vUv);
          else if (secondBestIndex == 1) color2 = texture2D(map1, vUv);
          else if (secondBestIndex == 2) color2 = texture2D(map2, vUv);
          else if (secondBestIndex == 3) color2 = texture2D(map3, vUv);
          else if (secondBestIndex == 4) color2 = texture2D(map4, vUv);
          else if (secondBestIndex == 5) color2 = texture2D(map5, vUv);
          else if (secondBestIndex == 6) color2 = texture2D(map6, vUv);
          else color2 = texture2D(map7, vUv);

          // Blend between views
          vec4 color = mix(color2, color1, blendFactor);

          // Discard fully transparent pixels
          if (color.a < 0.01) discard;

          gl_FragColor = color;
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
  }, [imposterData, directions]);

  // Update camera position uniform
  useFrame(({ camera }) => {
    if (materialRef.current && imposterData) {
      materialRef.current.uniforms.uCameraPosition.value.copy(camera.position);

      // Billboard behavior
      if (billboard && meshRef.current) {
        meshRef.current.quaternion.copy(camera.quaternion);
      }
    }
  });

  // TEMP: if textures aren't ready yet, render a visible red debug quad
  if (!imposterData) {
    return (
      <mesh ref={meshRef} scale={scale} {...props}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  // Apply Y offset to position the bottom at ground level
  const adjustedPosition = props.position || [0, 0, 0];
  const finalPosition = [
    adjustedPosition[0],
    adjustedPosition[1] + imposterData.yOffset * scale,
    adjustedPosition[2]
  ];

  return (
    <mesh ref={meshRef} scale={scale} position={finalPosition}>
      <planeGeometry args={[imposterData.size, imposterData.size]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Preload helper
OctahedralImposter.preload = (glbPath) => useGLTF.preload(glbPath);

export default OctahedralImposter;
