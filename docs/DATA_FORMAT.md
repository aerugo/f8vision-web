# Genealogy Data Format Specification

This document describes the data formats expected for genealogy files that can be imported into f8vision-web. The application accepts **YAML** or **JSON files** containing family data with people and their relationships.

Two formats are supported:
1. **Standard YAML Format** - Simple format with people and inline relationships
2. **Ancestral-Synth JSON Format** - Rich format with events, notes, and separate relationship links

## Table of Contents

- [Overview](#overview)
- [File Format](#file-format)
- [Schema Reference](#schema-reference)
  - [Meta Object](#meta-object)
  - [Person Object](#person-object)
- [Relationships](#relationships)
  - [Parent-Child Relationships](#parent-child-relationships)
  - [Spouse Relationships](#spouse-relationships)
  - [Sibling Relationships](#sibling-relationships)
- [Visual Weight System](#visual-weight-system)
- [Validation Rules](#validation-rules)
- [Examples](#examples)
  - [Minimal Example](#minimal-example)
  - [Complete Example](#complete-example)
- [Ancestral-Synth JSON Format](#ancestral-synth-json-format)
  - [Format Overview](#format-overview)
  - [Persons Array](#persons-array)
  - [Events Array](#events-array)
  - [Notes Array](#notes-array)
  - [Relationship Links](#relationship-links)
  - [Visual Features](#visual-features)
  - [Ancestral-Synth Example](#ancestral-synth-example)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

f8vision-web visualizes genealogical data as an interactive 3D "ancestral web". The visualization:

- Centers on a specified person (the focal point)
- Arranges ancestors above and descendants below
- Connects family members with relationship edges
- Sizes nodes based on biography length (more content = larger node)

## File Format

Genealogy data must be provided as a **YAML file** (`.yaml` or `.yml` extension). The file consists of two main sections:

1. **`meta`** - Metadata about the family tree (optional but recommended)
2. **`people`** - Array of person records (required)

### Basic Structure

```yaml
meta:
  title: "Family Name"
  centeredPersonId: "person_id"
  description: "Optional description"

people:
  - id: person1
    name: "Person One"
    # ... additional fields
  - id: person2
    name: "Person Two"
    # ... additional fields
```

---

## Schema Reference

### Meta Object

The `meta` object contains metadata about the family tree.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Display title for the family tree |
| `centeredPersonId` | string | **Recommended** | ID of the person to center the visualization on. If not specified, defaults to the first person in the list. |
| `description` | string | No | Description of the family tree |

**Example:**

```yaml
meta:
  title: "The Johnson Family"
  centeredPersonId: "john_johnson"
  description: "Four generations of the Johnson family, 1850-present"
```

### Person Object

Each person in the `people` array represents an individual in the family tree.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique identifier for this person. Used to reference this person in relationships. |
| `name` | string | **Yes** | Full display name of the person |
| `birthDate` | string | No | Birth date in ISO 8601 format: `YYYY-MM-DD` |
| `deathDate` | string | No | Death date in ISO 8601 format: `YYYY-MM-DD`. Omit for living persons. |
| `biography` | string | No | Biographical text. Longer biographies result in larger, more prominent nodes. |
| `parentIds` | string[] | No | Array of IDs referencing this person's parents |
| `spouseIds` | string[] | No | Array of IDs referencing this person's spouses |
| `childIds` | string[] | No | Array of IDs referencing this person's children |

**Example:**

```yaml
- id: john_doe
  name: "John Doe"
  birthDate: "1950-03-15"
  deathDate: "2020-11-22"
  biography: |
    John was a carpenter who built homes for over 40 years.
    He was known for his attention to detail and kindness.
  parentIds: [william_doe, mary_doe]
  spouseIds: [jane_smith]
  childIds: [james_doe, jennifer_doe]
```

---

## Relationships

f8vision-web recognizes three types of relationships, each visualized differently in the web.

### Parent-Child Relationships

Parent-child relationships are the primary structural relationships in the family tree. They are **bidirectional** - you should specify both:
- `childIds` on the parent
- `parentIds` on the child

```yaml
# Parent entry
- id: parent1
  name: "Jane Parent"
  childIds: [child1, child2]

# Child entry
- id: child1
  name: "Child One"
  parentIds: [parent1]
```

**Notes:**
- A person can have 0, 1, or 2+ parents (to accommodate adoptive parents, step-parents, etc.)
- A person can have 0 or more children
- Parent-child edges have the **strongest visual weight** (1.0)

### Spouse Relationships

Spouse relationships connect married or partnered individuals. They should be **bidirectional**:

```yaml
- id: spouse1
  name: "Partner One"
  spouseIds: [spouse2]

- id: spouse2
  name: "Partner Two"
  spouseIds: [spouse1]
```

**Notes:**
- A person can have multiple spouses (sequential marriages, etc.)
- Spouse edges have a **strong visual weight** (0.8)
- Spouses are placed in the same generation as their partner

### Sibling Relationships

Sibling relationships are **automatically inferred** - you do NOT need to specify them manually. The system detects siblings by finding people who share at least one parent.

```yaml
# These two will automatically be recognized as siblings
- id: child1
  name: "First Child"
  parentIds: [parent1, parent2]

- id: child2
  name: "Second Child"
  parentIds: [parent1, parent2]  # Shared parents = siblings
```

**Notes:**
- Half-siblings (sharing one parent) are also detected automatically
- Sibling edges have a **moderate visual weight** (0.6)

### Relationship Strength Summary

| Relationship Type | Edge Strength | Specified By |
|-------------------|---------------|--------------|
| Parent-Child | 1.0 (strongest) | `parentIds` / `childIds` |
| Spouse | 0.8 | `spouseIds` |
| Sibling | 0.6 | Automatically inferred |

---

## Visual Weight System

The size and visual prominence of each person's node in the visualization is determined by their **biography weight**, calculated from the length of their `biography` field.

### Biography Length Impact

| Biography Length | Visual Weight | Node Appearance |
|------------------|---------------|-----------------|
| 0 characters | 0.0 | Minimum size |
| 1-50 characters | 0.0-0.22 | Small |
| 50-200 characters | 0.22-0.45 | Medium-small |
| 200-500 characters | 0.45-0.71 | Medium-large |
| 500-1000 characters | 0.71-1.0 | Large |
| 1000+ characters | 1.0 | Maximum size |

The scaling is **logarithmic** (square root function), so adding more text has diminishing returns after ~500 characters.

**Practical guidance:**
- **Minimal entry**: Just `id` and `name` - creates a small node
- **Basic entry**: Add birth/death dates - still small, but informative
- **Standard entry**: 1-2 sentence biography - medium-sized node
- **Featured entry**: Multi-paragraph biography - large, prominent node

---

## Validation Rules

When importing data, the following validation rules are enforced:

### Required Fields
- Every person **must** have an `id`
- Every person **must** have a `name`
- The `people` array **must** exist and contain at least one person

### ID Uniqueness
- All `id` values **must** be unique across the entire file
- IDs are case-sensitive (`john` and `John` are different IDs)

### Reference Integrity
- All IDs referenced in `parentIds`, `spouseIds`, and `childIds` **must** exist in the `people` array
- Referencing a non-existent ID will cause a validation error

### Date Format
- Dates should be in ISO 8601 format: `YYYY-MM-DD`
- Examples: `1985-07-15`, `2000-01-01`

### Performance Limits
- Maximum of **2000 nodes** per family tree (configurable)
- Larger trees may experience performance degradation

---

## Examples

### Minimal Example

The smallest valid genealogy file - two people with a parent-child relationship:

```yaml
meta:
  centeredPersonId: child1

people:
  - id: parent1
    name: "Parent One"
    childIds: [child1]

  - id: child1
    name: "Child One"
    parentIds: [parent1]
```

### Nuclear Family Example

A simple family with two parents and two children:

```yaml
meta:
  title: "Smith Family"
  centeredPersonId: dad

people:
  - id: dad
    name: "John Smith"
    birthDate: "1970-05-20"
    spouseIds: [mom]
    childIds: [daughter, son]
    biography: "John is a software engineer from Seattle."

  - id: mom
    name: "Mary Smith"
    birthDate: "1972-08-15"
    spouseIds: [dad]
    childIds: [daughter, son]
    biography: "Mary is a teacher who loves gardening."

  - id: daughter
    name: "Emma Smith"
    birthDate: "2000-03-10"
    parentIds: [dad, mom]

  - id: son
    name: "Jack Smith"
    birthDate: "2003-11-25"
    parentIds: [dad, mom]
```

### Three-Generation Example

A more complete example spanning grandparents to grandchildren:

```yaml
meta:
  title: "The Anderson Family"
  centeredPersonId: michael
  description: "Three generations of the Anderson family"

people:
  # Grandparents (Generation -2)
  - id: grandpa
    name: "Robert Anderson"
    birthDate: "1935-02-14"
    deathDate: "2015-09-30"
    childIds: [dad, aunt_susan]
    biography: |
      Robert served in the Navy for 20 years before becoming a school principal.
      He was known for his dedication to education and community service.

  - id: grandma
    name: "Eleanor Anderson"
    birthDate: "1938-06-22"
    spouseIds: [grandpa]
    childIds: [dad, aunt_susan]
    biography: "Eleanor was a nurse who volunteered at the local hospital until age 80."

  # Parents (Generation -1)
  - id: dad
    name: "William Anderson"
    birthDate: "1960-04-18"
    parentIds: [grandpa, grandma]
    spouseIds: [mom]
    childIds: [michael, sister]
    biography: "William is an architect who designed several landmark buildings downtown."

  - id: mom
    name: "Patricia Anderson"
    birthDate: "1962-12-03"
    spouseIds: [dad]
    childIds: [michael, sister]

  - id: aunt_susan
    name: "Susan Anderson-Lee"
    birthDate: "1965-08-10"
    parentIds: [grandpa, grandma]
    childIds: [cousin_tom]
    biography: "Susan is a veterinarian who runs her own animal clinic."

  # Self and Siblings (Generation 0)
  - id: michael
    name: "Michael Anderson"
    birthDate: "1990-01-15"
    parentIds: [dad, mom]
    spouseIds: [spouse]
    childIds: [daughter]
    biography: |
      Michael works in data science and enjoys hiking on weekends.
      He created this family tree to preserve his family's history.

  - id: spouse
    name: "Jennifer Anderson"
    birthDate: "1991-07-22"
    spouseIds: [michael]
    childIds: [daughter]

  - id: sister
    name: "Emily Anderson"
    birthDate: "1993-05-08"
    parentIds: [dad, mom]
    biography: "Emily is a marine biologist studying coral reef conservation."

  - id: cousin_tom
    name: "Thomas Lee"
    birthDate: "1992-11-30"
    parentIds: [aunt_susan]

  # Children (Generation +1)
  - id: daughter
    name: "Sophie Anderson"
    birthDate: "2020-03-14"
    parentIds: [michael, spouse]
    biography: "The newest addition to the Anderson family!"
```

### Complete Example

For a comprehensive 4+ generation example with extended family relationships (cousins, aunts/uncles, etc.), see the included sample file:

**[examples/sample-family.yaml](../examples/sample-family.yaml)**

This example includes:
- 19 people across 4 generations
- Great-grandparents to grandchildren
- Multiple branches (cousins, second cousins)
- Various biography lengths
- Both living and deceased individuals

---

## Ancestral-Synth JSON Format

The **ancestral-synth** format is a rich JSON format that supports events, notes, and separate relationship links. This format is automatically detected when the file contains a `persons` array (instead of `people`) or has `metadata.format` set to `"ancestral-synth-json"`.

### Format Overview

```json
{
  "metadata": {
    "format": "ancestral-synth-json",
    "version": "1.0",
    "exported_at": "2024-01-15T10:30:00Z",
    "title": "Family Genealogy",
    "truncated": 100
  },
  "persons": [...],
  "events": [...],
  "notes": [...],
  "child_links": [...],
  "spouse_links": [...]
}
```

### Persons Array

Each person object in the `persons` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique identifier |
| `given_name` | string | No | First/given name |
| `surname` | string | No | Family name |
| `name` | string | No | Full name (fallback if given_name/surname not provided) |
| `nickname` | string | No | Nickname or alias |
| `maiden_name` | string | No | Maiden name (pre-marriage surname) |
| `gender` | string | No | `"male"` or `"female"` |
| `birth_date` | string | No | Birth date (ISO 8601 or flexible format) |
| `birth_place` | string | No | Place of birth |
| `death_date` | string | No | Death date |
| `death_place` | string | No | Place of death |
| `biography` | string | No | Biographical text |
| `status` | string | No | `"complete"`, `"pending"`, or `"queued"` |
| `generation` | number | No | Generation number (0 = center person) |

**Example:**

```json
{
  "id": "p_12345",
  "given_name": "John",
  "surname": "Smith",
  "nickname": "Johnny",
  "maiden_name": null,
  "gender": "male",
  "birth_date": "1950-03-15",
  "birth_place": "New York, NY",
  "death_date": "2020-11-22",
  "death_place": "Los Angeles, CA",
  "biography": "John was a renowned architect...",
  "status": "complete",
  "generation": 0
}
```

### Events Array

Events represent life events associated with people. Events are visualized as **firefly particles** that orbit around each person's node in the 3D visualization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique event identifier |
| `event_type` | string | **Yes** | Type of event (see below) |
| `event_date` | string | No | Full date of event |
| `event_year` | number | No | Year of event (if full date unknown) |
| `location` | string | No | Where the event occurred |
| `description` | string | No | Additional details |
| `primary_person_id` | string | **Yes** | ID of the person this event belongs to |

**Common Event Types:**

| Event Type | Firefly Color | Description |
|------------|---------------|-------------|
| `birth` | Green | Birth event |
| `death` | Purple | Death event |
| `marriage` | Gold | Marriage event |
| `occupation` | Blue | Career/job event |
| `residence` | Cyan | Where person lived |
| `military_service` | Red-orange | Military service |
| `graduation` | Yellow | Educational milestone |
| Other | White | Any other event type |

**Example:**

```json
{
  "id": "evt_001",
  "event_type": "marriage",
  "event_date": "1975-06-15",
  "location": "St. Mary's Church, Boston",
  "description": "Married Jane Doe",
  "primary_person_id": "p_12345"
}
```

### Notes Array

Notes are additional information or research notes about a person.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Unique note identifier |
| `person_id` | string | **Yes** | ID of the person this note belongs to |
| `category` | string | No | Category (e.g., "research", "family_story") |
| `content` | string | **Yes** | The note text |
| `source` | string | No | Source of the information |

**Example:**

```json
{
  "id": "note_001",
  "person_id": "p_12345",
  "category": "family_story",
  "content": "According to Aunt Mary, John once rescued a cat from a tree during a thunderstorm.",
  "source": "Interview with Mary Smith, 2019"
}
```

### Relationship Links

Relationships are defined separately from persons using link arrays. This allows for cleaner data modeling and easier updates.

#### Child Links

```json
{
  "child_links": [
    { "parent_id": "p_001", "child_id": "p_002" },
    { "parent_id": "p_001", "child_id": "p_003" }
  ]
}
```

Each link connects one parent to one child. A child with two parents needs two separate links.

#### Spouse Links

```json
{
  "spouse_links": [
    { "person1_id": "p_001", "person2_id": "p_004" }
  ]
}
```

Spouse links are bidirectional - you only need to specify each relationship once.

### Visual Features

The ancestral-synth format enables special visual features:

#### Event Fireflies

- Each event becomes a **glowing particle** that orbits the person's node
- More events = more fireflies circling the person
- Colors indicate event type (see Event Types table above)
- Fireflies have a flickering, organic animation

#### Shared Event Edges

When two people share the **same event** (matching event_type + date + location + description):
- A **golden curved edge** connects their nodes
- The edge has a flowing energy animation
- In the info panel, shared events show links to the other person(s)

This is useful for visualizing:
- Marriage events (connecting spouses)
- Shared residences
- Family gatherings
- Witnessed events

### Ancestral-Synth Example

```json
{
  "metadata": {
    "format": "ancestral-synth-json",
    "version": "1.0",
    "exported_at": "2024-01-15T10:30:00Z",
    "title": "Smith Family Genealogy"
  },
  "persons": [
    {
      "id": "p_001",
      "given_name": "John",
      "surname": "Smith",
      "gender": "male",
      "birth_date": "1950-03-15",
      "birth_place": "Boston, MA",
      "biography": "John was a software engineer who pioneered early computing.",
      "status": "complete",
      "generation": -1
    },
    {
      "id": "p_002",
      "given_name": "Jane",
      "surname": "Smith",
      "maiden_name": "Doe",
      "gender": "female",
      "birth_date": "1952-07-22",
      "birth_place": "Cambridge, MA",
      "status": "complete",
      "generation": -1
    },
    {
      "id": "p_003",
      "given_name": "Michael",
      "surname": "Smith",
      "nickname": "Mike",
      "gender": "male",
      "birth_date": "1980-01-10",
      "birth_place": "Seattle, WA",
      "biography": "Michael is a data scientist and genealogy enthusiast.",
      "status": "complete",
      "generation": 0
    }
  ],
  "events": [
    {
      "id": "evt_001",
      "event_type": "birth",
      "event_date": "1950-03-15",
      "location": "Boston, MA",
      "primary_person_id": "p_001"
    },
    {
      "id": "evt_002",
      "event_type": "marriage",
      "event_date": "1975-06-15",
      "location": "St. Mary's Church, Boston",
      "description": "Wedding ceremony",
      "primary_person_id": "p_001"
    },
    {
      "id": "evt_003",
      "event_type": "marriage",
      "event_date": "1975-06-15",
      "location": "St. Mary's Church, Boston",
      "description": "Wedding ceremony",
      "primary_person_id": "p_002"
    },
    {
      "id": "evt_004",
      "event_type": "birth",
      "event_date": "1980-01-10",
      "location": "Seattle, WA",
      "primary_person_id": "p_003"
    }
  ],
  "notes": [
    {
      "id": "note_001",
      "person_id": "p_001",
      "category": "career",
      "content": "John worked at IBM from 1972-1995 before starting his own consulting firm.",
      "source": "Family records"
    }
  ],
  "child_links": [
    { "parent_id": "p_001", "child_id": "p_003" },
    { "parent_id": "p_002", "child_id": "p_003" }
  ],
  "spouse_links": [
    { "person1_id": "p_001", "person2_id": "p_002" }
  ]
}
```

In this example:
- John and Jane's marriage events (`evt_002` and `evt_003`) have matching details, so a **golden edge** will connect their nodes
- Michael will have one firefly (his birth event), while John and Jane will each have two fireflies
- The info panel for John will show his career note

---

## Best Practices

### ID Naming Conventions

Use clear, consistent ID naming:

```yaml
# Good - descriptive and consistent
- id: john_smith_sr
- id: john_smith_jr
- id: mary_smith_jones

# Avoid - hard to remember and maintain
- id: p1
- id: person_47
- id: x
```

### Bidirectional Relationships

Always specify relationships from both directions for consistency:

```yaml
# Good - bidirectional
- id: parent
  childIds: [child]
- id: child
  parentIds: [parent]

# Works but less clear - only one direction
- id: parent
  childIds: [child]
- id: child
  name: "Child"  # No parentIds specified
```

### Biography Guidelines

Write meaningful biographies to make the visualization more engaging:

```yaml
# Good - informative and personal
biography: |
  Maria emigrated from Italy in 1920 and opened a bakery that became
  a neighborhood institution for over 50 years. She was known for
  her cannoli and her warm hospitality.

# Less engaging - just facts
biography: "Born in Italy. Moved to USA. Had a bakery."

# Best for prominent figures - detailed
biography: |
  Dr. James Wilson was a pioneering surgeon who developed new techniques
  for cardiac surgery in the 1960s. His innovations saved thousands of
  lives and he trained the next generation of heart surgeons.

  Beyond medicine, James was an accomplished pianist who performed
  charity concerts to raise money for medical research. He received
  the Presidential Medal of Freedom in 1985.
```

### Organizing Large Files

For large family trees, organize by generation:

```yaml
people:
  # === Generation -3: Great-Grandparents ===
  - id: ggp1
    # ...

  # === Generation -2: Grandparents ===
  - id: gp1
    # ...

  # === Generation -1: Parents ===
  - id: parent1
    # ...

  # === Generation 0: Self & Siblings ===
  - id: self
    # ...

  # === Generation +1: Children ===
  - id: child1
    # ...
```

---

## Troubleshooting

### Common Errors

**"Found duplicate IDs: xxx"**
- Two or more people have the same `id`
- Solution: Ensure each person has a unique ID

**"Person 'xxx' references non-existent parent: yyy"**
- A person's `parentIds` contains an ID that doesn't exist
- Solution: Check for typos in the ID, or add the missing person

**"Person 'xxx' references non-existent spouse: yyy"**
- A person's `spouseIds` contains an ID that doesn't exist
- Solution: Check for typos in the ID, or add the missing person

**"Person 'xxx' references non-existent child: yyy"**
- A person's `childIds` contains an ID that doesn't exist
- Solution: Check for typos in the ID, or add the missing person

### Validation Checklist

Before importing, verify:

- [ ] Every person has a unique `id`
- [ ] Every person has a `name`
- [ ] All IDs in `parentIds`, `spouseIds`, and `childIds` exist in the `people` array
- [ ] Dates are in `YYYY-MM-DD` format
- [ ] The `centeredPersonId` (if specified) exists in the `people` array
- [ ] The YAML syntax is valid (proper indentation, quotes where needed)

### YAML Syntax Tips

```yaml
# Multi-line biography using |
biography: |
  This is line one.
  This is line two.

  This is after a blank line.

# Single-line biography
biography: "This is a short biography."

# Arrays can be written two ways:
# Inline format
parentIds: [parent1, parent2]

# Block format
parentIds:
  - parent1
  - parent2

# Special characters in names require quotes
name: "O'Brien, Mary-Jane"

# Dates should not have quotes (YAML interprets them correctly)
birthDate: 1985-07-15
```

---

## TypeScript Types Reference

For developers integrating with f8vision-web, here are the core TypeScript interfaces:

```typescript
interface Person {
  id: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  biography?: string;
  nickname?: string;
  maidenName?: string;
  gender?: 'male' | 'female' | 'other';
  status?: 'complete' | 'pending' | 'queued';
  parentIds?: string[];
  spouseIds?: string[];
  childIds?: string[];
  eventIds?: string[];
  noteIds?: string[];
  generation?: number;  // Computed at runtime
}

interface GenealogyEvent {
  id: string;
  eventType: string;
  eventDate?: string;
  eventYear?: number;
  location?: string;
  description?: string;
  primaryPersonId: string;
  sharedWithPersonIds?: string[];  // Computed: people who share this event
}

interface PersonNote {
  id: string;
  personId: string;
  category?: string;
  content: string;
  source?: string;
}

interface FamilyData {
  meta?: {
    title?: string;
    centeredPersonId?: string;
    description?: string;
    exportedAt?: string;
    version?: string;
    format?: string;
    truncated?: number;
  };
  people: Person[];
  events?: GenealogyEvent[];
  notes?: PersonNote[];
}
```

These types are defined in `src/types/index.ts`.
