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

function initPlatformDesigner() {
  if (platformDesignerInitialized) return;
  platformDesignerInitialized = true;

  console.log('Initializing Platform Designer...');

  // Wire up validation button
  const validateBtn = document.getElementById('validatePlatform');
  if (validateBtn) {
    validateBtn.addEventListener('click', validatePlatform);
  }

  const savePlatformBtn = document.getElementById('savePlatform');
  if (savePlatformBtn) {
    savePlatformBtn.addEventListener('click', savePlatform);
  }

  // TODO: Load component selectors from Parts Library
  loadComponentSelectors();
}

function loadComponentSelectors() {
  const container = document.getElementById('componentSelection');
  if (!container) return;

  container.innerHTML = `
    <p class="small muted">Component selection will be populated from Parts Library</p>
    <p class="small">Navigate to Parts Library to load components first.</p>
  `;
}

function validatePlatform() {
  const resultsDiv = document.getElementById('validationResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <p class="small muted">Platform validation will check:</p>
    <ul class="bullet-list">
      <li>Thrust-to-weight ratio</li>
      <li>Flight time estimates</li>
      <li>Environmental derating (altitude, temperature)</li>
      <li>Component compatibility</li>
    </ul>
    <p class="small">Build platform designer UI to enable validation.</p>
  `;
}

function savePlatform() {
  alert('Platform save functionality will be implemented');
}

// ============================================================================
// MISSION PLANNER
// ============================================================================

let missionPlannerInitialized = false;

function initMissionPlanner() {
  if (missionPlannerInitialized) return;
  missionPlannerInitialized = true;

  console.log('Initializing Mission Planner...');

  const addPhaseBtn = document.getElementById('addPhase');
  if (addPhaseBtn) {
    addPhaseBtn.addEventListener('click', addPhase);
  }

  const calculateBtn = document.getElementById('calculateLogistics');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateLogistics);
  }

  const downloadBtn = document.getElementById('downloadPackingLists');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadPackingLists);
  }
}

function addPhase() {
  alert('Add phase functionality will be implemented');
}

function calculateLogistics() {
  const resultsDiv = document.getElementById('logisticsResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <p class="small muted">Logistics calculation will compute:</p>
    <ul class="bullet-list">
      <li>Battery swap schedules</li>
      <li>Per-operator packing lists</li>
      <li>Weight distribution across team</li>
      <li>Mission feasibility checks</li>
    </ul>
  `;
}

function downloadPackingLists() {
  alert('Packing list download will be implemented');
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
