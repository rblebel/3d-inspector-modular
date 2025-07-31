/**
 * ANNOTATION.JS - Point-Based Discrepancy Annotation System
 * 
 * Responsible for:
 * - Point-based discrepancy annotation with single-click placement
 * - Automatic linking to enclosed measurement areas
 * - Rich metadata collection (type, severity, description, requirements)
 * - Interactive editing and deletion of annotations
 * - Visual representation with color coding by type
 * - Modal UI for annotation details
 * - Real-time label positioning
 * - Data protection and validation
 */

import * as THREE from 'three';
import { Utils } from './utils.js';

export class AnnotationSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // State
    this.active = false;
    this.annotations = [];
    this.annotationIdCounter = 1;
    this.pendingAnnotationPoint = null;
    this.editingAnnotationId = null;
    
    // Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Visual settings
    this.ANNOTATION_COLORS = {
      'corrosion': 0xff4444,      // Red
      'crack': 0x8B4513,          // Brown
      'pitting': 0xff8800,        // Orange
      'structure': 0x4444ff,      // Blue
      'housekeeping': 0x8844ff    // Purple
    };
    
    this.DOT_RADIUS = 0.025;
    
    // Performance optimization
    this.labelUpdateTimer = null;
    this.LABEL_UPDATE_INTERVAL = 200; // 5fps as backup, main updates happen in render loop
  }

  /**
   * Initialize the annotation system
   */
  async init() {
    console.log('📍 Initializing annotation system...');
    
    this.setupEventListeners();
    this.setupModalHandlers();
    this.startLabelUpdates();
    
    console.log('✅ Annotation system initialized');
  }

  /**
   * Set up event listeners for annotation interactions
   */
  setupEventListeners() {
    // Mouse events for annotation placement
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.active) {
        this.handleClick(e);
      }
    });
    
    console.log('👂 Annotation event listeners attached');
  }

  /**
   * Set up modal event handlers
   */
  setupModalHandlers() {
    const modal = document.getElementById('annotation-modal');
    const saveBtn = document.getElementById('save-annotation');
    const cancelBtn = document.getElementById('cancel-annotation');
    const deleteBtn = document.getElementById('delete-annotation');
    const removeLinkBtn = document.getElementById('remove-measurement-link');
    const closeBtn = modal?.querySelector('.close');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveAnnotation();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelAnnotation();
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteAnnotation();
      });
    }
    
    if (removeLinkBtn) {
      removeLinkBtn.addEventListener('click', () => {
        this.removeMeasurementLink();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.cancelAnnotation();
      });
    }
    
    console.log('📋 Modal handlers setup complete');
  }

  /**
   * Activate annotation mode
   */
  activate() {
    this.active = true;
    console.log('📍 Annotation mode activated');
  }

  /**
   * Deactivate annotation mode
   */
  deactivate() {
    this.active = false;
    this.closeModal();
    console.log('📍 Annotation mode deactivated');
  }

  /**
   * Handle mouse click for annotation placement
   */
  handleClick(event) {
    // Check if clicking on existing annotation
    const clickedAnnotation = this.getClickedAnnotation(event);
    
    if (clickedAnnotation) {
      this.editAnnotation(clickedAnnotation);
      return;
    }
    
    // Get intersection point for new annotation
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Store point and show modal
    this.pendingAnnotationPoint = intersectionPoint;
    this.showAnnotationModal();
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
   * Get clicked annotation from mouse event
   */
  getClickedAnnotation(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if clicked on any annotation labels
    for (const annotation of this.annotations) {
      if (annotation.labelDiv) {
        const labelRect = annotation.labelDiv.getBoundingClientRect();
        const relativeRect = {
          left: labelRect.left - rect.left,
          top: labelRect.top - rect.top,
          right: labelRect.right - rect.left,
          bottom: labelRect.bottom - rect.top
        };
        
        if (x >= relativeRect.left && x <= relativeRect.right &&
            y >= relativeRect.top && y <= relativeRect.bottom) {
          return annotation;
        }
      }
    }
    
    return null;
  }

  /**
   * Show annotation modal
   */
  showAnnotationModal(annotation = null) {
    const modal = document.getElementById('annotation-modal');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-annotation');
    
    if (!modal) return;
    
    if (annotation) {
      // Editing existing annotation
      modalTitle.textContent = 'Edit Discrepancy';
      this.populateModalFields(annotation);
      deleteBtn.style.display = 'flex';
      this.editingAnnotationId = annotation.id;
    } else {
      // Creating new annotation
      modalTitle.textContent = 'Add Discrepancy';
      this.clearModalFields();
      this.generateNewAnnotationId();
      deleteBtn.style.display = 'none';
      this.editingAnnotationId = null;
    }
    
    // Show linked measurement info if applicable
    this.updateMeasurementLinkInfo();
    
    modal.style.display = 'block';
    
    // Focus on description field
    const descriptionField = document.getElementById('annotation-description');
    if (descriptionField) {
      setTimeout(() => descriptionField.focus(), 100);
    }
  }

  /**
   * Populate modal fields with annotation data
   */
  populateModalFields(annotation) {
    const fields = {
      'annotation-id': annotation.id,
      'annotation-title': annotation.title,
      'annotation-type': annotation.type,
      'annotation-severity': annotation.severity,
      'annotation-description': annotation.description,
      'ndt-required': annotation.ndtRequired,
      'abs-required': annotation.absRequired
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = Boolean(value);
        } else {
          field.value = value || '';
        }
      }
    });
  }

  /**
   * Clear all modal fields
   */
  clearModalFields() {
    const fieldIds = [
      'annotation-title', 'annotation-type', 'annotation-severity', 'annotation-description'
    ];
    
    fieldIds.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = field.type === 'select-one' ? field.options[0].value : '';
      }
    });
    
    // Clear checkboxes
    ['ndt-required', 'abs-required'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.checked = false;
      }
    });
  }

  /**
   * Generate new annotation ID
   */
  generateNewAnnotationId() {
    const newId = `D${this.annotationIdCounter.toString().padStart(3, '0')}`;
    const idField = document.getElementById('annotation-id');
    if (idField) {
      idField.value = newId;
    }
    return newId;
  }

  /**
   * Update measurement link information in modal
   */
  updateMeasurementLinkInfo() {
    const linkInfo = document.getElementById('measurement-link-info');
    const linkDetails = document.getElementById('measurement-details');
    
    if (!linkInfo || !linkDetails) return;
    
    let linkedMeasurement = null;
    
    // Check if editing existing annotation with existing link
    if (this.editingAnnotationId) {
      const annotation = this.annotations.find(a => a.id === this.editingAnnotationId);
      if (annotation && annotation.linkedMeasurement) {
        linkedMeasurement = annotation.linkedMeasurement;
      }
    }
    
    // If no existing link and we have a pending point, find new link
    if (!linkedMeasurement && this.pendingAnnotationPoint) {
      const measurementMatch = this.findEnclosingMeasurement(this.pendingAnnotationPoint);
      if (measurementMatch) {
        linkedMeasurement = measurementMatch;
      }
    }
    
    if (linkedMeasurement) {
      const measurement = linkedMeasurement.measurement || linkedMeasurement;
      const relationship = linkedMeasurement.relationship || 'inside';
      const distance = linkedMeasurement.distance || 0;
      
      let relationshipText = '';
      if (relationship === 'inside') {
        relationshipText = '📍 Inside measurement area';
      } else if (relationship === 'near_line') {
        relationshipText = `📏 Near measurement line (${Utils.formatDistance(distance, false)} away)`;
      }
      
      linkDetails.innerHTML = `
        <strong>Measurement ${measurement.id}</strong><br>
        ${relationshipText}<br>
        ${measurement.isClosed ? `Area: ${Utils.formatArea(measurement.area, false)}<br>` : ''}
        Perimeter: ${Utils.formatDistance(measurement.totalDistance, false)}
      `;
      linkInfo.style.display = 'block';
      
      // Store the link for saving
      this.currentMeasurementLink = linkedMeasurement;
    } else {
      linkInfo.style.display = 'none';
      this.currentMeasurementLink = null;
    }
  }

  /**
   * Remove measurement link
   */
  removeMeasurementLink() {
    this.currentMeasurementLink = null;
    this.updateMeasurementLinkInfo();
    console.log('🔗 Measurement link removed');
  }

  /**
   * Find measurement area that encloses the given point or nearby measurements
   */
  findEnclosingMeasurement(point) {
    // Get measurement system from global app
    if (!window.inspector3D || !window.inspector3D.measurement) {
      return null;
    }
    
    const measurements = window.inspector3D.measurement.measurements;
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const measurement of measurements) {
      // Check if point is inside closed measurement area
      if (measurement.isClosed && measurement.points.length >= 3) {
        if (Utils.isPointInPolygon(point, measurement.points)) {
          return {
            measurement: measurement,
            relationship: 'inside',
            distance: 0
          };
        }
      }
      
      // Check distance to measurement lines
      const lineDistance = this.getDistanceToMeasurementLines(point, measurement);
      if (lineDistance < 0.5 && lineDistance < bestDistance) { // Within 0.5 units
        bestMatch = {
          measurement: measurement,
          relationship: 'near_line',
          distance: lineDistance
        };
        bestDistance = lineDistance;
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate distance from point to measurement lines
   */
  getDistanceToMeasurementLines(point, measurement) {
    if (measurement.points.length < 2) return Infinity;
    
    let minDistance = Infinity;
    
    // Check distance to all line segments
    for (let i = 1; i < measurement.points.length; i++) {
      const distance = Utils.distancePointToLine(point, measurement.points[i-1], measurement.points[i]);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Check closing line if measurement is closed
    if (measurement.isClosed && measurement.points.length >= 3) {
      const distance = Utils.distancePointToLine(
        point, 
        measurement.points[measurement.points.length - 1], 
        measurement.points[0]
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  /**
   * Save annotation
   */
  saveAnnotation() {
    const annotationData = this.collectModalData();
    
    if (!this.validateAnnotationData(annotationData)) {
      return;
    }
    
    if (this.editingAnnotationId) {
      // Update existing annotation
      this.updateAnnotation(this.editingAnnotationId, annotationData);
    } else {
      // Create new annotation
      this.createAnnotation(annotationData);
    }
    
    this.closeModal();
  }

  /**
   * Collect data from modal fields
   */
  collectModalData() {
    return {
      id: document.getElementById('annotation-id')?.value || '',
      title: document.getElementById('annotation-title')?.value || '',
      type: document.getElementById('annotation-type')?.value || 'corrosion',
      severity: document.getElementById('annotation-severity')?.value || 'Low',
      description: document.getElementById('annotation-description')?.value || '',
      ndtRequired: document.getElementById('ndt-required')?.checked || false,
      absRequired: document.getElementById('abs-required')?.checked || false
    };
  }

  /**
   * Validate annotation data
   */
  validateAnnotationData(data) {
    if (!data.id.trim()) {
      alert('Annotation ID is required');
      return false;
    }
    
    if (!data.title.trim()) {
      alert('Title is required');
      return false;
    }
    
    if (!data.description.trim()) {
      alert('Description is required');
      return false;
    }
    
    return true;
  }

  /**
   * Create new annotation
   */
  createAnnotation(data) {
    if (!this.pendingAnnotationPoint) {
      console.error('❌ No pending annotation point');
      return;
    }
    
    const annotation = {
      id: data.id,
      title: data.title,
      type: data.type,
      severity: data.severity,
      description: data.description,
      ndtRequired: data.ndtRequired,
      absRequired: data.absRequired,
      position: this.pendingAnnotationPoint.clone(),
      linkedMeasurement: this.currentMeasurementLink || null,
      createdAt: new Date(),
      color: this.ANNOTATION_COLORS[data.type] || this.ANNOTATION_COLORS['corrosion']
    };

    // Log measurement link if exists
    if (annotation.linkedMeasurement) {
      const relationship = annotation.linkedMeasurement.relationship;
      const measurement = annotation.linkedMeasurement.measurement || annotation.linkedMeasurement;
      console.log(`🔗 Annotation ${annotation.id} linked to Measurement ${measurement.id} (${relationship})`);
    }
    
    // Create visual elements
    this.createAnnotationVisuals(annotation);
    
    // Add to array
    this.annotations.push(annotation);
    this.annotationIdCounter++;
    
    // Clear pending point and link
    this.pendingAnnotationPoint = null;
    this.currentMeasurementLink = null;
    
    console.log(`📍 Created annotation: ${annotation.id}`);
  }

  /**
   * Update existing annotation
   */
  updateAnnotation(annotationId, data) {
    const annotation = this.annotations.find(a => a.id === annotationId);
    if (!annotation) {
      console.error(`❌ Annotation not found: ${annotationId}`);
      return;
    }
    
    // Update data
    Object.assign(annotation, {
      title: data.title,
      type: data.type,
      severity: data.severity,
      description: data.description,
      ndtRequired: data.ndtRequired,
      absRequired: data.absRequired,
      color: this.ANNOTATION_COLORS[data.type] || this.ANNOTATION_COLORS['corrosion'],
      updatedAt: new Date()
    });
    
    // Update visuals
    this.updateAnnotationVisuals(annotation);
    
    console.log(`📝 Updated annotation: ${annotation.id}`);
  }

  /**
   * Create visual elements for annotation
   */
  createAnnotationVisuals(annotation) {
    // Create 3D dot
    const dotGeometry = new THREE.SphereGeometry(this.DOT_RADIUS, 16, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({ 
      color: annotation.color,
      transparent: true,
      opacity: 0.9
    });
    
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.copy(annotation.position);
    dot.userData = {
      type: 'annotationDot',
      annotationId: annotation.id
    };
    
    this.scene.add(dot);
    annotation.dot = dot;
    
    // Create label
    this.createAnnotationLabel(annotation);
  }

  /**
   * Create label for annotation
   */
  createAnnotationLabel(annotation) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'annotation-label';
    labelDiv.innerHTML = annotation.id;
    labelDiv.style.backgroundColor = this.getTypeColor(annotation.type);
    labelDiv.style.borderColor = this.getTypeBorderColor(annotation.type);
    labelDiv.style.cursor = 'pointer';
    
    // Add click handler
    labelDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editAnnotation(annotation);
    });
    
    document.body.appendChild(labelDiv);
    annotation.labelDiv = labelDiv;
  }

  /**
   * Get background color for annotation type
   */
  getTypeColor(type) {
    const colors = {
      'corrosion': '#ffebee',
      'crack': '#efebe9',
      'pitting': '#fff3e0',
      'structure': '#e3f2fd',
      'housekeeping': '#f3e5f5'
    };
    return colors[type] || colors['corrosion'];
  }

  /**
   * Get border color for annotation type
   */
  getTypeBorderColor(type) {
    const colors = {
      'corrosion': '#f44336',
      'crack': '#8d6e63',
      'structure': '#2196f3',
      'pitting': '#ff9800',
      'housekeeping': '#9c27b0'
    };
    return colors[type] || colors['corrosion'];
  }

  /**
   * Update annotation visuals
   */
  updateAnnotationVisuals(annotation) {
    // Update dot color
    if (annotation.dot) {
      annotation.dot.material.color.setHex(annotation.color);
    }
    
    // Update label
    if (annotation.labelDiv) {
      annotation.labelDiv.style.backgroundColor = this.getTypeColor(annotation.type);
      annotation.labelDiv.style.borderColor = this.getTypeBorderColor(annotation.type);
    }
  }

  /**
   * Edit existing annotation
   */
  editAnnotation(annotation) {
    this.showAnnotationModal(annotation);
  }

  /**
   * Delete annotation
   */
  deleteAnnotation() {
    if (!this.editingAnnotationId) return;
    
    if (!confirm('Are you sure you want to delete this annotation?')) {
      return;
    }
    
    const annotation = this.annotations.find(a => a.id === this.editingAnnotationId);
    if (annotation) {
      this.removeAnnotation(annotation);
    }
    
    this.closeModal();
  }

  /**
   * Remove annotation from scene and array
   */
  removeAnnotation(annotation) {
    // Remove 3D dot
    if (annotation.dot) {
      this.scene.remove(annotation.dot);
      Utils.disposeObject(annotation.dot);
    }
    
    // Remove label
    if (annotation.labelDiv && annotation.labelDiv.parentNode) {
      annotation.labelDiv.parentNode.removeChild(annotation.labelDiv);
    }
    
    // Remove from array
    const index = this.annotations.indexOf(annotation);
    if (index !== -1) {
      this.annotations.splice(index, 1);
    }
    
    console.log(`🗑️ Removed annotation: ${annotation.id}`);
  }

  /**
   * Cancel annotation creation/editing
   */
  cancelAnnotation() {
    this.pendingAnnotationPoint = null;
    this.editingAnnotationId = null;
    this.closeModal();
  }

  /**
   * Close annotation modal
   */
  closeModal() {
    const modal = document.getElementById('annotation-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    this.pendingAnnotationPoint = null;
    this.editingAnnotationId = null;
  }

  /**
   * Update all annotation labels (called periodically)
   */
  updateAllLabels() {
    this.annotations.forEach(annotation => {
      if (annotation.labelDiv && annotation.position) {
        const screenPos = Utils.projectToScreen(annotation.position, this.camera, this.renderer);
        annotation.labelDiv.style.left = `${screenPos.x}px`;
        annotation.labelDiv.style.top = `${screenPos.y}px`;
      }
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
      this.updateAllLabels();
    }, this.LABEL_UPDATE_INTERVAL);
  }

  /**
   * Clear current operation
   */
  clearCurrent() {
    this.closeModal();
  }

  /**
   * Update units (placeholder for future use)
   */
  updateUnits(newUnits) {
    console.log(`📍 Annotation units updated to: ${newUnits}`);
  }

  /**
   * Get annotation data for export
   */
  getExportData() {
    return this.annotations.map(annotation => ({
      id: annotation.id,
      title: annotation.title,
      type: annotation.type,
      severity: annotation.severity,
      description: annotation.description,
      ndtRequired: annotation.ndtRequired,
      absRequired: annotation.absRequired,
      position: {
        x: annotation.position.x,
        y: annotation.position.y,
        z: annotation.position.z
      },
      linkedMeasurement: annotation.linkedMeasurement ? {
        measurementId: (annotation.linkedMeasurement.measurement || annotation.linkedMeasurement).id,
        relationship: annotation.linkedMeasurement.relationship || 'inside',
        distance: annotation.linkedMeasurement.distance || 0,
        area: (annotation.linkedMeasurement.measurement || annotation.linkedMeasurement).area,
        perimeter: (annotation.linkedMeasurement.measurement || annotation.linkedMeasurement).totalDistance
      } : null,
      color: `#${annotation.color.toString(16).padStart(6, '0')}`,
      createdAt: annotation.createdAt.toISOString(),
      updatedAt: annotation.updatedAt ? annotation.updatedAt.toISOString() : null
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
    console.log('🗑️ Disposing annotation system...');
    
    // Clear all annotations
    this.annotations.forEach(annotation => {
      this.removeAnnotation(annotation);
    });
    
    // Stop label updates
    if (this.labelUpdateTimer) {
      clearInterval(this.labelUpdateTimer);
      this.labelUpdateTimer = null;
    }
    
    // Close modal
    this.closeModal();
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    console.log('✅ Annotation system disposed');
  }
}
