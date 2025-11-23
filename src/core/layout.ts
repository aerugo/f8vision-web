import type { GraphNode, GraphEdge, Vec3, EngineConfig } from '../types';
import { BarnesHutTree } from './barnesHut';

// Threshold for using Barnes-Hut algorithm
const BARNES_HUT_THRESHOLD = 100;

/**
 * 3D Force-Directed Layout Algorithm
 * Positions nodes using physics simulation with generation-based layering
 * Uses Barnes-Hut approximation for O(n log n) performance on large graphs
 */
export class ForceDirectedLayout {
  private config: EngineConfig['layout'];
  private barnesHut: BarnesHutTree;
  private useBarnesHut: boolean = false;

  constructor(config: EngineConfig['layout']) {
    this.config = config;
    this.barnesHut = new BarnesHutTree(0.7); // theta = 0.7 for good balance
  }

  /**
   * Calculate layout positions for all nodes
   */
  calculate(
    nodes: GraphNode[],
    edges: GraphEdge[],
    centeredId: string
  ): void {
    // Use Barnes-Hut for large graphs
    this.useBarnesHut = nodes.length > BARNES_HUT_THRESHOLD;

    if (this.useBarnesHut) {
      console.log(`Using Barnes-Hut algorithm for ${nodes.length} nodes`);
    }

    // Initialize positions
    this.initializePositions(nodes, centeredId);

    // Run simulation iterations
    for (let i = 0; i < this.config.iterations; i++) {
      this.simulationStep(nodes, edges, i / this.config.iterations);
    }

    // Center the layout
    this.centerLayout(nodes);
  }

  /**
   * Initialize node positions based on generation
   */
  private initializePositions(nodes: GraphNode[], centeredId: string): void {
    const genGroups = new Map<number, GraphNode[]>();

    // Group by generation
    for (const node of nodes) {
      const gen = node.generation;
      if (!genGroups.has(gen)) {
        genGroups.set(gen, []);
      }
      genGroups.get(gen)!.push(node);
    }

    // Position each generation in a ring/sphere layer
    for (const [gen, genNodes] of genGroups) {
      const radius = Math.abs(gen) * this.config.generationSpacing;
      const y = gen * this.config.generationSpacing * 0.5;

      for (let i = 0; i < genNodes.length; i++) {
        const angle = (i / genNodes.length) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 10;

        genNodes[i].position = {
          x: Math.cos(angle) * (radius + jitter),
          y: y + (Math.random() - 0.5) * 20,
          z: Math.sin(angle) * (radius + jitter),
        };
        genNodes[i].velocity = { x: 0, y: 0, z: 0 };
      }
    }

    // Center person at origin
    const centered = nodes.find((n) => n.id === centeredId);
    if (centered) {
      centered.position = { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Single simulation step
   */
  private simulationStep(
    nodes: GraphNode[],
    edges: GraphEdge[],
    progress: number
  ): void {
    // Reset forces
    for (const node of nodes) {
      node.velocity = { x: 0, y: 0, z: 0 };
    }

    // Apply repulsion between all nodes
    if (this.useBarnesHut) {
      this.applyRepulsionBarnesHut(nodes);
    } else {
      this.applyRepulsionDirect(nodes);
    }

    // Apply attraction along edges
    this.applyAttraction(nodes, edges);

    // Apply center force
    this.applyCenterForce(nodes);

    // Apply generation layering force
    this.applyGenerationForce(nodes);

    // Cooling schedule
    const temperature = 1 - progress * 0.8;

    // Update positions
    for (const node of nodes) {
      node.position.x += node.velocity.x * temperature;
      node.position.y += node.velocity.y * temperature;
      node.position.z += node.velocity.z * temperature;
    }
  }

  /**
   * Repulsion using Barnes-Hut approximation - O(n log n)
   */
  private applyRepulsionBarnesHut(nodes: GraphNode[]): void {
    // Build octree from current positions
    const positions = nodes.map(n => n.position);
    this.barnesHut.build(positions);

    // Calculate force on each node
    for (let i = 0; i < nodes.length; i++) {
      const force = this.barnesHut.calculateForce(
        i,
        nodes[i].position,
        this.config.repulsionForce
      );

      nodes[i].velocity.x += force.x;
      nodes[i].velocity.y += force.y;
      nodes[i].velocity.z += force.z;
    }
  }

  /**
   * Direct repulsion calculation - O(n²)
   */
  private applyRepulsionDirect(nodes: GraphNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;

        const distSq = dx * dx + dy * dy + dz * dz + 0.1;
        const dist = Math.sqrt(distSq);

        const force = this.config.repulsionForce / distSq;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        a.velocity.x -= fx;
        a.velocity.y -= fy;
        a.velocity.z -= fz;

        b.velocity.x += fx;
        b.velocity.y += fy;
        b.velocity.z += fz;
      }
    }
  }

  /**
   * Attraction force along edges
   */
  private applyAttraction(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);

      if (!source || !target) continue;

      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const dz = target.position.z - source.position.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

      // Ideal distance based on edge type
      const idealDist =
        edge.type === 'parent-child'
          ? this.config.generationSpacing
          : edge.type === 'spouse'
            ? this.config.generationSpacing * 0.3
            : this.config.generationSpacing * 0.5;

      const force =
        (dist - idealDist) * this.config.attractionForce * edge.strength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      source.velocity.x += fx;
      source.velocity.y += fy;
      source.velocity.z += fz;

      target.velocity.x -= fx;
      target.velocity.y -= fy;
      target.velocity.z -= fz;
    }
  }

  /**
   * Center force to keep graph from drifting
   */
  private applyCenterForce(nodes: GraphNode[]): void {
    for (const node of nodes) {
      node.velocity.x -= node.position.x * this.config.centerForce;
      node.velocity.z -= node.position.z * this.config.centerForce;
    }
  }

  /**
   * Keep nodes in their generation layer (Y axis)
   */
  private applyGenerationForce(nodes: GraphNode[]): void {
    for (const node of nodes) {
      const targetY = node.generation * this.config.generationSpacing * 0.8;
      node.velocity.y += (targetY - node.position.y) * 0.1;
    }
  }

  /**
   * Center the layout around origin
   */
  private centerLayout(nodes: GraphNode[]): void {
    let cx = 0,
      cy = 0,
      cz = 0;

    for (const node of nodes) {
      cx += node.position.x;
      cy += node.position.y;
      cz += node.position.z;
    }

    cx /= nodes.length;
    cy /= nodes.length;
    cz /= nodes.length;

    for (const node of nodes) {
      node.position.x -= cx;
      node.position.y -= cy;
      node.position.z -= cz;
    }
  }
}

/**
 * Utility functions for vector math
 */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
