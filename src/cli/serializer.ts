/**
 * Serializer for exporting FamilyData to YAML format
 */

import * as yaml from 'js-yaml';
import type { FamilyData, Person } from '../types';

/**
 * Clean a person object by removing undefined/empty fields
 * to produce clean YAML output
 */
function cleanPerson(person: Person): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: person.id,
    name: person.name,
  };

  if (person.birthDate) {
    clean.birthDate = person.birthDate;
  }

  if (person.deathDate) {
    clean.deathDate = person.deathDate;
  }

  if (person.biography && person.biography.trim()) {
    clean.biography = person.biography.trim();
  }

  if (person.parentIds && person.parentIds.length > 0) {
    clean.parentIds = person.parentIds;
  }

  if (person.spouseIds && person.spouseIds.length > 0) {
    clean.spouseIds = person.spouseIds;
  }

  if (person.childIds && person.childIds.length > 0) {
    clean.childIds = person.childIds;
  }

  return clean;
}

/**
 * Export FamilyData to YAML string
 */
export function exportToYaml(familyData: FamilyData): string {
  const output: Record<string, unknown> = {};

  // Add meta section if present
  if (familyData.meta) {
    const meta: Record<string, unknown> = {};

    if (familyData.meta.title) {
      meta.title = familyData.meta.title;
    }

    if (familyData.meta.centeredPersonId) {
      meta.centeredPersonId = familyData.meta.centeredPersonId;
    }

    if (familyData.meta.description) {
      meta.description = familyData.meta.description;
    }

    if (Object.keys(meta).length > 0) {
      output.meta = meta;
    }
  }

  // Add people array
  output.people = familyData.people.map(cleanPerson);

  return yaml.dump(output, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Export FamilyData to JSON string
 */
export function exportToJson(familyData: FamilyData, pretty: boolean = true): string {
  const output: Record<string, unknown> = {};

  // Add meta section if present
  if (familyData.meta) {
    const meta: Record<string, unknown> = {};

    if (familyData.meta.title) {
      meta.title = familyData.meta.title;
    }

    if (familyData.meta.centeredPersonId) {
      meta.centeredPersonId = familyData.meta.centeredPersonId;
    }

    if (familyData.meta.description) {
      meta.description = familyData.meta.description;
    }

    if (Object.keys(meta).length > 0) {
      output.meta = meta;
    }
  }

  // Add people array
  output.people = familyData.people.map(cleanPerson);

  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}
