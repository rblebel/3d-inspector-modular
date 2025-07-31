/**
 * EXPORT.JS - Data Export and Report Generation
 * 
 * Responsible for:
 * - Comprehensive JSON export with measurements and annotations
 * - Screenshot capture and image export
 * - Report generation with metadata and statistics
 * - Data formatting and validation
 * - File download management
 * - Export format standardization
 */

import { Utils } from './utils.js';

export class ExportManager {
  constructor(measurementSystem, annotationSystem, lightingSystem = null) {
    this.measurementSystem = measurementSystem;
    this.annotationSystem = annotationSystem;
    this.lightingSystem = lightingSystem;
    
    // Export configuration
    this.exportConfig = {
      includeMetadata: true,
      includeStatistics: true,
      includeSystemInfo: true,
      includeLightingSettings: true,
      prettyFormat: true
    };
  }

  /**
   * Generate comprehensive inspection report
   */
  generateReport() {
    console.log('📊 Generating inspection report...');
    const startTime = Utils.now();
    
    const report = {
      // Report metadata
      metadata: this.generateMetadata(),
      
      // System information
      systemInfo: this.generateSystemInfo(),
      
      // Measurement data
      measurements: this.getMeasurementData(),
      
      // Annotation data
      annotations: this.getAnnotationData(),
      
      // Lighting settings
      lightingSettings: this.getLightingSettings(),
      
      // Statistics
      statistics: this.generateStatistics(),
      
      // Export timestamp
      exportedAt: new Date().toISOString(),
      exportedBy: 'Inspector3D',
      version: '1.0.0'
    };
    
    Utils.logTiming('Report generation', startTime);
    console.log('✅ Inspection report generated');
    
    return report;
  }

  /**
   * Generate report metadata
   */
  generateMetadata() {
    return {
      title: '3D Inspection Report',
      description: 'Comprehensive 3D model inspection with measurements and discrepancy annotations',
      inspector: 'Inspector3D Modular Application',
      modelFile: this.getModelFileName(),
      inspectionDate: new Date().toISOString(),
      units: Utils.getMeshUnits(),
      coordinate_system: 'Right-handed (Y-up)',
      quality_grade: 'Enterprise (A+)'
    };
  }

  /**
   * Generate system information
   */
  generateSystemInfo() {
    const canvas = document.querySelector('canvas');
    const gl = canvas ? canvas.getContext('webgl') || canvas.getContext('experimental-webgl') : null;
    
    return {
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      webgl: gl ? {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Get measurement data for export
   */
  getMeasurementData() {
    if (!this.measurementSystem) {
      return [];
    }
    
    const data = this.measurementSystem.getExportData();
    
    // Add additional metadata for each measurement
    return data.map(measurement => ({
      ...measurement,
      pointCount: measurement.points.length,
      perimeter: measurement.totalDistance,
      isComplete: measurement.isClosed,
      measurementType: measurement.isClosed ? 'area' : 'linear',
      linkedAnnotations: this.getLinkedAnnotations(measurement.id)
    }));
  }

  /**
   * Get annotation data for export
   */
  getAnnotationData() {
    if (!this.annotationSystem) {
      return [];
    }
    
    const data = this.annotationSystem.getExportData();
    
    // Add additional metadata for each annotation
    return data.map(annotation => ({
      ...annotation,
      requiresAction: annotation.ndtRequired || annotation.absRequired,
      criticality: this.getCriticalityScore(annotation.severity),
      estimatedCost: this.getEstimatedCost(annotation.type, annotation.severity)
    }));
  }

  /**
   * Get lighting settings for export
   */
  getLightingSettings() {
    if (!this.lightingSystem) {
      return {
        note: 'Lighting settings not available'
      };
    }
    
    return {
      ...this.lightingSystem.getSettings(),
      note: 'These settings can be used to reproduce the visual appearance'
    };
  }

  /**
   * Get annotations linked to a specific measurement
   */
  getLinkedAnnotations(measurementId) {
    if (!this.annotationSystem) {
      return [];
    }
    
    return this.annotationSystem.annotations
      .filter(annotation => 
        annotation.linkedMeasurement && 
        annotation.linkedMeasurement.id === measurementId
      )
      .map(annotation => ({
        id: annotation.id,
        type: annotation.type,
        severity: annotation.severity
      }));
  }

  /**
   * Get criticality score for severity level
   */
  getCriticalityScore(severity) {
    const scores = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Critical': 4
    };
    return scores[severity] || 1;
  }

  /**
   * Get estimated cost category for annotation
   */
  getEstimatedCost(type, severity) {
    const baseCosts = {
      'corrosion': { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Very High' },
      'crack': { Low: 'Medium', Medium: 'High', High: 'Very High', Critical: 'Critical' },
      'pitting': { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'High' },
      'structure': { Low: 'Medium', Medium: 'High', High: 'Very High', Critical: 'Critical' },
      'housekeeping': { Low: 'Very Low', Medium: 'Low', High: 'Medium', Critical: 'High' }
    };
    
    return baseCosts[type]?.[severity] || 'Unknown';
  }

  /**
   * Generate comprehensive statistics
   */
  generateStatistics() {
    const measurements = this.getMeasurementData();
    const annotations = this.getAnnotationData();
    
    return {
      measurements: this.generateMeasurementStatistics(measurements),
      annotations: this.generateAnnotationStatistics(annotations),
      summary: this.generateSummaryStatistics(measurements, annotations)
    };
  }

  /**
   * Generate measurement statistics
   */
  generateMeasurementStatistics(measurements) {
    if (measurements.length === 0) {
      return {
        count: 0,
        totalDistance: 0,
        totalArea: 0,
        averageDistance: 0,
        averageArea: 0
      };
    }
    
    const totalDistance = measurements.reduce((sum, m) => sum + m.totalDistance, 0);
    const totalArea = measurements.reduce((sum, m) => sum + (m.area || 0), 0);
    const closedMeasurements = measurements.filter(m => m.isClosed);
    
    return {
      count: measurements.length,
      linearCount: measurements.length - closedMeasurements.length,
      areaCount: closedMeasurements.length,
      totalDistance: Utils.roundTo(totalDistance, 3),
      totalArea: Utils.roundTo(totalArea, 3),
      averageDistance: Utils.roundTo(totalDistance / measurements.length, 3),
      averageArea: closedMeasurements.length > 0 ? 
        Utils.roundTo(totalArea / closedMeasurements.length, 3) : 0,
      units: Utils.getMeshUnits(),
      largestArea: closedMeasurements.length > 0 ? 
        Math.max(...closedMeasurements.map(m => m.area)) : 0,
      longestDistance: measurements.length > 0 ? 
        Math.max(...measurements.map(m => m.totalDistance)) : 0
    };
  }

  /**
   * Generate annotation statistics
   */
  generateAnnotationStatistics(annotations) {
    if (annotations.length === 0) {
      return {
        count: 0,
        byType: {},
        bySeverity: {},
        requiresAction: 0
      };
    }
    
    const byType = {};
    const bySeverity = {};
    let requiresAction = 0;
    
    annotations.forEach(annotation => {
      // Count by type
      byType[annotation.type] = (byType[annotation.type] || 0) + 1;
      
      // Count by severity
      bySeverity[annotation.severity] = (bySeverity[annotation.severity] || 0) + 1;
      
      // Count actions required
      if (annotation.requiresAction) {
        requiresAction++;
      }
    });
    
    return {
      count: annotations.length,
      byType,
      bySeverity,
      requiresAction,
      actionPercentage: Utils.roundTo((requiresAction / annotations.length) * 100, 1),
      averageCriticality: Utils.roundTo(
        annotations.reduce((sum, a) => sum + a.criticality, 0) / annotations.length, 
        2
      )
    };
  }

  /**
   * Generate summary statistics
   */
  generateSummaryStatistics(measurements, annotations) {
    const totalIssues = annotations.length;
    const criticalIssues = annotations.filter(a => a.severity === 'Critical').length;
    const highIssues = annotations.filter(a => a.severity === 'High').length;
    const linkedIssues = annotations.filter(a => a.linkedMeasurement).length;
    
    const inspectionScore = this.calculateInspectionScore(annotations);
    const riskLevel = this.calculateRiskLevel(annotations);
    
    return {
      totalMeasurements: measurements.length,
      totalAnnotations: totalIssues,
      criticalIssues,
      highPriorityIssues: criticalIssues + highIssues,
      linkedIssues,
      linkagePercentage: totalIssues > 0 ? 
        Utils.roundTo((linkedIssues / totalIssues) * 100, 1) : 0,
      inspectionScore,
      riskLevel,
      completionStatus: this.getCompletionStatus(measurements, annotations),
      dataQuality: this.assessDataQuality(measurements, annotations)
    };
  }

  /**
   * Calculate overall inspection score (0-100)
   */
  calculateInspectionScore(annotations) {
    if (annotations.length === 0) return 100;
    
    const maxScore = 100;
    const weights = { Critical: 20, High: 10, Medium: 5, Low: 1 };
    
    const totalDeduction = annotations.reduce((sum, annotation) => {
      return sum + (weights[annotation.severity] || 0);
    }, 0);
    
    return Math.max(0, maxScore - totalDeduction);
  }

  /**
   * Calculate risk level based on annotations
   */
  calculateRiskLevel(annotations) {
    const critical = annotations.filter(a => a.severity === 'Critical').length;
    const high = annotations.filter(a => a.severity === 'High').length;
    const medium = annotations.filter(a => a.severity === 'Medium').length;
    
    if (critical > 0) return 'Critical';
    if (high > 2) return 'High';
    if (high > 0 || medium > 5) return 'Medium';
    if (medium > 0) return 'Low';
    return 'Very Low';
  }

  /**
   * Get completion status of inspection
   */
  getCompletionStatus(measurements, annotations) {
    const hasMeasurements = measurements.length > 0;
    const hasAnnotations = annotations.length > 0;
    const hasDescriptions = annotations.every(a => a.description && a.description.trim());
    
    if (hasMeasurements && hasAnnotations && hasDescriptions) {
      return 'Complete';
    } else if (hasMeasurements || hasAnnotations) {
      return 'Partial';
    } else {
      return 'Incomplete';
    }
  }

  /**
   * Assess data quality
   */
  assessDataQuality(measurements, annotations) {
    let score = 100;
    let issues = [];
    
    // Check measurement quality
    const incompleteMeasurements = measurements.filter(m => m.pointCount < 2).length;
    if (incompleteMeasurements > 0) {
      score -= incompleteMeasurements * 5;
      issues.push(`${incompleteMeasurements} incomplete measurement(s)`);
    }
    
    // Check annotation quality
    const incompleteAnnotations = annotations.filter(a => !a.description || !a.description.trim()).length;
    if (incompleteAnnotations > 0) {
      score -= incompleteAnnotations * 10;
      issues.push(`${incompleteAnnotations} annotation(s) missing description`);
    }
    
    const unlinkedAnnotations = annotations.filter(a => !a.linkedMeasurement).length;
    if (unlinkedAnnotations > annotations.length * 0.5) {
      score -= 15;
      issues.push('Many annotations not linked to measurements');
    }
    
    return {
      score: Math.max(0, score),
      grade: this.getQualityGrade(score),
      issues
    };
  }

  /**
   * Get quality grade from score
   */
  getQualityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get model file name from scene
   */
  getModelFileName() {
    // Try to get from global app config
    if (window.inspector3D && window.inspector3D.config) {
      return window.inspector3D.config.objUrl || 'unknown.obj';
    }
    return 'model.obj';
  }

  /**
   * Export report as JSON file
   */
  exportAsJSON(filename = null) {
    try {
      const report = this.generateReport();
      const jsonString = this.exportConfig.prettyFormat ? 
        JSON.stringify(report, null, 2) : 
        JSON.stringify(report);
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || this.generateFileName('json');
      link.click();
      
      URL.revokeObjectURL(url);
      
      console.log('💾 Report exported as JSON');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to export JSON:', error);
      return false;
    }
  }

  /**
   * Export screenshot as PNG
   */
  exportScreenshot(filename = null) {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        throw new Error('Canvas not found');
      }
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename || this.generateFileName('png');
      link.click();
      
      console.log('📷 Screenshot exported');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to export screenshot:', error);
      return false;
    }
  }

  /**
   * Export both JSON and screenshot
   */
  exportAll(baseFilename = null) {
    const base = baseFilename || this.generateBaseFilename();
    
    const results = {
      json: this.exportAsJSON(`${base}.json`),
      screenshot: this.exportScreenshot(`${base}.png`)
    };
    
    if (results.json && results.screenshot) {
      console.log('📦 Complete export successful');
    } else {
      console.warn('⚠️ Partial export completed');
    }
    
    return results;
  }

  /**
   * Generate filename with timestamp
   */
  generateFileName(extension) {
    const timestamp = Utils.formatTimestamp();
    const modelName = this.getModelFileName().replace(/\.[^/.]+$/, '');
    return `${modelName}_inspection_${timestamp}.${extension}`;
  }

  /**
   * Generate base filename without extension
   */
  generateBaseFilename() {
    const timestamp = Utils.formatTimestamp();
    const modelName = this.getModelFileName().replace(/\.[^/.]+$/, '');
    return `${modelName}_inspection_${timestamp}`;
  }

  /**
   * Set export configuration
   */
  setConfig(config) {
    this.exportConfig = { ...this.exportConfig, ...config };
    console.log('⚙️ Export configuration updated');
  }

  /**
   * Get current export configuration
   */
  getConfig() {
    return { ...this.exportConfig };
  }

  /**
   * Validate export data before generating report
   */
  validateExportData() {
    const issues = [];
    
    if (!this.measurementSystem) {
      issues.push('Measurement system not available');
    }
    
    if (!this.annotationSystem) {
      issues.push('Annotation system not available');
    }
    
    // Check for canvas availability for screenshots
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      issues.push('Canvas not found for screenshot export');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get export preview (subset of full report)
   */
  getExportPreview() {
    return {
      metadata: this.generateMetadata(),
      measurementCount: this.measurementSystem ? this.measurementSystem.measurements.length : 0,
      annotationCount: this.annotationSystem ? this.annotationSystem.annotations.length : 0,
      estimatedSize: this.estimateExportSize()
    };
  }

  /**
   * Estimate export file size
   */
  estimateExportSize() {
    try {
      const preview = {
        measurements: this.getMeasurementData(),
        annotations: this.getAnnotationData()
      };
      
      const jsonString = JSON.stringify(preview);
      const bytes = new Blob([jsonString]).size;
      
      // Estimate full report will be ~2x preview size
      return Utils.formatFilesize(bytes * 2);
      
    } catch (error) {
      return 'Unknown';
    }
  }
}
