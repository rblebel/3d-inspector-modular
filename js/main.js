/**
 * 3D INSPECTOR - MAIN APPLICATION ENTRY POINT
 * 
 * This is the main entry point for the modular 3D Inspector application.
 * It imports and orchestrates all core modules to provide a comprehensive
 * 3D inspection and measurement platform.
 * 
 * Features:
 * - Modular ES6 architecture with clean separation of concerns
 * - Professional 3D model viewing with THREE.js
 * - Advanced measurement tools with real-time calculations
 * - Point-based discrepancy annotation system
 * - Comprehensive export capabilities
 * - Production-ready performance optimizations
 */

import * as THREE from 'three';

// Import all core modules
import { SceneManager } from './scene.js';
import { ControlsManager } from './controls.js';
import { ModelLoader } from './modelLoader.js';
import { MeasurementSystem } from './measurement.js';
import { AnnotationSystem } from './annotation.js';
import { ReferenceSystem } from './reference.js';
import { HIMPSystem } from './himp.js';
import { ExportManager } from './export.js';
import { UIManager } from './ui.js';
import { LightingSystem } from './lighting.js';
import { Utils } from './utils.js';

class Inspector3D {
  constructor() {
    this.initialized = false;
    this.config = {
      objUrl: "20250723T133009Z_dorm.obj",
      mtlUrl: "20250723T133027Z_dorm.mtl",
      defaultUnits: 'm',
      // Fallback to demo mode if model files don't exist
      demoMode: true
    };
    
    // Core systems
    this.scene = null;
    this.controls = null;
    this.modelLoader = null;
    this.measurement = null;
    this.annotation = null;
    this.reference = null;
    this.himp = null;
    this.export = null;
    this.ui = null;
    this.lighting = null;
    
    // State
    this.loadedModel = null;
    this.currentMode = 'view'; // 'view', 'measure', 'annotate'
  }

  /**
   * Initialize the entire application
   */
  async init() {
    try {
      console.log('🚀 Initializing 3D Inspector...');
      
      // Initialize core scene components
      this.scene = new SceneManager();
      await this.scene.init();
      
      this.controls = new ControlsManager(this.scene.camera, this.scene.renderer.domElement);
      await this.controls.init();
      
      // Initialize lighting system
      this.lighting = new LightingSystem(this.scene.scene, this.scene.renderer);
      await this.lighting.init();
      
      // Initialize model loader
      this.modelLoader = new ModelLoader(this.scene.scene);
      
      // Initialize measurement system
      this.measurement = new MeasurementSystem(
        this.scene.scene, 
        this.scene.camera, 
        this.scene.renderer
      );
      await this.measurement.init();
      
      // Initialize annotation system
      this.annotation = new AnnotationSystem(
        this.scene.scene, 
        this.scene.camera, 
        this.scene.renderer
      );
      await this.annotation.init();
      
      // Initialize reference system
      this.reference = new ReferenceSystem(
        this.scene.scene, 
        this.scene.camera, 
        this.scene.renderer
      );
      await this.reference.init();
      
      // Initialize HIMP assessment system
      this.himp = new HIMPSystem(
        this.scene.scene, 
        this.scene.camera, 
        this.scene.renderer
      );
      await this.himp.init();
      
      // Initialize export manager
      this.export = new ExportManager(this.measurement, this.annotation, this.lighting, this.reference, this.himp);
      
      // Initialize UI manager
      this.ui = new UIManager();
      await this.ui.init();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Load the default model
      await this.loadDefaultModel();
      
      // Start the render loop
      this.startRenderLoop();
      
      this.initialized = true;
      console.log('✅ 3D Inspector initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize 3D Inspector:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  }

  /**
   * Set up event handlers for UI interactions
   */
  setupEventHandlers() {
    // Toolbar button handlers
    document.getElementById('sceneBtn').addEventListener('click', () => {
      this.ui.toggleToolsPanel();
    });
    
    document.getElementById('measureBtn').addEventListener('click', () => {
      this.toggleMeasurementMode();
    });
    
    document.getElementById('annotateBtn').addEventListener('click', () => {
      this.toggleAnnotationMode();
    });
    
    document.getElementById('referenceBtn').addEventListener('click', () => {
      this.toggleReferenceMode();
    });
    
    document.getElementById('himpBtn').addEventListener('click', () => {
      this.toggleHimpMode();
    });
    
    document.getElementById('wireBtn').addEventListener('click', () => {
      this.toggleWireframe();
    });
    
    document.getElementById('screenshotBtn').addEventListener('click', () => {
      this.takeScreenshot();
    });
    
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetView();
    });
    
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelp();
    });

    // Settings handlers
    document.getElementById('mesh-units').addEventListener('change', (e) => {
      this.setMeshUnits(e.target.value);
    });

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Window resize handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Click outside to close panels
    document.addEventListener('mousedown', (e) => {
      this.handleClickOutside(e);
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    console.log('🎹 Setting up keyboard shortcuts...');
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+R: Open Reference Manager
            e.preventDefault();
            if (this.reference) {
              this.reference.showReferenceManager();
            }
          } else {
            // R: Reset View
            e.preventDefault();
            this.resetView();
          }
          break;
        case 'w':
          e.preventDefault();
          this.toggleWireframe();
          break;
        case 'l':
          if (this.currentMode === 'measure') {
            e.preventDefault();
            this.measurement.toggleLabels();
          }
          break;
        case 'c':
          if (this.currentMode === 'measure') {
            e.preventDefault();
            this.measurement.closeMeasurement();
          }
          break;
        case 'n':
          if (this.currentMode === 'measure') {
            e.preventDefault();
            this.measurement.createNewMeasurement();
          }
          break;
        case 'escape':
          e.preventDefault();
          this.handleEscape();
          break;
        case 'h':
        case '?':
          e.preventDefault();
          this.showHelp();
          break;
        default:
          // Handle number keys for measurement switching
          if (this.currentMode === 'measure' && /^[1-9]$/.test(e.key)) {
            e.preventDefault();
            this.measurement.switchToMeasurement(parseInt(e.key) - 1);
          }
          break;
      }
    });
  }

  /**
   * Load the default 3D model
   */
  async loadDefaultModel() {
    try {
      console.log('📦 Loading default model...');
      this.ui.showLoadingIndicator(true);
      
      // Try to load the actual model first
      try {
        this.loadedModel = await this.modelLoader.loadModel(
          this.config.objUrl, 
          this.config.mtlUrl
        );
      } catch (modelError) {
        console.warn('⚠️ Could not load model files, creating demo scene:', modelError.message);
        // Create a demo scene with basic geometry
        this.loadedModel = this.createDemoScene();
      }
      
      // Fit camera to model
      this.controls.fitCameraToObject(this.loadedModel);
      
      this.ui.showLoadingIndicator(false);
      console.log('✅ Model loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      this.ui.showLoadingIndicator(false);
      this.showError('Failed to load 3D model: ' + error.message);
    }
  }

  /**
   * Create a demo scene with basic geometry for testing
   */
  createDemoScene() {
    const group = new THREE.Group();
    group.name = 'DemoScene';
    
    // Create a simple building-like structure
    const buildingGeometry = new THREE.BoxGeometry(4, 3, 6);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8888aa });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 1.5;
    group.add(building);
    
    // Add a roof
    const roofGeometry = new THREE.ConeGeometry(3.5, 1, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x884444 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3.5;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    
    // Add some detail geometry
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2);
    const cylinderMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(1.5, 2, 2);
    group.add(cylinder);
    
    // Add a ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    group.add(ground);
    
    // Set userData for model identification
    group.userData.modelId = 'demo-scene';
    
    // Register materials with modelLoader for wireframe toggle
    this.modelLoader.processModel(group);
    
    // Add to scene
    this.scene.addObject(group);
    
    console.log('🏗️ Demo scene created');
    return group;
  }

  /**
   * Toggle measurement mode
   */
  toggleMeasurementMode() {
    if (this.currentMode === 'measure') {
      this.currentMode = 'view';
      this.measurement.deactivate();
      this.ui.setButtonActive('measureBtn', false);
    } else {
      this.currentMode = 'measure';
      this.annotation.deactivate();
      this.reference.deactivate();
      this.himp.deactivate();
      this.measurement.activate();
      this.ui.setButtonActive('measureBtn', true);
      this.ui.setButtonActive('annotateBtn', false);
      this.ui.setButtonActive('referenceBtn', false);
      this.ui.setButtonActive('himpBtn', false);
    }
  }

  /**
   * Toggle annotation mode
   */
  toggleAnnotationMode() {
    if (this.currentMode === 'annotate') {
      this.currentMode = 'view';
      this.annotation.deactivate();
      this.ui.setButtonActive('annotateBtn', false);
    } else {
      this.currentMode = 'annotate';
      this.measurement.deactivate();
      this.reference.deactivate();
      this.himp.deactivate();
      this.annotation.activate();
      this.ui.setButtonActive('annotateBtn', true);
      this.ui.setButtonActive('measureBtn', false);
      this.ui.setButtonActive('referenceBtn', false);
      this.ui.setButtonActive('himpBtn', false);
    }
  }

  /**
   * Toggle reference point mode
   */
  toggleReferenceMode() {
    if (this.currentMode === 'reference') {
      this.currentMode = 'view';
      this.reference.deactivate();
      this.ui.setButtonActive('referenceBtn', false);
    } else {
      this.currentMode = 'reference';
      this.measurement.deactivate();
      this.annotation.deactivate();
      this.himp.deactivate();
      this.reference.activate();
      this.ui.setButtonActive('referenceBtn', true);
      this.ui.setButtonActive('measureBtn', false);
      this.ui.setButtonActive('annotateBtn', false);
      this.ui.setButtonActive('himpBtn', false);
    }
  }

  /**
   * Toggle HIMP assessment mode
   */
  toggleHimpMode() {
    if (this.currentMode === 'himp') {
      this.currentMode = 'view';
      this.himp.deactivate();
      this.ui.setButtonActive('himpBtn', false);
    } else {
      this.currentMode = 'himp';
      this.measurement.deactivate();
      this.annotation.deactivate();
      this.reference.deactivate();
      this.himp.activate();
      this.ui.setButtonActive('himpBtn', true);
      this.ui.setButtonActive('measureBtn', false);
      this.ui.setButtonActive('annotateBtn', false);
      this.ui.setButtonActive('referenceBtn', false);
    }
  }

  /**
   * Toggle wireframe mode
   */
  toggleWireframe() {
    console.log('🔲 Wireframe toggle clicked');
    console.log('Loaded model:', this.loadedModel);
    
    if (this.loadedModel) {
      console.log('Calling modelLoader.toggleWireframe...');
      this.modelLoader.toggleWireframe(this.loadedModel);
      this.ui.toggleButtonState('wireBtn');
    } else {
      console.warn('❌ No loaded model for wireframe toggle');
    }
  }

  /**
   * Take a screenshot
   */
  takeScreenshot() {
    try {
      const canvas = this.scene.renderer.domElement;
      const link = document.createElement('a');
      link.download = `3d-inspector-screenshot-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      console.log('📷 Screenshot saved');
    } catch (error) {
      console.error('❌ Failed to take screenshot:', error);
      this.showError('Failed to take screenshot');
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Reset camera view
   */
  resetView() {
    if (this.loadedModel) {
      this.controls.fitCameraToObject(this.loadedModel);
      console.log('🏠 View reset');
    }
  }

  /**
   * Export measurement and annotation data
   */
  exportData() {
    try {
      const data = this.export.generateReport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.download = `inspection-report-${Date.now()}.json`;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      console.log('💾 Data exported successfully');
      this.ui.showMessage('Inspection report exported successfully!');
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      this.showError('Failed to export data');
    }
  }

  /**
   * Show help modal with keyboard shortcuts
   */
  showHelp() {
    this.ui.showHelp();
  }

  /**
   * Set mesh units for measurements
   */
  setMeshUnits(units) {
    Utils.setMeshUnits(units);
    this.measurement.updateUnits(units);
    this.annotation.updateUnits(units);
    console.log(`📏 Mesh units set to: ${units}`);
  }

  /**
   * Handle escape key
   */
  handleEscape() {
    // Close any open modals
    this.ui.closeAllModals();
    
    // Clear current operations
    if (this.currentMode === 'measure') {
      this.measurement.clearCurrent();
    } else if (this.currentMode === 'annotate') {
      this.annotation.clearCurrent();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    this.scene.handleResize();
    this.measurement.handleResize();
    this.annotation.handleResize();
  }

  /**
   * Handle clicks outside of panels
   */
  handleClickOutside(e) {
    const toolsPanel = document.getElementById('tools-panel');
    const sceneBtn = document.getElementById('sceneBtn');
    
    if (!toolsPanel.contains(e.target) && e.target !== sceneBtn) {
      toolsPanel.classList.remove('active');
    }
  }

  /**
   * Start the main render loop
   */
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      this.controls.update();
      
      // Update measurement system
      if (this.measurement) {
        this.measurement.update();
      }
      
      // Update annotation system
      if (this.annotation) {
        this.annotation.update();
      }
      
      // Update reference system
      if (this.reference) {
        this.reference.updateLabelPositions();
      }
      
      // Update HIMP system
      if (this.himp) {
        this.himp.updateLabelPositions();
      }
      
      // Render the scene
      this.scene.render();
    };
    
    animate();
    console.log('🔄 Render loop started');
  }

  /**
   * Show error message to user
   */
  showError(message) {
    console.error('Error:', message);
    alert('Error: ' + message); // TODO: Replace with better error UI
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const app = new Inspector3D();
  await app.init();
  
  // Make app globally available for debugging
  window.inspector3D = app;
});

export { Inspector3D };
