/**
 * MEASUREMENT.JS - Advanced Measurement System
 * 
 * Responsible for:
 * - Multi-measurement system with color coding
 * - Distance and area calculations
 * - Point placement, editing, and deletion
 * - Measurement visualization (lines, spheres, labels)
 * - Real-time label updates and positioning
 * - Measurement state management and switching
 * - Interactive editing with mouse controls
 * - Data protection and validation
 */

import * as THREE from 'three';
import { Utils } from './utils.js';

export class MeasurementSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // State
    this.active = false;
    this.measurements = [];
    this.currentMeasurementIndex = -1;
    this.measurementIdCounter = 1;
    this.labelsVisible = true;
    
    // Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isEditing = false;
    this.editingPointIndex = -1;
    this.editingMeasurementIndex = -1;
    
    // Performance optimization
    this.labelUpdateTimer = null;
    this.LABEL_UPDATE_INTERVAL = 200; // 5fps as backup, main updates happen in render loop
    
    // Visual settings
    this.SPHERE_RADIUS = 0.02;
    this.TUBE_RADIUS = 0.008;
    this.MEASUREMENT_COLORS = [
      0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 
      0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488
    ];
  }

  /**
   * Initialize the measurement system
   */
  async init() {
    console.log('📏 Initializing measurement system...');
    
    this.setupEventListeners();
    this.startLabelUpdates();
    
    console.log('✅ Measurement system initialized');
  }

  /**
   * Set up event listeners for measurement interactions
   */
  setupEventListeners() {
    // Mouse events for point placement and editing
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.active) {
        this.handleClick(e);
      }
    });
    
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.active && e.ctrlKey) {
        this.handleMouseDown(e);
      }
    });
    
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (this.active && this.isEditing) {
        this.handleMouseMove(e);
      }
    });
    
    this.renderer.domElement.addEventListener('mouseup', (e) => {
      if (this.active && this.isEditing) {
        this.handleMouseUp(e);
      }
    });
    
    console.log('👂 Measurement event listeners attached');
  }

  /**
   * Activate measurement mode
   */
  activate() {
    this.active = true;
    this.showMeasurementReadout();
    console.log('📏 Measurement mode activated');
  }

  /**
   * Deactivate measurement mode
   */
  deactivate() {
    this.active = false;
    this.hideMeasurementReadout();
    this.stopEditing();
    console.log('📏 Measurement mode deactivated');
  }

  /**
   * Handle mouse click for point placement
   */
  handleClick(event) {
    // Ignore if editing
    if (this.isEditing) return;
    
    // Check for modifier keys
    if (event.shiftKey) {
      this.handleDeletePoint(event);
      return;
    }
    
    // Get intersection point
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Get or create current measurement
    let measurement = this.getCurrentMeasurement();
    if (!measurement) {
      measurement = this.createNewMeasurement();
    }
    
    // Add point to measurement
    this.addPointToMeasurement(measurement, intersectionPoint);
    
    // Update visuals
    this.updateMeasurementVisuals(measurement);
    this.updateMeasurementReadout();
  }

  /**
   * Handle point deletion with Shift+Click
   */
  handleDeletePoint(event) {
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Find closest point to delete
    const { measurement, pointIndex } = this.findClosestPoint(intersectionPoint);
    
    if (measurement && pointIndex !== -1) {
      this.deletePointFromMeasurement(measurement, pointIndex);
    }
  }

  /**
   * Handle mouse down for point editing
   */
  handleMouseDown(event) {
    if (!event.ctrlKey) return;
    
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Find closest point to edit
    const { measurement, pointIndex } = this.findClosestPoint(intersectionPoint);
    
    if (measurement && pointIndex !== -1) {
      this.startEditing(measurement, pointIndex);
      event.preventDefault();
    }
  }

  /**
   * Handle mouse move during editing
   */
  handleMouseMove(event) {
    if (!this.isEditing) return;
    
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Update point position
    const measurement = this.measurements[this.editingMeasurementIndex];
    measurement.points[this.editingPointIndex].copy(intersectionPoint);
    
    // Update visuals
    this.updateMeasurementVisuals(measurement);
  }

  /**
   * Handle mouse up to stop editing
   */
  handleMouseUp(event) {
    if (this.isEditing) {
      this.stopEditing();
    }
  }

  /**
   * Get intersection point from mouse event
   */
  getIntersectionPoint(event) {
    // Update mouse coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Cast ray
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections with loaded models
    const objects = this.scene.children.filter(child => 
      child.userData.modelId && child.visible
    );
    
    const intersects = this.raycaster.intersectObjects(objects, true);
    
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    
    return null;
  }

  /**
   * Find closest point to given position
   */
  findClosestPoint(position, maxDistance = 0.1) {
    let closestMeasurement = null;
    let closestPointIndex = -1;
    let closestDistance = maxDistance;
    
    for (let i = 0; i < this.measurements.length; i++) {
      const measurement = this.measurements[i];
      
      for (let j = 0; j < measurement.points.length; j++) {
        const distance = position.distanceTo(measurement.points[j]);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestMeasurement = measurement;
          closestPointIndex = j;
        }
      }
    }
    
    return {
      measurement: closestMeasurement,
      pointIndex: closestPointIndex,
      distance: closestDistance
    };
  }

  /**
   * Start editing a point
   */
  startEditing(measurement, pointIndex) {
    this.isEditing = true;
    this.editingPointIndex = pointIndex;
    this.editingMeasurementIndex = this.measurements.indexOf(measurement);
    
    // Disable orbit controls during editing
    if (window.inspector3D && window.inspector3D.controls) {
      window.inspector3D.controls.setEnabled(false);
    }
    
    console.log(`✏️ Started editing point ${pointIndex} in measurement ${measurement.id}`);
  }

  /**
   * Stop editing
   */
  stopEditing() {
    this.isEditing = false;
    this.editingPointIndex = -1;
    this.editingMeasurementIndex = -1;
    
    // Re-enable orbit controls
    if (window.inspector3D && window.inspector3D.controls) {
      window.inspector3D.controls.setEnabled(true);
    }
    
    console.log('✅ Stopped editing');
  }

  /**
   * Create new measurement
   */
  createNewMeasurement() {
    const measurement = {
      id: `M${this.measurementIdCounter++}`,
      points: [],
      spheres: [],
      lines: [],
      labels: [],
      color: this.MEASUREMENT_COLORS[(this.measurements.length) % this.MEASUREMENT_COLORS.length],
      isClosed: false,
      isLocked: false, // Prevents editing if linked to discrepancies
      createdAt: new Date(),
      totalDistance: 0,
      area: 0
    };
    
    this.measurements.push(measurement);
    this.currentMeasurementIndex = this.measurements.length - 1;
    
    console.log(`➕ Created new measurement: ${measurement.id}`);
    return measurement;
  }

  /**
   * Get current active measurement
   */
  getCurrentMeasurement() {
    if (this.currentMeasurementIndex >= 0 && this.currentMeasurementIndex < this.measurements.length) {
      return this.measurements[this.currentMeasurementIndex];
    }
    return null;
  }

  /**
   * Add point to measurement
   */
  addPointToMeasurement(measurement, point) {
    if (measurement.isLocked) {
      console.warn('⚠️ Cannot add point to locked measurement');
      return;
    }
    
    measurement.points.push(point.clone());
    
    // Create visual sphere for the point
    const sphereGeometry = Utils.createSphereGeometry(this.SPHERE_RADIUS);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: measurement.color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    sphere.position.copy(point);
    sphere.userData = {
      type: 'measurementPoint',
      measurementId: measurement.id,
      pointIndex: measurement.points.length - 1
    };
    
    this.scene.add(sphere);
    measurement.spheres.push(sphere);
    
    console.log(`📍 Added point ${measurement.points.length} to measurement ${measurement.id}`);
  }

  /**
   * Delete point from measurement
   */
  deletePointFromMeasurement(measurement, pointIndex) {
    if (measurement.isLocked) {
      console.warn('⚠️ Cannot delete point from locked measurement');
      return;
    }
    
    if (pointIndex < 0 || pointIndex >= measurement.points.length) return;
    
    // Remove point
    measurement.points.splice(pointIndex, 1);
    
    // Remove visual sphere
    if (measurement.spheres[pointIndex]) {
      this.scene.remove(measurement.spheres[pointIndex]);
      Utils.disposeObject(measurement.spheres[pointIndex]);
      measurement.spheres.splice(pointIndex, 1);
    }
    
    // Update visuals
    this.updateMeasurementVisuals(measurement);
    
    console.log(`🗑️ Deleted point ${pointIndex} from measurement ${measurement.id}`);
  }

  /**
   * Update measurement visuals (lines and labels)
   */
  updateMeasurementVisuals(measurement) {
    // Clear existing lines and labels
    this.clearMeasurementLines(measurement);
    this.clearMeasurementLabels(measurement);
    
    if (measurement.points.length < 2) return;
    
    // Create lines between consecutive points
    for (let i = 1; i < measurement.points.length; i++) {
      this.createMeasurementLine(measurement, i - 1, i);
    }
    
    // Create closing line if measurement is closed
    if (measurement.isClosed && measurement.points.length >= 3) {
      this.createMeasurementLine(measurement, measurement.points.length - 1, 0, true); // Pass true for isClosingLine
      
      // Calculate and display area
      measurement.area = Utils.calculatePolygonArea(measurement.points);
      this.createAreaLabel(measurement);
    }
    
    // Update total distance
    this.updateMeasurementDistance(measurement);
  }

  /**
   * Create line between two points
   */
  createMeasurementLine(measurement, fromIndex, toIndex, isClosingLine = false) {
    const fromPoint = measurement.points[fromIndex];
    const toPoint = measurement.points[toIndex];
    
    // Create tube geometry for the line
    const tubeGeometry = Utils.createTubeGeometry([fromPoint, toPoint], this.TUBE_RADIUS);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: measurement.color });
    const line = new THREE.Mesh(tubeGeometry, lineMaterial);
    
    line.userData = {
      type: 'measurementLine',
      measurementId: measurement.id,
      fromIndex: fromIndex,
      toIndex: toIndex,
      isClosingLine: isClosingLine
    };
    
    this.scene.add(line);
    measurement.lines.push(line);
    
    // Create distance label at midpoint (skip for closing line)
    if (!isClosingLine) {
      const midPoint = Utils.calculateMidpoint(fromPoint, toPoint);
      const distance = Utils.calculateDistance(fromPoint, toPoint);
      
      this.createDistanceLabel(measurement, midPoint, distance, fromIndex, toIndex);
    }
  }

  /**
   * Create distance label
   */
  createDistanceLabel(measurement, position, distance, fromIndex, toIndex) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'measure-label';
    labelDiv.innerHTML = Utils.formatDistance(distance);
    labelDiv.style.display = this.labelsVisible ? 'block' : 'none';
    labelDiv.style.backgroundColor = `rgba(${Utils.hexToRgb(measurement.color).r}, ${Utils.hexToRgb(measurement.color).g}, ${Utils.hexToRgb(measurement.color).b}, 0.95)`;
    
    document.body.appendChild(labelDiv);
    
    measurement.labels.push({
      div: labelDiv,
      position: position.clone(),
      distance: distance,
      fromIndex: fromIndex,
      toIndex: toIndex,
      type: 'distance'
    });
  }

  /**
   * Create area label for closed measurements
   */
  createAreaLabel(measurement) {
    if (measurement.area <= 0) return;
    
    const center = Utils.calculatePolygonCenter(measurement.points);
    
    const areaLabelDiv = document.createElement('div');
    areaLabelDiv.className = 'measure-label';
    areaLabelDiv.style.fontSize = '14px';
    areaLabelDiv.style.fontWeight = 'bold';
    areaLabelDiv.style.padding = '8px 12px';
    areaLabelDiv.style.borderRadius = '8px';
    areaLabelDiv.style.border = '2px solid white';
    areaLabelDiv.innerHTML = `AREA<br>${Utils.formatArea(measurement.area)}`;
    areaLabelDiv.style.display = this.labelsVisible ? 'block' : 'none';
    areaLabelDiv.style.backgroundColor = `rgba(${Utils.hexToRgb(measurement.color).r}, ${Utils.hexToRgb(measurement.color).g}, ${Utils.hexToRgb(measurement.color).b}, 0.95)`;
    
    document.body.appendChild(areaLabelDiv);
    
    measurement.labels.push({
      div: areaLabelDiv,
      position: center,
      area: measurement.area,
      type: 'area'
    });
  }

  /**
   * Clear measurement lines
   */
  clearMeasurementLines(measurement) {
    measurement.lines.forEach(line => {
      this.scene.remove(line);
      Utils.disposeObject(line);
    });
    measurement.lines = [];
  }

  /**
   * Clear measurement labels
   */
  clearMeasurementLabels(measurement) {
    measurement.labels.forEach(label => {
      if (label.div && label.div.parentNode) {
        label.div.parentNode.removeChild(label.div);
      }
    });
    measurement.labels = [];
  }

  /**
   * Update measurement total distance
   */
  updateMeasurementDistance(measurement) {
    let totalDistance = 0;
    
    for (let i = 1; i < measurement.points.length; i++) {
      totalDistance += Utils.calculateDistance(measurement.points[i - 1], measurement.points[i]);
    }
    
    if (measurement.isClosed && measurement.points.length >= 3) {
      totalDistance += Utils.calculateDistance(
        measurement.points[measurement.points.length - 1], 
        measurement.points[0]
      );
    }
    
    measurement.totalDistance = totalDistance;
  }

  /**
   * Close current measurement (create polygon)
   */
  closeMeasurement() {
    const measurement = this.getCurrentMeasurement();
    if (!measurement || measurement.points.length < 3) {
      console.warn('⚠️ Need at least 3 points to close measurement');
      return;
    }
    
    if (measurement.isLocked) {
      console.warn('⚠️ Cannot close locked measurement');
      return;
    }
    
    measurement.isClosed = true;
    this.updateMeasurementVisuals(measurement);
    
    console.log(`🔄 Closed measurement ${measurement.id} (area: ${measurement.area.toFixed(2)} ${Utils.getMeshUnits()}²)`);
  }

  /**
   * Switch to specific measurement
   */
  switchToMeasurement(index) {
    if (index >= 0 && index < this.measurements.length) {
      this.currentMeasurementIndex = index;
      this.updateMeasurementReadout();
      console.log(`🔄 Switched to measurement ${this.measurements[index].id}`);
    }
  }

  /**
   * Toggle label visibility
   */
  toggleLabels() {
    this.labelsVisible = !this.labelsVisible;
    
    this.measurements.forEach(measurement => {
      measurement.labels.forEach(label => {
        label.div.style.display = this.labelsVisible ? 'block' : 'none';
      });
    });
    
    console.log(`👁️ Measurement labels ${this.labelsVisible ? 'shown' : 'hidden'}`);
  }

  /**
   * Clear current measurement
   */
  clearCurrent() {
    const measurement = this.getCurrentMeasurement();
    if (measurement && !measurement.isLocked) {
      this.clearMeasurement(measurement);
    }
  }

  /**
   * Clear specific measurement
   */
  clearMeasurement(measurement) {
    if (measurement.isLocked) {
      console.warn('⚠️ Cannot clear locked measurement');
      return;
    }
    
    // Remove visuals
    measurement.spheres.forEach(sphere => {
      this.scene.remove(sphere);
      Utils.disposeObject(sphere);
    });
    
    this.clearMeasurementLines(measurement);
    this.clearMeasurementLabels(measurement);
    
    // Remove from array
    const index = this.measurements.indexOf(measurement);
    if (index !== -1) {
      this.measurements.splice(index, 1);
      
      // Adjust current index
      if (this.currentMeasurementIndex >= index) {
        this.currentMeasurementIndex--;
      }
    }
    
    console.log(`🗑️ Cleared measurement ${measurement.id}`);
  }

  /**
   * Update all measurement labels (called periodically)
   */
  updateAllLabels() {
    if (!this.labelsVisible) return;
    
    this.measurements.forEach(measurement => {
      measurement.labels.forEach(label => {
        if (label.position) {
          const screenPos = Utils.projectToScreen(label.position, this.camera, this.renderer);
          label.div.style.left = `${screenPos.x}px`;
          label.div.style.top = `${screenPos.y}px`;
        }
      });
    });
  }

  /**
   * Start label update timer
   */
  startLabelUpdates() {
    if (this.labelUpdateTimer) {
      clearInterval(this.labelUpdateTimer);
    }
    
    this.labelUpdateTimer = setInterval(() => {
      if (this.active && this.labelsVisible) {
        this.updateAllLabels();
      }
    }, this.LABEL_UPDATE_INTERVAL);
  }

  /**
   * Show measurement readout
   */
  showMeasurementReadout() {
    const readout = document.getElementById('measure-readout');
    if (readout) {
      readout.style.display = 'block';
      this.updateMeasurementReadout();
    }
  }

  /**
   * Hide measurement readout
   */
  hideMeasurementReadout() {
    const readout = document.getElementById('measure-readout');
    if (readout) {
      readout.style.display = 'none';
    }
  }

  /**
   * Update measurement readout content
   */
  updateMeasurementReadout() {
    const readout = document.getElementById('measure-readout');
    if (!readout || !this.active) return;
    
    const measurement = this.getCurrentMeasurement();
    
    if (!measurement || measurement.points.length === 0) {
      readout.innerHTML = `
        <strong>📏 Measurement Mode</strong><br>
        <small>Click on model to start measuring<br>
        N: New measurement | ESC: Clear | L: Toggle labels</small>
      `;
    } else {
      const pointCount = measurement.points.length;
      const distance = measurement.totalDistance;
      const area = measurement.area;
      
      let content = `<strong>${measurement.id}: ${pointCount} point${pointCount !== 1 ? 's' : ''}</strong><br>`;
      
      if (pointCount === 1) {
        content += `<small>Click next point to measure distance<br>
        N: New measurement</small>`;
      } else {
        content += `Distance: ${Utils.formatDistance(distance, false)}<br>`;
        
        if (measurement.isClosed && area > 0) {
          content += `Area: ${Utils.formatArea(area, false)}<br>`;
        }
        
        content += `<small>`;
        if (pointCount >= 3 && !measurement.isClosed) {
          content += `C: Close shape | `;
        }
        content += `N: New | Shift+Click: Delete point | Ctrl+Drag: Move point</small>`;
      }
      
      readout.innerHTML = content;
    }
  }

  /**
   * Update units for all measurements
   */
  updateUnits(newUnits) {
    // Labels will be updated automatically when they refresh
    this.updateMeasurementReadout();
    console.log(`📏 Measurement units updated to: ${newUnits}`);
  }

  /**
   * Get measurement data for export
   */
  getExportData() {
    return this.measurements.map(measurement => ({
      id: measurement.id,
      points: measurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
      totalDistance: measurement.totalDistance,
      area: measurement.area,
      isClosed: measurement.isClosed,
      isLocked: measurement.isLocked,
      color: `#${measurement.color.toString(16).padStart(6, '0')}`,
      createdAt: measurement.createdAt.toISOString(),
      units: Utils.getMeshUnits()
    }));
  }

  /**
   * Handle resize event
   */
  handleResize() {
    // Labels will be repositioned on next update cycle
  }

  /**
   * Update system (called in render loop)
   */
  update() {
    // Update labels every frame for smooth tracking
    this.updateAllLabels();
  }

  /**
   * Dispose of resources
   */
  dispose() {
    console.log('🗑️ Disposing measurement system...');
    
    // Clear all measurements
    this.measurements.forEach(measurement => {
      this.clearMeasurement(measurement);
    });
    
    // Stop label updates
    if (this.labelUpdateTimer) {
      clearInterval(this.labelUpdateTimer);
      this.labelUpdateTimer = null;
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    console.log('✅ Measurement system disposed');
  }
}
