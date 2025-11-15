import React, {
  useRef,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry";

// Physics constants - EXACT same as original
const DAMPING = 0.97;
const DRAG = 0.1;
const MASS = 0.1;
const restDistance = 25;
const xSegs = 10;
const ySegs = 10;
const clothWidth = restDistance * xSegs;
const clothHeight = restDistance * ySegs;

// Gravity - EXACT same as original
const gravity = new THREE.Vector3(0, -981 * 1.4, 0).multiplyScalar(DRAG);
const TIMESTEP_SQ = 0.018 * 0.018;

// Wind and temp vectors
const windForce = new THREE.Vector3(0, 0, 0);
const tmpForce = new THREE.Vector3();
const diff = new THREE.Vector3();

// Particle class - EXACT same physics as original
class Particle {
  constructor(x, y, z, mass) {
    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3(0, 0, 0);
    this.mass = mass;
    this.invMass = 1 / mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    // Initialize positions
    clothFunction(x, y, this.position);
    clothFunction(x, y, this.previous);
    clothFunction(x, y, this.original);
  }

  addForce(force) {
    this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
  }

  integrate(timesq) {
    const newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DAMPING).add(this.position);
    newPos.add(this.a.multiplyScalar(timesq));

    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;

    this.a.set(0, 0, 0);
  }
}

// Cloth function - EXACT same as original
function clothFunction(u, v, target) {
  const x = (u - 0.5) * clothWidth;
  const y = (v + 0.5) * clothHeight;
  const z = 0;
  target.set(x, y, z);
}

// Satisfy constraints - EXACT same as original
function satisfyConstraints(p1, p2, distance) {
  diff.subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return;

  const correction = diff.multiplyScalar(1 - distance / currentDist);
  const correctionHalf = correction.multiplyScalar(0.5);

  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}

// Cloth class - EXACT same structure as original
class Cloth {
  constructor(w = 10, h = 10) {
    this.w = w;
    this.h = h;

    const particles = [];
    const constraints = [];

    // Create particles
    for (let v = 0; v <= h; v++) {
      for (let u = 0; u <= w; u++) {
        particles.push(new Particle(u / w, v / h, 0, MASS));
      }
    }

    // Create constraints
    const index = (u, v) => u + v * (w + 1);

    for (let v = 0; v < h; v++) {
      for (let u = 0; u < w; u++) {
        constraints.push([
          particles[index(u, v)],
          particles[index(u, v + 1)],
          restDistance,
        ]);

        constraints.push([
          particles[index(u, v)],
          particles[index(u + 1, v)],
          restDistance,
        ]);
      }
    }

    for (let u = w, v = 0; v < h; v++) {
      constraints.push([
        particles[index(u, v)],
        particles[index(u, v + 1)],
        restDistance,
      ]);
    }

    for (let v = h, u = 0; u < w; u++) {
      constraints.push([
        particles[index(u, v)],
        particles[index(u + 1, v)],
        restDistance,
      ]);
    }

    this.particles = particles;
    this.constraints = constraints;
    this.index = index;
  }
}

// Parametric plane function for geometry
function plane(width, height) {
  return function (u, v, target) {
    const x = (u - 0.5) * width;
    const y = (v + 0.5) * height;
    const z = 0;
    target.set(x, y, z);
  };
}

const Flag = forwardRef(
  (
    {
      textureUrl = "https://assets.codepen.io/6958575/internal/avatars/users/default.png",
      enableWind = true,
      windIntensity = 300,
      windDirectionX = 100,
      windDirectionY = 0,
      windDirectionZ = 1,
      windSpeed = 1000,
      windOscillation = 1,
      pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      position = [0, 0, 0],
      scale = 1,
      ...props
    },
    ref
  ) => {
    const groupRef = useRef();
    const meshRef = useRef();

    // Expose the group ref to parent
    useImperativeHandle(ref, () => groupRef.current, []);
    const clothRef = useRef();
    const pinsRef = useRef(pins);
    const enableWindRef = useRef(enableWind);
    const windIntensityRef = useRef(windIntensity);
    const windDirectionXRef = useRef(windDirectionX);
    const windDirectionYRef = useRef(windDirectionY);
    const windDirectionZRef = useRef(windDirectionZ);
    const windSpeedRef = useRef(windSpeed);
    const windOscillationRef = useRef(windOscillation);

    // Load texture
    const texture = useLoader(TextureLoader, textureUrl);

    // Set texture properties
    useEffect(() => {
      if (texture) {
        texture.anisotropy = 16;
        texture.colorSpace = THREE.SRGBColorSpace;
      }
    }, [texture]);

    // Create cloth simulation
    const cloth = useMemo(() => {
      const simulation = new Cloth(xSegs, ySegs);
      clothRef.current = simulation;
      return simulation;
    }, []);

    // Create geometry
    const geometry = useMemo(() => {
      const geom = new ParametricGeometry(
        plane(clothWidth, clothHeight),
        xSegs,
        ySegs
      );
      geom.center();
      return geom;
    }, []);

    // Update refs when props change
    useEffect(() => {
      enableWindRef.current = enableWind;
    }, [enableWind]);

    useEffect(() => {
      pinsRef.current = pins;
    }, [pins]);

    useEffect(() => {
      windIntensityRef.current = windIntensity;
    }, [windIntensity]);

    useEffect(() => {
      windDirectionXRef.current = windDirectionX;
    }, [windDirectionX]);

    useEffect(() => {
      windDirectionYRef.current = windDirectionY;
    }, [windDirectionY]);

    useEffect(() => {
      windDirectionZRef.current = windDirectionZ;
    }, [windDirectionZ]);

    useEffect(() => {
      windSpeedRef.current = windSpeed;
    }, [windSpeed]);

    useEffect(() => {
      windOscillationRef.current = windOscillation;
    }, [windOscillation]);

    // Physics simulation in useFrame - EXACT same as original
    useFrame((state) => {
      const time = state.clock.elapsedTime * 1000;
      const cloth = clothRef.current;

      if (!cloth) return;

      // Update wind force with controllable parameters
      const oscillation =
        Math.sin(time / windSpeedRef.current) * windOscillationRef.current;
      windForce.set(
        windDirectionXRef.current,
        windDirectionYRef.current,
        windDirectionZRef.current + oscillation
      );
      windForce.normalize();
      windForce.multiplyScalar(windIntensityRef.current);

      const particles = cloth.particles;

      // Apply wind force if enabled
      if (enableWindRef.current) {
        let indx;
        const normal = new THREE.Vector3();
        const indices = geometry.index;
        const normals = geometry.attributes.normal;

        for (let i = 0, il = indices.count; i < il; i += 3) {
          for (let j = 0; j < 3; j++) {
            indx = indices.getX(i + j);
            normal.fromBufferAttribute(normals, indx);
            tmpForce
              .copy(normal)
              .normalize()
              .multiplyScalar(normal.dot(windForce));
            particles[indx].addForce(tmpForce);
          }
        }
      }

      // Apply gravity and integrate
      for (let i = 0, il = particles.length; i < il; i++) {
        const particle = particles[i];
        particle.addForce(gravity);
        particle.integrate(TIMESTEP_SQ);
      }

      // Satisfy constraints
      const constraints = cloth.constraints;
      for (let i = 0, il = constraints.length; i < il; i++) {
        const constraint = constraints[i];
        satisfyConstraints(constraint[0], constraint[1], constraint[2]);
      }

      // Pin constraints - calculates the index properly for vertical pinning
      for (let i = 0, il = pinsRef.current.length; i < il; i++) {
        let xy = Math.round(pinsRef.current[i] * xSegs + i);
        if (xy > particles.length) xy = particles.length;
        if (xy < 0) xy = 0;
        const p = particles[xy];
        p.position.copy(p.original);
        p.previous.copy(p.original);
      }

      // Update geometry
      const positionAttribute = geometry.attributes.position;

      for (let i = 0, il = particles.length; i < il; i++) {
        const particle = particles[i];
        positionAttribute.setXYZ(
          i,
          particle.position.x,
          particle.position.y,
          particle.position.z
        );
      }

      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
    });

    return (
      <group ref={groupRef} position={position} scale={scale} {...props}>
        {/* Flag mesh with exact same position and scale as original */}
        <mesh
          ref={meshRef}
          geometry={geometry}
          position={[0.39, 0.12, 0]}
          scale={[0.0013, 0.0013, 0.0013]}
          castShadow
        >
          <meshLambertMaterial map={texture} side={THREE.DoubleSide} />

          {/* Flagpole - vertical pole (exact same as original) */}
          <mesh position={[-125, 25, 0]} castShadow receiveShadow>
            <boxGeometry args={[10, 700, 10]} />
            <meshLambertMaterial />
          </mesh>

          {/* Flagpole base (exact same as original) */}
          <mesh position={[-125, -320, 0]} castShadow receiveShadow>
            <boxGeometry args={[20, 10, 20]} />
            <meshPhongMaterial
              color="silver"
              specular="silver"
              shininess={100}
            />
          </mesh>
        </mesh>
      </group>
    );
  }
);

Flag.displayName = "Flag";

export default Flag;
