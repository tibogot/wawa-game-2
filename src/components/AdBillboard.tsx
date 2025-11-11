import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

interface AdBillboardProps {
  position?: [number, number, number];
  scale?: number;
  billboardColor?: string;
  pylonHeight?: number;
  billboardWidth?: number;
  billboardHeight?: number;
  useTexture?: boolean;
  texturePath?: string;
  textureQuality?: number;
  pylonSpacing?: number;
  pylonRadius?: number;
}

export const AdBillboard: React.FC<AdBillboardProps> = ({
  position = [0, 0, 0],
  scale = 1,
  billboardColor = "#ffffff",
  pylonHeight = 8,
  billboardWidth = 4,
  billboardHeight = 3,
  useTexture = true,
  texturePath = "/textures/billboard.png",
  textureQuality = 16,
  pylonSpacing = 4.5,
  pylonRadius = 0.08,
}) => {
  const billboardRef = useRef<THREE.Mesh>(null);
  const leftPylonRef = useRef<THREE.Mesh>(null);
  const rightPylonRef = useRef<THREE.Mesh>(null);

  // Load billboard texture manually
  const [billboardTexture, setBillboardTexture] =
    useState<THREE.Texture | null>(null);

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
        texture.anisotropy = textureQuality;
        texture.flipY = true; // Flip texture to correct orientation
        setBillboardTexture(texture);
      },
      undefined,
      (error) => {
        console.warn("Failed to load billboard texture:", error);
        // Create a high-quality fallback white texture
        const canvas = document.createElement("canvas");
        canvas.width = 256;
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
          setBillboardTexture(fallbackTexture);
        }
      }
    );
  }, [useTexture, texturePath, textureQuality]);

  // Create billboard geometry (rigid plane, no segments needed for animation)
  const billboardGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(billboardWidth, billboardHeight);
    return geometry;
  }, [billboardWidth, billboardHeight]);

  // Create billboard material (simple, no wind shaders)
  const billboardMaterial = useMemo(() => {
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

    const material = new THREE.MeshStandardMaterial({
      color: billboardColor,
      map: billboardTexture || fallbackTexture,
      side: THREE.FrontSide,
      transparent: false,
    });

    return material;
  }, [billboardColor, textureQuality, billboardTexture]);

  // Update texture when it loads
  useEffect(() => {
    if (billboardMaterial && billboardTexture) {
      billboardMaterial.map = billboardTexture;
      billboardMaterial.needsUpdate = true;
    }
  }, [billboardMaterial, billboardTexture]);

  // Create pylon geometry
  const pylonGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(pylonRadius, pylonRadius, pylonHeight, 8);
  }, [pylonHeight, pylonRadius]);

  // Create pylon material
  const pylonMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#8B4513", // Brown wood color
      roughness: 0.8,
      metalness: 0.1,
    });
  }, []);

  // Calculate positions
  const leftPylonPosition = useMemo(
    (): [number, number, number] => [-pylonSpacing / 2, pylonHeight / 2, 0],
    [pylonSpacing, pylonHeight]
  );
  const rightPylonPosition = useMemo(
    (): [number, number, number] => [pylonSpacing / 2, pylonHeight / 2, 0],
    [pylonSpacing, pylonHeight]
  );
  const billboardPosition = useMemo(
    (): [number, number, number] => [0, pylonHeight - billboardHeight / 2, 0],
    [pylonHeight, billboardHeight]
  );

  return (
    <group position={position} scale={scale}>
      {/* Left Pylon */}
      <mesh
        ref={leftPylonRef}
        geometry={pylonGeometry}
        material={pylonMaterial}
        position={leftPylonPosition}
        castShadow
      />

      {/* Right Pylon */}
      <mesh
        ref={rightPylonRef}
        geometry={pylonGeometry}
        material={pylonMaterial}
        position={rightPylonPosition}
        castShadow
      />

      {/* Billboard (rigid plane between pylons) - Front side */}
      <mesh
        ref={billboardRef}
        geometry={billboardGeometry}
        material={billboardMaterial}
        position={billboardPosition}
        castShadow
      />

      {/* Billboard - Back side (rotated 180 degrees so texture shows correctly from behind) */}
      <mesh
        geometry={billboardGeometry}
        material={billboardMaterial}
        position={billboardPosition}
        rotation={[0, Math.PI, 0]}
        castShadow
      />
    </group>
  );
};

export default AdBillboard;
