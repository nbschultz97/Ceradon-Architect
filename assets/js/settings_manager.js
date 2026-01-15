/**
 * Settings Manager
 * Manages user preferences and application settings
 */

const SettingsManager = (() => {
  'use strict';

  // Default settings
  const DEFAULT_SETTINGS = {
    units: {
      distance: 'metric', // 'metric' or 'imperial'
      weight: 'metric',
      temperature: 'celsius', // 'celsius' or 'fahrenheit'
      altitude: 'meters' // 'meters' or 'feet'
    },
    map: {
      tileProvider: 'osm', // 'osm', 'satellite', 'topo'
      defaultZoom: 10,
      defaultLat: 0,
      defaultLon: 0
    },
    ui: {
      theme: 'dark', // 'dark' or 'light'
      showTooltips: true,
      autoSave: true,
      autoSaveInterval: 30000, // milliseconds
      confirmDelete: true
    },
    data: {
      maxProjects: 10,
      maxParts: 1000,
      autoCleanup: false,
      exportFormat: 'json' // 'json', 'geojson', 'cot'
    },
    advanced: {
      debugMode: false,
      showDevTools: false,
      logLevel: 'info' // 'info', 'warn', 'error'
    }
  };

  // Current settings (loaded from storage or defaults)
  let currentSettings = null;

  /**
   * Load settings from localStorage
   */
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('cots_settings');
      if (saved) {
        currentSettings = JSON.parse(saved);
        // Merge with defaults to handle new settings added in updates
        currentSettings = mergeSettings(DEFAULT_SETTINGS, currentSettings);
      } else {
        currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.error('[SettingsManager] Could not load settings:', error);
      currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    return currentSettings;
  };

  /**
   * Merge settings objects (handles nested objects)
   */
  const mergeSettings = (defaults, saved) => {
    const merged = JSON.parse(JSON.stringify(defaults));

    for (const key in saved) {
      if (saved.hasOwnProperty(key)) {
        if (typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
          merged[key] = mergeSettings(defaults[key] || {}, saved[key]);
        } else {
          merged[key] = saved[key];
        }
      }
    }

    return merged;
  };

  /**
   * Save settings to localStorage
   */
  const saveSettings = () => {
    try {
      localStorage.setItem('cots_settings', JSON.stringify(currentSettings));
      console.log('[SettingsManager] Settings saved');

      // Emit settings changed event
      if (typeof MissionProjectEvents !== 'undefined') {
        MissionProjectEvents.emit('settings:changed', currentSettings);
      }

      return true;
    } catch (error) {
      console.error('[SettingsManager] Could not save settings:', error);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(error, {
          category: ErrorHandler.ErrorCategory.STORAGE,
          severity: ErrorHandler.ErrorSeverity.WARNING,
          customMessage: 'Could not save settings. Your preferences may not be remembered.'
        });
      }
      return false;
    }
  };

  /**
   * Get a setting value by path (e.g., 'units.distance')
   */
  const getSetting = (path) => {
    if (!currentSettings) {
      loadSettings();
    }

    const keys = path.split('.');
    let value = currentSettings;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  };

  /**
   * Set a setting value by path
   */
  const setSetting = (path, value) => {
    if (!currentSettings) {
      loadSettings();
    }

    const keys = path.split('.');
    let obj = currentSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }

    obj[keys[keys.length - 1]] = value;
    saveSettings();
  };

  /**
   * Reset settings to defaults
   */
  const resetSettings = () => {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    saveSettings();

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.showToast('Settings reset to defaults', 'info');
    }
  };

  /**
   * Get all settings
   */
  const getAllSettings = () => {
    if (!currentSettings) {
      loadSettings();
    }
    return JSON.parse(JSON.stringify(currentSettings));
  };

  /**
   * Export settings as JSON file
   */
  const exportSettings = () => {
    try {
      const blob = new Blob([JSON.stringify(currentSettings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cots-architect-settings-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.showToast('Settings exported successfully', 'success');
      }
    } catch (error) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(error, {
          category: ErrorHandler.ErrorCategory.FILE_IO,
          customMessage: 'Could not export settings'
        });
      }
    }
  };

  /**
   * Import settings from JSON file
   */
  const importSettings = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          currentSettings = mergeSettings(DEFAULT_SETTINGS, imported);
          saveSettings();

          if (typeof UIFeedback !== 'undefined') {
            UIFeedback.showToast('Settings imported successfully. Reload to apply all changes.', 'success');
          }

          resolve(currentSettings);
        } catch (error) {
          if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.handleError(error, {
              category: ErrorHandler.ErrorCategory.FILE_IO,
              customMessage: 'Invalid settings file format'
            });
          }
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  /**
   * Apply theme setting
   */
  const applyTheme = () => {
    const theme = getSetting('ui.theme');
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  };

  /**
   * Convert distance based on user preference
   */
  const convertDistance = (meters) => {
    const unit = getSetting('units.distance');
    if (unit === 'imperial') {
      return {
        value: meters * 3.28084, // feet
        unit: 'ft',
        display: `${(meters * 3.28084).toFixed(1)} ft`
      };
    }
    return {
      value: meters,
      unit: 'm',
      display: `${meters.toFixed(1)} m`
    };
  };

  /**
   * Convert weight based on user preference
   */
  const convertWeight = (grams) => {
    const unit = getSetting('units.weight');
    if (unit === 'imperial') {
      return {
        value: grams * 0.00220462, // pounds
        unit: 'lb',
        display: `${(grams * 0.00220462).toFixed(2)} lb`
      };
    }
    return {
      value: grams,
      unit: 'g',
      display: `${grams.toFixed(0)} g`
    };
  };

  /**
   * Convert temperature based on user preference
   */
  const convertTemperature = (celsius) => {
    const unit = getSetting('units.temperature');
    if (unit === 'fahrenheit') {
      return {
        value: (celsius * 9/5) + 32,
        unit: '°F',
        display: `${((celsius * 9/5) + 32).toFixed(1)}°F`
      };
    }
    return {
      value: celsius,
      unit: '°C',
      display: `${celsius.toFixed(1)}°C`
    };
  };

  // Initialize on load
  loadSettings();
  applyTheme();

  // Public API
  return {
    loadSettings,
    saveSettings,
    getSetting,
    setSetting,
    resetSettings,
    getAllSettings,
    exportSettings,
    importSettings,
    applyTheme,
    convertDistance,
    convertWeight,
    convertTemperature,
    DEFAULT_SETTINGS
  };
})();

// Export for browser global scope
window.SettingsManager = SettingsManager;
