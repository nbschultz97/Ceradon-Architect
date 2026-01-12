/**
 * Platform Designer Core Module
 * Manages platform design workflow and integrates with physics engine
 */

const PlatformDesigner = (() => {
  const STORAGE_KEY = 'cots_platform_designs';

  /**
   * Create empty platform design
   */
  const createEmptyDesign = () => ({
    id: `platform-${Date.now()}`,
    name: 'Untitled Platform',
    description: '',
    type: 'multi-rotor', // 'multi-rotor', 'fixed-wing', 'vtol', 'ground'
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    components: {
      airframe: null,
      motors: [],
      escs: null,
      battery: null,
      flight_controller: null,
      radios: [],
      sensors: [],
      accessories: []
    },
    environment: {
      altitude_m: 0,
      temperature_c: 15
    },
    validation: null,
    notes: ''
  });

  /**
   * Load all saved designs
   */
  const loadDesigns = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) || [];
    } catch (error) {
      console.error('Failed to load designs:', error);
      return [];
    }
  };

  /**
   * Save designs
   */
  const saveDesigns = (designs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  };

  /**
   * Add or update a design
   */
  const saveDesign = (design) => {
    const designs = loadDesigns();
    design.modified = new Date().toISOString();

    const index = designs.findIndex(d => d.id === design.id);
    const isNew = index < 0;

    if (index >= 0) {
      designs[index] = design;
    } else {
      designs.push(design);
    }

    saveDesigns(designs);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_UPDATED, {
        design: design,
        isNew: isNew,
        allDesigns: designs
      });
    }

    return design;
  };

  /**
   * Get a single design by ID
   */
  const getDesign = (id) => {
    const designs = loadDesigns();
    return designs.find(d => d.id === id) || null;
  };

  /**
   * Delete a design
   */
  const deleteDesign = (id) => {
    const designs = loadDesigns();
    const filtered = designs.filter(d => d.id !== id);
    saveDesigns(filtered);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_DELETED, {
        designId: id,
        allDesigns: filtered
      });
    }

    return true;
  };

  /**
   * Validate current design
   */
  const validateDesign = (design) => {
    const validation = PhysicsEngine.validatePlatform(
      design.components,
      design.environment
    );

    design.validation = validation;
    design.modified = new Date().toISOString();

    return validation;
  };

  /**
   * Add component to design
   */
  const addComponent = (design, category, component) => {
    if (category === 'motors' || category === 'radios' ||
        category === 'sensors' || category === 'accessories') {
      if (!Array.isArray(design.components[category])) {
        design.components[category] = [];
      }
      design.components[category].push(component);
    } else {
      design.components[category] = component;
    }

    // Revalidate after adding component
    validateDesign(design);

    return design;
  };

  /**
   * Remove component from design
   */
  const removeComponent = (design, category, componentId = null) => {
    if (category === 'motors' || category === 'radios' ||
        category === 'sensors' || category === 'accessories') {
      design.components[category] = design.components[category].filter(
        c => c.id !== componentId
      );
    } else {
      design.components[category] = null;
    }

    // Revalidate after removing component
    validateDesign(design);

    return design;
  };

  /**
   * Generate Bill of Materials (BOM)
   */
  const generateBOM = (design) => {
    const bom = {
      design_name: design.name,
      design_id: design.id,
      generated: new Date().toISOString(),
      items: [],
      totals: {
        weight_g: 0,
        cost_usd: 0
      }
    };

    // Helper to add item to BOM
    const addItem = (component, quantity = 1, category = '') => {
      if (!component) return;

      const item = {
        category: category,
        name: component.name,
        manufacturer: component.manufacturer || 'N/A',
        part_number: component.part_number || 'N/A',
        quantity: quantity,
        unit_weight_g: component.weight_g || 0,
        total_weight_g: (component.weight_g || 0) * quantity,
        unit_cost_usd: component.cost_usd || 0,
        total_cost_usd: (component.cost_usd || 0) * quantity,
        availability: component.availability || 'unknown'
      };

      bom.items.push(item);
      bom.totals.weight_g += item.total_weight_g;
      bom.totals.cost_usd += item.total_cost_usd;
    };

    // Add components
    if (design.components.airframe) {
      addItem(design.components.airframe, 1, 'Airframe');
    }

    if (design.components.motors && Array.isArray(design.components.motors)) {
      design.components.motors.forEach(motor => addItem(motor, 1, 'Motors'));
    }

    if (design.components.escs) {
      addItem(design.components.escs, 1, 'ESC');
    }

    if (design.components.battery) {
      addItem(design.components.battery, 1, 'Battery');
    }

    if (design.components.flight_controller) {
      addItem(design.components.flight_controller, 1, 'Flight Controller');
    }

    if (design.components.radios && Array.isArray(design.components.radios)) {
      design.components.radios.forEach(radio => addItem(radio, 1, 'Radio'));
    }

    if (design.components.sensors && Array.isArray(design.components.sensors)) {
      design.components.sensors.forEach(sensor => addItem(sensor, 1, 'Sensor'));
    }

    if (design.components.accessories && Array.isArray(design.components.accessories)) {
      design.components.accessories.forEach(acc => addItem(acc, 1, 'Accessories'));
    }

    return bom;
  };

  /**
   * Export design to MissionProject format
   */
  const exportToMissionProject = (design) => {
    const validation = design.validation || validateDesign(design);

    const platform = {
      id: design.id,
      name: design.name,
      type: design.type,
      role: 'ISR', // Default role
      rf_bands: [],
      power: `${design.components.battery?.voltage_nominal_v || 0}V`,
      battery: {
        chemistry: design.components.battery?.chemistry || 'LiPo',
        capacity_wh: design.components.battery?.capacity_wh || 0,
        weight_g: design.components.battery?.weight_g || 0
      },
      payloadKg: validation.metrics?.auw_kg || 0,
      enduranceMin: validation.metrics?.environment?.adjusted_flight_time_min || 0,
      geo: {
        lat: 0,
        lon: 0,
        elevationM: design.environment.altitude_m || 0
      },
      origin_tool: 'platform_designer',
      notes: design.notes || ''
    };

    // Extract RF bands from radios
    if (design.components.radios && Array.isArray(design.components.radios)) {
      platform.rf_bands = design.components.radios
        .map(r => r.frequency_band)
        .filter(band => band);
    }

    return platform;
  };

  /**
   * Download BOM as CSV
   */
  const downloadBOM = (design, fileName = null) => {
    const bom = generateBOM(design);

    const csvLines = [
      'Category,Name,Manufacturer,Part Number,Quantity,Unit Weight (g),Total Weight (g),Unit Cost (USD),Total Cost (USD),Availability'
    ];

    bom.items.forEach(item => {
      csvLines.push([
        item.category,
        item.name,
        item.manufacturer,
        item.part_number,
        item.quantity,
        item.unit_weight_g,
        item.total_weight_g,
        item.unit_cost_usd.toFixed(2),
        item.total_cost_usd.toFixed(2),
        item.availability
      ].join(','));
    });

    // Add totals row
    csvLines.push('');
    csvLines.push(`TOTALS,,,,,${bom.totals.weight_g},${bom.totals.cost_usd.toFixed(2)}`);

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${design.name}_BOM.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Download design as JSON
   */
  const downloadDesign = (design, fileName = null) => {
    const json = JSON.stringify(design, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${design.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Import design from JSON
   */
  const importDesign = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const design = JSON.parse(event.target.result);
          // Assign new ID to avoid conflicts
          design.id = `platform-${Date.now()}`;
          design.name = `${design.name} (imported)`;
          design.modified = new Date().toISOString();

          saveDesign(design);
          resolve(design);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  /**
   * Calculate mission battery requirements
   */
  const calculateMissionBatteries = (design, missionDurationHours) => {
    return PhysicsEngine.calculateBatteryRequirements(
      { components: design.components },
      missionDurationHours,
      design.environment
    );
  };

  // Public API
  return {
    createEmptyDesign,
    loadDesigns,
    saveDesign,
    getDesign,
    deleteDesign,
    validateDesign,
    addComponent,
    removeComponent,
    generateBOM,
    exportToMissionProject,
    downloadBOM,
    downloadDesign,
    importDesign,
    calculateMissionBatteries
  };
})();

// Export for browser global scope
window.PlatformDesigner = PlatformDesigner;
