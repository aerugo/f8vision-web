/**
 * Core types for the Ancestral Web Engine
 */

export interface Person {
  id: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  biography?: string;
  // Family relationships
  parentIds?: string[];
  spouseIds?: string[];
  childIds?: string[];
  // Computed at runtime
  generation?: number;
}

export interface FamilyData {
  meta?: {
    title?: string;
    centeredPersonId?: string;
    description?: string;
  };
  people: Person[];
}

export interface GraphNode {
  id: string;
  person: Person;
  position: Vec3;
  velocity: Vec3;
  generation: number;
  biographyWeight: number; // 0-1, derived from biography length
  connections: string[];
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'parent-child' | 'spouse' | 'sibling';
  strength: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EngineConfig {
  // Layout parameters
  layout: {
    centerForce: number;
    repulsionForce: number;
    attractionForce: number;
    generationSpacing: number;
    damping: number;
    iterations: number;
  };
  // Visual parameters
  visuals: {
    nodeBaseSize: number;
    nodeSizeMultiplier: number; // Based on biography weight
    glowIntensity: number;
    particleDensity: number;
    edgeCurvature: number;
    colorPrimary: string;
    colorSecondary: string;
    colorAccent: string;
  };
  // Performance
  performance: {
    maxNodes: number;
    lodDistances: number[];
    frustumCulling: boolean;
  };
}

export const DEFAULT_CONFIG: EngineConfig = {
  layout: {
    centerForce: 0.05,
    repulsionForce: 500,
    attractionForce: 0.1,
    generationSpacing: 50,
    damping: 0.85,
    iterations: 300,
  },
  visuals: {
    nodeBaseSize: 2,
    nodeSizeMultiplier: 2.5,
    glowIntensity: 1.5,
    particleDensity: 0.3,
    edgeCurvature: 0.3,
    colorPrimary: '#4080ff',
    colorSecondary: '#80ffdd',
    colorAccent: '#ff80c0',
  },
  performance: {
    maxNodes: 2000,
    lodDistances: [100, 300, 600],
    frustumCulling: true,
  },
};
