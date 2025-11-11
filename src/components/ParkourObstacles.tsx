import React from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import { WedgeSlope } from "./WedgeSlope";

export const ParkourObstacles = () => {
  // Load grid texture for tile material
  const gridTexture = useTexture("/textures/grid.png");
  gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
  gridTexture.anisotropy = 16;

  // Memoize uniforms
  const uniforms = useMemo(
    () => ({
      gridTexture: { value: gridTexture },
      gradientIntensity: { value: 0.5 },
    }),
    [gridTexture]
  );

  // Reusable tile material component
  const TileMaterial = () => (
    <CustomShaderMaterial
      baseMaterial={THREE.MeshStandardMaterial}
      vertexShader={`
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        }
      `}
      fragmentShader={`
        uniform sampler2D gridTexture;
        uniform float gradientIntensity;
        varying vec3 vWorldPos;
        
        float hash12(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
          return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
        }
        
        void main() {
          // EXACT same sampling as PlaneMap for matching tiles
          float grid1 = texture2D(gridTexture, vWorldPos.xz * 0.125).r;
          float grid2 = texture2D(gridTexture, vWorldPos.xz * 1.25).r;
          
          // Generate hash for variation
          float gridHash1 = hash12(floor(vWorldPos.xz * 1.25));
          
          // Apply gradient intensity to the variation amount
          float variationAmount = gradientIntensity * 0.2;
          
          // Create grid color with variations
          vec3 gridColour = mix(
            vec3(0.45 + remap(gridHash1, 0.0, 1.0, -variationAmount, variationAmount)), 
            vec3(0.08), 
            grid2
          );
          gridColour = mix(gridColour, vec3(0.0), grid1);
          
          // Set the diffuse color
          csm_DiffuseColor = vec4(gridColour, 1.0);
        }
      `}
      uniforms={uniforms}
      roughness={1.0}
      metalness={0.0}
    />
  );

  return (
    <group>
      {/* ========== SLOPES ========== */}

      {/* LONG CONTINUOUS SLOPE - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[20, 2.5, 15]}
        rotation={[-Math.PI / 12, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[3, 0.25, 10]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.5, 20]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* LONG DOWNWARD SLOPE - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-20, 2.5, 15]}
        rotation={[Math.PI / 12, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[3, 0.25, 10]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.5, 20]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* TEST SLOPE 1 - Very gentle (5 degrees) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[15, 0.3, 5]}
        rotation={[-Math.PI / 36, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[2, 0.2, 4]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.4, 8]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* TEST SLOPE 2 - Gentle (10 degrees) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[15, 0.6, 15]}
        rotation={[-Math.PI / 18, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[2, 0.2, 4]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.4, 8]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* TEST SLOPE 3 - Medium (20 degrees) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[15, 1.2, 25]}
        rotation={[-Math.PI / 9, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[2, 0.2, 4]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.4, 8]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* TEST SLOPE 4 - Steep (30 degrees) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[15, 2, 35]}
        rotation={[-Math.PI / 6, 0, 0]}
        friction={1}
      >
        <CuboidCollider args={[2, 0.2, 4]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.4, 8]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* ========== STAIRS ========== */}

      {/* YELLOW STAIRS - with tile texture */}
      {[...Array(10)].map((_, i) => (
        <RigidBody
          key={`yellow-${i}`}
          type="fixed"
          colliders={false}
          position={[10, i * 0.25 + 0.125, 6 + i * 0.5 + 0.25]}
          friction={1}
        >
          <CuboidCollider
            args={[1.5, 0.125, 0.25]}
            friction={1}
            restitution={0}
          />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3, 0.25, 0.5]} />
            <TileMaterial />
          </mesh>
        </RigidBody>
      ))}

      {/* ========== MINI STAIRCASE - 0.1 unit increments ========== */}
      {[...Array(25)].map((_, i) => (
        <RigidBody
          key={`mini-step-${i}`}
          type="fixed"
          colliders={false}
          position={[5, i * 0.1 + 0.05, -8 + i * 0.3]}
          friction={1}
        >
          <CuboidCollider args={[1, 0.05, 0.15]} friction={1} restitution={0} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2, 0.1, 0.3]} />
            <TileMaterial />
          </mesh>
        </RigidBody>
      ))}

      {/* ========== ELEVATOR - Moves up and down ========== */}
      <Elevator />

      {/* ========== CROUCH TUNNEL (CYLINDER) ========== */}
      {/* Main tunnel cylinder - WITH TRIMESH COLLISION (walkable inside!) */}
      <RigidBody
        type="fixed"
        colliders="trimesh"
        position={[25, 0.8, 25]}
        rotation={[0, 0, Math.PI / 2]}
        friction={0.5}
      >
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.0, 1.0, 10, 24, 1, true]} />
          <meshStandardMaterial
            color="#888888"
            roughness={0.8}
            metalness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </RigidBody>

      {/* ========== WALLS ========== */}

      {/* BIG WALL 2 - Tall wall (Left side) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-15, 2.5, 0]}
        friction={0}
      >
        <CuboidCollider args={[0.25, 2.5, 5]} friction={0} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 5, 10]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* BIG WALL 3 - Tall wall (Right side) - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[15, 2.5, 0]}
        friction={0}
      >
        <CuboidCollider args={[0.25, 2.5, 5]} friction={0} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 5, 10]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* CORNER WALL - Test corner collisions - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-10, 2, -5]}
        friction={0}
      >
        <CuboidCollider args={[0.25, 2, 3]} friction={0} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 4, 6]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* ========== NARROW BALANCE BEAM ========== */}
      {/* Elevated beam - 0.4m wide, 10m long, 1.5m high - Only top surface has collision */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[25, 1.5, -25]}
        friction={1}
      >
        <CuboidCollider args={[0.2, 0.1, 5]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.2, 10]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* Support pillars for beam */}
      <mesh castShadow receiveShadow position={[25, 0.75, -30]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <TileMaterial />
      </mesh>
      <mesh castShadow receiveShadow position={[25, 0.75, -25]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <TileMaterial />
      </mesh>
      <mesh castShadow receiveShadow position={[25, 0.75, -20]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <TileMaterial />
      </mesh>

      {/* ========== TRAMPOLINE / BOUNCE PAD ========== */}
      {/* Trampoline surface - HIGH restitution for bounce */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[30, 0.3, -20]}
        friction={0.5}
        restitution={2.5}
      >
        <CuboidCollider
          args={[1.5, 0.15, 1.5]}
          friction={0.5}
          restitution={2.5}
        />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.3, 3]} />
          <meshStandardMaterial
            color="#00ff88"
            roughness={0.3}
            metalness={0.1}
            emissive="#00ff88"
            emissiveIntensity={0.2}
          />
        </mesh>
      </RigidBody>

      {/* Trampoline frame */}
      <mesh castShadow receiveShadow position={[30, 0.1, -20]}>
        <boxGeometry args={[3.4, 0.2, 3.4]} />
        <meshStandardMaterial color="#333333" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Trampoline support legs */}
      {[
        [28.5, -21.5],
        [31.5, -21.5],
        [28.5, -18.5],
        [31.5, -18.5],
      ].map(([x, z], i) => (
        <mesh key={`trampoline-leg-${i}`} position={[x, -0.1, z]}>
          <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
          <meshStandardMaterial
            color="#333333"
            roughness={0.8}
            metalness={0.3}
          />
        </mesh>
      ))}

      {/* ========== PLATFORMS & STEPS ========== */}

      {/* LANDING PLATFORM at top of yellow stairs - with tile texture */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[10, 2.5, 11.5]}
        friction={1}
      >
        <CuboidCollider args={[1.5, 0.15, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.3, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* ========== DECORATIVE STEPS - WITH CUBOID COLLIDERS ========== */}

      {/* STEP 0 - Extra small height */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-8, 0.05, -6]}
        friction={1}
      >
        <CuboidCollider args={[1, 0.05, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.1, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* STEP 1 - Smallest height */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-8, 0.1, -3]}
        friction={1}
      >
        <CuboidCollider args={[1, 0.1, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.2, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* STEP 2 - Medium-low height */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-8, 0.2, 0]}
        friction={1}
      >
        <CuboidCollider args={[1, 0.2, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.4, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* STEP 3 - Medium-high height */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-8, 0.3, 3]}
        friction={1}
      >
        <CuboidCollider args={[1, 0.3, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.6, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* STEP 4 - Tallest height */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-8, 0.4, 6]}
        friction={1}
      >
        <CuboidCollider args={[1, 0.4, 1]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.8, 2]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* ========== CROUCH OBSTACLES - LOW BARRIERS ========== */}
      {/* Barrier bars - HORIZONTAL with hull collision (can duck under) */}
      {[25, 28, 31, 34].map((z, i) => (
        <RigidBody
          key={`barrier-bar-${i}`}
          type="fixed"
          colliders="hull"
          position={[-25, 1.2, z]}
          friction={0}
        >
          <mesh castShadow receiveShadow rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.15, 0.15, 4.4]} />
            <meshStandardMaterial
              color="#ffaa00"
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Side posts for barriers - THESE have collision */}
      {[25, 28, 31, 34].map((z, i) => (
        <group key={`barrier-posts-${i}`}>
          {/* Left post */}
          <RigidBody type="fixed" colliders="cuboid" position={[-27.2, 0.7, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 1.4, 0.2]} />
              <TileMaterial />
            </mesh>
          </RigidBody>
          {/* Right post */}
          <RigidBody type="fixed" colliders="cuboid" position={[-22.8, 0.7, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 1.4, 0.2]} />
              <TileMaterial />
            </mesh>
          </RigidBody>
        </group>
      ))}

      {/* ========== LOW BRIDGE (Test Forced Crouch) ========== */}
      {/* Bridge deck - walkable surface */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-30, 1.5, -30]}
        friction={1}
      >
        <CuboidCollider args={[3, 0.15, 2]} friction={1} restitution={0} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.3, 4]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* Bridge ceiling - LOW (1.3m clearance, forces crouch) */}
      <RigidBody
        type="fixed"
        colliders="hull"
        position={[-30, 2.6, -30]}
        friction={0}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.2, 4]} />
          <meshStandardMaterial
            color="#6b5d4f"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      </RigidBody>

      {/* Bridge support pillars */}
      <mesh castShadow receiveShadow position={[-33, 0.75, -32]}>
        <boxGeometry args={[0.4, 1.5, 0.4]} />
        <TileMaterial />
      </mesh>
      <mesh castShadow receiveShadow position={[-27, 0.75, -32]}>
        <boxGeometry args={[0.4, 1.5, 0.4]} />
        <TileMaterial />
      </mesh>
      <mesh castShadow receiveShadow position={[-33, 0.75, -28]}>
        <boxGeometry args={[0.4, 1.5, 0.4]} />
        <TileMaterial />
      </mesh>
      <mesh castShadow receiveShadow position={[-27, 0.75, -28]}>
        <boxGeometry args={[0.4, 1.5, 0.4]} />
        <TileMaterial />
      </mesh>

      {/* ========== TILE MATERIAL TEST CUBE ========== */}
      {/* Test cube using external TileMaterial component */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[50, 1, 50]}
        friction={1}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 2, 4]} />
          <TileMaterial />
        </mesh>
      </RigidBody>

      {/* ========== WEDGE SLOPE ========== */}
      <WedgeSlope
        position={[40, 0, 40]}
        rotation={[0, Math.PI / 4, 0]}
        friction={1}
        color="#ffff00"
        width={8}
        height={3}
        depth={4}
      />
    </group>
  );
};

// Elevator component with animation
const Elevator = () => {
  const elevatorRef = React.useRef<any>(null);
  const timeRef = React.useRef(0);
  const animationIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const animate = () => {
      if (elevatorRef.current) {
        timeRef.current += 0.016; // ~60fps

        // Calculate velocity directly from the derivative of sin
        // If position = sin(t * 0.3) * 2.5 + 2.5
        // Then velocity = cos(t * 0.3) * 0.3 * 2.5
        const velocityY = Math.cos(timeRef.current * 0.3) * 0.3 * 2.5;

        // Use velocity-based movement for smooth physics interaction
        elevatorRef.current.setLinvel({ x: 0, y: velocityY, z: 0 }, true);
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animationIdRef.current = requestAnimationFrame(animate);

    // Cleanup function to stop animation when component unmounts
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <RigidBody
      ref={elevatorRef}
      type="kinematicVelocity"
      colliders={false}
      position={[-15, 2.5, -10]}
      friction={2}
      restitution={0}
    >
      <CuboidCollider args={[1.5, 0.15, 1.5]} friction={2} restitution={0} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3, 0.3, 3]} />
        <CustomShaderMaterial
          baseMaterial={THREE.MeshStandardMaterial}
          vertexShader={`
            varying vec3 vWorldPos;
            void main() {
              vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            }
          `}
          fragmentShader={`
            uniform sampler2D gridTexture;
            uniform float gradientIntensity;
            varying vec3 vWorldPos;
            
            float hash12(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
              return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
            }
            
            void main() {
              float grid1 = texture2D(gridTexture, vWorldPos.xz * 0.125).r;
              float grid2 = texture2D(gridTexture, vWorldPos.xz * 1.25).r;
              float gridHash1 = hash12(floor(vWorldPos.xz * 1.25));
              float variationAmount = gradientIntensity * 0.2;
              vec3 gridColour = mix(
                vec3(0.45 + remap(gridHash1, 0.0, 1.0, -variationAmount, variationAmount)), 
                vec3(0.08), 
                grid2
              );
              gridColour = mix(gridColour, vec3(0.0), grid1);
              csm_DiffuseColor = vec4(gridColour, 1.0);
            }
          `}
          uniforms={{
            gridTexture: { value: null },
            gradientIntensity: { value: 0.5 },
          }}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
    </RigidBody>
  );
};
