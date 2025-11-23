import * as yaml from 'js-yaml';
import type { FamilyData } from '../types';

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
 * Parse raw data object into FamilyData structure
 */
function parseRawData(parsed: Record<string, unknown>): FamilyData {
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
      biography: p.biography ? String(p.biography) : undefined,
      parentIds: Array.isArray(p.parentIds)
        ? p.parentIds.map(String)
        : undefined,
      spouseIds: Array.isArray(p.spouseIds)
        ? p.spouseIds.map(String)
        : undefined,
      childIds: Array.isArray(p.childIds) ? p.childIds.map(String) : undefined,
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
