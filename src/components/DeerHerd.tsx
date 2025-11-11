import React, { useRef, useEffect, useState } from "react";
import { useControls, folder } from "leva";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CylinderCollider } from "@react-three/rapier";
import { Deer } from "./Deer";
import * as THREE from "three";

/**
 * DeerHerd Component
 *
 * Creates multiple AI-controlled deer that walk, eat, and idle independently.
 * Each deer has its own AI state, position, and animation.
 *
 * Perfect for creating a living, populated world!
 */

type AnimationName = "Idle" | "Idle_2" | "Walk" | "Eating";
type AIState = "idle" | "walking" | "eating";

interface DeerInstance {
  id: number;
  groupRef: React.RefObject<THREE.Group | null>;
  rigidBodyRef: React.RefObject<any>;
  aiState: AIState;
  rotation: number;
  targetRotation: number;
  stateTimer: number;
  nextStateChange: number;
}

interface DeerHerdProps {
  terrainMesh?: THREE.Mesh | null; // Optional terrain for height sampling
  spawnHeight?: number; // Y position to spawn deer at (should match character spawn height)
}

export const DeerHerd: React.FC<DeerHerdProps> = ({
  terrainMesh,
  spawnHeight = 20,
}) => {
  const [deerInstances, setDeerInstances] = useState<DeerInstance[]>([]);
  const { animations } = useGLTF("/models/Deer.gltf");

  const {
    enabled,
    deerCount,
    enableAI,
    walkSpeed,
    rotationSpeed,
    minStateDuration,
    maxStateDuration,
    mapBoundary,
    spawnRadius,
    deerScale,
    castShadow,
    receiveShadow,
    colliderRadius,
    colliderHeight,
    colliderOffsetY,
  } = useControls("🏛️ OBJECTS", {
    deerHerd: folder(
      {
        enabled: {
          value: false,
          label: "✨ Enable Deer Herd",
        },
        deerCount: {
          value: 5,
          min: 1,
          max: 20,
          step: 1,
          label: "🦌 Deer Count (1-20)",
        },
        enableAI: {
          value: true,
          label: "🤖 Enable AI (Auto Behavior)",
        },
        walkSpeed: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "🚶 Walk Speed",
        },
        rotationSpeed: {
          value: 2.0,
          min: 0.5,
          max: 5.0,
          step: 0.5,
          label: "🔄 Rotation Speed",
        },
        minStateDuration: {
          value: 3,
          min: 1,
          max: 10,
          step: 1,
          label: "⏱️ Min Behavior Duration (sec)",
        },
        maxStateDuration: {
          value: 8,
          min: 3,
          max: 20,
          step: 1,
          label: "⏱️ Max Behavior Duration (sec)",
        },
        mapBoundary: {
          value: 40,
          min: 10,
          max: 100,
          step: 5,
          label: "🗺️ Map Boundary",
        },
        spawnRadius: {
          value: 25,
          min: 5,
          max: 50,
          step: 5,
          label: "📍 Spawn Radius (Initial Spread)",
        },
        deerScale: {
          value: 0.5,
          min: 0.2,
          max: 2.0,
          step: 0.1,
          label: "📏 Deer Scale",
        },
        castShadow: {
          value: true,
          label: "🌑 Cast Shadow",
        },
        receiveShadow: {
          value: true,
          label: "🌑 Receive Shadow",
        },
        colliderRadius: {
          value: 1,
          min: 0.1,
          max: 2.0,
          step: 0.1,
          label: "🔵 Collider Radius",
        },
        colliderHeight: {
          value: 1.2,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "📏 Collider Height",
        },
        colliderOffsetY: {
          value: 1,
          min: -2.0,
          max: 2.0,
          step: 0.1,
          label: "⬆️ Collider Offset Y",
        },
      },
      { collapsed: true }
    ),
  });

  // Initialize deer instances when count changes
  useEffect(() => {
    if (!enabled) {
      setDeerInstances([]);
      return;
    }

    const newInstances: DeerInstance[] = [];

    for (let i = 0; i < deerCount; i++) {
      newInstances.push({
        id: i,
        groupRef: React.createRef<THREE.Group>(),
        rigidBodyRef: React.createRef<any>(),
        aiState: Math.random() > 0.5 ? "idle" : "eating",
        rotation: Math.random() * Math.PI * 2,
        targetRotation: Math.random() * Math.PI * 2,
        stateTimer: Math.random() * 3,
        nextStateChange:
          minStateDuration +
          Math.random() * (maxStateDuration - minStateDuration),
      });
    }

    setDeerInstances(newInstances);
    console.log(`🦌 Spawned ${deerCount} deer in herd`);
  }, [enabled, deerCount, spawnRadius, minStateDuration, maxStateDuration]);

  // AI update for all deer
  useFrame((state, delta) => {
    if (!enabled || !enableAI || deerInstances.length === 0) return;

    setDeerInstances((instances) =>
      instances.map((deer) => {
        let newDeer = { ...deer };

        // Update state timer
        newDeer.stateTimer += delta;

        // Check if it's time to change state
        if (newDeer.stateTimer >= newDeer.nextStateChange) {
          const states: AIState[] = ["idle", "walking", "eating"];
          const currentIndex = states.indexOf(newDeer.aiState);
          const availableStates = states.filter((_, i) => i !== currentIndex);
          const newState =
            availableStates[Math.floor(Math.random() * availableStates.length)];

          newDeer.aiState = newState;
          newDeer.stateTimer = 0;
          newDeer.nextStateChange =
            minStateDuration +
            Math.random() * (maxStateDuration - minStateDuration);

          if (newState === "walking") {
            newDeer.targetRotation = Math.random() * Math.PI * 2;
          }
        }

        return newDeer;
      })
    );
  });

  if (!enabled) return null;

  return (
    <>
      {deerInstances.map((deer) => (
        <DeerWithPhysics
          key={deer.id}
          deer={deer}
          animations={animations}
          deerScale={deerScale}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          enableAI={enableAI}
          walkSpeed={walkSpeed}
          rotationSpeed={rotationSpeed}
          mapBoundary={mapBoundary}
          spawnRadius={spawnRadius}
          spawnHeight={spawnHeight}
          colliderRadius={colliderRadius}
          colliderHeight={colliderHeight}
          colliderOffsetY={colliderOffsetY}
        />
      ))}
    </>
  );
};

// Individual deer component with Rapier physics and animation
const DeerWithPhysics: React.FC<{
  deer: DeerInstance;
  animations: THREE.AnimationClip[];
  deerScale: number;
  castShadow: boolean;
  receiveShadow: boolean;
  enableAI: boolean;
  walkSpeed: number;
  rotationSpeed: number;
  mapBoundary: number;
  spawnRadius: number;
  spawnHeight: number;
  colliderRadius: number;
  colliderHeight: number;
  colliderOffsetY: number;
}> = ({
  deer,
  animations,
  deerScale,
  castShadow,
  receiveShadow,
  enableAI,
  walkSpeed,
  rotationSpeed,
  mapBoundary,
  spawnRadius,
  spawnHeight,
  colliderRadius,
  colliderHeight,
  colliderOffsetY,
}) => {
  const { actions } = useAnimations(animations, deer.groupRef);

  // Calculate spawn position (spawn high above terrain, let physics drop them down)
  const spawnPosition: [number, number, number] = React.useMemo(() => {
    const angle = (deer.id / 10) * Math.PI * 2 + Math.random() * 0.5;
    const distance = spawnRadius * (0.5 + Math.random() * 0.5);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    return [x, spawnHeight, z]; // Use spawnHeight (same as character spawn)
  }, [deer.id, spawnRadius, spawnHeight]);

  // Play animation based on AI state
  useEffect(() => {
    if (!enableAI || !actions) return;

    let animationName: AnimationName;

    switch (deer.aiState) {
      case "walking":
        animationName = "Walk";
        break;
      case "eating":
        animationName = "Eating";
        break;
      case "idle":
      default:
        animationName = "Idle_2";
        break;
    }

    Object.values(actions).forEach((action) => {
      action?.stop();
    });

    const selectedAction = actions[animationName];
    if (selectedAction) {
      selectedAction.reset();
      selectedAction.fadeIn(0.3);
      selectedAction.play();
    }

    return () => {
      selectedAction?.fadeOut(0.3);
    };
  }, [deer.aiState, actions, enableAI]);

  // AI movement logic with physics
  useFrame((state, delta) => {
    if (!enableAI || deer.aiState !== "walking" || !deer.rigidBodyRef.current)
      return;

    // Smooth rotation
    const rotDiff = deer.targetRotation - deer.rotation;
    const rotStep = rotationSpeed * delta;

    if (Math.abs(rotDiff) > 0.01) {
      let normalizedDiff = rotDiff;
      while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;

      const rotChange =
        Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), rotStep);
      deer.rotation += rotChange;
    }

    // Get current position from physics
    const currentPos = deer.rigidBodyRef.current.translation();

    // Boundary check
    if (
      Math.abs(currentPos.x) > mapBoundary ||
      Math.abs(currentPos.z) > mapBoundary
    ) {
      deer.targetRotation = deer.rotation + Math.PI;
    } else {
      // Apply movement with physics
      const moveDirection = new THREE.Vector3(
        Math.sin(deer.rotation),
        0,
        Math.cos(deer.rotation)
      );

      const currentVelocity = deer.rigidBodyRef.current.linvel();
      const targetVelocity = moveDirection.multiplyScalar(walkSpeed * 2);
      deer.rigidBodyRef.current.setLinvel(
        {
          x: targetVelocity.x,
          y: currentVelocity.y,
          z: targetVelocity.z,
        },
        true
      );
    }
  });

  return (
    <RigidBody
      ref={deer.rigidBodyRef}
      type="dynamic"
      position={spawnPosition}
      colliders={false}
      ccd={true}
      enabledRotations={[false, false, false]}
    >
      <CylinderCollider
        args={[colliderRadius, colliderHeight]}
        position={[0, colliderOffsetY, 0]}
        friction={0}
        restitution={0}
      />
      <Deer
        ref={deer.groupRef}
        rotation={[0, deer.rotation, 0]}
        scale={deerScale}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
    </RigidBody>
  );
};

export default DeerHerd;
