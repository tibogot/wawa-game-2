import React, { useEffect, useRef, useState, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { OctahedralImpostor as CoreOctahedralImpostor } from "../octahedral-impostor/core/octahedralImpostor";
import type { MaterialConstructor } from "../octahedral-impostor/core/octahedralImpostorMaterial";

/**
 * Octahedral Impostor Component for React Three Fiber
 *
 * Creates an octahedral impostor from any GLB/GLTF model. The impostor renders
 * the 3D object as a billboard sprite that dynamically selects and blends views
 * from a pre-rendered texture atlas based on the camera angle.
 *
 * This is perfect for LOD systems where you want to render many distant objects
 * with minimal performance cost (just 2 triangles per object!).
 *
 * Based on: https://github.com/agargaro/octahedral-impostor
 *
 * @example
 * ```tsx
 * <OctahedralImpostorComponent
 *   modelPath="/models/tree.glb"
 *   spritesPerSide={16}
 *   textureSize={2048}
 *   useHemiOctahedron={true}
 *   transparent={false}
 *   alphaClamp={0.45}
 *   baseMaterial={THREE.MeshLambertMaterial}
 *   position={[0, 0, 0]}
 * />
 * ```
 */
export interface OctahedralImpostorComponentProps {
  /**
   * Path to the GLB/GLTF model file (relative to public folder or absolute URL)
   */
  modelPath: string;

  /**
   * Number of sprite cells per side of the atlas grid.
   * Higher values = more views = better quality but larger texture.
   * @default 16
   * @example 16 = 16×16 = 256 unique views
   */
  spritesPerSide?: number;

  /**
   * The full size (in pixels) of the resulting square texture atlas.
   * Higher values = better quality but more memory.
   * @default 2048
   * @example 2048 = 2048×2048 texture
   */
  textureSize?: number;

  /**
   * Whether to use a hemispherical octahedral projection.
   * Use `true` for objects that are typically viewed from above (like trees).
   * Use `false` for objects that can be viewed from any angle.
   * @default true
   */
  useHemiOctahedron?: boolean;

  /**
   * Whether the material should be transparent.
   * @default false
   */
  transparent?: boolean;

  /**
   * Alpha threshold for discarding fragments.
   * Higher values = more aggressive alpha clipping.
   * @default 0.45
   */
  alphaClamp?: number;

  /**
   * Base material type to use for the impostor.
   * This determines lighting behavior (MeshLambertMaterial = basic lighting,
   * MeshStandardMaterial = PBR, MeshBasicMaterial = unlit).
   * @default THREE.MeshLambertMaterial
   */
  baseMaterial?: MaterialConstructor<THREE.Material>;

  /**
   * A multiplier applied to the camera's distance from the object's bounding sphere
   * when generating the texture atlas.
   * @default 1
   */
  cameraFactor?: number;

  /**
   * Callback fired when the impostor is created and ready.
   * Useful for showing loading states or triggering animations.
   */
  onReady?: (impostor: CoreOctahedralImpostor) => void;

  /**
   * Callback fired if there's an error creating the impostor.
   */
  onError?: (error: Error) => void;

  /**
   * Show the original model while the impostor is being generated.
   * @default false
   */
  showOriginalWhileLoading?: boolean;

  /**
   * Hide the original model after the impostor is ready.
   * @default true
   */
  hideOriginalWhenReady?: boolean;

  /**
   * React Three Fiber props (position, rotation, scale, etc.)
   */
  [key: string]: any;
}

// Define the component implementation
const OctahedralImpostorComponentImpl = ({
  modelPath,
  spritesPerSide = 16,
  textureSize = 2048,
  useHemiOctahedron = true,
  transparent = false,
  alphaClamp = 0.45,
  baseMaterial = THREE.MeshLambertMaterial,
  cameraFactor = 1,
  onReady,
  onError,
  showOriginalWhileLoading = false,
  hideOriginalWhenReady = true,
  ...props
}: OctahedralImpostorComponentProps) => {
  const { gl } = useThree();
  const [impostor, setImpostor] = useState<CoreOctahedralImpostor | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const originalModelRef = useRef<THREE.Object3D | null>(null);

  // Load the GLB model
  const gltf = useGLTF(modelPath);

  // Memoize the original model clone to avoid re-cloning
  const originalModel = useMemo(() => {
    if (!gltf?.scene) return null;
    const clone = gltf.scene.clone(true);
    originalModelRef.current = clone;
    return clone;
  }, [gltf]);

  // Create the impostor once the GLTF is loaded
  useEffect(() => {
    if (!gltf?.scene || !originalModel) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Clone the scene so the atlas generation can freely override materials
    const target = originalModel.clone(true);

    console.log("🌲 Creating octahedral impostor from model:", modelPath);
    console.log("   Settings:", {
      spritesPerSide,
      textureSize,
      useHemiOctahedron,
      transparent,
      alphaClamp,
      cameraFactor,
    });

    try {
      const impostorInstance = new CoreOctahedralImpostor({
        renderer: gl,
        target,
        useHemiOctahedron,
        transparent,
        alphaClamp,
        spritesPerSide,
        textureSize,
        cameraFactor,
        baseType: baseMaterial,
      });

      setImpostor(impostorInstance);
      setIsGenerating(false);

      console.log("✅ Octahedral impostor created successfully");

      // Call the onReady callback
      if (onReady) {
        onReady(impostorInstance);
      }

      // Hide original model if requested
      if (hideOriginalWhenReady && originalModelRef.current) {
        originalModelRef.current.visible = false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("❌ Error creating octahedral impostor:", error);
      setError(error);
      setIsGenerating(false);

      if (onError) {
        onError(error);
      }
    }
  }, [
    gl,
    gltf,
    originalModel,
    modelPath,
    useHemiOctahedron,
    transparent,
    alphaClamp,
    spritesPerSide,
    textureSize,
    cameraFactor,
    baseMaterial,
    onReady,
    onError,
    hideOriginalWhenReady,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (impostor) {
        // Dispose geometry
        if (impostor.geometry) {
          impostor.geometry.dispose();
        }
        // Dispose material and textures
        if (impostor.material) {
          if (Array.isArray(impostor.material)) {
            impostor.material.forEach((mat) => {
              if (mat.map) mat.map.dispose();
              if (mat.normalMap) mat.normalMap.dispose();
              mat.dispose();
            });
          } else {
            const mat = impostor.material as any;
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            mat.dispose();
          }
        }
      }
    };
  }, [impostor]);

  // Show error state
  if (error) {
    console.error("OctahedralImpostorComponent error:", error);
    return null;
  }

  // Show loading state
  if (isGenerating || !impostor) {
    // Optionally show original model while loading
    if (showOriginalWhileLoading && originalModel) {
      return <primitive object={originalModel} {...props} />;
    }
    return null;
  }

  // Render the impostor
  return <primitive object={impostor} {...props} />;
};

// Define the component type with preload method
type OctahedralImpostorComponentType =
  React.FC<OctahedralImpostorComponentProps> & {
    /**
     * Preload a model for use with OctahedralImpostorComponent.
     * This helps avoid loading delays when the component mounts.
     *
     * @example
     * ```tsx
     * OctahedralImpostorComponent.preload("/models/tree.glb");
     * ```
     */
    preload: (modelPath: string) => void;
  };

// Assign preload method
(OctahedralImpostorComponentImpl as OctahedralImpostorComponentType).preload = (
  modelPath: string
) => {
  useGLTF.preload(modelPath);
};

// Export with preload method attached
export const OctahedralImpostorComponent =
  OctahedralImpostorComponentImpl as OctahedralImpostorComponentType;

export default OctahedralImpostorComponent;
