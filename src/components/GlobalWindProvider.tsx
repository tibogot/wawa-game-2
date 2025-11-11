import React, { createContext, useContext, useRef, useEffect } from "react";
import * as THREE from "three";
import { useControls, folder } from "leva";

// Wind calculation service
class WindCalculationService {
  private time = 0;
  private windNoiseScale = 1.0;
  private windNoiseSpeed = 1.0;
  private windNoiseAmplitude = 1.0;

  // Simple noise function for wind (same as in GrassMaterial)
  private noise(p: THREE.Vector2): number {
    const n = Math.sin(p.dot(new THREE.Vector2(12.9898, 78.233))) * 43758.5453;
    return n - Math.floor(n);
  }

  // Smooth noise function (same as in GrassMaterial)
  private smoothNoise(p: THREE.Vector2): number {
    const i = new THREE.Vector2(Math.floor(p.x), Math.floor(p.y));
    const f = new THREE.Vector2(p.x - i.x, p.y - i.y);
    f.multiplyScalar(3.0 - 2.0 * f.x).multiplyScalar(3.0 - 2.0 * f.y);

    const a = this.noise(i);
    const b = this.noise(new THREE.Vector2(i.x + 1.0, i.y));
    const c = this.noise(new THREE.Vector2(i.x, i.y + 1.0));
    const d = this.noise(new THREE.Vector2(i.x + 1.0, i.y + 1.0));

    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(a, b, f.x),
      THREE.MathUtils.lerp(c, d, f.x),
      f.y
    );
  }

  // Calculate wind data for a given world position
  calculateWind(
    worldPos: THREE.Vector3,
    windInfluence: number = 1.0
  ): {
    subtleNoise: number;
    windDirection: number;
    windStrength: number;
  } {
    // 1. First noise sample for subtle movement
    const subtleNoise = this.smoothNoise(
      new THREE.Vector2(
        this.time * this.windNoiseSpeed + worldPos.x * this.windNoiseScale,
        this.time * this.windNoiseSpeed + worldPos.z * this.windNoiseScale
      )
    );
    const subtleNoiseValue = subtleNoise * this.windNoiseAmplitude;

    // 2. Wind direction sample - remap to 0-360 degrees (0 to 2PI)
    const windDirNoise = this.smoothNoise(
      new THREE.Vector2(
        worldPos.x * this.windNoiseScale * 0.05 +
          this.time * this.windNoiseSpeed * 0.05,
        worldPos.z * this.windNoiseScale * 0.05 +
          this.time * this.windNoiseSpeed * 0.05
      )
    );
    const windDirection = (windDirNoise * 0.5 + 0.5) * Math.PI * 2; // 0-2PI

    // 3. Wind strength sample - different spatial frequency
    const windStrengthNoise = this.smoothNoise(
      new THREE.Vector2(
        worldPos.x * this.windNoiseScale * 0.25 +
          this.time * this.windNoiseSpeed,
        worldPos.z * this.windNoiseScale * 0.25 +
          this.time * this.windNoiseSpeed
      )
    );
    const windStrength =
      windStrengthNoise * this.windNoiseAmplitude * windInfluence;

    return {
      subtleNoise: subtleNoiseValue,
      windDirection,
      windStrength,
    };
  }

  // Update wind parameters
  updateWindParams(scale: number, speed: number, amplitude: number) {
    this.windNoiseScale = scale;
    this.windNoiseSpeed = speed;
    this.windNoiseAmplitude = amplitude;
  }

  // Update time (called every frame)
  updateTime(deltaTime: number) {
    this.time += deltaTime;
  }
}

// Wind context type
interface WindContextType {
  windService: WindCalculationService;
  windUniforms: {
    u_time: { value: number };
    u_windNoiseScale: { value: number };
    u_windNoiseSpeed: { value: number };
    u_windNoiseAmplitude: { value: number };
  };
  updateWind: (scale: number, speed: number, amplitude: number) => void;
}

// Create wind context
const WindContext = createContext<WindContextType | null>(null);

// Wind provider component
export const GlobalWindProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const windServiceRef = useRef(new WindCalculationService());
  const windUniformsRef = useRef({
    u_time: { value: 0.0 },
    u_windNoiseScale: { value: 1.0 },
    u_windNoiseSpeed: { value: 1.0 },
    u_windNoiseAmplitude: { value: 1.0 },
  });

  // Leva controls for global wind parameters
  const { windNoiseScale, windNoiseSpeed, windNoiseAmplitude } = useControls({
    Wind: folder(
      {
        windNoiseScale: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
        windNoiseSpeed: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
        windNoiseAmplitude: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
      },
      { collapsed: false }
    ),
  });

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const updateWind = () => {
      const deltaTime = 0.016; // ~60fps
      windServiceRef.current.updateTime(deltaTime);
      windUniformsRef.current.u_time.value = windServiceRef.current["time"];

      animationId = requestAnimationFrame(updateWind);
    };

    updateWind();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const updateWind = (scale: number, speed: number, amplitude: number) => {
    windServiceRef.current.updateWindParams(scale, speed, amplitude);
    windUniformsRef.current.u_windNoiseScale.value = scale;
    windUniformsRef.current.u_windNoiseSpeed.value = speed;
    windUniformsRef.current.u_windNoiseAmplitude.value = amplitude;
  };

  // Apply control changes to global wind immediately
  useEffect(() => {
    updateWind(windNoiseScale, windNoiseSpeed, windNoiseAmplitude);
  }, [windNoiseScale, windNoiseSpeed, windNoiseAmplitude]);

  const contextValue: WindContextType = {
    windService: windServiceRef.current,
    windUniforms: windUniformsRef.current,
    updateWind,
  };

  return (
    <WindContext.Provider value={contextValue}>{children}</WindContext.Provider>
  );
};

// Hook to use wind context
export const useGlobalWind = (): WindContextType => {
  const context = useContext(WindContext);
  if (!context) {
    throw new Error("useGlobalWind must be used within a GlobalWindProvider");
  }
  return context;
};
