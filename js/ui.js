/**
 * UI.JS - User Interface Management
 * 
 * Responsible for:
 * - Modal window management and interactions
 * - Toolbar and panel state management
 * - User notifications and messages
 * - Keyboard shortcut handling
 * - Loading indicators and progress feedback
 * - Button state management and visual feedback
 * - Responsive UI behavior
 */

export class UIManager {
  constructor() {
    this.activeModals = new Set();
    this.notifications = [];
    this.loadingStates = new Map();
    
    // UI state
    this.toolsPanelOpen = false;
    this.currentMessage = null;
    this.messageTimeout = null;
  }

  /**
   * Initialize UI manager
   */
  async init() {
    console.log('🎨 Initializing UI manager...');
    
    this.setupGlobalEventListeners();
    this.setupNotificationSystem();
    this.setupTooltips();
    
    console.log('✅ UI manager initialized');
  }

  /**
   * Set up global event listeners
   */
  setupGlobalEventListeners() {
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
    });
    
    // Handle fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenButton();
    });
    
    // Handle window focus/blur for better UX
    window.addEventListener('focus', () => {
      this.onWindowFocus();
    });
    
    window.addEventListener('blur', () => {
      this.onWindowBlur();
    });
    
    console.log('👂 Global UI event listeners attached');
  }

  /**
   * Set up notification system
   */
  setupNotificationSystem() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notifications-container')) {
      const container = document.createElement('div');
      container.id = 'notifications-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
  }

  /**
   * Set up tooltips for buttons
   */
  setupTooltips() {
    const buttons = document.querySelectorAll('[title]');
    buttons.forEach(button => {
      this.enhanceTooltip(button);
    });
  }

  /**
   * Enhance tooltip behavior
   */
  enhanceTooltip(element) {
    let tooltipTimeout;
    
    element.addEventListener('mouseenter', () => {
      tooltipTimeout = setTimeout(() => {
        // Add enhanced tooltip styling if needed
        element.setAttribute('data-tooltip-active', 'true');
      }, 500);
    });
    
    element.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimeout);
      element.removeAttribute('data-tooltip-active');
    });
  }

  /**
   * Toggle tools panel visibility
   */
  toggleToolsPanel() {
    const panel = document.getElementById('tools-panel');
    if (!panel) return;
    
    this.toolsPanelOpen = !this.toolsPanelOpen;
    
    if (this.toolsPanelOpen) {
      panel.classList.add('active');
      this.setButtonActive('sceneBtn', true);
    } else {
      panel.classList.remove('active');
      this.setButtonActive('sceneBtn', false);
    }
    
    console.log(`🎛️ Tools panel ${this.toolsPanelOpen ? 'opened' : 'closed'}`);
  }

  /**
   * Close tools panel
   */
  closeToolsPanel() {
    if (this.toolsPanelOpen) {
      this.toggleToolsPanel();
    }
  }

  /**
   * Set button active state
   */
  setButtonActive(buttonId, active) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (active) {
      button.classList.add('selected');
    } else {
      button.classList.remove('selected');
    }
  }

  /**
   * Toggle button state
   */
  toggleButtonState(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const isActive = button.classList.contains('selected');
    this.setButtonActive(buttonId, !isActive);
    
    return !isActive;
  }

  /**
   * Show loading indicator
   */
  showLoadingIndicator(show = true, message = 'Loading...') {
    const indicator = document.getElementById('loading-indicator');
    if (!indicator) return;
    
    if (show) {
      const messageElement = indicator.querySelector('p');
      if (messageElement) {
        messageElement.textContent = message;
      }
      indicator.style.display = 'flex';
    } else {
      indicator.style.display = 'none';
    }
    
    this.loadingStates.set('global', show);
  }

  /**
   * Show custom loading state
   */
  showCustomLoading(id, show = true, message = 'Processing...') {
    this.loadingStates.set(id, show);
    
    if (id === 'global') {
      this.showLoadingIndicator(show, message);
    }
    
    // Emit event for custom loading handlers
    const event = new CustomEvent('loadingStateChange', {
      detail: { id, show, message }
    });
    document.dispatchEvent(event);
  }

  /**
   * Check if any loading is active
   */
  isLoading() {
    return Array.from(this.loadingStates.values()).some(state => state);
  }

  /**
   * Show notification message
   */
  showMessage(message, type = 'info', duration = 3000) {
    const notification = this.createNotification(message, type, duration);
    const container = document.getElementById('notifications-container');
    
    if (container) {
      container.appendChild(notification);
      
      // Animate in
      requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
      });
      
      // Auto remove
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }
    
    console.log(`📢 Message: ${message}`);
  }

  /**
   * Create notification element
   */
  createNotification(message, type, duration) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: ${this.getNotificationBgColor(type)};
      color: ${this.getNotificationTextColor(type)};
      padding: 12px 20px;
      margin-bottom: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      max-width: 300px;
      word-wrap: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      border-left: 4px solid ${this.getNotificationAccentColor(type)};
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${this.getNotificationIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      this.removeNotification(notification);
    });
    
    return notification;
  }

  /**
   * Get notification background color
   */
  getNotificationBgColor(type) {
    const colors = {
      'info': '#e3f2fd',
      'success': '#e8f5e8',
      'warning': '#fff3cd',
      'error': '#f8d7da'
    };
    return colors[type] || colors['info'];
  }

  /**
   * Get notification text color
   */
  getNotificationTextColor(type) {
    const colors = {
      'info': '#1565c0',
      'success': '#2e7d32',
      'warning': '#8a6d3b',
      'error': '#721c24'
    };
    return colors[type] || colors['info'];
  }

  /**
   * Get notification accent color
   */
  getNotificationAccentColor(type) {
    const colors = {
      'info': '#2196f3',
      'success': '#4caf50',
      'warning': '#ff9800',
      'error': '#f44336'
    };
    return colors[type] || colors['info'];
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(type) {
    const icons = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    return icons[type] || icons['info'];
  }

  /**
   * Remove notification
   */
  removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Show success message
   */
  showSuccess(message, duration = 3000) {
    this.showMessage(message, 'success', duration);
  }

  /**
   * Show warning message
   */
  showWarning(message, duration = 4000) {
    this.showMessage(message, 'warning', duration);
  }

  /**
   * Show error message
   */
  showError(message, duration = 5000) {
    this.showMessage(message, 'error', duration);
  }

  /**
   * Show info message
   */
  showInfo(message, duration = 3000) {
    this.showMessage(message, 'info', duration);
  }

  /**
   * Show modal
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`⚠️ Modal not found: ${modalId}`);
      return false;
    }
    
    modal.style.display = 'block';
    this.activeModals.add(modalId);
    
    // Focus trap
    this.trapFocus(modal);
    
    console.log(`📋 Modal opened: ${modalId}`);
    return true;
  }

  /**
   * Hide modal
   */
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    
    modal.style.display = 'none';
    this.activeModals.delete(modalId);
    
    console.log(`📋 Modal closed: ${modalId}`);
    return true;
  }

  /**
   * Close top modal
   */
  closeTopModal() {
    if (this.activeModals.size > 0) {
      const topModal = Array.from(this.activeModals).pop();
      this.hideModal(topModal);
      return true;
    }
    return false;
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    const modals = Array.from(this.activeModals);
    modals.forEach(modalId => {
      this.hideModal(modalId);
    });
    console.log(`📋 Closed ${modals.length} modal(s)`);
  }

  /**
   * Trap focus within modal
   */
  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstElement.focus();
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };
    
    modal.addEventListener('keydown', handleTabKey);
    
    // Clean up when modal is closed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' &&
            modal.style.display === 'none') {
          modal.removeEventListener('keydown', handleTabKey);
          observer.disconnect();
        }
      });
    });
    
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
  }

  /**
   * Update fullscreen button state
   */
  updateFullscreenButton() {
    const button = document.getElementById('fullscreenBtn');
    if (!button) return;
    
    const isFullscreen = !!document.fullscreenElement;
    this.setButtonActive('fullscreenBtn', isFullscreen);
    
    // Update button title
    button.title = isFullscreen ? 'Exit Full Screen' : 'Full Screen';
  }

  /**
   * Handle window focus
   */
  onWindowFocus() {
    // Resume any paused operations if needed
    console.log('🔍 Window focused');
  }

  /**
   * Handle window blur
   */
  onWindowBlur() {
    // Pause non-critical operations if needed
    console.log('😴 Window blurred');
  }

  /**
   * Show confirmation dialog
   */
  showConfirmation(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const result = confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  }

  /**
   * Show prompt dialog
   */
  showPrompt(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
      const result = prompt(`${title}\n\n${message}`, defaultValue);
      resolve(result);
    });
  }

  /**
   * Enable/disable UI elements
   */
  setUIEnabled(enabled) {
    const buttons = document.querySelectorAll('button:not([data-always-enabled])');
    const inputs = document.querySelectorAll('input, select, textarea');
    
    [...buttons, ...inputs].forEach(element => {
      element.disabled = !enabled;
    });
    
    console.log(`🎛️ UI ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update UI theme (if needed in the future)
   */
  setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    console.log(`🎨 Theme set to: ${theme}`);
  }

  /**
   * Show progress indicator
   */
  showProgress(progress, message = 'Processing...') {
    // This could be enhanced with a custom progress bar
    this.showLoadingIndicator(true, `${message} (${Math.round(progress)}%)`);
  }

  /**
   * Hide progress indicator
   */
  hideProgress() {
    this.showLoadingIndicator(false);
  }

  /**
   * Create and show help modal content
   */
  showHelp() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
      this.showModal('help-modal');
    } else {
      // Fallback to alert if help modal doesn't exist
      alert(`
3D Inspector - Keyboard Shortcuts & Controls

📏 Measurement Mode:
• L: Toggle measurement label visibility
• C: Close measurement loop (requires 3+ points)
• N: Create new measurement
• ESC: Clear current measurement
• 1-9: Switch between measurements
• Shift+Click: Delete measurement point
• Ctrl+Drag: Move measurement point

🎮 General Controls:
• F: Toggle fullscreen mode
• R: Reset camera view
• W: Toggle wireframe mode
• Mouse wheel: Zoom in/out
• Left drag: Rotate view
• Right drag: Pan view

📍 Annotation Mode:
• Click: Place discrepancy annotation
• Click label: Edit existing annotation
      `);
    }
  }

  /**
   * Get UI state
   */
  getState() {
    return {
      toolsPanelOpen: this.toolsPanelOpen,
      activeModals: Array.from(this.activeModals),
      isLoading: this.isLoading(),
      notifications: this.notifications.length
    };
  }

  /**
   * Set button loading state
   */
  setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'wait';
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }

  /**
   * Animate button press
   */
  animateButtonPress(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 100);
  }

  /**
   * Update button badge/counter
   */
  updateButtonBadge(buttonId, count) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    // Remove existing badge
    const existingBadge = button.querySelector('.button-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'button-badge';
      badge.textContent = count > 99 ? '99+' : count.toString();
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      `;
      
      button.style.position = 'relative';
      button.appendChild(badge);
    }
  }

  /**
   * Handle UI errors gracefully
   */
  handleUIError(error, context = 'UI Operation') {
    console.error(`❌ ${context}:`, error);
    this.showError(`${context} failed: ${error.message}`);
  }

  /**
   * Dispose of UI manager resources
   */
  dispose() {
    console.log('🗑️ Disposing UI manager...');
    
    // Clear all notifications
    const container = document.getElementById('notifications-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Close all modals
    this.closeAllModals();
    
    // Clear timeouts
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // Clear references
    this.activeModals.clear();
    this.notifications = [];
    this.loadingStates.clear();
    
    console.log('✅ UI manager disposed');
  }
}
