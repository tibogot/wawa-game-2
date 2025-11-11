# SimonDevGrass15 - Modular Grass Component

This is a refactored version of SimonDevGrass14Simple, broken down into modular components for better maintainability and debugging.

## Architecture

### Components Structure

```
SimonDevGrass15/
├── SimonDevGrass15.tsx     # Main orchestrator component
├── GrassControls.tsx       # Leva controls configuration
├── GrassGeometry.tsx       # 15-vertex grass blade geometry
├── GrassMaterial.tsx       # Material with shader injection logic
├── GrassEffects.tsx        # useEffect hooks for animations
├── GrassInstances.tsx      # Instance creation and management
├── index.ts               # Export file
└── README.md              # This file
```

### Component Responsibilities

#### `SimonDevGrass15.tsx` (Main Orchestrator)

- Manages overall component state
- Coordinates between all sub-components
- Handles props and renders the final mesh
- **Lines: ~100** (vs 1364 in v14)

#### `GrassControls.tsx` (UI Controls)

- All Leva controls configuration
- Exports `useGrassControls()` hook
- **Lines: ~100**

#### `GrassGeometry.tsx` (Geometry Creation)

- Creates 15-vertex grass blade geometry
- Handles Float16/Float32 precision
- Natural curve and taper logic
- **Lines: ~130**

#### `GrassMaterial.tsx` (Material & Shaders)

- Material creation with MeshStandardMaterial
- All shader injection logic
- Wind effects, color gradients, debug shaders
- **Lines: ~720** (largest component)

#### `GrassEffects.tsx` (Animation Effects)

- Resolution update effects
- Time uniform updates for animations
- **Lines: ~50**

#### `GrassInstances.tsx` (Instance Management)

- Instance creation logic
- Float16/Float32 instance data handling
- Performance calculations and logging
- **Lines: ~200**

## Benefits of Modular Structure

### 🔧 **Easier Debugging**

- Each component has a single responsibility
- Can isolate issues to specific functionality
- Smaller files are easier to navigate

### 🧪 **Better Testing**

- Each component can be tested independently
- Mock dependencies easily
- Unit test specific functionality

### 🔄 **Reusability**

- Geometry/Material can be reused in other grass components
- Controls can be shared across different grass versions
- Effects can be applied to other vegetation

### 📈 **Maintainability**

- Clear separation of concerns
- Easier to modify specific features
- Less cognitive load when working on individual features

### 👥 **Team Development**

- Multiple developers can work on different components
- Easier code reviews (smaller, focused files)
- Reduced merge conflicts

## Usage

### Basic Usage

```tsx
import { SimonDevGrass15 } from "./components/SimonDevGrass15";

<SimonDevGrass15
  grassHeight={1.0}
  grassScale={1.0}
  getGroundHeight={(x, z) => 0}
/>;
```

### Advanced Usage (Access Individual Components)

```tsx
import {
  useGrassGeometry,
  useGrassMaterial,
  useGrassControls,
} from "./components/SimonDevGrass15";

// Use individual hooks in custom components
const geometry = useGrassGeometry({ grassHeight: 1.0, useFloat16: true });
const material = useGrassMaterial({
  /* material props */
});
const controls = useGrassControls();
```

## Migration from v14

The API is identical to SimonDevGrass14Simple. Simply replace the import:

```tsx
// Before
import { SimonDevGrass14Simple } from "./SimonDevGrass14Simple";

// After
import { SimonDevGrass15 } from "./components/SimonDevGrass15";
```

All props and functionality remain the same.

## Performance

- No performance impact from modularization
- Same memory usage as v14
- All optimizations preserved (Float16, instancing, etc.)

## Future Enhancements

With the modular structure, it's now easier to:

- Add new shader effects in `GrassMaterial.tsx`
- Create different geometry variants in `GrassGeometry.tsx`
- Implement LOD systems in `GrassInstances.tsx`
- Add new control panels in `GrassControls.tsx`
