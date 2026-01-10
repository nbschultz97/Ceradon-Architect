// COTS Architect - Offline Mission Planning Tool
// Routes: home, library, platform, mission, comms, map, export

const APP_VERSION = 'COTS Architect v0.4.0-alpha.2';
const SCHEMA_VERSION = 'MissionProject v2.0.0';

// ============================================================================
// ROUTING
// ============================================================================

const routes = ['home', 'library', 'platform', 'mission', 'comms', 'map', 'export'];

function setActiveRoute(route) {
  const target = routes.includes(route) ? route : 'home';

  document.querySelectorAll('.view').forEach(section => {
    section.hidden = section.id !== target;
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    const isActive = link.dataset.route === target;
    link.classList.toggle('active', isActive);
  });

  // Initialize module when navigated to
  switch (target) {
    case 'library':
      initPartsLibrary();
      break;
    case 'platform':
      initPlatformDesigner();
      restorePlatformDesignerState();
      break;
    case 'mission':
      initMissionPlanner();
      restoreMissionPlannerState();
      break;
    case 'comms':
      initCommsValidator();
      restoreCommsValidatorState();
      break;
    case 'map':
      initMapViewer();
      break;
    case 'export':
      initExport();
      break;
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#/', '') || 'home';
  setActiveRoute(hash);
}

// ============================================================================
// THEME TOGGLE
// ============================================================================

function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('ceradon_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);
  toggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    toggle.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('ceradon_theme', next);
  });
}

// ============================================================================
// VERSION BADGES
// ============================================================================

function initVersionBadges() {
  document.querySelectorAll('[data-app-version]').forEach(el => {
    el.textContent = APP_VERSION;
  });
  document.querySelectorAll('[data-schema-version]').forEach(el => {
    el.textContent = SCHEMA_VERSION;
  });
}

// ============================================================================
// HOME PAGE
// ============================================================================

function initHomePage() {
  // Load sample mission button
  const loadSampleBtn = document.getElementById('loadSampleMission');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', loadSampleMission);
  }

  // Project status buttons
  const homeLoadDemo = document.getElementById('homeLoadDemo');
  if (homeLoadDemo) {
    homeLoadDemo.addEventListener('click', loadSampleMission);
  }

  const homeImportProject = document.getElementById('homeImportProject');
  const homeImportProjectFile = document.getElementById('homeImportProjectFile');
  if (homeImportProject && homeImportProjectFile) {
    homeImportProject.addEventListener('click', () => homeImportProjectFile.click());
    homeImportProjectFile.addEventListener('change', handleProjectImport);
  }

  const homeClearProject = document.getElementById('homeClearProject');
  if (homeClearProject) {
    homeClearProject.addEventListener('click', clearProject);
  }

  // Update project status display
  updateProjectStatus();
}

async function loadSampleMission() {
  try {
    const btn = document.getElementById('homeLoadDemo');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading sample data...';
    }

    // Step 1: Load sample parts catalog
    updateProjectStatus();
    const partsResult = await PartsLibrary.loadSampleCatalog();
    if (!partsResult.success) {
      throw new Error('Failed to load sample parts catalog');
    }

    // Step 2: Create sample platforms
    await createSamplePlatforms();

    // Step 3: Create sample mission
    createSampleMission();

    // Step 4: Create sample comms network
    createSampleCommsNetwork();

    // Update UI
    updateProjectStatus();

    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.defaultLabel || 'Load sample project';
    }

    alert('✅ Sample project loaded!\n\n' +
          '• 40+ COTS parts in catalog\n' +
          '• 2 sample platform designs\n' +
          '• 48-hour recon mission plan\n' +
          '• 3-node comms network\n\n' +
          'Explore each module to see the data!');

  } catch (error) {
    console.error('Failed to load sample project:', error);
    alert(`Failed to load sample project: ${error.message}\n\nCheck console for details.`);

    const btn = document.getElementById('homeLoadDemo');
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.defaultLabel || 'Load sample project';
    }
  }
}

function handleProjectImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof MissionProjectStore !== 'undefined') {
        MissionProjectStore.saveMissionProject(data);
        updateProjectStatus();
        alert('Project imported successfully!');
      }
    } catch (error) {
      console.error('Failed to import project:', error);
      alert('Failed to import project. Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

function clearProject() {
  if (confirm('Clear current project? This will remove all local data.')) {
    localStorage.removeItem('ceradon_mission_project');
    updateProjectStatus();
  }
}

function updateProjectStatus() {
  const statusName = document.getElementById('statusProjectName');
  const statusMeta = document.getElementById('statusProjectMeta');
  const statusSource = document.getElementById('statusProjectSource');
  const statusUpdated = document.getElementById('statusLastUpdated');

  if (typeof MissionProjectStore !== 'undefined') {
    const project = MissionProjectStore.loadMissionProject();

    if (statusName) {
      statusName.textContent = project.meta?.name || 'Unnamed Project';
    }
    if (statusMeta) {
      const platforms = project.platforms?.length || 0;
      const phases = project.mission?.phases?.length || 0;
      statusMeta.textContent = `${platforms} platform(s), ${phases} phase(s)`;
    }
    if (statusSource) {
      statusSource.textContent = project.meta?.inventory_catalog || 'Not specified';
    }
    if (statusUpdated) {
      statusUpdated.textContent = project.meta?.last_updated ? new Date(project.meta.last_updated).toLocaleString() : 'Not set';
    }
  }
}

// ============================================================================
// PARTS LIBRARY
// ============================================================================

let partsLibraryInitialized = false;

function initPartsLibrary() {
  if (partsLibraryInitialized) return;
  partsLibraryInitialized = true;

  console.log('Initializing Parts Library...');

  // Initialize IndexedDB
  if (typeof PartsLibrary !== 'undefined') {
    PartsLibrary.initDB().then(() => {
      console.log('Parts Library DB initialized');
      loadPartsLibraryUI();
    }).catch(error => {
      console.error('Failed to initialize Parts Library DB:', error);
    });
  }

  // Wire up buttons
  const importCSV = document.getElementById('importCSV');
  const csvFileInput = document.getElementById('csvFileInput');
  if (importCSV && csvFileInput) {
    importCSV.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleCSVImport);
  }

  const loadSampleParts = document.getElementById('loadSampleParts');
  if (loadSampleParts) {
    loadSampleParts.addEventListener('click', loadSamplePartsLibrary);
  }

  const exportPartsJSON = document.getElementById('exportPartsJSON');
  if (exportPartsJSON) {
    exportPartsJSON.addEventListener('click', exportPartsLibrary);
  }

  const downloadCSVTemplate = document.getElementById('downloadCSVTemplate');
  if (downloadCSVTemplate) {
    downloadCSVTemplate.addEventListener('click', handleDownloadCSVTemplate);
  }

  // Wire up search and filters
  const partsSearch = document.getElementById('partsSearch');
  if (partsSearch) {
    partsSearch.addEventListener('input', filterParts);
  }

  const partsCategoryFilter = document.getElementById('partsCategoryFilter');
  if (partsCategoryFilter) {
    partsCategoryFilter.addEventListener('change', filterParts);
  }
}

function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csvText = e.target.result;

    if (typeof CSVImporter !== 'undefined') {
      try {
        const parts = CSVImporter.parseCSV(csvText);
        console.log(`Parsed ${parts.length} parts from CSV`);

        // Import into PartsLibrary
        if (typeof PartsLibrary !== 'undefined') {
          Promise.all(parts.map(part => PartsLibrary.addPart(part.category || 'accessories', part)))
            .then(() => {
              alert(`Imported ${parts.length} parts successfully!`);
              loadPartsLibraryUI();
            })
            .catch(error => {
              console.error('Failed to import parts:', error);
              alert('Failed to import some parts. Check console for details.');
            });
        }
      } catch (error) {
        console.error('Failed to parse CSV:', error);
        alert('Failed to parse CSV file. Check format and try again.');
      }
    }
  };
  reader.readAsText(file);
}

async function loadSamplePartsLibrary() {
  if (typeof PartsLibrary === 'undefined') {
    alert('Parts Library not initialized');
    return;
  }

  try {
    updatePartsStatus('Loading sample catalog...');
    const result = await PartsLibrary.loadSampleCatalog();

    if (result.success) {
      await loadPartsLibraryUI();
      updatePartsStatus('Sample catalog loaded successfully');
      alert('Sample catalog loaded! Browse 40+ realistic COTS components.');
    } else {
      updatePartsStatus('Failed to load sample catalog');
      alert(`Failed to load sample catalog: ${result.message}`);
    }
  } catch (error) {
    console.error('Error loading sample catalog:', error);
    updatePartsStatus('Error loading sample catalog');
    alert('Error loading sample catalog. Check console for details.');
  }
}

function exportPartsLibrary() {
  if (typeof PartsLibrary !== 'undefined') {
    PartsLibrary.exportLibrary().then(library => {
      const json = JSON.stringify(library, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parts_library.json';
      a.click();
      URL.revokeObjectURL(url);
    }).catch(error => {
      console.error('Failed to export library:', error);
      alert('Failed to export library. Check console for details.');
    });
  }
}

function handleDownloadCSVTemplate() {
  if (typeof CSVImporter === 'undefined') {
    alert('CSV Importer not loaded. Please refresh the page.');
    return;
  }

  const categorySelect = document.getElementById('templateCategory');
  if (!categorySelect) {
    alert('Template category selector not found.');
    return;
  }

  const category = categorySelect.value;
  try {
    CSVImporter.downloadTemplate(category);
    console.log(`Downloaded CSV template for category: ${category}`);
  } catch (error) {
    console.error('Failed to download CSV template:', error);
    alert('Failed to download CSV template. Check console for details.');
  }
}

async function loadPartsLibraryUI() {
  if (typeof PartsLibrary === 'undefined') return;

  const grid = document.getElementById('partsGrid');
  if (!grid) return;

  try {
    const library = await PartsLibrary.exportLibrary();
    const allParts = [];

    // Flatten all categories into one array
    Object.entries(library).forEach(([category, parts]) => {
      if (Array.isArray(parts)) {
        parts.forEach(part => {
          allParts.push({ ...part, category });
        });
      }
    });

    if (allParts.length === 0) {
      grid.innerHTML = '<p class="small muted">No parts in library. Import CSV or load sample catalog.</p>';
      updatePartsStatus(`No parts loaded`);
      return;
    }

    grid.innerHTML = allParts.map(part => `
      <div class="part-card">
        <strong>${part.name || part.model || 'Unnamed Part'}</strong>
        <p class="small muted">${part.category || 'Unknown'}</p>
        <p class="small">${part.manufacturer || ''} ${part.model || ''}</p>
        <div class="part-specs">
          ${part.weight_g ? `<span>${part.weight_g}g</span>` : ''}
          ${part.cost_usd ? `<span>$${part.cost_usd}</span>` : ''}
        </div>
      </div>
    `).join('');

    updatePartsStatus(`${allParts.length} parts loaded`);
  } catch (error) {
    console.error('Failed to load parts UI:', error);
    grid.innerHTML = '<p class="small muted">Error loading parts. Check console for details.</p>';
  }
}

function filterParts() {
  const searchTerm = document.getElementById('partsSearch')?.value.toLowerCase() || '';
  const category = document.getElementById('partsCategoryFilter')?.value || 'all';

  const cards = document.querySelectorAll('.part-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesSearch = !searchTerm || text.includes(searchTerm);
    const matchesCategory = category === 'all' || card.querySelector('.small.muted')?.textContent === category;

    card.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
  });
}

function updatePartsStatus(message) {
  const status = document.getElementById('partsLibraryStatus');
  if (status) {
    status.textContent = message;
  }
}

// ============================================================================
// PLATFORM DESIGNER
// ============================================================================

let platformDesignerInitialized = false;
let currentPlatformDesign = null;

function initPlatformDesigner() {
  if (platformDesignerInitialized) return;
  platformDesignerInitialized = true;

  console.log('Initializing Platform Designer...');

  // Try to load draft or create empty design
  const draft = localStorage.getItem('platform_designer_draft');
  if (draft) {
    try {
      currentPlatformDesign = JSON.parse(draft);
    } catch (e) {
      currentPlatformDesign = PlatformDesigner.createEmptyDesign();
    }
  } else {
    currentPlatformDesign = PlatformDesigner.createEmptyDesign();
  }

  // Check for environmental data from map and auto-populate if not already set
  try {
    const envData = localStorage.getItem('ceradon_environmental_data');
    const location = localStorage.getItem('ceradon_selected_location');

    if (envData && location) {
      const parsedEnvData = JSON.parse(envData);
      const parsedLocation = JSON.parse(location);

      // Only auto-populate if current design has default/empty values
      if (currentPlatformDesign.environment.altitude_m === 0 && parsedLocation.elevation_m !== undefined) {
        currentPlatformDesign.environment.altitude_m = parsedLocation.elevation_m;
      }

      if (currentPlatformDesign.environment.temperature_c === 20 && parsedEnvData.temperature?.suggested_c !== undefined) {
        currentPlatformDesign.environment.temperature_c = parsedEnvData.temperature.suggested_c;
      }
    }
  } catch (error) {
    console.log('[PlatformDesigner] No environmental data found or error loading it');
  }

  // Wire up form inputs with auto-save
  const platformName = document.getElementById('platformName');
  if (platformName) {
    platformName.addEventListener('input', (e) => {
      currentPlatformDesign.name = e.target.value;
      savePlatformDesignerDraft();
    });
  }

  const platformType = document.getElementById('platformType');
  if (platformType) {
    platformType.addEventListener('change', (e) => {
      currentPlatformDesign.type = e.target.value;
      savePlatformDesignerDraft();
    });
  }

  const envAltitude = document.getElementById('envAltitude');
  if (envAltitude) {
    envAltitude.addEventListener('input', (e) => {
      currentPlatformDesign.environment.altitude_m = parseInt(e.target.value) || 0;
      savePlatformDesignerDraft();
    });
  }

  const envTemperature = document.getElementById('envTemperature');
  if (envTemperature) {
    envTemperature.addEventListener('input', (e) => {
      currentPlatformDesign.environment.temperature_c = parseInt(e.target.value) || 0;
      savePlatformDesignerDraft();
    });
  }

  // Wire up action buttons
  const validateBtn = document.getElementById('validatePlatform');
  if (validateBtn) {
    validateBtn.addEventListener('click', validateCurrentPlatform);
  }

  const savePlatformBtn = document.getElementById('savePlatform');
  if (savePlatformBtn) {
    savePlatformBtn.addEventListener('click', saveCurrentPlatform);
  }

  // Load component selectors
  loadComponentSelectors();

  // Load saved designs
  loadSavedPlatforms();

  // Listen for environmental data events from Map module
  if (typeof MissionProjectEvents !== 'undefined') {
    MissionProjectEvents.on(MissionProjectEvents.EVENTS.ENV_DATA_LOADED, (detail) => {
      console.log('[PlatformDesigner] Environmental data received:', detail);
      const envData = detail.environmentalData;
      const location = detail.location;

      // Auto-populate altitude from selected location
      if (location && location.elevation_m !== undefined) {
        const envAltitude = document.getElementById('envAltitude');
        if (envAltitude) {
          envAltitude.value = location.elevation_m;
          currentPlatformDesign.environment.altitude_m = location.elevation_m;
          savePlatformDesignerDraft();
        }
      }

      // Auto-populate temperature from environmental data
      if (envData && envData.temperature && envData.temperature.suggested_c !== undefined) {
        const envTemperature = document.getElementById('envTemperature');
        if (envTemperature) {
          envTemperature.value = envData.temperature.suggested_c;
          currentPlatformDesign.environment.temperature_c = envData.temperature.suggested_c;
          savePlatformDesignerDraft();
        }
      }

      // Show toast notification
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success(
          `Environmental data applied: ${location.elevation_m}m altitude, ${envData.temperature.suggested_c}°C`,
          4000
        );
      }
    });
  }
}

function savePlatformDesignerDraft() {
  if (currentPlatformDesign) {
    localStorage.setItem('platform_designer_draft', JSON.stringify(currentPlatformDesign));
  }
}

function restorePlatformDesignerState() {
  if (!currentPlatformDesign) return;

  // Restore form values
  const platformName = document.getElementById('platformName');
  if (platformName && currentPlatformDesign.name) {
    platformName.value = currentPlatformDesign.name;
  }

  const platformType = document.getElementById('platformType');
  if (platformType && currentPlatformDesign.type) {
    platformType.value = currentPlatformDesign.type;
  }

  const envAltitude = document.getElementById('envAltitude');
  if (envAltitude && currentPlatformDesign.environment?.altitude_m !== undefined) {
    envAltitude.value = currentPlatformDesign.environment.altitude_m;
  }

  const envTemperature = document.getElementById('envTemperature');
  if (envTemperature && currentPlatformDesign.environment?.temperature_c !== undefined) {
    envTemperature.value = currentPlatformDesign.environment.temperature_c;
  }

  // Refresh component selection display
  updateComponentSelectionDisplay();
}

async function loadComponentSelectors() {
  const container = document.getElementById('componentSelection');
  if (!container) return;

  try {
    // Get parts from library
    if (typeof PartsLibrary === 'undefined') {
      container.innerHTML = `
        <p class="small muted">Parts Library not loaded. Load parts first.</p>
        <a class="btn subtle" href="/#/library">Go to Parts Library →</a>
      `;
      return;
    }

    await PartsLibrary.initDB();
    const library = await PartsLibrary.exportLibrary();

    // Create component selection UI
    container.innerHTML = `
      <div class="form-grid">
        <label>Airframe
          <select id="selectAirframe">
            <option value="">-- Select Airframe --</option>
            ${(library.airframes || []).map(part =>
              `<option value="${part.id}">${part.name || part.model} (${part.weight_g}g)</option>`
            ).join('')}
          </select>
        </label>

        <label>Battery
          <select id="selectBattery">
            <option value="">-- Select Battery --</option>
            ${(library.batteries || []).map(part =>
              `<option value="${part.id}">${part.name || part.model} (${part.capacity_wh}Wh, ${part.weight_g}g)</option>`
            ).join('')}
          </select>
        </label>

        <label>ESC
          <select id="selectESC">
            <option value="">-- Select ESC --</option>
            ${(library.escs || []).map(part =>
              `<option value="${part.id}">${part.name || part.model} (${part.max_current_a}A)</option>`
            ).join('')}
          </select>
        </label>

        <label>Flight Controller
          <select id="selectFC">
            <option value="">-- Select Flight Controller --</option>
            ${(library.flight_controllers || []).map(part =>
              `<option value="${part.id}">${part.name || part.model}</option>`
            ).join('')}
          </select>
        </label>
      </div>

      <div style="margin-top: 16px;">
        <label>Motors (select multiple)
          <select id="selectMotors" multiple style="min-height: 80px;">
            ${(library.motors || []).map(part =>
              `<option value="${part.id}">${part.name || part.model} (${part.max_thrust_g}g thrust)</option>`
            ).join('')}
          </select>
          <p class="small muted">Hold Ctrl/Cmd to select multiple motors</p>
        </label>
      </div>

      <div id="selectedComponents" style="margin-top: 16px;"></div>
    `;

    // Wire up component selections
    const selects = ['Airframe', 'Battery', 'ESC', 'FC'];
    selects.forEach(type => {
      const select = document.getElementById(`select${type}`);
      if (select) {
        select.addEventListener('change', (e) => handleComponentSelect(type.toLowerCase().replace('fc', 'flight_controller'), e.target.value, library));
      }
    });

    const motorSelect = document.getElementById('selectMotors');
    if (motorSelect) {
      motorSelect.addEventListener('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedMotors = selectedOptions.map(opt => {
          return library.motors.find(m => m.id === opt.value);
        }).filter(m => m);

        currentPlatformDesign.components.motors = selectedMotors;
        updateSelectedComponentsDisplay();
      });
    }

  } catch (error) {
    console.error('Failed to load component selectors:', error);
    container.innerHTML = `<p class="small muted">Error loading parts. Check console.</p>`;
  }
}

function handleComponentSelect(category, partId, library) {
  if (!partId) {
    currentPlatformDesign.components[category] = null;
  } else {
    // Find part in library
    const categoryParts = library[category + 's'] || library[category];
    const part = categoryParts?.find(p => p.id === partId);
    if (part) {
      currentPlatformDesign.components[category] = part;
    }
  }
  updateSelectedComponentsDisplay();
}

function updateSelectedComponentsDisplay() {
  const container = document.getElementById('selectedComponents');
  if (!container) return;

  const components = currentPlatformDesign.components;
  const selected = [];

  if (components.airframe) selected.push(`<strong>Airframe:</strong> ${components.airframe.name}`);
  if (components.battery) selected.push(`<strong>Battery:</strong> ${components.battery.name} (${components.battery.capacity_wh}Wh)`);
  if (components.escs) selected.push(`<strong>ESC:</strong> ${components.escs.name}`);
  if (components.flight_controller) selected.push(`<strong>FC:</strong> ${components.flight_controller.name}`);
  if (components.motors?.length > 0) {
    selected.push(`<strong>Motors:</strong> ${components.motors.length}x ${components.motors[0].name}`);
  }

  if (selected.length === 0) {
    container.innerHTML = '<p class="small muted">No components selected</p>';
  } else {
    container.innerHTML = `
      <div style="padding: 12px; background: var(--panel); border-radius: 8px; border: 1px solid var(--border);">
        <p class="small"><strong>Selected Components:</strong></p>
        <ul class="bullet-list small">
          ${selected.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Update platform visualization
  if (typeof PlatformViz !== 'undefined') {
    PlatformViz.updateVisualization(components);
  }
}

function validateCurrentPlatform() {
  const resultsDiv = document.getElementById('validationResults');
  if (!resultsDiv || !currentPlatformDesign) return;

  // Validate the design
  const validation = PlatformDesigner.validateDesign(currentPlatformDesign);
  const metrics = validation.metrics;
  const env = metrics.environment || {};

  // Build results display
  let html = '<div class="validation-panel">';

  // Metrics summary
  html += `
    <div style="margin-bottom: 16px;">
      <p class="small"><strong>Platform Metrics</strong></p>
      <div class="form-grid" style="margin-top: 8px;">
        <div>
          <p class="small muted">All-Up Weight</p>
          <strong>${metrics.auw_kg?.toFixed(2) || 0} kg</strong>
        </div>
        <div>
          <p class="small muted">Total Thrust</p>
          <strong>${metrics.total_thrust_g || 0} g</strong>
        </div>
        <div>
          <p class="small muted">Thrust-to-Weight</p>
          <strong>${metrics.thrust_to_weight?.toFixed(2) || 0}</strong>
        </div>
        <div>
          <p class="small muted">Flight Time (nominal)</p>
          <strong>${metrics.nominal_flight_time_min?.toFixed(1) || 0} min</strong>
        </div>
      </div>
    </div>
  `;

  // Environmental impact
  if (env.altitude_m > 0 || env.temperature_c !== 20) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: var(--card); border-radius: 8px;">
        <p class="small"><strong>Environmental Impact</strong></p>
        <ul class="bullet-list small">
          <li>Altitude: ${env.altitude_m}m → Thrust reduced by ${env.thrust_reduction_pct?.toFixed(1)}%</li>
          <li>Temperature: ${env.temperature_c}°C → Battery capacity reduced by ${env.battery_capacity_reduction_pct?.toFixed(1)}%</li>
          <li><strong>Adjusted T/W: ${env.adjusted_thrust_to_weight?.toFixed(2)}</strong></li>
          <li><strong>Adjusted Flight Time: ${env.adjusted_flight_time_min?.toFixed(1)} min</strong></li>
        </ul>
      </div>
    `;
  }

  // Errors
  if (validation.errors.length > 0) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: #ff4444; color: white; border-radius: 8px;">
        <p class="small"><strong>⚠️ Errors</strong></p>
        <ul class="bullet-list small">
          ${validation.errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Warnings
  if (validation.warnings.length > 0) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: #ffaa00; color: #000; border-radius: 8px;">
        <p class="small"><strong>⚠️ Warnings</strong></p>
        <ul class="bullet-list small">
          ${validation.warnings.map(warn => `<li>${warn}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Recommendations
  if (validation.recommendations.length > 0) {
    html += `
      <div style="padding: 12px; background: var(--panel); border-radius: 8px; border: 1px solid var(--border);">
        <p class="small"><strong>💡 Recommendations</strong></p>
        <ul class="bullet-list small">
          ${validation.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  html += '</div>';
  resultsDiv.innerHTML = html;
}

function saveCurrentPlatform() {
  if (!currentPlatformDesign) return;

  // Ensure platform has a name
  if (!currentPlatformDesign.name || currentPlatformDesign.name === 'Untitled Platform') {
    const name = prompt('Enter a name for this platform:');
    if (!name) return;
    currentPlatformDesign.name = name;
  }

  // Save the design
  PlatformDesigner.saveDesign(currentPlatformDesign);

  alert(`Platform "${currentPlatformDesign.name}" saved successfully!`);

  // Reload saved platforms list
  loadSavedPlatforms();
}

function loadSavedPlatforms() {
  // This will be displayed in a future enhancement
  console.log('Saved platforms:', PlatformDesigner.loadDesigns());
}

/**
 * Create and save sample platform designs for demo purposes
 */
async function createSamplePlatforms() {
  try {
    // Ensure Parts Library is initialized and has data
    await PartsLibrary.initDB();
    const library = await PartsLibrary.exportLibrary();

    // Check if we have parts loaded
    const hasParts = library.motors?.length > 0 && library.batteries?.length > 0;
    if (!hasParts) {
      alert('Load the sample parts catalog first before creating sample platforms.');
      return;
    }

    // Sample Platform 1: Medium Quadcopter ISR
    const quadPlatform = PlatformDesigner.createEmptyDesign();
    quadPlatform.name = 'X500 ISR Quadcopter';
    quadPlatform.description = 'Medium quadcopter optimized for ISR missions with 40min flight time';
    quadPlatform.type = 'multi-rotor';
    quadPlatform.environment = { altitude_m: 1000, temperature_c: 15 };

    // Add components (using sample catalog IDs)
    quadPlatform.components.airframe = library.airframes?.find(a => a.id === 'airframe-001');
    quadPlatform.components.motors = [
      library.motors?.find(m => m.id === 'motor-001'),
      library.motors?.find(m => m.id === 'motor-001'),
      library.motors?.find(m => m.id === 'motor-001'),
      library.motors?.find(m => m.id === 'motor-001')
    ].filter(m => m);
    quadPlatform.components.escs = library.escs?.find(e => e.id === 'esc-001');
    quadPlatform.components.battery = library.batteries?.find(b => b.id === 'battery-002');
    quadPlatform.components.flight_controller = library.flight_controllers?.find(fc => fc.id === 'fc-001');
    quadPlatform.components.radios = [library.radios?.find(r => r.id === 'radio-001')].filter(r => r);
    quadPlatform.components.sensors = [
      library.sensors?.find(s => s.id === 'sensor-003'),
      library.sensors?.find(s => s.id === 'sensor-004')
    ].filter(s => s);

    // Validate and save
    PlatformDesigner.validateDesign(quadPlatform);
    PlatformDesigner.saveDesign(quadPlatform);

    // Sample Platform 2: Long Endurance Fixed-Wing
    const fwPlatform = PlatformDesigner.createEmptyDesign();
    fwPlatform.name = 'Skywalker X8 Long Range';
    fwPlatform.description = 'Fixed-wing platform for long-range reconnaissance';
    fwPlatform.type = 'fixed-wing';
    fwPlatform.environment = { altitude_m: 2000, temperature_c: 10 };

    fwPlatform.components.airframe = library.airframes?.find(a => a.id === 'airframe-003');
    fwPlatform.components.motors = [library.motors?.find(m => m.id === 'motor-004')].filter(m => m);
    fwPlatform.components.escs = library.escs?.find(e => e.id === 'esc-002');
    fwPlatform.components.battery = library.batteries?.find(b => b.id === 'battery-004');
    fwPlatform.components.flight_controller = library.flight_controllers?.find(fc => fc.id === 'fc-002');
    fwPlatform.components.radios = [
      library.radios?.find(r => r.id === 'radio-001'),
      library.radios?.find(r => r.id === 'radio-002')
    ].filter(r => r);
    fwPlatform.components.sensors = [
      library.sensors?.find(s => s.id === 'sensor-001'),
      library.sensors?.find(s => s.id === 'sensor-004')
    ].filter(s => s);

    PlatformDesigner.validateDesign(fwPlatform);
    PlatformDesigner.saveDesign(fwPlatform);

    alert('Sample platforms created!\n\n1. X500 ISR Quadcopter (medium multi-rotor)\n2. Skywalker X8 Long Range (fixed-wing)');

    return { quad: quadPlatform, fixedWing: fwPlatform };
  } catch (error) {
    console.error('Error creating sample platforms:', error);
    alert('Error creating sample platforms. Check console for details.');
    return null;
  }
}

/**
 * Create sample mission plan with phases
 */
function createSampleMission() {
  const platforms = PlatformDesigner.loadDesigns();

  if (platforms.length === 0) {
    alert('Create sample platforms first before creating a sample mission.');
    return;
  }

  const mission = MissionPlanner.createEmptyPlan();
  mission.name = 'ISR Mission - Objective Rally Point Bravo';
  mission.description = 'Multi-day reconnaissance and surveillance operation';
  mission.duration_hours = 48;
  mission.terrain = 'temperate';
  mission.team.size = 4;
  mission.team.roles = ['Team Lead', 'UxS Pilot', 'Payload Operator', 'Mesh Lead'];

  // Add phases
  MissionPlanner.addPhase(mission, {
    name: 'Infiltration',
    type: 'INFIL',
    duration_hours: 4,
    activity_level: 'low',
    platforms_active: [],
    notes: 'Movement to ORP Bravo'
  });

  MissionPlanner.addPhase(mission, {
    name: 'ORP Setup',
    type: 'ORP',
    duration_hours: 2,
    activity_level: 'medium',
    platforms_active: [],
    notes: 'Establish objective rally point and prep equipment'
  });

  MissionPlanner.addPhase(mission, {
    name: 'ISR Operations Day 1',
    type: 'ON_STATION',
    duration_hours: 12,
    activity_level: 'high',
    platforms_active: [platforms[0].id],
    notes: 'Primary reconnaissance of target area'
  });

  MissionPlanner.addPhase(mission, {
    name: 'ISR Operations Day 2',
    type: 'ON_STATION',
    duration_hours: 12,
    activity_level: 'high',
    platforms_active: [platforms[0].id],
    notes: 'Continued surveillance and pattern-of-life analysis'
  });

  MissionPlanner.addPhase(mission, {
    name: 'Exfiltration',
    type: 'EXFIL',
    duration_hours: 4,
    activity_level: 'low',
    platforms_active: [],
    notes: 'Return to base'
  });

  MissionPlanner.addPhase(mission, {
    name: 'Contingency Reserve',
    type: 'CONTINGENCY',
    duration_hours: 14,
    activity_level: 'low',
    platforms_active: [],
    notes: 'Reserve time for delays or mission extension'
  });

  MissionPlanner.savePlan(mission);

  alert('Sample mission created!\n\n"ISR Mission - Objective Rally Point Bravo"\n48 hours, 6 phases, 4-person team');

  return mission;
}

/**
 * Create sample comms network
 */
function createSampleCommsNetwork() {
  const analysis = CommsValidator.createEmptyAnalysis();
  analysis.name = 'Ground Control to UAV Link Analysis';
  analysis.description = 'RF link budget analysis for ISR platform operations';
  analysis.terrain = 'rural';
  analysis.weather = 'clear';

  // Add GCS node
  CommsValidator.addNode(analysis, {
    name: 'GCS (Ground Control)',
    type: 'transceiver',
    location: { lat: 38.9072, lon: -77.0369, elevation_m: 10, height_agl_m: 2 },
    radio: {
      frequency_mhz: 915,
      power_output_dbm: 30,
      tx_gain_dbi: 5,
      rx_gain_dbi: 5,
      sensitivity_dbm: -110,
      tx_cable_loss_db: 1,
      rx_cable_loss_db: 1
    }
  });

  // Add UAV node
  CommsValidator.addNode(analysis, {
    name: 'UAV-1 (ISR Platform)',
    type: 'transceiver',
    location: { lat: 38.9500, lon: -77.0500, elevation_m: 500, height_agl_m: 500 },
    radio: {
      frequency_mhz: 915,
      power_output_dbm: 27,
      tx_gain_dbi: 2,
      rx_gain_dbi: 2,
      sensitivity_dbm: -107,
      tx_cable_loss_db: 0.5,
      rx_cable_loss_db: 0.5
    }
  });

  // Add relay node
  CommsValidator.addNode(analysis, {
    name: 'Relay-1 (High Ground)',
    type: 'relay',
    location: { lat: 38.9286, lon: -77.0435, elevation_m: 100, height_agl_m: 30 },
    radio: {
      frequency_mhz: 915,
      power_output_dbm: 30,
      tx_gain_dbi: 8,
      rx_gain_dbi: 8,
      sensitivity_dbm: -112,
      tx_cable_loss_db: 2,
      rx_cable_loss_db: 2
    }
  });

  // Analyze links
  CommsValidator.analyzeLinks(analysis);
  CommsValidator.saveAnalysis(analysis);

  alert('Sample comms network created!\n\n3 nodes: GCS, UAV-1, Relay-1\nLink analysis complete');

  return analysis;
}

// ============================================================================
// MISSION PLANNER
// ============================================================================

let missionPlannerInitialized = false;
let currentMissionPlan = null;

function initMissionPlanner() {
  if (missionPlannerInitialized) return;
  missionPlannerInitialized = true;

  console.log('Initializing Mission Planner...');

  // Initialize with empty plan
  currentMissionPlan = MissionPlanner.createEmptyPlan();

  // Wire up mission details inputs
  const missionName = document.getElementById('missionName');
  if (missionName) {
    missionName.addEventListener('change', (e) => {
      currentMissionPlan.name = e.target.value;
    });
  }

  const missionDuration = document.getElementById('missionDuration');
  if (missionDuration) {
    missionDuration.addEventListener('change', (e) => {
      currentMissionPlan.duration_hours = parseInt(e.target.value);
    });
  }

  const missionTerrain = document.getElementById('missionTerrain');
  if (missionTerrain) {
    missionTerrain.addEventListener('change', (e) => {
      currentMissionPlan.terrain = e.target.value;
    });
  }

  const teamSize = document.getElementById('teamSize');
  if (teamSize) {
    teamSize.addEventListener('change', (e) => {
      const size = parseInt(e.target.value);
      currentMissionPlan.team.size = size;
      // Adjust roles array to match team size
      currentMissionPlan.team.roles = MissionPlanner.OPERATOR_ROLES.slice(0, size);
    });
  }

  // Wire up buttons
  const addPhaseBtn = document.getElementById('addPhase');
  if (addPhaseBtn) {
    addPhaseBtn.addEventListener('click', addMissionPhase);
  }

  const calculateBtn = document.getElementById('calculateLogistics');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateMissionLogistics);
  }

  const downloadBtn = document.getElementById('downloadPackingLists');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadAllPackingLists);
  }

  // Initial phase editor render
  renderPhaseEditor();

  // Listen for map location and environmental data events
  if (typeof MissionProjectEvents !== 'undefined') {
    MissionProjectEvents.on(MissionProjectEvents.EVENTS.MAP_LOCATION_SELECTED, (detail) => {
      console.log('[MissionPlanner] Map location received:', detail);
      // Store in mission plan metadata
      if (currentMissionPlan) {
        currentMissionPlan.location = detail.location;
      }

      // Show toast notification
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success(
          `Mission location set: ${detail.location.lat.toFixed(4)}°, ${detail.location.lon.toFixed(4)}°`,
          3000
        );
      }
    });

    MissionProjectEvents.on(MissionProjectEvents.EVENTS.ENV_DATA_LOADED, (detail) => {
      console.log('[MissionPlanner] Environmental data received:', detail);
      // Store in mission plan metadata
      if (currentMissionPlan) {
        currentMissionPlan.environmentalData = detail.environmentalData;
        currentMissionPlan.location = detail.location;
      }

      // Display environmental data in Mission Planner
      displayMissionEnvData(detail.environmentalData, detail.location);

      // Show toast notification
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success(
          'Environmental data loaded for mission planning',
          3000
        );
      }
    });
  }

  // Check for existing location data from localStorage
  try {
    const location = localStorage.getItem('ceradon_selected_location');
    const envData = localStorage.getItem('ceradon_environmental_data');

    if (location && currentMissionPlan) {
      const parsedLocation = JSON.parse(location);
      currentMissionPlan.location = parsedLocation;
    }

    if (envData && currentMissionPlan) {
      const parsedEnvData = JSON.parse(envData);
      currentMissionPlan.environmentalData = parsedEnvData;

      // Display on init if both available
      if (location && envData) {
        const parsedLocation = JSON.parse(location);
        displayMissionEnvData(parsedEnvData, parsedLocation);
      }
    }
  } catch (error) {
    console.log('[MissionPlanner] No location/environmental data found');
  }
}

/**
 * Display environmental data in Mission Planner
 */
function displayMissionEnvData(envData, location) {
  const card = document.getElementById('missionEnvDataCard');
  const display = document.getElementById('missionEnvDataDisplay');

  if (!card || !display || !envData || !location) return;

  // Show the card
  card.style.display = 'block';

  // Check if this is date range data
  if (envData.type === 'range') {
    // Display date range summary
    const startDate = new Date(envData.startDate);
    const endDate = new Date(envData.endDate);

    display.innerHTML = `
      <div style="padding: 12px; background: var(--card); border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">📍 Location</p>
        <p class="small" style="margin: 0 0 12px 0;">
          ${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}° at ${location.elevation_m}m elevation
        </p>

        <p style="margin: 12px 0 8px 0; font-weight: bold;">📅 Mission Duration</p>
        <p class="small" style="margin: 0 0 12px 0;">
          ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
        </p>

        <p style="margin: 12px 0 8px 0; font-weight: bold;">🌡️ Temperature (Average)</p>
        <p class="small" style="margin: 0;">
          Average: <strong>${envData.summary.avgTemp}°C</strong><br>
          Range: ${envData.summary.minTemp}°C to ${envData.summary.maxTemp}°C
        </p>

        <p style="margin: 12px 0 8px 0; font-weight: bold;">💨 Wind (Average)</p>
        <p class="small" style="margin: 0;">
          Average: <strong>${envData.summary.avgWind} m/s</strong>
        </p>

        <p class="small muted" style="margin: 12px 0 0 0;">
          Multi-day mission data • ${envData.monthlyData.length} month(s)
        </p>
      </div>
    `;
  } else {
    // Display single date data
    display.innerHTML = `
      <div style="padding: 12px; background: var(--card); border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">📍 Location</p>
        <p class="small" style="margin: 0 0 12px 0;">
          ${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}° at ${location.elevation_m}m elevation
        </p>

        <p style="margin: 12px 0 8px 0; font-weight: bold;">🌡️ Temperature</p>
        <p class="small" style="margin: 0;">
          Suggested: <strong>${envData.temperature.suggested_c}°C</strong><br>
          Range: ${envData.temperature.avg_low_c}°C to ${envData.temperature.avg_high_c}°C
        </p>

        <p style="margin: 12px 0 8px 0; font-weight: bold;">💨 Wind</p>
        <p class="small" style="margin: 0;">
          Average: <strong>${envData.wind.suggested_ms} m/s</strong><br>
          Max Gust: ${envData.wind.max_gust_ms} m/s
        </p>

        ${envData.warnings && envData.warnings.length > 0 ? `
          <p style="margin: 12px 0 8px 0; font-weight: bold;">⚠️ Warnings</p>
          ${envData.warnings.map(w => `
            <div style="padding: 6px; margin-bottom: 4px; background: ${w.severity === 'critical' ? '#ff444422' : '#ffaa0022'}; border-left: 3px solid ${w.severity === 'critical' ? '#ff4444' : '#ffaa00'}; border-radius: 4px;">
              <p class="small" style="margin: 0; font-size: 12px;">${w.message}</p>
            </div>
          `).join('')}
        ` : ''}

        <p class="small muted" style="margin: 12px 0 0 0;">
          Data from ${envData.region_name} • ${new Date(envData.date).toLocaleDateString()}
        </p>
      </div>
    `;
  }
}

function restoreMissionPlannerState() {
  if (!currentMissionPlan) return;

  // Restore form values
  const missionName = document.getElementById('missionName');
  if (missionName && currentMissionPlan.name) {
    missionName.value = currentMissionPlan.name;
  }

  const missionDuration = document.getElementById('missionDuration');
  if (missionDuration && currentMissionPlan.duration_hours) {
    missionDuration.value = currentMissionPlan.duration_hours;
  }

  const missionTerrain = document.getElementById('missionTerrain');
  if (missionTerrain && currentMissionPlan.terrain) {
    missionTerrain.value = currentMissionPlan.terrain;
  }

  // Refresh phase display
  renderPhaseEditor();
}

function renderPhaseEditor() {
  const container = document.getElementById('phasesEditor');
  if (!container || !currentMissionPlan) return;

  if (currentMissionPlan.phases.length === 0) {
    container.innerHTML = '<p class="small muted">No phases added. Click "+ Add Phase" to start.</p>';
    return;
  }

  container.innerHTML = currentMissionPlan.phases.map((phase, idx) => `
    <div class="phase-card" style="margin-bottom: 12px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <strong>${phase.name}</strong>
          <p class="small muted">${phase.type} • ${phase.duration_hours}h • ${phase.activity_level} activity</p>
        </div>
        <button class="btn subtle" onclick="removeMissionPhase('${phase.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function addMissionPhase() {
  if (!currentMissionPlan) return;

  const phaseName = prompt('Phase name (e.g., "Infiltration", "On-Station Ops"):');
  if (!phaseName) return;

  const duration = prompt('Duration in hours:', '2');
  if (!duration) return;

  const phase = {
    name: phaseName,
    type: 'ON_STATION',
    duration_hours: parseFloat(duration),
    activity_level: 'medium',
    platforms_active: [],
    notes: ''
  };

  MissionPlanner.addPhase(currentMissionPlan, phase);
  renderPhaseEditor();
}

function removeMissionPhase(phaseId) {
  if (!currentMissionPlan) return;
  MissionPlanner.removePhase(currentMissionPlan, phaseId);
  renderPhaseEditor();
}

function calculateMissionLogistics() {
  const resultsDiv = document.getElementById('logisticsResults');
  if (!resultsDiv || !currentMissionPlan) return;

  // Get all saved platform designs
  const platformDesigns = PlatformDesigner.loadDesigns();

  if (platformDesigns.length === 0) {
    resultsDiv.innerHTML = `
      <div style="padding: 12px; background: #ffaa00; color: #000; border-radius: 8px;">
        <p class="small"><strong>⚠️ No Platform Designs Found</strong></p>
        <p class="small">Create and save platform designs in the Platform Designer first.</p>
        <a class="btn subtle" href="/#/platform" style="margin-top: 8px;">Go to Platform Designer →</a>
      </div>
    `;
    return;
  }

  // For now, assume we're using all saved platforms
  // In a real app, users would select which platforms to use
  currentMissionPlan.platforms = platformDesigns.map(d => d.id);

  // Assign platforms to phases (simplified - use first platform for all phases)
  currentMissionPlan.phases.forEach(phase => {
    phase.platforms_active = [platformDesigns[0].id];
  });

  // Calculate logistics
  MissionPlanner.calculateMissionLogistics(currentMissionPlan, platformDesigns);

  // Display results
  displayLogisticsResults(resultsDiv);
}

function displayLogisticsResults(resultsDiv) {
  const sustainment = currentMissionPlan.sustainment;
  const packingLists = currentMissionPlan.packing_lists;

  if (!sustainment) {
    resultsDiv.innerHTML = '<p class="small muted">Run calculation to see results.</p>';
    return;
  }

  let html = '<div class="logistics-panel">';

  // Sustainment summary
  html += `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--card); border-radius: 8px;">
      <p class="small"><strong>Battery Requirements</strong></p>
      <div class="form-grid" style="margin-top: 8px;">
        <div>
          <p class="small muted">Total Batteries</p>
          <strong>${sustainment.total_batteries}</strong>
        </div>
        <div>
          <p class="small muted">Total Weight</p>
          <strong>${sustainment.weight_kg.toFixed(1)} kg</strong>
        </div>
        <div>
          <p class="small muted">Battery Swaps</p>
          <strong>${sustainment.battery_swaps.length}</strong>
        </div>
      </div>
    </div>
  `;

  // Battery requirements by platform
  html += `
    <div style="margin-bottom: 16px;">
      <p class="small"><strong>By Platform:</strong></p>
      <ul class="bullet-list small">
  `;

  Object.values(sustainment.batteries_by_platform).forEach(pb => {
    html += `
      <li><strong>${pb.platform_name}:</strong> ${pb.batteries_needed} batteries (${pb.weight_kg.toFixed(1)} kg) • Flight time: ${(pb.flight_time_hours * 60).toFixed(0)} min</li>
    `;
  });

  html += '</ul></div>';

  // Packing lists summary
  if (packingLists && packingLists.length > 0) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: var(--panel); border-radius: 8px; border: 1px solid var(--border);">
        <p class="small"><strong>Operator Loads</strong></p>
        <table style="width: 100%; margin-top: 8px; font-size: 0.9em;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--border);">
              <th style="padding: 4px;">Role</th>
              <th style="padding: 4px;">Items</th>
              <th style="padding: 4px;">Weight</th>
              <th style="padding: 4px;">Limit</th>
              <th style="padding: 4px;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    packingLists.forEach(list => {
      const status = list.critically_overweight ? '🔴 Critical' :
                    list.overweight ? '⚠️ Warning' : '✅ OK';
      const color = list.critically_overweight ? '#ff4444' :
                   list.overweight ? '#ffaa00' : 'inherit';

      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 4px;">${list.role}</td>
          <td style="padding: 4px;">${list.items.length}</td>
          <td style="padding: 4px;">${list.total_weight_kg.toFixed(1)} kg</td>
          <td style="padding: 4px;">${list.weight_limit_kg.toFixed(1)} kg</td>
          <td style="padding: 4px; color: ${color};">${status}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
  }

  // Feasibility
  if (sustainment.feasibility) {
    if (sustainment.feasibility.errors.length > 0) {
      html += `
        <div style="margin-bottom: 16px; padding: 12px; background: #ff4444; color: white; border-radius: 8px;">
          <p class="small"><strong>⚠️ Errors</strong></p>
          <ul class="bullet-list small">
            ${sustainment.feasibility.errors.map(err => `<li>${err}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (sustainment.feasibility.warnings.length > 0) {
      html += `
        <div style="padding: 12px; background: #ffaa00; color: #000; border-radius: 8px;">
          <p class="small"><strong>⚠️ Warnings</strong></p>
          <ul class="bullet-list small">
            ${sustainment.feasibility.warnings.map(warn => `<li>${warn}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }

  html += '</div>';
  resultsDiv.innerHTML = html;
}

function downloadAllPackingLists() {
  if (!currentMissionPlan || !currentMissionPlan.packing_lists || currentMissionPlan.packing_lists.length === 0) {
    alert('Calculate logistics first to generate packing lists.');
    return;
  }

  // Download each operator's packing list
  currentMissionPlan.packing_lists.forEach(list => {
    MissionPlanner.downloadPackingList(list);
  });

  alert(`Downloaded ${currentMissionPlan.packing_lists.length} packing lists.`);
}

// ============================================================================
// COMMS VALIDATOR
// ============================================================================

let commsValidatorInitialized = false;
let currentCommsAnalysis = null;

function initCommsValidator() {
  if (commsValidatorInitialized) return;
  commsValidatorInitialized = true;

  console.log('Initializing Comms Validator...');

  // Initialize with empty analysis
  currentCommsAnalysis = CommsValidator.createEmptyAnalysis();

  // Wire up environment controls
  const commsTerrain = document.getElementById('commsTerrain');
  if (commsTerrain) {
    commsTerrain.addEventListener('change', (e) => {
      currentCommsAnalysis.terrain = e.target.value;
    });
  }

  const commsWeather = document.getElementById('commsWeather');
  if (commsWeather) {
    commsWeather.addEventListener('change', (e) => {
      currentCommsAnalysis.weather = e.target.value;
    });
  }

  // Wire up buttons
  const addNodeBtn = document.getElementById('addNode');
  if (addNodeBtn) {
    addNodeBtn.addEventListener('click', addCommsNode);
  }

  const analyzeBtn = document.getElementById('analyzeLinks');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeCommsLinks);
  }

  const downloadBtn = document.getElementById('downloadCommsReport');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCommsReportFn);
  }

  // Initial render
  renderNodesEditor();
}

function restoreCommsValidatorState() {
  if (!currentCommsAnalysis) return;

  // Restore form values
  const commsTerrain = document.getElementById('commsTerrain');
  if (commsTerrain && currentCommsAnalysis.terrain) {
    commsTerrain.value = currentCommsAnalysis.terrain;
  }

  const commsWeather = document.getElementById('commsWeather');
  if (commsWeather && currentCommsAnalysis.weather) {
    commsWeather.value = currentCommsAnalysis.weather;
  }

  // Refresh nodes display
  renderNodesEditor();
}

function renderNodesEditor() {
  const container = document.getElementById('nodesEditor');
  if (!container || !currentCommsAnalysis) return;

  if (currentCommsAnalysis.nodes.length === 0) {
    container.innerHTML = '<p class="small muted">No nodes added. Click "+ Add Node" to start.</p>';
    return;
  }

  container.innerHTML = currentCommsAnalysis.nodes.map((node, idx) => `
    <div class="node-card" style="margin-bottom: 12px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <strong>${node.name}</strong>
          <p class="small muted">${node.type} • ${node.radio.frequency_mhz}MHz @ ${node.radio.power_output_dbm}dBm</p>
          <p class="small muted">Lat: ${node.location.lat.toFixed(5)}, Lon: ${node.location.lon.toFixed(5)}, Height: ${node.location.height_agl_m}m AGL</p>
        </div>
        <button class="btn subtle" onclick="removeCommsNode('${node.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function addCommsNode() {
  if (!currentCommsAnalysis) return;

  const nodeName = prompt('Node name (e.g., "GCS", "Relay-1", "UAV-1"):');
  if (!nodeName) return;

  const lat = prompt('Latitude (decimal degrees):', '0.0');
  if (lat === null) return;

  const lon = prompt('Longitude (decimal degrees):', '0.0');
  if (lon === null) return;

  const heightAGL = prompt('Height above ground level (meters):', '2');
  if (heightAGL === null) return;

  const node = {
    name: nodeName,
    type: 'transceiver',
    location: {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      elevation_m: 0,
      height_agl_m: parseFloat(heightAGL)
    },
    radio: {
      frequency_mhz: 900,
      power_output_dbm: 20,
      tx_gain_dbi: 2,
      rx_gain_dbi: 2,
      sensitivity_dbm: -110,
      tx_cable_loss_db: 1,
      rx_cable_loss_db: 1
    },
    notes: ''
  };

  CommsValidator.addNode(currentCommsAnalysis, node);
  renderNodesEditor();
}

function removeCommsNode(nodeId) {
  if (!currentCommsAnalysis) return;
  currentCommsAnalysis.nodes = currentCommsAnalysis.nodes.filter(n => n.id !== nodeId);
  renderNodesEditor();
}

function analyzeCommsLinks() {
  const resultsDiv = document.getElementById('linkAnalysisResults');
  if (!resultsDiv || !currentCommsAnalysis) return;

  if (currentCommsAnalysis.nodes.length < 2) {
    resultsDiv.innerHTML = `
      <div style="padding: 12px; background: #ffaa00; color: #000; border-radius: 8px;">
        <p class="small"><strong>⚠️ Need at least 2 nodes</strong></p>
        <p class="small">Add at least 2 nodes to analyze links.</p>
      </div>
    `;
    return;
  }

  // Analyze all links
  CommsValidator.analyzeLinks(currentCommsAnalysis);

  // Display results
  displayCommsResults(resultsDiv);
}

function displayCommsResults(resultsDiv) {
  const analysis = currentCommsAnalysis;

  if (!analysis.links || analysis.links.length === 0) {
    resultsDiv.innerHTML = '<p class="small muted">Run analysis to see results.</p>';
    return;
  }

  let html = '<div class="comms-results-panel">';

  // Summary
  html += `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--card); border-radius: 8px;">
      <p class="small"><strong>Analysis Summary</strong></p>
      <div class="form-grid" style="margin-top: 8px;">
        <div>
          <p class="small muted">Nodes</p>
          <strong>${analysis.nodes.length}</strong>
        </div>
        <div>
          <p class="small muted">Links Analyzed</p>
          <strong>${analysis.links.length}</strong>
        </div>
        <div>
          <p class="small muted">Coverage Gaps</p>
          <strong>${analysis.coverage_gaps.length}</strong>
        </div>
        <div>
          <p class="small muted">Relays Needed</p>
          <strong>${analysis.relay_recommendations.length}</strong>
        </div>
      </div>
    </div>
  `;

  // Links table
  html += `
    <div style="margin-bottom: 16px;">
      <p class="small"><strong>Link Analysis</strong></p>
      <table style="width: 100%; margin-top: 8px; font-size: 0.85em;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid var(--border);">
            <th style="padding: 4px;">Link</th>
            <th style="padding: 4px;">Distance</th>
            <th style="padding: 4px;">Margin</th>
            <th style="padding: 4px;">Quality</th>
            <th style="padding: 4px;">LOS</th>
          </tr>
        </thead>
        <tbody>
  `;

  analysis.links.forEach(link => {
    const qualityColor = {
      'excellent': '#00ff00',
      'good': '#88ff00',
      'marginal': '#ffaa00',
      'poor': '#ff4444',
      'no_los': '#ff0000'
    }[link.quality] || 'inherit';

    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 4px;">${link.from_name} → ${link.to_name}</td>
        <td style="padding: 4px;">${link.distance_km.toFixed(2)} km</td>
        <td style="padding: 4px;">${link.link_margin_db.toFixed(1)} dB</td>
        <td style="padding: 4px; color: ${qualityColor};">${link.quality.toUpperCase()}</td>
        <td style="padding: 4px;">${link.los.clear ? '✅' : '❌'}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';

  // Coverage gaps
  if (analysis.coverage_gaps.length > 0) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: #ff4444; color: white; border-radius: 8px;">
        <p class="small"><strong>⚠️ Coverage Gaps</strong></p>
        <ul class="bullet-list small">
          ${analysis.coverage_gaps.map(gap =>
            `<li><strong>${gap.from} → ${gap.to}:</strong> ${gap.reason} (Margin: ${gap.link_margin_db.toFixed(1)} dB)</li>`
          ).join('')}
        </ul>
      </div>
    `;
  }

  // Relay recommendations
  if (analysis.relay_recommendations.length > 0) {
    html += `
      <div style="margin-bottom: 16px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px;">
        <p class="small"><strong>💡 Relay Recommendations</strong></p>
        <ul class="bullet-list small">
          ${analysis.relay_recommendations.map(rec => {
            let detail = `<strong>${rec.description}</strong><br>`;
            detail += `Location: ${rec.location}`;
            if (rec.required_height_m) {
              detail += ` (Height: ${rec.required_height_m.toFixed(1)}m)`;
            }
            if (rec.reason) {
              detail += `<br>Reason: ${rec.reason}`;
            }
            return `<li>${detail}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

  // Feasibility
  if (analysis.feasibility) {
    if (analysis.feasibility.errors.length > 0) {
      html += `
        <div style="margin-bottom: 16px; padding: 12px; background: #ff4444; color: white; border-radius: 8px;">
          <p class="small"><strong>⚠️ Errors</strong></p>
          <ul class="bullet-list small">
            ${analysis.feasibility.errors.map(err => `<li>${err}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.feasibility.warnings.length > 0) {
      html += `
        <div style="padding: 12px; background: #ffaa00; color: #000; border-radius: 8px;">
          <p class="small"><strong>⚠️ Warnings</strong></p>
          <ul class="bullet-list small">
            ${analysis.feasibility.warnings.map(warn => `<li>${warn}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (analysis.feasibility.pass) {
      html += `
        <div style="padding: 12px; background: #00ff00; color: #000; border-radius: 8px;">
          <p class="small"><strong>✅ Communications Plan Feasible</strong></p>
          <p class="small">All links have sufficient margin for reliable communications.</p>
        </div>
      `;
    }
  }

  html += '</div>';
  resultsDiv.innerHTML = html;
}

function downloadCommsReportFn() {
  if (!currentCommsAnalysis || !currentCommsAnalysis.links || currentCommsAnalysis.links.length === 0) {
    alert('Run link analysis first to generate a report.');
    return;
  }

  CommsValidator.downloadReport(currentCommsAnalysis);
  alert('Comms analysis report downloaded.');
}

// ============================================================================
// EXPORT
// ============================================================================

let exportInitialized = false;

function initExport() {
  if (exportInitialized) return;
  exportInitialized = true;

  console.log('Initializing Export...');

  const exportJSONBtn = document.getElementById('exportMissionJSON');
  if (exportJSONBtn) {
    exportJSONBtn.addEventListener('click', exportMissionJSON);
  }

  const exportGeoBtn = document.getElementById('exportGeoJSON');
  if (exportGeoBtn) {
    exportGeoBtn.addEventListener('click', exportGeoJSON);
  }

  const exportCoTBtn = document.getElementById('exportCoT');
  if (exportCoTBtn) {
    exportCoTBtn.addEventListener('click', exportCoT);
  }

  // Doctrinal report export buttons
  const exportSpotBtn = document.getElementById('exportSpotReport');
  if (exportSpotBtn) {
    exportSpotBtn.addEventListener('click', exportSpotReport);
  }

  const exportSALUTEBtn = document.getElementById('exportSALUTEReport');
  if (exportSALUTEBtn) {
    exportSALUTEBtn.addEventListener('click', exportSALUTEReport);
  }

  const export16LineBtn = document.getElementById('export16LineReport');
  if (export16LineBtn) {
    export16LineBtn.addEventListener('click', export16LineReport);
  }

  loadExportSummary();
  loadJSONViewer();
}

async function loadExportSummary() {
  const summaryDiv = document.getElementById('exportSummary');
  if (!summaryDiv) return;

  try {
    // Collect data from all modules
    const partsLibrary = await PartsLibrary.exportLibrary();
    const platforms = PlatformDesigner.loadDesigns();
    const missions = MissionPlanner.loadPlans();
    const commsAnalyses = CommsValidator.loadAnalyses();

    // Count total parts across all categories
    let totalParts = 0;
    Object.values(partsLibrary).forEach(category => {
      if (Array.isArray(category)) {
        totalParts += category.length;
      }
    });

    // Build summary
    let html = '<div style="margin-bottom: 16px;">';
    html += '<p class="small"><strong>Current Project Status</strong></p>';
    html += '<div class="form-grid" style="margin-top: 8px;">';

    html += `
      <div>
        <p class="small muted">Parts Catalog</p>
        <strong>${totalParts} parts</strong>
      </div>
      <div>
        <p class="small muted">Platform Designs</p>
        <strong>${platforms.length} saved</strong>
      </div>
      <div>
        <p class="small muted">Mission Plans</p>
        <strong>${missions.length} saved</strong>
      </div>
      <div>
        <p class="small muted">Comms Analyses</p>
        <strong>${commsAnalyses.length} saved</strong>
      </div>
    `;

    html += '</div></div>';

    // Add details if we have data
    if (platforms.length > 0) {
      html += '<div style="margin-bottom: 12px;">';
      html += '<p class="small muted"><strong>Platforms:</strong></p>';
      html += '<ul class="bullet-list small">';
      platforms.forEach(p => {
        const validation = p.validation;
        const status = validation?.pass ? '✅' : '⚠️';
        html += `<li>${status} ${p.name} (${p.type})</li>`;
      });
      html += '</ul></div>';
    }

    if (missions.length > 0) {
      html += '<div style="margin-bottom: 12px;">';
      html += '<p class="small muted"><strong>Missions:</strong></p>';
      html += '<ul class="bullet-list small">';
      missions.forEach(m => {
        html += `<li>${m.name} (${m.duration_hours}h, ${m.phases?.length || 0} phases)</li>`;
      });
      html += '</ul></div>';
    }

    if (commsAnalyses.length > 0) {
      html += '<div style="margin-bottom: 12px;">';
      html += '<p class="small muted"><strong>Comms Networks:</strong></p>';
      html += '<ul class="bullet-list small">';
      commsAnalyses.forEach(c => {
        const status = c.feasibility?.pass ? '✅' : '⚠️';
        html += `<li>${status} ${c.name} (${c.nodes?.length || 0} nodes)</li>`;
      });
      html += '</ul></div>';
    }

    if (totalParts === 0 && platforms.length === 0 && missions.length === 0 && commsAnalyses.length === 0) {
      html = '<p class="small muted">No data to export. Load sample project or build your own.</p>';
    }

    summaryDiv.innerHTML = html;
  } catch (error) {
    console.error('Error loading export summary:', error);
    summaryDiv.innerHTML = '<p class="small muted">Error loading data. Check console.</p>';
  }
}

function loadJSONViewer() {
  const viewer = document.getElementById('jsonViewer');
  if (!viewer) return;

  if (typeof MissionProjectStore !== 'undefined') {
    const project = MissionProjectStore.loadMissionProject();
    viewer.value = JSON.stringify(project, null, 2);
  } else {
    viewer.value = '{}';
  }
}

async function exportMissionJSON() {
  try {
    // Collect data from all modules
    const partsLibrary = await PartsLibrary.exportLibrary();
    const platforms = PlatformDesigner.loadDesigns();
    const missions = MissionPlanner.loadPlans();
    const commsAnalyses = CommsValidator.loadAnalyses();

    // Build comprehensive export package
    const exportPackage = {
      schemaVersion: '2.0.0',
      exported: new Date().toISOString(),
      tool: 'Ceradon Architect - Offline Mission Planner',
      data: {
        partsLibrary: partsLibrary,
        platforms: platforms,
        missions: missions,
        commsAnalyses: commsAnalyses
      },
      metadata: {
        totalParts: Object.values(partsLibrary).reduce((sum, cat) =>
          sum + (Array.isArray(cat) ? cat.length : 0), 0),
        totalPlatforms: platforms.length,
        totalMissions: missions.length,
        totalCommsAnalyses: commsAnalyses.length
      }
    };

    const json = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceradon_mission_package_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert(`Mission package exported!\n\n` +
          `• ${exportPackage.metadata.totalParts} parts\n` +
          `• ${exportPackage.metadata.totalPlatforms} platforms\n` +
          `• ${exportPackage.metadata.totalMissions} missions\n` +
          `• ${exportPackage.metadata.totalCommsAnalyses} comms analyses`);

  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export mission package. Check console for details.');
  }
}

function exportGeoJSON() {
  if (typeof MissionProjectStore !== 'undefined') {
    const geojson = MissionProjectStore.exportGeoJSON();
    const json = JSON.stringify(geojson, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_geo_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function exportCoT() {
  if (typeof MissionProjectStore !== 'undefined') {
    const cot = MissionProjectStore.exportCoTStub();
    const xml = typeof cot === 'string' ? cot : JSON.stringify(cot, null, 2);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_cot_${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Doctrinal Report Exports
function exportSpotReport() {
  if (typeof MissionProjectStore !== 'undefined' && typeof MissionProjectStore.exportSpotReport === 'function') {
    try {
      MissionProjectStore.exportSpotReport();

      // Show success feedback
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success('📍 Spot Report exported successfully!', 3000);
      }
    } catch (error) {
      console.error('Spot Report export failed:', error);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.error('Failed to export Spot Report. Check mission data.', 4000);
      } else {
        alert('Failed to export Spot Report. Ensure mission project has required data.');
      }
    }
  }
}

function exportSALUTEReport() {
  if (typeof MissionProjectStore !== 'undefined' && typeof MissionProjectStore.exportSALUTEReport === 'function') {
    try {
      MissionProjectStore.exportSALUTEReport();

      // Show success feedback
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success('📊 SALUTE Report exported successfully!', 3000);
      }
    } catch (error) {
      console.error('SALUTE Report export failed:', error);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.error('Failed to export SALUTE Report. Check mission data.', 4000);
      } else {
        alert('Failed to export SALUTE Report. Ensure mission project has required data.');
      }
    }
  }
}

function export16LineReport() {
  if (typeof MissionProjectStore !== 'undefined' && typeof MissionProjectStore.export16LineReport === 'function') {
    try {
      MissionProjectStore.export16LineReport();

      // Show success feedback
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success('🚑 16-Line Report exported successfully!', 3000);
      }
    } catch (error) {
      console.error('16-Line Report export failed:', error);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.error('Failed to export 16-Line Report. Check mission data.', 4000);
      } else {
        alert('Failed to export 16-Line Report. Ensure mission project has required data.');
      }
    }
  }
}

// ============================================================================
// MAP VIEWER
// ============================================================================

let mapViewerInstance = null;
let currentMapLocation = null;

function initMapViewer() {
  console.log('[MapViewer] Initializing map viewer...');

  // Initialize map only once
  if (!mapViewerInstance) {
    try {
      mapViewerInstance = MapViewer.initMap('mapContainer', {
        enableLocationPicker: true,
        onLocationSelect: handleMapLocationSelect
      });

      console.log('[MapViewer] Map initialized successfully');
    } catch (error) {
      console.error('[MapViewer] Failed to initialize map:', error);
      return;
    }
  }

  // Set default mission date to today
  const missionDateInput = document.getElementById('missionDate');
  if (missionDateInput && !missionDateInput.value) {
    missionDateInput.value = new Date().toISOString().split('T')[0];
  }

  const missionStartDateInput = document.getElementById('missionStartDate');
  if (missionStartDateInput && !missionStartDateInput.value) {
    missionStartDateInput.value = new Date().toISOString().split('T')[0];
  }

  const missionEndDateInput = document.getElementById('missionEndDate');
  if (missionEndDateInput && !missionEndDateInput.value) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2); // Default to 2 days from now
    missionEndDateInput.value = endDate.toISOString().split('T')[0];
  }

  // Wire up query type toggle
  const envQueryType = document.getElementById('envQueryType');
  if (envQueryType) {
    envQueryType.addEventListener('change', (e) => {
      const singleInput = document.getElementById('singleDateInput');
      const rangeInputs = document.getElementById('dateRangeInputs');

      if (e.target.value === 'single') {
        if (singleInput) singleInput.style.display = 'grid';
        if (rangeInputs) rangeInputs.style.display = 'none';
      } else {
        if (singleInput) singleInput.style.display = 'none';
        if (rangeInputs) rangeInputs.style.display = 'grid';
      }
    });
  }

  // Wire up event handlers
  const getEnvDataBtn = document.getElementById('getEnvironmentalData');
  if (getEnvDataBtn) {
    getEnvDataBtn.removeEventListener('click', handleGetEnvironmentalData);
    getEnvDataBtn.addEventListener('click', handleGetEnvironmentalData);
  }

  const listTilesBtn = document.getElementById('listSRTMTiles');
  if (listTilesBtn) {
    listTilesBtn.removeEventListener('click', handleListSRTMTiles);
    listTilesBtn.addEventListener('click', handleListSRTMTiles);
  }

  const uploadTileBtn = document.getElementById('uploadSRTMTile');
  const srtmFileInput = document.getElementById('srtmFileInput');
  if (uploadTileBtn && srtmFileInput) {
    uploadTileBtn.removeEventListener('click', () => srtmFileInput.click());
    uploadTileBtn.addEventListener('click', () => srtmFileInput.click());

    srtmFileInput.removeEventListener('change', handleSRTMFileUpload);
    srtmFileInput.addEventListener('change', handleSRTMFileUpload);
  }

  // Update displayed info if location already selected
  if (currentMapLocation) {
    displaySelectedLocation(currentMapLocation);
  }
}

/**
 * Handle map location selection
 */
function handleMapLocationSelect(location) {
  currentMapLocation = location;
  displaySelectedLocation(location);

  console.log('[MapViewer] Location selected:', location);
}

/**
 * Display selected location information
 */
function displaySelectedLocation(location) {
  const infoDiv = document.getElementById('selectedLocationInfo');
  if (!infoDiv) return;

  infoDiv.innerHTML = `
    <div style="padding: 12px; background: var(--card); border-radius: 8px; border-left: 4px solid #4CAF50;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #4CAF50;">📍 Location Selected</p>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 4px 8px 4px 0;"><strong>Latitude:</strong></td>
          <td style="padding: 4px 0;">${location.lat}°</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;"><strong>Longitude:</strong></td>
          <td style="padding: 4px 0;">${location.lon}°</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;"><strong>Elevation:</strong></td>
          <td style="padding: 4px 0;">${location.elevation_m} m</td>
        </tr>
      </table>
      <p class="small muted" style="margin: 8px 0 0 0;">
        This data will auto-populate mission planning fields.
      </p>
    </div>
  `;
}

/**
 * Get environmental data for selected location
 */
async function handleGetEnvironmentalData() {
  if (!currentMapLocation) {
    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.warning('Please select a location on the map first', 3000);
    }
    return;
  }

  const queryType = document.getElementById('envQueryType')?.value || 'single';

  try {
    if (queryType === 'single') {
      // Single date query
      const missionDateInput = document.getElementById('missionDate');
      const missionDate = missionDateInput ? new Date(missionDateInput.value) : new Date();

      const envData = await EnvironmentAlmanac.getEnvironmentalData(
        currentMapLocation.lat,
        currentMapLocation.lon,
        missionDate
      );

      // Save to localStorage for cross-module persistence
      try {
        localStorage.setItem('ceradon_environmental_data', JSON.stringify(envData));
      } catch (error) {
        console.error('[MapViewer] Error saving environmental data to localStorage:', error);
      }

      // Emit event for cross-module propagation
      if (typeof MissionProjectEvents !== 'undefined') {
        MissionProjectEvents.emit(MissionProjectEvents.EVENTS.ENV_DATA_LOADED, {
          environmentalData: envData,
          location: currentMapLocation,
          timestamp: new Date().toISOString()
        });
      }

      displayEnvironmentalData(envData);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success('Environmental data loaded successfully', 3000);
      }
    } else {
      // Date range query
      const startDateInput = document.getElementById('missionStartDate');
      const endDateInput = document.getElementById('missionEndDate');

      const startDate = startDateInput ? new Date(startDateInput.value) : new Date();
      const endDate = endDateInput ? new Date(endDateInput.value) : new Date();

      if (endDate < startDate) {
        if (typeof UIFeedback !== 'undefined') {
          UIFeedback.Toast.warning('End date must be after start date', 3000);
        }
        return;
      }

      // Get unique months in range
      const months = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        if (!months.find(m => m.key === monthKey)) {
          months.push({
            key: monthKey,
            date: new Date(currentDate)
          });
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Query environmental data for each month
      const monthlyData = [];
      for (const month of months) {
        const envData = await EnvironmentAlmanac.getEnvironmentalData(
          currentMapLocation.lat,
          currentMapLocation.lon,
          month.date
        );
        monthlyData.push(envData);
      }

      // Save the range data
      const rangeData = {
        type: 'range',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        monthlyData: monthlyData,
        summary: {
          avgTemp: Math.round(monthlyData.reduce((sum, d) => sum + d.temperature.suggested_c, 0) / monthlyData.length),
          avgWind: Math.round(monthlyData.reduce((sum, d) => sum + d.wind.suggested_ms, 0) / monthlyData.length),
          maxTemp: Math.max(...monthlyData.map(d => d.temperature.avg_high_c)),
          minTemp: Math.min(...monthlyData.map(d => d.temperature.avg_low_c))
        }
      };

      // Save to localStorage
      try {
        localStorage.setItem('ceradon_environmental_data', JSON.stringify(rangeData));
      } catch (error) {
        console.error('[MapViewer] Error saving environmental data to localStorage:', error);
      }

      // Emit event
      if (typeof MissionProjectEvents !== 'undefined') {
        MissionProjectEvents.emit(MissionProjectEvents.EVENTS.ENV_DATA_LOADED, {
          environmentalData: rangeData,
          location: currentMapLocation,
          timestamp: new Date().toISOString()
        });
      }

      displayEnvironmentalDataRange(rangeData);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.success(`Environmental data loaded for ${months.length} month(s)`, 3000);
      }
    }
  } catch (error) {
    console.error('[MapViewer] Error getting environmental data:', error);

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.error('Failed to get environmental data', 3000);
    }
  }
}

/**
 * Display environmental data
 */
function displayEnvironmentalData(data) {
  const displayDiv = document.getElementById('environmentalDataDisplay');
  if (!displayDiv) return;

  // Build warnings HTML
  let warningsHTML = '';
  if (data.warnings && data.warnings.length > 0) {
    warningsHTML = '<div style="margin-top: 12px;">';
    data.warnings.forEach(warning => {
      const colorMap = {
        'critical': '#ff4444',
        'warning': '#ffaa00',
        'info': '#4CAF50'
      };
      const color = colorMap[warning.severity] || '#888';

      warningsHTML += `
        <div style="padding: 8px; margin-bottom: 8px; background: ${color}22; border-left: 4px solid ${color}; border-radius: 4px;">
          <p class="small" style="margin: 0; color: ${color}; font-weight: bold;">
            ${warning.severity.toUpperCase()}: ${warning.message}
          </p>
        </div>
      `;
    });
    warningsHTML += '</div>';
  }

  displayDiv.innerHTML = `
    <div style="margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;">
      <p style="margin: 0 0 12px 0; font-weight: bold;">📊 ${data.region_name}</p>
      <p class="small muted" style="margin-bottom: 12px;">
        Data for ${new Date(data.date).toLocaleDateString()}
        (${data.month}/12 - ${data.coordinates.nearest_station_distance_km.toFixed(0)} km from station)
      </p>

      <table style="width: 100%; font-size: 14px; margin-bottom: 12px;">
        <tr style="border-bottom: 1px solid var(--border);">
          <td colspan="2" style="padding: 8px 0; font-weight: bold;">Temperature</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Suggested:</td>
          <td style="padding: 4px 0;">${data.temperature.suggested_c}°C</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Avg High/Low:</td>
          <td style="padding: 4px 0;">${data.temperature.avg_high_c}°C / ${data.temperature.avg_low_c}°C</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Record High/Low:</td>
          <td style="padding: 4px 0;">${data.temperature.record_high_c}°C / ${data.temperature.record_low_c}°C</td>
        </tr>

        <tr style="border-bottom: 1px solid var(--border);">
          <td colspan="2" style="padding: 8px 0; padding-top: 16px; font-weight: bold;">Wind</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Suggested:</td>
          <td style="padding: 4px 0;">${data.wind.suggested_ms} m/s</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Avg / Max Gust:</td>
          <td style="padding: 4px 0;">${data.wind.avg_speed_ms} m/s / ${data.wind.max_gust_ms} m/s</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Direction:</td>
          <td style="padding: 4px 0;">${data.wind.prevailing_direction}</td>
        </tr>

        <tr style="border-bottom: 1px solid var(--border);">
          <td colspan="2" style="padding: 8px 0; padding-top: 16px; font-weight: bold;">Precipitation</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Rainfall:</td>
          <td style="padding: 4px 0;">${data.precipitation.avg_rainfall_mm} mm (${data.precipitation.rainy_days} days)</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Snowfall:</td>
          <td style="padding: 4px 0;">${data.precipitation.avg_snowfall_cm} cm</td>
        </tr>

        <tr style="border-bottom: 1px solid var(--border);">
          <td colspan="2" style="padding: 8px 0; padding-top: 16px; font-weight: bold;">Atmospheric</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Pressure:</td>
          <td style="padding: 4px 0;">${data.atmospheric.avg_pressure_hpa} hPa</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Humidity:</td>
          <td style="padding: 4px 0;">${data.atmospheric.avg_humidity_pct}%</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0;">Cloud Cover:</td>
          <td style="padding: 4px 0;">${data.atmospheric.cloud_cover_pct}%</td>
        </tr>
      </table>

      ${warningsHTML}

      <button class="btn primary" onclick="applyEnvironmentalDataToMission()" style="width: 100%; margin-top: 12px;">
        Apply to Mission Planning
      </button>
    </div>
  `;

  // Store for later use
  window.currentEnvironmentalData = data;
}

/**
 * Display environmental data range for multi-day missions
 */
function displayEnvironmentalDataRange(rangeData) {
  const displayDiv = document.getElementById('environmentalDataDisplay');
  if (!displayDiv) return;

  const startDate = new Date(rangeData.startDate);
  const endDate = new Date(rangeData.endDate);
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  displayDiv.innerHTML = `
    <div style="margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;">
      <p style="margin: 0 0 12px 0; font-weight: bold;">📊 Multi-Day Environmental Data</p>
      <p class="small muted" style="margin-bottom: 12px;">
        ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} (${daysDiff} days, ${rangeData.monthlyData.length} month(s))
      </p>

      <div style="padding: 12px; margin-bottom: 12px; background: var(--panel); border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">Summary</p>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 8px 4px 0;">Avg Temperature:</td>
            <td style="padding: 4px 0;"><strong>${rangeData.summary.avgTemp}°C</strong></td>
          </tr>
          <tr>
            <td style="padding: 4px 8px 4px 0;">Temperature Range:</td>
            <td style="padding: 4px 0;">${rangeData.summary.minTemp}°C to ${rangeData.summary.maxTemp}°C</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px 4px 0;">Avg Wind:</td>
            <td style="padding: 4px 0;"><strong>${rangeData.summary.avgWind} m/s</strong></td>
          </tr>
        </table>
      </div>

      <p style="margin: 12px 0 8px 0; font-weight: bold;">Monthly Breakdown</p>
      ${rangeData.monthlyData.map((monthData, idx) => `
        <div style="padding: 12px; margin-bottom: 8px; background: var(--panel); border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: var(--accent);">
            Month ${idx + 1}: ${new Date(monthData.date).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </p>
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="padding: 2px 8px 2px 0;">Temperature:</td>
              <td style="padding: 2px 0;">${monthData.temperature.suggested_c}°C (${monthData.temperature.avg_low_c}°C - ${monthData.temperature.avg_high_c}°C)</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px 2px 0;">Wind:</td>
              <td style="padding: 2px 0;">${monthData.wind.suggested_ms} m/s (gusts: ${monthData.wind.max_gust_ms} m/s)</td>
            </tr>
            ${monthData.warnings && monthData.warnings.length > 0 ? `
              <tr>
                <td colspan="2" style="padding: 4px 0;">
                  ${monthData.warnings.map(w => `
                    <span style="display: inline-block; padding: 2px 6px; margin: 2px; background: ${w.severity === 'critical' ? '#ff444422' : '#ffaa0022'}; border-left: 2px solid ${w.severity === 'critical' ? '#ff4444' : '#ffaa00'}; border-radius: 3px; font-size: 11px;">
                      ${w.type}
                    </span>
                  `).join('')}
                </td>
              </tr>
            ` : ''}
          </table>
        </div>
      `).join('')}

      <button class="btn primary" onclick="applyEnvironmentalDataToMission()" style="width: 100%; margin-top: 12px;">
        Apply to Mission Planning
      </button>
    </div>
  `;

  // Store for later use
  window.currentEnvironmentalData = rangeData;
}

/**
 * Apply environmental data to mission planning
 */
function applyEnvironmentalDataToMission() {
  const envData = window.currentEnvironmentalData;
  if (!envData || !currentMapLocation) return;

  // Emit event for cross-module propagation
  if (typeof MissionProjectEvents !== 'undefined') {
    MissionProjectEvents.emit('environmental_data_selected', {
      location: currentMapLocation,
      environment: envData,
      timestamp: new Date().toISOString()
    });
  }

  // Show success toast
  if (typeof UIFeedback !== 'undefined') {
    UIFeedback.Toast.success(
      `Environmental data applied: ${envData.temperature.suggested_c}°C, ${envData.wind.suggested_ms} m/s`,
      4000
    );
  }

  console.log('[MapViewer] Environmental data applied to mission:', envData);
}

/**
 * List SRTM tiles
 */
/**
 * Handle SRTM .hgt file upload
 */
async function handleSRTMFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Reset the input so the same file can be uploaded again if needed
  event.target.value = '';

  if (!file.name.toLowerCase().endsWith('.hgt')) {
    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.error('Please upload a valid .hgt SRTM file', 3000);
    }
    return;
  }

  try {
    // Extract tile ID from filename (e.g., N37W122.hgt)
    const filename = file.name.replace('.hgt', '').replace('.HGT', '');
    const tileId = filename.toUpperCase();

    // Validate tile ID format (e.g., N37W122)
    const tileIdPattern = /^[NS]\d{2}[EW]\d{3}$/;
    if (!tileIdPattern.test(tileId)) {
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.error('Invalid SRTM tile filename format. Expected format: N37W122.hgt', 4000);
      }
      return;
    }

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.info(`Uploading ${tileId}... (this may take a moment)`, 3000);
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Determine tile type based on file size
    // SRTM1: 3601x3601 samples = 25,934,402 bytes (2 bytes per sample)
    // SRTM3: 1201x1201 samples = 2,884,802 bytes
    const fileSize = arrayBuffer.byteLength;
    let tileType, samples;

    if (fileSize === 25934402) {
      tileType = 'SRTM1';
      samples = 3601;
    } else if (fileSize === 2884802) {
      tileType = 'SRTM3';
      samples = 1201;
    } else {
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.Toast.error(`Invalid file size (${fileSize} bytes). Expected SRTM1 or SRTM3 format.`, 4000);
      }
      return;
    }

    // Parse elevation data (big-endian 16-bit signed integers)
    const elevationData = new Int16Array(samples * samples);
    for (let i = 0; i < samples * samples; i++) {
      // SRTM data is stored in big-endian format
      elevationData[i] = dataView.getInt16(i * 2, false);
    }

    // Import tile into IndexedDB
    await SRTMElevation.importTile(tileId, tileType, elevationData, 'user_upload');

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success(`SRTM tile ${tileId} (${tileType}) uploaded successfully!`, 4000);
    }

    // Refresh tile list
    handleListSRTMTiles();

  } catch (error) {
    console.error('[MapViewer] Error uploading SRTM tile:', error);
    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.error('Failed to upload SRTM tile. Check console for details.', 4000);
    }
  }
}

async function handleListSRTMTiles() {
  try {
    const tiles = await SRTMElevation.listTiles();

    const listDiv = document.getElementById('srtmTilesList');
    if (!listDiv) return;

    if (tiles.length === 0) {
      listDiv.innerHTML = `
        <p class="small muted" style="margin: 12px 0;">
          No SRTM tiles loaded. Upload tiles for your area of operations for accurate elevation data.
        </p>
      `;
    } else {
      let html = `<p class="small" style="margin: 12px 0;"><strong>${tiles.length} tiles loaded:</strong></p><ul class="bullet-list small">`;
      tiles.forEach(tileId => {
        html += `<li>${tileId}</li>`;
      });
      html += '</ul>';
      listDiv.innerHTML = html;
    }

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.info(`${tiles.length} SRTM tiles loaded`, 2000);
    }
  } catch (error) {
    console.error('[MapViewer] Error listing SRTM tiles:', error);

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.error('Failed to list SRTM tiles', 3000);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('COTS Architect initializing...');

  initThemeToggle();
  initVersionBadges();
  initHomePage();

  // Initialize workflow progress tracker
  if (typeof WorkflowProgress !== 'undefined') {
    WorkflowProgress.init();
  }

  // Set up routing
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange(); // Initial route

  console.log('COTS Architect ready');
});
