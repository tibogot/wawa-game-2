import * as THREE from "three";

/**
 * Simple procedural low-poly tree for testing impostor LOD
 * - Trunk: cylinder
 * - Leaves: cone
 * - Origin at bottom of trunk (y=0)
 *
 * Returns a THREE.Group that can be used directly in OctahedralForest
 */
export function createProceduralTreeObject(): THREE.Group {
  // Create trunk (cylinder)
  const trunkHeight = 2;
  const trunkRadius = 0.1;
  const trunkGeometry = new THREE.CylinderGeometry(
    trunkRadius,
    trunkRadius,
    trunkHeight,
    8 // low poly - 8 segments
  );
  // Translate so bottom is at origin
  trunkGeometry.translate(0, trunkHeight / 2, 0);

  // Create leaves (cone)
  const leavesHeight = 1.5;
  const leavesRadius = 0.8;
  const leavesGeometry = new THREE.ConeGeometry(
    leavesRadius,
    leavesHeight,
    8 // low poly - 8 segments
  );
  // Position leaves on top of trunk
  leavesGeometry.translate(0, trunkHeight + leavesHeight / 2, 0);

  // Create materials
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: "#8B4513", // brown trunk
    roughness: 0.8,
    metalness: 0.1,
  });

  const leavesMaterial = new THREE.MeshStandardMaterial({
    color: "#228B22", // forest green
    roughness: 0.9,
    metalness: 0.0,
  });

  // Create meshes
  const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
  const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);

  // Create group with origin at bottom
  const treeGroup = new THREE.Group();
  treeGroup.add(trunkMesh);
  treeGroup.add(leavesMesh);

  return treeGroup;
}
