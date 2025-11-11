import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface LeafPileMountainProps {
  count?: number;
  areaSize?: number;
  pileRadius?: number;
  pileHeight?: number;
  position?: [number, number, number];
  ybotPosition?: THREE.Vector3;
  ybotVelocity?: THREE.Vector3;
  getGroundHeight?: (x: number, z: number) => number;
  characterInteractionRange?: number;
  characterPushStrength?: number;
  characterSwirlStrength?: number;
  characterExplosionStrength?: number;
}

export const LeafPileMountain: React.FC<LeafPileMountainProps> = ({
  count = 1500,
  areaSize = 20,
  pileRadius = 6,
  pileHeight = 2.5,
  position = [0, 0, 0],
  ybotPosition = new THREE.Vector3(),
  ybotVelocity = new THREE.Vector3(),
  getGroundHeight,
  characterInteractionRange = 10,
  characterPushStrength = 1.2,
  characterSwirlStrength = 0.8,
  characterExplosionStrength = 1.5,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const { camera } = useThree();

  // Reusable vectors to avoid creating new objects each frame
  const tempVec = useRef(new THREE.Vector3());

  // Create optimized leaf geometry
  const geometry = useMemo(() => {
    // Use fewer vertices for better performance
    const geometry = new THREE.PlaneGeometry(0.3, 0.3, 1, 1);
    geometry.rotateX(-Math.PI * 0.5);

    // Create instanced attributes for variation
    const scaleArray = new Float32Array(count);
    const rotationArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      scaleArray[i] = Math.random() * 0.5 + 0.5;
      rotationArray[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scaleArray, 1)
    );
    geometry.setAttribute(
      "aRotation",
      new THREE.InstancedBufferAttribute(rotationArray, 1)
    );

    return geometry;
  }, [count]);

  // Optimized material with vertex colors
  const material = useMemo(() => {
    const leafColors = [
      new THREE.Color("#c4c557"),
      new THREE.Color("#ff782b"),
      new THREE.Color("#8B4513"),
      new THREE.Color("#A0522D"),
      new THREE.Color("#D2691E"),
      new THREE.Color("#CD853F"),
      new THREE.Color("#228B22"),
      new THREE.Color("#006400"),
      new THREE.Color("#32CD32"),
      new THREE.Color("#9ACD32"),
      new THREE.Color("#B22222"),
      new THREE.Color("#DC143C"),
      new THREE.Color("#8B0000"),
      new THREE.Color("#2F4F4F"),
      new THREE.Color("#556B2F"),
      new THREE.Color("#6B8E23"),
      new THREE.Color("#DAA520"),
      new THREE.Color("#B8860B"),
    ];

    const colorArray = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const colorA = leafColors[Math.floor(Math.random() * leafColors.length)];
      const colorB = leafColors[Math.floor(Math.random() * leafColors.length)];
      const color = colorA.clone().lerp(colorB, Math.random());

      // Slight variation
      color.r = Math.max(
        0,
        Math.min(1, color.r + (Math.random() - 0.5) * 0.15)
      );
      color.g = Math.max(
        0,
        Math.min(1, color.g + (Math.random() - 0.5) * 0.15)
      );
      color.b = Math.max(
        0,
        Math.min(1, color.b + (Math.random() - 0.5) * 0.15)
      );

      color.toArray(colorArray, i * 3);
    }

    geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(colorArray, 3)
    );

    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: true,
    });
  }, [count, geometry]);

  // Leaf physics data with improved structure
  const leafDataRef = useRef<
    Array<{
      pos: Float32Array; // [x, y, z]
      vel: Float32Array; // [x, y, z]
      rot: Float32Array; // [x, y, z]
      groundOffset: number;
      angularVel: Float32Array; // [x, y, z] for more realistic tumbling
      isResting: boolean; // Track if leaf is at rest
      restTimer: number; // How long it's been resting
      pileHeight: number; // Height from ground for this leaf in the pile
    }>
  >([]);

  // Initialize leaf data in a mountain/pile shape on the ground
  useEffect(() => {
    leafDataRef.current = [];

    const [centerX, centerY, centerZ] = position;

    for (let i = 0; i < count; i++) {
      // Create a mound/pile distribution
      // Use polar coordinates for better pile shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * pileRadius; // sqrt for uniform distribution
      const distanceFromCenter = radius;

      // Calculate height based on distance from center (mountain shape)
      // Closer to center = higher in the pile
      const normalizedDistance = Math.min(distanceFromCenter / pileRadius, 1);
      const heightFactor = 1 - normalizedDistance; // 1 at center, 0 at edge
      // Use a curve to make it more mountain-like
      const heightCurve = Math.pow(heightFactor, 1.5);
      const leafHeightInPile = heightCurve * pileHeight * (0.7 + Math.random() * 0.3);

      const x = centerX + Math.cos(angle) * distanceFromCenter;
      const z = centerZ + Math.sin(angle) * distanceFromCenter;
      const groundY = getGroundHeight ? getGroundHeight(x, z) : centerY;

      leafDataRef.current.push({
        pos: new Float32Array([
          x,
          groundY + leafHeightInPile,
          z,
        ]),
        vel: new Float32Array([
          (Math.random() - 0.5) * 0.05, // Very slow initial velocity
          -Math.random() * 0.1,
          (Math.random() - 0.5) * 0.05,
        ]),
        rot: new Float32Array([
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ]),
        groundOffset: Math.random() * 0.02,
        angularVel: new Float32Array([
          (Math.random() - 0.5) * 0.5, // Very slow angular velocity
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
        ]),
        isResting: true, // Start resting since they're in a pile
        restTimer: Math.random() * 2, // Random rest timer so they don't all check at once
        pileHeight: leafHeightInPile,
      });
    }
  }, [count, pileRadius, pileHeight, position, getGroundHeight]);

  // Animation with optimizations
  useFrame((state, delta) => {
    if (!meshRef.current || !dummy.current) return;

    const mesh = meshRef.current;
    const dummyObj = dummy.current;
    const time = state.clock.elapsedTime;

    // Clamp delta to avoid physics explosions
    const safeDelta = Math.min(delta, 0.1);

    // Cache character position for faster access
    const charX = ybotPosition.x;
    const charY = ybotPosition.y;
    const charZ = ybotPosition.z;
    const charVelX = ybotVelocity.x;
    const charVelY = ybotVelocity.y;
    const charVelZ = ybotVelocity.z;
    const charSpeed = Math.sqrt(charVelX * charVelX + charVelZ * charVelZ);

    // Update each leaf
    leafDataRef.current.forEach((leaf, i) => {
      // Check distance to character
      const dx = leaf.pos[0] - charX;
      const dz = leaf.pos[2] - charZ;
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);

      // Wake up resting leaves if character approaches
      if (leaf.isResting && dist < characterInteractionRange * 1.2) {
        leaf.isResting = false;
        leaf.restTimer = 0;
      }

      // Skip most physics for resting leaves (performance optimization)
      if (leaf.isResting) {
        // Only update matrix every 15th frame for resting leaves
        if (i % 15 === Math.floor(time * 60) % 15) {
          dummyObj.position.set(leaf.pos[0], leaf.pos[1], leaf.pos[2]);
          dummyObj.rotation.set(leaf.rot[0], leaf.rot[1], leaf.rot[2]);
          const scale = geometry.getAttribute("aScale").getX(i);
          dummyObj.scale.setScalar(scale);
          dummyObj.updateMatrix();
          mesh.setMatrixAt(i, dummyObj.matrix);
        }
        return;
      }

      // Character interaction - much more explosive for pile effect!
      const influence = Math.max(0, 1 - dist / characterInteractionRange);

      if (influence > 0.05) {
        const invDist = 1 / (dist + 0.1);

        // Strong push away from character
        const pushX = dx * invDist * influence * 80.0 * safeDelta * characterPushStrength;
        const pushZ = dz * invDist * influence * 80.0 * safeDelta * characterPushStrength;
        leaf.vel[0] += pushX;
        leaf.vel[2] += pushZ;

        // Strong upward explosion effect
        const upwardForce = influence * 35.0 * safeDelta * characterExplosionStrength;
        leaf.vel[1] += upwardForce;

        // Character velocity influence - make leaves follow character's movement
        if (charSpeed > 0.1) {
          const velFactor =
            influence * characterPushStrength * 20.0 * safeDelta;
          leaf.vel[0] += charVelX * velFactor;
          leaf.vel[2] += charVelZ * velFactor;

          // Strong swirl effect
          const swirlStrength =
            influence * charSpeed * characterSwirlStrength * 15.0 * safeDelta;
          leaf.vel[0] += -charVelZ * swirlStrength;
          leaf.vel[2] += charVelX * swirlStrength;
        }

        // EXTRA explosive force when very close (like stepping right into the pile)
        if (dist < 4) {
          const closeInfluence = Math.max(0, 1 - dist / 4);
          leaf.vel[1] += closeInfluence * 40.0 * safeDelta * characterExplosionStrength;
          
          // Radial explosion
          const explosionAngle = Math.random() * Math.PI * 2;
          const explosionForce = closeInfluence * 50.0 * safeDelta * characterExplosionStrength;
          leaf.vel[0] += Math.cos(explosionAngle) * explosionForce;
          leaf.vel[2] += Math.sin(explosionAngle) * explosionForce;

          // Add intense tumbling
          leaf.angularVel[0] += (Math.random() - 0.5) * 30 * closeInfluence;
          leaf.angularVel[1] += (Math.random() - 0.5) * 30 * closeInfluence;
          leaf.angularVel[2] += (Math.random() - 0.5) * 30 * closeInfluence;
        }
      }

      // Gentle wind effect (less than falling leaves since these are on ground)
      const windX = Math.sin(leaf.pos[0] * 0.05 + time * 1.5) * 0.05 * safeDelta;
      const windZ = Math.cos(leaf.pos[2] * 0.05 + time * 1.2) * 0.05 * safeDelta;
      leaf.vel[0] += windX;
      leaf.vel[2] += windZ;

      // Gravity
      leaf.vel[1] -= 9.81 * safeDelta;

      // Check ground collision
      const groundY = getGroundHeight
        ? getGroundHeight(leaf.pos[0], leaf.pos[2])
        : position[1];
      const isOnGround = leaf.pos[1] <= groundY + 0.05 + leaf.groundOffset;

      if (isOnGround) {
        leaf.pos[1] = groundY + 0.01 + leaf.groundOffset;

        // Ground collision response
        if (leaf.vel[1] < 0) {
          leaf.vel[1] = Math.abs(leaf.vel[1]) * 0.2; // Slightly more bounce
        }

        // Strong horizontal damping on ground (more friction for pile effect)
        leaf.vel[0] *= 0.65;
        leaf.vel[2] *= 0.65;
        leaf.vel[1] *= 0.8;

        // Keep leaves flat on ground when at rest
        if (Math.abs(leaf.vel[0]) < 0.05 && Math.abs(leaf.vel[2]) < 0.05) {
          leaf.rot[0] = 0;
          leaf.rot[2] = 0;
          leaf.angularVel[0] = 0;
          leaf.angularVel[2] = 0;
        }

        // Check if leaf should rest (more lenient - easier to settle)
        const speedSq = leaf.vel[0] * leaf.vel[0] + leaf.vel[2] * leaf.vel[2];
        if (speedSq < 0.0005 && influence < 0.15 && dist > characterInteractionRange * 0.7) {
          leaf.restTimer += safeDelta;
          if (leaf.restTimer > 0.8) {
            leaf.isResting = true;
            leaf.vel[0] = 0;
            leaf.vel[1] = 0;
            leaf.vel[2] = 0;
            leaf.angularVel[0] = 0;
            leaf.angularVel[1] = 0;
            leaf.angularVel[2] = 0;
          }
        } else {
          leaf.restTimer = 0;
        }
      } else {
        // Air damping
        leaf.vel[0] *= 0.97;
        leaf.vel[1] *= 0.97;
        leaf.vel[2] *= 0.97;

        // Angular damping in air
        leaf.angularVel[0] *= 0.94;
        leaf.angularVel[1] *= 0.94;
        leaf.angularVel[2] *= 0.94;

        // Tumbling based on velocity - only when airborne
        leaf.angularVel[0] += leaf.vel[0] * 0.6;
        leaf.angularVel[2] += leaf.vel[2] * 0.6;

        // Flutter effect - leaves oscillate as they fall
        leaf.angularVel[0] += Math.sin(time * 4 + i) * 3 * safeDelta;
        leaf.angularVel[2] += Math.cos(time * 3.5 + i) * 3 * safeDelta;

        // Update rotation with angular velocity - only when airborne
        leaf.rot[0] += leaf.angularVel[0] * safeDelta;
        leaf.rot[1] += leaf.angularVel[1] * safeDelta;
        leaf.rot[2] += leaf.angularVel[2] * safeDelta;
      }

      // Update position
      leaf.pos[0] += leaf.vel[0] * safeDelta;
      leaf.pos[1] += leaf.vel[1] * safeDelta;
      leaf.pos[2] += leaf.vel[2] * safeDelta;

      // Prevent leaves from going too far (respawn at pile position)
      const [centerX, centerY, centerZ] = position;
      const distFromCenterX = leaf.pos[0] - centerX;
      const distFromCenterZ = leaf.pos[2] - centerZ;
      const distFromCenterSq = distFromCenterX * distFromCenterX + distFromCenterZ * distFromCenterZ;

      if (distFromCenterSq > areaSize * areaSize * 2) {
        // Respawn near the pile center
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * pileRadius;
        const normalizedDistance = Math.min(radius / pileRadius, 1);
        const heightCurve = Math.pow(1 - normalizedDistance, 1.5);
        const leafHeightInPile = heightCurve * pileHeight * (0.7 + Math.random() * 0.3);
        
        const groundY = getGroundHeight
          ? getGroundHeight(centerX + Math.cos(angle) * radius, centerZ + Math.sin(angle) * radius)
          : centerY;

        leaf.pos[0] = centerX + Math.cos(angle) * radius;
        leaf.pos[1] = groundY + leafHeightInPile;
        leaf.pos[2] = centerZ + Math.sin(angle) * radius;
        leaf.vel[0] = (Math.random() - 0.5) * 0.05;
        leaf.vel[1] = -Math.random() * 0.1;
        leaf.vel[2] = (Math.random() - 0.5) * 0.05;
        leaf.isResting = true;
        leaf.restTimer = Math.random() * 2;
      }

      // Update instance matrix
      dummyObj.position.set(leaf.pos[0], leaf.pos[1], leaf.pos[2]);
      dummyObj.rotation.set(leaf.rot[0], leaf.rot[1], leaf.rot[2]);
      const scale = geometry.getAttribute("aScale").getX(i);
      dummyObj.scale.setScalar(scale);
      dummyObj.updateMatrix();
      mesh.setMatrixAt(i, dummyObj.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};

