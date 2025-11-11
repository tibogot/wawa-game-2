import { useMemo, useRef, useCallback } from "react";
import * as THREE from "three";

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
  // Moon light controls
  enableMoonReflection?: boolean;
  moonIntensity?: number;
  moonDirection?: THREE.Vector3;
  moonColor?: string;
  // Contact Shadow controls (v22 addition)
  contactShadowIntensity?: number;
  contactShadowRadius?: number;
  contactShadowBias?: number;
  // Subsurface Scattering controls (v22 addition)
  enableSSS?: boolean;
  sssIntensity?: number;
  sssPower?: number;
  sssScale?: number;
  sssColor?: string;
  // Environment Map/IBL controls (v22 addition)
  enableEnvMap?: boolean;
  envMap?: THREE.Texture;
  envMapIntensity?: number;
  roughnessBase?: number;
  roughnessTip?: number;
  fresnelPower?: number;
  roughnessIntensity?: number;
  // View Thickening controls (v22 addition)
  enableViewThickenDebug?: boolean;
  viewThickenPower?: number;
  viewThickenStrength?: number;
}

export const useOptimizedGrassMaterial = (config: MaterialConfig) => {
  const uniformUpdateQueue = useRef<THREE.MeshStandardMaterial[]>([]);
  const lastUpdateTime = useRef(0);
  const localTimeRef = useRef(0);

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
      // Moon controls in cache key
      enableMoonReflection: !!config.enableMoonReflection,
      moonIntensity: config.moonIntensity ?? 1.0,
      moonDirection: config.moonDirection
        ? [
            config.moonDirection.x,
            config.moonDirection.y,
            config.moonDirection.z,
          ]
        : [0, 1, 0],
      moonColor: config.moonColor ?? "#ffffff",
      // Contact shadow cache key
      contactShadowIntensity: config.contactShadowIntensity ?? 0.8,
      contactShadowRadius: config.contactShadowRadius ?? 2.0,
      contactShadowBias: config.contactShadowBias ?? 0.1,
      // SSS cache key
      enableSSS: !!config.enableSSS,
      sssIntensity: config.sssIntensity ?? 0.8,
      sssPower: config.sssPower ?? 1.5,
      sssScale: config.sssScale ?? 2.0,
      sssColor: config.sssColor ?? "#8fbc8f",
      // Env map cache key
      enableEnvMap: !!config.enableEnvMap,
      envMapIntensity: config.envMapIntensity ?? 1.0,
      roughnessBase: config.roughnessBase ?? 0.9,
      roughnessTip: config.roughnessTip ?? 0.1,
      fresnelPower: config.fresnelPower ?? 3.0,
      roughnessIntensity: config.roughnessIntensity ?? 1.0,
      // View thickening cache key
      enableViewThickenDebug: !!config.enableViewThickenDebug,
      viewThickenPower: config.viewThickenPower ?? 4.0,
      viewThickenStrength: config.viewThickenStrength ?? 0.8,
    });
  }, []);

  // Batched uniform updates to reduce per-frame overhead
  const updateUniforms = useCallback(() => {
    const now = performance.now();
    const dt = lastUpdateTime.current === 0 ? 16 : now - lastUpdateTime.current;
    if (dt < 16) return; // ~60fps max
    lastUpdateTime.current = now;
    localTimeRef.current += dt / 1000;

    uniformUpdateQueue.current.forEach((material) => {
      if (material.userData.shader) {
        const shader = material.userData.shader;

        // Update time uniform
        if (shader.uniforms.u_time) {
          shader.uniforms.u_time.value = localTimeRef.current;
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
        if (shader.uniforms.u_windNoiseScale)
          shader.uniforms.u_windNoiseScale.value = config.windNoiseScale;
        if (shader.uniforms.u_windNoiseSpeed)
          shader.uniforms.u_windNoiseSpeed.value = config.windNoiseSpeed;
        if (shader.uniforms.u_windNoiseAmplitude)
          shader.uniforms.u_windNoiseAmplitude.value =
            config.windNoiseAmplitude;

        // Update live-config uniforms (v22 extras)
        if (shader.uniforms.u_playerInteractionRadius)
          shader.uniforms.u_playerInteractionRadius.value =
            config.playerInteractionRadius;
        if (shader.uniforms.u_playerInteractionStrength)
          shader.uniforms.u_playerInteractionStrength.value =
            config.playerInteractionStrength;
        if (shader.uniforms.u_playerInteractionRepel)
          shader.uniforms.u_playerInteractionRepel.value =
            config.playerInteractionRepel;

        // Wind enable/strength/speed as uniforms if present
        if ((shader.uniforms as any).u_enableWindMovement)
          (shader.uniforms as any).u_enableWindMovement.value =
            config.enableWindMovement;
        if ((shader.uniforms as any).u_windStrength)
          (shader.uniforms as any).u_windStrength.value = config.windStrength;
        if ((shader.uniforms as any).u_windSpeed)
          (shader.uniforms as any).u_windSpeed.value = config.windSpeed;

        // Moonlight
        if ((shader.uniforms as any).u_enableMoonReflection)
          (shader.uniforms as any).u_enableMoonReflection.value =
            config.enableMoonReflection ?? false;
        if ((shader.uniforms as any).u_moonIntensity)
          (shader.uniforms as any).u_moonIntensity.value =
            config.moonIntensity ?? 1.5;
        if ((shader.uniforms as any).u_moonDirection && config.moonDirection)
          (shader.uniforms as any).u_moonDirection.value.copy(
            config.moonDirection
          );
        if ((shader.uniforms as any).u_moonColor)
          (shader.uniforms as any).u_moonColor.value.set(
            config.moonColor ?? "#9fc9ff"
          );

        // Contact shadows
        if ((shader.uniforms as any).u_contactShadowIntensity)
          (shader.uniforms as any).u_contactShadowIntensity.value =
            config.contactShadowIntensity ?? 0.8;
        if ((shader.uniforms as any).u_contactShadowRadius)
          (shader.uniforms as any).u_contactShadowRadius.value =
            config.contactShadowRadius ?? 2.0;
        if ((shader.uniforms as any).u_contactShadowBias)
          (shader.uniforms as any).u_contactShadowBias.value =
            config.contactShadowBias ?? 0.1;

        // SSS
        if ((shader.uniforms as any).u_enableSSS)
          (shader.uniforms as any).u_enableSSS.value =
            config.enableSSS ?? false;
        if ((shader.uniforms as any).u_sssIntensity)
          (shader.uniforms as any).u_sssIntensity.value =
            config.sssIntensity ?? 0.8;
        if ((shader.uniforms as any).u_sssPower)
          (shader.uniforms as any).u_sssPower.value = config.sssPower ?? 1.5;
        if ((shader.uniforms as any).u_sssScale)
          (shader.uniforms as any).u_sssScale.value = config.sssScale ?? 2.0;
        if ((shader.uniforms as any).u_sssColor)
          (shader.uniforms as any).u_sssColor.value.set(
            config.sssColor ?? "#8fbc8f"
          );

        // Env map
        if ((shader.uniforms as any).u_enableEnvMap)
          (shader.uniforms as any).u_enableEnvMap.value =
            config.enableEnvMap ?? false;
        if ((shader.uniforms as any).u_envMapIntensity)
          (shader.uniforms as any).u_envMapIntensity.value =
            config.envMapIntensity ?? 1.0;
        if ((shader.uniforms as any).u_roughnessBase)
          (shader.uniforms as any).u_roughnessBase.value =
            config.roughnessBase ?? 0.9;
        if ((shader.uniforms as any).u_roughnessTip)
          (shader.uniforms as any).u_roughnessTip.value =
            config.roughnessTip ?? 0.1;
        if ((shader.uniforms as any).u_fresnelPower)
          (shader.uniforms as any).u_fresnelPower.value =
            config.fresnelPower ?? 3.0;
        if ((shader.uniforms as any).u_roughnessIntensity)
          (shader.uniforms as any).u_roughnessIntensity.value =
            config.roughnessIntensity ?? 1.0;

        // Ambient Occlusion
        if ((shader.uniforms as any).u_enableAmbientOcclusion)
          (shader.uniforms as any).u_enableAmbientOcclusion.value =
            config.enableAmbientOcclusion;
        if ((shader.uniforms as any).u_grassDensity)
          (shader.uniforms as any).u_grassDensity.value = config.grassDensity;
        if ((shader.uniforms as any).u_aoStrength)
          (shader.uniforms as any).u_aoStrength.value = config.aoStrength;
        if ((shader.uniforms as any).u_aoHeightPower)
          (shader.uniforms as any).u_aoHeightPower.value = config.aoHeightPower;
        if ((shader.uniforms as any).u_aoDebugMode)
          (shader.uniforms as any).u_aoDebugMode.value = config.aoDebugMode;

        // Gradient uniforms
        if ((shader.uniforms as any).u_enableDebugShader)
          (shader.uniforms as any).u_enableDebugShader.value =
            config.enableDebugShader;
        if ((shader.uniforms as any).u_enableBaseToTipGradient)
          (shader.uniforms as any).u_enableBaseToTipGradient.value =
            config.enableBaseToTipGradient;
        if ((shader.uniforms as any).u_baseColor) {
          const baseColor = new THREE.Color(config.baseColor);
          (shader.uniforms as any).u_baseColor.value.copy(baseColor);
        }
        if ((shader.uniforms as any).u_tipColor) {
          const tipColor = new THREE.Color(config.tipColor);
          (shader.uniforms as any).u_tipColor.value.copy(tipColor);
        }
        if ((shader.uniforms as any).u_gradientShaping)
          (shader.uniforms as any).u_gradientShaping.value =
            config.gradientShaping;
      }
    });
  }, [config]);

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
      shader.uniforms.u_time = { value: 0.0 };
      shader.uniforms.u_enableWindMovement = {
        value: config.enableWindMovement,
      };
      shader.uniforms.u_windSpeed = { value: config.windSpeed };
      shader.uniforms.u_windStrength = { value: config.windStrength };
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

      // Moon uniforms
      shader.uniforms.u_enableMoonReflection = {
        value: config.enableMoonReflection ?? false,
      };
      shader.uniforms.u_moonIntensity = {
        value: config.moonIntensity ?? 1.5,
      };
      shader.uniforms.u_moonDirection = {
        value: config.moonDirection
          ? config.moonDirection.clone()
          : new THREE.Vector3(1, 1, 0.5).normalize(),
      };
      const moonColor = new THREE.Color(config.moonColor ?? "#9fc9ff");
      shader.uniforms.u_moonColor = { value: moonColor };

      // Contact Shadow uniforms
      shader.uniforms.u_contactShadowIntensity = {
        value: config.contactShadowIntensity ?? 0.8,
      };
      shader.uniforms.u_contactShadowRadius = {
        value: config.contactShadowRadius ?? 2.0,
      };
      shader.uniforms.u_contactShadowBias = {
        value: config.contactShadowBias ?? 0.1,
      };

      // Subsurface Scattering uniforms
      shader.uniforms.u_enableSSS = {
        value: config.enableSSS ?? false,
      };
      shader.uniforms.u_sssIntensity = {
        value: config.sssIntensity ?? 0.8,
      };
      shader.uniforms.u_sssPower = {
        value: config.sssPower ?? 1.5,
      };
      shader.uniforms.u_sssScale = {
        value: config.sssScale ?? 2.0,
      };
      const sssColor = new THREE.Color(config.sssColor ?? "#8fbc8f");
      shader.uniforms.u_sssColor = { value: sssColor };

      // Environment Map uniforms
      shader.uniforms.u_enableEnvMap = {
        value: config.enableEnvMap ?? false,
      };
      shader.uniforms.u_envMap = {
        value: config.envMap ?? null,
      };
      shader.uniforms.u_envMapIntensity = {
        value: config.envMapIntensity ?? 1.0,
      };
      shader.uniforms.u_roughnessBase = {
        value: config.roughnessBase ?? 0.9,
      };
      shader.uniforms.u_roughnessTip = {
        value: config.roughnessTip ?? 0.1,
      };
      shader.uniforms.u_fresnelPower = {
        value: config.fresnelPower ?? 3.0,
      };
      shader.uniforms.u_roughnessIntensity = {
        value: config.roughnessIntensity ?? 1.0,
      };

      // View Thickening uniforms
      shader.uniforms.u_enableViewThickenDebug = {
        value: config.enableViewThickenDebug ?? false,
      };
      shader.uniforms.u_viewThickenPower = {
        value: config.viewThickenPower ?? 4.0,
      };
      shader.uniforms.u_viewThickenStrength = {
        value: config.viewThickenStrength ?? 0.8,
      };

      // Ambient Occlusion uniforms
      shader.uniforms.u_enableAmbientOcclusion = {
        value: config.enableAmbientOcclusion,
      };
      shader.uniforms.u_grassDensity = {
        value: config.grassDensity,
      };
      shader.uniforms.u_aoStrength = {
        value: config.aoStrength,
      };
      shader.uniforms.u_aoHeightPower = {
        value: config.aoHeightPower,
      };
      shader.uniforms.u_aoDebugMode = {
        value: config.aoDebugMode,
      };

      // Gradient uniforms
      shader.uniforms.u_enableDebugShader = {
        value: config.enableDebugShader,
      };
      shader.uniforms.u_enableBaseToTipGradient = {
        value: config.enableBaseToTipGradient,
      };
      const baseColor = new THREE.Color(config.baseColor);
      shader.uniforms.u_baseColor = { value: baseColor };
      const tipColor = new THREE.Color(config.tipColor);
      shader.uniforms.u_tipColor = { value: tipColor };
      shader.uniforms.u_gradientShaping = {
        value: config.gradientShaping,
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
        float viewSpaceThickenFactor = pow(1.0 - viewDotNormal, u_viewThickenPower);
        
        // Thin out again when perfectly orthogonal to avoid visual artifacts
        viewSpaceThickenFactor *= smoothstep(0.0, 0.2, viewDotNormal);
        
        // Get X direction and width from original local position
        float xDirection = position.x > 0.0 ? 1.0 : -1.0;
        float grassWidth = abs(position.x);
        
        // Apply thickening by pushing vertices outward along X axis in local space
        transformed.x += viewSpaceThickenFactor * xDirection * grassWidth * u_viewThickenStrength;
      `;

      // Always add wind functions (runtime-gated) and player interaction helpers
      if (config.enablePlayerInteraction || true) {
        // Always include wind helpers
        // Add time uniform (wind noise uniforms already added in common section)
        shader.uniforms.u_time = { value: 0.0 };

        // Add noise function and wind movement to vertex shader
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `
          #include <common>
          
          uniform float u_time;
          uniform bool u_enableWindMovement;
          uniform float u_windSpeed;
          uniform float u_windStrength;
          uniform float u_windNoiseScale;
          uniform float u_windNoiseSpeed;
          uniform float u_windNoiseAmplitude;
          uniform float u_viewThickenPower;
          uniform float u_viewThickenStrength;
          
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

      // Always add wind movement code (runtime-gated via u_enableWindMovement uniform)
      combinedBeginVertexCode += `
        
        // SimonDev's initial curve system - applied BEFORE wind
        // Use instanceWorldPos (already calculated at the top) for consistent randomness and wind patterns
        // Generate per-blade hash for consistent randomness (use world position for consistency across tiles)
        float perBladeHash = fract(sin(dot(instanceWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
        
        // Generate random lean amount (-0.3 to 0.3)
        float randomLean = (perBladeHash - 0.5) * 0.6;
        
        // Apply subtle curved variation to break uniformity (Ghost of Tsushima style)
        float curve = pow(uv.y, 2.0) * randomLean * 0.1;
        transformed.x += curve;
        
        // Apply wind movement - runtime gated by uniform (works regardless of normal map)
        if (u_enableWindMovement && windInfluence > 0.0) {
          // Use world position for noise sampling - ensures consistent wind patterns across all tiles
          vec3 worldPos = instanceWorldPos;
          
          // SimonDev's approach: Multiple noise samples for wind system
          
          // 1. First noise sample for subtle movement (add to curve)
          float subtleNoise = smoothNoise(vec2(u_time * u_windSpeed * u_windNoiseSpeed) + worldPos.xz * u_windNoiseScale);
          subtleNoise *= u_windNoiseAmplitude;
          
          // 2. Wind direction sample - remap to 0-360 degrees (0 to 2PI)
          float windDirNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.05 + u_time * u_windSpeed * u_windNoiseSpeed * 0.05);
          float windDirection = windDirNoise; // Will remap below
          
          // 3. Wind strength sample - different spatial frequency
          float windStrengthNoise = smoothNoise(worldPos.xz * u_windNoiseScale * 0.25 + u_time * u_windSpeed * u_windNoiseSpeed);
          windStrengthNoise *= u_windNoiseAmplitude;
          
          // Remap wind direction to 0-360 degrees (0 to 2PI radians)
          windDirection = windDirection * 0.5 + 0.5; // -1,1 to 0,1
          windDirection *= 6.28318; // 0,1 to 0,2PI (360 degrees)
          
          // Calculate final wind strength based on wind influence
          float windStrength = windStrengthNoise * u_windStrength * windInfluence;
          
          // Apply wind movement with proper wave pattern
          // Create floppy grass effect using vertex height for flexibility
          float vertexHeight = transformed.y; // Current vertex height (0 = base, max = tip)
          float bladeLength = ${config.grassHeight.toFixed(
            1
          )}; // Total blade length
          
          // Calculate flexibility factor: base is stiff (0), tip is floppy (1)
          float flexibilityFactor = vertexHeight / bladeLength;
          flexibilityFactor = pow(flexibilityFactor, 1.5); // Curve the flexibility for more natural bend
          
          // Apply rotation-based wind bending around the blade BASE
          // Use wind direction to determine rotation axis and amount
          
          // Convert wind direction to rotation components
          float windRotationX = sin(windDirection) * windStrength * 0.5; // Forward-back rotation
          float windRotationY = cos(windDirection) * windStrength * 0.8; // Side-to-side rotation
          
          // Create rotation matrices
          mat3 rotX = rotateX(windRotationX);
          mat3 rotY = rotateY(windRotationY);
          
          // Rotate around the blade BASE (Y=0)
          vec3 basePoint = vec3(0.0, 0.0, 0.0); // Blade base
          vec3 offsetFromBase = transformed - basePoint;
          
          // Apply rotations around the base
          offsetFromBase = rotY * offsetFromBase;
          offsetFromBase = rotX * offsetFromBase;
          
          // Apply the same rotations to normals for proper lighting
          transformedNormal = rotY * transformedNormal;
          transformedNormal = rotX * transformedNormal;
          
          // Move back to final position
          transformed = basePoint + offsetFromBase;
        }
      `;

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
              // Rotate around the blade BASE (Y=0) - same as wind
              vec3 basePoint = vec3(0.0, 0.0, 0.0); // Blade base
              vec3 offsetFromBase = transformed - basePoint;
              
              // Apply rotation around the base
              offsetFromBase = rotateAxis(playerLeanAxis, playerLeanAngle) * offsetFromBase;
              
              // Apply the same rotation to normals for proper lighting
              transformedNormal = rotateAxis(playerLeanAxis, playerLeanAngle) * transformedNormal;
              
              // Move back to final position
              transformed = basePoint + offsetFromBase;
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
          
          // Sample normal map for rounded normals (Ghost of Tsushima technique)
          vec4 normalMapColor = texture2D(normalMap, vUv);
          
          // Extract normal from RGB channels - Ghost of Tsushima gradient normal map
          // The normal map encodes rounded cross-section gradient for blade thickness
          vec3 tangentNormal = normalMapColor.rgb * 2.0 - 1.0; // Convert from 0-1 to -1 to 1
          
          // Apply to base normal - creates rounded cross-section effect
          normal = normalize(normal + tangentNormal * 0.5);
          `
        );
      }

      // Always add color effects section (all features runtime-gated via uniforms)
      // Add uniform for resolution and all color/lighting uniforms
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
          #include <common>
          
          uniform vec2 u_resolution;
          
          // Moonlight uniforms
          uniform bool u_enableMoonReflection;
          uniform float u_moonIntensity;
          uniform vec3 u_moonDirection;
          uniform vec3 u_moonColor;
          
          // Contact Shadow uniforms
          uniform float u_contactShadowIntensity;
          uniform float u_contactShadowRadius;
          uniform float u_contactShadowBias;
          
          // Subsurface Scattering uniforms
          uniform bool u_enableSSS;
          uniform float u_sssIntensity;
          uniform float u_sssPower;
          uniform float u_sssScale;
          uniform vec3 u_sssColor;
          
          // Environment Map uniforms
          uniform bool u_enableEnvMap;
          uniform samplerCube u_envMap;
          uniform float u_envMapIntensity;
          uniform float u_roughnessBase;
          uniform float u_roughnessTip;
          uniform float u_fresnelPower;
          uniform float u_roughnessIntensity;
          
          // Ambient Occlusion uniforms
          uniform bool u_enableAmbientOcclusion;
          uniform float u_grassDensity;
          uniform float u_aoStrength;
          uniform float u_aoHeightPower;
          uniform bool u_aoDebugMode;
          
          // Gradient uniforms
          uniform bool u_enableBaseToTipGradient;
          uniform vec3 u_baseColor;
          uniform vec3 u_tipColor;
          uniform float u_gradientShaping;
          uniform bool u_enableDebugShader;
          
          // View Thickening uniforms
          uniform bool u_enableViewThickenDebug;
          uniform float u_viewThickenPower;
          uniform float u_viewThickenStrength;
          
          // Contact Shadow function - simulates ground shadows
          float getContactShadow(vec3 worldPos, vec3 lightDir) {
            float shadow = 1.0;
            float densityShadow = 1.0 - (u_grassDensity * 0.3);
            float heightPercent = vUv.y;
            float heightShadow = 1.0 - (heightPercent * 0.4);
            float groundDistance = worldPos.y;
            float distanceShadow = 1.0 - smoothstep(0.0, u_contactShadowRadius, groundDistance) * 0.6;
            shadow = min(densityShadow, min(heightShadow, distanceShadow));
            shadow = mix(1.0, shadow, u_contactShadowIntensity);
            return shadow;
          }
          `
      );

      // Combined color fragment injection (runtime-gated via uniforms)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
          #include <color_fragment>
          
          // Debug gradient shader
          if (u_enableDebugShader) {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            vec3 debugColor = vec3(
              st.x / 0.6,                    // Red gradient (left to right)
              st.y / 1.8,                    // Green gradient (bottom to top)
              (st.x + st.y) / 1.2            // Blue gradient (diagonal)
            );
            diffuseColor.rgb = debugColor;
          }
          // Base-to-tip gradient shader
          else if (u_enableBaseToTipGradient) {
            float heightPercent = vUv.y;
            float shapedHeight = pow(heightPercent, u_gradientShaping);
            vec3 gradientColor = mix(u_baseColor, u_tipColor, shapedHeight);
            diffuseColor.rgb = gradientColor;
          }
          
          // Ambient occlusion shader - darkens base, brightens toward tip
          if (u_enableAmbientOcclusion) {
            float heightPercent = vUv.y;
            // Base AO: higher density = more occlusion (darker at base)
            // aoStrength controls how much to darken (0.0 = no darkening, higher = darker)
            float aoForDensity = mix(1.0, 1.0 - u_aoStrength, u_grassDensity);
            // Height-based fade: base is darker (uses aoForDensity), tip is lighter (1.0)
            float ao = mix(aoForDensity, 1.0, pow(heightPercent, u_aoHeightPower));
            
            if (u_aoDebugMode) {
              diffuseColor.rgb = vec3(ao, 1.0 - ao, 0.0); // Red = high AO (dark), Green = low AO (bright)
            } else {
              diffuseColor.rgb *= ao;
            }
          }
          
          // Contact Shadow application
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          vec3 worldPos = vWorldPosition;
          float contactShadow = getContactShadow(worldPos, lightDir);
          diffuseColor.rgb *= contactShadow;
          
          // View Thickening Debug Visualization
          if (u_enableViewThickenDebug) {
            // Simplified debug visualization using view direction
            vec3 viewDir = normalize(cameraPosition - worldPos);
            
            // Use simplified approach: visualize based on view angle to grass blade
            // Since we can't access the exact face normal in fragment shader, 
            // we'll visualize a simplified approximation
            vec3 grassFaceNormal = normalize(vec3(1.0, 0.0, 0.0)); // Simplified for debug
            float viewDotNormal = clamp(dot(normalize(grassFaceNormal.xz), normalize(viewDir.xz)), 0.0, 1.0);
            
            // Calculate thickening factor
            float viewSpaceThickenFactor = pow(1.0 - viewDotNormal, u_viewThickenPower);
            viewSpaceThickenFactor *= smoothstep(0.0, 0.2, viewDotNormal);
            
            // Visualize as grayscale - brighter = more thickening
            diffuseColor.rgb = vec3(viewSpaceThickenFactor);
          }
          
          // Environment Map reflections (v22) - removed, causes shader errors
          // Will re-add after debugging
          `
      );

      // Always add varyings for UV/world/thickness so features don't depend on specific toggles
      // Add varying variable declaration to vertex shader
      // vWorldPosition is conditionally declared: if USE_FOG is defined, HeightFog already declared it
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>
          
          varying vec2 vUv;
          #ifndef USE_FOG
          varying vec3 vWorldPosition;
          #endif
          varying vec3 vVertexNormal;
          varying float vThickness;
          varying vec3 vReflect;
          varying vec3 vViewDir;
          `
      );

      // Add varying variable declaration to fragment shader
      // vWorldPosition is conditionally declared: if USE_FOG is defined, HeightFog already declared it
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
          #include <common>
          
        varying vec2 vUv;
        #ifndef USE_FOG
        varying vec3 vWorldPosition;
        #endif
        varying vec3 vVertexNormal;
        varying float vThickness;
        varying vec3 vReflect;
        varying vec3 vViewDir;
          `
      );

      // Pass UV coordinates, world position, and thickness in vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>
          
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
          // View-space position (like v6) for correct moon reflection
          vViewPosition = (modelViewMatrix * vec4(transformed, 1.0)).xyz;
          // Vertex normal (before normal map) for consistent moon reflection across tiles
          vVertexNormal = normalize(normalMatrix * objectNormal);
          // Thickness for SSS: thicker at base, thinner at tips
          float vHeight = position.y / ${config.grassHeight.toFixed(1)};
          vThickness = (1.0 - vHeight) * 0.8 + 0.2;
          
          // Calculate view direction and reflection for environment map
          vec3 worldPosCalc = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vViewDir = normalize(cameraPosition - worldPosCalc);
          vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
          vReflect = reflect(-vViewDir, worldNormal);
          `
      );

      // Inject moonlight and SSS after standard lighting where geometryNormal/viewDir exist
      // Match v6 approach: add to outgoingLight so it's always visible
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        `
        #include <lights_fragment_end>
        if (u_enableMoonReflection && u_moonIntensity > 0.0) {
          // EXACT v6 approach: use view-space calculations for consistent directional spot
          vec3 normal = normalize(vVertexNormal); // Vertex normal (consistent, not modified by normal map)
          vec3 viewDir = normalize(-vViewPosition); // View-space direction (like v6)
          // Moon direction in world space
          vec3 moonDir = normalize(u_moonDirection);
          // Reflect moon direction off normal (exact v6 formula)
          vec3 moonReflectDir = reflect(-moonDir, normal);
          // v6 uses specularPower * 0.8 (default 32 * 0.8 = 25.6) for directional spot
          float moonSpec = pow(max(dot(viewDir, moonReflectDir), 0.0), 25.6);
          // Match v6: multiply by intensity and extra 3x for visibility
          vec3 moonSpecular = u_moonColor * moonSpec * u_moonIntensity * 3.0;
          reflectedLight.directSpecular += moonSpecular;
        }
        
        // Subsurface Scattering - Enhanced for better visibility (v22)
        vec3 sssContribution = vec3(0.0);
        if (u_enableSSS) {
          vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
          float backScatter = max(dot(-lightDir, geometryNormal), 0.0);
          float frontScatter = max(dot(lightDir, geometryNormal), 0.0);
          
          float sss = pow(backScatter, u_sssPower) * vThickness * u_sssScale;
          float sssFront = pow(frontScatter, u_sssPower * 0.5) * vThickness * u_sssScale * 0.3;
          
          // Calculate rim for SSS
          float rim = 1.0 - max(dot(geometryNormal, geometryViewDir), 0.0);
          float rimSSS = pow(rim, 2.0) * vThickness * 0.5;
          
          float totalSSS = sss + sssFront + rimSSS;
          totalSSS = clamp(totalSSS, 0.0, 1.0);
          
          sssContribution = u_sssColor * totalSSS * u_sssIntensity;
          reflectedLight.directDiffuse += sssContribution;
        }
        
        // Environment Map reflections (v22) - after lighting where geometryNormal/viewDir exist
        if (u_enableEnvMap && u_envMapIntensity > 0.0) {
          float heightPercent = vUv.y;
          float roughness = mix(u_roughnessBase, u_roughnessTip, heightPercent) * u_roughnessIntensity;
          // Use geometryNormal and geometryViewDir (computed in lighting pass)
          float fresnel = pow(1.0 - max(dot(geometryNormal, geometryViewDir), 0.0), u_fresnelPower);
          vec3 envColor = textureCube(u_envMap, vReflect).rgb;
          float reflectionStrength = mix(0.15, 0.85, heightPercent) * fresnel * u_envMapIntensity;
          vec3 upVector = vec3(0.0, 1.0, 0.0);
          vec3 ambientEnv = textureCube(u_envMap, upVector).rgb;
          float ambientStrength = (1.0 - heightPercent) * 0.3 * u_envMapIntensity;
          reflectedLight.indirectDiffuse += envColor * reflectionStrength + ambientEnv * ambientStrength;
        }
        `
      );

      // Debug: output shaders once
      if (!(newMaterial as any)._loggedFragment) {
        (newMaterial as any)._loggedFragment = true;
        try {
          console.log("[Grass22] Vertex shader:\n", shader.vertexShader);
          console.log("[Grass22] Fragment shader:\n", shader.fragmentShader);
        } catch {}
      }
    };

    // Cache the material
    materialCache.set(cacheKey, newMaterial);
    registerMaterial(newMaterial);

    return newMaterial;
  }, [config, createCacheKey, registerMaterial]);

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
