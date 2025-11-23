import { describe, it, expect } from 'vitest';
import { parseFamily, validateFamilyData } from './parser';
import type { FamilyData } from '../types';

describe('Family YAML Parser', () => {
  describe('parseFamily', () => {
    it('should parse a simple family with one person', () => {
      const yaml = `
meta:
  title: Simple Family
  centeredPersonId: person1
people:
  - id: person1
    name: John Doe
    birthDate: "1950-01-15"
`;
      const result = parseFamily(yaml);
      expect(result.meta?.title).toBe('Simple Family');
      expect(result.people).toHaveLength(1);
      expect(result.people[0].name).toBe('John Doe');
    });

    it('should parse parent-child relationships', () => {
      const yaml = `
meta:
  centeredPersonId: child1
people:
  - id: parent1
    name: Parent One
    childIds:
      - child1
  - id: child1
    name: Child One
    parentIds:
      - parent1
`;
      const result = parseFamily(yaml);
      expect(result.people).toHaveLength(2);
      const child = result.people.find(p => p.id === 'child1');
      expect(child?.parentIds).toContain('parent1');
    });

    it('should parse complex multi-generational families', () => {
      const yaml = `
meta:
  title: Three Generations
  centeredPersonId: gen2_1
people:
  - id: gen1_1
    name: Grandparent One
    childIds: [gen2_1, gen2_2]
  - id: gen1_2
    name: Grandparent Two
    spouseIds: [gen1_1]
    childIds: [gen2_1, gen2_2]
  - id: gen2_1
    name: Parent One
    parentIds: [gen1_1, gen1_2]
    childIds: [gen3_1]
  - id: gen2_2
    name: Uncle One
    parentIds: [gen1_1, gen1_2]
    childIds: [gen3_2]
  - id: gen3_1
    name: Child One
    parentIds: [gen2_1]
  - id: gen3_2
    name: Cousin One
    parentIds: [gen2_2]
`;
      const result = parseFamily(yaml);
      expect(result.people).toHaveLength(6);

      // Verify cousin relationship exists through shared grandparents
      const cousin = result.people.find(p => p.id === 'gen3_2');
      expect(cousin?.parentIds).toContain('gen2_2');
    });

    it('should handle biography fields of varying lengths', () => {
      const yaml = `
people:
  - id: short_bio
    name: Short Bio Person
    biography: "Brief note."
  - id: long_bio
    name: Long Bio Person
    biography: |
      This is a much longer biography that spans multiple lines.
      It contains detailed information about the person's life,
      achievements, and historical significance. The length of
      this biography should result in a higher visual weight
      when rendered in the ancestral web visualization.
`;
      const result = parseFamily(yaml);
      const shortBio = result.people.find(p => p.id === 'short_bio');
      const longBio = result.people.find(p => p.id === 'long_bio');

      expect(shortBio?.biography?.length).toBeLessThan(20);
      expect(longBio?.biography?.length).toBeGreaterThan(200);
    });
  });

  describe('validateFamilyData', () => {
    it('should validate that all referenced IDs exist', () => {
      const invalidData: FamilyData = {
        people: [
          {
            id: 'person1',
            name: 'Person One',
            parentIds: ['nonexistent_parent'],
          },
        ],
      };

      const errors = validateFamilyData(invalidData);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('nonexistent_parent');
    });

    it('should pass validation for valid data', () => {
      const validData: FamilyData = {
        people: [
          {
            id: 'parent1',
            name: 'Parent',
            childIds: ['child1'],
          },
          {
            id: 'child1',
            name: 'Child',
            parentIds: ['parent1'],
          },
        ],
      };

      const errors = validateFamilyData(validData);
      expect(errors).toHaveLength(0);
    });

    it('should detect duplicate IDs', () => {
      const invalidData: FamilyData = {
        people: [
          { id: 'same_id', name: 'Person One' },
          { id: 'same_id', name: 'Person Two' },
        ],
      };

      const errors = validateFamilyData(invalidData);
      expect(errors.some(e => e.includes('duplicate'))).toBe(true);
    });
  });
});
