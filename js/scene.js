/**
 * SCENE.JS - THREE.js Scene, Camera, and Renderer Management
 * 
 * Responsible for:
 * - THREE.js scene initialization and configuration
 * - Camera setup and management
 * - WebGL renderer configuration with optimizations
 * - Lighting setup (ambient, directional, hemisphere)
 * - Scene background and environment settings
 * - Render loop management and performance optimization
 */

import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.lights = {
      hemisphere: null,
      ambient: null,
      directional: null
    };
    
    // Performance tracking
    this.frameCount = 0;
    this.lastCameraPosition = new THREE.Vector3();
    this.lastCameraRotation = new THREE.Euler();
  }

  /**
   * Initialize the THREE.js scene, camera, and renderer
   */
  async init() {
    console.log('🎬 Initializing scene manager...');
    
    try {
      this.createScene();
      this.createCamera();
      this.createRenderer();
      this.setupLighting();
      this.setupBackground();
      
      console.log('✅ Scene manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize scene manager:', error);
      throw error;
    }
  }

  /**
   * Create the THREE.js scene
   */
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.name = 'Inspector3D-Scene';
    
    // Enable fog for depth perception (optional)
    // this.scene.fog = new THREE.Fog(0xf4f6fa, 10, 200);
    
    console.log('📋 Scene created');
  }

  /**
   * Create and configure the camera
   */
  createCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    
    // Set default camera position
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 0, 0);
    
    // Store initial camera state for performance tracking
    this.lastCameraPosition.copy(this.camera.position);
    this.lastCameraRotation.copy(this.camera.rotation);
    
    console.log('📹 Camera created');
  }

  /**
   * Create and configure the WebGL renderer
   */
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // Required for screenshots
      alpha: false,
      powerPreference: "high-performance"
    });
    
    // Set renderer properties
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
    this.renderer.setClearColor(0xf4f6fa, 1);
    
    // Enable shadows if needed
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Output encoding for better color reproduction
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Append to canvas container
    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }
    
    console.log('🖥️ Renderer created and attached to DOM');
  }

  /**
   * Set up scene lighting
   */
  setupLighting() {
    // Hemisphere light for natural ambient lighting
    this.lights.hemisphere = new THREE.HemisphereLight(0xffffff, 0x888888, 1.2);
    this.lights.hemisphere.name = 'HemisphereLight';
    this.scene.add(this.lights.hemisphere);
    
    // Ambient light for base illumination
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.lights.ambient.name = 'AmbientLight';
    this.scene.add(this.lights.ambient);
    
    // Directional light for shadows and definition
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.2);
    this.lights.directional.position.set(10, 10, 5);
    this.lights.directional.name = 'DirectionalLight';
    
    // Configure shadows for directional light
    this.lights.directional.castShadow = true;
    this.lights.directional.shadow.mapSize.width = 2048;
    this.lights.directional.shadow.mapSize.height = 2048;
    this.lights.directional.shadow.camera.near = 0.5;
    this.lights.directional.shadow.camera.far = 50;
    this.lights.directional.shadow.camera.left = -10;
    this.lights.directional.shadow.camera.right = 10;
    this.lights.directional.shadow.camera.top = 10;
    this.lights.directional.shadow.camera.bottom = -10;
    
    this.scene.add(this.lights.directional);
    
    console.log('💡 Lighting setup complete');
  }

  /**
   * Set up scene background
   */
  setupBackground() {
    // Set background color to match CSS
    this.renderer.setClearColor(0xf4f6fa, 1);
    
    // Optional: Add environment map or skybox here
    // const loader = new THREE.CubeTextureLoader();
    // const envMap = loader.load([...]);
    // this.scene.background = envMap;
    
    console.log('🌅 Background configured');
  }

  /**
   * Update lighting intensity
   */
  updateLightIntensity(intensity) {
    if (this.lights.hemisphere) {
      this.lights.hemisphere.intensity = intensity;
    }
    console.log(`💡 Light intensity updated to: ${intensity}`);
  }

  /**
   * Update scene background color
   */
  updateBackgroundColor(color) {
    if (typeof color === 'string') {
      color = parseInt(color.replace('#', '0x'));
    }
    this.renderer.setClearColor(color, 1);
    console.log(`🎨 Background color updated to: ${color.toString(16)}`);
  }

  /**
   * Update tone mapping exposure
   */
  updateExposure(exposure) {
    this.renderer.toneMappingExposure = exposure;
    console.log(`🔆 Exposure updated to: ${exposure}`);
  }

  /**
   * Update gamma correction (contrast)
   */
  updateGamma(gamma) {
    // Note: In newer THREE.js versions, gamma is handled differently
    // This is a placeholder for gamma/contrast adjustments
    console.log(`🎚️ Gamma updated to: ${gamma}`);
  }

  /**
   * Add object to scene
   */
  addObject(object) {
    this.scene.add(object);
    console.log(`➕ Object added to scene: ${object.name || 'unnamed'}`);
  }

  /**
   * Remove object from scene
   */
  removeObject(object) {
    this.scene.remove(object);
    console.log(`➖ Object removed from scene: ${object.name || 'unnamed'}`);
  }

  /**
   * Clear all objects from scene (except lights)
   */
  clearScene() {
    const objectsToRemove = [];
    
    this.scene.traverse((child) => {
      if (child !== this.scene && 
          !child.isLight && 
          child.type !== 'HemisphereLight' && 
          child.type !== 'AmbientLight' && 
          child.type !== 'DirectionalLight') {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
      // Dispose of geometry and materials to prevent memory leaks
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    
    console.log(`🧹 Scene cleared: ${objectsToRemove.length} objects removed`);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(width, height);
    
    console.log(`📐 Scene resized to: ${width}x${height}`);
  }

  /**
   * Check if camera has moved (for performance optimization)
   */
  hasCameraMoved() {
    const currentPos = this.camera.position;
    const currentRot = this.camera.rotation;
    
    const positionChanged = !currentPos.equals(this.lastCameraPosition);
    const rotationChanged = !currentRot.equals(this.lastCameraRotation);
    
    if (positionChanged || rotationChanged) {
      this.lastCameraPosition.copy(currentPos);
      this.lastCameraRotation.copy(currentRot);
      return true;
    }
    
    return false;
  }

  /**
   * Render the scene
   */
  render() {
    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
  }

  /**
   * Get scene statistics
   */
  getStats() {
    const info = this.renderer.info;
    return {
      frameCount: this.frameCount,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      materials: info.memory.materials,
      programs: info.programs.length,
      calls: info.render.calls
    };
  }

  /**
   * Dispose of resources
   */
  dispose() {
    console.log('🗑️ Disposing scene manager resources...');
    
    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    
    // Clear scene
    this.clearScene();
    
    // Reset references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.lights = {};
    
    console.log('✅ Scene manager disposed');
  }
}
