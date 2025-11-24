import type { FamilyData, GraphNode, GraphEdge, GenealogyEvent, PersonNote } from '../types';
import { calculateBiographyWeight } from '../parser';

/**
 * FamilyGraph represents the family tree as a graph data structure
 * Handles complex relationships including cousins, in-laws, etc.
 */
export class FamilyGraph {
  public nodes: Map<string, GraphNode> = new Map();
  public edges: GraphEdge[] = [];
  public centeredId: string;
  public events: Map<string, GenealogyEvent> = new Map();
  public notes: Map<string, PersonNote> = new Map();
  public eventsByPerson: Map<string, GenealogyEvent[]> = new Map();
  public notesByPerson: Map<string, PersonNote[]> = new Map();

  constructor(familyData: FamilyData) {
    // Build events and notes maps first
    this.buildEventsAndNotes(familyData);

    // Determine centered person: prefer meta setting, then generation 0, then first person
    this.centeredId = this.determineCenteredPerson(familyData);

    this.buildNodes(familyData);
    this.buildEdges(familyData);
    this.calculateGenerations();
  }

  private determineCenteredPerson(familyData: FamilyData): string {
    // First, check meta setting
    if (familyData.meta?.centeredPersonId) {
      return familyData.meta.centeredPersonId;
    }

    // For ancestral-synth format, prefer a person at generation 0 with complete status
    const gen0Person = familyData.people.find(p =>
      p.generation === 0 && p.status === 'complete'
    );
    if (gen0Person) return gen0Person.id;

    // Fall back to any generation 0 person
    const anyGen0 = familyData.people.find(p => p.generation === 0);
    if (anyGen0) return anyGen0.id;

    // Final fallback: first person
    return familyData.people[0]?.id || '';
  }

  private buildEventsAndNotes(familyData: FamilyData): void {
    // Build events map
    if (familyData.events) {
      for (const event of familyData.events) {
        this.events.set(event.id, event);

        // Map events to person
        if (!this.eventsByPerson.has(event.primaryPersonId)) {
          this.eventsByPerson.set(event.primaryPersonId, []);
        }
        this.eventsByPerson.get(event.primaryPersonId)!.push(event);
      }
    }

    // Build notes map
    if (familyData.notes) {
      for (const note of familyData.notes) {
        this.notes.set(note.id, note);

        // Map notes to person
        if (!this.notesByPerson.has(note.personId)) {
          this.notesByPerson.set(note.personId, []);
        }
        this.notesByPerson.get(note.personId)!.push(note);
      }
    }
  }

  private buildNodes(familyData: FamilyData): void {
    for (const person of familyData.people) {
      // Get events for this person
      const personEvents = this.eventsByPerson.get(person.id) || [];

      const node: GraphNode = {
        id: person.id,
        person,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        generation: 0,
        biographyWeight: calculateBiographyWeight(person.biography),
        connections: [],
        events: personEvents,
        eventCount: personEvents.length,
      };
      this.nodes.set(person.id, node);
    }
  }

  private buildEdges(familyData: FamilyData): void {
    const edgeSet = new Set<string>(); // Track unique edges

    const addEdge = (
      sourceId: string,
      targetId: string,
      type: GraphEdge['type']
    ) => {
      const edgeKey = [sourceId, targetId].sort().join('-') + '-' + type;
      if (edgeSet.has(edgeKey)) return;
      edgeSet.add(edgeKey);

      const edge: GraphEdge = {
        id: edgeKey,
        sourceId,
        targetId,
        type,
        strength: type === 'parent-child' ? 1.0 : type === 'spouse' ? 0.8 : 0.5,
      };
      this.edges.push(edge);

      // Add connections to nodes
      this.nodes.get(sourceId)?.connections.push(targetId);
      this.nodes.get(targetId)?.connections.push(sourceId);
    };

    for (const person of familyData.people) {
      // Parent-child relationships
      if (person.childIds) {
        for (const childId of person.childIds) {
          if (this.nodes.has(childId)) {
            addEdge(person.id, childId, 'parent-child');
          }
        }
      }

      // Spouse relationships
      if (person.spouseIds) {
        for (const spouseId of person.spouseIds) {
          if (this.nodes.has(spouseId)) {
            addEdge(person.id, spouseId, 'spouse');
          }
        }
      }
    }

    // Infer sibling relationships from shared parents
    this.inferSiblings(familyData);
  }

  private inferSiblings(familyData: FamilyData): void {
    const parentToChildren = new Map<string, Set<string>>();

    // Build parent -> children mapping
    for (const person of familyData.people) {
      if (person.parentIds) {
        for (const parentId of person.parentIds) {
          if (!parentToChildren.has(parentId)) {
            parentToChildren.set(parentId, new Set());
          }
          parentToChildren.get(parentId)!.add(person.id);
        }
      }
    }

    // Create sibling edges
    const siblingPairs = new Set<string>();
    for (const children of parentToChildren.values()) {
      const childArray = Array.from(children);
      for (let i = 0; i < childArray.length; i++) {
        for (let j = i + 1; j < childArray.length; j++) {
          const pairKey = [childArray[i], childArray[j]].sort().join('-');
          if (!siblingPairs.has(pairKey)) {
            siblingPairs.add(pairKey);

            const edge: GraphEdge = {
              id: pairKey + '-sibling',
              sourceId: childArray[i],
              targetId: childArray[j],
              type: 'sibling',
              strength: 0.6,
            };
            this.edges.push(edge);

            this.nodes.get(childArray[i])?.connections.push(childArray[j]);
            this.nodes.get(childArray[j])?.connections.push(childArray[i]);
          }
        }
      }
    }
  }

  private calculateGenerations(): void {
    // BFS from centered person to assign generations
    const visited = new Set<string>();
    const queue: { id: string; gen: number }[] = [];

    const centeredNode = this.nodes.get(this.centeredId);
    if (!centeredNode) return;

    centeredNode.generation = 0;
    visited.add(this.centeredId);
    queue.push({ id: this.centeredId, gen: 0 });

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      const node = this.nodes.get(id);
      if (!node) continue;

      // Process parent-child edges to determine generation direction
      for (const edge of this.edges) {
        if (edge.type !== 'parent-child') continue;

        let neighborId: string | null = null;
        let genOffset = 0;

        if (edge.sourceId === id && !visited.has(edge.targetId)) {
          // This node is parent, target is child
          neighborId = edge.targetId;
          genOffset = 1;
        } else if (edge.targetId === id && !visited.has(edge.sourceId)) {
          // This node is child, source is parent
          neighborId = edge.sourceId;
          genOffset = -1;
        }

        if (neighborId) {
          visited.add(neighborId);
          const neighborNode = this.nodes.get(neighborId);
          if (neighborNode) {
            neighborNode.generation = gen + genOffset;
            queue.push({ id: neighborId, gen: gen + genOffset });
          }
        }
      }

      // Spouses and siblings get same generation
      for (const edge of this.edges) {
        if (edge.type === 'spouse' || edge.type === 'sibling') {
          let neighborId: string | null = null;

          if (edge.sourceId === id && !visited.has(edge.targetId)) {
            neighborId = edge.targetId;
          } else if (edge.targetId === id && !visited.has(edge.sourceId)) {
            neighborId = edge.sourceId;
          }

          if (neighborId) {
            visited.add(neighborId);
            const neighborNode = this.nodes.get(neighborId);
            if (neighborNode) {
              neighborNode.generation = gen;
              queue.push({ id: neighborId, gen: gen });
            }
          }
        }
      }
    }
  }

  /**
   * Get all relatives connected to a person
   */
  getRelatives(personId: string): string[] {
    const node = this.nodes.get(personId);
    return node ? [...new Set(node.connections)] : [];
  }

  /**
   * Get all nodes in a specific generation
   */
  getGenerationNodes(generation: number): GraphNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) => n.generation === generation
    );
  }

  /**
   * Get the range of generations
   */
  getGenerationRange(): { min: number; max: number } {
    let min = 0;
    let max = 0;
    for (const node of this.nodes.values()) {
      min = Math.min(min, node.generation);
      max = Math.max(max, node.generation);
    }
    return { min, max };
  }

  /**
   * Get all nodes as array
   */
  getNodesArray(): GraphNode[] {
    return Array.from(this.nodes.values());
  }
}
