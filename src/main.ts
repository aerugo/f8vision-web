/**
 * Ancestral Web Engine - Main Entry Point
 * A 3D visualization of family trees with bioluminescent ethereal aesthetics
 */

import { parseFamily, parseGenealogyFile, validateFamilyData } from './parser';
import { FamilyGraph } from './graph';
import { ForceDirectedLayout } from './core';
import { AncestralWebRenderer } from './renderer';
import { DEFAULT_CONFIG } from './types';
import { generateFamilyWithNodeCount, generateLargeFamily } from './utils';
import type { Person, FamilyData } from './types';

/**
 * Toast notification types
 */
type ToastType = 'success' | 'error' | 'info';

// Extend window for global access
declare global {
  interface Window {
    ancestralWeb: AncestralWebApp | null;
  }
}

// Sample family data embedded for initial demo
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

/**
 * Main application class
 */
class AncestralWebApp {
  private renderer: AncestralWebRenderer | null = null;
  private graph: FamilyGraph | null = null;
  private container: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private searchResults: HTMLElement | null = null;
  private searchClear: HTMLElement | null = null;
  private peoplePanel: HTMLElement | null = null;
  private peopleList: HTMLElement | null = null;
  private selectedSearchIndex: number = -1;
  // Focused person state: the person whose info is "locked" in place
  private focusedPerson: Person | null = null;
  private toastContainer: HTMLElement | null = null;

  constructor() {
    this.init();
    this.setupKeyboardControls();
    this.setupSearch();
    this.setupPeoplePanel();
    this.setupToastContainer();
    this.setupDragAndDrop();
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        // Don't reset if typing in search
        if (document.activeElement === this.searchInput) return;
        this.resetView();
      }
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput?.focus();
      }
    });
  }

  private setupSearch(): void {
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.searchResults = document.getElementById('search-results');
    this.searchClear = document.getElementById('search-clear');

    if (!this.searchInput || !this.searchResults || !this.searchClear) return;

    // Debounced search
    let debounceTimeout: ReturnType<typeof setTimeout>;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        this.performSearch();
      }, 150);
    });

    // Clear button
    this.searchClear.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
        this.searchInput.focus();
      }
      this.clearSearchResults();
    });

    // Keyboard navigation in search results
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateSearchResults(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateSearchResults(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectCurrentSearchResult();
      } else if (e.key === 'Escape') {
        this.searchInput?.blur();
        this.clearSearchResults();
      }
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput?.contains(e.target as Node) &&
          !this.searchResults?.contains(e.target as Node)) {
        this.hideSearchResults();
      }
    });

    // Show results on focus if there's input
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput?.value.trim()) {
        this.performSearch();
      }
    });
  }

  private performSearch(): void {
    if (!this.searchInput || !this.searchResults || !this.renderer) return;

    const query = this.searchInput.value.trim();

    // Update clear button visibility
    if (this.searchClear) {
      this.searchClear.classList.toggle('visible', query.length > 0);
    }

    if (!query) {
      this.clearSearchResults();
      return;
    }

    const results = this.renderer.searchNodes(query);
    this.selectedSearchIndex = -1;
    this.renderSearchResults(results, query);
  }

  private renderSearchResults(results: import('./types').GraphNode[], query: string): void {
    if (!this.searchResults) return;

    if (results.length === 0) {
      this.searchResults.innerHTML = `<div id="no-results">No matches found</div>`;
      this.searchResults.classList.add('visible');
      return;
    }

    const highlightMatch = (text: string, query: string): string => {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="search-result-highlight">$1</span>');
    };

    let html = `<div id="search-count">${results.length} ${results.length === 1 ? 'person' : 'people'} found</div>`;

    results.slice(0, 20).forEach((node, index) => {
      const person = node.person;
      const dates = person.birthDate
        ? `${person.birthDate}${person.deathDate ? ' — ' + person.deathDate : ' — present'}`
        : '';

      html += `
        <div class="search-result-item" data-person-id="${person.id}" data-index="${index}">
          <div class="search-result-name">${highlightMatch(person.name, query)}</div>
          ${dates ? `<div class="search-result-dates">${dates}</div>` : ''}
        </div>
      `;
    });

    if (results.length > 20) {
      html += `<div id="search-count" style="border-top: 1px solid rgba(100, 180, 255, 0.15); border-bottom: none;">
        +${results.length - 20} more results
      </div>`;
    }

    this.searchResults.innerHTML = html;
    this.searchResults.classList.add('visible');

    // Add click handlers to results
    this.searchResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const personId = item.getAttribute('data-person-id');
        if (personId) {
          this.flyToPerson(personId);
          this.hideSearchResults();
        }
      });
    });
  }

  private navigateSearchResults(direction: number): void {
    if (!this.searchResults) return;

    const items = this.searchResults.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    // Remove previous selection
    items.forEach(item => item.classList.remove('selected'));

    // Update index
    this.selectedSearchIndex += direction;
    if (this.selectedSearchIndex < 0) this.selectedSearchIndex = items.length - 1;
    if (this.selectedSearchIndex >= items.length) this.selectedSearchIndex = 0;

    // Apply new selection
    const selected = items[this.selectedSearchIndex];
    selected.classList.add('selected');
    selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  private selectCurrentSearchResult(): void {
    if (!this.searchResults || this.selectedSearchIndex < 0) return;

    const items = this.searchResults.querySelectorAll('.search-result-item');
    if (this.selectedSearchIndex >= items.length) return;

    const personId = items[this.selectedSearchIndex].getAttribute('data-person-id');
    if (personId) {
      this.flyToPerson(personId);
      this.hideSearchResults();
    }
  }

  private clearSearchResults(): void {
    if (this.searchResults) {
      this.searchResults.innerHTML = '';
      this.searchResults.classList.remove('visible');
    }
    if (this.searchClear) {
      this.searchClear.classList.remove('visible');
    }
    this.selectedSearchIndex = -1;
  }

  private hideSearchResults(): void {
    if (this.searchResults) {
      this.searchResults.classList.remove('visible');
    }
    this.selectedSearchIndex = -1;
  }

  private setupPeoplePanel(): void {
    const toggle = document.getElementById('people-toggle');
    this.peoplePanel = document.getElementById('people-panel');
    this.peopleList = document.getElementById('people-list');
    const closeBtn = document.getElementById('people-panel-close');

    if (toggle && this.peoplePanel) {
      toggle.addEventListener('click', () => {
        this.peoplePanel?.classList.toggle('visible');
        if (this.peoplePanel?.classList.contains('visible')) {
          this.populatePeopleList();
        }
      });
    }

    if (closeBtn && this.peoplePanel) {
      closeBtn.addEventListener('click', () => {
        this.peoplePanel?.classList.remove('visible');
      });
    }
  }

  private populatePeopleList(): void {
    if (!this.peopleList || !this.graph) return;

    const nodes = this.graph.getNodesArray();

    // Group by generation
    const byGeneration = new Map<number, typeof nodes>();
    nodes.forEach(node => {
      const gen = node.generation;
      if (!byGeneration.has(gen)) {
        byGeneration.set(gen, []);
      }
      byGeneration.get(gen)!.push(node);
    });

    // Sort generations
    const sortedGens = Array.from(byGeneration.keys()).sort((a, b) => a - b);

    let html = '';
    sortedGens.forEach(gen => {
      const genNodes = byGeneration.get(gen)!;
      // Sort by name within generation
      genNodes.sort((a, b) => a.person.name.localeCompare(b.person.name));

      const genLabel = gen === 0 ? 'Center' :
                       gen > 0 ? `Generation +${gen}` :
                       `Generation ${gen}`;

      html += `<div class="people-list-item generation-header">${genLabel} (${genNodes.length})</div>`;

      genNodes.forEach(node => {
        const person = node.person;
        const dates = person.birthDate
          ? `${person.birthDate}${person.deathDate ? ' — ' + person.deathDate : ''}`
          : '';

        html += `
          <div class="people-list-item" data-person-id="${person.id}">
            <div class="name">${person.name}</div>
            ${dates ? `<div class="dates">${dates}</div>` : ''}
          </div>
        `;
      });
    });

    this.peopleList.innerHTML = html;

    // Add click handlers
    this.peopleList.querySelectorAll('.people-list-item:not(.generation-header)').forEach((item) => {
      item.addEventListener('click', () => {
        const personId = item.getAttribute('data-person-id');
        if (personId) {
          this.flyToPerson(personId);
        }
      });
    });
  }

  private setupToastContainer(): void {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    this.toastContainer = container;
  }

  private showToast(message: string, type: ToastType = 'info', duration: number = 5000): void {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

    // Add close handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    });

    this.toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.add('toast-hiding');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }

  private setupDragAndDrop(): void {
    const dropZone = document.getElementById('drop-zone');
    const app = document.getElementById('app');

    if (!app) return;

    // Prevent default drag behaviors on the whole document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Show drop zone when dragging over the app
    let dragCounter = 0;

    app.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dropZone) {
        dropZone.classList.add('visible');
      }
    });

    app.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0 && dropZone) {
        dropZone.classList.remove('visible');
      }
    });

    app.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    app.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (dropZone) {
        dropZone.classList.remove('visible');
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await this.loadFile(files[0]);
      }
    });
  }

  /**
   * Load a genealogy file (YAML or JSON) with validation and error handling
   */
  async loadFile(file: File): Promise<void> {
    const validExtensions = ['.yaml', '.yml', '.json'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      this.showToast(
        `Invalid file type. Please use ${validExtensions.join(', ')} files.`,
        'error'
      );
      return;
    }

    try {
      this.showLoading();
      const text = await file.text();

      // Parse the file with automatic format detection
      const familyData = parseGenealogyFile(text, file.name);

      // Validate the data
      const errors = validateFamilyData(familyData);
      if (errors.length > 0) {
        this.hideLoading();
        const errorList = errors.slice(0, 5).join('\n• ');
        const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '';
        this.showToast(
          `Validation errors:\n• ${errorList}${moreErrors}`,
          'error',
          10000
        );
        return;
      }

      // Check if there are any people
      if (!familyData.people || familyData.people.length === 0) {
        this.hideLoading();
        this.showToast('The file contains no people data.', 'error');
        return;
      }

      await this.loadFamily(familyData);
      this.showToast(
        `Loaded "${familyData.meta?.title || file.name}" with ${familyData.people.length} people.`,
        'success'
      );
    } catch (error) {
      this.hideLoading();
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to load file: ${message}`, 'error');
      console.error('Failed to load file:', error);
    }
  }

  flyToPerson(personId: string): void {
    if (!this.renderer || !this.graph) return;

    // Fly to the node
    this.renderer.flyToNode(personId);

    // Set focused person and update info panel
    const node = this.graph.nodes.get(personId);
    if (node) {
      this.focusedPerson = node.person;
      this.updateInfoPanel(node.person);
    }
  }

  private async init(): Promise<void> {
    this.container = document.getElementById('canvas-container');
    if (!this.container) {
      console.error('Canvas container not found');
      return;
    }

    // Load default family
    const familyData = parseFamily(sampleFamilyYaml);
    await this.loadFamily(familyData);
  }

  private showLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  private updateStats(nodeCount: number, edgeCount: number, title: string): void {
    const titleEl = document.getElementById('family-title');
    const statsEl = document.getElementById('stats');

    if (titleEl) titleEl.textContent = title;
    if (statsEl) statsEl.textContent = `${nodeCount} members • ${edgeCount} connections`;
  }

  async loadFamily(familyData: FamilyData): Promise<void> {
    if (!this.container) return;

    this.showLoading();

    // Small delay to let loading UI show
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Validate
      const errors = validateFamilyData(familyData);
      if (errors.length > 0) {
        console.error('Family data validation errors:', errors);
        return;
      }

      // Dispose previous renderer
      if (this.renderer) {
        this.renderer.dispose();
      }

      // Build graph
      this.graph = new FamilyGraph(familyData);

      // Calculate layout
      const layout = new ForceDirectedLayout(DEFAULT_CONFIG.layout);
      const nodes = this.graph.getNodesArray();

      // Calculate layout
      layout.calculate(nodes, this.graph.edges, this.graph.centeredId);

      // Create renderer
      this.renderer = new AncestralWebRenderer(this.container, DEFAULT_CONFIG);

      // Setup hover callback - show temporary info while hovering, return to focused person when done
      this.renderer.onHover((person, _screenPos) => {
        if (person) {
          // Hovering over someone - show their info temporarily
          this.updateInfoPanel(person);
        } else {
          // Hover ended - return to focused person (or hide if none focused)
          this.updateInfoPanel(this.focusedPerson);
        }
      });

      // Setup click callback - lock the person info in place
      this.renderer.onClick((person) => {
        this.focusedPerson = person;
        this.updateInfoPanel(person);
      });

      // Render the graph
      this.renderer.renderGraph(nodes, this.graph.edges);

      // Start animation
      this.renderer.start();

      // Focus on centered person
      this.renderer.focusOnNode(this.graph.centeredId);

      // Update UI
      this.updateStats(
        nodes.length,
        this.graph.edges.length,
        familyData.meta?.title || 'Ancestral Web'
      );

      console.log(`Ancestral Web loaded: ${nodes.length} nodes, ${this.graph.edges.length} edges`);
    } catch (error) {
      console.error('Failed to load family:', error);
    } finally {
      this.hideLoading();
    }
  }

  // Public methods for UI buttons
  async loadSmallFamily(): Promise<void> {
    const familyData = generateLargeFamily({
      generations: 3,
      avgChildrenPerCouple: 2,
      biographyProbability: 0.4,
    });
    await this.loadFamily(familyData);
  }

  async loadMediumFamily(): Promise<void> {
    const familyData = generateFamilyWithNodeCount(100);
    await this.loadFamily(familyData);
  }

  async loadLargeFamily(): Promise<void> {
    const familyData = generateFamilyWithNodeCount(500);
    await this.loadFamily(familyData);
  }

  async loadHugeFamily(): Promise<void> {
    const familyData = generateFamilyWithNodeCount(1000);
    await this.loadFamily(familyData);
  }

  async loadYamlFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    await this.loadFile(file);

    // Reset input for re-selection of same file
    input.value = '';
  }

  resetView(): void {
    if (this.renderer && this.graph) {
      this.renderer.focusOnNode(this.graph.centeredId);
    }
  }

  private updateInfoPanel(person: Person | null): void {
    const panel = document.getElementById('info-panel');
    const nameEl = document.getElementById('person-name');
    const datesEl = document.getElementById('person-dates');
    const detailsEl = document.getElementById('person-details');
    const bioEl = document.getElementById('person-bio');
    const relationsEl = document.getElementById('person-relations');
    const eventsEl = document.getElementById('person-events');
    const notesEl = document.getElementById('person-notes');

    if (!panel || !nameEl || !datesEl || !bioEl || !relationsEl) return;

    if (person) {
      // Name with optional nickname
      let displayName = person.name;
      if (person.nickname) {
        displayName += ` "${person.nickname}"`;
      }
      nameEl.textContent = displayName;

      // Format dates with places
      let dates = '';
      if (person.birthDate || person.birthPlace) {
        dates = `b. ${person.birthDate || '?'}`;
        if (person.birthPlace) dates += ` (${person.birthPlace})`;
      }
      if (person.deathDate || person.deathPlace) {
        if (dates) dates += ' — ';
        dates += `d. ${person.deathDate || '?'}`;
        if (person.deathPlace) dates += ` (${person.deathPlace})`;
      } else if (person.birthDate && !person.deathDate) {
        dates += ' — present';
      }
      datesEl.textContent = dates;

      // Additional details (only show non-null fields)
      if (detailsEl) {
        const details: string[] = [];
        if (person.maidenName) {
          details.push(`<div class="detail-item"><span class="detail-label">Maiden name:</span><span class="detail-value">${person.maidenName}</span></div>`);
        }
        if (person.gender) {
          details.push(`<div class="detail-item"><span class="detail-label">Gender:</span><span class="detail-value">${person.gender}</span></div>`);
        }
        if (person.status) {
          details.push(`<div class="detail-item"><span class="detail-label">Status:</span><span class="detail-value">${person.status}</span></div>`);
        }
        if (person.generation !== undefined) {
          const genLabel = person.generation === 0 ? 'Center' :
                          person.generation > 0 ? `+${person.generation}` :
                          `${person.generation}`;
          details.push(`<div class="detail-item"><span class="detail-label">Generation:</span><span class="detail-value">${genLabel}</span></div>`);
        }
        detailsEl.innerHTML = details.join('');
        detailsEl.style.display = details.length > 0 ? 'block' : 'none';
      }

      bioEl.textContent = person.biography || 'No biography available.';

      // Build categorized relations
      this.renderRelations(person, relationsEl);

      // Render events
      if (eventsEl) {
        this.renderEvents(person, eventsEl);
      }

      // Render notes
      if (notesEl) {
        this.renderNotes(person, notesEl);
      }

      panel.classList.add('visible');
    } else {
      panel.classList.remove('visible');
    }
  }

  private renderEvents(person: Person, container: HTMLElement): void {
    if (!this.graph) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    // Get events for this person
    const events = this.graph.eventsByPerson.get(person.id) || [];
    if (events.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    // Build event signature map to find shared events
    const eventSignatures = new Map<string, string[]>(); // signature -> person IDs
    for (const node of this.graph.nodes.values()) {
      const nodeEvents = this.graph.eventsByPerson.get(node.id) || [];
      for (const event of nodeEvents) {
        const signature = [
          event.eventType || '',
          event.eventDate || event.eventYear?.toString() || '',
          event.location || '',
          event.description || ''
        ].join('|');
        if (!eventSignatures.has(signature)) {
          eventSignatures.set(signature, []);
        }
        const ids = eventSignatures.get(signature)!;
        if (!ids.includes(node.id)) {
          ids.push(node.id);
        }
      }
    }

    let html = '<div class="events-header">Events</div>';

    for (const event of events) {
      const signature = [
        event.eventType || '',
        event.eventDate || event.eventYear?.toString() || '',
        event.location || '',
        event.description || ''
      ].join('|');

      const sharedPersonIds = (eventSignatures.get(signature) || [])
        .filter(id => id !== person.id);

      html += '<div class="event-item">';
      html += `<div class="event-type">${event.eventType.replace(/_/g, ' ')}</div>`;

      const dateStr = event.eventDate || (event.eventYear ? String(event.eventYear) : '');
      if (dateStr) {
        html += `<div class="event-date">${dateStr}</div>`;
      }
      if (event.location) {
        html += `<div class="event-location">${event.location}</div>`;
      }
      if (event.description) {
        html += `<div class="event-description">${event.description}</div>`;
      }

      // Show shared people
      if (sharedPersonIds.length > 0) {
        const sharedLinks = sharedPersonIds.map(id => {
          const node = this.graph?.nodes.get(id);
          if (!node) return '';
          return `<span class="event-shared-link" data-person-id="${id}">${node.person.name}</span>`;
        }).filter(Boolean).join(', ');

        if (sharedLinks) {
          html += `<div class="event-shared">Shared with: ${sharedLinks}</div>`;
        }
      }

      html += '</div>';
    }

    container.innerHTML = html;
    container.style.display = 'block';

    // Add click handlers for shared event links
    container.querySelectorAll('.event-shared-link').forEach(item => {
      item.addEventListener('click', () => {
        const personId = item.getAttribute('data-person-id');
        if (personId) {
          this.flyToPerson(personId);
        }
      });
    });
  }

  private renderNotes(person: Person, container: HTMLElement): void {
    if (!this.graph) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    // Get notes for this person
    const notes = this.graph.notesByPerson.get(person.id) || [];
    if (notes.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    let html = '<div class="notes-header">Notes</div>';

    for (const note of notes) {
      html += '<div class="note-item">';
      if (note.category) {
        html += `<div class="note-category">${note.category}</div>`;
      }
      html += `<div class="note-content">${note.content}</div>`;
      if (note.source) {
        html += `<div class="note-source">Source: ${note.source}</div>`;
      }
      html += '</div>';
    }

    container.innerHTML = html;
    container.style.display = 'block';
  }

  private renderRelations(person: Person, container: HTMLElement): void {
    if (!this.graph) {
      container.innerHTML = '';
      return;
    }

    const html: string[] = [];

    // Helper to create relation items
    const createRelationGroup = (label: string, personIds: string[]): string => {
      if (personIds.length === 0) return '';

      const items = personIds
        .map(id => {
          const node = this.graph?.nodes.get(id);
          if (!node) return null;
          return `<span class="relation-item" data-person-id="${id}">${node.person.name}</span>`;
        })
        .filter(Boolean)
        .join('');

      if (!items) return '';

      return `
        <div class="relation-group">
          <div class="relation-label">${label}</div>
          <div>${items}</div>
        </div>
      `;
    };

    // Parents
    if (person.parentIds && person.parentIds.length > 0) {
      html.push(createRelationGroup('Parents', person.parentIds));
    }

    // Siblings - grouped by shared parents
    const siblingGroups = this.getSiblingsGrouped(person);
    for (const group of siblingGroups) {
      let label: string;
      if (group.isFullSiblings) {
        label = 'Siblings';
      } else {
        // Half-siblings: "Siblings through Adam and Eve"
        label = `Siblings through ${group.parentNames.join(' and ')}`;
      }
      html.push(createRelationGroup(label, group.siblingIds));
    }

    // Children
    if (person.childIds && person.childIds.length > 0) {
      html.push(createRelationGroup('Children', person.childIds));
    }

    // Co-parents (people with whom they share children)
    const coParentIds = this.getCoParents(person);
    if (coParentIds.length > 0) {
      html.push(createRelationGroup('Co-parent', coParentIds));
    }

    container.innerHTML = html.join('');

    // Add click handlers to all relation items
    container.querySelectorAll('.relation-item').forEach(item => {
      item.addEventListener('click', () => {
        const personId = item.getAttribute('data-person-id');
        if (personId) {
          this.flyToPerson(personId);
        }
      });
    });
  }

  private getCoParents(person: Person): string[] {
    if (!this.graph || !person.childIds || person.childIds.length === 0) {
      return [];
    }

    const coParentIds = new Set<string>();

    // For each child, find the other parents
    for (const childId of person.childIds) {
      const childNode = this.graph.nodes.get(childId);
      if (!childNode || !childNode.person.parentIds) continue;

      for (const parentId of childNode.person.parentIds) {
        if (parentId !== person.id) {
          coParentIds.add(parentId);
        }
      }
    }

    return Array.from(coParentIds);
  }

  /**
   * Get siblings grouped by shared parents
   * Returns an array of groups: { parentIds: string[], parentNames: string[], siblingIds: string[] }
   * Full siblings (sharing all parents) are identified when parentIds matches person's parentIds
   */
  private getSiblingsGrouped(person: Person): Array<{ parentIds: string[]; parentNames: string[]; siblingIds: string[]; isFullSiblings: boolean }> {
    if (!this.graph || !person.parentIds || person.parentIds.length === 0) {
      return [];
    }

    // Map to track siblings by their parent set
    // Key: sorted parent IDs joined by "|", Value: sibling IDs
    const siblingsByParentSet = new Map<string, Set<string>>();

    // For each parent, find all their children (potential siblings)
    for (const parentId of person.parentIds) {
      const parentNode = this.graph.nodes.get(parentId);
      if (!parentNode || !parentNode.person.childIds) continue;

      for (const childId of parentNode.person.childIds) {
        // Skip the person themselves
        if (childId === person.id) continue;

        const childNode = this.graph.nodes.get(childId);
        if (!childNode || !childNode.person.parentIds) continue;

        // Find shared parents between this sibling and the person
        const sharedParentIds = childNode.person.parentIds.filter(pid =>
          person.parentIds!.includes(pid)
        ).sort();

        if (sharedParentIds.length === 0) continue;

        const key = sharedParentIds.join('|');
        if (!siblingsByParentSet.has(key)) {
          siblingsByParentSet.set(key, new Set());
        }
        siblingsByParentSet.get(key)!.add(childId);
      }
    }

    // Convert to result format
    const sortedPersonParentIds = [...person.parentIds].sort();
    const result: Array<{ parentIds: string[]; parentNames: string[]; siblingIds: string[]; isFullSiblings: boolean }> = [];

    for (const [key, siblingIdSet] of siblingsByParentSet) {
      const parentIds = key.split('|');
      const parentNames = parentIds.map(pid => {
        const node = this.graph?.nodes.get(pid);
        return node?.person.name || pid;
      });

      // Check if this is a full sibling group (shares all of person's parents)
      const isFullSiblings = parentIds.length === sortedPersonParentIds.length &&
        parentIds.every(pid => sortedPersonParentIds.includes(pid));

      result.push({
        parentIds,
        parentNames,
        siblingIds: Array.from(siblingIdSet),
        isFullSiblings,
      });
    }

    // Sort: full siblings first, then by number of shared parents (descending)
    result.sort((a, b) => {
      if (a.isFullSiblings && !b.isFullSiblings) return -1;
      if (!a.isFullSiblings && b.isFullSiblings) return 1;
      return b.parentIds.length - a.parentIds.length;
    });

    return result;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ancestralWeb = new AncestralWebApp();
});

// Also export for external use
export { AncestralWebApp, parseFamily, FamilyGraph, ForceDirectedLayout, AncestralWebRenderer };
