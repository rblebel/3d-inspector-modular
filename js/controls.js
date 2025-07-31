/**
 * CONTROLS.JS - Camera Controls and User Interaction Management
 * 
 * Responsible for:
 * - OrbitControls setup and configuration
 * - Camera movement and interaction handling
 * - Mouse and touch event management
 * - Camera animation and smooth transitions
 * - Auto-fit camera to objects functionality
 * - Interaction state management (enable/disable controls)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ControlsManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.controls = null;
    
    // Control state
    this.enabled = true;
    this.autoRotate = false;
    this.dampingEnabled = true;
    
    // Camera animation
    this.isAnimating = false;
    this.animationId = null;
  }

  /**
   * Initialize OrbitControls
   */
  async init() {
    console.log('🎮 Initializing controls manager...');
    
    try {
      // Create OrbitControls instance
      this.controls = new OrbitControls(this.camera, this.domElement);
      
      this.setupControls();
      this.setupEventListeners();
      
      console.log('✅ Controls manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize controls manager:', error);
      throw error;
    }
  }

  /**
   * Set up OrbitControls configuration
   */
  setupControls() {
    // Basic controls settings
    this.controls.enableDamping = this.dampingEnabled;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false; // Keep panning in world space
    
    // Zoom settings
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 500;
    
    // Rotation settings
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 1.0;
    this.controls.minPolarAngle = 0; // radians
    this.controls.maxPolarAngle = Math.PI; // radians
    
    // Pan settings
    this.controls.enablePan = true;
    this.controls.panSpeed = 1.0;
    this.controls.keyPanSpeed = 7.0;
    
    // Auto rotate
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 2.0;
    
    // Key controls
    this.controls.keys = {
      LEFT: 'ArrowLeft',   // left arrow
      UP: 'ArrowUp',       // up arrow
      RIGHT: 'ArrowRight', // right arrow
      BOTTOM: 'ArrowDown'  // down arrow
    };
    
    // Mouse buttons
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Touch controls
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    console.log('⚙️ OrbitControls configured');
  }

  /**
   * Set up event listeners for control events
   */
  setupEventListeners() {
    // Control events
    this.controls.addEventListener('start', () => {
      console.log('🎮 Controls interaction started');
    });
    
    this.controls.addEventListener('change', () => {
      // Camera position/rotation changed
      // This event fires frequently during interaction
    });
    
    this.controls.addEventListener('end', () => {
      console.log('🎮 Controls interaction ended');
    });
    
    console.log('👂 Control event listeners attached');
  }

  /**
   * Update controls (call this in the render loop)
   */
  update() {
    if (this.controls && this.enabled) {
      this.controls.update();
    }
  }

  /**
   * Enable or disable controls
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.controls) {
      this.controls.enabled = enabled;
    }
    console.log(`🎮 Controls ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable specific control types
   */
  setControlTypes(options) {
    if (!this.controls) return;
    
    if (options.rotate !== undefined) {
      this.controls.enableRotate = options.rotate;
    }
    if (options.zoom !== undefined) {
      this.controls.enableZoom = options.zoom;
    }
    if (options.pan !== undefined) {
      this.controls.enablePan = options.pan;
    }
    
    console.log('🎮 Control types updated:', options);
  }

  /**
   * Set auto-rotate mode
   */
  setAutoRotate(enabled, speed = 2.0) {
    this.autoRotate = enabled;
    if (this.controls) {
      this.controls.autoRotate = enabled;
      this.controls.autoRotateSpeed = speed;
    }
    console.log(`🔄 Auto-rotate ${enabled ? 'enabled' : 'disabled'} (speed: ${speed})`);
  }

  /**
   * Set damping (smooth camera movement)
   */
  setDamping(enabled, factor = 0.05) {
    this.dampingEnabled = enabled;
    if (this.controls) {
      this.controls.enableDamping = enabled;
      this.controls.dampingFactor = factor;
    }
    console.log(`🎯 Damping ${enabled ? 'enabled' : 'disabled'} (factor: ${factor})`);
  }

  /**
   * Fit camera to show entire object
   */
  fitCameraToObject(object, offset = 1.5) {
    if (!object) {
      console.warn('⚠️ No object provided to fit camera');
      return;
    }

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Update controls target to center of object
    this.controls.target.copy(center);
    
    // Calculate optimal camera distance
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * offset;
    
    // Update camera near/far planes based on object size
    this.camera.near = size.length() / 100;
    this.camera.far = size.length() * 100;
    this.camera.updateProjectionMatrix();
    
    // Position camera at optimal distance
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, center)
      .normalize()
      .multiplyScalar(distance);
    
    this.camera.position.copy(center).add(direction);
    this.camera.lookAt(center);
    
    // Update controls
    this.controls.update();
    
    console.log(`📏 Camera fitted to object (size: ${size.length().toFixed(2)}, distance: ${distance.toFixed(2)})`);
  }

  /**
   * Animate camera to specific position and target
   */
  animateTo(position, target, duration = 1000) {
    if (this.isAnimating) {
      this.stopAnimation();
    }

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = position.clone();
    const endTarget = target.clone();
    
    const startTime = performance.now();
    this.isAnimating = true;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      
      this.controls.update();
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationId = null;
        console.log('📹 Camera animation completed');
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
    console.log('📹 Camera animation started');
  }

  /**
   * Stop current camera animation
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.isAnimating = false;
      console.log('⏹️ Camera animation stopped');
    }
  }

  /**
   * Save current camera state
   */
  saveState() {
    const state = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      zoom: this.camera.zoom
    };
    console.log('💾 Camera state saved');
    return state;
  }

  /**
   * Restore camera state
   */
  restoreState(state, animate = false) {
    if (animate) {
      this.animateTo(state.position, state.target);
    } else {
      this.camera.position.copy(state.position);
      this.controls.target.copy(state.target);
      if (state.zoom !== undefined) {
        this.camera.zoom = state.zoom;
        this.camera.updateProjectionMatrix();
      }
      this.controls.update();
    }
    console.log('📂 Camera state restored');
  }

  /**
   * Reset camera to default position
   */
  reset() {
    this.camera.position.set(5, 3, 5);
    this.controls.target.set(0, 0, 0);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    console.log('🔄 Camera reset to default position');
  }

  /**
   * Get current camera information
   */
  getCameraInfo() {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      zoom: this.camera.zoom,
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far
    };
  }

  /**
   * Set camera field of view
   */
  setFOV(fov) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    console.log(`📐 Camera FOV set to: ${fov}°`);
  }

  /**
   * Set camera clipping planes
   */
  setClippingPlanes(near, far) {
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
    console.log(`✂️ Camera clipping planes set: near=${near}, far=${far}`);
  }

  /**
   * Convert screen coordinates to world position on a plane
   */
  screenToWorld(screenX, screenY, planeNormal = new THREE.Vector3(0, 1, 0), planeConstant = 0) {
    const mouse = new THREE.Vector2();
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const plane = new THREE.Plane(planeNormal, planeConstant);
    const intersection = new THREE.Vector3();
    
    raycaster.ray.intersectPlane(plane, intersection);
    return intersection;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    console.log('🗑️ Disposing controls manager...');
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    this.controls = null;
    this.camera = null;
    this.domElement = null;
    
    console.log('✅ Controls manager disposed');
  }
}
