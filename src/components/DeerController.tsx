import React, { useRef, useEffect, useState } from "react";
import { useControls, folder } from "leva";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CylinderCollider } from "@react-three/rapier";
import { Deer } from "./Deer";
import {
  getTerrainHeight,
  getSafeSpawnPosition,
  getTerrainHeightFromTexture,
} from "../utils/terrainUtils";
import * as THREE from "three";

/**
 * DeerController Component
 *
 * AI-controlled deer that walks, eats, and idles randomly.
 *
 * AI Behaviors:
 * - Walking: Moves forward, rotates smoothly, uses Walk animation
 * - Eating: Stays in place, grazing animation
 * - Idle: Stands still, looking around
 *
 * Features:
 * - Random behavior switching (every 3-8 seconds)
 * - Smooth rotation toward movement direction
 * - Boundary checking (stays within map)
 * - Always on ground (Y = 0)
 */

type AnimationName =
  | "Idle"
  | "Idle_2"
  | "Idle_Headlow"
  | "Walk"
  | "Gallop"
  | "Eating"
  | "Gallop_Jump"
  | "Jump_toIdle"
  | "Attack_Headbutt"
  | "Attack_Kick"
  | "Death"
  | "Idle_HitReact1"
  | "Idle_HitReact2";

type AIState = "idle" | "walking" | "eating";

interface DeerControllerProps {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  terrainMesh?: THREE.Mesh | null; // Optional terrain for height sampling
}

// Terrain height function is now imported from terrainUtils

export const DeerController: React.FC<DeerControllerProps> = ({
  position = [0, 0, 0],
  scale = 1.0,
  rotation = [0, 0, 0],
  terrainMesh,
}) => {
  const group = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<any>(null);
  const { animations } = useGLTF("/models/Deer.gltf");
  const { actions } = useAnimations(animations, group);

  // AI state management
  const [aiState, setAIState] = useState<AIState>("walking"); // Force walking for testing
  const [rotation3D, setRotation3D] = useState(0);
  const [targetRotation, setTargetRotation] = useState(0);
  const [stateTimer, setStateTimer] = useState(0);
  const [nextStateChange, setNextStateChange] = useState(5);

  const {
    enabled,
    enableAI,
    walkSpeed,
    rotationSpeed,
    minStateDuration,
    maxStateDuration,
    mapBoundary,
    deerScale,
    castShadow,
    receiveShadow,
    colliderRadius,
    colliderHeight,
    colliderOffsetY,
  } = useControls("🏛️ OBJECTS", {
    deer: folder(
      {
        enabled: {
          value: false,
          label: "✨ Enable Deer",
        },
        enableAI: {
          value: true,
          label: "🤖 Enable AI (Auto Walk/Eat/Idle)",
        },
        walkSpeed: {
          value: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          label: "🚶 Walk Speed (When Walking)",
        },
        rotationSpeed: {
          value: 2.0,
          min: 0.5,
          max: 5.0,
          step: 0.5,
          label: "🔄 Rotation Speed (Turn Rate)",
        },
        minStateDuration: {
          value: 3,
          min: 1,
          max: 10,
          step: 1,
          label: "⏱️ Min Behavior Duration (seconds)",
        },
        maxStateDuration: {
          value: 8,
          min: 3,
          max: 20,
          step: 1,
          label: "⏱️ Max Behavior Duration (seconds)",
        },
        mapBoundary: {
          value: 40,
          min: 10,
          max: 100,
          step: 5,
          label: "🗺️ Map Boundary (Stay Within)",
        },
        deerScale: {
          value: 0.5,
          min: 0.2,
          max: 2.0,
          step: 0.1,
          label: "📏 Deer Scale (0.5 = Natural Size)",
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

  // Play animation based on AI state
  useEffect(() => {
    if (!enabled || !actions || !enableAI) return;

    let animationName: AnimationName;

    // Map AI state to animation
    switch (aiState) {
      case "walking":
        animationName = "Walk";
        break;
      case "eating":
        animationName = "Eating";
        break;
      case "idle":
      default:
        animationName = "Idle_2"; // Looking around is more natural than static Idle
        break;
    }

    // Stop all animations
    Object.values(actions).forEach((action) => {
      action?.stop();
    });

    // Play selected animation
    const selectedAction = actions[animationName];
    if (selectedAction) {
      selectedAction.reset();
      selectedAction.fadeIn(0.5);
      selectedAction.play();

      console.log(`🦌 Deer AI: ${aiState} → ${animationName}`);
    }

    return () => {
      selectedAction?.fadeOut(0.5);
    };
  }, [enabled, enableAI, aiState, actions]);

  // AI behavior system
  useFrame((state, delta) => {
    if (!enabled || !enableAI) return;

    // Debug: Log AI state occasionally
    if (Math.random() < 0.005) {
      // 0.5% chance to log
      console.log(
        `🦌 Deer AI State: ${aiState}, Timer: ${stateTimer.toFixed(
          1
        )}/${nextStateChange.toFixed(1)}`
      );
    }

    // Update state timer
    setStateTimer((prev) => prev + delta);

    // Check if it's time to change state
    if (stateTimer >= nextStateChange) {
      // Pick random new state
      const states: AIState[] = ["idle", "walking", "eating"];
      const currentIndex = states.indexOf(aiState);

      // Remove current state from options (don't repeat immediately)
      const availableStates = states.filter((_, i) => i !== currentIndex);
      const newState =
        availableStates[Math.floor(Math.random() * availableStates.length)];

      setAIState(newState);
      setStateTimer(0);

      // Random duration for next state (3-8 seconds by default)
      const duration =
        minStateDuration +
        Math.random() * (maxStateDuration - minStateDuration);
      setNextStateChange(duration);

      // If entering walking state, pick random direction
      if (newState === "walking") {
        setTargetRotation(Math.random() * Math.PI * 2);
      }
    }

    // WALKING behavior
    if (aiState === "walking" && rigidBodyRef.current) {
      // Smooth rotation toward target
      const rotDiff = targetRotation - rotation3D;
      const rotStep = rotationSpeed * delta;

      if (Math.abs(rotDiff) > 0.01) {
        // Normalize angle difference (-PI to PI)
        let normalizedDiff = rotDiff;
        while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
        while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;

        const rotChange =
          Math.sign(normalizedDiff) *
          Math.min(Math.abs(normalizedDiff), rotStep);
        setRotation3D((prev) => prev + rotChange);
      }

      // Get current position from physics body
      const currentPos = rigidBodyRef.current.translation();

      // Boundary checking - turn around if reaching edge
      if (
        Math.abs(currentPos.x) > mapBoundary ||
        Math.abs(currentPos.z) > mapBoundary
      ) {
        // Turn around (180 degrees)
        setTargetRotation(rotation3D + Math.PI);
      } else {
        // Apply horizontal movement using correct Rapier API
        const moveDirection = new THREE.Vector3(
          Math.sin(rotation3D),
          0, // Let physics handle Y
          Math.cos(rotation3D)
        );

        // Use setLinvel for direct velocity control
        const currentVelocity = rigidBodyRef.current.linvel();
        const targetVelocity = moveDirection.multiplyScalar(walkSpeed * 2);
        rigidBodyRef.current.setLinvel(
          {
            x: targetVelocity.x,
            y: currentVelocity.y, // Keep Y velocity for gravity
            z: targetVelocity.z,
          },
          true
        );

        // Debug: Log deer movement (only occasionally to avoid spam)
        if (Math.random() < 0.01) {
          // 1% chance to log
          console.log(
            `🦌 Deer moving: Velocity=${targetVelocity
              .length()
              .toFixed(1)}, State=${aiState}`
          );
        }
      }
    }
  });

  if (!enabled) return null;

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={position}
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
        ref={group}
        rotation={[0, rotation3D, 0]}
        scale={deerScale}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
      {/* Debug: Add a visible sphere to make sure the deer is there */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </RigidBody>
  );
};

export default DeerController;
