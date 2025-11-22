/**
 * Example usage of OctahedralImpostorComponent
 *
 * This file demonstrates how to use the OctahedralImpostorComponent
 * to create impostors from GLB models.
 */

import React from "react";
import * as THREE from "three";
import { OctahedralImpostorComponent } from "./OctahedralImpostorComponent";

/**
 * Basic example - simple tree impostor
 */
export function BasicTreeImpostor() {
  return (
    <OctahedralImpostorComponent
      modelPath="/models/tree.glb"
      position={[0, 0, 0]}
    />
  );
}

/**
 * Example with custom settings matching the forum post
 */
export function CustomTreeImpostor() {
  return (
    <OctahedralImpostorComponent
      modelPath="/models/tree_elm.glb"
      spritesPerSide={16}
      textureSize={2048}
      useHemiOctahedron={true}
      transparent={false}
      alphaClamp={0.45}
      baseMaterial={THREE.MeshLambertMaterial}
      position={[10, 0, 0]}
      onReady={(impostor) => {
        console.log("Impostor ready!", impostor);
      }}
      onError={(error) => {
        console.error("Failed to create impostor:", error);
      }}
    />
  );
}

/**
 * Example with PBR material for better lighting
 */
export function PBRTreeImpostor() {
  return (
    <OctahedralImpostorComponent
      modelPath="/models/tree_elm.glb"
      spritesPerSide={12}
      textureSize={1024}
      useHemiOctahedron={true}
      transparent={true}
      alphaClamp={0.4}
      baseMaterial={THREE.MeshStandardMaterial}
      position={[20, 0, 0]}
      showOriginalWhileLoading={true}
      hideOriginalWhenReady={true}
    />
  );
}

/**
 * Example with multiple impostors
 */
export function MultipleImpostors() {
  return (
    <>
      <OctahedralImpostorComponent
        modelPath="/models/tree.glb"
        position={[-10, 0, 0]}
        spritesPerSide={8}
        textureSize={1024}
      />
      <OctahedralImpostorComponent
        modelPath="/models/tree.glb"
        position={[0, 0, 0]}
        spritesPerSide={16}
        textureSize={2048}
      />
      <OctahedralImpostorComponent
        modelPath="/models/tree.glb"
        position={[10, 0, 0]}
        spritesPerSide={32}
        textureSize={4096}
      />
    </>
  );
}

/**
 * Preload models for better performance
 */
export function PreloadExample() {
  // Preload the model before using it
  React.useEffect(() => {
    OctahedralImpostorComponent.preload("/models/tree.glb");
  }, []);

  return (
    <OctahedralImpostorComponent
      modelPath="/models/tree.glb"
      position={[0, 0, 0]}
    />
  );
}
