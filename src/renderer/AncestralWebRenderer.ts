import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GraphNode, GraphEdge, EngineConfig, Person } from '../types';
import { DEFAULT_CONFIG } from '../types';
import {
  instancedNodeVertexShader,
  instancedNodeFragmentShader,
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
 * Optimized with InstancedMesh for large graphs
 */
export class AncestralWebRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private config: EngineConfig;

  // Instanced rendering
  private nodeInstancedMesh: THREE.InstancedMesh | null = null;
  private nodeData: GraphNode[] = [];
  private nodeUniforms: { uTime: THREE.IUniform; uColorPrimary: THREE.IUniform; uColorSecondary: THREE.IUniform; uGlowIntensity: THREE.IUniform } | null = null;

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
    this.scene.fog = new THREE.FogExp2(0x020408, 0.0015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
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
    this.controls.maxDistance = 2000;
    this.controls.minDistance = 10;

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
    const ambient = new THREE.AmbientLight(0x203040, 0.5);
    this.scene.add(ambient);

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
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 100 + Math.random() * 400;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      phases[i] = Math.random();
      speeds[i] = 0.2 + Math.random() * 0.3;

      const hue = 0.5 + Math.random() * 0.3;
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
    this.clearScene();
    this.nodeData = nodes;

    // Create instanced node mesh
    this.createInstancedNodes(nodes);

    // Create edge lines
    this.createEdgeLines(nodes, edges);

    // Create node-attached particles
    this.createNodeParticles(nodes);

    // Hide loading indicator
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';

    console.log(`Rendered ${nodes.length} nodes using InstancedMesh`);
  }

  private clearScene(): void {
    if (this.nodeInstancedMesh) {
      this.scene.remove(this.nodeInstancedMesh);
      this.nodeInstancedMesh.geometry.dispose();
      (this.nodeInstancedMesh.material as THREE.Material).dispose();
      this.nodeInstancedMesh = null;
    }

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

  private createInstancedNodes(nodes: GraphNode[]): void {
    const count = nodes.length;
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    // Create base geometry - single sphere that will be instanced
    const baseSize = this.config.visuals.nodeBaseSize;
    const geometry = new THREE.SphereGeometry(baseSize, 24, 24);

    // Add instance attributes
    const biographyWeights = new Float32Array(count);
    const nodeIndices = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      biographyWeights[i] = nodes[i].biographyWeight;
      nodeIndices[i] = i;
    }

    geometry.setAttribute(
      'aBiographyWeight',
      new THREE.InstancedBufferAttribute(biographyWeights, 1)
    );
    geometry.setAttribute(
      'aNodeIndex',
      new THREE.InstancedBufferAttribute(nodeIndices, 1)
    );

    // Create shader material
    this.nodeUniforms = {
      uTime: { value: 0 },
      uColorPrimary: { value: primary },
      uColorSecondary: { value: secondary },
      uGlowIntensity: { value: this.config.visuals.glowIntensity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: instancedNodeVertexShader,
      fragmentShader: instancedNodeFragmentShader,
      uniforms: this.nodeUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });

    // Create instanced mesh
    this.nodeInstancedMesh = new THREE.InstancedMesh(geometry, material, count);

    // Set instance transforms
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      position.set(node.position.x, node.position.y, node.position.z);

      // Scale based on biography weight
      const nodeScale = 1 + node.biographyWeight * this.config.visuals.nodeSizeMultiplier;
      scale.set(nodeScale, nodeScale, nodeScale);

      matrix.compose(position, quaternion, scale);
      this.nodeInstancedMesh.setMatrixAt(i, matrix);
    }

    this.nodeInstancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.nodeInstancedMesh);
  }

  private createEdgeLines(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const primary = new THREE.Color(this.config.visuals.colorPrimary);
    const secondary = new THREE.Color(this.config.visuals.colorSecondary);

    // Reduce curve resolution for large graphs
    const curvePoints = nodes.length > 500 ? 20 : nodes.length > 200 ? 30 : 50;

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);

      if (!source || !target) continue;

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
      const points = curve.getPoints(curvePoints);

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
    // Reduce particle count for large graphs
    const particleMultiplier = nodes.length > 500 ? 0.1 : nodes.length > 200 ? 0.2 : 0.3;

    let totalParticles = 0;
    for (const node of nodes) {
      const count = Math.floor(
        5 + node.biographyWeight * 20 * particleMultiplier
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
        5 + node.biographyWeight * 20 * particleMultiplier
      );

      for (let i = 0; i < count; i++) {
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
   * Check for hover intersections with instanced mesh
   */
  private updateHover(): void {
    if (!this.nodeInstancedMesh || this.nodeData.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.nodeInstancedMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId < this.nodeData.length) {
        const node = this.nodeData[instanceId];

        if (this.hoveredNode !== node) {
          this.hoveredNode = node;

          // Calculate screen position
          const vector = new THREE.Vector3(
            node.position.x,
            node.position.y,
            node.position.z
          );
          vector.project(this.camera);

          const screenPos = {
            x: (vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
          };

          if (this.onHoverCallback) {
            this.onHoverCallback(node.person, screenPos);
          }
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

      // Update instanced mesh uniforms
      if (this.nodeUniforms) {
        this.nodeUniforms.uTime.value = time;
      }

      // Update edge uniforms
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

    // Remove canvas from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
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
    const node = this.nodeData.find(n => n.id === nodeId);
    if (node) {
      const target = new THREE.Vector3(
        node.position.x,
        node.position.y,
        node.position.z
      );
      this.controls.target.copy(target);
      this.camera.position.set(
        target.x + 30,
        target.y + 20,
        target.z + 50
      );
    }
  }
}
