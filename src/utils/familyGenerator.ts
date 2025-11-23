/**
 * Procedural family tree generator for testing
 * Creates realistic multi-generational family structures
 */

import type { Person, FamilyData } from '../types';

interface GeneratorConfig {
  generations: number;
  avgChildrenPerCouple: number;
  childrenVariance: number;
  biographyProbability: number;
  centerGeneration: number;
}

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  generations: 4,
  avgChildrenPerCouple: 2.5,
  childrenVariance: 1.5,
  biographyProbability: 0.3,
  centerGeneration: 2,
};

const FIRST_NAMES = [
  'Alexander', 'Sophia', 'Magnus', 'Aurora', 'Felix', 'Luna', 'Victor', 'Stella',
  'Adrian', 'Iris', 'Julius', 'Nova', 'Marcus', 'Celeste', 'Leo', 'Diana',
  'Sebastian', 'Athena', 'Theodore', 'Serena', 'Maximilian', 'Vivian', 'Cornelius', 'Helena',
  'Cassius', 'Cordelia', 'Atticus', 'Ophelia', 'Jasper', 'Evangeline', 'Silas', 'Genevieve',
  'Ezra', 'Arabella', 'Milo', 'Rosalind', 'Oscar', 'Penelope', 'Hugo', 'Adelaide',
];

const LAST_NAMES = [
  'Starling', 'Evergreen', 'Nightingale', 'Silverton', 'Thornwood', 'Ashford', 'Blackwell', 'Sterling',
  'Hawthorne', 'Fairchild', 'Whitmore', 'Goldstein', 'Ravencroft', 'Westbrook', 'Northwind', 'Eastwood',
];

const BIOGRAPHY_TEMPLATES = [
  'A renowned {profession} who made significant contributions to the field of {field}.',
  'Known for their pioneering work in {field}, they established several important {institution}s.',
  'Spent their life dedicated to {pursuit}, leaving behind a legacy of {legacy}.',
  'An adventurous soul who traveled to {place} and discovered {discovery}.',
  'Their groundbreaking research on {topic} changed how we understand {subject}.',
  'A prolific {profession} whose works on {topic} continue to inspire generations.',
  'Led the development of {innovation} and mentored hundreds of young {profession}s.',
  'Founded the {institution} in {year}, which remains influential to this day.',
];

const PROFESSIONS = ['scientist', 'artist', 'writer', 'explorer', 'philosopher', 'inventor', 'musician', 'architect'];
const FIELDS = ['astronomy', 'biology', 'literature', 'physics', 'mathematics', 'chemistry', 'art history', 'archaeology'];
const INSTITUTIONS = ['observatory', 'laboratory', 'academy', 'museum', 'foundation', 'institute'];
const PURSUITS = ['scientific discovery', 'artistic expression', 'humanitarian work', 'education', 'exploration'];
const LEGACIES = ['innovation', 'knowledge', 'inspiration', 'compassion', 'creativity'];
const PLACES = ['remote islands', 'mountain peaks', 'ancient ruins', 'deep forests', 'distant lands'];
const DISCOVERIES = ['rare specimens', 'ancient artifacts', 'new species', 'hidden treasures', 'lost civilizations'];
const TOPICS = ['stellar phenomena', 'quantum mechanics', 'evolutionary biology', 'consciousness', 'dark matter'];
const SUBJECTS = ['the universe', 'life itself', 'human nature', 'time and space', 'existence'];
const INNOVATIONS = ['revolutionary techniques', 'breakthrough technologies', 'novel methodologies', 'advanced systems'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBiography(): string {
  const template = randomElement(BIOGRAPHY_TEMPLATES);
  return template
    .replace('{profession}', randomElement(PROFESSIONS))
    .replace('{field}', randomElement(FIELDS))
    .replace('{institution}', randomElement(INSTITUTIONS))
    .replace('{pursuit}', randomElement(PURSUITS))
    .replace('{legacy}', randomElement(LEGACIES))
    .replace('{place}', randomElement(PLACES))
    .replace('{discovery}', randomElement(DISCOVERIES))
    .replace('{topic}', randomElement(TOPICS))
    .replace('{subject}', randomElement(SUBJECTS))
    .replace('{innovation}', randomElement(INNOVATIONS))
    .replace('{year}', String(randomInt(1850, 2000)));
}

function generatePerson(
  id: string,
  generation: number,
  lastName: string,
  config: GeneratorConfig
): Person {
  const birthYear = 1900 + (generation - config.centerGeneration) * 25;
  const firstName = randomElement(FIRST_NAMES);

  const person: Person = {
    id,
    name: `${firstName} ${lastName}`,
    birthDate: `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
  };

  if (generation < config.centerGeneration - 1) {
    person.deathDate = `${birthYear + randomInt(60, 90)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;
  }

  if (Math.random() < config.biographyProbability) {
    person.biography = generateBiography();
    if (Math.random() < 0.3) {
      person.biography += '\n\n' + generateBiography();
    }
  }

  return person;
}

/**
 * Generate a large family tree for testing
 */
export function generateLargeFamily(config: Partial<GeneratorConfig> = {}): FamilyData {
  const cfg = { ...DEFAULT_GENERATOR_CONFIG, ...config };
  const people: Person[] = [];
  const familyName = randomElement(LAST_NAMES);

  let personCounter = 0;
  const genId = () => `person_${personCounter++}`;

  const generationPeople: Map<number, Person[]> = new Map();

  const oldestGen = -Math.floor(cfg.generations / 2);
  const youngestGen = Math.ceil(cfg.generations / 2);

  // Create founding couples - more couples for more generations
  const foundingCouples = Math.max(2, Math.ceil(cfg.generations / 2));

  for (let c = 0; c < foundingCouples; c++) {
    const person1 = generatePerson(genId(), oldestGen, familyName, cfg);
    const person2 = generatePerson(genId(), oldestGen, randomElement(LAST_NAMES), cfg);

    person1.spouseIds = [person2.id];
    person2.spouseIds = [person1.id];

    if (!generationPeople.has(oldestGen)) {
      generationPeople.set(oldestGen, []);
    }
    generationPeople.get(oldestGen)!.push(person1, person2);
  }

  // Generate subsequent generations
  for (let gen = oldestGen + 1; gen <= youngestGen; gen++) {
    const prevGen = generationPeople.get(gen - 1) || [];
    const currentGen: Person[] = [];

    // Find couples from previous generation
    const couples: [Person, Person][] = [];
    const paired = new Set<string>();

    for (const person of prevGen) {
      if (paired.has(person.id)) continue;

      if (person.spouseIds && person.spouseIds.length > 0) {
        const spouse = prevGen.find(p => p.id === person.spouseIds![0]);
        if (spouse && !paired.has(spouse.id)) {
          couples.push([person, spouse]);
          paired.add(person.id);
          paired.add(spouse.id);
        }
      }
    }

    // If no couples found, create a new founding couple for this generation
    if (couples.length === 0) {
      const person1 = generatePerson(genId(), gen, familyName, cfg);
      const person2 = generatePerson(genId(), gen, randomElement(LAST_NAMES), cfg);
      person1.spouseIds = [person2.id];
      person2.spouseIds = [person1.id];
      currentGen.push(person1, person2);
    }

    // Each couple has children
    for (const [parent1, parent2] of couples) {
      const numChildren = Math.max(1, Math.round(
        cfg.avgChildrenPerCouple + (Math.random() - 0.5) * cfg.childrenVariance * 2
      ));

      const children: Person[] = [];

      for (let i = 0; i < numChildren; i++) {
        const childLastName = Math.random() < 0.7
          ? familyName
          : `${familyName}-${parent2.name.split(' ').pop()}`;

        const child = generatePerson(genId(), gen, childLastName, cfg);
        child.parentIds = [parent1.id, parent2.id];

        children.push(child);
        currentGen.push(child);
      }

      parent1.childIds = children.map(c => c.id);
      parent2.childIds = children.map(c => c.id);
    }

    // Some children in current generation become couples (if not last generation)
    if (gen < youngestGen && currentGen.length > 0) {
      // Ensure at least some people get paired for next generation
      const unpairedInGen = [...currentGen.filter(p => !p.spouseIds)];
      const minPairs = Math.max(1, Math.floor(unpairedInGen.length * 0.5));
      let pairsCreated = 0;

      while (unpairedInGen.length >= 1 && pairsCreated < minPairs) {
        const idx1 = Math.floor(Math.random() * unpairedInGen.length);
        const person1 = unpairedInGen.splice(idx1, 1)[0];

        const spouse = generatePerson(genId(), gen, randomElement(LAST_NAMES), cfg);
        spouse.spouseIds = [person1.id];
        person1.spouseIds = [spouse.id];

        currentGen.push(spouse);
        pairsCreated++;
      }
    }

    generationPeople.set(gen, currentGen);
  }

  // Flatten all people
  for (const genPeople of generationPeople.values()) {
    people.push(...genPeople);
  }

  // Find a person near the center generation
  let centeredPerson: Person | undefined;

  // Try to find someone in generation 0, then nearby generations
  for (const tryGen of [0, 1, -1, 2, -2]) {
    const genPeople = generationPeople.get(tryGen);
    if (genPeople && genPeople.length > 0) {
      centeredPerson = genPeople[Math.floor(genPeople.length / 2)];
      break;
    }
  }

  // Fallback to first person if no generation found
  if (!centeredPerson && people.length > 0) {
    centeredPerson = people[0];
  }

  // Ultimate fallback: create a person
  if (!centeredPerson) {
    centeredPerson = {
      id: 'fallback_person',
      name: `${randomElement(FIRST_NAMES)} ${familyName}`,
      birthDate: '1950-01-01',
    };
    people.push(centeredPerson);
  }

  // Give centered person a detailed biography
  centeredPerson.biography = `${centeredPerson.name} is the central figure of this family web, representing the connecting point between generations past and future. Their life story interweaves the threads of countless ancestors and descendants, each contributing to the rich tapestry of family history.\n\nBorn into a legacy of ${randomElement(PROFESSIONS)}s and ${randomElement(PROFESSIONS)}s, they have carried forward the family tradition while forging their own unique path. Their contributions to ${randomElement(FIELDS)} have been recognized worldwide.`;

  return {
    meta: {
      title: `The ${familyName} Family Web`,
      centeredPersonId: centeredPerson.id,
      description: `A generated family tree spanning ${cfg.generations} generations with ${people.length} members`,
    },
    people,
  };
}

/**
 * Generate family with specific node count target
 */
export function generateFamilyWithNodeCount(targetNodes: number): FamilyData {
  let generations = 4;
  if (targetNodes > 50) generations = 5;
  if (targetNodes > 100) generations = 6;
  if (targetNodes > 200) generations = 7;
  if (targetNodes > 400) generations = 8;
  if (targetNodes > 800) generations = 9;

  const avgChildren = targetNodes > 500 ? 3.5 : targetNodes > 200 ? 3 : 2.5;

  return generateLargeFamily({
    generations,
    avgChildrenPerCouple: avgChildren,
    childrenVariance: 1.0,
    biographyProbability: Math.max(0.1, 0.4 - targetNodes / 2000),
  });
}
