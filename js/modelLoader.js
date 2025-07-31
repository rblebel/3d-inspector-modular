/**
 * MODELLOADER.JS - 3D Model Loading and Management
 * 
 * Responsible for:
 * - OBJ/MTL model loading with graceful fallback handling
 * - Model processing and optimization
 * - Material management and wireframe toggling
 * - Model positioning and scaling
 * - Error handling and loading progress
 * - Memory management and disposal
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Utils } from './utils.js';

export class ModelLoader {
  constructor(scene) {
    this.scene = scene;
    this.loadedModels = new Map(); // Track loaded models
    this.originalMaterials = new Map(); // Store original materials for wireframe toggle
    this.loadingProgress = 0;
    
    // Loaders
    this.objLoader = new OBJLoader();
    this.mtlLoader = new MTLLoader();
  }

  /**
   * Load a 3D model (OBJ with optional MTL)
   */
  async loadModel(objUrl, mtlUrl = null) {
    console.log(`📦 Loading model: ${objUrl}`);
    const startTime = Utils.now();
    
    try {
      let model = null;
      
      if (mtlUrl) {
        // Try loading with materials first
        model = await this.loadWithMaterials(objUrl, mtlUrl);
      } else {
        // Load OBJ without materials
        model = await this.loadObjOnly(objUrl);
      }
      
      // Process the loaded model
      this.processModel(model);
      
      // Add to scene
      this.scene.add(model);
      
      // Store model reference
      const modelId = Utils.generateId('model');
      this.loadedModels.set(modelId, model);
      model.userData.modelId = modelId;
      
      Utils.logTiming('Model loading', startTime);
      console.log('✅ Model loaded successfully');
      
      return model;
      
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Load OBJ with MTL materials
   */
  async loadWithMaterials(objUrl, mtlUrl) {
    return new Promise((resolve, reject) => {
      console.log(`🎨 Loading materials: ${mtlUrl}`);
      
      this.mtlLoader.load(
        mtlUrl,
        // Materials loaded successfully
        (materials) => {
          console.log('✅ Materials loaded');
          materials.preload();
          
          // Configure OBJ loader with materials
          this.objLoader.setMaterials(materials);
          
          // Load OBJ file
          console.log(`🏗️ Loading geometry: ${objUrl}`);
          this.objLoader.load(
            objUrl,
            // OBJ loaded successfully
            (object) => {
              console.log('✅ Geometry loaded with materials');
              resolve(object);
            },
            // Progress callback
            (progress) => {
              this.updateProgress(progress);
            },
            // Error callback
            (error) => {
              console.error('❌ Error loading OBJ with materials:', error);
              // Fallback to loading without materials
              console.log('🔄 Falling back to loading without materials...');
              this.loadObjOnly(objUrl)
                .then(resolve)
                .catch(reject);
            }
          );
        },
        // MTL progress callback
        (progress) => {
          this.updateProgress(progress);
        },
        // MTL error callback
        (error) => {
          console.error('❌ Error loading materials:', error);
          console.log('🔄 Falling back to loading without materials...');
          // Fallback to loading without materials
          this.loadObjOnly(objUrl)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  }

  /**
   * Load OBJ without materials
   */
  async loadObjOnly(objUrl) {
    return new Promise((resolve, reject) => {
      console.log(`🏗️ Loading geometry only: ${objUrl}`);
      
      this.objLoader.load(
        objUrl,
        // Success callback
        (object) => {
          console.log('✅ Geometry loaded without materials');
          
          // Apply default materials if none exist
          this.applyDefaultMaterials(object);
          
          resolve(object);
        },
        // Progress callback
        (progress) => {
          this.updateProgress(progress);
        },
        // Error callback
        (error) => {
          console.error('❌ Error loading OBJ:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Apply default materials to an object
   */
  applyDefaultMaterials(object) {
    const defaultMaterial = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide
    });
    
    object.traverse((child) => {
      if (child.isMesh && !child.material) {
        child.material = defaultMaterial.clone();
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    console.log('🎨 Default materials applied');
  }

  /**
   * Process loaded model (positioning, optimization, etc.)
   */
  processModel(model) {
    console.log('⚙️ Processing loaded model...');
    
    // Center the model at origin
    this.centerModel(model);
    
    // Store original materials for wireframe toggle
    this.storeOriginalMaterials(model);
    
    // Optimize model for better performance
    this.optimizeModel(model);
    
    // Set up shadows
    this.setupShadows(model);
    
    console.log('✅ Model processing complete');
  }

  /**
   * Center model at the origin
   */
  centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    
    model.position.sub(center);
    
    console.log(`📐 Model centered (offset: ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
  }

  /**
   * Store original materials for wireframe toggle
   */
  storeOriginalMaterials(model) {
    const materials = new Map();
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        materials.set(child.uuid, child.material.clone());
      }
    });
    
    this.originalMaterials.set(model.userData.modelId || model.uuid, materials);
    console.log(`💾 Stored ${materials.size} original materials`);
  }

  /**
   * Optimize model for better performance
   */
  optimizeModel(model) {
    let geometryCount = 0;
    let materialCount = 0;
    
    model.traverse((child) => {
      if (child.isMesh) {
        // Compute vertex normals if missing
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        
        // Compute bounding sphere for frustum culling
        child.geometry.computeBoundingSphere();
        
        geometryCount++;
        
        if (child.material) {
          // Enable vertex colors if available
          if (child.geometry.attributes.color) {
            child.material.vertexColors = true;
          }
          
          materialCount++;
        }
      }
    });
    
    console.log(`⚡ Model optimized: ${geometryCount} geometries, ${materialCount} materials`);
  }

  /**
   * Set up shadow casting and receiving
   */
  setupShadows(model) {
    let shadowObjects = 0;
    
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        shadowObjects++;
      }
    });
    
    console.log(`🌑 Shadow setup complete: ${shadowObjects} objects`);
  }

  /**
   * Toggle wireframe mode for a model (simplified version)
   */
  toggleWireframe(model) {
    console.log('🔲 toggleWireframe called with model:', model);
    
    if (!model) {
      console.warn('❌ No model provided to toggleWireframe');
      return;
    }
    
    let meshCount = 0;
    let wireframeCount = 0;
    let solidCount = 0;
    
    // First pass: count current state
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        meshCount++;
        if (child.material.wireframe) {
          wireframeCount++;
        } else {
          solidCount++;
        }
      }
    });
    
    console.log(`Found ${meshCount} meshes: ${wireframeCount} wireframe, ${solidCount} solid`);
    
    // Determine target state (if any are solid, switch all to wireframe; if all wireframe, switch to solid)
    const targetWireframe = solidCount > 0;
    console.log(`Target state: ${targetWireframe ? 'wireframe' : 'solid'}`);
    
    // Second pass: apply changes
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if (targetWireframe) {
          // Switch to wireframe
          child.material.wireframe = true;
          child.material.needsUpdate = true;
        } else {
          // Switch to solid
          child.material.wireframe = false;
          child.material.needsUpdate = true;
        }
      }
    });
    
    console.log(`🔲 Wireframe mode: ${targetWireframe ? 'enabled' : 'disabled'}`);
    return targetWireframe;
  }

  /**
   * Set model visibility
   */
  setModelVisibility(model, visible) {
    model.visible = visible;
    console.log(`👁️ Model visibility: ${visible ? 'shown' : 'hidden'}`);
  }

  /**
   * Set model opacity
   */
  setModelOpacity(model, opacity) {
    opacity = Utils.clamp(opacity, 0, 1);
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = opacity < 1;
        child.material.opacity = opacity;
        child.material.needsUpdate = true;
      }
    });
    
    console.log(`👻 Model opacity set to: ${opacity}`);
  }

  /**
   * Scale model uniformly
   */
  scaleModel(model, scale) {
    model.scale.setScalar(scale);
    console.log(`📏 Model scaled to: ${scale}`);
  }

  /**
   * Get model information
   */
  getModelInfo(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    let triangles = 0;
    let vertices = 0;
    let materials = 0;
    
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry.index) {
          triangles += child.geometry.index.count / 3;
        } else {
          triangles += child.geometry.attributes.position.count / 3;
        }
        vertices += child.geometry.attributes.position.count;
        materials++;
      }
    });
    
    return {
      size: size,
      center: center,
      triangles: Math.floor(triangles),
      vertices: vertices,
      materials: materials,
      bounds: {
        min: box.min,
        max: box.max
      }
    };
  }

  /**
   * Update loading progress
   */
  updateProgress(progressEvent) {
    if (progressEvent.lengthComputable) {
      this.loadingProgress = (progressEvent.loaded / progressEvent.total) * 100;
      console.log(`📊 Loading progress: ${this.loadingProgress.toFixed(1)}%`);
    }
  }

  /**
   * Remove model from scene
   */
  removeModel(model) {
    const modelId = model.userData.modelId || model.uuid;
    
    // Remove from scene
    this.scene.remove(model);
    
    // Dispose of resources
    Utils.disposeHierarchy(model);
    
    // Remove from tracking
    this.loadedModels.delete(modelId);
    this.originalMaterials.delete(modelId);
    
    console.log(`🗑️ Model removed: ${modelId}`);
  }

  /**
   * Clear all loaded models
   */
  clearAllModels() {
    console.log('🧹 Clearing all models...');
    
    for (const [modelId, model] of this.loadedModels) {
      this.removeModel(model);
    }
    
    this.loadedModels.clear();
    this.originalMaterials.clear();
    
    console.log('✅ All models cleared');
  }

  /**
   * Get all loaded models
   */
  getAllModels() {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Get model by ID
   */
  getModelById(modelId) {
    return this.loadedModels.get(modelId);
  }

  /**
   * Export model as JSON
   */
  exportModelAsJSON(model) {
    const exporter = new THREE.ObjectExporter();
    return exporter.parse(model);
  }

  /**
   * Dispose of resources
   */
  dispose() {
    console.log('🗑️ Disposing model loader...');
    
    this.clearAllModels();
    
    // Clear loaders
    this.objLoader = null;
    this.mtlLoader = null;
    
    console.log('✅ Model loader disposed');
  }
}
