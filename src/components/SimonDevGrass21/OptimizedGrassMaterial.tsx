import { useMemo, useRef, useCallback } from "react";
import * as THREE from "three";
import { useGlobalWind } from "../GlobalWindProvider";

// Material cache to avoid recreating materials
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

interface MaterialConfig {
  enableDebugShader: boolean;
  enableDebugVertex: boolean;
  enableNormalMap: boolean;
  normalMapTexture: THREE.Texture | null;
  enableBaseToTipGradient: boolean;
  baseColor: string;
  tipColor: string;
  gradientShaping: number;
  enableNormalBlending: boolean;
  terrainBlendStart: number;
  terrainBlendEnd: number;
  enableAmbientOcclusion: boolean;
  grassDensity: number;
  aoStrength: number;
  aoHeightPower: number;
  aoDebugMode: boolean;
  enableWindMovement: boolean;
  windStrength: number;
  windSpeed: number;
  grassHeight: number;
  windNoiseScale: number;
  windNoiseSpeed: number;
  windNoiseAmplitude: number;
  enablePlayerInteraction: boolean;
  playerInteractionRadius: number;
  playerInteractionStrength: number;
  playerInteractionRepel: boolean;
  characterPosition: THREE.Vector3 | null;
}

export const useOptimizedGrassMaterial = (config: MaterialConfig) => {
  const { windUniforms } = useGlobalWind();
  const uniformUpdateQueue = useRef<THREE.MeshStandardMaterial[]>([]);
  const lastUpdateTime = useRef(0);

  // Create cache key for material
  const createCacheKey = useCallback((config: MaterialConfig): string => {
    return JSON.stringify({
      enableDebugShader: config.enableDebugShader,
      enableDebugVertex: config.enableDebugVertex,
      enableNormalMap: config.enableNormalMap,
      enableBaseToTipGradient: config.enableBaseToTipGradient,
      baseColor: config.baseColor,
      tipColor: config.tipColor,
      gradientShaping: config.gradientShaping,
      enableNormalBlending: config.enableNormalBlending,
      terrainBlendStart: config.terrainBlendStart,
      terrainBlendEnd: config.terrainBlendEnd,
      enableAmbientOcclusion: config.enableAmbientOcclusion,
      grassDensity: config.grassDensity,
      aoStrength: config.aoStrength,
      aoHeightPower: config.aoHeightPower,
      aoDebugMode: config.aoDebugMode,
      enableWindMovement: config.enableWindMovement,
      windStrength: config.windStrength,
      windSpeed: config.windSpeed,
      grassHeight: config.grassHeight,
      windNoiseScale: config.windNoiseScale,
      windNoiseSpeed: config.windNoiseSpeed,
      windNoiseAmplitude: config.windNoiseAmplitude,
      enablePlayerInteraction: config.enablePlayerInteraction,
      playerInteractionRadius: config.playerInteractionRadius,
      playerInteractionStrength: config.playerInteractionStrength,
      playerInteractionRepel: config.playerInteractionRepel,
    });
  }, []);

  // Batched uniform updates to reduce per-frame overhead
  const updateUniforms = useCallback(() => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // 60fps max
    lastUpdateTime.current = now;

    uniformUpdateQueue.current.forEach((material) => {
      if (material.userData.shader) {
        const shader = material.userData.shader;

        // Update time uniform
        if (shader.uniforms.u_time) {
          shader.uniforms.u_time.value = windUniforms.u_time.value;
        }

        // Update player position
        if (
          config.enablePlayerInteraction &&
          config.characterPosition &&
          shader.uniforms.u_playerPosition
        ) {
          shader.uniforms.u_playerPosition.value.copy(config.characterPosition);
        }

        // Update wind uniforms
        if (shader.uniforms.u_windNoiseScale) {
          shader.uniforms.u_windNoiseScale.value =
            windUniforms.u_windNoiseScale.value;
        }
        if (shader.uniforms.u_windNoiseSpeed) {
          shader.uniforms.u_windNoiseSpeed.value =
            windUniforms.u_windNoiseSpeed.value;
        }
        if (shader.uniforms.u_windNoiseAmplitude) {
          shader.uniforms.u_windNoiseAmplitude.value =
            windUniforms.u_windNoiseAmplitude.value;
        }
      }
    });
  }, [config, windUniforms]);

  // Register material for uniform updates
  const registerMaterial = useCallback(
    (material: THREE.MeshStandardMaterial) => {
      if (!uniformUpdateQueue.current.includes(material)) {
        uniformUpdateQueue.current.push(material);
      }
    },
    []
  );

  // Unregister material from uniform updates
  const unregisterMaterial = useCallback(
    (material: THREE.MeshStandardMaterial) => {
      const index = uniformUpdateQueue.current.indexOf(material);
      if (index > -1) {
        uniformUpdateQueue.current.splice(index, 1);
      }
    },
    []
  );

  const material = useMemo(() => {
    const cacheKey = createCacheKey(config);

    if (materialCache.has(cacheKey)) {
      const cachedMaterial = materialCache.get(cacheKey)!;
      registerMaterial(cachedMaterial);
      return cachedMaterial;
    }

    const newMaterial = new THREE.MeshStandardMaterial({
      color: "#4a9d3f",
      side: THREE.DoubleSide,
      normalMap: config.enableNormalMap ? config.normalMapTexture : null,
    });

    // Optimized shader compilation with reduced variants
    newMaterial.onBeforeCompile = (shader) => {
      // Pre-compile shader variants to avoid runtime compilation
      const shaderKey = `${cacheKey}-${config.enableWindMovement}-${config.enablePlayerInteraction}`;

      // Add uniforms
      shader.uniforms.u_resolution = {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      };
      shader.uniforms.u_time = windUniforms.u_time;
      shader.uniforms.u_playerPosition = {
        value: config.characterPosition
          ? config.characterPosition.clone()
          : new THREE.Vector3(0, 0, 0),
      };
      shader.uniforms.u_playerInteractionRadius = {
        value: config.playerInteractionRadius,
      };
      shader.uniforms.u_playerInteractionStrength = {
        value: config.playerInteractionStrength,
      };
      shader.uniforms.u_playerInteractionRepel = {
        value: config.playerInteractionRepel,
      };
      shader.uniforms.u_windNoiseScale = { value: config.windNoiseScale };
      shader.uniforms.u_windNoiseSpeed = { value: config.windNoiseSpeed };
      shader.uniforms.u_windNoiseAmplitude = {
        value: config.windNoiseAmplitude,
      };

      // Store shader reference
      newMaterial.userData.shader = shader;

      // Use the exact same shader structure as v20 (which works perfectly)
      // Add billboarding to make grass blades face the camera
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `
        #include <beginnormal_vertex>
        `
      );

      // Prepare combined shader injection for all effects (exact copy from v20)
      let combinedBeginVertexCode = `
        #include <begin_vertex>
        
        // Calculate instance world position ONCE (transform from tile-local to world space)
        // This is used by view-space thickening, wind, and player interaction
        vec3 instanceLocalPos = vec3(instanceMatrix[3].xyz);
        vec4 instancePosWorld = modelMatrix * vec4(instanceLocalPos, 1.0);
        vec3 instanceWorldPos = instancePosWorld.xyz;
        
        // View-space thickening: Prevents grass from disappearing when viewed edge-on
        // Much cheaper than billboarding (uses dot product instead of trig functions)
        
        // Get camera position in world space (from view matrix inverse)
        vec3 camPos = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        
        // Get view direction from camera to instance (world space)
        vec3 viewDir = normalize(camPos - instanceWorldPos);
        
        // Grass face normal in world space (transform X axis from instance matrix)
        vec3 grassFaceNormalLocal = normalize(vec3(instanceMatrix[0].xyz));
        vec3 grassFaceNormal = normalize((modelMatrix * vec4(grassFaceNormalLocal, 0.0)).xyz);
        
        // Calculate how edge-on we're viewing the grass (dot product in XZ plane)
        float viewDotNormal = clamp(dot(normalize(grassFaceNormal.xz), normalize(viewDir.xz)), 0.0, 1.0);
        
        // Calculate thickening factor: high when edge-on (low dot), low when facing camera
        float viewSpaceThickenFactor = pow(1.0 - viewDotNormal, 4.0);
        
        // Thin out again when perfectly orthogonal to avoid visual artifacts
        viewSpaceThickenFactor *= smoothstep(0.0, 0.2, viewDotNormal);
        
        // Get X direction and width from original local position
        float xDirection = position.x > 0.0 ? 1.0 : -1.0;
        float grassWidth = abs(position.x);
        
        // Apply thickening by pushing vertices outward along X axis in local space
        transformed.x += viewSpaceThickenFactor * xDirection * grassWidth * 0.3;
      `;

      // Add wind movement functions to common section if needed (exact copy from v20)
      if (config.enableWindMovement || config.enablePlayerInteraction) {
        // Add time uniform (wind noise uniforms already added in common section)
        shader.uniforms.u_time = { value: 0.0 };

        // Add noise function and wind movement to vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform float u_time;
          uniform float u_windNoiseScale;
          uniform float u_windNoiseSpeed;
          uniform float u_windNoiseAmplitude;
          
          // Instanced attribute for wind influence (per blade)
          attribute float windInfluence;
          
          // Simple noise function for wind
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = noise(i);
            float b = noise(i + vec2(1.0, 0.0));
            float c = noise(i + vec2(0.0, 1.0));
            float d = noise(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          // Rotation matrices for wind movement
          mat3 rotateX(float angle) {
            float s = sin(angle);
            float c = cos(angle);
            return mat3(
              1.0, 0.0, 0.0,
              0.0, c, -s,
              0.0, s, c
            );
          }
          
          mat3 rotateY(float angle) {
            float s = sin(angle);
            float c = cos(angle);
            return mat3(
              c, 0.0, s,
              0.0, 1.0, 0.0,
              -s, 0.0, c
            );
          }
          
          // Rotate around arbitrary axis (for wind) - like Quick_Grass!
          mat3 rotateAxis(vec3 axis, float angle) {
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;
            
            float x = axis.x;
            float y = axis.y;
            float z = axis.z;
            
            return mat3(
              x*x*oc + c,    x*y*oc - z*s,  x*z*oc + y*s,
              x*y*oc + z*s,  y*y*oc + c,    y*z*oc - x*s,
              x*z*oc - y*s,  y*z*oc + x*s,  z*z*oc + c
            );
          }
          `
        );
      }

      // Add wind movement logic to combined code (exact copy from v20)
      if (config.enableWindMovement) {
        combinedBeginVertexCode += `
          
          // SimonDev's initial curve system - applied BEFORE wind
          // Use instanceWorldPos (already calculated at the top) for consistent randomness and wind patterns
          // Generate per-blade hash for consistent randomness (use world position for consistency across tiles)
          float perBladeHash = fract(sin(dot(instanceWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
          
          // Generate random lean amount (-0.3 to 0.3)
          float randomLean = (perBladeHash - 0.5) * 0.6;
          
          // Apply initial curve based on vertex height (stronger at tips)
          float heightPercent = transformed.y / ${config.grassHeight.toFixed(
            1
          )};
          float curveAmount = randomLean * heightPercent;
          
          // Apply curve rotation around X-axis (forward/backward bend)
          mat3 curveMat = rotateX(curveAmount);
          transformed = curveMat * transformed;
          transformedNormal = curveMat * transformedNormal;
          
          // Apply wind movement - only if enabled and windInfluence attribute exists
          if (${
            config.enableWindMovement ? "true" : "false"
          } && windInfluence > 0.0) {
            // Use world position for noise sampling - ensures consistent wind patterns across all tiles
            vec3 worldPos = instanceWorldPos;
            
            // SimonDev's approach: Multiple noise samples for wind system
            
            // 1. First noise sample for subtle movement (add to curve)
            float subtleNoise = smoothNoise(vec2(u_time * ${config.windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed) + worldPos.xz * u_windNoiseScale);
            subtleNoise *= u_windNoiseAmplitude;
            
            // 2. Wind direction sample - remap to 0-360 degrees (0 to 2PI)
            float windDirNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.05 + u_time * ${config.windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed * 0.05);
            float windDirection = windDirNoise; // Will remap below
            
            // 3. Wind strength sample - different spatial frequency
            float windStrengthNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.25 + u_time * ${config.windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed);
            windStrengthNoise *= u_windNoiseAmplitude;
            
            // Remap wind direction to 0-360 degrees (0 to 2PI radians)
            windDirection = windDirection * 0.5 + 0.5; // -1,1 to 0,1
            windDirection *= 6.28318; // 0,1 to 0,2PI (360 degrees)
            
            // Calculate final wind strength based on height and wind influence
            float heightPercent = transformed.y / ${config.grassHeight.toFixed(
              1
            )};
            float windStrength = windStrengthNoise * ${config.windStrength.toFixed(
              2
            )} * heightPercent * windInfluence;
            
            // Apply wind movement with proper wave pattern
            // Create floppy grass effect using vertex height for flexibility
            float vertexHeight = transformed.y; // Current vertex height (0 = base, max = tip)
            float bladeLength = ${config.grassHeight.toFixed(
              1
            )}; // Total blade length
            
            // Calculate flexibility factor: base is stiff (0), tip is floppy (1)
            float flexibilityFactor = vertexHeight / bladeLength;
            flexibilityFactor = pow(flexibilityFactor, 1.5); // Curve the flexibility for more natural bend
            
            // Apply rotation-based wind bending around the blade BASE - NO STRETCHING!
            // WHOLE BLADE rotates as one unit around its base
            // Use wind direction to determine rotation axis and amount
            
            // Convert wind direction to rotation components
            float windRotationX = sin(windDirection) * windStrength * 0.5; // Forward-back rotation
            float windRotationY = cos(windDirection) * windStrength * 0.8; // Side-to-side rotation
            
            // Create rotation matrices
            mat3 rotX = rotateX(windRotationX);
            mat3 rotY = rotateY(windRotationY);
            
            // Rotate around the blade BASE (Y=0) - ALL vertices rotate the same amount
            vec3 basePoint = vec3(0.0, 0.0, 0.0); // Blade base
            vec3 offsetFromBase = transformed - basePoint;
            
            // Apply rotations around the base - SAME rotation for all vertices
            offsetFromBase = rotY * offsetFromBase;
            offsetFromBase = rotX * offsetFromBase;
            
            // Apply the same rotations to normals for proper lighting
            transformedNormal = rotY * transformedNormal;
            transformedNormal = rotX * transformedNormal;
            
            // Move back to final position
            transformed = basePoint + offsetFromBase;
          }
        `;
      }

      // Add player interaction uniforms to common section if needed (exact copy from v20)
      if (config.enablePlayerInteraction) {
        // Add player interaction uniforms to vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform vec3 u_playerPosition;
          uniform float u_playerInteractionRadius;
          uniform float u_playerInteractionStrength;
          uniform bool u_playerInteractionRepel;
          `
        );

        // Add player interaction logic to combined code
        combinedBeginVertexCode += `
          
          // PLAYER INTERACTION - Grass bends away from OR toward player!
          if (${config.enablePlayerInteraction ? "true" : "false"}) {
            // Use instanceWorldPos (already calculated at the top) - now in WORLD SPACE ✅
            vec3 grassBladePos = instanceWorldPos;
            
            // Full 3D distance calculation
            float distToPlayer3D = distance(grassBladePos, u_playerPosition);
            // Separate Y-distance for height threshold
            float heightDiff = abs(grassBladePos.y - u_playerPosition.y);
            
            // Only affect grass if player is within reasonable height range (3 units = player height + jump)
          float heightFalloff = smoothstep(3.0, 0.0, heightDiff);
            // Regular distance falloff (now in 3D)
            float distanceFalloff = smoothstep(u_playerInteractionRadius, u_playerInteractionRadius * 0.4, distToPlayer3D);
            // Combine both falloffs
          float playerFalloff = distanceFalloff * heightFalloff;
          
          if (playerFalloff > 0.01) {
              // Calculate direction in 3D, but keep lean axis horizontal
            vec3 grassToPlayer = normalize(u_playerPosition - grassBladePos);
              // Project onto horizontal plane for consistent sideways bending
            vec3 grassToPlayerHorizontal = normalize(vec3(grassToPlayer.x, 0.0, grassToPlayer.z));
              // Create perpendicular axis (90° rotated) - grass leans sideways
            vec3 playerLeanAxis = vec3(grassToPlayerHorizontal.z, 0.0, -grassToPlayerHorizontal.x);
            
              // Lean angle increases with proximity and height
              float heightPercent = vUv.y; // Use UV coordinates for proper height calculation
            float playerLeanAngle = playerFalloff * u_playerInteractionStrength * pow(heightPercent, 1.5);
            
              // REPEL (bend away) or ATTRACT (bend toward)
            if (!u_playerInteractionRepel) {
                playerLeanAngle = -playerLeanAngle;  // Negate = attract instead of repel
              }
              
              // Apply rotation - grass bends! 🏃🌿
              // Convert to local space for rotation
              vec3 localPos = transformed;
              vec3 rotatedPos = rotateAxis(playerLeanAxis, playerLeanAngle) * localPos;
              transformed = rotatedPos;
              
              // Apply the same rotation to normals for proper lighting
              transformedNormal = rotateAxis(playerLeanAxis, playerLeanAngle) * transformedNormal;
            }
          }
        `;
      }

      // Apply the combined shader code to replace begin_vertex (exact copy from v20)
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        combinedBeginVertexCode
      );

      // Inject normal map fragment shader - blue gradient normals (exact copy from v20)
      if (config.enableNormalMap) {
        // Add normal map sampling in fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <normal_fragment>",
          `
          #include <normal_fragment>
          
          // Sample normal map for blue gradient effect
          vec4 normalMapColor = texture2D(normalMap, vUv);
          
          // Extract blue channel (Z-axis normal) for thickness
          float blueNormal = normalMapColor.b * 2.0 - 1.0; // Convert from 0-1 to -1 to 1
          
          // Create rounded normal effect
          vec3 roundedNormal = normalize(normal + vec3(0.0, 0.0, blueNormal * 0.5));
          normal = roundedNormal;
          `
        );
      }

      // Add uniforms and varyings for all color effects (exact copy from v20)
      if (
        config.enableDebugShader ||
        config.enableBaseToTipGradient ||
        config.enableAmbientOcclusion
      ) {
        // Add uniform for resolution (debug shader) - always add if any color effect is enabled
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform vec2 u_resolution;
          `
        );

        // Pre-calculate color values for GLSL injection
        let baseRgbStr = "0.0, 0.0, 0.0";
        let tipRgbStr = "0.0, 0.0, 0.0";

        if (config.enableBaseToTipGradient) {
          const baseRgb = new THREE.Color(config.baseColor);
          const tipRgb = new THREE.Color(config.tipColor);
          baseRgbStr = `${baseRgb.r.toFixed(3)}, ${baseRgb.g.toFixed(
            3
          )}, ${baseRgb.b.toFixed(3)}`;
          tipRgbStr = `${tipRgb.r.toFixed(3)}, ${tipRgb.g.toFixed(
            3
          )}, ${tipRgb.b.toFixed(3)}`;
        }

        // Combined color fragment injection (exact copy from v20)
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `
          #include <color_fragment>
          
          // Debug gradient shader
          if (${config.enableDebugShader ? "true" : "false"}) {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            vec3 debugColor = vec3(
              st.x / 0.6,                    // Red gradient (left to right)
              st.y / 1.8,                    // Green gradient (bottom to top)
              (st.x + st.y) / 1.2            // Blue gradient (diagonal)
            );
            diffuseColor.rgb = debugColor;
          }
          // Base-to-tip gradient shader
          else if (${config.enableBaseToTipGradient ? "true" : "false"}) {
            vec3 baseColour = vec3(${baseRgbStr});
            vec3 tipColour = vec3(${tipRgbStr});
            float heightPercent = vUv.y;
            float shapedHeight = pow(heightPercent, ${config.gradientShaping.toFixed(
              1
            )});
            vec3 gradientColor = mix(baseColour, tipColour, shapedHeight);
            diffuseColor.rgb = gradientColor;
          }
          
          // Ambient occlusion shader
          if (${config.enableAmbientOcclusion ? "true" : "false"}) {
            float density = ${config.grassDensity.toFixed(1)};
            float heightPercent = vUv.y;
            float aoStrength = ${config.aoStrength.toFixed(2)};
            float aoHeightPower = ${config.aoHeightPower.toFixed(1)};
            
            float aoForDensity = mix(1.0, aoStrength, density);
            float ao = mix(aoForDensity, 1.0, pow(heightPercent, aoHeightPower));
            
            if (${config.aoDebugMode ? "true" : "false"}) {
              diffuseColor.rgb = vec3(ao, 1.0 - ao, 0.0); // Red = high AO, Green = low AO
            } else {
              diffuseColor.rgb *= ao;
            }
          }
          `
        );
      }

      // Add varying for UV coordinates (needed for player interaction, normal map, and gradient)
      if (
        config.enablePlayerInteraction ||
        config.enableNormalMap ||
        config.enableBaseToTipGradient
      ) {
        // Add varying variable declaration to vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          varying vec2 vUv;
          `
        );

        // Add varying variable declaration to fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          
          varying vec2 vUv;
          `
        );

        // Pass UV coordinates in vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>
          
          vUv = uv;
          `
        );
      }
    };

    // Cache the material
    materialCache.set(cacheKey, newMaterial);
    registerMaterial(newMaterial);

    return newMaterial;
  }, [config, createCacheKey, registerMaterial, windUniforms]);

  return {
    material,
    updateUniforms,
    registerMaterial,
    unregisterMaterial,
  };
};

// Cleanup function for material cache
export const cleanupMaterialCache = () => {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
};
