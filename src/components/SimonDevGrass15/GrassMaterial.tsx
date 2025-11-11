import { useMemo } from "react";
import * as THREE from "three";

interface GrassMaterialProps {
  enableThickening: boolean;
  thicknessMultiplier: number;
  enableDebugShader: boolean;
  enableDebugVertex: boolean;
  enableNormalMap: boolean;
  normalMapTexture: THREE.Texture;
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
  enableAdvancedWind: boolean;
  windDirectionScale: number;
  windStrengthScale: number;
  windStrengthMultiplier: number;
  windDirectionX: number;
  windDirectionZ: number;
  windFrequency: number;
  windAmplitude: number;
  windTurbulence: number;
  flappingIntensity: number;
  grassHeight: number;
  // Wind Noise Controls
  windNoiseScale: number;
  windNoiseSpeed: number;
  windNoiseAmplitude: number;
  // Player Interaction
  enablePlayerInteraction: boolean;
  playerInteractionRadius: number;
  playerInteractionStrength: number;
  playerInteractionRepel: boolean;
  characterPosition?: THREE.Vector3;
}

/**
 * GrassMaterial - Material Creation with Shader Injection
 *
 * Extracted from SimonDevGrass14Simple to separate concerns
 * Contains all shader injection logic for effects, wind, colors, and debugging
 */
export const useGrassMaterial = ({
  enableThickening,
  thicknessMultiplier,
  enableDebugShader,
  enableDebugVertex,
  enableNormalMap,
  normalMapTexture,
  enableBaseToTipGradient,
  baseColor,
  tipColor,
  gradientShaping,
  enableNormalBlending,
  terrainBlendStart,
  terrainBlendEnd,
  enableAmbientOcclusion,
  grassDensity,
  aoStrength,
  aoHeightPower,
  aoDebugMode,
  enableWindMovement,
  windStrength,
  windSpeed,
  enableAdvancedWind,
  windDirectionScale,
  windStrengthScale,
  windStrengthMultiplier,
  windDirectionX,
  windDirectionZ,
  windFrequency,
  windAmplitude,
  windTurbulence,
  flappingIntensity,
  grassHeight,
  // Wind Noise Controls
  windNoiseScale,
  windNoiseSpeed,
  windNoiseAmplitude,
  // Player Interaction
  enablePlayerInteraction,
  playerInteractionRadius,
  playerInteractionStrength,
  playerInteractionRepel,
  characterPosition,
}: GrassMaterialProps) => {
  return useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#4a9d3f",
      side: THREE.DoubleSide,
      normalMap: enableNormalMap ? normalMapTexture : null,
    });

    // Inject custom shader code for view-space thickening and debug gradient
    material.onBeforeCompile = (shader) => {
      console.log("🔧 Injecting shader effects...");

      // Add uniforms for debug shaders
      shader.uniforms.u_resolution = {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      };
      shader.uniforms.u_time = { value: 0.0 };

      // Add player interaction uniforms
      shader.uniforms.u_playerPosition = {
        value: characterPosition
          ? characterPosition.clone()
          : new THREE.Vector3(0, 0, 0),
      };
      shader.uniforms.u_playerInteractionRadius = {
        value: playerInteractionRadius,
      };
      shader.uniforms.u_playerInteractionStrength = {
        value: playerInteractionStrength,
      };
      shader.uniforms.u_playerInteractionRepel = {
        value: playerInteractionRepel,
      };

      // Add wind noise uniforms for real-time updates
      shader.uniforms.u_windNoiseScale = { value: windNoiseScale };
      shader.uniforms.u_windNoiseSpeed = { value: windNoiseSpeed };
      shader.uniforms.u_windNoiseAmplitude = { value: windNoiseAmplitude };

      // Store shader reference for uniform updates
      material.userData.shader = shader;

      // We need to inject BEFORE mvPosition is calculated
      // Replace the beginnormal_vertex chunk to calculate thickening early
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `
        #include <beginnormal_vertex>
        
        // Calculate view-space thickening EARLY before transformations
        // We'll use the objectNormal that was just calculated
        vec3 viewNormal = normalize(normalMatrix * objectNormal);
        
        // We need to estimate view direction before full transformation
        // Use a temporary calculation
        vec3 tempWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 tempViewDir = normalize(cameraPosition - tempWorldPos);
        
        float viewAlignment = abs(dot(tempViewDir, normalize(mat3(modelMatrix) * objectNormal)));
        float thicknessFactor = mix(${thicknessMultiplier.toFixed(
          1
        )}, 1.0, smoothstep(0.0, 0.3, viewAlignment));
        `
      );

      // Prepare combined shader injection for all effects
      let combinedBeginVertexCode = `
        #include <begin_vertex>
        
        // Apply thickening to X-axis (width) - only if enabled
        if (${enableThickening ? "true" : "false"}) {
        transformed.x *= thicknessFactor;
        }
      `;

      // Add wind movement functions to common section if needed
      if (enableWindMovement || enableAdvancedWind || enablePlayerInteraction) {
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

      // Add wind movement logic to combined code
      if (enableWindMovement) {
        combinedBeginVertexCode += `
          
          // SimonDev's initial curve system - applied BEFORE wind
          // Generate per-blade hash for consistent randomness
          vec3 instancePosition = vec3(instanceMatrix[3].xyz);
          float perBladeHash = fract(sin(dot(instancePosition.xz, vec2(12.9898, 78.233))) * 43758.5453);
          
          // Generate random lean amount (-0.3 to 0.3)
          float randomLean = (perBladeHash - 0.5) * 0.6;
          
          // Apply initial curve based on vertex height (stronger at tips)
          float heightPercent = transformed.y / ${grassHeight.toFixed(1)};
          float curveAmount = randomLean * heightPercent;
          
          // Apply curve rotation around X-axis (forward/backward bend)
          mat3 curveMat = rotateX(curveAmount);
          transformed = curveMat * transformed;
          
          // Apply wind movement - only if enabled
          if (${enableWindMovement ? "true" : "false"}) {
            // Calculate world position for noise sampling - use instance position
            vec3 instancePosition = vec3(instanceMatrix[3].xyz);
            vec3 worldPos = instancePosition;
            
            // SimonDev's approach: Multiple noise samples for wind system
            
            // 1. First noise sample for subtle movement (add to curve)
            float subtleNoise = smoothNoise(vec2(u_time * ${windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed) + worldPos.xz * u_windNoiseScale);
            subtleNoise *= u_windNoiseAmplitude;
            
            // 2. Wind direction sample - remap to 0-360 degrees (0 to 2PI)
            float windDirNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.05 + u_time * ${windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed * 0.05);
            float windDirection = windDirNoise; // Will remap below
            
            // 3. Wind strength sample - different spatial frequency
            float windStrengthNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.25 + u_time * ${windSpeed.toFixed(
              2
            )} * u_windNoiseSpeed);
            windStrengthNoise *= u_windNoiseAmplitude;
            
            // Remap wind direction to 0-360 degrees (0 to 2PI radians)
            windDirection = windDirection * 0.5 + 0.5; // -1,1 to 0,1
            windDirection *= 6.28318; // 0,1 to 0,2PI (360 degrees)
            
            // Calculate final wind strength based on height (stronger at tips)
            float heightPercent = transformed.y / ${grassHeight.toFixed(1)};
            float windStrength = windStrengthNoise * ${windStrength.toFixed(
              2
            )} * heightPercent;
            
            // Apply wind movement with proper wave pattern
            // Create floppy grass effect using vertex height for flexibility
            float vertexHeight = transformed.y; // Current vertex height (0 = base, max = tip)
            float bladeLength = ${grassHeight.toFixed(1)}; // Total blade length
            
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
            
            // Move back to final position
            transformed = basePoint + offsetFromBase;
          }
        `;
      }

      // Add advanced wind functions to common section if needed
      if (enableAdvancedWind) {
        shader.uniforms.u_windDirection = {
          value: new THREE.Vector2(windDirectionX, windDirectionZ).normalize(),
        };
        shader.uniforms.u_windStrength = { value: 0.8 };
        shader.uniforms.u_gustStrength = { value: 0.6 };

        // Add advanced wind functions to vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform vec2 u_windDirection;
          uniform float u_windStrength;
          uniform float u_gustStrength;
          
          // Hash function for Perlin noise
          vec2 hash(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
          }
          
          // Proper Perlin noise function (SimonDev's approach)
          float noise12(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            // Smooth interpolation
            f = f * f * (3.0 - 2.0 * f);
            
            // Get corner values
            float a = dot(hash(i), f);
            float b = dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
            float c = dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
            float d = dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          
          // Remap function
          float remap(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
          }
          
          // EaseIn function
          float easeIn(float t, float power) {
            return pow(t, power);
          }
          `
        );

        // Add advanced wind logic to combined code
        combinedBeginVertexCode += `
          
           // Apply SimonDevGrass9-style multi-layer wind system
           if (${enableAdvancedWind ? "true" : "false"}) {
             // Calculate world position for wind calculations
             vec3 instancePosition = vec3(instanceMatrix[3].xyz);
             vec3 worldPos = instancePosition;
             
             // Calculate height percentage (0 at base, 1 at tip) - use UV.y like SimonDevGrass9
             float heightPercent = vUv.y; // Use UV coordinates for proper height calculation
             
             // ============================================
             // SIMONDEV'S SPATIAL COHERENCE APPROACH
             // ============================================
             
             // SimonDev's two lines that create unified wind direction
             // Sample noise and then remap into the range [0, 2PI]
             // Use much smaller scaling for larger wind zones (0.01 instead of 0.05)
             float windDir = noise12(worldPos.xz * 0.01 + 0.01 * u_time);
             windDir = remap(windDir, -1.0, 1.0, 0.0, PI * 2.0);
             
             // Another noise sample for the strength of the wind
             // Use smaller scaling for wind strength too (0.05 instead of 0.25)
             float windNoiseSample = noise12(worldPos.xz * 0.05 + u_time);
             
             // Try and shape it a bit with easeIn(), this is pretty arbitrary
             float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
             windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;
             
             // Wind strength based on height (stronger at tips) - more pronounced
             float heightFactor = pow(heightPercent, 1.5);
             windLeanAngle *= heightFactor;
             
             // Apply wind using the unified direction
             // Convert wind direction to world space vector
             vec2 windDirection = vec2(cos(windDir), sin(windDir));
             
             // Apply wind movement in the unified direction
             float windStrength = windLeanAngle * ${windStrength.toFixed(
               2
             )} * windInfluence * ${windAmplitude.toFixed(2)};
             
             // Apply wind in the unified direction (all blades in this patch bend the same way)
             transformed.x += windStrength * windDirection.x;
             transformed.z += windStrength * windDirection.y;
             
             // Add vertical swaying motion
             float verticalSway = sin(u_time * ${windSpeed.toFixed(
               2
             )} * 1.5) * ${windStrength.toFixed(
            2
          )} * heightFactor * windInfluence * ${windAmplitude.toFixed(2)} * 0.1;
             transformed.y += verticalSway;
           }
        `;
      }

      // Add player interaction uniforms to common section if needed
      if (enablePlayerInteraction) {
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
          if (${enablePlayerInteraction ? "true" : "false"}) {
            // For InstancedMesh2, we need to get the instance position
            // The instance position is available through the instanceMatrix
            vec3 instancePosition = vec3(instanceMatrix[3].xyz);
            vec3 grassBladePos = instancePosition;  // Current blade position in world space
            
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
            }
          }
        `;
      }

      // Apply the combined shader code to replace begin_vertex
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        combinedBeginVertexCode
      );

      // Inject normal map fragment shader - blue gradient normals
      if (enableNormalMap) {
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

      // Inject debug vertex shader - wave motion
      if (enableDebugVertex) {
        // Add time uniform declaration
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform float u_time;
          `
        );

        // Add wave motion to vertex positions
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>
          
          // Debug wave motion - only if enabled
          if (${enableDebugVertex ? "true" : "false"}) {
            // Create wave motion based on height and time
            float wave = sin(transformed.y * 3.0 + u_time * 2.0) * 0.3;
            transformed.x += wave;
            
            // Add some vertical swaying
            float sway = sin(transformed.y * 2.0 + u_time * 1.5) * 0.1;
            transformed.z += sway;
          }
          `
        );
      }

      // Add uniforms and varyings for all color effects
      if (
        enableDebugShader ||
        enableBaseToTipGradient ||
        enableAmbientOcclusion
      ) {
        // Add uniform for resolution (debug shader) - always add if any color effect is enabled
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform vec2 u_resolution;
          `
        );

        // Add varying for UV coordinates (base-to-tip gradient and ambient occlusion)
        if (enableBaseToTipGradient || enableAmbientOcclusion) {
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

        // Pre-calculate color values for GLSL injection
        let baseRgbStr = "0.0, 0.0, 0.0";
        let tipRgbStr = "0.0, 0.0, 0.0";

        if (enableBaseToTipGradient) {
          const baseRgb = new THREE.Color(baseColor);
          const tipRgb = new THREE.Color(tipColor);
          baseRgbStr = `${baseRgb.r.toFixed(3)}, ${baseRgb.g.toFixed(
            3
          )}, ${baseRgb.b.toFixed(3)}`;
          tipRgbStr = `${tipRgb.r.toFixed(3)}, ${tipRgb.g.toFixed(
            3
          )}, ${tipRgb.b.toFixed(3)}`;
        }

        // Combined color fragment injection
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `
          #include <color_fragment>
          
          // Debug gradient shader
          if (${enableDebugShader ? "true" : "false"}) {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            vec3 debugColor = vec3(
              st.x / 0.6,                    // Red gradient (left to right)
              st.y / 1.8,                    // Green gradient (bottom to top)
              (st.x + st.y) / 1.2            // Blue gradient (diagonal)
            );
            diffuseColor.rgb = debugColor;
          }
          // Base-to-tip gradient shader
          else if (${enableBaseToTipGradient ? "true" : "false"}) {
            vec3 baseColour = vec3(${baseRgbStr});
            vec3 tipColour = vec3(${tipRgbStr});
            float heightPercent = vUv.y;
            float shapedHeight = pow(heightPercent, ${gradientShaping.toFixed(
              1
            )});
            vec3 gradientColor = mix(baseColour, tipColour, shapedHeight);
            diffuseColor.rgb = gradientColor;
          }
          
          // Ambient occlusion shader
          if (${enableAmbientOcclusion ? "true" : "false"}) {
            float density = ${grassDensity.toFixed(1)};
            float heightPercent = vUv.y;
            float aoStrength = ${aoStrength.toFixed(2)};
            float aoHeightPower = ${aoHeightPower.toFixed(1)};
            
            float aoForDensity = mix(1.0, aoStrength, density);
            float ao = mix(aoForDensity, 1.0, pow(heightPercent, aoHeightPower));
            
            if (${aoDebugMode ? "true" : "false"}) {
              diffuseColor.rgb = vec3(ao, 1.0 - ao, 0.0); // Red = high AO, Green = low AO
            } else {
              diffuseColor.rgb *= ao;
            }
          }
          `
        );
      }

      // Inject normal blending fragment shader
      if (enableNormalBlending) {
        // Add varying variable for view distance in vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          varying float vViewDistance;
          `
        );

        // Add varying variable for view distance in fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `
          #include <common>
          
          varying float vViewDistance;
          `
        );

        // Calculate view distance in vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `
          #include <begin_vertex>
          
          // Calculate distance from camera to grass position
          vec3 instancePosition = vec3(instanceMatrix[3].xyz);
             vec3 worldPos = instancePosition;
          vViewDistance = length(cameraPosition - worldPos);
          `
        );

        // Add normal blending in fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <normal_fragment>",
          `
          #include <normal_fragment>
          
          // Normal blending based on distance
          float normalBlendFactor = smoothstep(${terrainBlendStart.toFixed(
            1
          )}, ${terrainBlendEnd.toFixed(1)}, vViewDistance);
          
          // Terrain normal (pointing up)
          vec3 terrainNormal = vec3(0.0, 1.0, 0.0);
          
          // Blend the normal with the terrain normal depending on the distance
          normal = mix(normal, terrainNormal, normalBlendFactor);
          `
        );
      }

      console.log("✅ Shader injection complete");
    };

    return material;
  }, [
    enableThickening,
    thicknessMultiplier,
    enableDebugShader,
    enableDebugVertex,
    enableNormalMap,
    normalMapTexture,
    enableBaseToTipGradient,
    baseColor,
    tipColor,
    gradientShaping,
    enableNormalBlending,
    terrainBlendStart,
    terrainBlendEnd,
    enableAmbientOcclusion,
    grassDensity,
    aoStrength,
    aoHeightPower,
    aoDebugMode,
    enableWindMovement,
    windStrength,
    windSpeed,
    enableAdvancedWind,
    windDirectionScale,
    windStrengthScale,
    windStrengthMultiplier,
    windFrequency,
    windAmplitude,
    windTurbulence,
    flappingIntensity,
    grassHeight,
    // Player Interaction
    enablePlayerInteraction,
    playerInteractionRadius,
    playerInteractionStrength,
    playerInteractionRepel,
    characterPosition,
  ]);
};

export default useGrassMaterial;
