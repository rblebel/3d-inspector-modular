/**
 * REFERENCE.JS - Professional Reference Points System
 * 
 * Responsible for:
 * - Establishing named reference points and datums
 * - Coordinate transformation and relative positioning
 * - Professional inspection reference management
 * - Visual reference point indicators
 * - Reference point data persistence and export
 * - Industry-standard reference point workflows
 */

import * as THREE from 'three';
import { Utils } from './utils.js';

export class ReferenceSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // State
    this.active = false;
    this.referencePoints = [];
    this.referenceIdCounter = 1;
    
    // Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pendingReferencePoint = null;
    this.editingReferenceId = null;
    
    // Visual settings
    this.REFERENCE_HEIGHT = 0.15; // Height of reference marker
    this.REFERENCE_BASE_RADIUS = 0.04; // Base radius
    this.REFERENCE_COLORS = {
      primary: 0xFF6B35,    // Orange - highly visible
      secondary: 0x2E86AB,  // Blue
      active: 0x00FF00,     // Green when selected
      text: '#FF6B35'       // Orange text
    };
    
    console.log('📍 Reference system initialized');
  }

  /**
   * Initialize the reference system
   */
  async init() {
    console.log('📍 Initializing reference system...');
    
    this.setupEventListeners();
    this.setupUI();
    
    console.log('✅ Reference system ready');
  }

  /**
   * Set up event listeners for reference point interactions
   */
  setupEventListeners() {
    // Main click handler for placing reference points
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.active && !e.shiftKey && !e.ctrlKey) {
        this.handleClick(e);
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.active) {
        switch(e.key.toLowerCase()) {
          case 'escape':
            this.cancelPendingReference();
            break;
          case 'r':
            if (e.ctrlKey) {
              e.preventDefault();
              this.showReferenceManager();
            }
            break;
        }
      }
    });
    
    console.log('👂 Reference event listeners attached');
  }

  /**
   * Set up reference system UI components
   */
  setupUI() {
    // Add reference button to toolbar (will be called from main.js)
    this.createReferenceModal();
    this.createReferenceManagerModal();
  }

  /**
   * Create reference point creation modal
   */
  createReferenceModal() {
    const modalHTML = `
      <div id="reference-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2 id="reference-modal-title">📍 Add Reference Point</h2>
          
          <form id="reference-form">
            <div class="form-group">
              <label for="reference-name">Reference Name:</label>
              <input type="text" id="reference-name" name="name" 
                     placeholder="e.g., Lower Forward Right" required>
            </div>
            
            <div class="form-group">
              <label for="reference-description">Description:</label>
              <textarea id="reference-description" name="description" rows="2" 
                        placeholder="Brief description of this reference point"></textarea>
            </div>
            
            <div class="form-group">
              <label for="reference-type">Reference Type:</label>
              <select id="reference-type" name="type" required>
                <option value="primary">Primary Datum</option>
                <option value="secondary">Secondary Reference</option>
                <option value="landmark">Landmark</option>
                <option value="origin">Coordinate Origin</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Coordinates:</label>
              <div class="coordinate-display">
                <span id="reference-coordinates">Click on model to set position</span>
              </div>
            </div>
          </form>
          
          <div class="modal-actions">
            <button type="button" id="save-reference">💾 Save Reference</button>
            <button type="button" id="cancel-reference">❌ Cancel</button>
            <button type="button" id="delete-reference" style="display: none;">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.attachReferenceModalEvents();
  }

  /**
   * Create reference manager modal
   */
  createReferenceManagerModal() {
    const managerHTML = `
      <div id="reference-manager-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>📍 Reference Points Manager</h2>
          
          <div class="reference-manager-content">
            <div class="reference-list-header">
              <h3>Established Reference Points</h3>
              <button id="clear-all-references" class="btn-small btn-danger">🗑️ Clear All</button>
            </div>
            
            <div id="reference-list" class="reference-list">
              <!-- Reference points will be populated here -->
            </div>
            
            <div class="reference-actions">
              <button id="export-references">📤 Export References</button>
              <button id="import-references">📥 Import References</button>
              <input type="file" id="reference-file-input" accept=".json" style="display: none;">
            </div>
          </div>
          
          <div class="modal-actions">
            <button id="close-reference-manager">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', managerHTML);
    this.attachReferenceManagerEvents();
  }

  /**
   * Attach events to reference modal
   */
  attachReferenceModalEvents() {
    const modal = document.getElementById('reference-modal');
    const closeBtn = modal.querySelector('.close');
    const saveBtn = document.getElementById('save-reference');
    const cancelBtn = document.getElementById('cancel-reference');
    const deleteBtn = document.getElementById('delete-reference');
    
    closeBtn.onclick = () => this.hideReferenceModal();
    cancelBtn.onclick = () => this.hideReferenceModal();
    saveBtn.onclick = () => this.saveReference();
    deleteBtn.onclick = () => this.deleteReference();
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hideReferenceModal();
      }
    };
  }

  /**
   * Attach events to reference manager modal
   */
  attachReferenceManagerEvents() {
    const modal = document.getElementById('reference-manager-modal');
    const closeBtn = modal.querySelector('.close');
    const closeManagerBtn = document.getElementById('close-reference-manager');
    const clearAllBtn = document.getElementById('clear-all-references');
    const exportBtn = document.getElementById('export-references');
    const importBtn = document.getElementById('import-references');
    const fileInput = document.getElementById('reference-file-input');
    
    closeBtn.onclick = () => this.hideReferenceManager();
    closeManagerBtn.onclick = () => this.hideReferenceManager();
    clearAllBtn.onclick = () => this.clearAllReferences();
    exportBtn.onclick = () => this.exportReferences();
    importBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = (e) => this.importReferences(e);
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hideReferenceManager();
      }
    };
  }

  /**
   * Activate reference point mode
   */
  activate() {
    this.active = true;
    this.showReferenceReadout();
    console.log('📍 Reference point mode activated');
  }

  /**
   * Deactivate reference point mode
   */
  deactivate() {
    this.active = false;
    this.hideReferenceReadout();
    this.cancelPendingReference();
    console.log('📍 Reference point mode deactivated');
  }

  /**
   * Handle mouse click for reference point placement
   */
  handleClick(event) {
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Store pending point and show modal
    this.pendingReferencePoint = intersectionPoint;
    this.showReferenceModal();
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
   * Show reference modal
   */
  showReferenceModal() {
    const modal = document.getElementById('reference-modal');
    const coordinatesSpan = document.getElementById('reference-coordinates');
    
    if (this.pendingReferencePoint) {
      const coords = this.pendingReferencePoint;
      const units = Utils.getMeshUnits();
      coordinatesSpan.textContent = `X: ${coords.x.toFixed(3)} Y: ${coords.y.toFixed(3)} Z: ${coords.z.toFixed(3)} (${units})`;
    }
    
    // Clear form if not editing
    if (!this.editingReferenceId) {
      this.clearReferenceModalFields();
    }
    
    modal.style.display = 'block';
  }

  /**
   * Hide reference modal
   */
  hideReferenceModal() {
    const modal = document.getElementById('reference-modal');
    modal.style.display = 'none';
    this.cancelPendingReference();
  }

  /**
   * Clear reference modal fields
   */
  clearReferenceModalFields() {
    const fields = [
      'reference-name',
      'reference-description'
    ];
    
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
    
    // Reset type to default
    const typeSelect = document.getElementById('reference-type');
    if (typeSelect) typeSelect.value = 'primary';
    
    // Hide delete button for new references
    const deleteBtn = document.getElementById('delete-reference');
    if (deleteBtn) deleteBtn.style.display = 'none';
  }

  /**
   * Save reference point
   */
  saveReference() {
    if (!this.pendingReferencePoint) {
      console.error('❌ No pending reference point');
      return;
    }
    
    // Collect form data
    const name = document.getElementById('reference-name').value.trim();
    const description = document.getElementById('reference-description').value.trim();
    const type = document.getElementById('reference-type').value;
    
    if (!name) {
      alert('Please enter a reference point name');
      return;
    }
    
    // Check for duplicate names
    if (this.referencePoints.some(ref => ref.name === name && ref.id !== this.editingReferenceId)) {
      alert('A reference point with this name already exists');
      return;
    }
    
    if (this.editingReferenceId) {
      // Update existing reference
      this.updateReference(this.editingReferenceId, {
        name, description, type
      });
    } else {
      // Create new reference
      this.createReference({
        name, description, type,
        position: this.pendingReferencePoint
      });
    }
    
    this.hideReferenceModal();
  }

  /**
   * Create new reference point
   */
  createReference(data) {
    const reference = {
      id: `REF${this.referenceIdCounter++}`,
      name: data.name,
      description: data.description || '',
      type: data.type,
      position: data.position.clone(),
      createdAt: new Date(),
      color: this.getReferenceColor(data.type)
    };
    
    // Create visual representation
    this.createReferenceVisuals(reference);
    
    // Add to array
    this.referencePoints.push(reference);
    
    console.log(`📍 Created reference point: ${reference.name} (${reference.id})`);
    
    // Update UI
    this.updateReferenceReadout();
    this.updateReferenceManager();
  }

  /**
   * Update existing reference point
   */
  updateReference(referenceId, updates) {
    const reference = this.referencePoints.find(ref => ref.id === referenceId);
    if (!reference) return;
    
    // Update data
    Object.assign(reference, updates);
    reference.updatedAt = new Date();
    
    // Update visuals
    this.updateReferenceVisuals(reference);
    
    console.log(`📍 Updated reference point: ${reference.name} (${reference.id})`);
    
    // Clear editing state
    this.editingReferenceId = null;
    
    // Update UI
    this.updateReferenceManager();
  }

  /**
   * Delete reference point
   */
  deleteReference() {
    if (!this.editingReferenceId) return;
    
    const reference = this.referencePoints.find(ref => ref.id === this.editingReferenceId);
    if (!reference) return;
    
    if (confirm(`Delete reference point "${reference.name}"?`)) {
      // Remove visuals
      this.removeReferenceVisuals(reference);
      
      // Remove from array
      const index = this.referencePoints.indexOf(reference);
      this.referencePoints.splice(index, 1);
      
      console.log(`🗑️ Deleted reference point: ${reference.name}`);
      
      // Update UI
      this.hideReferenceModal();
      this.updateReferenceManager();
      this.updateReferenceReadout();
    }
  }

  /**
   * Get color for reference type
   */
  getReferenceColor(type) {
    const colors = {
      primary: this.REFERENCE_COLORS.primary,
      secondary: this.REFERENCE_COLORS.secondary,
      landmark: 0x9B59B6,  // Purple
      origin: 0xE74C3C     // Red
    };
    
    return colors[type] || this.REFERENCE_COLORS.primary;
  }

  /**
   * Create visual representation of reference point
   */
  createReferenceVisuals(reference) {
    const group = new THREE.Group();
    
    // Create distinctive reference marker (pyramid + base)
    const baseGeometry = new THREE.CylinderGeometry(
      this.REFERENCE_BASE_RADIUS, 
      this.REFERENCE_BASE_RADIUS, 
      0.02, 
      16
    );
    const baseMaterial = new THREE.MeshBasicMaterial({ 
      color: reference.color,
      transparent: true,
      opacity: 0.8
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.01;
    group.add(base);
    
    // Create pyramid marker
    const pyramidGeometry = new THREE.ConeGeometry(
      this.REFERENCE_BASE_RADIUS * 0.7, 
      this.REFERENCE_HEIGHT, 
      4
    );
    const pyramidMaterial = new THREE.MeshBasicMaterial({ 
      color: reference.color
    });
    const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
    pyramid.position.y = this.REFERENCE_HEIGHT / 2 + 0.02;
    pyramid.rotation.y = Math.PI / 4; // Rotate 45 degrees for diamond shape
    group.add(pyramid);
    
    // Create text label
    this.createReferenceLabel(reference, group);
    
    // Position and add to scene
    group.position.copy(reference.position);
    group.userData = {
      type: 'referencePoint',
      referenceId: reference.id
    };
    
    this.scene.add(group);
    reference.group = group;
  }

  /**
   * Create text label for reference point
   */
  createReferenceLabel(reference, group) {
    // Create HTML label (similar to measurement labels)
    const labelDiv = document.createElement('div');
    labelDiv.className = 'reference-label';
    labelDiv.innerHTML = `<strong>${reference.name}</strong><br><small>${reference.type}</small>`;
    labelDiv.style.position = 'absolute';
    labelDiv.style.padding = '4px 8px';
    labelDiv.style.backgroundColor = this.REFERENCE_COLORS.text;
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.pointerEvents = 'auto';
    labelDiv.style.cursor = 'pointer';
    labelDiv.style.border = '1px solid white';
    labelDiv.style.zIndex = '1000';
    
    // Click handler for editing
    labelDiv.onclick = (e) => {
      e.stopPropagation();
      this.editReference(reference.id);
    };
    
    document.body.appendChild(labelDiv);
    reference.labelDiv = labelDiv;
  }

  /**
   * Update reference point visuals
   */
  updateReferenceVisuals(reference) {
    if (!reference.group || !reference.labelDiv) return;
    
    // Update label text
    reference.labelDiv.innerHTML = `<strong>${reference.name}</strong><br><small>${reference.type}</small>`;
    
    // Update colors if type changed
    const newColor = this.getReferenceColor(reference.type);
    if (newColor !== reference.color) {
      reference.color = newColor;
      
      // Update 3D object colors
      reference.group.children.forEach(child => {
        if (child.material) {
          child.material.color.setHex(newColor);
        }
      });
    }
  }

  /**
   * Remove reference point visuals
   */
  removeReferenceVisuals(reference) {
    if (reference.group) {
      this.scene.remove(reference.group);
      Utils.disposeObject(reference.group);
    }
    
    if (reference.labelDiv) {
      document.body.removeChild(reference.labelDiv);
    }
  }

  /**
   * Edit reference point
   */
  editReference(referenceId) {
    const reference = this.referencePoints.find(ref => ref.id === referenceId);
    if (!reference) return;
    
    this.editingReferenceId = referenceId;
    this.pendingReferencePoint = reference.position.clone();
    
    // Populate modal fields
    document.getElementById('reference-name').value = reference.name;
    document.getElementById('reference-description').value = reference.description;
    document.getElementById('reference-type').value = reference.type;
    
    // Show delete button
    document.getElementById('delete-reference').style.display = 'inline-block';
    
    // Update modal title
    document.getElementById('reference-modal-title').textContent = '📍 Edit Reference Point';
    
    this.showReferenceModal();
  }

  /**
   * Cancel pending reference point
   */
  cancelPendingReference() {
    this.pendingReferencePoint = null;
    this.editingReferenceId = null;
    
    // Reset modal title
    const titleElement = document.getElementById('reference-modal-title');
    if (titleElement) {
      titleElement.textContent = '📍 Add Reference Point';
    }
  }

  /**
   * Show reference readout
   */
  showReferenceReadout() {
    let readout = document.getElementById('reference-readout');
    if (!readout) {
      readout = document.createElement('div');
      readout.id = 'reference-readout';
      readout.className = 'measurement-readout'; // Reuse measurement readout styling
      document.body.appendChild(readout);
    }
    
    readout.style.display = 'block';
    this.updateReferenceReadout();
  }

  /**
   * Hide reference readout
   */
  hideReferenceReadout() {
    const readout = document.getElementById('reference-readout');
    if (readout) {
      readout.style.display = 'none';
    }
  }

  /**
   * Update reference readout content
   */
  updateReferenceReadout() {
    const readout = document.getElementById('reference-readout');
    if (!readout || !this.active) return;
    
    const count = this.referencePoints.length;
    
    if (count === 0) {
      readout.innerHTML = `
        <strong>📍 Reference Point Mode</strong><br>
        <small>Click on model to place reference points<br>
        Ctrl+R: Reference Manager | ESC: Cancel</small>
      `;
    } else {
      readout.innerHTML = `
        <strong>📍 Reference Points: ${count}</strong><br>
        <small>Click to add more reference points<br>
        Click labels to edit | Ctrl+R: Manager</small>
      `;
    }
  }

  /**
   * Show reference manager
   */
  showReferenceManager() {
    this.updateReferenceManager();
    const modal = document.getElementById('reference-manager-modal');
    modal.style.display = 'block';
  }

  /**
   * Hide reference manager
   */
  hideReferenceManager() {
    const modal = document.getElementById('reference-manager-modal');
    modal.style.display = 'none';
  }

  /**
   * Update reference manager content
   */
  updateReferenceManager() {
    const listContainer = document.getElementById('reference-list');
    if (!listContainer) return;
    
    if (this.referencePoints.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>No reference points established</p>
          <small>Use Reference Point mode to add reference points</small>
        </div>
      `;
      return;
    }
    
    let html = '';
    this.referencePoints.forEach(ref => {
      const coords = ref.position;
      const units = Utils.getMeshUnits();
      
      html += `
        <div class="reference-item" data-reference-id="${ref.id}">
          <div class="reference-header">
            <strong>${ref.name}</strong>
            <span class="reference-type">${ref.type}</span>
          </div>
          <div class="reference-details">
            <div class="reference-coords">
              X: ${coords.x.toFixed(3)} Y: ${coords.y.toFixed(3)} Z: ${coords.z.toFixed(3)} (${units})
            </div>
            ${ref.description ? `<div class="reference-description">${ref.description}</div>` : ''}
            <div class="reference-actions">
              <button class="btn-small edit-reference" onclick="window.inspector3D?.reference?.editReference('${ref.id}')">✏️ Edit</button>
              <button class="btn-small focus-reference" onclick="window.inspector3D?.reference?.focusOnReference('${ref.id}')">🎯 Focus</button>
            </div>
          </div>
        </div>
      `;
    });
    
    listContainer.innerHTML = html;
  }

  /**
   * Focus camera on reference point
   */
  focusOnReference(referenceId) {
    const reference = this.referencePoints.find(ref => ref.id === referenceId);
    if (!reference) return;
    
    // Use main app's camera controls if available
    if (window.inspector3D && window.inspector3D.controls) {
      const controls = window.inspector3D.controls.controls;
      if (controls && controls.target) {
        controls.target.copy(reference.position);
        controls.update();
        console.log(`🎯 Focused on reference point: ${reference.name}`);
      }
    }
  }

  /**
   * Clear all reference points
   */
  clearAllReferences() {
    if (this.referencePoints.length === 0) return;
    
    if (confirm(`Delete all ${this.referencePoints.length} reference points?`)) {
      // Remove all visuals
      this.referencePoints.forEach(ref => {
        this.removeReferenceVisuals(ref);
      });
      
      // Clear array
      this.referencePoints = [];
      this.referenceIdCounter = 1;
      
      console.log('🗑️ Cleared all reference points');
      
      // Update UI
      this.updateReferenceManager();
      this.updateReferenceReadout();
    }
  }

  /**
   * Export reference points
   */
  exportReferences() {
    if (this.referencePoints.length === 0) {
      alert('No reference points to export');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      units: Utils.getMeshUnits(),
      coordinate_system: 'Right-handed (Y-up)',
      reference_points: this.referencePoints.map(ref => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        type: ref.type,
        position: {
          x: ref.position.x,
          y: ref.position.y,
          z: ref.position.z
        },
        color: `#${ref.color.toString(16).padStart(6, '0')}`,
        created: ref.createdAt.toISOString(),
        updated: ref.updatedAt?.toISOString()
      }))
    };
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reference-points-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📤 Exported ${this.referencePoints.length} reference points`);
  }

  /**
   * Import reference points
   */
  importReferences(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.reference_points || !Array.isArray(data.reference_points)) {
          throw new Error('Invalid reference points file format');
        }
        
        // Clear existing references
        this.clearAllReferences();
        
        // Import reference points
        data.reference_points.forEach(refData => {
          const reference = {
            id: refData.id || `REF${this.referenceIdCounter++}`,
            name: refData.name,
            description: refData.description || '',
            type: refData.type || 'primary',
            position: new THREE.Vector3(
              refData.position.x,
              refData.position.y,
              refData.position.z
            ),
            createdAt: refData.created ? new Date(refData.created) : new Date(),
            updatedAt: refData.updated ? new Date(refData.updated) : null,
            color: refData.color ? parseInt(refData.color.replace('#', ''), 16) : this.getReferenceColor(refData.type || 'primary')
          };
          
          this.createReferenceVisuals(reference);
          this.referencePoints.push(reference);
        });
        
        // Update counter
        const maxId = Math.max(...this.referencePoints.map(ref => 
          parseInt(ref.id.replace('REF', '')) || 0
        ), 0);
        this.referenceIdCounter = maxId + 1;
        
        console.log(`📥 Imported ${data.reference_points.length} reference points`);
        
        // Update UI
        this.updateReferenceManager();
        this.updateReferenceReadout();
        
        alert(`Successfully imported ${data.reference_points.length} reference points`);
        
      } catch (error) {
        console.error('❌ Failed to import reference points:', error);
        alert('Failed to import reference points. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  /**
   * Get relative coordinates from reference point
   */
  getRelativeCoordinates(point, referenceId) {
    const reference = this.referencePoints.find(ref => ref.id === referenceId);
    if (!reference) return null;
    
    const relative = point.clone().sub(reference.position);
    
    return {
      reference: reference,
      coordinates: relative,
      distance: relative.length(),
      formatted: {
        x: relative.x,
        y: relative.y,
        z: relative.z,
        distance: relative.length()
      }
    };
  }

  /**
   * Get export data
   */
  getExportData() {
    return {
      referencePoints: this.referencePoints.map(ref => ({
        id: ref.id,
        name: ref.name,
        description: ref.description,
        type: ref.type,
        position: {
          x: ref.position.x,
          y: ref.position.y,
          z: ref.position.z
        },
        color: `#${ref.color.toString(16).padStart(6, '0')}`,
        createdAt: ref.createdAt.toISOString(),
        updatedAt: ref.updatedAt?.toISOString()
      }))
    };
  }

  /**
   * Update label positions (called from render loop)
   */
  updateLabelPositions() {
    this.referencePoints.forEach(reference => {
      if (reference.labelDiv && reference.position) {
        const vector = reference.position.clone().project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        reference.labelDiv.style.left = `${x + 20}px`;
        reference.labelDiv.style.top = `${y - 10}px`;
        
        // Hide labels that are behind the camera or too far
        const distance = this.camera.position.distanceTo(reference.position);
        const isVisible = vector.z < 1 && distance < 100;
        reference.labelDiv.style.display = isVisible ? 'block' : 'none';
      }
    });
  }

  /**
   * Handle resize event
   */
  handleResize() {
    // Labels will be repositioned on next update cycle
  }

  /**
   * Dispose of reference system
   */
  dispose() {
    console.log('🗑️ Disposing reference system...');
    
    // Remove all reference points
    this.clearAllReferences();
    
    // Remove modals
    const referenceModal = document.getElementById('reference-modal');
    if (referenceModal) referenceModal.remove();
    
    const managerModal = document.getElementById('reference-manager-modal');
    if (managerModal) managerModal.remove();
    
    // Remove readout
    const readout = document.getElementById('reference-readout');
    if (readout) readout.remove();
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    console.log('✅ Reference system disposed');
  }
}
