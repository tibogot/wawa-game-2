import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { GlobalWindProvider } from "./components/GlobalWindProvider";
import { Perf } from "r3f-perf";
import * as THREE from "three";
import { useState, useEffect } from "react";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "run", keys: ["Shift"] },
  { name: "jump", keys: ["Space"] },
  { name: "crouch", keys: ["ControlLeft", "ControlRight"] },
  { name: "dance", keys: ["KeyE"] },
  { name: "walkBackward", keys: ["KeyQ"] },
  { name: "roll", keys: ["KeyF"] },
];

function App() {
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    // Check WebGL support
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    
    if (!gl) {
      setWebglError(true);
      console.error("WebGL is not supported or disabled in your browser");
    } else {
      // Test context creation
      try {
        const testCanvas = document.createElement("canvas");
        const testGl = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
        if (!testGl) {
          setWebglError(true);
        }
      } catch (e) {
        setWebglError(true);
        console.error("WebGL context creation failed:", e);
      }
    }
  }, []);

  if (webglError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          padding: "20px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2 style={{ color: "#ff4444", marginBottom: "20px" }}>
          WebGL Error - Cannot Create Context
        </h2>
        <div style={{ maxWidth: "600px", lineHeight: "1.6" }}>
          <p>
            <strong>Your browser cannot create a WebGL context.</strong>
          </p>
          <p style={{ marginTop: "15px" }}>Try these solutions:</p>
          <ol style={{ textAlign: "left", marginTop: "15px" }}>
            <li>
              <strong>Enable Hardware Acceleration:</strong>
              <ul>
                <li>Chrome: Settings → System → Use hardware acceleration when available</li>
                <li>Or type <code>chrome://settings/system</code> in address bar</li>
              </ul>
            </li>
            <li>
              <strong>Update GPU Drivers:</strong> Check your graphics card manufacturer's website
            </li>
            <li>
              <strong>Restart Browser:</strong> Close all tabs and restart
            </li>
            <li>
              <strong>Check Browser Flags:</strong> Make sure WebGL is enabled
            </li>
            <li>
              <strong>Try Another Browser:</strong> Chrome, Firefox, or Edge
            </li>
          </ol>
          <button
            onClick={() => {
              setWebglError(false);
              window.location.reload();
            }}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        camera={{ position: [3, 3, 3], near: 0.1, fov: 40, far: 10000 }}
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        onCreated={({ gl }) => {
          try {
            // Check if WebGL context was created successfully
            const context = gl.getContext();
            if (!context) {
              console.error("Failed to create WebGL context");
              setWebglError(true);
            } else {
              // Check for WebGL context errors
              const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
              if (debugInfo) {
                const vendor = context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                if (vendor === "Disabled" || renderer === "Disabled") {
                  console.error("WebGL is disabled - Vendor:", vendor, "Renderer:", renderer);
                  setWebglError(true);
                }
              }
              
              // Listen for context lost events
              gl.domElement.addEventListener("webglcontextlost", (event) => {
                event.preventDefault();
                console.error("WebGL context lost");
                setWebglError(true);
              });
            }
          } catch (error) {
            console.error("Error in Canvas onCreated:", error);
            setWebglError(true);
          }
        }}
        onError={(error) => {
          console.error("Canvas error:", error);
          if (error.message && error.message.includes("WebGL")) {
            setWebglError(true);
          }
        }}
        style={{
          touchAction: "none",
        }}
      >
        <Perf position="top-left" />
        <GlobalWindProvider>
          <Experience />
        </GlobalWindProvider>
      </Canvas>
    </KeyboardControls>
  );
}

export default App;
