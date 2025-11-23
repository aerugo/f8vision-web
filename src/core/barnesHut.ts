import type { Vec3 } from '../types';

/**
 * Octree node for Barnes-Hut algorithm
 * Subdivides 3D space for efficient n-body force calculation
 */
interface OctreeNode {
  // Bounds
  centerX: number;
  centerY: number;
  centerZ: number;
  halfSize: number;

  // Mass properties (for center of mass calculation)
  mass: number;
  comX: number; // Center of mass X
  comY: number;
  comZ: number;

  // Children (8 octants) or null if leaf
  children: (OctreeNode | null)[] | null;

  // Body index if this is a leaf with single body (-1 if internal or empty)
  bodyIndex: number;
}

/**
 * Barnes-Hut Octree for O(n log n) force calculation
 */
export class BarnesHutTree {
  private root: OctreeNode | null = null;
  private theta: number; // Opening angle threshold (typically 0.5-1.0)

  constructor(theta: number = 0.7) {
    this.theta = theta;
  }

  /**
   * Build the octree from a set of positions
   */
  build(positions: Vec3[]): void {
    if (positions.length === 0) {
      this.root = null;
      return;
    }

    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    }

    // Create root node with some padding
    const padding = 10;
    const sizeX = maxX - minX + padding * 2;
    const sizeY = maxY - minY + padding * 2;
    const sizeZ = maxZ - minZ + padding * 2;
    const halfSize = Math.max(sizeX, sizeY, sizeZ) / 2;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    this.root = this.createNode(centerX, centerY, centerZ, halfSize);

    // Insert all bodies
    for (let i = 0; i < positions.length; i++) {
      this.insert(this.root, i, positions[i], positions);
    }
  }

  private createNode(
    centerX: number,
    centerY: number,
    centerZ: number,
    halfSize: number
  ): OctreeNode {
    return {
      centerX,
      centerY,
      centerZ,
      halfSize,
      mass: 0,
      comX: 0,
      comY: 0,
      comZ: 0,
      children: null,
      bodyIndex: -1,
    };
  }

  private getOctant(
    node: OctreeNode,
    pos: Vec3
  ): number {
    let octant = 0;
    if (pos.x >= node.centerX) octant |= 1;
    if (pos.y >= node.centerY) octant |= 2;
    if (pos.z >= node.centerZ) octant |= 4;
    return octant;
  }

  private getChildCenter(
    node: OctreeNode,
    octant: number
  ): { x: number; y: number; z: number } {
    const offset = node.halfSize / 2;
    return {
      x: node.centerX + ((octant & 1) ? offset : -offset),
      y: node.centerY + ((octant & 2) ? offset : -offset),
      z: node.centerZ + ((octant & 4) ? offset : -offset),
    };
  }

  private insert(
    node: OctreeNode,
    bodyIndex: number,
    pos: Vec3,
    allPositions: Vec3[]
  ): void {
    // Update center of mass
    const newMass = node.mass + 1;
    node.comX = (node.comX * node.mass + pos.x) / newMass;
    node.comY = (node.comY * node.mass + pos.y) / newMass;
    node.comZ = (node.comZ * node.mass + pos.z) / newMass;
    node.mass = newMass;

    if (node.children === null && node.bodyIndex === -1) {
      // Empty leaf - just store the body
      node.bodyIndex = bodyIndex;
      return;
    }

    if (node.children === null) {
      // Leaf with existing body - need to subdivide
      node.children = [null, null, null, null, null, null, null, null];

      // Re-insert existing body
      const existingPos = allPositions[node.bodyIndex];
      const existingOctant = this.getOctant(node, existingPos);
      const existingCenter = this.getChildCenter(node, existingOctant);

      node.children[existingOctant] = this.createNode(
        existingCenter.x,
        existingCenter.y,
        existingCenter.z,
        node.halfSize / 2
      );
      this.insert(
        node.children[existingOctant]!,
        node.bodyIndex,
        existingPos,
        allPositions
      );
      node.bodyIndex = -1;
    }

    // Insert new body into appropriate child
    const octant = this.getOctant(node, pos);
    if (node.children[octant] === null) {
      const center = this.getChildCenter(node, octant);
      node.children[octant] = this.createNode(
        center.x,
        center.y,
        center.z,
        node.halfSize / 2
      );
    }
    this.insert(node.children[octant]!, bodyIndex, pos, allPositions);
  }

  /**
   * Calculate repulsion force on a body using Barnes-Hut approximation
   */
  calculateForce(
    bodyIndex: number,
    pos: Vec3,
    repulsionForce: number
  ): Vec3 {
    if (!this.root) return { x: 0, y: 0, z: 0 };

    const force = { x: 0, y: 0, z: 0 };
    this.calculateForceRecursive(this.root, bodyIndex, pos, repulsionForce, force);
    return force;
  }

  private calculateForceRecursive(
    node: OctreeNode,
    bodyIndex: number,
    pos: Vec3,
    repulsionForce: number,
    force: Vec3
  ): void {
    if (node.mass === 0) return;

    // If this is a leaf with the same body, skip
    if (node.bodyIndex === bodyIndex) return;

    const dx = node.comX - pos.x;
    const dy = node.comY - pos.y;
    const dz = node.comZ - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz + 0.1;
    const dist = Math.sqrt(distSq);

    // Check if we can use this node as approximation
    const ratio = (node.halfSize * 2) / dist;

    if (node.children === null || ratio < this.theta) {
      // Use this node's center of mass as approximation
      // Or it's a leaf node
      const f = (repulsionForce * node.mass) / distSq;

      force.x -= (dx / dist) * f;
      force.y -= (dy / dist) * f;
      force.z -= (dz / dist) * f;
    } else {
      // Need to go deeper
      for (const child of node.children) {
        if (child) {
          this.calculateForceRecursive(child, bodyIndex, pos, repulsionForce, force);
        }
      }
    }
  }
}
