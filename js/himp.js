/**
 * HIMP.JS - Hull Inspection and Maintenance Program Scoring System
 * 
 * Responsible for:
 * - HIMP scoring assessment (0-6 scale) for surface conditions
 * - Surface zone selection and identification
 * - Sample photo upload and management
 * - Recoating recommendation logic
 * - Visual heatmap overlays for scored zones
 * - Integration with existing inspection workflow
 */

import * as THREE from 'three';
import { Utils } from './utils.js';

export class HIMPSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // State
    this.active = false;
    this.himpScores = [];
    this.himpIdCounter = 1;
    this.pendingSurfacePoint = null;
    this.editingHimpId = null;
    
    // Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // HIMP scoring categories with tooltips
    this.himpCategories = {
      coating_condition: {
        label: 'Coating Condition',
        tooltip: '0: Excellent (no defects) | 1: Very Good (<2% breakdown) | 2: Good (2-5%) | 3: Fair (5-15%) | 4: Poor (15-30%) | 5: Very Poor (30-60%) | 6: Unacceptable (>60%)',
        icon: '🎨'
      },
      general_corrosion: {
        label: 'General Corrosion',
        tooltip: '0: No corrosion | 1: Trace (<5% surface) | 2: Light (5-15%) | 3: Moderate (15-30%) | 4: Heavy (30-50%) | 5: Severe (50-80%) | 6: Very Severe (>80%)',
        icon: '🦠'
      },
      pitting_grooving: {
        label: 'Pitting & Grooving',
        tooltip: '0: None | 1: Isolated shallow pits | 2: Scattered pits <1mm deep | 3: General pitting 1-2mm | 4: Deep pitting 2-5mm | 5: Severe pitting >5mm | 6: Through-thickness penetration',
        icon: '🕳️'
      },
      deformation: {
        label: 'Deformation',
        tooltip: '0: No deformation | 1: Minor buckles/dents | 2: Local permanent set | 3: Significant distortion | 4: Major structural damage | 5: Severe deformation | 6: Structural failure',
        icon: '⚡'
      },
      fracture: {
        label: 'Fracture',
        tooltip: '0: No cracks | 1: Hair-line cracks | 2: Fine cracks <50mm | 3: Cracks 50-150mm | 4: Long cracks >150mm | 5: Multiple intersecting cracks | 6: Through-thickness cracks',
        icon: '🔺'
      },
      cleanliness: {
        label: 'Cleanliness & Housekeeping',
        tooltip: '0: Excellent cleanliness | 1: Very good | 2: Good (minor debris) | 3: Fair (moderate contamination) | 4: Poor (significant debris) | 5: Very poor | 6: Unacceptable contamination',
        icon: '🧹'
      }
    };
    
    // Visual settings
    this.ZONE_MARKER_SIZE = 0.08;
    this.ZONE_COLORS = {
      safe: 0x4CAF50,      // Green (scores 0-1)
      caution: 0xFF9800,   // Orange (score 2)
      warning: 0xF44336,   // Red (scores 3+)
      pending: 0x2196F3    // Blue (not scored)
    };
    
    console.log('📊 HIMP scoring system initialized');
  }

  /**
   * Initialize the HIMP system
   */
  async init() {
    console.log('📊 Initializing HIMP system...');
    
    this.setupEventListeners();
    this.setupUI();
    
    console.log('✅ HIMP system ready');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Main click handler for surface selection
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.active && !e.shiftKey && !e.ctrlKey) {
        this.handleSurfaceClick(e);
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.active) {
        switch(e.key.toLowerCase()) {
          case 'escape':
            this.cancelPendingHimp();
            break;
          case 'h':
            if (e.ctrlKey) {
              e.preventDefault();
              this.showHimpManager();
            }
            break;
        }
      }
    });
    
    console.log('👂 HIMP event listeners attached');
  }

  /**
   * Set up HIMP system UI components
   */
  setupUI() {
    this.createHimpModal();
    this.createHimpManagerModal();
  }

  /**
   * Create HIMP scoring modal
   */
  createHimpModal() {
    const modalHTML = `
      <div id="himp-modal" class="modal">
        <div id="himp-modal-content" class="himp-modal-content">
          <span class="close">&times;</span>
          <h2 id="himp-modal-title">📊 HIMP Surface Assessment</h2>
          
          <form id="himp-form">
            <div class="form-group">
              <label for="himp-surface-id">Surface ID:</label>
              <input type="text" id="himp-surface-id" name="surfaceId" 
                     placeholder="e.g., Z-AFT-STBD-TOP" required>
            </div>
            
            <div class="himp-scoring-grid">
              ${Object.entries(this.himpCategories).map(([key, category]) => `
                <div class="himp-score-item">
                  <label for="himp-${key}">
                    ${category.icon} ${category.label}:
                    <span class="tooltip-trigger" data-tooltip="${category.tooltip}">ℹ️</span>
                  </label>
                  <select id="himp-${key}" name="${key}" required>
                    <option value="">Select Score</option>
                    <option value="0">0 - Excellent</option>
                    <option value="1">1 - Very Good</option>
                    <option value="2">2 - Good</option>
                    <option value="3">3 - Fair</option>
                    <option value="4">4 - Poor</option>
                    <option value="5">5 - Very Poor</option>
                    <option value="6">6 - Unacceptable</option>
                  </select>
                </div>
              `).join('')}
            </div>
            
            <div class="form-group">
              <label for="himp-photo">Sample Photo:</label>
              <input type="file" id="himp-photo" name="photo" accept="image/jpeg,image/png">
              <small>Upload JPEG or PNG reference image</small>
              <div id="photo-preview" style="display: none;">
                <img id="photo-preview-img" style="max-width: 200px; max-height: 150px; margin-top: 8px;">
              </div>
            </div>
            
            <div class="form-group">
              <label for="himp-notes">Notes:</label>
              <textarea id="himp-notes" name="notes" rows="3" 
                        placeholder="Additional observations, coating breakdown details, etc."></textarea>
            </div>
            
            <!-- Position Info -->
            <div class="form-group">
              <label>Surface Position:</label>
              <div class="coordinate-display">
                <span id="himp-coordinates">Click on model to set position</span>
              </div>
            </div>
            
            <!-- Recommendation Display -->
            <div id="himp-recommendation" class="himp-recommendation" style="display: none;">
              <div class="recommendation-content">
                <span class="recommendation-icon">⚠️</span>
                <span class="recommendation-text">Recoating recommended at next drydocking</span>
              </div>
            </div>
          </form>
          
          <div class="modal-actions">
            <button type="button" id="save-himp">💾 Save Assessment</button>
            <button type="button" id="cancel-himp">❌ Cancel</button>
            <button type="button" id="delete-himp" style="display: none;">🗑️ Delete</button>
            <button type="button" id="create-discrepancy-from-himp" style="display: none;">📍 Create Discrepancy</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.attachHimpModalEvents();
  }

  /**
   * Create HIMP manager modal
   */
  createHimpManagerModal() {
    const managerHTML = `
      <div id="himp-manager-modal" class="modal">
        <div id="himp-manager-content" class="himp-manager-modal-content">
          <span class="close">&times;</span>
          <h2>📊 HIMP Assessments Manager</h2>
          
          <div class="himp-manager-content">
            <div class="himp-stats-bar">
              <div class="stat-item">
                <span class="stat-value" id="total-assessments">0</span>
                <span class="stat-label">Assessments</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="recoat-recommendations">0</span>
                <span class="stat-label">Recoat Needed</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="average-score">0.0</span>
                <span class="stat-label">Avg Score</span>
              </div>
            </div>
            
            <div class="himp-list-header">
              <h3>Surface Assessments</h3>
              <div class="himp-actions">
                <button id="toggle-heatmap" class="btn-small">🗺️ Toggle Heatmap</button>
                <button id="clear-all-himp" class="btn-small btn-danger">🗑️ Clear All</button>
              </div>
            </div>
            
            <div id="himp-list" class="himp-list">
              <!-- HIMP assessments will be populated here -->
            </div>
            
            <div class="himp-export-actions">
              <button id="export-himp-csv">📊 Export CSV</button>
              <button id="export-himp-json">📤 Export JSON</button>
            </div>
          </div>
          
          <div class="modal-actions">
            <button id="close-himp-manager">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', managerHTML);
    this.attachHimpManagerEvents();
  }

  /**
   * Attach events to HIMP modal
   */
  attachHimpModalEvents() {
    const modal = document.getElementById('himp-modal');
    const modalContent = document.getElementById('himp-modal-content');
    const closeBtn = modalContent.querySelector('.close');
    const saveBtn = document.getElementById('save-himp');
    const cancelBtn = document.getElementById('cancel-himp');
    const deleteBtn = document.getElementById('delete-himp');
    const createDiscrepancyBtn = document.getElementById('create-discrepancy-from-himp');
    const photoInput = document.getElementById('himp-photo');
    
    closeBtn.onclick = () => this.hideHimpModal();
    cancelBtn.onclick = () => this.hideHimpModal();
    saveBtn.onclick = () => this.saveHimpAssessment();
    deleteBtn.onclick = () => this.deleteHimpAssessment();
    createDiscrepancyBtn.onclick = () => this.createDiscrepancyFromHimp();
    
    // Photo preview
    photoInput.onchange = (e) => this.handlePhotoUpload(e);
    
    // Real-time recommendation update
    Object.keys(this.himpCategories).forEach(key => {
      const select = document.getElementById(`himp-${key}`);
      if (select) {
        select.addEventListener('change', () => this.updateRecommendation());
      }
    });
    
    // Tooltip handling
    this.setupTooltips();
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hideHimpModal();
      }
    };
  }

  /**
   * Attach events to HIMP manager modal
   */
  attachHimpManagerEvents() {
    const modal = document.getElementById('himp-manager-modal');
    const modalContent = document.getElementById('himp-manager-content');
    const closeBtn = modalContent.querySelector('.close');
    const closeManagerBtn = document.getElementById('close-himp-manager');
    const clearAllBtn = document.getElementById('clear-all-himp');
    const toggleHeatmapBtn = document.getElementById('toggle-heatmap');
    const exportCsvBtn = document.getElementById('export-himp-csv');
    const exportJsonBtn = document.getElementById('export-himp-json');
    
    closeBtn.onclick = () => this.hideHimpManager();
    closeManagerBtn.onclick = () => this.hideHimpManager();
    clearAllBtn.onclick = () => this.clearAllHimpAssessments();
    toggleHeatmapBtn.onclick = () => this.toggleHeatmap();
    exportCsvBtn.onclick = () => this.exportHimpCSV();
    exportJsonBtn.onclick = () => this.exportHimpJSON();
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hideHimpManager();
      }
    };
  }

  /**
   * Set up tooltips for HIMP scoring
   */
  setupTooltips() {
    const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
    
    tooltipTriggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', (e) => {
        const tooltip = e.target.dataset.tooltip;
        this.showTooltip(e.target, tooltip);
      });
      
      trigger.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  /**
   * Show tooltip
   */
  showTooltip(element, text) {
    let tooltip = document.getElementById('himp-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'himp-tooltip';
      tooltip.className = 'himp-tooltip';
      document.body.appendChild(tooltip);
    }
    
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.getElementById('himp-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Activate HIMP assessment mode
   */
  activate() {
    this.active = true;
    this.showHimpReadout();
    console.log('📊 HIMP assessment mode activated');
  }

  /**
   * Deactivate HIMP assessment mode
   */
  deactivate() {
    this.active = false;
    this.hideHimpReadout();
    this.cancelPendingHimp();
    console.log('📊 HIMP assessment mode deactivated');
  }

  /**
   * Handle surface click for HIMP assessment
   */
  handleSurfaceClick(event) {
    const intersectionPoint = this.getIntersectionPoint(event);
    if (!intersectionPoint) return;
    
    // Store pending surface point and show modal
    this.pendingSurfacePoint = intersectionPoint;
    this.showHimpModal();
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
   * Show HIMP modal
   */
  showHimpModal() {
    const modal = document.getElementById('himp-modal');
    const coordinatesSpan = document.getElementById('himp-coordinates');
    
    if (this.pendingSurfacePoint) {
      const coords = this.pendingSurfacePoint;
      const units = Utils.getMeshUnits();
      coordinatesSpan.textContent = `X: ${coords.x.toFixed(3)} Y: ${coords.y.toFixed(3)} Z: ${coords.z.toFixed(3)} (${units})`;
    }
    
    // Clear form if not editing
    if (!this.editingHimpId) {
      this.clearHimpModalFields();
    }
    
    modal.style.display = 'block';
  }

  /**
   * Hide HIMP modal
   */
  hideHimpModal() {
    const modal = document.getElementById('himp-modal');
    modal.style.display = 'none';
    this.cancelPendingHimp();
  }

  /**
   * Clear HIMP modal fields
   */
  clearHimpModalFields() {
    const fields = [
      'himp-surface-id',
      'himp-notes'
    ];
    
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
    
    // Reset all scoring dropdowns
    Object.keys(this.himpCategories).forEach(key => {
      const select = document.getElementById(`himp-${key}`);
      if (select) select.value = '';
    });
    
    // Clear photo
    const photoInput = document.getElementById('himp-photo');
    if (photoInput) photoInput.value = '';
    
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) photoPreview.style.display = 'none';
    
    // Hide delete button for new assessments
    const deleteBtn = document.getElementById('delete-himp');
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    const createDiscrepancyBtn = document.getElementById('create-discrepancy-from-himp');
    if (createDiscrepancyBtn) createDiscrepancyBtn.style.display = 'none';
    
    // Hide recommendation
    const recommendation = document.getElementById('himp-recommendation');
    if (recommendation) recommendation.style.display = 'none';
  }

  /**
   * Handle photo upload
   */
  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert('Please select a JPEG or PNG image file');
      event.target.value = '';
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      event.target.value = '';
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('photo-preview');
      const img = document.getElementById('photo-preview-img');
      
      img.src = e.target.result;
      preview.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
  }

  /**
   * Update recoating recommendation based on scores
   */
  updateRecommendation() {
    const scores = this.getCurrentScores();
    const recommendRecoat = Object.values(scores).some(score => score >= 2);
    
    const recommendation = document.getElementById('himp-recommendation');
    if (recommendation) {
      if (recommendRecoat) {
        recommendation.style.display = 'block';
        recommendation.className = 'himp-recommendation warning';
      } else {
        recommendation.style.display = 'none';
      }
    }
    
    return recommendRecoat;
  }

  /**
   * Get current scores from form
   */
  getCurrentScores() {
    const scores = {};
    
    Object.keys(this.himpCategories).forEach(key => {
      const select = document.getElementById(`himp-${key}`);
      if (select && select.value !== '') {
        scores[key] = parseInt(select.value);
      }
    });
    
    return scores;
  }

  /**
   * Save HIMP assessment
   */
  saveHimpAssessment() {
    if (!this.pendingSurfacePoint) {
      console.error('❌ No pending surface point');
      return;
    }
    
    // Collect form data
    const surfaceId = document.getElementById('himp-surface-id').value.trim();
    const notes = document.getElementById('himp-notes').value.trim();
    const scores = this.getCurrentScores();
    const photoFile = document.getElementById('himp-photo').files[0];
    
    if (!surfaceId) {
      alert('Please enter a Surface ID');
      return;
    }
    
    // Validate that all scores are provided
    const missingScores = Object.keys(this.himpCategories).filter(key => !(key in scores));
    if (missingScores.length > 0) {
      alert(`Please provide scores for: ${missingScores.map(key => this.himpCategories[key].label).join(', ')}`);
      return;
    }
    
    // Check for duplicate surface IDs
    if (this.himpScores.some(himp => himp.surfaceId === surfaceId && himp.id !== this.editingHimpId)) {
      alert('A HIMP assessment for this Surface ID already exists');
      return;
    }
    
    if (this.editingHimpId) {
      // Update existing assessment
      this.updateHimpAssessment(this.editingHimpId, {
        surfaceId, scores, notes, photoFile
      });
    } else {
      // Create new assessment
      this.createHimpAssessment({
        surfaceId, scores, notes, photoFile,
        position: this.pendingSurfacePoint
      });
    }
    
    this.hideHimpModal();
  }

  /**
   * Create new HIMP assessment
   */
  createHimpAssessment(data) {
    const recommendRecoat = Object.values(data.scores).some(score => score >= 2);
    const maxScore = Math.max(...Object.values(data.scores));
    
    const assessment = {
      id: `HIMP${this.himpIdCounter++}`,
      surfaceId: data.surfaceId,
      himpScores: data.scores,
      recommendRecoat: recommendRecoat,
      maxScore: maxScore,
      averageScore: Object.values(data.scores).reduce((a, b) => a + b, 0) / Object.keys(data.scores).length,
      notes: data.notes || '',
      position: data.position.clone(),
      createdAt: new Date(),
      photoFile: data.photoFile || null,
      photoUrl: null // Would be set after upload to server
    };
    
    // Create visual representation
    this.createHimpVisuals(assessment);
    
    // Add to array
    this.himpScores.push(assessment);
    
    console.log(`📊 Created HIMP assessment: ${assessment.surfaceId} (${assessment.id})`);
    
    // Update UI
    this.updateHimpReadout();
    this.updateHimpManager();
  }

  /**
   * Update existing HIMP assessment
   */
  updateHimpAssessment(himpId, updates) {
    const assessment = this.himpScores.find(himp => himp.id === himpId);
    if (!assessment) return;
    
    const recommendRecoat = Object.values(updates.scores).some(score => score >= 2);
    const maxScore = Math.max(...Object.values(updates.scores));
    
    // Update data
    Object.assign(assessment, {
      surfaceId: updates.surfaceId,
      himpScores: updates.scores,
      recommendRecoat: recommendRecoat,
      maxScore: maxScore,
      averageScore: Object.values(updates.scores).reduce((a, b) => a + b, 0) / Object.keys(updates.scores).length,
      notes: updates.notes || '',
      updatedAt: new Date(),
      photoFile: updates.photoFile || assessment.photoFile
    });
    
    // Update visuals
    this.updateHimpVisuals(assessment);
    
    console.log(`📊 Updated HIMP assessment: ${assessment.surfaceId} (${assessment.id})`);
    
    // Clear editing state
    this.editingHimpId = null;
    
    // Update UI
    this.updateHimpManager();
  }

  /**
   * Delete HIMP assessment
   */
  deleteHimpAssessment() {
    if (!this.editingHimpId) return;
    
    const assessment = this.himpScores.find(himp => himp.id === this.editingHimpId);
    if (!assessment) return;
    
    if (confirm(`Delete HIMP assessment for "${assessment.surfaceId}"?`)) {
      // Remove visuals
      this.removeHimpVisuals(assessment);
      
      // Remove from array
      const index = this.himpScores.indexOf(assessment);
      this.himpScores.splice(index, 1);
      
      console.log(`🗑️ Deleted HIMP assessment: ${assessment.surfaceId}`);
      
      // Update UI
      this.hideHimpModal();
      this.updateHimpManager();
      this.updateHimpReadout();
    }
  }

  /**
   * Create visual representation of HIMP assessment
   */
  createHimpVisuals(assessment) {
    const group = new THREE.Group();
    
    // Determine color based on max score
    let color = this.ZONE_COLORS.safe;
    if (assessment.maxScore >= 3) {
      color = this.ZONE_COLORS.warning;
    } else if (assessment.maxScore >= 2) {
      color = this.ZONE_COLORS.caution;
    }
    
    // Create zone marker (octagon shape for HIMP)
    const markerGeometry = new THREE.CylinderGeometry(
      this.ZONE_MARKER_SIZE,
      this.ZONE_MARKER_SIZE,
      0.02,
      8
    );
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.y = 0.01;
    group.add(marker);
    
    // Create score indicator (vertical bar)
    const scoreHeight = (assessment.maxScore / 6) * 0.15; // Scale to max 0.15 units
    const scoreGeometry = new THREE.CylinderGeometry(0.01, 0.01, scoreHeight, 8);
    const scoreMaterial = new THREE.MeshBasicMaterial({ color: color });
    const scoreBar = new THREE.Mesh(scoreGeometry, scoreMaterial);
    scoreBar.position.y = scoreHeight / 2 + 0.02;
    group.add(scoreBar);
    
    // Create text label
    this.createHimpLabel(assessment, group);
    
    // Position and add to scene
    group.position.copy(assessment.position);
    group.userData = {
      type: 'himpAssessment',
      himpId: assessment.id
    };
    
    this.scene.add(group);
    assessment.group = group;
  }

  /**
   * Create text label for HIMP assessment
   */
  createHimpLabel(assessment, group) {
    // Create HTML label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'himp-label';
    
    const statusIcon = assessment.recommendRecoat ? '⚠️' : '✅';
    const statusText = assessment.recommendRecoat ? 'RECOAT' : 'OK';
    
    labelDiv.innerHTML = `
      <strong>${assessment.surfaceId}</strong><br>
      <small>Max: ${assessment.maxScore} | Avg: ${assessment.averageScore.toFixed(1)}</small><br>
      <span class="himp-status ${assessment.recommendRecoat ? 'warning' : 'safe'}">${statusIcon} ${statusText}</span>
    `;
    
    labelDiv.style.position = 'absolute';
    labelDiv.style.padding = '6px 10px';
    labelDiv.style.backgroundColor = assessment.recommendRecoat ? '#FF9800' : '#4CAF50';
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '11px';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.pointerEvents = 'auto';
    labelDiv.style.cursor = 'pointer';
    labelDiv.style.border = '1px solid white';
    labelDiv.style.zIndex = '1000';
    labelDiv.style.textAlign = 'center';
    
    // Click handler for editing
    labelDiv.onclick = (e) => {
      e.stopPropagation();
      this.editHimpAssessment(assessment.id);
    };
    
    document.body.appendChild(labelDiv);
    assessment.labelDiv = labelDiv;
  }

  /**
   * Update HIMP assessment visuals
   */
  updateHimpVisuals(assessment) {
    if (!assessment.group || !assessment.labelDiv) return;
    
    // Update colors based on new scores
    let color = this.ZONE_COLORS.safe;
    if (assessment.maxScore >= 3) {
      color = this.ZONE_COLORS.warning;
    } else if (assessment.maxScore >= 2) {
      color = this.ZONE_COLORS.caution;
    }
    
    // Update 3D object colors
    assessment.group.children.forEach(child => {
      if (child.material) {
        child.material.color.setHex(color);
      }
    });
    
    // Update label
    const statusIcon = assessment.recommendRecoat ? '⚠️' : '✅';
    const statusText = assessment.recommendRecoat ? 'RECOAT' : 'OK';
    
    assessment.labelDiv.innerHTML = `
      <strong>${assessment.surfaceId}</strong><br>
      <small>Max: ${assessment.maxScore} | Avg: ${assessment.averageScore.toFixed(1)}</small><br>
      <span class="himp-status ${assessment.recommendRecoat ? 'warning' : 'safe'}">${statusIcon} ${statusText}</span>
    `;
    
    assessment.labelDiv.style.backgroundColor = assessment.recommendRecoat ? '#FF9800' : '#4CAF50';
  }

  /**
   * Remove HIMP assessment visuals
   */
  removeHimpVisuals(assessment) {
    if (assessment.group) {
      this.scene.remove(assessment.group);
      Utils.disposeObject(assessment.group);
    }
    
    if (assessment.labelDiv) {
      document.body.removeChild(assessment.labelDiv);
    }
  }

  /**
   * Edit HIMP assessment
   */
  editHimpAssessment(himpId) {
    const assessment = this.himpScores.find(himp => himp.id === himpId);
    if (!assessment) return;
    
    this.editingHimpId = himpId;
    this.pendingSurfacePoint = assessment.position.clone();
    
    // Populate modal fields
    document.getElementById('himp-surface-id').value = assessment.surfaceId;
    document.getElementById('himp-notes').value = assessment.notes;
    
    // Populate scores
    Object.entries(assessment.himpScores).forEach(([key, value]) => {
      const select = document.getElementById(`himp-${key}`);
      if (select) select.value = value;
    });
    
    // Show delete and create discrepancy buttons
    document.getElementById('delete-himp').style.display = 'inline-block';
    document.getElementById('create-discrepancy-from-himp').style.display = 'inline-block';
    
    // Update modal title
    document.getElementById('himp-modal-title').textContent = '📊 Edit HIMP Assessment';
    
    // Update recommendation display
    this.updateRecommendation();
    
    this.showHimpModal();
  }

  /**
   * Create discrepancy from HIMP assessment
   */
  createDiscrepancyFromHimp() {
    if (!this.editingHimpId) return;
    
    const assessment = this.himpScores.find(himp => himp.id === this.editingHimpId);
    if (!assessment) return;
    
    // Check if annotation system is available
    if (!window.inspector3D || !window.inspector3D.annotation) {
      alert('Annotation system not available');
      return;
    }
    
    // Set up annotation data based on HIMP assessment
    const annotationSystem = window.inspector3D.annotation;
    annotationSystem.pendingAnnotationPoint = assessment.position.clone();
    
    // Pre-populate annotation form
    setTimeout(() => {
      const titleField = document.getElementById('annotation-title');
      const descField = document.getElementById('annotation-description');
      const typeField = document.getElementById('annotation-type');
      const severityField = document.getElementById('annotation-severity');
      
      if (titleField) titleField.value = `HIMP Assessment: ${assessment.surfaceId}`;
      if (descField) {
        const highScores = Object.entries(assessment.himpScores)
          .filter(([, score]) => score >= 2)
          .map(([key, score]) => `${this.himpCategories[key].label}: ${score}`)
          .join(', ');
        
        descField.value = `HIMP scores: ${highScores}. ${assessment.notes}`.trim();
      }
      if (typeField) typeField.value = 'coating';
      if (severityField) {
        // Map max HIMP score to severity
        if (assessment.maxScore >= 5) severityField.value = 'critical';
        else if (assessment.maxScore >= 3) severityField.value = 'high';
        else if (assessment.maxScore >= 2) severityField.value = 'medium';
        else severityField.value = 'low';
      }
    }, 100);
    
    // Hide HIMP modal and show annotation modal
    this.hideHimpModal();
    annotationSystem.showAnnotationModal();
    
    console.log(`📍 Creating discrepancy from HIMP assessment: ${assessment.surfaceId}`);
  }

  /**
   * Show HIMP readout
   */
  showHimpReadout() {
    let readout = document.getElementById('himp-readout');
    if (!readout) {
      readout = document.createElement('div');
      readout.id = 'himp-readout';
      readout.className = 'measurement-readout'; // Reuse measurement readout styling
      document.body.appendChild(readout);
    }
    
    readout.style.display = 'block';
    this.updateHimpReadout();
  }

  /**
   * Hide HIMP readout
   */
  hideHimpReadout() {
    const readout = document.getElementById('himp-readout');
    if (readout) {
      readout.style.display = 'none';
    }
  }

  /**
   * Update HIMP readout content
   */
  updateHimpReadout() {
    const readout = document.getElementById('himp-readout');
    if (!readout || !this.active) return;
    
    const count = this.himpScores.length;
    const recoatCount = this.himpScores.filter(h => h.recommendRecoat).length;
    
    if (count === 0) {
      readout.innerHTML = `
        <strong>📊 HIMP Assessment Mode</strong><br>
        <small>Click on surfaces to assess coating condition<br>
        Ctrl+H: HIMP Manager | ESC: Cancel</small>
      `;
    } else {
      readout.innerHTML = `
        <strong>📊 HIMP Assessments: ${count}</strong><br>
        <small>⚠️ ${recoatCount} require recoating<br>
        Click labels to edit | Ctrl+H: Manager</small>
      `;
    }
  }

  /**
   * Show HIMP manager
   */
  showHimpManager() {
    this.updateHimpManager();
    const modal = document.getElementById('himp-manager-modal');
    modal.style.display = 'block';
  }

  /**
   * Hide HIMP manager
   */
  hideHimpManager() {
    const modal = document.getElementById('himp-manager-modal');
    modal.style.display = 'none';
  }

  /**
   * Update HIMP manager content
   */
  updateHimpManager() {
    // Update statistics
    const totalCount = this.himpScores.length;
    const recoatCount = this.himpScores.filter(h => h.recommendRecoat).length;
    const avgScore = totalCount > 0 ? 
      this.himpScores.reduce((sum, h) => sum + h.averageScore, 0) / totalCount : 0;
    
    document.getElementById('total-assessments').textContent = totalCount;
    document.getElementById('recoat-recommendations').textContent = recoatCount;
    document.getElementById('average-score').textContent = avgScore.toFixed(1);
    
    // Update assessments list
    const listContainer = document.getElementById('himp-list');
    if (!listContainer) return;
    
    if (this.himpScores.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>No HIMP assessments completed</p>
          <small>Use HIMP Assessment mode to evaluate surface conditions</small>
        </div>
      `;
      return;
    }
    
    let html = '';
    this.himpScores
      .sort((a, b) => b.maxScore - a.maxScore) // Sort by highest score first
      .forEach(assessment => {
        const statusClass = assessment.recommendRecoat ? 'warning' : 'safe';
        const statusIcon = assessment.recommendRecoat ? '⚠️' : '✅';
        const statusText = assessment.recommendRecoat ? 'RECOAT NEEDED' : 'ACCEPTABLE';
        
        html += `
          <div class="himp-item ${statusClass}" data-himp-id="${assessment.id}">
            <div class="himp-header">
              <strong>${assessment.surfaceId}</strong>
              <span class="himp-status-badge ${statusClass}">${statusIcon} ${statusText}</span>
            </div>
            <div class="himp-scores">
              ${Object.entries(assessment.himpScores).map(([key, score]) => 
                `<span class="score-chip score-${score}">${this.himpCategories[key].icon} ${score}</span>`
              ).join('')}
            </div>
            <div class="himp-summary">
              Max Score: ${assessment.maxScore} | Average: ${assessment.averageScore.toFixed(1)}
              ${assessment.notes ? `<br><em>"${assessment.notes}"</em>` : ''}
            </div>
            <div class="himp-actions">
              <button class="btn-small edit-himp" onclick="window.inspector3D?.himp?.editHimpAssessment('${assessment.id}')">✏️ Edit</button>
              <button class="btn-small focus-himp" onclick="window.inspector3D?.himp?.focusOnAssessment('${assessment.id}')">🎯 Focus</button>
              ${assessment.recommendRecoat ? 
                `<button class="btn-small create-discrepancy" onclick="window.inspector3D?.himp?.editHimpAssessment('${assessment.id}'); setTimeout(() => window.inspector3D?.himp?.createDiscrepancyFromHimp(), 500)">📍 Create Discrepancy</button>` : 
                ''
              }
            </div>
          </div>
        `;
      });
    
    listContainer.innerHTML = html;
  }

  /**
   * Focus camera on HIMP assessment
   */
  focusOnAssessment(himpId) {
    const assessment = this.himpScores.find(himp => himp.id === himpId);
    if (!assessment) return;
    
    // Use main app's camera controls if available
    if (window.inspector3D && window.inspector3D.controls) {
      const controls = window.inspector3D.controls.controls;
      if (controls && controls.target) {
        controls.target.copy(assessment.position);
        controls.update();
        console.log(`🎯 Focused on HIMP assessment: ${assessment.surfaceId}`);
      }
    }
  }

  /**
   * Clear all HIMP assessments
   */
  clearAllHimpAssessments() {
    if (this.himpScores.length === 0) return;
    
    if (confirm(`Delete all ${this.himpScores.length} HIMP assessments?`)) {
      // Remove all visuals
      this.himpScores.forEach(assessment => {
        this.removeHimpVisuals(assessment);
      });
      
      // Clear array
      this.himpScores = [];
      this.himpIdCounter = 1;
      
      console.log('🗑️ Cleared all HIMP assessments');
      
      // Update UI
      this.updateHimpManager();
      this.updateHimpReadout();
    }
  }

  /**
   * Export HIMP assessments as CSV
   */
  exportHimpCSV() {
    if (this.himpScores.length === 0) {
      alert('No HIMP assessments to export');
      return;
    }
    
    const headers = [
      'Surface ID',
      'Coating Condition',
      'General Corrosion',
      'Pitting & Grooving',
      'Deformation',
      'Fracture',
      'Cleanliness',
      'Max Score',
      'Average Score',
      'Recommend Recoat',
      'Notes',
      'Assessment Date',
      'Position X',
      'Position Y',
      'Position Z'
    ];
    
    const rows = this.himpScores.map(assessment => [
      assessment.surfaceId,
      assessment.himpScores.coating_condition,
      assessment.himpScores.general_corrosion,
      assessment.himpScores.pitting_grooving,
      assessment.himpScores.deformation,
      assessment.himpScores.fracture,
      assessment.himpScores.cleanliness,
      assessment.maxScore,
      assessment.averageScore.toFixed(2),
      assessment.recommendRecoat ? 'YES' : 'NO',
      `"${assessment.notes.replace(/"/g, '""')}"`, // Escape quotes
      assessment.createdAt.toISOString(),
      assessment.position.x.toFixed(3),
      assessment.position.y.toFixed(3),
      assessment.position.z.toFixed(3)
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `himp-assessments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📊 Exported ${this.himpScores.length} HIMP assessments as CSV`);
  }

  /**
   * Export HIMP assessments as JSON
   */
  exportHimpJSON() {
    if (this.himpScores.length === 0) {
      alert('No HIMP assessments to export');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      units: Utils.getMeshUnits(),
      coordinate_system: 'Right-handed (Y-up)',
      himp_assessments: this.himpScores.map(assessment => ({
        surface_id: assessment.surfaceId,
        himp_scores: assessment.himpScores,
        recommend_recoat: assessment.recommendRecoat,
        max_score: assessment.maxScore,
        average_score: assessment.averageScore,
        notes: assessment.notes,
        position: {
          x: assessment.position.x,
          y: assessment.position.y,
          z: assessment.position.z
        },
        assessment_date: assessment.createdAt.toISOString(),
        updated_date: assessment.updatedAt?.toISOString()
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `himp-assessments-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📤 Exported ${this.himpScores.length} HIMP assessments as JSON`);
  }

  /**
   * Cancel pending HIMP assessment
   */
  cancelPendingHimp() {
    this.pendingSurfacePoint = null;
    this.editingHimpId = null;
    
    // Reset modal title
    const titleElement = document.getElementById('himp-modal-title');
    if (titleElement) {
      titleElement.textContent = '📊 HIMP Surface Assessment';
    }
  }

  /**
   * Update label positions (called from render loop)
   */
  updateLabelPositions() {
    this.himpScores.forEach(assessment => {
      if (assessment.labelDiv && assessment.position) {
        const vector = assessment.position.clone().project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        assessment.labelDiv.style.left = `${x + 25}px`;
        assessment.labelDiv.style.top = `${y - 15}px`;
        
        // Hide labels that are behind the camera or too far
        const distance = this.camera.position.distanceTo(assessment.position);
        const isVisible = vector.z < 1 && distance < 100;
        assessment.labelDiv.style.display = isVisible ? 'block' : 'none';
      }
    });
  }

  /**
   * Get export data
   */
  getExportData() {
    return {
      himpAssessments: this.himpScores.map(assessment => ({
        id: assessment.id,
        surfaceId: assessment.surfaceId,
        himpScores: assessment.himpScores,
        recommendRecoat: assessment.recommendRecoat,
        maxScore: assessment.maxScore,
        averageScore: assessment.averageScore,
        notes: assessment.notes,
        position: {
          x: assessment.position.x,
          y: assessment.position.y,
          z: assessment.position.z
        },
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt?.toISOString()
      }))
    };
  }

  /**
   * Handle resize event
   */
  handleResize() {
    // Labels will be repositioned on next update cycle
  }

  /**
   * Dispose of HIMP system
   */
  dispose() {
    console.log('🗑️ Disposing HIMP system...');
    
    // Remove all assessments
    this.clearAllHimpAssessments();
    
    // Remove modals
    const himpModal = document.getElementById('himp-modal');
    if (himpModal) himpModal.remove();
    
    const managerModal = document.getElementById('himp-manager-modal');
    if (managerModal) managerModal.remove();
    
    // Remove readout
    const readout = document.getElementById('himp-readout');
    if (readout) readout.remove();
    
    // Remove tooltip
    const tooltip = document.getElementById('himp-tooltip');
    if (tooltip) tooltip.remove();
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    console.log('✅ HIMP system disposed');
  }
}
