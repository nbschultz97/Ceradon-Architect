// Ceradon Architect - Offline Mission Planning Tool
// Routes: home, library, platform, mission, comms, export

const APP_VERSION = 'Ceradon Architect v2.0 - Offline';
const SCHEMA_VERSION = 'MissionProject v2.0.0';

// ============================================================================
// ROUTING
// ============================================================================

const routes = ['home', 'library', 'platform', 'mission', 'comms', 'export'];

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
      break;
    case 'mission':
      initMissionPlanner();
      break;
    case 'comms':
      initCommsValidator();
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

function loadSampleMission() {
  fetch('data/demo_mission_project.json')
    .then(response => response.json())
    .then(data => {
      if (typeof MissionProjectStore !== 'undefined') {
        MissionProjectStore.saveMissionProject(data);
        updateProjectStatus();
        alert('Sample mission loaded successfully!');
      }
    })
    .catch(error => {
      console.error('Failed to load sample mission:', error);
      alert('Failed to load sample mission. Check console for details.');
    });
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

function loadSamplePartsLibrary() {
  fetch('data/sample_parts_library.json')
    .then(response => response.json())
    .then(data => {
      if (typeof PartsLibrary !== 'undefined') {
        PartsLibrary.importLibrary(data).then(() => {
          alert('Sample parts library loaded successfully!');
          loadPartsLibraryUI();
        }).catch(error => {
          console.error('Failed to load sample library:', error);
          alert('Failed to load sample library. Check console for details.');
        });
      }
    })
    .catch(error => {
      console.error('Failed to fetch sample library:', error);
      alert('Failed to fetch sample library. Check console for details.');
    });
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

  // Initialize with empty design
  currentPlatformDesign = PlatformDesigner.createEmptyDesign();

  // Wire up form inputs
  const platformName = document.getElementById('platformName');
  if (platformName) {
    platformName.addEventListener('change', (e) => {
      currentPlatformDesign.name = e.target.value;
    });
  }

  const platformType = document.getElementById('platformType');
  if (platformType) {
    platformType.addEventListener('change', (e) => {
      currentPlatformDesign.type = e.target.value;
    });
  }

  const envAltitude = document.getElementById('envAltitude');
  if (envAltitude) {
    envAltitude.addEventListener('change', (e) => {
      currentPlatformDesign.environment.altitude_m = parseInt(e.target.value);
    });
  }

  const envTemperature = document.getElementById('envTemperature');
  if (envTemperature) {
    envTemperature.addEventListener('change', (e) => {
      currentPlatformDesign.environment.temperature_c = parseInt(e.target.value);
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

function initCommsValidator() {
  if (commsValidatorInitialized) return;
  commsValidatorInitialized = true;

  console.log('Initializing Comms Validator...');

  const addNodeBtn = document.getElementById('addNode');
  if (addNodeBtn) {
    addNodeBtn.addEventListener('click', addNode);
  }

  const analyzeBtn = document.getElementById('analyzeLinks');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeLinks);
  }

  const downloadBtn = document.getElementById('downloadCommsReport');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCommsReport);
  }
}

function addNode() {
  alert('Add node functionality will be implemented');
}

function analyzeLinks() {
  const resultsDiv = document.getElementById('linkAnalysisResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <p class="small muted">Link analysis will compute:</p>
    <ul class="bullet-list">
      <li>Free-space path loss</li>
      <li>Link margin calculations</li>
      <li>Line-of-sight checks</li>
      <li>Fresnel zone clearance</li>
      <li>Relay recommendations</li>
    </ul>
  `;
}

function downloadCommsReport() {
  alert('Comms report download will be implemented');
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

  loadExportSummary();
  loadJSONViewer();
}

function loadExportSummary() {
  const summaryDiv = document.getElementById('exportSummary');
  if (!summaryDiv) return;

  if (typeof MissionProjectStore !== 'undefined') {
    const project = MissionProjectStore.loadMissionProject();
    const platforms = project.platforms?.length || 0;
    const phases = project.mission?.phases?.length || 0;
    const nodes = project.nodes?.length || 0;

    summaryDiv.innerHTML = `
      <h4>${project.meta?.name || 'Unnamed Project'}</h4>
      <p class="small muted">
        <strong>${platforms}</strong> platform(s) ·
        <strong>${phases}</strong> phase(s) ·
        <strong>${nodes}</strong> node(s)
      </p>
    `;
  } else {
    summaryDiv.innerHTML = '<p class="small muted">No project loaded</p>';
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

function exportMissionJSON() {
  if (typeof MissionProjectStore !== 'undefined') {
    const project = MissionProjectStore.loadMissionProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Ceradon Architect initializing...');

  initThemeToggle();
  initVersionBadges();
  initHomePage();

  // Set up routing
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange(); // Initial route

  console.log('Ceradon Architect ready');
});
