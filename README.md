# Ancestral Web Engine

A 3D visualization engine for family trees with an ethereal, bioluminescent aesthetic. Built with TypeScript, Three.js, and WebGL.

## Features

- **3D Force-Directed Layout**: Nodes are positioned using a physics-based simulation with generation layering
- **Complex Family Relationships**: Supports parents, children, spouses, siblings, cousins, and all extended relations
- **Bioluminescent Visual Style**: Custom GLSL shaders create an organic, ethereal atmosphere with:
  - Animated node glow based on biography length
  - Floating firefly particles
  - Organic curved connection lines with energy flow
  - Atmospheric fog and vignette
- **Scalable**: Handles family trees from small (25 nodes) to huge (1000+ nodes)
- **Interactive**: Hover to see person details, drag to rotate, scroll to zoom
- **YAML Input**: Load family data from YAML files

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## YAML Family Format

```yaml
meta:
  title: "Family Name"
  centeredPersonId: "person_id"  # The person to center the web around

people:
  - id: grandparent1
    name: "John Smith"
    birthDate: "1920-01-15"
    deathDate: "2005-08-20"
    biography: |
      Longer biographies result in more vibrant nodes
      with increased glow and more floating particles.
    childIds: [parent1]
    spouseIds: [grandparent2]

  - id: grandparent2
    name: "Jane Smith"
    birthDate: "1922-03-10"
    spouseIds: [grandparent1]
    childIds: [parent1]

  - id: parent1
    name: "Robert Smith"
    birthDate: "1950-06-22"
    parentIds: [grandparent1, grandparent2]
    childIds: [child1]

  - id: child1
    name: "Alice Smith"
    birthDate: "1980-12-01"
    parentIds: [parent1]
```

## Architecture

```
src/
├── types/          # TypeScript interfaces and config
├── parser/         # YAML parsing and validation
├── graph/          # Family graph data structure
├── core/           # Layout algorithm
├── renderer/       # Three.js WebGL renderer
├── shaders/        # GLSL shaders for visual effects
├── utils/          # Family generator for testing
└── main.ts         # Application entry point
```

## Visual Parameters

The visual style is parametric based on biography length:

| Biography Length | Effect |
|-----------------|--------|
| None/Short | Base node size, minimal glow |
| Medium | 50% larger, moderate glow, some particles |
| Long | 2.5x size, intense bioluminescence, many particles |

## Controls

- **Drag**: Rotate the view
- **Scroll**: Zoom in/out
- **Hover**: View person details
- **R key**: Reset view to centered person

## Performance

The engine is optimized for large family trees:
- Instanced rendering for nodes
- Adaptive layout iterations
- Efficient particle system
- Frustum culling ready

Tested with 1000+ nodes at 60fps on modern hardware.

## License

MIT
