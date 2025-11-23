#!/usr/bin/env node
/**
 * CLI tool for exporting genealogy data to f8vision-web format
 *
 * Usage:
 *   npx ts-node src/cli/export.ts --help
 *   npm run cli:export -- --help
 *
 * Examples:
 *   # Export sample family to YAML
 *   npm run cli:export -- --output family.yaml
 *
 *   # Generate a family with 50 people and export
 *   npm run cli:export -- --generate 50 --output family.yaml
 *
 *   # Export to JSON format
 *   npm run cli:export -- --format json --output family.json
 *
 *   # Read from input file and re-export (useful for validation/normalization)
 *   npm run cli:export -- --input my-family.yaml --output normalized.yaml
 */

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseFamily, validateFamilyData } from '../parser';
import { generateFamilyWithNodeCount, generateLargeFamily } from '../utils';
import { exportToYaml, exportToJson } from './serializer';
import type { FamilyData } from '../types';

// Sample family data (matches what's in main.ts)
const sampleFamilyYaml = `
meta:
  title: "The Stellar Family Tree"
  centeredPersonId: "alex"

people:
  - id: ggp1
    name: "Wilhelm Stellar"
    birthDate: "1880-03-12"
    deathDate: "1965-08-20"
    biography: |
      Wilhelm was a pioneering astronomer who made significant contributions to stellar evolution.
      His work on variable stars laid the foundation for modern astrophysics.
    childIds: [gp1, gp_aunt1]

  - id: ggp2
    name: "Helena Stellar"
    birthDate: "1885-07-04"
    deathDate: "1970-12-15"
    spouseIds: [ggp1]
    childIds: [gp1, gp_aunt1]
    biography: "Helena was a mathematician."

  - id: gp1
    name: "Edmund Stellar"
    birthDate: "1910-05-22"
    deathDate: "1995-03-10"
    parentIds: [ggp1, ggp2]
    childIds: [parent1, uncle1]
    biography: |
      Edmund continued his father's legacy as director of the family observatory.
      He specialized in solar physics and predicted solar flare activity.

  - id: gp2
    name: "Margaret Lunar"
    birthDate: "1915-09-14"
    deathDate: "2000-06-28"
    spouseIds: [gp1]
    childIds: [parent1, uncle1]

  - id: gp_aunt1
    name: "Celeste Stellar"
    birthDate: "1912-11-03"
    deathDate: "1998-04-17"
    parentIds: [ggp1, ggp2]
    childIds: [cousin_parent1]
    biography: "Celeste was the family artist, known for astronomical illustrations."

  - id: gp3
    name: "Robert Nova"
    birthDate: "1908-02-28"
    deathDate: "1990-10-05"
    childIds: [parent2]

  - id: gp4
    name: "Elizabeth Nova"
    birthDate: "1912-08-19"
    spouseIds: [gp3]
    childIds: [parent2]

  - id: parent1
    name: "James Stellar"
    birthDate: "1945-04-15"
    parentIds: [gp1, gp2]
    spouseIds: [parent2]
    childIds: [alex, sibling1, sibling2]
    biography: |
      James is a renowned physicist specializing in quantum mechanics.
      His groundbreaking work on quantum entanglement earned him the Nobel Prize in 2010.

  - id: parent2
    name: "Sarah Nova-Stellar"
    birthDate: "1948-07-22"
    parentIds: [gp3, gp4]
    spouseIds: [parent1]
    childIds: [alex, sibling1, sibling2]

  - id: uncle1
    name: "Thomas Stellar"
    birthDate: "1942-12-01"
    parentIds: [gp1, gp2]
    childIds: [cousin1, cousin2]

  - id: cousin_parent1
    name: "Diana Stellar-Moon"
    birthDate: "1940-06-30"
    parentIds: [gp_aunt1]
    childIds: [second_cousin1]
    biography: "Diana became a science fiction author inspired by her astronomical heritage."

  - id: alex
    name: "Alex Stellar"
    birthDate: "1980-01-15"
    parentIds: [parent1, parent2]
    spouseIds: [alex_spouse]
    childIds: [child1, child2]
    biography: |
      Alex is the central figure of this family web, a software engineer and data artist
      who combines the family's scientific legacy with modern technology. They created
      this ancestral web visualization as a tribute to their rich heritage.

      Growing up surrounded by scientists and artists, Alex developed a unique perspective
      bridging technical and creative worlds. Their work has been featured at Transmediale
      and Ars Electronica.

  - id: alex_spouse
    name: "Jordan Rivers"
    birthDate: "1982-03-20"
    spouseIds: [alex]
    childIds: [child1, child2]
    biography: "Jordan is a marine biologist studying bioluminescent organisms."

  - id: sibling1
    name: "Maya Stellar"
    birthDate: "1978-08-10"
    parentIds: [parent1, parent2]
    childIds: [niece1]
    biography: "Maya is an architect specializing in sustainable observatory design."

  - id: sibling2
    name: "Leo Stellar"
    birthDate: "1985-11-25"
    parentIds: [parent1, parent2]

  - id: cousin1
    name: "Nova Stellar"
    birthDate: "1975-04-12"
    parentIds: [uncle1]
    childIds: [cousin_child1]
    biography: |
      Nova became an expert on supernova events. Her research has identified
      several potential supernova candidates in our galaxy.

  - id: cousin2
    name: "Orion Stellar"
    birthDate: "1979-09-08"
    parentIds: [uncle1]

  - id: second_cousin1
    name: "Luna Moon"
    birthDate: "1970-02-14"
    parentIds: [cousin_parent1]
    childIds: [second_cousin_child1]
    biography: "Luna became a planetarium director, bringing astronomy to the public."

  - id: child1
    name: "Stella Stellar"
    birthDate: "2010-07-04"
    parentIds: [alex, alex_spouse]
    biography: "Stella shows early aptitude for both coding and marine biology."

  - id: child2
    name: "Cosmo Stellar"
    birthDate: "2015-12-21"
    parentIds: [alex, alex_spouse]

  - id: niece1
    name: "Aurora Stellar"
    birthDate: "2008-03-17"
    parentIds: [sibling1]
    biography: "Aurora dreams of becoming the first person to walk on Mars."

  - id: cousin_child1
    name: "Vega Stellar"
    birthDate: "2005-06-15"
    parentIds: [cousin1]

  - id: second_cousin_child1
    name: "Eclipse Moon"
    birthDate: "2000-08-11"
    parentIds: [second_cousin1]
    biography: |
      Born during a total solar eclipse, Eclipse has embraced their celestial name
      by becoming an eclipse chaser and astrophotographer. They have witnessed
      15 total solar eclipses across 6 continents.
`;

program
  .name('f8vision-export')
  .description('Export genealogy data to f8vision-web YAML/JSON format')
  .version('1.0.0');

program
  .option('-i, --input <file>', 'Input YAML file to read from')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('-f, --format <format>', 'Output format: yaml or json (default: yaml)', 'yaml')
  .option('-g, --generate <count>', 'Generate a random family with N people')
  .option('--generations <count>', 'Number of generations for generated family (default: 4)', '4')
  .option('--sample', 'Use the built-in sample family (The Stellar Family)')
  .option('--validate', 'Validate the data and report any errors')
  .option('--stats', 'Show statistics about the family data')
  .option('--quiet', 'Suppress informational output');

program.parse();

const options = program.opts();

function log(message: string): void {
  if (!options.quiet) {
    console.error(message);
  }
}

function getFamilyData(): FamilyData {
  // Priority: input file > generate > sample
  if (options.input) {
    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    log(`Reading from: ${inputPath}`);
    const content = fs.readFileSync(inputPath, 'utf-8');
    return parseFamily(content);
  }

  if (options.generate) {
    const count = parseInt(options.generate, 10);
    if (isNaN(count) || count < 1) {
      console.error('Error: --generate requires a positive number');
      process.exit(1);
    }

    log(`Generating family with ${count} people...`);
    return generateFamilyWithNodeCount(count);
  }

  // Default to sample family
  log('Using built-in sample family (The Stellar Family)');
  return parseFamily(sampleFamilyYaml);
}

function showStats(familyData: FamilyData): void {
  const people = familyData.people;
  const withBio = people.filter(p => p.biography && p.biography.trim()).length;
  const withBirthDate = people.filter(p => p.birthDate).length;
  const withDeathDate = people.filter(p => p.deathDate).length;
  const withParents = people.filter(p => p.parentIds && p.parentIds.length > 0).length;
  const withChildren = people.filter(p => p.childIds && p.childIds.length > 0).length;
  const withSpouse = people.filter(p => p.spouseIds && p.spouseIds.length > 0).length;

  console.error('\n--- Family Statistics ---');
  console.error(`Title: ${familyData.meta?.title || '(untitled)'}`);
  console.error(`Centered on: ${familyData.meta?.centeredPersonId || '(first person)'}`);
  console.error(`Total people: ${people.length}`);
  console.error(`With biography: ${withBio} (${Math.round(withBio / people.length * 100)}%)`);
  console.error(`With birth date: ${withBirthDate} (${Math.round(withBirthDate / people.length * 100)}%)`);
  console.error(`With death date: ${withDeathDate} (${Math.round(withDeathDate / people.length * 100)}%)`);
  console.error(`With parents: ${withParents} (${Math.round(withParents / people.length * 100)}%)`);
  console.error(`With children: ${withChildren} (${Math.round(withChildren / people.length * 100)}%)`);
  console.error(`With spouse: ${withSpouse} (${Math.round(withSpouse / people.length * 100)}%)`);
  console.error('-------------------------\n');
}

async function main(): Promise<void> {
  try {
    // Get family data from appropriate source
    const familyData = getFamilyData();

    // Validate if requested
    if (options.validate) {
      const errors = validateFamilyData(familyData);
      if (errors.length > 0) {
        console.error('Validation errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
      }
      log('Validation passed!');
    }

    // Show stats if requested
    if (options.stats) {
      showStats(familyData);
    }

    // Export to requested format
    const format = options.format.toLowerCase();
    let output: string;

    if (format === 'json') {
      output = exportToJson(familyData);
    } else if (format === 'yaml' || format === 'yml') {
      output = exportToYaml(familyData);
    } else {
      console.error(`Error: Unknown format '${format}'. Use 'yaml' or 'json'.`);
      process.exit(1);
    }

    // Write output
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output, 'utf-8');
      log(`Exported ${familyData.people.length} people to: ${outputPath}`);
    } else {
      // Output to stdout
      console.log(output);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
