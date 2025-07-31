/**
 * LIGHTING.JS - Scene Lighting Management System
 * 
 * Responsible for:
 * - Managing ambient and directional lighting
 * - Brightness and contrast adjustments
 * - Interactive lighting controls
 * - Visual enhancement settings
 * - Real-time lighting updates
 */

import * as THREE from 'three';

export class LightingSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    
    // Lighting components
    this.ambientLight = null;
    this.directionalLight = null;
    this.hemisphereLight = null;
    
    // Default values - normalized to 0-1 scale for easier understanding
    this.defaults = {
      brightness: 0.5,     // 0-1 scale (maps to 0-6 internally, default 3.0 = same as old max)
      contrast: 0.75,      // 0-1 scale (maps to 0-2 internally, default 1.5)
      ambientIntensity: 0.5,   // 0-1 scale (maps to 0-2 internally, default 1.0 = same as old max)
      directionalIntensity: 0, // 0-1 scale (maps to 0-5 internally)
      lightAzimuth: 45,    // degrees (unchanged)
      lightElevation: 45   // degrees (unchanged)
    };
    
    // Current values
    this.settings = { ...this.defaults };
    
    console.log('💡 Lighting system initialized');
  }

  /**
   * Initialize the lighting system
   */
  async init() {
    console.log('💡 Initializing lighting system...');
    
    this.setupLights();
    this.setupEventListeners();
    
    // Update UI controls to show the correct default values
    this.updateUIControls();
    
    console.log('✅ Lighting system ready');
  }

  /**
   * Set up the default lighting configuration
   */
  setupLights() {
    // Remove existing lights
    this.removeLights();
    
    // Ambient light for general illumination (convert 0-1 to 0-2)
    const ambientIntensity = this.settings.ambientIntensity * 2.0;
    this.ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity);
    this.ambientLight.name = 'ambientLight';
    this.scene.add(this.ambientLight);
    
    // Directional light for shadows and definition (convert 0-1 to 0-5)
    const directionalIntensity = this.settings.directionalIntensity * 5.0;
    this.directionalLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
    this.updateDirectionalLightPosition();
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.name = 'directionalLight';
    this.scene.add(this.directionalLight);
    
    // Hemisphere light for natural lighting
    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2F4F4F, 0.3);
    this.hemisphereLight.name = 'hemisphereLight';
    this.scene.add(this.hemisphereLight);
    
    // Enable shadows in renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Apply brightness and contrast settings immediately
    this.updateRendererSettings();
    
    console.log('💡 Default lighting setup complete');
  }

  /**
   * Set up event listeners for lighting controls
   */
  setupEventListeners() {
    // Brightness control
    const brightnessSlider = document.getElementById('brightness-slider');
    const brightnessValue = document.getElementById('brightness-value');
    
    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setBrightness(value);
        if (brightnessValue) {
          brightnessValue.textContent = value.toFixed(2);
        }
      });
    }
    
    // Contrast control
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue = document.getElementById('contrast-value');
    
    if (contrastSlider) {
      contrastSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setContrast(value);
        if (contrastValue) {
          contrastValue.textContent = value.toFixed(2);
        }
      });
    }
    
    // Ambient light control
    const ambientSlider = document.getElementById('ambient-slider');
    const ambientValue = document.getElementById('ambient-value');
    
    if (ambientSlider) {
      ambientSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setAmbientIntensity(value);
        if (ambientValue) {
          ambientValue.textContent = value.toFixed(2);
        }
      });
    }
    
    // Directional light control
    const directionalSlider = document.getElementById('directional-slider');
    const directionalValue = document.getElementById('directional-value');
    
    if (directionalSlider) {
      directionalSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setDirectionalIntensity(value);
        if (directionalValue) {
          directionalValue.textContent = value.toFixed(2);
        }
      });
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-lighting');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }
    
    // Light azimuth control
    const azimuthSlider = document.getElementById('light-azimuth-slider');
    const azimuthValue = document.getElementById('light-azimuth-value');
    
    if (azimuthSlider) {
      azimuthSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setLightAzimuth(value);
        if (azimuthValue) {
          azimuthValue.textContent = value + '°';
        }
      });
    }
    
    // Light elevation control
    const elevationSlider = document.getElementById('light-elevation-slider');
    const elevationValue = document.getElementById('light-elevation-value');
    
    if (elevationSlider) {
      elevationSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.setLightElevation(value);
        if (elevationValue) {
          elevationValue.textContent = value + '°';
        }
      });
    }
    
    console.log('🎛️ Lighting controls attached');
  }

  /**
   * Set overall brightness (0-1 scale, maps to 0-6 internally)
   */
  setBrightness(value) {
    this.settings.brightness = value;
    // Convert 0-1 scale to 0-6 for internal use (0.5 = 3.0, 1.0 = 6.0)
    const actualBrightness = value * 6.0;
    this.updateRendererSettings(actualBrightness);
    console.log(`💡 Brightness set to: ${value} (${actualBrightness.toFixed(2)} internal)`);
  }

  /**
   * Set contrast (0-1 scale, maps to 0-2 internally)
   */
  setContrast(value) {
    this.settings.contrast = value;
    // Convert 0-1 scale to 0-2 for internal use
    const actualContrast = value * 2.0;
    this.updateRendererSettings(null, actualContrast);
    console.log(`🌓 Contrast set to: ${value} (${actualContrast.toFixed(2)} internal)`);
  }

  /**
   * Set ambient light intensity (0-1 scale, maps to 0-2 internally)
   */
  setAmbientIntensity(value) {
    this.settings.ambientIntensity = value;
    if (this.ambientLight) {
      // Convert 0-1 scale to 0-2 for internal use (0.5 = 1.0, 1.0 = 2.0)
      const actualIntensity = value * 2.0;
      this.ambientLight.intensity = actualIntensity;
    }
    console.log(`🌅 Ambient intensity set to: ${value} (${(value * 2.0).toFixed(2)} internal)`);
  }

  /**
   * Set directional light intensity (0-1 scale, maps to 0-5 internally)
   */
  setDirectionalIntensity(value) {
    this.settings.directionalIntensity = value;
    if (this.directionalLight) {
      // Convert 0-1 scale to 0-5 for internal use
      const actualIntensity = value * 5.0;
      this.directionalLight.intensity = actualIntensity;
    }
    console.log(`☀️ Directional intensity set to: ${value} (${(value * 5.0).toFixed(2)} internal)`);
  }

  /**
   * Set light azimuth (horizontal rotation)
   */
  setLightAzimuth(degrees) {
    this.settings.lightAzimuth = degrees;
    this.updateDirectionalLightPosition();
    console.log(`🧭 Light azimuth set to: ${degrees}°`);
  }

  /**
   * Set light elevation (vertical angle)
   */
  setLightElevation(degrees) {
    this.settings.lightElevation = degrees;
    this.updateDirectionalLightPosition();
    console.log(`📐 Light elevation set to: ${degrees}°`);
  }

  /**
   * Update directional light position based on azimuth and elevation
   */
  updateDirectionalLightPosition() {
    if (!this.directionalLight) return;
    
    // Convert degrees to radians
    const azimuthRad = (this.settings.lightAzimuth * Math.PI) / 180;
    const elevationRad = (this.settings.lightElevation * Math.PI) / 180;
    
    // Calculate position using spherical coordinates
    const distance = 15; // Distance from center
    const x = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
    const z = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = distance * Math.sin(elevationRad);
    
    this.directionalLight.position.set(x, y, z);
    
    // Make sure light points toward the center
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();
  }

  /**
   * Update renderer settings for brightness and contrast
   */
  updateRendererSettings(actualBrightness = null, actualContrast = null) {
    // Use provided values or convert from stored 0-1 values
    const brightness = actualBrightness !== null ? actualBrightness : this.settings.brightness * 6.0;
    const contrast = actualContrast !== null ? actualContrast : this.settings.contrast * 2.0;
    
    // Adjust renderer tone mapping for brightness
    this.renderer.toneMappingExposure = brightness;
    
    // You could also adjust gamma correction here if needed
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // For contrast, we might need to adjust material properties
    // This would require access to all materials in the scene
    this.updateMaterialContrast(contrast);
  }

  /**
   * Update material contrast (experimental)
   */
  updateMaterialContrast(contrastValue = null) {
    const contrast = contrastValue !== null ? contrastValue : this.settings.contrast * 2.0;
    
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        // Store original values if not already stored
        if (!object.material.userData.originalColor) {
          if (object.material.color) {
            object.material.userData.originalColor = object.material.color.clone();
          }
        }
        
        // Apply contrast adjustment
        if (object.material.userData.originalColor) {
          const originalColor = object.material.userData.originalColor;
          const adjustedColor = originalColor.clone();
          
          // Simple contrast adjustment (move toward/away from 0.5 gray)
          adjustedColor.r = 0.5 + (adjustedColor.r - 0.5) * contrast;
          adjustedColor.g = 0.5 + (adjustedColor.g - 0.5) * contrast;
          adjustedColor.b = 0.5 + (adjustedColor.b - 0.5) * contrast;
          
          // Clamp values
          adjustedColor.r = Math.max(0, Math.min(1, adjustedColor.r));
          adjustedColor.g = Math.max(0, Math.min(1, adjustedColor.g));
          adjustedColor.b = Math.max(0, Math.min(1, adjustedColor.b));
          
          object.material.color.copy(adjustedColor);
        }
      }
    });
  }

  /**
   * Reset all lighting settings to defaults
   */
  resetToDefaults() {
    this.settings = { ...this.defaults };
    
    // Update UI controls
    this.updateUIControls();
    
    // Update lighting
    this.setAmbientIntensity(this.settings.ambientIntensity);
    this.setDirectionalIntensity(this.settings.directionalIntensity);
    this.setBrightness(this.settings.brightness);
    this.setContrast(this.settings.contrast);
    this.updateDirectionalLightPosition(); // Update light position
    
    console.log('🔄 Lighting reset to defaults');
  }

  /**
   * Update UI control values
   */
  updateUIControls() {
    const brightnessSlider = document.getElementById('brightness-slider');
    const brightnessValue = document.getElementById('brightness-value');
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue = document.getElementById('contrast-value');
    const ambientSlider = document.getElementById('ambient-slider');
    const ambientValue = document.getElementById('ambient-value');
    const directionalSlider = document.getElementById('directional-slider');
    const directionalValue = document.getElementById('directional-value');
    const azimuthSlider = document.getElementById('light-azimuth-slider');
    const azimuthValue = document.getElementById('light-azimuth-value');
    const elevationSlider = document.getElementById('light-elevation-slider');
    const elevationValue = document.getElementById('light-elevation-value');
    
    if (brightnessSlider) {
      brightnessSlider.value = this.settings.brightness;
      if (brightnessValue) brightnessValue.textContent = this.settings.brightness.toFixed(2);
    }
    
    if (contrastSlider) {
      contrastSlider.value = this.settings.contrast;
      if (contrastValue) contrastValue.textContent = this.settings.contrast.toFixed(2);
    }
    
    if (ambientSlider) {
      ambientSlider.value = this.settings.ambientIntensity;
      if (ambientValue) ambientValue.textContent = this.settings.ambientIntensity.toFixed(2);
    }
    
    if (directionalSlider) {
      directionalSlider.value = this.settings.directionalIntensity;
      if (directionalValue) directionalValue.textContent = this.settings.directionalIntensity.toFixed(2);
    }
    
    if (azimuthSlider) {
      azimuthSlider.value = this.settings.lightAzimuth;
      if (azimuthValue) azimuthValue.textContent = this.settings.lightAzimuth + '°';
    }
    
    if (elevationSlider) {
      elevationSlider.value = this.settings.lightElevation;
      if (elevationValue) elevationValue.textContent = this.settings.lightElevation + '°';
    }
  }

  /**
   * Remove existing lights from scene
   */
  removeLights() {
    const lightsToRemove = [];
    
    this.scene.traverse((object) => {
      if (object.isLight) {
        lightsToRemove.push(object);
      }
    });
    
    lightsToRemove.forEach(light => {
      this.scene.remove(light);
    });
    
    this.ambientLight = null;
    this.directionalLight = null;
    this.hemisphereLight = null;
  }

  /**
   * Get current lighting settings for export
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Apply lighting settings from imported data
   */
  applySettings(settings) {
    this.settings = { ...this.defaults, ...settings };
    this.updateUIControls();
    this.setAmbientIntensity(this.settings.ambientIntensity);
    this.setDirectionalIntensity(this.settings.directionalIntensity);
    this.setBrightness(this.settings.brightness);
    this.setContrast(this.settings.contrast);
    
    console.log('💡 Lighting settings applied');
  }

  /**
   * Dispose of lighting system
   */
  dispose() {
    console.log('🗑️ Disposing lighting system...');
    
    this.removeLights();
    
    // Clear references
    this.scene = null;
    this.renderer = null;
    
    console.log('✅ Lighting system disposed');
  }
}
