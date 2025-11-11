import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { Vector3, MathUtils } from "three";

interface ThirdPersonCameraCollisionProps {
  characterPosition: Vector3;
  characterRotation: number; // Y rotation in radians
  characterVelocity: Vector3;
}

export const ThirdPersonCameraCollision = ({
  characterPosition,
  characterRotation,
  characterVelocity,
}: ThirdPersonCameraCollisionProps) => {
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  const cameraRb = useRef<any>(null);

  const {
    distance,
    height,
    lookAtHeight,
    cameraRadius,
    positionLerpSpeed,
    rotationLerpSpeed,
    collisionPushSpeed,
    minDistance,
    maxDistance,
  } = useControls("📷 Third-Person Camera", {
    distance: {
      value: 6,
      min: 3,
      max: 15,
      step: 0.1,
      label: "Distance Behind Player",
    },
    height: {
      value: 2.5,
      min: 0,
      max: 10,
      step: 0.1,
      label: "Camera Height",
    },
    lookAtHeight: {
      value: 1.5,
      min: 0,
      max: 5,
      step: 0.1,
      label: "Look-At Height",
    },
    cameraRadius: {
      value: 0.3,
      min: 0.1,
      max: 0.8,
      step: 0.05,
      label: "Camera Collision Radius",
    },
    positionLerpSpeed: {
      value: 0.25,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Position Lerp Speed",
    },
    rotationLerpSpeed: {
      value: 0.2,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Rotation Lerp Speed",
    },
    collisionPushSpeed: {
      value: 20,
      min: 5,
      max: 50,
      step: 1,
      label: "Collision Push Speed",
    },
    minDistance: {
      value: 1.5,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: "Min Distance (When Colliding)",
    },
    maxDistance: {
      value: 6,
      min: 3,
      max: 15,
      step: 0.1,
      label: "Max Distance",
    },
  });

  const idealCameraPosition = useRef(new Vector3());
  const currentCameraPosition = useRef(new Vector3());
  const smoothCameraPosition = useRef(new Vector3());
  const smoothLookAtPosition = useRef(new Vector3());
  const cameraInitialized = useRef(false);

  // Initialize camera position on mount
  useEffect(() => {
    if (cameraRb.current && characterPosition) {
      const pos = new Vector3();
      pos.copy(characterPosition);
      pos.y += height;
      pos.x -= Math.sin(characterRotation) * distance;
      pos.z -= Math.cos(characterRotation) * distance;

      cameraRb.current.setTranslation(
        { x: pos.x, y: pos.y, z: pos.z },
        true
      );
      camera.position.copy(pos);
      smoothCameraPosition.current.copy(pos);
      smoothLookAtPosition.current.set(
        characterPosition.x,
        characterPosition.y + lookAtHeight,
        characterPosition.z
      );
      cameraInitialized.current = true;
    }
  }, []);

  useFrame((state, delta) => {
    if (!cameraRb.current) return;

    // Calculate ideal camera position: ALWAYS directly behind player based on their forward direction
    // Forward direction is where player is facing
    const forward = new Vector3(
      Math.sin(characterRotation),
      0,
      Math.cos(characterRotation)
    );

    // Calculate ideal position DIRECTLY BEHIND the player (opposite of forward direction)
    // Behind = opposite direction of forward, so we use -forward
    idealCameraPosition.current.set(
      characterPosition.x - forward.x * distance,
      characterPosition.y + height,
      characterPosition.z - forward.z * distance
    );

    // Check for collisions between character and ideal camera position
    const directionToIdeal = new Vector3()
      .subVectors(idealCameraPosition.current, characterPosition)
      .normalize();

    // Perform raycast from character to ideal camera position to detect obstacles
    const rayOrigin = {
      x: characterPosition.x,
      y: characterPosition.y + lookAtHeight,
      z: characterPosition.z,
    };
    const rayDirection = {
      x: directionToIdeal.x,
      y: directionToIdeal.y,
      z: directionToIdeal.z,
    };

    // Cast ray to check for obstacles
    const maxRayDistance = distance + 1; // Slight buffer
    const ray = new rapier.Ray(rayOrigin, rayDirection);

    // Cast ray to check for obstacles (exclude camera's own rigid body)
    const hit = world.castRay(
      ray,
      maxRayDistance,
      true,
      undefined, // filterFlags
      undefined, // filterGroups
      undefined, // filterExcludeCollider
      cameraRb.current, // filterExcludeRigidBody - exclude camera body
      undefined // filterPredicate
    );

    let finalIdealPosition = idealCameraPosition.current.clone();

    if (hit && hit.timeOfImpact !== undefined && hit.timeOfImpact < distance) {
      // Collision detected - push camera closer to character
      const hitDistance = hit.timeOfImpact;
      // Adjust distance with buffer to prevent camera from clipping into walls
      const adjustedDistance = Math.max(minDistance, hitDistance - cameraRadius * 2);

      finalIdealPosition.set(
        characterPosition.x - forward.x * adjustedDistance,
        characterPosition.y + height,
        characterPosition.z - forward.z * adjustedDistance
      );
    }

    // Smoothly lerp camera rigid body position to ideal position
    const currentRbPos = cameraRb.current.translation();
    currentCameraPosition.current.set(
      currentRbPos.x,
      currentRbPos.y,
      currentRbPos.z
    );

    // Calculate target position with collision adjustment
    // Use faster lerp when player is rotating to keep camera responsive
    const currentToIdeal = new Vector3().subVectors(
      finalIdealPosition,
      smoothCameraPosition.current
    );
    const distanceToIdeal = currentToIdeal.length();
    
    // Increase lerp speed if camera needs to move far (player turned quickly)
    let adaptiveLerpSpeed = positionLerpSpeed;
    if (distanceToIdeal > 2) {
      // Player turned quickly - camera needs to catch up faster
      adaptiveLerpSpeed = Math.min(positionLerpSpeed * 2, 0.5);
    }
    
    smoothCameraPosition.current.lerp(finalIdealPosition, adaptiveLerpSpeed);

    // Move camera rigid body
    cameraRb.current.setTranslation(
      {
        x: smoothCameraPosition.current.x,
        y: smoothCameraPosition.current.y,
        z: smoothCameraPosition.current.z,
      },
      true
    );

    // Update camera position to match rigid body
    camera.position.copy(smoothCameraPosition.current);

    // Calculate look-at target (character head/upper body area)
    const lookAtTarget = new Vector3(
      characterPosition.x,
      characterPosition.y + lookAtHeight,
      characterPosition.z
    );

    // Smoothly update look-at position
    smoothLookAtPosition.current.lerp(lookAtTarget, rotationLerpSpeed);

    // Make camera look at character (always looks at player, never to the side)
    camera.lookAt(smoothLookAtPosition.current);
  });

  return (
    <RigidBody
      ref={cameraRb}
      type="kinematicPositionBased"
      colliders={false}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider
        args={[cameraRadius * 0.1, cameraRadius]}
        position={[0, 0, 0]}
      />
    </RigidBody>
  );
};

