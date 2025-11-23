import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GraphNode, GraphEdge, EngineConfig, Person } from '../types';
import { DEFAULT_CONFIG } from '../types';
import {
  nodeVertexShader,
  nodeFragmentShader,
  edgeVertexShader,
  edgeFragmentShader,
  particleVertexShader,
  particleFragmentShader,
} from '../shaders';

export interface HoverCallback {
  (person: Person | null, screenPos: { x: number; y: number } | null): void;
}

/**
 * Main 3D renderer for the Ancestral Web visualization
 * Uses Three.js with custom shaders for ethereal bioluminescent effects
 */
export class AncestralWebRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private config: EngineConfig;

  private nodeMeshes: Map<string, THREE.Mesh> = new Map();
  private nodeUniforms: Map<string, Record<string, THREE.IUniform>> = new Map();
  private edgeLines: THREE.Line[] = [];
  private particleSystem: THREE.Points | null = null;
  private backgroundParticles: THREE.Points | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredNode: GraphNode | null = null;
  private onHoverCallback: HoverCallback | null = null;

  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor(container: HTMLElement, config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.003);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 50, 150);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 500;
    this.controls.minDistance = 20;

    // Event listeners
    this.setupEventListeners(container);

    // Add ambient lighting
    this.setupLighting();

    // Add background atmosphere
    this.createBackgroundParticles();
  }

  private setupEventListeners(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });

    container.addEventListener('mousemove', (event) => {
      const rect = container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0x203040, 0.5);
    this.scene.add(ambient);

    // Subtle point lights for ethereal glow
    const light1 = new THREE.PointLight(0x4080ff, 1, 300);
    light1.position.set(50, 50, 50);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x80ffdd, 0.8, 300);
    light2.position.set(-50, -30, -50);
    this.scene.add(light2);
  }

  private createBackgroundParticles(): void {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spread particles in a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 100 + Math.random() * 400;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      phases[i] = Math.random();
      speeds[i] = 0.2 + Math.random() * 0.3;

      // Varied ethereal colors
      const hue = 0.5 + Math.random() * 0.3; // Cyan to blue
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 15 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.backgroundParticles = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundParticles);
  }

  /**
   * Render the family graph
   */
  renderGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    // Clear existing meshes
    this.clearScene();

    // Create node meshes
    this.createNodeMeshes(nodes);

    // Create edge lines
    this.createEdgeLines(nodes, edges);

    // Create node-attached particles
    this.createNodeParticles(nodes);

    // Hide loading indicator
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  private clearScene(): void {
    for (const mesh of this.nodeMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.nodeMeshes.clear();
    this.nodeUniforms.clear();

    for (const line of this.edgeLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.edgeLines = [];

    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }
  }

  private createNodeMeshes(nodes: GraphNode[]): void {
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    for (const node of nodes) {
      const size =
        this.config.visuals.nodeBaseSize *
        (1 + node.biographyWeight * this.config.visuals.nodeSizeMultiplier);

      const geometry = new THREE.SphereGeometry(size, 32, 32);

      const uniforms = {
        uTime: { value: 0 },
        uBiographyWeight: { value: node.biographyWeight },
        uColorPrimary: { value: primary },
        uColorSecondary: { value: secondary },
        uGlowIntensity: { value: this.config.visuals.glowIntensity },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader: nodeVertexShader,
        fragmentShader: nodeFragmentShader,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.userData = { node };

      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);
      this.nodeUniforms.set(node.id, uniforms);
    }
  }

  private createEdgeLines(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);

      if (!source || !target) continue;

      // Create curved path using CatmullRom
      const start = new THREE.Vector3(
        source.position.x,
        source.position.y,
        source.position.z
      );
      const end = new THREE.Vector3(
        target.position.x,
        target.position.y,
        target.position.z
      );

      // Control point for curve
      const mid = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
      const perpendicular = new THREE.Vector3()
        .subVectors(end, start)
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(
          start.distanceTo(end) * this.config.visuals.edgeCurvature
        );
      mid.add(perpendicular);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(50);

      // Create geometry with progress attribute
      const positions = new Float32Array(points.length * 3);
      const progress = new Float32Array(points.length);

      for (let i = 0; i < points.length; i++) {
        positions[i * 3] = points[i].x;
        positions[i * 3 + 1] = points[i].y;
        positions[i * 3 + 2] = points[i].z;
        progress[i] = i / (points.length - 1);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: edgeVertexShader,
        fragmentShader: edgeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorPrimary: { value: primary },
          uColorSecondary: { value: secondary },
          uEdgeStrength: { value: edge.strength },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.edgeLines.push(line);
    }
  }

  private createNodeParticles(nodes: GraphNode[]): void {
    // Calculate total particle count based on biography weights
    let totalParticles = 0;
    for (const node of nodes) {
      const count = Math.floor(
        5 + node.biographyWeight * 20 * this.config.visuals.particleDensity
      );
      totalParticles += count;
    }

    const positions = new Float32Array(totalParticles * 3);
    const phases = new Float32Array(totalParticles);
    const speeds = new Float32Array(totalParticles);
    const colors = new Float32Array(totalParticles * 3);

    let index = 0;
    for (const node of nodes) {
      const count = Math.floor(
        5 + node.biographyWeight * 20 * this.config.visuals.particleDensity
      );

      for (let i = 0; i < count; i++) {
        // Particles orbit around node
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 3 + Math.random() * 8 * (1 + node.biographyWeight);

        positions[index * 3] =
          node.position.x + r * Math.sin(phi) * Math.cos(theta);
        positions[index * 3 + 1] =
          node.position.y + r * Math.sin(phi) * Math.sin(theta);
        positions[index * 3 + 2] = node.position.z + r * Math.cos(phi);

        phases[index] = Math.random();
        speeds[index] = 0.3 + Math.random() * 0.5;

        // Color based on node generation
        const hue = 0.5 + (node.generation * 0.05 + Math.random() * 0.1);
        const sat = 0.7 + node.biographyWeight * 0.3;
        const color = new THREE.Color().setHSL(hue, sat, 0.6);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        index++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 10 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  /**
   * Set hover callback
   */
  onHover(callback: HoverCallback): void {
    this.onHoverCallback = callback;
  }

  /**
   * Check for hover intersections
   */
  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.nodeMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const node = mesh.userData.node as GraphNode;

      if (this.hoveredNode !== node) {
        this.hoveredNode = node;

        // Calculate screen position
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(mesh.matrixWorld);
        vector.project(this.camera);

        const screenPos = {
          x: (vector.x * 0.5 + 0.5) * window.innerWidth,
          y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
        };

        if (this.onHoverCallback) {
          this.onHoverCallback(node.person, screenPos);
        }
      }
    } else if (this.hoveredNode) {
      this.hoveredNode = null;
      if (this.onHoverCallback) {
        this.onHoverCallback(null, null);
      }
    }
  }

  /**
   * Start animation loop
   */
  start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const time = this.clock.getElapsedTime();

      // Update shader uniforms
      for (const uniforms of this.nodeUniforms.values()) {
        uniforms.uTime.value = time;
      }

      for (const line of this.edgeLines) {
        const material = line.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      if (this.particleSystem) {
        const material = this.particleSystem.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      if (this.backgroundParticles) {
        const material = this.backgroundParticles
          .material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = time;
      }

      // Update hover
      this.updateHover();

      // Update controls
      this.controls.update();

      // Render
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop animation loop
   */
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();
    this.clearScene();

    if (this.backgroundParticles) {
      this.scene.remove(this.backgroundParticles);
      this.backgroundParticles.geometry.dispose();
      (this.backgroundParticles.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.controls.dispose();
  }

  /**
   * Get camera for external manipulation
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Focus camera on a specific node
   */
  focusOnNode(nodeId: string): void {
    const mesh = this.nodeMeshes.get(nodeId);
    if (mesh) {
      const target = mesh.position.clone();
      this.controls.target.copy(target);
      this.camera.position.set(
        target.x + 30,
        target.y + 20,
        target.z + 50
      );
    }
  }
}
