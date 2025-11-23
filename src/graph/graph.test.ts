import { describe, it, expect } from 'vitest';
import { FamilyGraph } from './graph';
import type { FamilyData } from '../types';

describe('FamilyGraph', () => {
  const createTestFamily = (): FamilyData => ({
    meta: {
      centeredPersonId: 'me',
    },
    people: [
      // Generation -2 (grandparents)
      { id: 'gp1', name: 'Grandpa 1', childIds: ['parent1', 'uncle1'] },
      {
        id: 'gp2',
        name: 'Grandma 1',
        spouseIds: ['gp1'],
        childIds: ['parent1', 'uncle1'],
      },
      { id: 'gp3', name: 'Grandpa 2', childIds: ['parent2'] },
      {
        id: 'gp4',
        name: 'Grandma 2',
        spouseIds: ['gp3'],
        childIds: ['parent2'],
      },
      // Generation -1 (parents, aunts, uncles)
      {
        id: 'parent1',
        name: 'Dad',
        parentIds: ['gp1', 'gp2'],
        spouseIds: ['parent2'],
        childIds: ['me', 'sibling1'],
      },
      {
        id: 'parent2',
        name: 'Mom',
        parentIds: ['gp3', 'gp4'],
        spouseIds: ['parent1'],
        childIds: ['me', 'sibling1'],
      },
      {
        id: 'uncle1',
        name: 'Uncle',
        parentIds: ['gp1', 'gp2'],
        childIds: ['cousin1'],
      },
      // Generation 0 (self, siblings, cousins)
      {
        id: 'me',
        name: 'Me',
        parentIds: ['parent1', 'parent2'],
        childIds: ['child1'],
        biography: 'This is a long biography about me that spans multiple sentences.',
      },
      { id: 'sibling1', name: 'Sister', parentIds: ['parent1', 'parent2'] },
      { id: 'cousin1', name: 'Cousin', parentIds: ['uncle1'] },
      // Generation +1 (children)
      { id: 'child1', name: 'My Child', parentIds: ['me'] },
    ],
  });

  describe('constructor', () => {
    it('should build nodes from family data', () => {
      const graph = new FamilyGraph(createTestFamily());
      expect(graph.nodes.size).toBe(11);
    });

    it('should build edges for all relationships', () => {
      const graph = new FamilyGraph(createTestFamily());
      // Count edges: parent-child, spouse, sibling
      expect(graph.edges.length).toBeGreaterThan(0);
    });
  });

  describe('generation calculation', () => {
    it('should assign generation 0 to centered person', () => {
      const graph = new FamilyGraph(createTestFamily());
      const centered = graph.nodes.get('me');
      expect(centered?.generation).toBe(0);
    });

    it('should assign negative generations to ancestors', () => {
      const graph = new FamilyGraph(createTestFamily());
      expect(graph.nodes.get('parent1')?.generation).toBe(-1);
      expect(graph.nodes.get('gp1')?.generation).toBe(-2);
    });

    it('should assign positive generations to descendants', () => {
      const graph = new FamilyGraph(createTestFamily());
      expect(graph.nodes.get('child1')?.generation).toBe(1);
    });

    it('should assign same generation to siblings', () => {
      const graph = new FamilyGraph(createTestFamily());
      const me = graph.nodes.get('me');
      const sibling = graph.nodes.get('sibling1');
      expect(me?.generation).toBe(sibling?.generation);
    });

    it('should assign same generation to cousins', () => {
      const graph = new FamilyGraph(createTestFamily());
      const me = graph.nodes.get('me');
      const cousin = graph.nodes.get('cousin1');
      expect(me?.generation).toBe(cousin?.generation);
    });
  });

  describe('biography weight', () => {
    it('should calculate higher weight for longer biographies', () => {
      const graph = new FamilyGraph(createTestFamily());
      const meNode = graph.nodes.get('me');
      const cousinNode = graph.nodes.get('cousin1');

      expect(meNode?.biographyWeight).toBeGreaterThan(0);
      expect(cousinNode?.biographyWeight).toBe(0);
    });
  });

  describe('edge types', () => {
    it('should create parent-child edges', () => {
      const graph = new FamilyGraph(createTestFamily());
      const parentChildEdges = graph.edges.filter(
        (e) => e.type === 'parent-child'
      );
      expect(parentChildEdges.length).toBeGreaterThan(0);
    });

    it('should create spouse edges', () => {
      const graph = new FamilyGraph(createTestFamily());
      const spouseEdges = graph.edges.filter((e) => e.type === 'spouse');
      expect(spouseEdges.length).toBeGreaterThan(0);
    });

    it('should create sibling edges', () => {
      const graph = new FamilyGraph(createTestFamily());
      const siblingEdges = graph.edges.filter((e) => e.type === 'sibling');
      expect(siblingEdges.length).toBeGreaterThan(0);
    });
  });

  describe('getRelatives', () => {
    it('should find all connected relatives', () => {
      const graph = new FamilyGraph(createTestFamily());
      const relatives = graph.getRelatives('me');

      expect(relatives).toContain('parent1');
      expect(relatives).toContain('parent2');
      expect(relatives).toContain('sibling1');
      expect(relatives).toContain('child1');
    });
  });

  describe('getGenerationNodes', () => {
    it('should return all nodes in a generation', () => {
      const graph = new FamilyGraph(createTestFamily());
      const gen0 = graph.getGenerationNodes(0);

      expect(gen0.map((n) => n.id)).toContain('me');
      expect(gen0.map((n) => n.id)).toContain('sibling1');
      expect(gen0.map((n) => n.id)).toContain('cousin1');
    });
  });
});
