import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGlobalWind } from "./GlobalWindProvider";

interface WindFlagProps {
  position?: [number, number, number];
  scale?: number;
  flagColor?: string;
  poleHeight?: number;
  flagWidth?: number;
  flagHeight?: number;
  segments?: number;
  useTexture?: boolean;
  texturePath?: string;
  textureQuality?: number;
  waveIntensity?: number;
}

export const WindFlag: React.FC<WindFlagProps> = ({
  position = [0, 0, 0],
  scale = 1,
  flagColor = "#ff0000",
  poleHeight = 8,
  flagWidth = 3,
  flagHeight = 2,
  segments = 20,
  useTexture = true,
  texturePath = "/textures/flag.png",
  textureQuality = 16,
  waveIntensity = 0.8,
}) => {
  const flagRef = useRef<THREE.Mesh>(null);
  const poleRef = useRef<THREE.Mesh>(null);
  const { windUniforms } = useGlobalWind();

  // Load flag texture manually
  const [flagTexture, setFlagTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const finalTexturePath = useTexture
      ? texturePath
      : "/textures/whitesquare.png";

    textureLoader.load(
      finalTexturePath,
      (texture) => {
        // High quality texture settings
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = textureQuality; // Configurable anisotropy for quality
        texture.flipY = true; // Flip texture to correct orientation
        setFlagTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load flag texture:", error);
        // Create a high-quality fallback white texture
        const canvas = document.createElement("canvas");
        canvas.width = 256; // Higher resolution fallback
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 256, 256);
          const fallbackTexture = new THREE.CanvasTexture(canvas);
          fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
          fallbackTexture.magFilter = THREE.LinearFilter;
          fallbackTexture.generateMipmaps = true;
          fallbackTexture.anisotropy = textureQuality;
          setFlagTexture(fallbackTexture);
        }
      }
    );
  }, [useTexture, texturePath, textureQuality]);

  // Create flag geometry with high segment count for smooth waving
  const flagGeometry = useMemo(() => {
    const widthSegments = Math.max(segments, 40); // Minimum 40 for smoothness
    const heightSegments = Math.max(segments, 30); // Minimum 30 for smoothness
    const geometry = new THREE.PlaneGeometry(
      flagWidth,
      flagHeight,
      widthSegments,
      heightSegments
    );

    return geometry;
  }, [flagWidth, flagHeight, segments]);

  // Create flag material with wind shader and texture
  const flagMaterial = useMemo(() => {
    // Create a high-quality fallback white texture
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    let fallbackTexture;
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
      fallbackTexture.magFilter = THREE.LinearFilter;
      fallbackTexture.generateMipmaps = true;
      fallbackTexture.anisotropy = textureQuality;
    } else {
      fallbackTexture = new THREE.TextureLoader().load(
        "/textures/whitesquare.png"
      );
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_windNoiseScale: { value: 1.0 },
        u_windNoiseSpeed: { value: 1.0 },
        u_windNoiseAmplitude: { value: 1.0 },
        u_flagColor: { value: new THREE.Color(flagColor) },
        u_windStrength: { value: waveIntensity },
        u_flagTexture: { value: flagTexture || fallbackTexture },
        u_useTexture: { value: useTexture },
      },
      vertexShader: `
         uniform float u_time;
         uniform float u_windNoiseScale;
         uniform float u_windNoiseSpeed;
         uniform float u_windNoiseAmplitude;
         uniform float u_windStrength;
         
         varying vec2 vUv;
         varying vec3 vNormal;
         varying vec3 vWorldPosition;
         varying float vWaveIntensity;
         
         // Improved noise function (from WavingFlag)
         float noise(vec2 p) {
           vec2 i = floor(p);
           vec2 f = fract(p);
           f = f * f * (3.0 - 2.0 * f);
           
           float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
           float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
           float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
           float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
           
           return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
         }
         
         void main() {
           vUv = uv;
           
           // Calculate how far from the pole (0 = attached to pole, 1 = free edge)
           float distanceFromPole = uv.x;
           
           // Wave effect: more movement at the free edge (quadratic falloff)
           float waveAmount = distanceFromPole * distanceFromPole;
           
           // Create horizontal wave along the flag (more gentle)
           float horizontalWave = sin(uv.x * 2.0 + u_time * u_windNoiseSpeed) * waveAmount;
           
           // Add vertical ripple (more gentle)
           float verticalWave = sin(uv.y * 3.0 + u_time * u_windNoiseSpeed * 0.8) * waveAmount * 0.3;
           
           // Combine with noise for natural movement (reduced intensity)
           float noiseValue = noise(vec2(uv.x * 2.0 + u_time * u_windNoiseSpeed * 0.5, uv.y * 2.0));
           float noiseWave = (noiseValue - 0.5) * waveAmount * 0.5;
           
           // Total displacement
           vec3 pos = position;
           
           // Apply wind displacement (much more subtle)
           pos.z += (horizontalWave + noiseWave) * u_windNoiseAmplitude * u_windStrength * 0.3;
           pos.y += verticalWave * u_windNoiseAmplitude * u_windStrength * 0.15;
           
           // Add gentle forward lean from wind (very subtle)
           pos.z += waveAmount * u_windNoiseAmplitude * u_windStrength * 0.1;
           
           // Store wave intensity for fragment shader (for shading)
           vWaveIntensity = abs(horizontalWave + verticalWave);
           
           // Calculate normals for lighting (approximate)
           vNormal = normalize(normalMatrix * normal);
           
           // Transform to world position
           vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
           vWorldPosition = worldPosition.xyz;
           
           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
         }
       `,
      fragmentShader: `
         uniform vec3 u_flagColor;
         uniform sampler2D u_flagTexture;
         uniform bool u_useTexture;
         varying vec2 vUv;
         varying vec3 vNormal;
         varying vec3 vWorldPosition;
         varying float vWaveIntensity;
         
         // sRGB to Linear conversion (for proper color in Three.js r180+)
         vec3 sRGBToLinear(vec3 srgb) {
           return pow(srgb, vec3(2.2));
         }
         
         void main() {
           vec3 color;
           
           if (u_useTexture) {
             // Sample the flag texture
             vec4 textureColor = texture2D(u_flagTexture, vUv);
             // Convert from sRGB to linear space for proper lighting
             vec3 linearColor = sRGBToLinear(textureColor.rgb);
             // Mix texture with flag color for customization
             color = mix(linearColor, u_flagColor, 0.3);
           } else {
             // Use solid color
             color = u_flagColor;
           }
           
           // Simple lighting calculation (can be enhanced with scene lights)
           vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
           float diffuse = max(dot(vNormal, lightDir), 0.0);
           float ambient = 0.6;
           float lighting = ambient + diffuse * 1.5;
           
           // Very subtle wave shading
           float waveDarkening = 1.0 - vWaveIntensity * 0.02;
           
           // Final color with lighting and wave shading
           color = color * lighting * waveDarkening * 1.2;
           
           gl_FragColor = vec4(color, 1.0);
         }
       `,
      side: THREE.DoubleSide,
      transparent: false,
      alphaTest: 0.1,
    });

    return material;
  }, [flagColor, useTexture, textureQuality, waveIntensity]);

  // Custom depth material for proper animated shadows
  const depthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_windNoiseScale: { value: 1.0 },
        u_windNoiseSpeed: { value: 1.0 },
        u_windNoiseAmplitude: { value: 1.0 },
        u_windStrength: { value: waveIntensity },
      },
      vertexShader: `
        uniform float u_time;
        uniform float u_windNoiseScale;
        uniform float u_windNoiseSpeed;
        uniform float u_windNoiseAmplitude;
        uniform float u_windStrength;
        
        // Improved noise function (same as main material)
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
          float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
          float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          // Calculate how far from the pole (0 = attached to pole, 1 = free edge)
          float distanceFromPole = uv.x;
          
          // Wave effect: more movement at the free edge (quadratic falloff)
          float waveAmount = distanceFromPole * distanceFromPole;
          
          // Create horizontal wave along the flag (more gentle)
          float horizontalWave = sin(uv.x * 2.0 + u_time * u_windNoiseSpeed) * waveAmount;
          
          // Add vertical ripple (more gentle)
          float verticalWave = sin(uv.y * 3.0 + u_time * u_windNoiseSpeed * 0.8) * waveAmount * 0.3;
          
          // Combine with noise for natural movement (reduced intensity)
          float noiseValue = noise(vec2(uv.x * 2.0 + u_time * u_windNoiseSpeed * 0.5, uv.y * 2.0));
          float noiseWave = (noiseValue - 0.5) * waveAmount * 0.5;
          
          // Total displacement
          vec3 pos = position;
          
          // Apply wind displacement (much more subtle)
          pos.z += (horizontalWave + noiseWave) * u_windNoiseAmplitude * u_windStrength * 0.3;
          pos.y += verticalWave * u_windNoiseAmplitude * u_windStrength * 0.15;
          
          // Add gentle forward lean from wind (very subtle)
          pos.z += waveAmount * u_windNoiseAmplitude * u_windStrength * 0.1;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        void main() {
          gl_FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
        }
      `,
    });
  }, [waveIntensity]);

  // Update texture when it loads
  useEffect(() => {
    if (flagMaterial && flagTexture) {
      flagMaterial.uniforms.u_flagTexture.value = flagTexture;
    }
  }, [flagMaterial, flagTexture]);

  // Create pole geometry
  const poleGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.05, 0.05, poleHeight, 8);
  }, [poleHeight]);

  // Create pole material
  const poleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#8B4513", // Brown wood color
      roughness: 0.8,
      metalness: 0.1,
    });
  }, []);

  // Update flag material uniforms from global wind
  useFrame(() => {
    if (flagMaterial && windUniforms) {
      flagMaterial.uniforms.u_time.value = windUniforms.u_time.value;
      flagMaterial.uniforms.u_windNoiseScale.value =
        windUniforms.u_windNoiseScale.value;
      flagMaterial.uniforms.u_windNoiseSpeed.value =
        windUniforms.u_windNoiseSpeed.value;
      flagMaterial.uniforms.u_windNoiseAmplitude.value =
        windUniforms.u_windNoiseAmplitude.value;
    }

    // Update depth material for animated shadows
    if (depthMaterial && windUniforms) {
      depthMaterial.uniforms.u_time.value = windUniforms.u_time.value;
      depthMaterial.uniforms.u_windNoiseScale.value =
        windUniforms.u_windNoiseScale.value;
      depthMaterial.uniforms.u_windNoiseSpeed.value =
        windUniforms.u_windNoiseSpeed.value;
      depthMaterial.uniforms.u_windNoiseAmplitude.value =
        windUniforms.u_windNoiseAmplitude.value;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Flag Pole */}
      <mesh
        ref={poleRef}
        geometry={poleGeometry}
        material={poleMaterial}
        position={[0, poleHeight / 2, 0]}
        castShadow
      />

      {/* Flag */}
      <mesh
        ref={flagRef}
        geometry={flagGeometry}
        material={flagMaterial}
        customDepthMaterial={depthMaterial}
        position={[flagWidth / 2, poleHeight - flagHeight / 2, 0]}
        castShadow
      />

      {/* Flag pole top */}
      <mesh position={[0, poleHeight, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
};

export default WindFlag;
