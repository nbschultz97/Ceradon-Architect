/**
 * Settings UI Handler
 * Manages the settings modal and user interactions
 */

(() => {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const modal = document.getElementById('settingsModal');
    const settingsToggle = document.getElementById('settingsToggle');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const resetSettings = document.getElementById('resetSettings');

    if (!modal || !settingsToggle) {
      console.warn('[SettingsUI] Settings elements not found');
      return;
    }

    // Open settings modal
    settingsToggle.addEventListener('click', () => {
      loadSettingsToUI();
      modal.hidden = false;
    });

    // Close settings modal
    closeSettings.addEventListener('click', () => {
      modal.hidden = true;
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.hidden = true;
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) {
        modal.hidden = true;
      }
    });

    // Save settings
    saveSettings.addEventListener('click', () => {
      saveSettingsFromUI();
      modal.hidden = true;
    });

    // Reset settings
    resetSettings.addEventListener('click', () => {
      if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        SettingsManager.resetSettings();
        loadSettingsToUI();
      }
    });

    // Export settings
    document.getElementById('settingsExportBtn')?.addEventListener('click', () => {
      SettingsManager.exportSettings();
    });

    // Import settings
    document.getElementById('settingsImportBtn')?.addEventListener('click', () => {
      document.getElementById('settingsImportInput')?.click();
    });

    document.getElementById('settingsImportInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await SettingsManager.importSettings(file);
          loadSettingsToUI();
        } catch (error) {
          console.error('[SettingsUI] Import failed:', error);
        }
      }
      e.target.value = ''; // Reset file input
    });

    // Download error log
    document.getElementById('downloadErrorLog')?.addEventListener('click', () => {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.downloadErrorLog();
      }
    });

    // Clear error log
    document.getElementById('clearErrorLog')?.addEventListener('click', () => {
      if (typeof ErrorHandler !== 'undefined') {
        if (confirm('Clear all error logs? This cannot be undone.')) {
          ErrorHandler.clearErrorLog();
          if (typeof UIFeedback !== 'undefined') {
            UIFeedback.showToast('Error log cleared', 'info');
          }
        }
      }
    });

    // Zoom slider update
    const zoomSlider = document.getElementById('settingsDefaultZoom');
    const zoomValue = document.getElementById('settingsDefaultZoomValue');
    if (zoomSlider && zoomValue) {
      zoomSlider.addEventListener('input', () => {
        zoomValue.textContent = zoomSlider.value;
      });
    }

    console.log('[SettingsUI] Initialized');
  }

  /**
   * Load current settings into UI controls
   */
  function loadSettingsToUI() {
    // Units
    document.getElementById('settingsDistanceUnit').value = SettingsManager.getSetting('units.distance');
    document.getElementById('settingsWeightUnit').value = SettingsManager.getSetting('units.weight');
    document.getElementById('settingsTemperatureUnit').value = SettingsManager.getSetting('units.temperature');

    // Map
    document.getElementById('settingsTileProvider').value = SettingsManager.getSetting('map.tileProvider');
    const zoom = SettingsManager.getSetting('map.defaultZoom');
    document.getElementById('settingsDefaultZoom').value = zoom;
    document.getElementById('settingsDefaultZoomValue').textContent = zoom;

    // UI
    document.getElementById('settingsTheme').value = SettingsManager.getSetting('ui.theme');
    document.getElementById('settingsShowTooltips').checked = SettingsManager.getSetting('ui.showTooltips');
    document.getElementById('settingsAutoSave').checked = SettingsManager.getSetting('ui.autoSave');
    document.getElementById('settingsConfirmDelete').checked = SettingsManager.getSetting('ui.confirmDelete');

    // Data
    document.getElementById('settingsExportFormat').value = SettingsManager.getSetting('data.exportFormat');
    document.getElementById('settingsAutoCleanup').checked = SettingsManager.getSetting('data.autoCleanup');

    // Advanced
    document.getElementById('settingsDebugMode').checked = SettingsManager.getSetting('advanced.debugMode');
  }

  /**
   * Save UI controls to settings
   */
  function saveSettingsFromUI() {
    // Units
    SettingsManager.setSetting('units.distance', document.getElementById('settingsDistanceUnit').value);
    SettingsManager.setSetting('units.weight', document.getElementById('settingsWeightUnit').value);
    SettingsManager.setSetting('units.temperature', document.getElementById('settingsTemperatureUnit').value);

    // Map
    SettingsManager.setSetting('map.tileProvider', document.getElementById('settingsTileProvider').value);
    SettingsManager.setSetting('map.defaultZoom', parseInt(document.getElementById('settingsDefaultZoom').value));

    // UI
    SettingsManager.setSetting('ui.theme', document.getElementById('settingsTheme').value);
    SettingsManager.setSetting('ui.showTooltips', document.getElementById('settingsShowTooltips').checked);
    SettingsManager.setSetting('ui.autoSave', document.getElementById('settingsAutoSave').checked);
    SettingsManager.setSetting('ui.confirmDelete', document.getElementById('settingsConfirmDelete').checked);

    // Data
    SettingsManager.setSetting('data.exportFormat', document.getElementById('settingsExportFormat').value);
    SettingsManager.setSetting('data.autoCleanup', document.getElementById('settingsAutoCleanup').checked);

    // Advanced
    SettingsManager.setSetting('advanced.debugMode', document.getElementById('settingsDebugMode').checked);

    // Apply theme immediately
    SettingsManager.applyTheme();

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.showToast('Settings saved successfully', 'success');
    }
  }
})();
