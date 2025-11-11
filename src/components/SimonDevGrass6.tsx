import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
// import CustomShaderMaterial from "three-custom-shader-material/vanilla";

interface SimonDevGrass6Props {
  areaSize?: number;
  getGroundHeight?: (x: number, z: number) => number;
  grassHeight?: number; // Custom grass height multiplier
  grassScale?: number; // Overall scale multiplier for instances
}

export const SimonDevGrass6: React.FC<SimonDevGrass6Props> = ({
  areaSize = 80,
  getGroundHeight,
  grassHeight = 1.0, // Default to normal height
  grassScale = 1.0, // Default to normal scale
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const grassMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const materialRef = useRef<any>(null);
  const { camera } = useThree();

  // SimonDev's exact vertex shader
  const vertexShader = `
    uniform float time;
    uniform float windStrength;
    uniform vec2 windDirection;
    uniform float grassDensity;
    uniform float windSpeed;
    uniform float windFrequency;
    uniform float windAmplitude;
    uniform float windTurbulence;
    uniform float flappingIntensity;
    
    attribute vec3 offset;
    attribute float scale;
    attribute float rotation;
    attribute float windInfluence;
    attribute float grassType;
    attribute vec3 colorVariation;
    attribute vec3 tipColorVariation;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vGrassColour;
    varying float vHeight;
    varying float vGrassType;
    varying float vWindInfluence;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vLightPosition;
    varying float vThickness;
    varying vec3 vColorVariation;
    varying vec3 vTipColorVariation;
    varying vec3 vReflect;
    varying vec3 vViewDir;
    
    // Noise functions from SimonDev
    float hash12(vec2 p) {
      vec2 p2 = fract(p * vec2(443.8975, 397.2973));
      p2 += dot(p2.xy, p2.yx + 19.19);
      return fract(p2.x * p2.y);
    }
    
    float noise12(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash12(i);
      float b = hash12(i + vec2(1.0, 0.0));
      float c = hash12(i + vec2(0.0, 1.0));
      float d = hash12(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
    }
    
    float remap(float v, float inMin, float inMax, float outMin, float outMax) {
      return outMin + (v - inMin) * (outMax - outMin) / (inMax - inMin);
    }
    
    float easeIn(float x, float t) {
      return pow(x, t);
    }
    
    mat2 rotate2D(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }
    
    void main() {
      vUv = uv;
      vHeight = position.y + 0.5;
      vGrassType = grassType;
      vWindInfluence = windInfluence;
      vColorVariation = colorVariation;
      vTipColorVariation = tipColorVariation;
      
      // Apply instance scale
      vec3 pos = position * scale;
      
      // Apply instance rotation
      float cos_r = cos(rotation);
      float sin_r = sin(rotation);
      mat2 rotationMatrix = mat2(cos_r, -sin_r, sin_r, cos_r);
      pos.xz = rotationMatrix * pos.xz;
      
      // SimonDev's grass blade curve - more pronounced
      float curve = pow(uv.y, 2.0) * 0.5;
      pos.x += curve;
      
      // Enhanced wind system for more realistic flapping and bending
      vec3 worldPos = pos + offset;
      
      // Wind direction based on noise (changes over time and space)
      float windDir = noise12(worldPos.xz * windFrequency + time * windSpeed * 0.5);
      float windNoiseSample = noise12(worldPos.xz * windFrequency * 2.5 + time * windSpeed * 1.0);
      float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
      windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25 * windTurbulence * windAmplitude;
      vec3 windAxis = vec3(cos(windDir), 0.0, sin(windDir));
      
      // Wind strength based on height (stronger at tips) - more pronounced
      float heightFactor = pow(uv.y, 1.5); // More aggressive height-based wind
      windLeanAngle *= heightFactor;
      
      // Multiple wind layers for more complex movement - using windFrequency and windAmplitude
      float wind1 = noise12(worldPos.xz * windFrequency * 2.0 + time * windSpeed * 0.8) * windStrength * heightFactor * windInfluence * windAmplitude;
      float wind2 = noise12(worldPos.xz * windFrequency * 4.0 + time * windSpeed * 1.2) * windStrength * heightFactor * windInfluence * windAmplitude * 0.6;
      float wind3 = noise12(worldPos.xz * windFrequency * 1.0 + time * windSpeed * 0.3) * windStrength * heightFactor * windInfluence * windAmplitude * 0.4;
      float wind4 = noise12(worldPos.xz * windFrequency * 6.0 + time * windSpeed * 1.5) * windStrength * heightFactor * windInfluence * windAmplitude * 0.3;
      
      // Add flapping motion - side-to-side movement
      float flapping = sin(time * windSpeed * 2.0 + worldPos.x * windFrequency + worldPos.z * windFrequency) * windStrength * heightFactor * windInfluence * windAmplitude * 0.4 * flappingIntensity;
      
      // Combine wind effects with flapping
      float totalWind = (wind1 + wind2 + wind3 + wind4 + flapping) * windTurbulence;
      
      // Apply wind along the wind axis
      pos.x += totalWind * windAxis.x;
      pos.z += totalWind * windAxis.z;
      
      // Enhanced rotation for more realistic movement
      float windRotation = noise12(worldPos.xz * windFrequency * 3.0 + time * windSpeed * 0.6) * windStrength * heightFactor * windInfluence * windAmplitude * 0.15 * windTurbulence;
      pos.xz = rotate2D(windRotation) * pos.xz;
      
      // Add vertical swaying motion
      float verticalSway = sin(time * windSpeed * 1.5 + worldPos.x * windFrequency * 1.6 + worldPos.z * windFrequency * 1.6) * windStrength * heightFactor * windInfluence * windAmplitude * 0.2;
      pos.y += verticalSway;
      
      // Apply instance offset
      pos += offset;
      
      // Calculate world position for moon reflection
      vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
      
      // Calculate view position for SSS
      vViewPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
      
      // Calculate normals
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate thickness for subsurface scattering
      // Thicker at base, thinner at tips
      vThickness = (1.0 - vHeight) * 0.8 + 0.2;
      
      // Calculate view direction for environment reflections (IBL)
      vec3 worldPosCalc = (modelMatrix * vec4(pos, 1.0)).xyz;
      vViewDir = normalize(cameraPosition - worldPosCalc);

      // Calculate reflection vector for environment map sampling
      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
      vReflect = reflect(-vViewDir, worldNormal);
      
      // SimonDev's grass color - use uniform colors instead of hardcoded
      vGrassColour = vec3(1.0, 1.0, 1.0); // White base, let fragment shader handle colors
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  // SimonDev's exact fragment shader with Contact Shadows (AAA technique)
  const fragmentShader = `
    uniform sampler2D grassTexture;
    uniform samplerCube envMap;
    uniform float envMapIntensity;
    uniform float roughnessBase;
    uniform float roughnessTip;
    uniform float fresnelPower;
    uniform bool enableEnvMap;
    uniform float roughnessIntensity;
    uniform vec3 baseColor;
    uniform vec3 middleColor;
    uniform vec3 tipColor;
    uniform vec3 veryTipColor;
    uniform float gradientPower;
    uniform float time;
    uniform float grassDensity;
    uniform bool disableLighting;
    uniform float specularIntensity;
    uniform vec3 specularColor;
    uniform float specularPower;
    uniform bool disableMoonReflection;
    uniform float moonIntensity;
    uniform vec3 moonDirection;
    uniform vec3 moonColor;
    uniform bool disableTextureTint;
    uniform vec3 lightPosition;
    uniform float sssIntensity;
    uniform float sssPower;
    uniform float sssScale;
    uniform vec3 sssColor;
    uniform bool disableSSS;
    uniform float contactShadowIntensity;
    uniform float contactShadowRadius;
    uniform float contactShadowBias;
    uniform bool enableAO;
    uniform float aoIntensity;
    uniform float aoRadius;
    uniform bool enableColorVariation;
    uniform float colorVariationIntensity;
    uniform float tipColorVariationIntensity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vGrassColour;
    varying float vHeight;
    varying float vGrassType;
    varying float vWindInfluence;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vLightPosition;
    varying float vThickness;
    varying vec3 vColorVariation;
    varying vec3 vTipColorVariation;
    varying vec3 vReflect;
    varying vec3 vViewDir;
    
    // Contact Shadow function - simulates ground shadows
    float getContactShadow(vec3 worldPos, vec3 lightDir) {
      // Calculate shadow based on grass density and height
      float shadow = 1.0;
      
      // Base shadow intensity based on grass density
      float densityShadow = 1.0 - (grassDensity * 0.3);
      
      // Height-based shadow - taller grass casts more shadow
      float heightShadow = 1.0 - (vHeight * 0.4);
      
      // Distance-based shadow - closer to ground = more shadow
      float groundDistance = worldPos.y;
      float distanceShadow = 1.0 - smoothstep(0.0, contactShadowRadius, groundDistance) * 0.6;
      
      // Combine shadow factors
      shadow = min(densityShadow, min(heightShadow, distanceShadow));
      
      // Apply contact shadow intensity
      shadow = mix(1.0, shadow, contactShadowIntensity);
      
      return shadow;
    }
    
    // Ambient Occlusion approximation
    float getAmbientOcclusion(vec3 worldPos, vec3 normal) {
      // Simulate ambient occlusion based on grass density and position
      float ao = 1.0;
      
      // Base AO from grass density
      ao *= 1.0 - (grassDensity * 0.2);
      
      // Height-based AO - lower parts are more occluded
      ao *= 1.0 - (1.0 - vHeight) * 0.3;
      
      // Position-based variation using controllable radius
      float noise = sin(worldPos.x * aoRadius) * cos(worldPos.z * aoRadius) * 0.1;
      ao += noise;
      
      // Apply intensity control
      ao = mix(1.0, ao, aoIntensity);
      
      return clamp(ao, 0.3, 1.0);
    }
    
    void main() {
      // Sample the grass texture
      vec4 texColor = texture2D(grassTexture, vUv);
      
      // Alpha test
      if (texColor.a < 0.1) discard;
      
      // Simple 3-color gradient system using UV coordinates
      // Base: 0-10%, Middle: 10-60%, Tip: 60-100%
      float gradient = vUv.y; // vUv.y goes from 0 to 1 (bottom to top of blade)
      
      vec3 color;
      if (enableColorVariation) {
        if (gradient < 0.1) {
          // Base to middle (0-10%) - small base
          float t = gradient / 0.1;
          vec3 baseColorVaried = baseColor + vColorVariation * 0.3 * colorVariationIntensity;
          vec3 middleColorVaried = middleColor + vColorVariation * 0.4 * colorVariationIntensity;
          color = mix(baseColorVaried, middleColorVaried, t);
        } else if (gradient < 0.6) {
          // Middle area (10-60%) - 50% of the blade (still dominant)
          vec3 middleColorVaried = middleColor + vColorVariation * 0.4 * colorVariationIntensity;
          color = middleColorVaried;
        } else {
          // Middle to tip (60-100%) - 40% of the blade (much more tip space!)
          float t = (gradient - 0.6) / 0.4;
          vec3 middleColorVaried = middleColor + vColorVariation * 0.4 * colorVariationIntensity;
          vec3 tipColorVaried = tipColor + vTipColorVariation * 0.5 * tipColorVariationIntensity;
          color = mix(middleColorVaried, tipColorVaried, t);
        }
      } else {
        // No color variation - use original colors
        if (gradient < 0.1) {
          float t = gradient / 0.1;
          color = mix(baseColor, middleColor, t);
        } else if (gradient < 0.6) {
          color = middleColor; // 50% of the blade (still dominant)
        } else {
          float t = (gradient - 0.6) / 0.4;
          color = mix(middleColor, tipColor, t);
        }
      }
      
      // Apply texture (optional)
      if (!disableTextureTint) {
        color *= texColor.rgb;
      } else {
        color *= 1.0; // Use pure color without texture tint
      }
      
      // Environment map reflections for realistic roughness
      if (enableEnvMap) {
        float roughness = mix(roughnessBase, roughnessTip, vHeight) * roughnessIntensity;
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), fresnelPower);
        vec3 envColor = textureCube(envMap, vReflect).rgb;
        float reflectionStrength = mix(0.15, 0.85, vHeight) * fresnel * envMapIntensity;
        vec3 upVector = vec3(0.0, 1.0, 0.0);
        vec3 ambientEnv = textureCube(envMap, upVector).rgb;
        float ambientStrength = (1.0 - vHeight) * 0.3 * envMapIntensity;
        color = color + envColor * reflectionStrength + ambientEnv * ambientStrength;
      }
      
      // Enhanced lighting with specular reflections for realistic grass
      if (!disableLighting) {
        // Main directional light
        vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
        vec3 normal = normalize(vNormal);
        float NdotL = max(dot(normal, lightDir), 0.0);
        
        // Enhanced depth variation - more dramatic for 3D effect
        float depthVariation = 0.4 + 0.6 * vHeight; // More contrast between base and tip
        
        // Enhanced rim lighting for better depth perception
        vec3 viewDir = normalize(-vViewPosition);
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        rim = pow(rim, 1.5); // Less harsh rim lighting
        
        // Add side lighting for more 3D appearance
        vec3 sideLightDir = normalize(vec3(0.5, 0.3, 1.0));
        float sideNdotL = max(dot(normal, sideLightDir), 0.0);
        
        // Enhanced specular reflection with roughness variation
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), specularPower);
        
        // Apply roughness to specular - rougher surfaces have more scattered specular
        float roughness = mix(roughnessBase, roughnessTip, vHeight) * roughnessIntensity;
        spec *= (1.0 - roughness * 0.8); // Reduce specular intensity based on roughness
        
        vec3 specular = specularColor * spec * specularIntensity;
        
        // Moon reflection - additional specular for moonlight (optional)
        if (!disableMoonReflection) {
          // Treat moonDirection as a direction vector, not a position
          vec3 moonDir = normalize(moonDirection);
          vec3 moonReflectDir = reflect(-moonDir, normal);
          float moonSpec = pow(max(dot(viewDir, moonReflectDir), 0.0), specularPower * 0.8);
          vec3 moonSpecular = moonColor * moonSpec * specularIntensity * moonIntensity * 3.0; // Custom moon color
          specular += moonSpecular;
        }
        
        // SUBSUBFACE SCATTERING - Enhanced for better visibility!
        vec3 sssContribution = vec3(0.0);
        if (!disableSSS) {
          // Calculate backscattering for translucency effect
          float backScatter = max(dot(-lightDir, normal), 0.0);
          float frontScatter = max(dot(lightDir, normal), 0.0);
          
          // Enhanced SSS calculation with multiple scattering layers
          float sss = pow(backScatter, sssPower) * vThickness * sssScale;
          float sssFront = pow(frontScatter, sssPower * 0.5) * vThickness * sssScale * 0.3;
          
          // Add rim lighting for translucency
          float rimSSS = pow(rim, 2.0) * vThickness * 0.5;
          
          // Combine all SSS contributions
          float totalSSS = sss + sssFront + rimSSS;
          totalSSS = clamp(totalSSS, 0.0, 1.0);
          
          // Apply subsurface scattering color with enhanced visibility
          sssContribution = sssColor * totalSSS * sssIntensity;
        }
        
        // Enhanced lighting calculation for more 3D appearance
        float mainLight = 0.4 + 0.4 * NdotL; // Main directional light
        float sideLight = 0.2 + 0.2 * sideNdotL; // Side lighting for depth
        float rimLight = 0.1 + 0.1 * rim; // Rim lighting for edges
        
        float lighting = mainLight + sideLight + rimLight;
        lighting *= depthVariation;
        
        // Add roughness-based variation to make grass look more natural
        float roughnessVariation = 0.8 + 0.4 * sin(vWorldPosition.x * 0.1) * cos(vWorldPosition.z * 0.1);
        lighting *= roughnessVariation;
        
        color = color * lighting + specular + sssContribution;
      }
      
      // CONTACT SHADOWS - AAA technique for realistic ground shadows
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      float contactShadow = getContactShadow(vWorldPosition, lightDir);
      color *= contactShadow;
      
      // AMBIENT OCCLUSION - adds depth and realism
      if (enableAO) {
        float ao = getAmbientOcclusion(vWorldPosition, vNormal);
        color *= ao;
      }
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `;

  // SimonDev's exact controls - bright colors with better gradient
  const {
    // Grass count control
    grassCount,
    baseColor,
    middleColor,
    tipColor,
    veryTipColor,
    gradientPower,
    maxDistance,
    lodLevels,
    highDetailDistance,
    mediumDetailDistance,
    disableLighting,
    specularIntensity,
    specularColor,
    specularPower,
    windStrength,
    windSpeed,
    windFrequency,
    windAmplitude,
    windTurbulence,
    flappingIntensity,
    // Additional controls
    grassHeightMultiplier,
    grassScaleMultiplier,
    windDirectionX,
    windDirectionZ,
    grassDensity,
    shadowCasting,
    shadowReceiving,
    alphaTest,
    disableMoonReflection,
    moonIntensity,
    moonDirectionX,
    moonDirectionY,
    moonDirectionZ,
    moonColor,
    disableTextureTint,
    textureRepeatX,
    textureRepeatY,
    // Subsurface Scattering controls
    sssIntensity,
    sssPower,
    sssScale,
    sssColor,
    disableSSS,
    // Contact Shadow controls (AAA technique)
    contactShadowIntensity,
    contactShadowRadius,
    contactShadowBias,
    // Ambient Occlusion controls
    enableAO,
    aoIntensity,
    aoRadius,
    // Color variation controls
    enableColorVariation,
    colorVariationIntensity,
    tipColorVariationIntensity,
    // Grass shape controls
    grassBaseWidth,
    grassTipWidth,
    grassTaperStart,
    grassTaperSharpness,
    grassTaperCurve,
    // Environment map controls
    enableEnvMap,
    envMapIntensity,
    roughnessBase,
    roughnessTip,
    fresnelPower,
    roughnessIntensity,
    environmentType,
  } = useControls("SimonDev Grass 6", {
    // Grass count control
    grassCount: { value: 100000, min: 1000, max: 200000, step: 1000 },
    baseColor: { value: "#2d5016" }, // Dark green base
    middleColor: { value: "#4a7c59" }, // Main green (takes most space)
    tipColor: { value: "#fcff00" }, // Light green/yellow tips
    veryTipColor: { value: "#ff0000" }, // Very tip color (red for debug)
    gradientPower: { value: 0.3, min: 0.1, max: 2, step: 0.1 }, // Lower power = more tip color
    maxDistance: { value: 100, min: 50, max: 200, step: 10 }, // Max render distance
    lodLevels: { value: 3, min: 1, max: 5, step: 1 }, // Number of LOD levels
    highDetailDistance: { value: 20, min: 5, max: 50, step: 5 }, // Distance for high detail LOD
    mediumDetailDistance: { value: 40, min: 10, max: 80, step: 5 }, // Distance for medium detail LOD
    disableLighting: { value: false }, // Test option to disable lighting
    specularIntensity: { value: 1.5, min: 0, max: 3, step: 0.1 }, // Specular reflection strength
    specularColor: { value: "#4a7c59" }, // Specular reflection color
    specularPower: { value: 32, min: 8, max: 128, step: 8 }, // Specular shininess
    windStrength: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Strength",
    }, // Overall wind strength
    windSpeed: { value: 1.0, min: 0.1, max: 3.0, step: 0.1 }, // Wind animation speed
    windFrequency: {
      value: 0.1,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Wind Frequency",
    }, // Lower = longer waves
    windAmplitude: {
      value: 0.3,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: "Wind Amplitude",
    }, // Higher = more dramatic waves
    windTurbulence: { value: 1.0, min: 0.1, max: 2.0, step: 0.1 }, // Wind turbulence amount
    flappingIntensity: { value: 1.0, min: 0.0, max: 3.0, step: 0.1 }, // Flapping motion intensity
    // Additional controls
    grassHeightMultiplier: {
      value: 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      label: "Grass Height Multiplier",
    },
    grassScaleMultiplier: {
      value: 0.6,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      label: "Grass Scale Multiplier",
    },
    windDirectionX: {
      value: 1.0,
      min: -2.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Direction X",
    },
    windDirectionZ: {
      value: 0.5,
      min: -2.0,
      max: 2.0,
      step: 0.1,
      label: "Wind Direction Z",
    },
    grassDensity: {
      value: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.1,
      label: "Grass Density",
    },
    shadowCasting: { value: true, label: "Cast Shadows" },
    shadowReceiving: { value: true, label: "Receive Shadows" },
    // Contact Shadow controls (AAA technique)
    contactShadowIntensity: {
      value: 0.8,
      min: 0.0,
      max: 1.0,
      label: "Contact Shadow Intensity",
    },
    contactShadowRadius: {
      value: 2.0,
      min: 0.1,
      max: 10.0,
      label: "Contact Shadow Radius",
    },
    contactShadowBias: {
      value: 0.1,
      min: 0.0,
      max: 1.0,
      label: "Contact Shadow Bias",
    },
    // Ambient Occlusion controls for debugging
    enableAO: {
      value: true,
      label: "Enable Ambient Occlusion",
    },
    aoIntensity: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "AO Intensity",
    },
    aoRadius: {
      value: 0.1,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      label: "AO Radius",
    },
    // Color variation controls for realistic grass
    enableColorVariation: {
      value: false,
      label: "Enable Color Variation",
    },
    colorVariationIntensity: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Color Variation Intensity",
    },
    tipColorVariationIntensity: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Tip Color Variation Intensity",
    },
    alphaTest: {
      value: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: "Alpha Test Threshold",
    },
    disableMoonReflection: { value: false, label: "Disable Moon Reflection" },
    moonIntensity: {
      value: 2.0,
      min: 0.0,
      max: 5.0,
      step: 0.1,
      label: "Moon Reflection Intensity",
    },
    moonDirectionX: {
      value: -15.0,
      min: -50.0,
      max: 50.0,
      step: 5.0,
      label: "Moon Direction X",
    },
    moonDirectionY: {
      value: 25.0,
      min: 10.0,
      max: 50.0,
      step: 5.0,
      label: "Moon Direction Y",
    },
    moonDirectionZ: {
      value: 10.0,
      min: -50.0,
      max: 50.0,
      step: 5.0,
      label: "Moon Direction Z",
    },
    moonColor: {
      value: "#ff0000",
      label: "Moon Color",
    },
    disableTextureTint: { value: true, label: "Disable Texture Tint" },
    textureRepeatX: {
      value: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: "Texture Repeat X",
    },
    textureRepeatY: {
      value: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: "Texture Repeat Y",
    },
    // Subsurface Scattering controls
    sssIntensity: {
      value: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      label: "SSS Intensity",
    },
    sssPower: {
      value: 1.5,
      min: 0.5,
      max: 5.0,
      step: 0.1,
      label: "SSS Power",
    },
    sssScale: {
      value: 2.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: "SSS Scale",
    },
    sssColor: {
      value: "#8fbc8f",
      label: "SSS Color",
    },
    disableSSS: {
      value: true,
      label: "Disable SSS",
    },
    // Grass shape controls
    grassBaseWidth: {
      value: 1.0,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      label: "Grass Base Width",
    },
    grassTipWidth: {
      value: 0.2,
      min: 0.05,
      max: 0.8,
      step: 0.05,
      label: "Grass Tip Width",
    },
    grassTaperStart: {
      value: 0.6,
      min: 0.3,
      max: 0.9,
      step: 0.05,
      label: "Taper Start Position",
    },
    grassTaperSharpness: {
      value: 2.5,
      min: 1.0,
      max: 5.0,
      step: 0.1,
      label: "Tip Taper Sharpness",
    },
    grassTaperCurve: {
      value: 0.8,
      min: 0.3,
      max: 1.2,
      step: 0.1,
      label: "Overall Taper Curve",
    },
    // Environment map controls
    enableEnvMap: { value: false, label: "Enable Environment Reflections" },
    envMapIntensity: {
      value: 1.0,
      min: 0.0,
      max: 3.0,
      step: 0.1,
      label: "Environment Intensity",
    },
    roughnessBase: {
      value: 0.9,
      min: 0.0,
      max: 1.0,
      step: 0.05,
      label: "Roughness (Base)",
    },
    roughnessTip: {
      value: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.05,
      label: "Roughness (Tip)",
    },
    fresnelPower: {
      value: 3.0,
      min: 1.0,
      max: 10.0,
      step: 0.5,
      label: "Fresnel Power",
    },
    roughnessIntensity: {
      value: 1.0,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      label: "Roughness Intensity",
    },
    environmentType: {
      value: "simple",
      options: ["simple", "hdr"],
      label: "Environment Type",
    },
  });

  // Load texture and create grass
  useEffect(() => {
    if (!groupRef.current) return;

    // Clean up existing grass mesh before creating a new one
    if (grassMeshRef.current) {
      if (groupRef.current) {
        groupRef.current.remove(grassMeshRef.current);
      }
      grassMeshRef.current.geometry?.dispose();
      if (grassMeshRef.current.material) {
        if (Array.isArray(grassMeshRef.current.material)) {
          grassMeshRef.current.material.forEach((mat) => mat.dispose());
        } else {
          grassMeshRef.current.material.dispose();
        }
      }
      grassMeshRef.current = null;
    }

    // Create simple environment map first (will be replaced if HDR is selected)
    const envMap = new THREE.CubeTexture();
    const size = 1;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;

    // Create a simple sky blue color
    context.fillStyle = "#87CEEB";
    context.fillRect(0, 0, size, size);

    // Create cube texture from single image
    envMap.images = [canvas, canvas, canvas, canvas, canvas, canvas];
    envMap.needsUpdate = true;
    envMap.mapping = THREE.CubeReflectionMapping;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/textures/grass.png",
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        texture.repeat.set(textureRepeatX, textureRepeatY);

        // Create grass geometry with more segments for realistic bending
        const grassGeometry = new THREE.PlaneGeometry(
          0.08,
          1.2 * grassHeight * grassHeightMultiplier,
          1,
          12 // Increased to 12 segments for much more flexible bending
        );
        const vertices = grassGeometry.attributes.position
          .array as Float32Array;

        // Enhanced grass blade shape - thicker at base, thin at tip
        for (let i = 0; i < vertices.length; i += 3) {
          const y = vertices[i + 1];
          // Normalize Y to 0-1 range (original geometry is -0.5 to 0.5)
          const normalizedY = y + 0.5;

          // Create a more realistic grass blade shape - straight sides with gentle tip taper
          const baseWidth = grassBaseWidth; // Much wider at base (controllable)
          const tipWidth = grassTipWidth; // Thin at tip (controllable)

          // Customizable grass blade shape using Leva controls
          // Base taper curve
          const baseTaper = 1 - normalizedY * grassTaperCurve;
          let taper = baseTaper;

          // Apply base width scaling
          taper *= grassBaseWidth;

          // Sharp tip taper for the top portion
          if (normalizedY > grassTaperStart) {
            const tipProgress =
              (normalizedY - grassTaperStart) / (1.0 - grassTaperStart);
            const tipTaper = (1 - normalizedY) * grassTaperSharpness;
            taper *= tipTaper;
          }

          // Ensure minimum tip width
          const minTaper = grassTipWidth;
          taper = Math.max(taper, minTaper);

          vertices[i] *= taper;
        }

        // Move the grass geometry up so the bottom edge is at y=0
        // This ensures the bottom of the grass blade sits on the terrain
        for (let i = 0; i < vertices.length; i += 3) {
          vertices[i + 1] += (1.2 * grassHeight * grassHeightMultiplier) / 2; // Move up by half the custom height
        }

        grassGeometry.attributes.position.needsUpdate = true;

        // Add custom attributes for instancing with LOD
        const instanceCount = Math.floor(grassCount);
        const offsets = new Float32Array(instanceCount * 3);
        const scales = new Float32Array(instanceCount);
        const rotations = new Float32Array(instanceCount);
        const windInfluences = new Float32Array(instanceCount);
        const grassTypes = new Float32Array(instanceCount);
        const lodLevels = new Float32Array(instanceCount);
        // Color variation attributes for realistic grass
        const colorVariations = new Float32Array(instanceCount * 3); // RGB variations per blade
        const tipColorVariations = new Float32Array(instanceCount * 3); // Tip color variations

        // Generate instance data with LOD and distance culling (deterministic)
        let instanceIndex = 0;
        for (let i = 0; i < instanceCount; i++) {
          // Deterministic positioning based on index
          const seedX = Math.sin(i * 12.9898) * 43758.5453;
          const seedZ = Math.sin(i * 78.233) * 43758.5453;
          const x = (seedX - Math.floor(seedX) - 0.5) * areaSize;
          const z = (seedZ - Math.floor(seedZ) - 0.5) * areaSize;

          // Skip center area for character movement
          if (Math.abs(x) < 2 && Math.abs(z) < 2) {
            continue;
          }

          // Calculate distance from origin for LOD and culling
          const distance = Math.sqrt(x * x + z * z);

          // Skip grass that's too far away
          if (distance > maxDistance) {
            continue;
          }

          const groundHeight = getGroundHeight ? getGroundHeight(x, z) : 0;

          // LOD system - closer grass is more detailed (deterministic)
          let scale, lodLevel;
          const scaleSeed = Math.sin(i * 3.14159) * 12345.6789;
          const scaleValue = scaleSeed - Math.floor(scaleSeed);

          if (distance < highDetailDistance) {
            // Close range - full detail
            scale =
              (0.6 + scaleValue * 0.8) * grassScale * grassScaleMultiplier;
            lodLevel = 0;
          } else if (distance < mediumDetailDistance) {
            // Medium range - reduced detail
            scale =
              (0.4 + scaleValue * 0.6) * grassScale * grassScaleMultiplier;
            lodLevel = 1;
          } else {
            // Far range - minimal detail
            scale =
              (0.2 + scaleValue * 0.4) * grassScale * grassScaleMultiplier;
            lodLevel = 2;
          }

          // Since we moved the geometry up by half the custom height, we need to account for that
          // The bottom of the grass is now at y=0 in the geometry
          const yOffset = 0; // No additional offset needed since geometry is already positioned correctly

          // Set instance data (deterministic)
          const rotationSeed = Math.sin(i * 2.71828) * 9876.5432;
          const windSeed = Math.sin(i * 1.41421) * 2468.1357;
          const typeSeed = Math.sin(i * 0.57721) * 1357.9246;

          offsets[instanceIndex * 3] = x;
          offsets[instanceIndex * 3 + 1] = groundHeight + yOffset;
          offsets[instanceIndex * 3 + 2] = z;
          scales[instanceIndex] = scale;
          rotations[instanceIndex] =
            (rotationSeed - Math.floor(rotationSeed)) * Math.PI * 2;
          windInfluences[instanceIndex] =
            0.3 + (windSeed - Math.floor(windSeed)) * 0.7;
          grassTypes[instanceIndex] = typeSeed - Math.floor(typeSeed);
          lodLevels[instanceIndex] = lodLevel;

          // Generate color variations for realistic grass
          const colorSeed1 = Math.sin(i * 3.14159) * 11111.1111;
          const colorSeed2 = Math.sin(i * 1.61803) * 22222.2222;
          const colorSeed3 = Math.sin(i * 0.70711) * 33333.3333;

          // Base color variation - subtle green range (-0.1 to +0.1)
          colorVariations[instanceIndex * 3] =
            (colorSeed1 - Math.floor(colorSeed1) - 0.5) * 0.1; // R (very subtle red)
          colorVariations[instanceIndex * 3 + 1] =
            (colorSeed2 - Math.floor(colorSeed2) - 0.5) * 0.2; // G (more green variation)
          colorVariations[instanceIndex * 3 + 2] =
            (colorSeed3 - Math.floor(colorSeed3) - 0.5) * 0.05; // B (very subtle blue)

          // Tip color variation - green to yellow range
          const tipSeed1 = Math.sin(i * 2.23607) * 44444.4444;
          const tipSeed2 = Math.sin(i * 1.73205) * 55555.5555;
          const tipSeed3 = Math.sin(i * 0.86603) * 66666.6666;

          tipColorVariations[instanceIndex * 3] =
            (tipSeed1 - Math.floor(tipSeed1) - 0.5) * 0.2; // R (subtle red for yellow tips)
          tipColorVariations[instanceIndex * 3 + 1] =
            (tipSeed2 - Math.floor(tipSeed2) - 0.5) * 0.3; // G (green variation)
          tipColorVariations[instanceIndex * 3 + 2] =
            (tipSeed3 - Math.floor(tipSeed3) - 0.5) * 0.1; // B (subtle blue)

          instanceIndex++;
        }

        // Add attributes to geometry
        grassGeometry.setAttribute(
          "offset",
          new THREE.InstancedBufferAttribute(offsets, 3)
        );
        grassGeometry.setAttribute(
          "scale",
          new THREE.InstancedBufferAttribute(scales, 1)
        );
        grassGeometry.setAttribute(
          "rotation",
          new THREE.InstancedBufferAttribute(rotations, 1)
        );
        grassGeometry.setAttribute(
          "windInfluence",
          new THREE.InstancedBufferAttribute(windInfluences, 1)
        );
        grassGeometry.setAttribute(
          "grassType",
          new THREE.InstancedBufferAttribute(grassTypes, 1)
        );
        grassGeometry.setAttribute(
          "lodLevel",
          new THREE.InstancedBufferAttribute(lodLevels, 1)
        );
        // Add color variation attributes
        grassGeometry.setAttribute(
          "colorVariation",
          new THREE.InstancedBufferAttribute(colorVariations, 3)
        );
        grassGeometry.setAttribute(
          "tipColorVariation",
          new THREE.InstancedBufferAttribute(tipColorVariations, 3)
        );

        // Create SimonDev's custom shader material with shadow support
        const grassMaterial = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            time: { value: 0 },
            grassTexture: { value: texture },
            baseColor: { value: new THREE.Color(baseColor) },
            middleColor: { value: new THREE.Color(middleColor) },
            tipColor: { value: new THREE.Color(tipColor) },
            veryTipColor: { value: new THREE.Color(veryTipColor) },
            gradientPower: { value: gradientPower },
            windStrength: { value: windStrength },
            windDirection: {
              value: new THREE.Vector2(windDirectionX, windDirectionZ),
            },
            grassDensity: { value: grassDensity },
            disableLighting: { value: disableLighting },
            specularIntensity: { value: specularIntensity },
            specularColor: { value: new THREE.Color(specularColor) },
            specularPower: { value: specularPower },
            windSpeed: { value: windSpeed },
            windFrequency: { value: windFrequency },
            windAmplitude: { value: windAmplitude },
            windTurbulence: { value: windTurbulence },
            flappingIntensity: { value: flappingIntensity },
            disableMoonReflection: { value: disableMoonReflection },
            moonIntensity: { value: moonIntensity },
            moonDirection: {
              value: new THREE.Vector3(
                moonDirectionX,
                moonDirectionY,
                moonDirectionZ
              ),
            },
            moonColor: { value: new THREE.Color(moonColor) },
            disableTextureTint: { value: disableTextureTint },
            // Subsurface Scattering uniforms
            lightPosition: { value: new THREE.Vector3(10, 10, 10) },
            sssIntensity: { value: sssIntensity },
            sssPower: { value: sssPower },
            sssScale: { value: sssScale },
            sssColor: { value: new THREE.Color(sssColor) },
            disableSSS: { value: disableSSS },
            // Contact Shadow uniforms (AAA technique)
            contactShadowIntensity: { value: contactShadowIntensity },
            contactShadowRadius: { value: contactShadowRadius },
            contactShadowBias: { value: contactShadowBias },
            // Ambient Occlusion uniforms
            enableAO: { value: enableAO },
            aoIntensity: { value: aoIntensity },
            aoRadius: { value: aoRadius },
            // Color variation uniforms
            enableColorVariation: { value: enableColorVariation },
            colorVariationIntensity: { value: colorVariationIntensity },
            tipColorVariationIntensity: { value: tipColorVariationIntensity },
            // Environment map uniforms
            envMap: { value: envMap },
            enableEnvMap: { value: enableEnvMap },
            envMapIntensity: { value: envMapIntensity },
            roughnessBase: { value: roughnessBase },
            roughnessTip: { value: roughnessTip },
            fresnelPower: { value: fresnelPower },
            roughnessIntensity: { value: roughnessIntensity },
          },
          // Enable shadow support
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: alphaTest,
        });

        // Note: ShaderMaterial doesn't support castShadow/receiveShadow properties
        // Shadow support is handled through the instancedMesh properties

        materialRef.current = grassMaterial;

        // Create InstancedMesh with proper bounds for frustum culling
        const instancedMesh = new THREE.InstancedMesh(
          grassGeometry,
          grassMaterial,
          instanceIndex
        );

        // Disable frustum culling to prevent grass from disappearing
        instancedMesh.frustumCulled = false;
        instancedMesh.castShadow = shadowCasting; // Use control for shadow casting
        instancedMesh.receiveShadow = shadowReceiving;

        // Set proper bounds for the grass area
        const boundingBox = new THREE.Box3();
        boundingBox.setFromCenterAndSize(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(areaSize * 2, 10, areaSize * 2)
        );
        instancedMesh.geometry.boundingBox = boundingBox;

        if (groupRef.current) {
          groupRef.current.add(instancedMesh);
        }
        grassMeshRef.current = instancedMesh;

        // Load HDR environment map if selected
        if (environmentType === "hdr") {
          const rgbeLoader = new RGBELoader();
          rgbeLoader.load(
            "/textures/studio_small_09_1k.hdr",
            (hdrTexture) => {
              hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
              // Update material with HDR environment map
              if (materialRef.current) {
                materialRef.current.uniforms.envMap.value = hdrTexture;
              }
            },
            undefined,
            (error) => {
              console.error("Failed to load HDR environment map:", error);
            }
          );
        }

        // Cleanup function
        return () => {
          if (groupRef.current && instancedMesh) {
            groupRef.current.remove(instancedMesh);
          }
          grassGeometry.dispose();
          grassMaterial.dispose();
          texture.dispose();
        };
      },
      undefined,
      (error) => {
        console.error("Failed to load grass texture:", error);
      }
    );
  }, [
    grassCount,
    areaSize,
    grassHeight,
    grassScale,
    getGroundHeight,
    baseColor,
    middleColor,
    tipColor,
    veryTipColor,
    gradientPower,
    maxDistance,
    lodLevels,
    highDetailDistance,
    mediumDetailDistance,
    disableLighting,
    specularIntensity,
    specularColor,
    specularPower,
    windSpeed,
    windFrequency,
    windAmplitude,
    windTurbulence,
    flappingIntensity,
    // Additional dependencies
    grassHeightMultiplier,
    grassScaleMultiplier,
    windDirectionX,
    windDirectionZ,
    grassDensity,
    shadowCasting,
    shadowReceiving,
    alphaTest,
    disableMoonReflection,
    moonIntensity,
    moonDirectionX,
    moonDirectionY,
    moonDirectionZ,
    disableTextureTint,
    textureRepeatX,
    textureRepeatY,
    // Note: SSS parameters removed from dependencies to prevent recreation
    // They are updated in useFrame instead for better performance
    // Grass shape controls
    grassBaseWidth,
    grassTipWidth,
    grassTaperStart,
    grassTaperSharpness,
    grassTaperCurve,
    // Environment map controls
    enableEnvMap,
    envMapIntensity,
    roughnessBase,
    roughnessTip,
    fresnelPower,
    roughnessIntensity,
    environmentType,
    // Ambient Occlusion dependencies
    enableAO,
    aoIntensity,
    aoRadius,
  ]);

  // Update shader uniforms
  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.baseColor.value.set(baseColor);
      materialRef.current.uniforms.middleColor.value.set(middleColor);
      materialRef.current.uniforms.tipColor.value.set(tipColor);
      materialRef.current.uniforms.veryTipColor.value.set(veryTipColor);
      materialRef.current.uniforms.gradientPower.value = gradientPower;
      materialRef.current.uniforms.windStrength.value = windStrength;
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.disableLighting.value = disableLighting;
      materialRef.current.uniforms.specularIntensity.value = specularIntensity;
      materialRef.current.uniforms.specularColor.value.set(specularColor);
      materialRef.current.uniforms.specularPower.value = specularPower;
      materialRef.current.uniforms.windSpeed.value = windSpeed;
      materialRef.current.uniforms.windFrequency.value = windFrequency;
      materialRef.current.uniforms.windAmplitude.value = windAmplitude;
      materialRef.current.uniforms.windTurbulence.value = windTurbulence;
      materialRef.current.uniforms.flappingIntensity.value = flappingIntensity;
      materialRef.current.uniforms.windDirection.value.set(
        windDirectionX,
        windDirectionZ
      );
      materialRef.current.uniforms.grassDensity.value = grassDensity;
      materialRef.current.uniforms.disableMoonReflection.value =
        disableMoonReflection;
      materialRef.current.uniforms.moonIntensity.value = moonIntensity;
      materialRef.current.uniforms.moonDirection.value.set(
        moonDirectionX,
        moonDirectionY,
        moonDirectionZ
      );
      materialRef.current.uniforms.moonColor.value.set(moonColor);
      materialRef.current.uniforms.disableTextureTint.value =
        disableTextureTint;

      // Update Subsurface Scattering uniforms
      materialRef.current.uniforms.sssIntensity.value = sssIntensity;
      materialRef.current.uniforms.sssPower.value = sssPower;
      materialRef.current.uniforms.sssScale.value = sssScale;
      materialRef.current.uniforms.sssColor.value.set(sssColor);
      materialRef.current.uniforms.disableSSS.value = disableSSS;

      // Update Contact Shadow uniforms (AAA technique)
      materialRef.current.uniforms.contactShadowIntensity.value =
        contactShadowIntensity;
      materialRef.current.uniforms.contactShadowRadius.value =
        contactShadowRadius;
      materialRef.current.uniforms.contactShadowBias.value = contactShadowBias;

      // Update Ambient Occlusion uniforms
      materialRef.current.uniforms.enableAO.value = enableAO;
      materialRef.current.uniforms.aoIntensity.value = aoIntensity;
      materialRef.current.uniforms.aoRadius.value = aoRadius;

      // Update Color Variation uniforms
      materialRef.current.uniforms.enableColorVariation.value =
        enableColorVariation;
      materialRef.current.uniforms.colorVariationIntensity.value =
        colorVariationIntensity;
      materialRef.current.uniforms.tipColorVariationIntensity.value =
        tipColorVariationIntensity;

      // Update Environment Map uniforms
      materialRef.current.uniforms.enableEnvMap.value = enableEnvMap;
      materialRef.current.uniforms.envMapIntensity.value = envMapIntensity;
      materialRef.current.uniforms.roughnessBase.value = roughnessBase;
      materialRef.current.uniforms.roughnessTip.value = roughnessTip;
      materialRef.current.uniforms.fresnelPower.value = fresnelPower;
      materialRef.current.uniforms.roughnessIntensity.value =
        roughnessIntensity;

      // Handle environment type switching
      if (
        environmentType === "hdr" &&
        materialRef.current.uniforms.envMap.value.mapping !==
          THREE.EquirectangularReflectionMapping
      ) {
        // Load HDR if not already loaded
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load(
          "/textures/studio_small_09_1k.hdr",
          (hdrTexture) => {
            hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
            materialRef.current.uniforms.envMap.value = hdrTexture;
          },
          undefined,
          (error) => {
            console.error("Failed to load HDR environment map:", error);
          }
        );
      } else if (
        environmentType === "simple" &&
        materialRef.current.uniforms.envMap.value.mapping !==
          THREE.CubeReflectionMapping
      ) {
        // Switch back to simple environment
        const envMap = new THREE.CubeTexture();
        const size = 1;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#87CEEB";
        context.fillRect(0, 0, size, size);
        envMap.images = [canvas, canvas, canvas, canvas, canvas, canvas];
        envMap.needsUpdate = true;
        envMap.mapping = THREE.CubeReflectionMapping;
        materialRef.current.uniforms.envMap.value = envMap;
      }
    }
  });

  return <group ref={groupRef} />;
};

export default SimonDevGrass6;
