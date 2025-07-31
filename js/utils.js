/**
 * UTILS.JS - Utility Functions and Helper Methods
 * 
 * Responsible for:
 * - Unit conversion functions (metric ↔ imperial)
 * - Geometry and math utilities
 * - 3D calculation helpers (polygon area, point-in-polygon, etc.)
 * - Common utility functions used across modules
 * - Performance optimization helpers
 * - Data formatting and validation
 */

import * as THREE from 'three';

export class Utils {
  static meshUnits = 'm'; // Default mesh units
  
  // Unit conversion constants
  static UNIT_CONVERSIONS = {
    'mm': 0.001,
    'cm': 0.01,
    'm': 1.0,
    'in': 0.0254,
    'ft': 0.3048
  };

  /**
   * Set the current mesh units
   */
  static setMeshUnits(units) {
    if (this.UNIT_CONVERSIONS[units]) {
      this.meshUnits = units;
      console.log(`📏 Mesh units set to: ${units}`);
    } else {
      console.warn(`⚠️ Unknown unit: ${units}`);
    }
  }

  /**
   * Get current mesh units
   */
  static getMeshUnits() {
    return this.meshUnits;
  }

  /**
   * Convert value from one unit to meters
   */
  static convertToMeters(value, fromUnit) {
    const conversion = this.UNIT_CONVERSIONS[fromUnit];
    if (!conversion) {
      console.warn(`⚠️ Unknown unit for conversion: ${fromUnit}`);
      return value;
    }
    return value * conversion;
  }

  /**
   * Convert value from meters to target unit
   */
  static convertFromMeters(value, toUnit) {
    const conversion = this.UNIT_CONVERSIONS[toUnit];
    if (!conversion) {
      console.warn(`⚠️ Unknown unit for conversion: ${toUnit}`);
      return value;
    }
    return value / conversion;
  }

  /**
   * Convert value from current mesh units to feet and inches
   */
  static toFeetInches(meshUnitsValue) {
    // Convert mesh units to meters first, then to feet/inches
    const metersValue = this.convertToMeters(meshUnitsValue, this.meshUnits);
    const totalInches = metersValue * 39.3701; // meters to inches
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches % 12);
    return { ft, inch };
  }

  /**
   * Format distance with units
   */
  static formatDistance(distance, showImperial = true) {
    const formattedDistance = `${distance.toFixed(2)} ${this.meshUnits}`;
    
    if (showImperial) {
      const { ft, inch } = this.toFeetInches(distance);
      return `${formattedDistance}<br><small>${ft}ft ${inch}in</small>`;
    }
    
    return formattedDistance;
  }

  /**
   * Format area with units
   */
  static formatArea(area, showImperial = true) {
    const formattedArea = `${area.toFixed(2)} ${this.meshUnits}²`;
    
    if (showImperial) {
      // Convert area to different units
      const areaInMetersSquared = this.convertToMeters(area, this.meshUnits) * 
                                  this.convertToMeters(1, this.meshUnits);
      const areaInFeetSquared = areaInMetersSquared * 10.7639; // square meters to square feet
      return `${formattedArea}<br><small>${areaInFeetSquared.toFixed(2)} ft²</small>`;
    }
    
    return formattedArea;
  }

  /**
   * Calculate polygon area using triangulation method
   * Works for any polygon in 3D space
   */
  static calculatePolygonArea(points) {
    if (points.length < 3) return 0;
    
    let totalArea = 0;
    const n = points.length;
    
    // Pick the first point as the common vertex for all triangles
    const basePoint = points[0];
    
    // Sum up the areas of all triangles formed by connecting
    // the base point to each edge of the polygon
    for (let i = 1; i < n - 1; i++) {
      const point1 = points[i];
      const point2 = points[i + 1];
      
      // Create vectors from base point to the other two points
      const v1 = new THREE.Vector3().subVectors(point1, basePoint);
      const v2 = new THREE.Vector3().subVectors(point2, basePoint);
      
      // Calculate cross product to get the area of this triangle
      const cross = new THREE.Vector3().crossVectors(v1, v2);
      
      // Area of triangle is half the magnitude of cross product
      totalArea += cross.length() / 2;
    }
    
    return totalArea;
  }

  /**
   * Calculate the center point of a polygon
   */
  static calculatePolygonCenter(points) {
    if (points.length === 0) return new THREE.Vector3(0, 0, 0);
    
    let center = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < points.length; i++) {
      center.add(points[i]);
    }
    center.divideScalar(points.length);
    
    return center;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * Projects to XZ plane for 2D polygon test
   */
  static isPointInPolygon(point, polygonPoints) {
    if (polygonPoints.length < 3) return false;
    
    let inside = false;
    const x = point.x, z = point.z; // Use x,z plane for 2D polygon test
    
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].x, zi = polygonPoints[i].z;
      const xj = polygonPoints[j].x, zj = polygonPoints[j].z;
      
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Calculate distance between two 3D points
   */
  static calculateDistance(point1, point2) {
    return point1.distanceTo(point2);
  }

  /**
   * Calculate midpoint between two 3D points
   */
  static calculateMidpoint(point1, point2) {
    return new THREE.Vector3()
      .addVectors(point1, point2)
      .multiplyScalar(0.5);
  }

  /**
   * Project 3D point to screen coordinates
   */
  static projectToScreen(point, camera, renderer = null) {
    const screenPos = point.clone().project(camera);
    
    // Use renderer dimensions if available, otherwise fallback to window
    const width = renderer ? renderer.domElement.clientWidth : window.innerWidth;
    const height = renderer ? renderer.domElement.clientHeight : window.innerHeight;
    
    const x = (screenPos.x * 0.5 + 0.5) * width;
    const y = (-screenPos.y * 0.5 + 0.5) * height;
    
    return { x, y };
  }

  /**
   * Convert screen coordinates to normalized device coordinates
   */
  static screenToNDC(screenX, screenY) {
    return {
      x: (screenX / window.innerWidth) * 2 - 1,
      y: -(screenY / window.innerHeight) * 2 + 1
    };
  }

  /**
   * Generate a random color in hex format
   */
  static generateRandomColor() {
    return Math.floor(Math.random() * 16777215); // 0xFFFFFF
  }

  /**
   * Convert hex color to RGB components
   */
  static hexToRgb(hex) {
    return {
      r: (hex >> 16) & 255,
      g: (hex >> 8) & 255,
      b: hex & 255
    };
  }

  /**
   * Convert RGB components to hex color
   */
  static rgbToHex(r, g, b) {
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Generate unique ID
   */
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * Map value from one range to another
   */
  static mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  /**
   * Round number to specified decimal places
   */
  static roundTo(number, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
  }

  /**
   * Check if two points are approximately equal
   */
  static pointsEqual(point1, point2, tolerance = 0.001) {
    return point1.distanceTo(point2) < tolerance;
  }

  /**
   * Create a sphere geometry for point visualization
   */
  static createSphereGeometry(radius = 0.02, segments = 16) {
    return new THREE.SphereGeometry(radius, segments, segments);
  }

  /**
   * Create a tube geometry for line visualization
   */
  static createTubeGeometry(points, radius = 0.008, segments = 8) {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, points.length - 1, radius, segments, false);
  }

  /**
   * Dispose of geometry and material to prevent memory leaks
   */
  static disposeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
    
    // Dispose of textures if any
    if (object.material && object.material.map) {
      object.material.map.dispose();
    }
  }

  /**
   * Traverse object hierarchy and dispose of all resources
   */
  static disposeHierarchy(object) {
    object.traverse((child) => {
      this.disposeObject(child);
    });
  }

  /**
   * Format timestamp for exports
   */
  static formatTimestamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  /**
   * Format file size in human readable format
   */
  static formatFilesize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Debounce function to limit function calls
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function to limit function calls
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone an object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof THREE.Vector3) return obj.clone();
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Validate if string is a valid number
   */
  static isValidNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  /**
   * Sanitize filename for download
   */
  static sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  /**
   * Get performance timestamp
   */
  static now() {
    return performance.now();
  }

  /**
   * Log performance timing
   */
  static logTiming(label, startTime) {
    const duration = this.now() - startTime;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}
