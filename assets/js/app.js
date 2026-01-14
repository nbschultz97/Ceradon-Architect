// COTS Architect - Offline Mission Planning Tool
// Routes: home, library, platform, mission, comms, map, export

const APP_VERSION = 'COTS Architect v0.4.0-alpha.2';
const SCHEMA_VERSION = 'MissionProject v2.0.0';

// ============================================================================
// ELECTRON-COMPATIBLE PROMPT REPLACEMENT
// ============================================================================

/**
 * Custom prompt replacement that works in Electron
 * Uses a simple inline dialog since Electron blocks window.prompt()
 */
function electronPrompt(message, defaultValue = '') {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background: var(--surface); padding: 24px; border-radius: 8px; min-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.5);';

  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = 'margin: 0 0 16px 0; color: var(--text); white-space: pre-line;';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = defaultValue;
  input.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 16px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px;';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn ghost';

  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.className = 'btn primary';

  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(okBtn);

  dialog.appendChild(messageEl);
  dialog.appendChild(input);
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  input.focus();
  input.select();

  return new Promise((resolve) => {
    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    okBtn.onclick = () => {
      cleanup();
      resolve(input.value);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        cleanup();
        resolve(input.value);
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };
  });
}

// Use custom prompt in Electron, native prompt in browser
const safePrompt = typeof window.desktopSession !== 'undefined' ? electronPrompt : window.prompt.bind(window);

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

function migrateLegacyStorage() {
  const migrations = [
    ['ceradon_theme', 'cots_theme'],
    ['ceradon_mission_project', 'cots_mission_project'],
    ['ceradon_mission_project_updated_at', 'cots_mission_project_updated_at'],
    ['ceradon_mission_plans', 'cots_mission_plans'],
    ['ceradon_platform_designs', 'cots_platform_designs'],
    ['ceradon_comms_analyses', 'cots_comms_analyses'],
    ['ceradon_environmental_data', 'cots_environmental_data'],
    ['ceradon_selected_location', 'cots_selected_location'],
    ['ceradon_map_locations', 'cots_map_locations'],
    ['ceradon_elevation_cache', 'cots_elevation_cache'],
    ['ceradon_last_event', 'cots_last_event'],
    ['ceradon_parts_library', 'cots_parts_library'],
    ['ceradon_workflow_progress', 'cots_workflow_progress']
  ];

  try {
    migrations.forEach(([fromKey, toKey]) => {
      const legacyValue = localStorage.getItem(fromKey);
      if (legacyValue !== null && localStorage.getItem(toKey) === null) {
        localStorage.setItem(toKey, legacyValue);
      }
      if (legacyValue !== null) {
        localStorage.removeItem(fromKey);
      }
    });
  } catch (error) {
    console.warn('Legacy storage migration skipped:', error);
  }
}

// ============================================================================
// THEME TOGGLE
// ============================================================================

function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  const savedTheme = localStorage.getItem('cots_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);
  toggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    toggle.textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('cots_theme', next);
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
    localStorage.removeItem('cots_mission_project');
    localStorage.removeItem('cots_mission_project_updated_at');
    localStorage.removeItem('ceradon_mission_project');
    localStorage.removeItem('ceradon_mission_project_updated_at');
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
  const partsSearchInput = document.getElementById('partsSearchInput');
  if (partsSearchInput) {
    partsSearchInput.addEventListener('input', filterAndSortParts);
  }

  const partsCategoryFilter = document.getElementById('partsCategoryFilter');
  if (partsCategoryFilter) {
    partsCategoryFilter.addEventListener('change', filterAndSortParts);
  }

  const partsSortBy = document.getElementById('partsSortBy');
  if (partsSortBy) {
    partsSortBy.addEventListener('change', filterAndSortParts);
  }

  // Drag and drop for CSV import
  const dropZone = document.getElementById('csvDropZone');
  if (dropZone) {
    dropZone.addEventListener('click', () => csvFileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#764ba2';
      dropZone.style.background = 'rgba(102, 126, 234, 0.15)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#667eea';
      dropZone.style.background = 'rgba(102, 126, 234, 0.05)';
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#667eea';
      dropZone.style.background = 'rgba(102, 126, 234, 0.05)';

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        csvFileInput.files = e.dataTransfer.files;
        await handleCSVImport({ target: { files: [file] } });
      } else {
        alert('Please drop a CSV file');
      }
    });
  }
}

async function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof CSVImporter === 'undefined' || typeof PartsLibrary === 'undefined') {
    alert('CSV Importer or Parts Library not loaded. Please refresh the page.');
    return;
  }

  try {
    updatePartsStatus('Importing CSV...');

    // Try multi-category import first
    const result = await CSVImporter.importMultiCategoryFromFile(file);

    if (result.success) {
      // Display detailed results
      let message = `✅ Successfully imported ${result.totalImported} parts!\n\n`;
      message += 'Distribution by category:\n';

      Object.entries(result.categories).forEach(([category, stats]) => {
        message += `• ${category}: ${stats.imported} parts`;
        if (stats.failed > 0) {
          message += ` (${stats.failed} failed)`;
        }
        message += '\n';
      });

      if (result.totalFailed > 0) {
        message += `\n⚠️ ${result.totalFailed} rows had issues (check console for details)`;
        console.warn('Import warnings:', result);
      }

      alert(message);
      await loadPartsLibraryUI();
      updatePartsStatus(`Imported ${result.totalImported} parts from ${Object.keys(result.categories).length} categories`);
    } else if (result.error && result.error.includes('category')) {
      // No category column found - show helpful message
      alert(
        '⚠️ Multi-Category Import Failed\n\n' +
        'Your CSV needs a "category" column to import all parts at once.\n\n' +
        'Add a column named "category" with values like:\n' +
        '• airframe\n• motor\n• battery\n• esc\n• radio\n\n' +
        'Or download the Multi-Category Template for an example.\n\n' +
        'See the Multi-Sheet Import Guide for more details.'
      );
      updatePartsStatus('Import failed - missing category column');
    } else {
      throw new Error(result.error || 'Unknown import error');
    }
  } catch (error) {
    console.error('Failed to import CSV:', error);
    console.error('Full error details:', error);
    console.error('Import result:', result);

    // Create detailed error message
    const errorDetails = `=== CSV Import Error ===
Error Message: ${error.message}
File Name: ${file.name}
File Size: ${file.size} bytes
Timestamp: ${new Date().toISOString()}

Stack Trace:
${error.stack || 'No stack trace available'}

Result Object:
${JSON.stringify(result, null, 2)}

Please copy this entire message when reporting the issue.`;

    // Show error with copy button
    const copyToClipboard = confirm(
      `Failed to import CSV:\n\n${error.message}\n\n` +
      `Click OK to copy error details to clipboard for debugging.\n` +
      `Click Cancel to close this message.`
    );

    if (copyToClipboard) {
      navigator.clipboard.writeText(errorDetails).then(() => {
        alert('Error details copied to clipboard! You can now paste them for debugging.');
      }).catch(() => {
        // Fallback: show error details in console
        console.log('\n\n' + errorDetails + '\n\n');
        alert('Could not copy to clipboard. Error details are in the console (press Ctrl+Shift+I).');
      });
    }

    updatePartsStatus('Import failed');
  }

  // Reset file input
  event.target.value = '';
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

  try {
    // Always generate multi-category template
    const template = 'category,name,manufacturer,part_number,quantity,weight_g,cost_usd,link,notes\n' +
      'airframe,5" Racing Frame,GEPRC,GEP-MK4,2,95,45,https://example.com/frame,Carbon fiber frame\n' +
      'motor,2207 1750KV,T-Motor,F60-PRO-IV,8,31,25,https://example.com/motor,4S compatible\n' +
      'battery,4S 1300mAh,CNHL,MiniStar-4S-1300,10,165,22,https://example.com/battery,100C discharge\n' +
      'esc,35A BLHeli_32,Tekko32,F3-35A,4,5,18,https://example.com/esc,DShot1200 support\n' +
      'flight_controller,F7 FC,Holybro,Kakute-F7,2,8,55,https://example.com/fc,8K gyro loop\n' +
      'radio,ELRS 915MHz,ExpressLRS,EP2-915,2,3,25,https://example.com/radio,1W output power\n' +
      'sensor,FPV Camera,Caddx,Ratel-2,2,5,35,https://example.com/camera,1200TVL\n' +
      'accessory,XT60 Connectors,Amass,XT60-10PK,1,20,8,https://example.com/connectors,10-pack';

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'multi_category_inventory_template.csv';
    link.click();
    URL.revokeObjectURL(url);

    console.log('Downloaded multi-category CSV template');
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
      <div class="part-card" data-part-id="${part.id}" data-part-category="${part.category}">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <strong>${part.name || part.model || 'Unnamed Part'}</strong>
          <button class="btn subtle" style="padding: 4px 8px; font-size: 12px;" onclick="openPartEditor('${part.id}', '${part.category}')">✏️ Edit</button>
        </div>
        <p class="small muted">${part.category || 'Unknown'}</p>
        <p class="small">${part.manufacturer || ''} ${part.part_number || ''}</p>
        <div class="part-specs">
          ${part.quantity ? `<span>Qty: ${part.quantity}</span>` : ''}
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

async function filterAndSortParts() {
  if (typeof PartsLibrary === 'undefined') return;

  const searchTerm = document.getElementById('partsSearchInput')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('partsCategoryFilter')?.value || '';
  const sortBy = document.getElementById('partsSortBy')?.value || 'name';

  const grid = document.getElementById('partsGrid');
  if (!grid) return;

  try {
    const library = await PartsLibrary.exportLibrary();
    let allParts = [];

    // Flatten all categories into one array
    Object.entries(library).forEach(([category, parts]) => {
      if (Array.isArray(parts)) {
        parts.forEach(part => {
          allParts.push({ ...part, category });
        });
      }
    });

    // Filter by search term
    if (searchTerm) {
      allParts = allParts.filter(part => {
        const name = (part.name || '').toLowerCase();
        const manufacturer = (part.manufacturer || '').toLowerCase();
        const category = (part.category || '').toLowerCase();
        const partNumber = (part.part_number || '').toLowerCase();

        return name.includes(searchTerm) ||
               manufacturer.includes(searchTerm) ||
               category.includes(searchTerm) ||
               partNumber.includes(searchTerm);
      });
    }

    // Filter by category
    if (categoryFilter) {
      allParts = allParts.filter(part => part.category === categoryFilter);
    }

    // Sort
    allParts.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'weight':
          return (a.weight_g || 999999) - (b.weight_g || 999999);
        case 'cost':
          return (a.cost_usd || 999999) - (b.cost_usd || 999999);
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    if (allParts.length === 0) {
      grid.innerHTML = '<p class="small muted">No parts match your filters.</p>';
      return;
    }

    grid.innerHTML = allParts.map(part => `
      <div class="part-card" data-part-id="${part.id}" data-part-category="${part.category}">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <strong>${part.name || part.model || 'Unnamed Part'}</strong>
          <button class="btn subtle" style="padding: 4px 8px; font-size: 12px;" onclick="openPartEditor('${part.id}', '${part.category}')">✏️ Edit</button>
        </div>
        <p class="small muted">${part.category || 'Unknown'}</p>
        <p class="small">${part.manufacturer || ''} ${part.part_number || ''}</p>
        <div class="part-specs">
          ${part.quantity ? `<span>Qty: ${part.quantity}</span>` : ''}
          ${part.weight_g ? `<span>${part.weight_g}g</span>` : ''}
          ${part.cost_usd ? `<span>$${part.cost_usd}</span>` : ''}
        </div>
      </div>
    `).join('');

    updatePartsStatus(`Showing ${allParts.length} parts`);
  } catch (error) {
    console.error('Failed to filter/sort parts:', error);
  }
}

function filterParts() {
  // Legacy function - redirect to new function
  filterAndSortParts();
}

async function renderSavedPlatformsList() {
  const container = document.getElementById('savedPlatformsList');
  if (!container) return;

  const designs = PlatformDesigner.loadDesigns();

  if (designs.length === 0) {
    container.innerHTML = '<p class="small muted">No saved platforms. Save a design to see it here.</p>';
    return;
  }

  container.innerHTML = designs.map(design => {
    const validation = design.validation || {};
    const metrics = validation.metrics || {};

    return `
      <div style="padding: 12px; margin-bottom: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <strong>${design.name}</strong>
            <p class="small muted">${design.type} • ${metrics.auw_kg?.toFixed(2) || 0}kg • ${metrics.nominal_flight_time_min?.toFixed(0) || 0}min flight time</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn subtle" style="padding: 4px 8px; font-size: 12px;" onclick="loadSavedPlatform('${design.id}')">Load</button>
            <button class="btn subtle" style="padding: 4px 8px; font-size: 12px; color: #ff4444;" onclick="deleteSavedPlatform('${design.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadSavedPlatform(designId) {
  const designs = PlatformDesigner.loadDesigns();
  const design = designs.find(d => d.id === designId);

  if (!design) {
    alert('Platform not found');
    return;
  }

  // Load into current design
  currentPlatformDesign = design;
  savePlatformDesignerDraft();
  restorePlatformDesignerState();

  // Reload selectors
  await loadComponentSelectors();

  // Validate
  validateCurrentPlatform();

  alert(`Loaded platform: ${design.name}`);
}

async function deleteSavedPlatform(designId) {
  const designs = PlatformDesigner.loadDesigns();
  const design = designs.find(d => d.id === designId);

  if (!design) return;

  if (!confirm(`Delete platform "${design.name}"?\n\nThis cannot be undone.`)) {
    return;
  }

  // Remove from storage
  const filtered = designs.filter(d => d.id !== designId);
  localStorage.setItem('platform_designs', JSON.stringify(filtered));

  // Refresh list
  renderSavedPlatformsList();

  alert('Platform deleted');
}

function exportPlatformPDF() {
  alert('PDF export functionality coming soon!\n\nThis will export:\n- Platform configuration\n- Bill of Materials\n- Validation results\n- Performance metrics');
}

function exportPlatformExcel() {
  if (!currentPlatformDesign) {
    alert('No platform design loaded. Create and save a platform first.');
    return;
  }

  // Generate BOM
  const bom = PlatformDesigner.generateBOM(currentPlatformDesign);
  const validation = currentPlatformDesign.validation || {};
  const metrics = validation.metrics || {};

  // Create CSV content
  let csv = `COTS Architect - Platform Export\n`;
  csv += `Platform Name:,${currentPlatformDesign.name}\n`;
  csv += `Type:,${currentPlatformDesign.type}\n`;
  csv += `All-Up Weight:,${metrics.auw_kg?.toFixed(2) || 0} kg\n`;
  csv += `Flight Time:,${metrics.nominal_flight_time_min?.toFixed(1) || 0} min\n`;
  csv += `Thrust-to-Weight:,${metrics.thrust_to_weight?.toFixed(2) || 0}\n\n`;

  csv += `Bill of Materials\n`;
  csv += `Category,Name,Manufacturer,Part Number,Quantity,Unit Weight (g),Total Weight (g),Unit Cost ($),Total Cost ($)\n`;

  bom.items.forEach(item => {
    csv += `${item.category},${item.name},${item.manufacturer},${item.part_number},${item.quantity},${item.unit_weight_g},${item.total_weight_g},${item.unit_cost_usd},${item.total_cost_usd}\n`;
  });

  csv += `\nTOTALS,,,,${bom.items.length},,,${bom.totals.weight_g},${bom.totals.cost_usd}\n`;

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentPlatformDesign.name.replace(/\s+/g, '_')}_BOM.csv`;
  a.click();
  URL.revokeObjectURL(url);

  alert('Platform BOM exported to CSV');
}

function comparePlatforms() {
  alert('Platform comparison feature coming soon!\n\nThis will allow you to:\n- Select 2-3 saved platforms\n- Compare specs side-by-side\n- See performance differences\n- Choose the best option for your mission');
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
    const envData = localStorage.getItem('cots_environmental_data');
    const location = localStorage.getItem('cots_selected_location');

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

  const clearPlatformBtn = document.getElementById('clearPlatform');
  if (clearPlatformBtn) {
    clearPlatformBtn.addEventListener('click', clearPlatformDesign);
  }

  const autoBuildBtn = document.getElementById('autoBuildPlatform');
  if (autoBuildBtn) {
    autoBuildBtn.addEventListener('click', autoBuildPlatform);
  }

  const exportPDFBtn = document.getElementById('exportPlatformPDF');
  if (exportPDFBtn) {
    exportPDFBtn.addEventListener('click', exportPlatformPDF);
  }

  const exportExcelBtn = document.getElementById('exportPlatformExcel');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportPlatformExcel);
  }

  const comparePlatformsBtn = document.getElementById('comparePlatforms');
  if (comparePlatformsBtn) {
    comparePlatformsBtn.addEventListener('click', comparePlatforms);
  }

  // Load component selectors
  loadComponentSelectors();

  // Load saved designs
  loadSavedPlatforms();
  renderSavedPlatformsList();

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
  updateSelectedComponentsDisplay();
}

async function loadComponentSelectors() {
  const container = document.getElementById('componentSelection');
  if (!container) return;

  try {
    // Get parts from library
    if (typeof PartsLibrary === 'undefined') {
      container.innerHTML = `
        <p class="small muted">Parts Library not loaded. Load parts first.</p>
        <a class="btn subtle" href="#/library">Go to Parts Library →</a>
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
      console.log(`Selected ${category}:`, part);
    }
  }
  savePlatformDesignerDraft();
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

async function saveCurrentPlatform() {
  if (!currentPlatformDesign) return;

  // Ensure platform has a name
  if (!currentPlatformDesign.name || currentPlatformDesign.name === 'Untitled Platform') {
    const name = await safePrompt('Enter a name for this platform:');
    if (!name) return;
    currentPlatformDesign.name = name;
  }

  // Save the design
  PlatformDesigner.saveDesign(currentPlatformDesign);

  alert(`Platform "${currentPlatformDesign.name}" saved successfully!`);

  // Reload saved platforms list
  loadSavedPlatforms();
  renderSavedPlatformsList();
}

function loadSavedPlatforms() {
  // This will be displayed in a future enhancement
  console.log('Saved platforms:', PlatformDesigner.loadDesigns());
}

/**
 * Clear all platform design fields
 */
function clearPlatformDesign() {
  if (!confirm('Are you sure you want to clear this design? This cannot be undone.')) {
    return;
  }

  // Create new empty design
  currentPlatformDesign = PlatformDesigner.createEmptyDesign();
  savePlatformDesignerDraft();

  // Reset form fields
  const platformName = document.getElementById('platformName');
  if (platformName) platformName.value = '';

  const platformType = document.getElementById('platformType');
  if (platformType) platformType.value = 'multi-rotor';

  const envAltitude = document.getElementById('envAltitude');
  if (envAltitude) envAltitude.value = '0';

  const envTemperature = document.getElementById('envTemperature');
  if (envTemperature) envTemperature.value = '20';

  // Reset component selectors
  const selectors = ['selectAirframe', 'selectBattery', 'selectESC', 'selectFC', 'selectMotors'];
  selectors.forEach(id => {
    const select = document.getElementById(id);
    if (select) select.value = '';
  });

  // Clear validation results
  const validationResults = document.getElementById('validationResults');
  if (validationResults) validationResults.innerHTML = '<p class="small muted">Design cleared. Select components to begin.</p>';

  // Clear selected components display
  updateSelectedComponentsDisplay();

  alert('Platform design cleared!');
}

/**
 * Auto-build optimal platform from available inventory
 */
async function autoBuildPlatform() {
  try {
    // Ensure Parts Library is initialized
    await PartsLibrary.initDB();
    const library = await PartsLibrary.exportLibrary();

    // Check if we have parts loaded
    const hasParts = library.motors?.length > 0 && library.batteries?.length > 0 && library.airframes?.length > 0;
    if (!hasParts) {
      alert('No parts available in inventory. Load parts from the Parts Library first.');
      return;
    }

    if (!confirm('This will replace your current design with an auto-generated optimal build. Continue?')) {
      return;
    }

    // Create new design
    currentPlatformDesign = PlatformDesigner.createEmptyDesign();
    currentPlatformDesign.name = 'Auto-Built Platform';

    // Select best airframe (lightest multi-rotor if available)
    const multiRotorFrames = library.airframes.filter(a => a.type === 'quad' || a.type === 'hexa' || a.type === 'octo');
    const airframe = multiRotorFrames.length > 0
      ? multiRotorFrames.sort((a, b) => (a.weight_g || 999999) - (b.weight_g || 999999))[0]
      : library.airframes[0];

    if (airframe) {
      currentPlatformDesign.components.airframe = airframe;
      currentPlatformDesign.type = airframe.type === 'fixed-wing' ? 'fixed-wing' : 'multi-rotor';
    }

    // Select best battery (highest capacity per weight ratio)
    const batteries = library.batteries
      .filter(b => b.capacity_wh && b.weight_g)
      .sort((a, b) => (b.capacity_wh / b.weight_g) - (a.capacity_wh / a.weight_g));

    if (batteries.length > 0) {
      currentPlatformDesign.components.battery = batteries[0];
    }

    // Select motors (based on airframe type)
    const motorCount = airframe?.type === 'quad' ? 4 : airframe?.type === 'hexa' ? 6 : airframe?.type === 'octo' ? 8 : 1;
    const motors = library.motors
      .filter(m => m.max_thrust_g)
      .sort((a, b) => (b.max_thrust_g / (b.weight_g || 1)) - (a.max_thrust_g / (a.weight_g || 1)));

    if (motors.length > 0) {
      currentPlatformDesign.components.motors = Array(motorCount).fill(motors[0]);
    }

    // Select ESC (highest current rating)
    const escs = library.escs
      .filter(e => e.max_current_a)
      .sort((a, b) => (b.max_current_a) - (a.max_current_a));

    if (escs.length > 0) {
      currentPlatformDesign.components.escs = escs[0];
    }

    // Select flight controller (first available)
    if (library.flight_controllers?.length > 0) {
      currentPlatformDesign.components.flight_controller = library.flight_controllers[0];
    }

    // Select radio (first available)
    if (library.radios?.length > 0) {
      currentPlatformDesign.components.radios = [library.radios[0]];
    }

    // Select sensors (all GPS and IMU if available)
    const gps = library.sensors?.filter(s => s.type === 'gps' || s.name?.toLowerCase().includes('gps'));
    const imu = library.sensors?.filter(s => s.type === 'imu' || s.name?.toLowerCase().includes('imu'));
    const selectedSensors = [];
    if (gps.length > 0) selectedSensors.push(gps[0]);
    if (imu.length > 0) selectedSensors.push(imu[0]);
    if (selectedSensors.length > 0) {
      currentPlatformDesign.components.sensors = selectedSensors;
    }

    // Update UI
    savePlatformDesignerDraft();
    restorePlatformDesignerState();
    loadComponentSelectors();

    // Auto-validate
    validateCurrentPlatform();

    alert('Platform auto-built successfully! Review the validation results and adjust as needed.');

  } catch (error) {
    console.error('Error auto-building platform:', error);
    alert('Error auto-building platform. Check console for details.');
  }
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
    const location = localStorage.getItem('cots_selected_location');
    const envData = localStorage.getItem('cots_environmental_data');

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

async function addMissionPhase() {
  if (!currentMissionPlan) return;

  const phaseName = await safePrompt('Phase name (e.g., "Infiltration", "On-Station Ops"):');
  if (!phaseName) return;

  const duration = await safePrompt('Duration in hours:', '2');
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
        <a class="btn subtle" href="#/platform" style="margin-top: 8px;">Go to Platform Designer →</a>
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
  const addNodeManualBtn = document.getElementById('addNodeManual');
  if (addNodeManualBtn) {
    addNodeManualBtn.addEventListener('click', addCommsNode);
  }

  const clearNodesBtn = document.getElementById('clearNodes');
  if (clearNodesBtn) {
    clearNodesBtn.addEventListener('click', clearCommsNodes);
  }

  const analyzeBtn = document.getElementById('analyzeLinks');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeCommsLinks);
  }

  const downloadBtn = document.getElementById('downloadCommsReport');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCommsReportFn);
  }

  // Initialize interactive map
  initCommsMap();

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

async function addCommsNode() {
  if (!currentCommsAnalysis) return;

  const nodeName = await safePrompt('Node name (e.g., "GCS", "Relay-1", "UAV-1"):');
  if (!nodeName) return;

  const lat = await safePrompt('Latitude (decimal degrees):', '0.0');
  if (lat === null) return;

  const lon = await safePrompt('Longitude (decimal degrees):', '0.0');
  if (lon === null) return;

  const heightAGL = await safePrompt('Height above ground level (meters):', '2');
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
  renderCommsMap();
}

function clearCommsNodes() {
  if (!currentCommsAnalysis) return;

  if (currentCommsAnalysis.nodes.length === 0) {
    alert('No nodes to clear');
    return;
  }

  const confirmed = confirm(`Clear all ${currentCommsAnalysis.nodes.length} nodes?\n\nThis cannot be undone.`);
  if (!confirmed) return;

  currentCommsAnalysis.nodes = [];
  renderNodesEditor();
  renderCommsMap();
  alert('All nodes cleared');
}

let commsMapCanvas = null;
let commsMapCtx = null;
let commsMapState = {
  centerLat: 0,
  centerLon: 0,
  zoom: 1,
  nodeTypeToPlace: 'transceiver', // transceiver, uav, relay
};

function initCommsMap() {
  commsMapCanvas = document.getElementById('commsMapCanvas');
  if (!commsMapCanvas) return;

  // Set canvas size
  const container = commsMapCanvas.parentElement;
  commsMapCanvas.width = container.clientWidth;
  commsMapCanvas.height = container.clientHeight;

  commsMapCtx = commsMapCanvas.getContext('2d');

  // Click handler to place nodes
  commsMapCanvas.addEventListener('click', async (e) => {
    const rect = commsMapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert canvas coordinates to lat/lon (simplified)
    const lat = commsMapState.centerLat + ((commsMapCanvas.height / 2 - y) / commsMapCanvas.height) * 0.1 * commsMapState.zoom;
    const lon = commsMapState.centerLon + ((x - commsMapCanvas.width / 2) / commsMapCanvas.width) * 0.1 * commsMapState.zoom;

    // Prompt for node details
    const nodeTypes = {
      'GCS': 'transceiver',
      'UAV': 'transceiver',
      'Relay': 'transceiver'
    };

    const typeName = await safePrompt('Node type:\n1. GCS (Ground Control Station)\n2. UAV (Unmanned Aerial Vehicle)\n3. Relay (Communication Relay)\n\nEnter 1, 2, or 3:', '1');
    if (!typeName) return;

    const typeMap = { '1': 'GCS', '2': 'UAV', '3': 'Relay' };
    const selectedType = typeMap[typeName] || 'GCS';

    const nodeName = await safePrompt(`${selectedType} name:`, `${selectedType}-${currentCommsAnalysis.nodes.length + 1}`);
    if (!nodeName) return;

    const heightAGL = await safePrompt('Height above ground level (meters):', selectedType === 'GCS' ? '2' : selectedType === 'UAV' ? '100' : '50');
    if (heightAGL === null) return;

    // Create node
    const node = {
      name: nodeName,
      type: nodeTypes[selectedType],
      location: {
        lat: parseFloat(lat.toFixed(6)),
        lon: parseFloat(lon.toFixed(6)),
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
      nodeType: selectedType,
      notes: ''
    };

    CommsValidator.addNode(currentCommsAnalysis, node);
    renderNodesEditor();
    renderCommsMap();
  });

  // Render initial map
  renderCommsMap();
}

function renderCommsMap() {
  if (!commsMapCtx || !commsMapCanvas) return;

  const ctx = commsMapCtx;
  const width = commsMapCanvas.width;
  const height = commsMapCanvas.height;

  // Clear canvas
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = '#2a3f5e';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw center crosshair
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 10, height / 2);
  ctx.lineTo(width / 2 + 10, height / 2);
  ctx.moveTo(width / 2, height / 2 - 10);
  ctx.lineTo(width / 2, height / 2 + 10);
  ctx.stroke();

  // Draw links between nodes
  if (currentCommsAnalysis && currentCommsAnalysis.nodes.length > 1) {
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 2;

    for (let i = 0; i < currentCommsAnalysis.nodes.length; i++) {
      for (let j = i + 1; j < currentCommsAnalysis.nodes.length; j++) {
        const node1 = currentCommsAnalysis.nodes[i];
        const node2 = currentCommsAnalysis.nodes[j];

        const pos1 = latLonToCanvas(node1.location.lat, node1.location.lon);
        const pos2 = latLonToCanvas(node2.location.lat, node2.location.lon);

        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  if (currentCommsAnalysis && currentCommsAnalysis.nodes) {
    currentCommsAnalysis.nodes.forEach(node => {
      const pos = latLonToCanvas(node.location.lat, node.location.lon);

      // Determine color based on node type
      let color = '#60a5fa'; // default blue
      if (node.nodeType === 'GCS' || node.name.toLowerCase().includes('gcs')) {
        color = '#4ade80'; // green
      } else if (node.nodeType === 'Relay' || node.name.toLowerCase().includes('relay')) {
        color = '#fbbf24'; // yellow
      }

      // Draw node circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw node label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText(node.name, pos.x + 12, pos.y + 4);
    });
  }

  // Draw instructions
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '14px monospace';
  ctx.fillText('Click to place nodes', 10, 20);
}

function latLonToCanvas(lat, lon) {
  const width = commsMapCanvas.width;
  const height = commsMapCanvas.height;

  // Simple conversion (centered on commsMapState center)
  const x = width / 2 + ((lon - commsMapState.centerLon) / (0.1 * commsMapState.zoom)) * width;
  const y = height / 2 - ((lat - commsMapState.centerLat) / (0.1 * commsMapState.zoom)) * height;

  return { x, y };
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
      tool: 'COTS Architect - Offline Mission Planner',
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
    a.download = `cots_mission_package_${Date.now()}.json`;
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
        localStorage.setItem('cots_environmental_data', JSON.stringify(envData));
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
        localStorage.setItem('cots_environmental_data', JSON.stringify(rangeData));
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
// INVENTORY EDITOR
// ============================================================================

let currentEditingPart = null;

function initInventoryEditor() {
  // Add New Part button
  const addNewPartBtn = document.getElementById('addNewPart');
  if (addNewPartBtn) {
    addNewPartBtn.addEventListener('click', () => openPartEditor(null, 'accessories'));
  }

  // Delete Entire Inventory button
  const deleteInventoryBtn = document.getElementById('deleteEntireInventory');
  if (deleteInventoryBtn) {
    deleteInventoryBtn.addEventListener('click', deleteEntireInventory);
  }

  // Close modal buttons
  const closeBtn = document.getElementById('closePartEditor');
  const cancelBtn = document.getElementById('cancelPartEdit');
  if (closeBtn) closeBtn.addEventListener('click', closePartEditorModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePartEditorModal);

  // Close modal when clicking outside
  const modal = document.getElementById('partEditorModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePartEditorModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('partEditorModal');
      if (modal && !modal.hidden) {
        closePartEditorModal();
      }
    }
  });

  // Save part form
  const partForm = document.getElementById('partEditorForm');
  if (partForm) {
    partForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePartChanges();
    });
  }

  // Delete part button
  const deleteBtn = document.getElementById('deletePartBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => await deletePart());
  }

  // Auto-fill from link button
  const autoFillBtn = document.getElementById('autoFillFromLink');
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', async () => await autoFillFromLink());
  }

  // Category change handler (for category-specific fields)
  const categorySelect = document.getElementById('editPartCategorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', updateCategorySpecificFields);
  }
}

async function openPartEditor(partId, category) {
  const modal = document.getElementById('partEditorModal');
  const title = document.getElementById('partEditorTitle');
  const deleteBtn = document.getElementById('deletePartBtn');

  if (!modal) return;

  // Reset form
  document.getElementById('partEditorForm').reset();
  currentEditingPart = null;

  if (partId) {
    // Edit existing part
    title.textContent = 'Edit Part';
    deleteBtn.style.display = 'block';

    try {
      const part = await PartsLibrary.getPart(category, partId);
      if (!part) {
        alert('Part not found');
        return;
      }

      currentEditingPart = { ...part, category };

      // Populate form
      document.getElementById('editPartId').value = part.id || '';
      document.getElementById('editPartCategory').value = category;
      document.getElementById('editPartName').value = part.name || '';
      document.getElementById('editPartCategorySelect').value = category;
      document.getElementById('editPartManufacturer').value = part.manufacturer || '';
      document.getElementById('editPartNumber').value = part.part_number || '';
      document.getElementById('editPartQuantity').value = part.quantity || '';
      document.getElementById('editPartWeight').value = part.weight_g || '';
      document.getElementById('editPartCost').value = part.cost_usd || '';
      document.getElementById('editPartAvailability').value = part.availability || '';
      document.getElementById('editPartLink').value = part.link || '';
      document.getElementById('editPartNotes').value = part.notes || '';

      updateCategorySpecificFields();
    } catch (error) {
      console.error('Failed to load part:', error);
      alert('Failed to load part details');
      return;
    }
  } else {
    // Add new part
    title.textContent = 'Add New Part';
    deleteBtn.style.display = 'none';
    document.getElementById('editPartCategorySelect').value = category;
    updateCategorySpecificFields();
  }

  modal.hidden = false;
}

function closePartEditorModal() {
  const modal = document.getElementById('partEditorModal');
  if (modal) {
    modal.hidden = true;
  }
  currentEditingPart = null;
}

async function savePartChanges() {
  const partId = document.getElementById('editPartId').value;
  const oldCategory = document.getElementById('editPartCategory').value;
  const newCategory = document.getElementById('editPartCategorySelect').value;

  const partData = {
    id: partId || undefined,
    name: document.getElementById('editPartName').value,
    manufacturer: document.getElementById('editPartManufacturer').value,
    part_number: document.getElementById('editPartNumber').value,
    quantity: parseFloat(document.getElementById('editPartQuantity').value) || undefined,
    weight_g: parseFloat(document.getElementById('editPartWeight').value) || undefined,
    cost_usd: parseFloat(document.getElementById('editPartCost').value) || undefined,
    availability: document.getElementById('editPartAvailability').value || undefined,
    link: document.getElementById('editPartLink').value,
    notes: document.getElementById('editPartNotes').value
  };

  // Add category-specific fields
  if (newCategory === 'motors') {
    const kv = document.getElementById('editPartKV');
    const thrust = document.getElementById('editPartMaxThrust');
    if (kv && kv.value) partData.kv = parseFloat(kv.value);
    if (thrust && thrust.value) partData.max_thrust_g = parseFloat(thrust.value);
  } else if (newCategory === 'batteries') {
    const cells = document.getElementById('editPartCells');
    const capacity = document.getElementById('editPartCapacity');
    const voltage = document.getElementById('editPartVoltage');
    const cRating = document.getElementById('editPartCRating');
    if (cells && cells.value) partData.cells = parseInt(cells.value);
    if (capacity && capacity.value) partData.capacity_mah = parseFloat(capacity.value);
    if (voltage && voltage.value) partData.voltage_nominal_v = parseFloat(voltage.value);
    if (cRating && cRating.value) partData.c_rating = parseFloat(cRating.value);
  } else if (newCategory === 'escs') {
    const current = document.getElementById('editPartMaxCurrent');
    const firmware = document.getElementById('editPartFirmware');
    if (current && current.value) partData.max_current_a = parseFloat(current.value);
    if (firmware && firmware.value) partData.firmware = firmware.value;
  }

  try {
    if (partId && oldCategory !== newCategory) {
      // Category changed - delete from old category and add to new
      await PartsLibrary.deletePart(oldCategory, partId);
      partData.id = undefined; // Generate new ID for new category
      await PartsLibrary.addPart(newCategory, partData);
    } else {
      // Same category - just add/update
      await PartsLibrary.addPart(newCategory, partData);
    }

    closePartEditorModal();
    await loadPartsLibraryUI();

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success('Part saved successfully', 2000);
    }
  } catch (error) {
    console.error('Failed to save part:', error);
    alert(`Failed to save part: ${error.message}`);
  }
}

async function deletePart() {
  if (!currentEditingPart) return;

  const confirmed = confirm(`Are you sure you want to delete "${currentEditingPart.name}"?\n\nThis action cannot be undone.`);
  if (!confirmed) return;

  try {
    await PartsLibrary.deletePart(currentEditingPart.category, currentEditingPart.id);
    closePartEditorModal();
    await loadPartsLibraryUI();

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success('Part deleted successfully', 2000);
    }
  } catch (error) {
    console.error('Failed to delete part:', error);
    alert(`Failed to delete part: ${error.message}`);
  }
}

/**
 * Delete entire inventory (all parts from all categories)
 */
async function deleteEntireInventory() {
  const confirmed = confirm(
    '⚠️ WARNING: This will delete ALL parts from your entire inventory!\n\n' +
    'This includes:\n' +
    '- All airframes\n' +
    '- All motors\n' +
    '- All ESCs\n' +
    '- All batteries\n' +
    '- All flight controllers\n' +
    '- All radios\n' +
    '- All sensors\n' +
    '- All accessories\n\n' +
    'This action CANNOT be undone.\n\n' +
    'Are you absolutely sure you want to continue?'
  );

  if (!confirmed) return;

  // Second confirmation
  const doubleConfirm = confirm(
    'FINAL CONFIRMATION\n\n' +
    'Type confirmation below to proceed with deletion of entire inventory.\n\n' +
    'Click OK to continue, or Cancel to abort.'
  );

  if (!doubleConfirm) return;

  try {
    // Get statistics before deletion for feedback
    const stats = await PartsLibrary.getStatistics();
    const totalParts = stats.totalParts;

    // Delete all categories
    await PartsLibrary.clearLibrary();

    // Reload UI
    await loadPartsLibraryUI();

    alert(`✅ Successfully deleted ${totalParts} parts from inventory.\n\nYou can now import a new inventory or load the sample catalog.`);

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success(`Deleted ${totalParts} parts from inventory`, 3000);
    }
  } catch (error) {
    console.error('Failed to delete inventory:', error);
    alert(`❌ Failed to delete inventory: ${error.message}\n\nCheck console for details.`);
  }
}

async function autoFillFromLink() {
  const linkInput = document.getElementById('editPartLink');
  const link = linkInput.value;

  if (!link) {
    alert('Please enter a product link first');
    return;
  }

  // Basic validation
  try {
    new URL(link);
  } catch {
    alert('Invalid URL format');
    return;
  }

  const btn = document.getElementById('autoFillFromLink');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Scraping...';
  btn.disabled = true;

  try {
    // Use a simple scraping approach - fetch the page and extract basic info
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(link)}`);
    const html = await response.text();

    // Parse HTML for common product info patterns
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Try to extract title
    const titleElement = doc.querySelector('h1, .product-title, [class*="title"]');
    if (titleElement && !document.getElementById('editPartName').value) {
      document.getElementById('editPartName').value = titleElement.textContent.trim();
    }

    // Try to extract price
    const priceElement = doc.querySelector('[class*="price"]:not([class*="was"])');
    if (priceElement && !document.getElementById('editPartCost').value) {
      const priceMatch = priceElement.textContent.match(/\$?([\d,]+\.?\d*)/);
      if (priceMatch) {
        document.getElementById('editPartCost').value = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }

    // Try to extract weight from description/specs
    const bodyText = doc.body.textContent;
    const weightMatch = bodyText.match(/(\d+\.?\d*)\s*(g|grams?)\b/i);
    if (weightMatch && !document.getElementById('editPartWeight').value) {
      document.getElementById('editPartWeight').value = parseFloat(weightMatch[1]);
    }

    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success('Auto-filled available fields from product page', 3000);
    } else {
      alert('Auto-filled available fields from product page');
    }
  } catch (error) {
    console.error('Auto-fill failed:', error);
    alert('Failed to scrape product page. You may need to fill in details manually.\n\nNote: Some websites block automated scraping.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function updateCategorySpecificFields() {
  const category = document.getElementById('editPartCategorySelect').value;
  const container = document.getElementById('categorySpecificFields');

  if (!container) return;

  // Clear existing fields
  container.innerHTML = '';

  // Add category-specific fields based on category
  const categoryFields = {
    motors: `
      <h4 style="margin: 16px 0 8px;">Motor-Specific Fields</h4>
      <div class="form-grid">
        <label>KV Rating
          <input type="number" id="editPartKV" placeholder="e.g., 1750">
        </label>
        <label>Max Thrust (grams)
          <input type="number" id="editPartMaxThrust" placeholder="e.g., 1850">
        </label>
      </div>
    `,
    batteries: `
      <h4 style="margin: 16px 0 8px;">Battery-Specific Fields</h4>
      <div class="form-grid">
        <label>Cells (S)
          <input type="number" id="editPartCells" placeholder="e.g., 4">
        </label>
        <label>Capacity (mAh)
          <input type="number" id="editPartCapacity" placeholder="e.g., 1300">
        </label>
        <label>Voltage (V)
          <input type="number" id="editPartVoltage" placeholder="e.g., 14.8" step="0.1">
        </label>
        <label>C Rating
          <input type="number" id="editPartCRating" placeholder="e.g., 100">
        </label>
      </div>
    `,
    escs: `
      <h4 style="margin: 16px 0 8px;">ESC-Specific Fields</h4>
      <div class="form-grid">
        <label>Max Current (A)
          <input type="number" id="editPartMaxCurrent" placeholder="e.g., 35">
        </label>
        <label>Firmware
          <input type="text" id="editPartFirmware" placeholder="e.g., BLHeli_32">
        </label>
      </div>
    `
  };

  if (categoryFields[category]) {
    container.innerHTML = categoryFields[category];

    // Populate values if editing existing part
    if (currentEditingPart) {
      if (category === 'motors') {
        const kvInput = document.getElementById('editPartKV');
        const thrustInput = document.getElementById('editPartMaxThrust');
        if (kvInput && currentEditingPart.kv) kvInput.value = currentEditingPart.kv;
        if (thrustInput && currentEditingPart.max_thrust_g) thrustInput.value = currentEditingPart.max_thrust_g;
      } else if (category === 'batteries') {
        const cellsInput = document.getElementById('editPartCells');
        const capacityInput = document.getElementById('editPartCapacity');
        const voltageInput = document.getElementById('editPartVoltage');
        const cRatingInput = document.getElementById('editPartCRating');
        if (cellsInput && currentEditingPart.cells) cellsInput.value = currentEditingPart.cells;
        if (capacityInput && currentEditingPart.capacity_mah) capacityInput.value = currentEditingPart.capacity_mah;
        if (voltageInput && currentEditingPart.voltage_nominal_v) voltageInput.value = currentEditingPart.voltage_nominal_v;
        if (cRatingInput && currentEditingPart.c_rating) cRatingInput.value = currentEditingPart.c_rating;
      } else if (category === 'escs') {
        const currentInput = document.getElementById('editPartMaxCurrent');
        const firmwareInput = document.getElementById('editPartFirmware');
        if (currentInput && currentEditingPart.max_current_a) currentInput.value = currentEditingPart.max_current_a;
        if (firmwareInput && currentEditingPart.firmware) firmwareInput.value = currentEditingPart.firmware;
      }
    }
  }
}

// Make openPartEditor global so it can be called from HTML onclick
window.openPartEditor = openPartEditor;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('COTS Architect initializing...');

  migrateLegacyStorage();

  // Hide demo banner and CTAs if running in Electron (desktop app)
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  if (isElectron) {
    const demoBanner = document.querySelector('.version-strip .pill.warning');
    if (demoBanner) {
      demoBanner.style.display = 'none';
    }
    const desktopCTA = document.getElementById('desktopDownloadCTA');
    if (desktopCTA) {
      desktopCTA.style.display = 'none';
    }
    const demoNotice = document.getElementById('offline-notice');
    if (demoNotice) {
      demoNotice.innerHTML = `
        <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
          <strong>Desktop Application:</strong> All data is stored locally on your computer. Session files are auto-saved to <code>%USERPROFILE%\\Documents\\COTS-Architect\\Sessions\\</code>
        </p>
        <p style="margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.6;">
          Maintained by Noah Schultz (individual). Open-source mission planning tool. Not affiliated with or endorsed by DoD/USG.
        </p>
      `;
    }
  }

  initThemeToggle();
  initVersionBadges();
  initHomePage();

  // Initialize workflow progress tracker
  if (typeof WorkflowProgress !== 'undefined') {
    WorkflowProgress.init();
  }

  // Set up inventory editor event listeners
  initInventoryEditor();

  // Set up routing
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange(); // Initial route

  console.log('COTS Architect ready');
});
