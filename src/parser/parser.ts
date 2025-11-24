import * as yaml from 'js-yaml';
import type { FamilyData, Person, GenealogyEvent, PersonNote } from '../types';

/**
 * Supported file formats for genealogy data
 */
export type FileFormat = 'yaml' | 'json';

/**
 * Detect file format from content or filename
 */
export function detectFileFormat(content: string, filename?: string): FileFormat {
  // Check filename extension first
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'json') return 'json';
    if (ext === 'yaml' || ext === 'yml') return 'yaml';
  }

  // Try to detect from content
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  // Default to YAML
  return 'yaml';
}

/**
 * Check if data is in ancestral-synth format
 */
function isAncestralSynthFormat(parsed: Record<string, unknown>): boolean {
  // Ancestral-synth format has "persons" (not "people"), and metadata with "format" field
  return (
    Array.isArray(parsed.persons) ||
    Boolean(parsed.metadata && (parsed.metadata as Record<string, unknown>).format === 'ancestral-synth-json')
  );
}

/**
 * Parse ancestral-synth JSON format into FamilyData structure
 */
function parseAncestralSynthData(parsed: Record<string, unknown>): FamilyData {
  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const rawPersons = parsed.persons as Record<string, unknown>[];
  const rawEvents = parsed.events as Record<string, unknown>[] | undefined;
  const rawNotes = parsed.notes as Record<string, unknown>[] | undefined;
  const childLinks = parsed.child_links as Array<{ parent_id: string; child_id: string }> | undefined;
  const spouseLinks = parsed.spouse_links as Array<{ person1_id: string; person2_id: string }> | undefined;

  // Build relationship maps from links
  const parentMap = new Map<string, string[]>(); // child_id -> parent_ids
  const childMap = new Map<string, string[]>(); // parent_id -> child_ids
  const spouseMap = new Map<string, string[]>(); // person_id -> spouse_ids

  if (childLinks) {
    for (const link of childLinks) {
      // Add parent to child's parent list
      if (!parentMap.has(link.child_id)) {
        parentMap.set(link.child_id, []);
      }
      const parents = parentMap.get(link.child_id)!;
      if (!parents.includes(link.parent_id)) {
        parents.push(link.parent_id);
      }

      // Add child to parent's child list
      if (!childMap.has(link.parent_id)) {
        childMap.set(link.parent_id, []);
      }
      const children = childMap.get(link.parent_id)!;
      if (!children.includes(link.child_id)) {
        children.push(link.child_id);
      }
    }
  }

  if (spouseLinks) {
    for (const link of spouseLinks) {
      // Add bidirectional spouse relationship
      if (!spouseMap.has(link.person1_id)) {
        spouseMap.set(link.person1_id, []);
      }
      const spouses1 = spouseMap.get(link.person1_id)!;
      if (!spouses1.includes(link.person2_id)) {
        spouses1.push(link.person2_id);
      }

      if (!spouseMap.has(link.person2_id)) {
        spouseMap.set(link.person2_id, []);
      }
      const spouses2 = spouseMap.get(link.person2_id)!;
      if (!spouses2.includes(link.person1_id)) {
        spouses2.push(link.person1_id);
      }
    }
  }

  // Build event map by person
  const eventsByPerson = new Map<string, string[]>();
  const events: GenealogyEvent[] = [];

  if (rawEvents) {
    for (const e of rawEvents) {
      const event: GenealogyEvent = {
        id: String(e.id || ''),
        eventType: String(e.event_type || ''),
        eventDate: e.event_date ? String(e.event_date) : undefined,
        eventYear: typeof e.event_year === 'number' ? e.event_year : undefined,
        location: e.location ? String(e.location) : undefined,
        description: e.description ? String(e.description) : undefined,
        primaryPersonId: String(e.primary_person_id || ''),
      };
      events.push(event);

      // Map event to person
      if (event.primaryPersonId) {
        if (!eventsByPerson.has(event.primaryPersonId)) {
          eventsByPerson.set(event.primaryPersonId, []);
        }
        eventsByPerson.get(event.primaryPersonId)!.push(event.id);
      }
    }
  }

  // Build notes map by person
  const notesByPerson = new Map<string, string[]>();
  const notes: PersonNote[] = [];

  if (rawNotes) {
    for (const n of rawNotes) {
      const note: PersonNote = {
        id: String(n.id || ''),
        personId: String(n.person_id || ''),
        category: n.category ? String(n.category) : undefined,
        content: String(n.content || ''),
        source: n.source ? String(n.source) : undefined,
      };
      notes.push(note);

      // Map note to person
      if (note.personId) {
        if (!notesByPerson.has(note.personId)) {
          notesByPerson.set(note.personId, []);
        }
        notesByPerson.get(note.personId)!.push(note.id);
      }
    }
  }

  // Parse persons
  const people: Person[] = rawPersons.map((p) => {
    const id = String(p.id || '');

    // Build name from given_name and surname
    const givenName = p.given_name ? String(p.given_name) : '';
    const surname = p.surname ? String(p.surname) : '';
    const name = [givenName, surname].filter(Boolean).join(' ') || String(p.name || 'Unknown');

    return {
      id,
      name,
      birthDate: p.birth_date ? String(p.birth_date) : undefined,
      deathDate: p.death_date ? String(p.death_date) : undefined,
      birthPlace: p.birth_place ? String(p.birth_place) : undefined,
      deathPlace: p.death_place ? String(p.death_place) : undefined,
      biography: p.biography ? String(p.biography) : undefined,
      nickname: p.nickname ? String(p.nickname) : undefined,
      maidenName: p.maiden_name ? String(p.maiden_name) : undefined,
      gender: p.gender === 'male' || p.gender === 'female' ? p.gender : undefined,
      status: p.status === 'complete' || p.status === 'pending' || p.status === 'queued'
        ? p.status
        : undefined,
      generation: typeof p.generation === 'number' ? p.generation : undefined,
      parentIds: parentMap.get(id),
      spouseIds: spouseMap.get(id),
      childIds: childMap.get(id),
      eventIds: eventsByPerson.get(id),
      noteIds: notesByPerson.get(id),
    };
  });

  return {
    meta: {
      title: metadata?.title ? String(metadata.title) : 'Genealogy',
      centeredPersonId: undefined, // Will be determined by generation 0
      description: undefined,
      exportedAt: metadata?.exported_at ? String(metadata.exported_at) : undefined,
      version: metadata?.version ? String(metadata.version) : undefined,
      format: metadata?.format ? String(metadata.format) : undefined,
      truncated: typeof metadata?.truncated === 'number' ? metadata.truncated : undefined,
    },
    people,
    events,
    notes,
  };
}

/**
 * Parse raw data object into FamilyData structure (standard format)
 */
function parseRawData(parsed: Record<string, unknown>): FamilyData {
  // Check if this is ancestral-synth format
  if (isAncestralSynthFormat(parsed)) {
    return parseAncestralSynthData(parsed);
  }

  const familyData: FamilyData = {
    meta: parsed.meta as FamilyData['meta'],
    people: [],
  };

  const rawPeople = parsed.people as Record<string, unknown>[];

  if (Array.isArray(rawPeople)) {
    familyData.people = rawPeople.map((p) => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      birthDate: p.birthDate ? String(p.birthDate) : undefined,
      deathDate: p.deathDate ? String(p.deathDate) : undefined,
      birthPlace: p.birthPlace ? String(p.birthPlace) : undefined,
      deathPlace: p.deathPlace ? String(p.deathPlace) : undefined,
      biography: p.biography ? String(p.biography) : undefined,
      nickname: p.nickname ? String(p.nickname) : undefined,
      maidenName: p.maidenName ? String(p.maidenName) : undefined,
      gender: p.gender === 'male' || p.gender === 'female' ? p.gender : undefined,
      status: p.status === 'complete' || p.status === 'pending' || p.status === 'queued'
        ? p.status
        : undefined,
      parentIds: Array.isArray(p.parentIds)
        ? p.parentIds.map(String)
        : undefined,
      spouseIds: Array.isArray(p.spouseIds)
        ? p.spouseIds.map(String)
        : undefined,
      childIds: Array.isArray(p.childIds) ? p.childIds.map(String) : undefined,
      eventIds: Array.isArray(p.eventIds) ? p.eventIds.map(String) : undefined,
      noteIds: Array.isArray(p.noteIds) ? p.noteIds.map(String) : undefined,
    }));
  }

  return familyData;
}

/**
 * Parse YAML string into FamilyData structure
 */
export function parseFamily(yamlString: string): FamilyData {
  const parsed = yaml.load(yamlString) as Record<string, unknown>;
  return parseRawData(parsed);
}

/**
 * Parse JSON string into FamilyData structure
 */
export function parseFamilyJson(jsonString: string): FamilyData {
  const parsed = JSON.parse(jsonString) as Record<string, unknown>;
  return parseRawData(parsed);
}

/**
 * Parse genealogy file content with automatic format detection
 */
export function parseGenealogyFile(content: string, filename?: string): FamilyData {
  const format = detectFileFormat(content, filename);

  if (format === 'json') {
    return parseFamilyJson(content);
  }

  return parseFamily(content);
}

/**
 * Validate FamilyData for consistency
 * Returns array of error messages (empty if valid)
 */
export function validateFamilyData(data: FamilyData): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const duplicates = new Set<string>();

  // Check for duplicate IDs
  for (const person of data.people) {
    if (ids.has(person.id)) {
      duplicates.add(person.id);
    }
    ids.add(person.id);
  }

  if (duplicates.size > 0) {
    errors.push(`Found duplicate IDs: ${Array.from(duplicates).join(', ')}`);
  }

  // Check all referenced IDs exist
  for (const person of data.people) {
    const checkRefs = (refIds: string[] | undefined, refType: string) => {
      if (refIds) {
        for (const refId of refIds) {
          if (!ids.has(refId)) {
            errors.push(
              `Person '${person.id}' references non-existent ${refType}: ${refId}`
            );
          }
        }
      }
    };

    checkRefs(person.parentIds, 'parent');
    checkRefs(person.spouseIds, 'spouse');
    checkRefs(person.childIds, 'child');
  }

  return errors;
}

/**
 * Calculate biography weight (0-1) based on biography length
 * Uses logarithmic scaling for more natural distribution
 */
export function calculateBiographyWeight(biography?: string): number {
  if (!biography) return 0;

  const length = biography.trim().length;
  if (length === 0) return 0;

  // Logarithmic scaling: 0-50 chars = 0-0.3, 50-200 = 0.3-0.6, 200-500 = 0.6-0.85, 500+ = 0.85-1.0
  const maxLength = 1000;
  const normalized = Math.min(length, maxLength) / maxLength;

  // Apply easing for more natural distribution
  return Math.pow(normalized, 0.5);
}
