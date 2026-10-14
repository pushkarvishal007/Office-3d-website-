import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BrandingConfig, GraphicsQuality, TimeOfDay, ZoneId } from '../types';
import { sounds } from '../audio/soundEffects';

export interface OfficeSceneCallbacks {
  onZoneSelect: (zoneId: ZoneId) => void;
  onTourProgress?: (stepIndex: number, zoneId: ZoneId) => void;
  onVisitorArrived?: (zoneId: ZoneId) => void;
  onSceneReady?: () => void;
}

export class OfficeScene {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  // Mobile & Quality Detection
  public isMobile = false;
  public currentQuality: GraphicsQuality = 'high';

  // Lighting
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private interiorLights: THREE.PointLight[] = [];

  // Interactive Meshes & Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private interactiveZones: { id: ZoneId; mesh: THREE.Object3D; box: THREE.Box3 }[] = [];
  private hoveredZone: ZoneId | null = null;
  private activeZone: ZoneId = 'street';
  private lastRaycastTime = 0;
  private hasPendingPointerCheck = false;

  // Dynamic Textures & Signage
  private domainTexture!: THREE.CanvasTexture;
  private domainMesh!: THREE.Mesh;
  private brandingConfig: BrandingConfig;

  // Animated Elements
  private visitorGroup!: THREE.Group;
  private visitorLeftLeg!: THREE.Mesh;
  private visitorRightLeg!: THREE.Mesh;
  private visitorLeftArm!: THREE.Mesh;
  private visitorRightArm!: THREE.Mesh;
  private securityGateLeft!: THREE.Mesh;
  private securityGateRight!: THREE.Mesh;
  private gateTargetX = 0; // 0 = closed, 1.2 = open

  // Camera Animation Interpolation
  private isAnimatingCamera = false;
  private targetCamPos = new THREE.Vector3(12, 11, 24);
  private targetLookAt = new THREE.Vector3(0, 1, 12);

  // Visitor Movement Path
  private isVisitorMoving = false;
  private visitorCurrentPath: THREE.Vector3[] = [];
  private visitorPathIndex = 0;
  private visitorTargetZone: ZoneId | null = null;
  private walkTime = 0;

  // Demand-Based Rendering & Energy Saving
  private renderDecayFrames = 90; // Keeps rendering for a few frames after motion to allow damping
  private isTabHidden = false;

  // Shared Geometry & Material Pools (Prevent Garbage Collection & Reduce Draw Calls)
  private sharedGeometries: { [key: string]: THREE.BufferGeometry } = {};
  private sharedMaterials: { [key: string]: THREE.Material } = {};

  private callbacks: OfficeSceneCallbacks;
  private animationFrameId: number | null = null;
  private isDisposed = false;

  constructor(
    container: HTMLElement,
    branding: BrandingConfig,
    initialQuality: GraphicsQuality,
    callbacks: OfficeSceneCallbacks
  ) {
    this.container = container;
    this.brandingConfig = branding;
    this.currentQuality = initialQuality;
    this.callbacks = callbacks;

    // Detect mobile device user agent and screen size
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;

    this.initScene();
    this.initLighting();
    this.initEnvironment();
    this.initSharedPools();
    this.buildCampus();
    this.initVisitor();
    this.setupEventListeners();
    this.applyGraphicsQuality(this.currentQuality);
    this.startRenderLoop();

    // Signal scene ready
    requestAnimationFrame(() => {
      this.requestRender(60);
      this.callbacks.onSceneReady?.();
    });
  }

  // -------------------------------------------------------------
  // INITIALIZATION & OPTIMIZED RENDERER
  // -------------------------------------------------------------
  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    this.camera.position.set(14, 13, 25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile, // Disable MSAA on mobile for huge fillrate win
      powerPreference: 'high-performance',
      stencil: false, // Save memory
      depth: true,
    });
    this.renderer.setSize(width, height);

    // Optimization 1: Cap DPR to 1.25 on mobile, 1.5 - 2.0 on desktop
    const maxDpr = this.isMobile
      ? 1.25
      : this.currentQuality === 'low'
      ? 1.25
      : Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(maxDpr);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 55;
    this.controls.target.set(0, 1, 10);
    this.controls.update();

    // Trigger demand rendering on control change
    this.controls.addEventListener('change', () => {
      this.requestRender(45);
    });
  }

  private initEnvironment() {
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      pmremGenerator.dispose();
      roomEnv.dispose();
    } catch {
      // Fallback
    }
  }

  private initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcfd8dc, 0.6);
    this.hemiLight.position.set(0, 25, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff6e5, 1.8);
    this.dirLight.position.set(18, 26, 18);
    this.dirLight.castShadow = true;
    // Shadows will be configured by applyGraphicsQuality
    this.scene.add(this.dirLight);

    // Warm interior lights (reduced in low quality)
    const lightPositions: [number, number, number][] = [
      [0, 3.8, 3],     // Reception
      [5.5, 3.8, -2],  // Workstations
      [-5.5, 3.8, -2], // Design
      [-5, 3.8, -7.5], // Meeting Room
      [5, 3.8, -7.5],  // Boss Office
    ];

    lightPositions.forEach(([x, y, z]) => {
      const pt = new THREE.PointLight(0xfff1dc, 0.8, 10, 2);
      pt.position.set(x, y, z);
      this.scene.add(pt);
      this.interiorLights.push(pt);
    });
  }

  // -------------------------------------------------------------
  // GRAPHICS QUALITY CONFIGURATION (LOW / HIGH)
  // -------------------------------------------------------------
  public setGraphicsQuality(quality: GraphicsQuality) {
    this.currentQuality = quality;
    this.applyGraphicsQuality(quality);
    this.requestRender(60);
  }

  private applyGraphicsQuality(quality: GraphicsQuality) {
    const isLow = quality === 'low';

    // DPR Capping
    const maxDpr = this.isMobile ? (isLow ? 1.0 : 1.25) : isLow ? 1.25 : Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(maxDpr);

    // Real-time Shadow optimization
    if (isLow) {
      // Turn off expensive real-time shadows on low quality for massive GPU boost
      this.renderer.shadowMap.enabled = false;
      this.dirLight.castShadow = false;
      // Reduce point lights to save fragment shader calculations
      this.interiorLights.forEach((light, idx) => {
        light.visible = idx === 0 || idx === 1; // Only 2 lights active
      });
      this.ambientLight.intensity = 0.95; // Compensate light level
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.dirLight.castShadow = true;
      // 1024 is sharp while using 4x less VRAM than 2048
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 1;
      this.dirLight.shadow.camera.far = 60;
      const d = 22;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;

      this.interiorLights.forEach((light) => {
        light.visible = true;
      });
      this.ambientLight.intensity = 0.75;
    }

    // Mark scene materials for compile update
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => (m.needsUpdate = true));
          } else {
            mesh.material.needsUpdate = true;
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // GEOMETRY & MATERIAL POOLING (Avoids Duplicate Allocations)
  // -------------------------------------------------------------
  private initSharedPools() {
    // Shared Geometries
    this.sharedGeometries['ground'] = new THREE.BoxGeometry(26, 0.4, 34);
    this.sharedGeometries['road'] = new THREE.PlaneGeometry(24, 7);
    this.sharedGeometries['sidewalk'] = new THREE.BoxGeometry(24, 0.2, 2.5);
    this.sharedGeometries['stripe'] = new THREE.PlaneGeometry(0.5, 4.5);
    this.sharedGeometries['table'] = new THREE.BoxGeometry(2.2, 0.08, 1.1);
    this.sharedGeometries['tableLeg'] = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
    this.sharedGeometries['chairCylinder'] = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8);
    this.sharedGeometries['chairSeat'] = new THREE.BoxGeometry(0.55, 0.08, 0.55);
    this.sharedGeometries['chairBack'] = new THREE.BoxGeometry(0.52, 0.6, 0.06);
    this.sharedGeometries['humanHead'] = new THREE.BoxGeometry(0.3, 0.32, 0.3);
    this.sharedGeometries['humanTorso'] = new THREE.BoxGeometry(0.48, 0.65, 0.28);
    this.sharedGeometries['humanLeg'] = new THREE.BoxGeometry(0.18, 0.72, 0.2);
    this.sharedGeometries['plantPot'] = new THREE.CylinderGeometry(0.35, 0.25, 0.65, 10);
    this.sharedGeometries['plantLeaf'] = new THREE.SphereGeometry(0.18, 6, 6);
    this.sharedGeometries['treePlanter'] = new THREE.CylinderGeometry(0.6, 0.5, 0.5, 10);
    this.sharedGeometries['treeTrunk'] = new THREE.CylinderGeometry(0.12, 0.16, 1.8, 6);
    this.sharedGeometries['treeCanopy'] = new THREE.SphereGeometry(0.85, 8, 8);

    // Shared Materials
    this.sharedMaterials['ground'] = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    this.sharedMaterials['road'] = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    this.sharedMaterials['curb'] = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
    this.sharedMaterials['stripe'] = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    this.sharedMaterials['floor'] = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    this.sharedMaterials['wall'] = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    this.sharedMaterials['chrome'] = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    this.sharedMaterials['darkMetal'] = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    this.sharedMaterials['whiteDesk'] = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    this.sharedMaterials['darkChair'] = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    this.sharedMaterials['blueChair'] = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    this.sharedMaterials['wood'] = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    this.sharedMaterials['walnut'] = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.35 });
    this.sharedMaterials['treeLeaf'] = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
    this.sharedMaterials['treeBark'] = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    this.sharedMaterials['skin'] = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 });
    this.sharedMaterials['hair'] = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });

    // Lightweight Glass Material: avoids screen-copy transmission pass on mobile!
    this.sharedMaterials['glass'] = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.38,
      roughness: 0.1,
      metalness: 0.1,
    });
  }

  // -------------------------------------------------------------
  // PROCEDURAL 3D ASSETS & WORLD BUILDING
  // -------------------------------------------------------------
  private buildCampus() {
    // 1. Ground Foundation Slab
    const ground = new THREE.Mesh(this.sharedGeometries['ground'], this.sharedMaterials['ground']);
    ground.position.set(0, -0.2, 3);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Asphalt Road with Zebra Crosswalk (Instanced)
    this.buildStreet();

    // 3. Security Perimeter Fence & Gate
    this.buildSecurityZone();

    // 4. Main Office Platform & Architecture
    this.buildOfficeArchitecture();

    // 5. Interior Departments
    this.buildReceptionZone();
    this.buildWorkstationsZone();
    this.buildDesignRoomZone();
    this.buildMeetingRoomZone();
    this.buildBossSuiteZone();

    // 6. Courtyard Trees (Instanced Mesh)
    this.buildCourtyardTrees();
  }

  private buildStreet() {
    // Road plane
    const road = new THREE.Mesh(this.sharedGeometries['road'], this.sharedMaterials['road']);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 15.5);
    road.receiveShadow = true;
    this.scene.add(road);

    // Sidewalk curb
    const sidewalk = new THREE.Mesh(this.sharedGeometries['sidewalk'], this.sharedMaterials['curb']);
    sidewalk.position.set(0, 0.1, 11);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Optimization 4: InstancedMesh for Zebra Crossing Stripes (1 draw call instead of 7)
    const stripeCount = 7;
    const stripeInstanced = new THREE.InstancedMesh(
      this.sharedGeometries['stripe'],
      this.sharedMaterials['stripe'],
      stripeCount
    );
    stripeInstanced.rotation.x = -Math.PI / 2;
    stripeInstanced.position.set(0, 0.03, 15.5);
    stripeInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < stripeCount; i++) {
      const xOffset = (i - 3) * 0.9;
      dummy.position.set(xOffset, 0, 0);
      dummy.updateMatrix();
      stripeInstanced.setMatrixAt(i, dummy.matrix);
    }
    stripeInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(stripeInstanced);

    // Street Signboard with Domain Name
    this.buildBillboardSign();

    // Register interactive trigger
    this.registerInteractiveZone('street', new THREE.Vector3(0, 0.5, 14), new THREE.Vector3(8, 2, 6));
  }

  private buildBillboardSign() {
    // Optimization 11: Optimized Canvas Resolution (512x128 instead of 1024x256)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    this.drawDomainTexture(ctx);

    this.domainTexture = new THREE.CanvasTexture(canvas);
    this.domainTexture.colorSpace = THREE.SRGBColorSpace;
    this.domainTexture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4);

    const boardGroup = new THREE.Group();
    boardGroup.position.set(6.5, 0, 11);

    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
    const postMat = this.sharedMaterials['chrome'];
    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(-1.4, 1.4, 0);
    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(1.4, 1.4, 0);
    boardGroup.add(post1, post2);

    const panelMat = new THREE.MeshStandardMaterial({
      map: this.domainTexture,
      roughness: 0.2,
      metalness: 0.1,
    });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.15), panelMat);
    panel.position.set(0, 2.2, 0);
    panel.castShadow = true;
    this.domainMesh = panel;
    boardGroup.add(panel);

    this.scene.add(boardGroup);
  }

  public updateBranding(branding: BrandingConfig) {
    this.brandingConfig = branding;
    if (this.domainTexture) {
      const canvas = this.domainTexture.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.drawDomainTexture(ctx);
        this.domainTexture.needsUpdate = true;
      }
    }
    this.requestRender(30);
  }

  private drawDomainTexture(ctx: CanvasRenderingContext2D) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = this.brandingConfig.accentColor || '#10b981';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Inner glow bar
    ctx.fillStyle = this.brandingConfig.accentColor || '#10b981';
    ctx.fillRect(10, 10, 12, h - 20);

    // Domain name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.brandingConfig.domain || 'vikasbuilds.com', 35, h / 2 - 12);

    // Subtitle tagline
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      this.brandingConfig.companyName + ' • ' + (this.brandingConfig.tagline || 'Interactive 3D Workspace'),
      35,
      h / 2 + 24
    );
  }

  private buildSecurityZone() {
    const securityGroup = new THREE.Group();
    securityGroup.position.set(0, 0, 8.5);

    const wallMat = this.sharedMaterials['curb'];
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 0.3), wallMat);
    leftWall.position.set(-6, 0.6, 0);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 0.3), wallMat);
    rightWall.position.set(6, 0.6, 0);
    securityGroup.add(leftWall, rightWall);

    // Security Booth
    const booth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.4), this.sharedMaterials['road']);
    booth.position.set(-3.2, 1.3, -0.6);
    securityGroup.add(booth);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.8), this.sharedMaterials['darkChair']);
    roof.position.set(-3.2, 2.65, -0.6);
    securityGroup.add(roof);

    // Booth Window (Optimized glass)
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.1), this.sharedMaterials['glass']);
    windowMesh.position.set(-3.2, 1.5, 0.61);
    securityGroup.add(windowMesh);

    // Security Guard Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 32;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 128, 32);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 16px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('SECURITY', 64, 16);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.35), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(-3.2, 2.3, 0.62);
    securityGroup.add(signMesh);

    // Guard Character
    const guard = this.createLowPolyHuman(0x1e3a8a, 0x1e293b);
    guard.position.set(-3.2, 0, -0.5);
    guard.scale.set(0.9, 0.9, 0.9);
    securityGroup.add(guard);

    // Security Gates
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      metalness: 0.5,
      roughness: 0.4,
    });

    this.securityGateLeft = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), gateMat);
    this.securityGateLeft.position.set(-0.9, 0.55, 0);

    this.securityGateRight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), gateMat);
    this.securityGateRight.position.set(0.9, 0.55, 0);

    securityGroup.add(this.securityGateLeft, this.securityGateRight);

    // Pillars
    const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.35), this.sharedMaterials['darkMetal']);
    pLeft.position.set(-1.9, 0.7, 0);
    const pRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.35), this.sharedMaterials['darkMetal']);
    pRight.position.set(1.9, 0.7, 0);
    securityGroup.add(pLeft, pRight);

    this.scene.add(securityGroup);
    this.registerInteractiveZone('security', new THREE.Vector3(-1.5, 1, 8.5), new THREE.Vector3(5, 2.5, 3));
  }

  private buildOfficeArchitecture() {
    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 19), this.sharedMaterials['floor']);
    floor.position.set(0, 0.05, -2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Outer Walls
    const wallMat = this.sharedMaterials['wall'];
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 0.4), wallMat);
    backWall.position.set(0, 1.6, -11.5);
    backWall.receiveShadow = true;

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 19), wallMat);
    leftWall.position.set(-11, 1.6, -2);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 19), wallMat);
    rightWall.position.set(11, 1.6, -2);

    this.scene.add(backWall, leftWall, rightWall);

    // Glass Partitions (Shared lightweight glass)
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.4, 0.1), this.sharedMaterials['glass']);
    p1.position.set(-5.5, 1.2, -5);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.4, 0.1), this.sharedMaterials['glass']);
    p2.position.set(5.5, 1.2, -5);

    const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 13), this.sharedMaterials['curb']);
    centerDivider.position.set(0, 1.2, -5);

    this.scene.add(p1, p2, centerDivider);
  }

  private buildReceptionZone() {
    const group = new THREE.Group();
    group.position.set(0, 0, 3);

    const deskBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, 1.4), this.sharedMaterials['wood']);
    deskBase.position.set(0, 0.525, 0);

    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 1.6), this.sharedMaterials['whiteDesk']);
    deskTop.position.set(0, 1.1, 0);
    group.add(deskBase, deskTop);

    // RECEPTION Sign
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 30px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RECEPTION', 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const recSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: tex }));
    recSign.position.set(0, 0.6, 0.71);
    group.add(recSign);

    // Monitor
    const monitor = this.createComputerMonitor();
    monitor.position.set(0, 1.15, -0.2);
    monitor.rotation.y = Math.PI;
    group.add(monitor);

    // Receptionist
    const receptionist = this.createLowPolyHuman(0xd97706, 0x1e293b);
    receptionist.position.set(0, 0, -0.9);
    group.add(receptionist);

    // Indoor Plants
    const plant1 = this.createIndoorPlant();
    plant1.position.set(-2.8, 0, 0.2);
    const plant2 = this.createIndoorPlant();
    plant2.position.set(2.8, 0, 0.2);
    group.add(plant1, plant2);

    // Waiting Bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.45, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 })
    );
    bench.position.set(-3.2, 0.225, 2.2);
    group.add(bench);

    this.scene.add(group);
    this.registerInteractiveZone('reception', new THREE.Vector3(0, 1, 3), new THREE.Vector3(6, 2.5, 4));
  }

  private buildWorkstationsZone() {
    const group = new THREE.Group();
    group.position.set(5.5, 0, -2);

    const deskPositions = [
      { x: -1.6, z: -1.2, rot: 0 },
      { x: 1.6, z: -1.2, rot: 0 },
      { x: -1.6, z: 1.2, rot: Math.PI },
      { x: 1.6, z: 1.2, rot: Math.PI },
    ];

    deskPositions.forEach((pos) => {
      const table = new THREE.Mesh(this.sharedGeometries['table'], this.sharedMaterials['whiteDesk']);
      table.position.set(pos.x, 0.8, pos.z);
      group.add(table);

      // Reused table legs
      for (const lx of [-0.95, 0.95]) {
        for (const lz of [-0.45, 0.45]) {
          const leg = new THREE.Mesh(this.sharedGeometries['tableLeg'], this.sharedMaterials['darkMetal']);
          leg.position.set(pos.x + lx, 0.4, pos.z + lz);
          group.add(leg);
        }
      }

      const monitor = this.createComputerMonitor(0x38bdf8);
      monitor.position.set(pos.x, 0.84, pos.z - 0.2);
      monitor.rotation.y = pos.rot;
      group.add(monitor);

      const chair = this.createOfficeChair(this.sharedMaterials['blueChair']);
      chair.position.set(pos.x, 0, pos.z + (pos.rot === 0 ? 0.7 : -0.7));
      chair.rotation.y = pos.rot;
      group.add(chair);
    });

    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.7, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 })
    );
    divider.position.set(0, 1.15, 0);
    group.add(divider);

    const dev = this.createLowPolyHuman(0x2563eb, 0x1f2937);
    dev.position.set(-1.6, 0, -0.5);
    group.add(dev);

    const zonePlaque = this.createSmallSign('WORK STATIONS');
    zonePlaque.position.set(0, 2.6, 0);
    group.add(zonePlaque);

    this.scene.add(group);
    this.registerInteractiveZone('workstation', new THREE.Vector3(5.5, 1, -2), new THREE.Vector3(6.5, 2.5, 4.5));
  }

  private buildDesignRoomZone() {
    const group = new THREE.Group();
    group.position.set(-5.5, 0, -2);

    const tableMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 2.0), tableMat);
    table.position.set(0, 0.85, 0);
    group.add(table);

    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 1.8), this.sharedMaterials['darkMetal']);
    leg1.position.set(-1.4, 0.425, 0);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 1.8), this.sharedMaterials['darkMetal']);
    leg2.position.set(1.4, 0.425, 0);
    group.add(leg1, leg2);

    // Optimized Whiteboard Canvas (256x128)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 236, 108);
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(20, 20, 50, 16);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('DESIGN ROOM • UI/UX', 80, 32);

    const uiTex = new THREE.CanvasTexture(canvas);
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 0.08), this.sharedMaterials['darkChair']);
    board.position.set(0, 1.9, -2.1);
    const uiScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), new THREE.MeshBasicMaterial({ map: uiTex }));
    uiScreen.position.set(0, 1.9, -2.04);
    group.add(board, uiScreen);

    const designer = this.createLowPolyHuman(0xdb2777, 0x374151);
    designer.position.set(0, 0, 1.3);
    designer.rotation.y = Math.PI;
    group.add(designer);

    this.scene.add(group);
    this.registerInteractiveZone('design', new THREE.Vector3(-5.5, 1, -2), new THREE.Vector3(6.5, 2.5, 4.5));
  }

  private buildMeetingRoomZone() {
    const group = new THREE.Group();
    group.position.set(-5, 0, -7.5);

    const table = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 1.8), this.sharedMaterials['darkChair']);
    table.position.set(0, 0.8, 0);
    group.add(table);

    const pGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
    const p1 = new THREE.Mesh(pGeo, this.sharedMaterials['chrome']);
    p1.position.set(-1.4, 0.4, 0);
    const p2 = new THREE.Mesh(pGeo, this.sharedMaterials['chrome']);
    p2.position.set(1.4, 0.4, 0);
    group.add(p1, p2);

    // 6 Chairs
    const chairZ = [-0.65, 0.65];
    const chairX = [-1.3, 0, 1.3];
    chairZ.forEach((zVal, zIdx) => {
      chairX.forEach((xVal) => {
        const chair = this.createOfficeChair(this.sharedMaterials['blueChair']);
        chair.position.set(xVal, 0, zVal * 1.5);
        chair.rotation.y = zIdx === 0 ? 0 : Math.PI;
        group.add(chair);
      });
    });

    // TV Presentation Screen
    const tvCanvas = document.createElement('canvas');
    tvCanvas.width = 256;
    tvCanvas.height = 128;
    const tvCtx = tvCanvas.getContext('2d')!;
    tvCtx.fillStyle = '#020617';
    tvCtx.fillRect(0, 0, 256, 128);
    tvCtx.fillStyle = '#10b981';
    tvCtx.font = 'bold 16px sans-serif';
    tvCtx.fillText('STRATEGY & GROWTH', 20, 25);
    const bars = [40, 60, 80, 110, 140];
    bars.forEach((h, idx) => {
      tvCtx.fillStyle = '#38bdf8';
      tvCtx.fillRect(30 + idx * 40, 110 - h * 0.5, 25, h * 0.5);
    });
    const tvTex = new THREE.CanvasTexture(tvCanvas);
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: tvTex }));
    tvScreen.position.set(0, 1.9, -3.7);
    group.add(tvScreen);

    const presenter = this.createLowPolyHuman(0x4338ca, 0x1f2937);
    presenter.position.set(-2.0, 0, -2.4);
    group.add(presenter);

    this.scene.add(group);
    this.registerInteractiveZone('meeting', new THREE.Vector3(-5, 1, -7.5), new THREE.Vector3(6, 2.5, 4.5));
  }

  private buildBossSuiteZone() {
    const group = new THREE.Group();
    group.position.set(5, 0, -7.5);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.85, 1.8), this.sharedMaterials['walnut']);
    desk.position.set(0, 0.425, 0);
    group.add(desk);

    // Laptop
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), this.sharedMaterials['chrome']);
    laptopBase.position.set(0, 0.86, 0.1);
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), this.sharedMaterials['chrome']);
    laptopScreen.position.set(0, 1.02, -0.06);
    laptopScreen.rotation.x = -0.2;
    group.add(laptopBase, laptopScreen);

    // Boss Chair
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.15), this.sharedMaterials['darkChair']);
    chairBack.position.set(0, 0.95, -1.2);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), this.sharedMaterials['darkChair']);
    chairSeat.position.set(0, 0.5, -0.9);
    group.add(chairBack, chairSeat);

    const boss = this.createLowPolyHuman(0x0f172a, 0x1e293b);
    boss.position.set(0, 0, -1.0);
    group.add(boss);

    // Bookshelf
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
    );
    shelf.position.set(0, 1.1, -3.4);
    group.add(shelf);

    // Desk Nameplate
    const npCanvas = document.createElement('canvas');
    npCanvas.width = 128;
    npCanvas.height = 32;
    const npCtx = npCanvas.getContext('2d')!;
    npCtx.fillStyle = '#f59e0b';
    npCtx.fillRect(0, 0, 128, 32);
    npCtx.fillStyle = '#1c1917';
    npCtx.font = 'bold 14px sans-serif';
    npCtx.textAlign = 'center';
    npCtx.textBaseline = 'middle';
    npCtx.fillText('FOUNDER & CEO', 64, 16);
    const npTex = new THREE.CanvasTexture(npCanvas);
    const npMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({ map: npTex }));
    npMesh.position.set(0.8, 0.95, 0.6);
    npMesh.rotation.x = -0.3;
    group.add(npMesh);

    this.scene.add(group);
    this.registerInteractiveZone('boss', new THREE.Vector3(5, 1, -7.5), new THREE.Vector3(6, 2.5, 4.5));
  }

  // Optimization 4: Instanced Courtyard Trees (Combined Draw Calls)
  private buildCourtyardTrees() {
    const treePositions = [
      [-9, 0, 11],
      [-9, 0, 8],
      [9, 0, 11],
      [9, 0, 8],
      [-3.5, 0, 5.5],
      [3.5, 0, 5.5],
    ];
    const count = treePositions.length;

    const planters = new THREE.InstancedMesh(
      this.sharedGeometries['treePlanter'],
      this.sharedMaterials['curb'],
      count
    );
    const trunks = new THREE.InstancedMesh(
      this.sharedGeometries['treeTrunk'],
      this.sharedMaterials['treeBark'],
      count
    );
    const canopies = new THREE.InstancedMesh(
      this.sharedGeometries['treeCanopy'],
      this.sharedMaterials['treeLeaf'],
      count
    );

    const dummy = new THREE.Object3D();

    treePositions.forEach(([x, y, z], i) => {
      // Planter
      dummy.position.set(x, y + 0.25, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      planters.setMatrixAt(i, dummy.matrix);

      // Trunk
      dummy.position.set(x, y + 1.1, z);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      // Canopy
      dummy.position.set(x, y + 2.3, z);
      dummy.scale.set(1.1, 1.3, 1.1);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    });

    planters.instanceMatrix.needsUpdate = true;
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;

    this.scene.add(planters, trunks, canopies);
  }

  // -------------------------------------------------------------
  // PROCEDURAL LOW-POLY HUMANOIDS & FURNITURE HELPERS
  // -------------------------------------------------------------
  private createLowPolyHuman(shirtColorHex: number, pantsColorHex: number): THREE.Group {
    const group = new THREE.Group();

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColorHex, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColorHex, roughness: 0.6 });

    const head = new THREE.Mesh(this.sharedGeometries['humanHead'], this.sharedMaterials['skin']);
    head.position.y = 1.62;

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), this.sharedMaterials['hair']);
    hair.position.y = 1.76;

    const torso = new THREE.Mesh(this.sharedGeometries['humanTorso'], shirtMat);
    torso.position.y = 1.15;

    const lLeg = new THREE.Mesh(this.sharedGeometries['humanLeg'], pantsMat);
    lLeg.position.set(-0.13, 0.42, 0);

    const rLeg = new THREE.Mesh(this.sharedGeometries['humanLeg'], pantsMat);
    rLeg.position.set(0.13, 0.42, 0);

    group.add(head, hair, torso, lLeg, rLeg);
    return group;
  }

  private initVisitor() {
    this.visitorGroup = new THREE.Group();
    this.visitorGroup.position.set(0, 0, 15.5);

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), this.sharedMaterials['skin']);
    head.position.y = 1.62;

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), this.sharedMaterials['hair']);
    hair.position.y = 1.77;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.28), shirtMat);
    torso.position.y = 1.15;

    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    armGeo.translate(0, -0.25, 0);
    this.visitorLeftArm = new THREE.Mesh(armGeo, shirtMat);
    this.visitorLeftArm.position.set(-0.34, 1.4, 0);

    this.visitorRightArm = new THREE.Mesh(armGeo, shirtMat);
    this.visitorRightArm.position.set(0.34, 1.4, 0);

    const legGeo = new THREE.BoxGeometry(0.18, 0.72, 0.2);
    legGeo.translate(0, -0.36, 0);
    this.visitorLeftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.visitorLeftLeg.position.set(-0.13, 0.75, 0);

    this.visitorRightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.visitorRightLeg.position.set(0.13, 0.75, 0);

    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.28), shoeMat);
    lShoe.position.set(0, -0.7, 0.04);
    this.visitorLeftLeg.add(lShoe);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.28), shoeMat);
    rShoe.position.set(0, -0.7, 0.04);
    this.visitorRightLeg.add(rShoe);

    // Badge
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 32;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    bCtx.fillRect(0, 0, 128, 32);
    bCtx.fillStyle = '#38bdf8';
    bCtx.font = 'bold 15px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('Visitor • You', 64, 16);
    const bTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), new THREE.MeshBasicMaterial({ map: bTex, transparent: true }));
    badgeMesh.position.set(0, 2.1, 0);

    this.visitorGroup.add(
      head,
      hair,
      torso,
      this.visitorLeftArm,
      this.visitorRightArm,
      this.visitorLeftLeg,
      this.visitorRightLeg,
      badgeMesh
    );

    this.scene.add(this.visitorGroup);
  }

  private createComputerMonitor(screenColor = 0x38bdf8): THREE.Group {
    const group = new THREE.Group();
    const frameMat = this.sharedMaterials['darkMetal'];

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), frameMat);
    stand.position.y = 0.15;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 8), frameMat);
    base.position.y = 0.01;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), frameMat);
    frame.position.y = 0.45;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.49), new THREE.MeshBasicMaterial({ color: screenColor }));
    screen.position.set(0, 0.45, 0.025);

    group.add(stand, base, frame, screen);
    return group;
  }

  private createOfficeChair(cushionMaterial: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    const cyl = new THREE.Mesh(this.sharedGeometries['chairCylinder'], this.sharedMaterials['chrome']);
    cyl.position.y = 0.225;

    const seat = new THREE.Mesh(this.sharedGeometries['chairSeat'], cushionMaterial);
    seat.position.y = 0.48;

    const back = new THREE.Mesh(this.sharedGeometries['chairBack'], cushionMaterial);
    back.position.set(0, 0.8, -0.26);

    group.add(cyl, seat, back);
    return group;
  }

  private createIndoorPlant(): THREE.Group {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(this.sharedGeometries['plantPot'], this.sharedMaterials['curb']);
    pot.position.y = 0.325;
    group.add(pot);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const leaf = new THREE.Mesh(this.sharedGeometries['plantLeaf'], this.sharedMaterials['treeLeaf']);
      leaf.scale.set(0.6, 1.8, 0.3);
      leaf.position.set(Math.cos(angle) * 0.22, 0.85 + (i % 2) * 0.1, Math.sin(angle) * 0.22);
      group.add(leaf);
    }
    return group;
  }

  private createSmallSign(text: string): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 16);
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: tex }));
  }

  private registerInteractiveZone(id: ZoneId, center: THREE.Vector3, size: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.userData = { zoneId: id };
    this.scene.add(mesh);

    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.interactiveZones.push({ id, mesh, box });
  }

  // -------------------------------------------------------------
  // DEMAND-BASED RENDERING TRIGGERS
  // -------------------------------------------------------------
  public requestRender(frames = 60) {
    this.renderDecayFrames = Math.max(this.renderDecayFrames, frames);
  }

  // -------------------------------------------------------------
  // VISITOR ANIMATION & WALKTHROUGH
  // -------------------------------------------------------------
  public walkVisitorTo(zoneId: ZoneId) {
    this.visitorTargetZone = zoneId;
    this.isVisitorMoving = true;
    this.visitorPathIndex = 0;
    this.requestRender(180);

    const current = this.visitorGroup.position.clone();
    const waypoints: THREE.Vector3[] = [];

    if (zoneId === 'street') {
      waypoints.push(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 15));
    } else if (zoneId === 'security') {
      waypoints.push(new THREE.Vector3(0, 0, 9));
    } else if (zoneId === 'reception') {
      waypoints.push(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 7), new THREE.Vector3(0, 0, 3.8));
    } else if (zoneId === 'workstation') {
      waypoints.push(new THREE.Vector3(0, 0, 7), new THREE.Vector3(0, 0, 2), new THREE.Vector3(4.5, 0, -1.5));
    } else if (zoneId === 'design') {
      waypoints.push(new THREE.Vector3(0, 0, 7), new THREE.Vector3(0, 0, 2), new THREE.Vector3(-4.5, 0, -1.5));
    } else if (zoneId === 'meeting') {
      waypoints.push(new THREE.Vector3(0, 0, 7), new THREE.Vector3(-4.5, 0, -2), new THREE.Vector3(-4.5, 0, -7));
    } else if (zoneId === 'boss') {
      waypoints.push(new THREE.Vector3(0, 0, 7), new THREE.Vector3(4.5, 0, -2), new THREE.Vector3(4.5, 0, -7));
    }

    this.visitorCurrentPath = [current, ...waypoints];

    if (zoneId !== 'street') {
      this.gateTargetX = 1.2;
      sounds.playGateOpen();
    } else {
      this.gateTargetX = 0;
    }
  }

  // -------------------------------------------------------------
  // CAMERA CONTROLS & ZONE TRANSITIONS
  // -------------------------------------------------------------
  public transitionToZone(zoneId: ZoneId, camPos: [number, number, number], targetPos: [number, number, number]) {
    this.activeZone = zoneId;
    this.targetCamPos.set(camPos[0], camPos[1], camPos[2]);
    this.targetLookAt.set(targetPos[0], targetPos[1], targetPos[2]);
    this.isAnimatingCamera = true;
    this.requestRender(120);
    sounds.playClick();

    this.walkVisitorTo(zoneId);
  }

  public zoomCamera(delta: number) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camera.position.addScaledVector(dir, delta * 3);
    this.controls.update();
    this.requestRender(45);
    sounds.playClick();
  }

  public resetView() {
    this.targetCamPos.set(14, 13, 25);
    this.targetLookAt.set(0, 1, 10);
    this.isAnimatingCamera = true;
    this.requestRender(120);
    sounds.playClick();
  }

  public setTimeOfDay(time: TimeOfDay) {
    if (time === 'day') {
      this.scene.background = new THREE.Color(0xf1f5f9);
      this.dirLight.color.setHex(0xfff6e5);
      this.dirLight.intensity = 1.8;
      this.ambientLight.intensity = this.currentQuality === 'low' ? 0.95 : 0.75;
      this.interiorLights.forEach((l) => (l.intensity = 0.8));
    } else if (time === 'sunset') {
      this.scene.background = new THREE.Color(0xfde68a);
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 2.0;
      this.ambientLight.intensity = this.currentQuality === 'low' ? 0.8 : 0.55;
      this.interiorLights.forEach((l) => (l.intensity = 1.2));
    } else if (time === 'night') {
      this.scene.background = new THREE.Color(0x090d16);
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.3;
      this.ambientLight.intensity = 0.25;
      this.interiorLights.forEach((l) => (l.intensity = 2.2));
    }
    this.requestRender(45);
  }

  // -------------------------------------------------------------
  // OPTIMIZED EVENT LISTENERS & THROTTLED RAYCASTING
  // -------------------------------------------------------------
  private setupEventListeners() {
    const dom = this.renderer.domElement;

    // Optimization 8: Throttled raycasting (Only run at most every 100ms on desktop; NEVER on mobile touch move)
    const onPointerMove = (e: MouseEvent) => {
      if (this.isMobile) return; // Skip raycasting during touch drags

      const now = performance.now();
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (now - this.lastRaycastTime < 100) {
        this.hasPendingPointerCheck = true;
        return;
      }
      this.lastRaycastTime = now;
      this.performRaycast();
    };

    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const objectsToTest = this.interactiveZones.map((z) => z.mesh);
      const hits = this.raycaster.intersectObjects(objectsToTest, false);

      if (hits.length > 0) {
        const zoneId = hits[0].object.userData.zoneId as ZoneId;
        this.callbacks.onZoneSelect(zoneId);
      }
      this.requestRender(45);
    };

    const onResize = () => {
      if (!this.container || this.isDisposed) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.requestRender(30);
    };

    // Optimization 7: Visibility Change Listener (Pause rendering and animation when tab is hidden)
    const onVisibilityChange = () => {
      this.isTabHidden = document.hidden;
      if (!document.hidden) {
        this.clock.getDelta(); // Clear delta so character doesn't jump
        this.requestRender(60);
      }
    };

    dom.addEventListener('mousemove', onPointerMove, { passive: true });
    dom.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  private performRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Raycast ONLY against the 7 low-poly bounding box triggers
    const objectsToTest = this.interactiveZones.map((z) => z.mesh);
    const hits = this.raycaster.intersectObjects(objectsToTest, false);

    const dom = this.renderer.domElement;
    if (hits.length > 0) {
      const found = hits[0].object.userData.zoneId as ZoneId;
      if (this.hoveredZone !== found) {
        this.hoveredZone = found;
        dom.style.cursor = 'pointer';
        this.requestRender(15);
      }
    } else {
      if (this.hoveredZone !== null) {
        this.hoveredZone = null;
        dom.style.cursor = 'default';
        this.requestRender(15);
      }
    }
  }

  // -------------------------------------------------------------
  // ANIMATION LOOP & DEMAND-BASED RENDERING
  // -------------------------------------------------------------
  private startRenderLoop() {
    const animate = () => {
      if (this.isDisposed) return;
      this.animationFrameId = requestAnimationFrame(animate);

      // Optimization 7: Stop execution completely when tab is hidden
      if (this.isTabHidden) return;

      const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to avoid animation spikes

      // Check throttled raycast
      if (this.hasPendingPointerCheck && performance.now() - this.lastRaycastTime >= 100) {
        this.hasPendingPointerCheck = false;
        this.lastRaycastTime = performance.now();
        this.performRaycast();
      }

      // Smooth camera interpolation
      if (this.isAnimatingCamera) {
        this.camera.position.lerp(this.targetCamPos, 0.06);
        this.controls.target.lerp(this.targetLookAt, 0.06);

        if (
          this.camera.position.distanceTo(this.targetCamPos) < 0.08 &&
          this.controls.target.distanceTo(this.targetLookAt) < 0.08
        ) {
          this.isAnimatingCamera = false;
        }
      }

      // Gate opening animation
      const gateDiff = Math.abs(this.securityGateLeft.position.x - (-0.9 - this.gateTargetX));
      const isGateMoving = gateDiff > 0.01;
      if (isGateMoving && this.securityGateLeft && this.securityGateRight) {
        this.securityGateLeft.position.x = THREE.MathUtils.damp(
          this.securityGateLeft.position.x,
          -0.9 - this.gateTargetX,
          5,
          delta
        );
        this.securityGateRight.position.x = THREE.MathUtils.damp(
          this.securityGateRight.position.x,
          0.9 + this.gateTargetX,
          5,
          delta
        );
      }

      // Visitor walk animation along path
      if (this.isVisitorMoving && this.visitorCurrentPath.length > 1) {
        this.walkTime += delta * 8.5;

        // Swing legs & arms
        const legAngle = Math.sin(this.walkTime) * 0.55;
        this.visitorLeftLeg.rotation.x = legAngle;
        this.visitorRightLeg.rotation.x = -legAngle;
        this.visitorLeftArm.rotation.x = -legAngle * 0.8;
        this.visitorRightArm.rotation.x = legAngle * 0.8;

        if (Math.abs(Math.sin(this.walkTime)) > 0.95) {
          sounds.playFootstep();
        }

        const targetWp = this.visitorCurrentPath[this.visitorPathIndex + 1];
        if (targetWp) {
          const vPos = this.visitorGroup.position;
          const dist = vPos.distanceTo(targetWp);

          const dir = new THREE.Vector3().subVectors(targetWp, vPos).normalize();
          if (dir.lengthSq() > 0.001) {
            const angle = Math.atan2(dir.x, dir.z);
            this.visitorGroup.rotation.y = angle;
          }

          vPos.addScaledVector(dir, delta * 3.5);

          if (dist < 0.35) {
            this.visitorPathIndex++;
            if (this.visitorPathIndex >= this.visitorCurrentPath.length - 1) {
              this.isVisitorMoving = false;
              this.visitorLeftLeg.rotation.x = 0;
              this.visitorRightLeg.rotation.x = 0;
              this.visitorLeftArm.rotation.x = 0;
              this.visitorRightArm.rotation.x = 0;

              if (this.visitorTargetZone) {
                sounds.playChime();
                this.callbacks.onVisitorArrived?.(this.visitorTargetZone);
              }
            }
          }
        }
      }

      // Controls update with damping
      this.controls.update();

      // Optimization 6: Demand-based rendering
      // If nothing is animating, no visitor moving, gate finished, and decay frames expired: SKIP RENDER!
      const isActivelyMoving =
        this.isAnimatingCamera ||
        this.isVisitorMoving ||
        isGateMoving ||
        this.renderDecayFrames > 0;

      if (isActivelyMoving) {
        if (this.renderDecayFrames > 0) {
          this.renderDecayFrames--;
        }
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  // -------------------------------------------------------------
  // CLEAN DISPOSAL
  // -------------------------------------------------------------
  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dispose shared geometries & materials
    Object.values(this.sharedGeometries).forEach((g) => g.dispose());
    Object.values(this.sharedMaterials).forEach((m) => m.dispose());

    if (this.domainTexture) this.domainTexture.dispose();

    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
