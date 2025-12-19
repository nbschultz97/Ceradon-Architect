// Ceradon Architect SPA
// - Hash-based routes: home, workflow, tools, mission, demos, docs
// - Theme tokens live in assets/css/styles.css
// - Add new tools/demos by editing the data blocks below

const APP_VERSION = 'Architect Hub v0.4.0';
const DEMO_ACCESS_CODE = 'ARC-STACK-761';
const DEMO_ACCESS_KEY = 'ceradon_demo_code';
const CHANGE_LOG = [
  {
    version: 'v0.4.0',
    date: '2024-06-06',
    changes: [
      'Added version and schema badges with mirrored footer metadata.',
      'Introduced access overlays, status cards, and timestamps for MissionProject.',
      'Consolidated modules/workflows copy and added a collapsible change log.'
    ]
  },
  {
    version: 'v0.3.1',
    date: '2024-05-20',
    changes: [
      'Refined MissionProject validation, summaries, and schema warnings.',
      'Improved embedded workflow navigation and module status tracking.'
    ]
  },
  {
    version: 'v0.3.0',
    date: '2024-05-05',
    changes: [
      'Initial static hub with MissionProject storage, exports, and tool launchers.'
    ]
  }
];

window.DEMO_ACCESS_CODE = DEMO_ACCESS_CODE;
window.DEMO_ACCESS_KEY = DEMO_ACCESS_KEY;

const toolData = [
  {
    name: 'Mission Architect',
    type: 'Mission composition',
    description: 'Mission-first entry point for phases, AO geometry, and constraints that drive the rest of the stack.',
    status: 'Live demo',
    badges: ['Mission composition', 'JSON export'],
    link: 'https://mission.ceradonsystems.com/'
  },
  {
    name: 'Node Architect',
    type: 'Planning tool',
    description: 'Define sensing nodes, payload stacks, power envelopes, and deployment conditions.',
    status: 'Live demo',
    badges: ['Node planning', 'Payload design'],
    link: 'https://node.ceradonsystems.com/web/index.html'
  },
  {
    name: 'UxS Architect',
    type: 'Planning tool',
    description: 'Pair nodes to UxS platforms (air/ground/surface) with loadouts and sortie timing.',
    status: 'Live demo',
    badges: ['Platform design', 'Loadouts'],
    link: 'https://uxs.ceradonsystems.com/web/'
  },
  {
    name: 'Mesh Architect',
    type: 'RF tool',
    description: 'Shape RF meshes, relays, and gateways for contested environments.',
    status: 'Live demo',
    badges: ['Mesh / RF', 'Coverage'],
    link: 'https://mesh.ceradonsystems.com/'
  },
  {
    name: 'KitSmith',
    type: 'Planning tool',
    description: 'Build kits, spares, and sustainment loads aligned to mission phases and roles.',
    status: 'Live demo',
    badges: ['Kits & sustainment', 'Resupply'],
    link: 'https://kitsmith.ceradonsystems.com/'
  }
];

const workflowModules = [
  {
    id: 'platform',
    name: 'Platform Designer (Node + UxS)',
    category: 'Platform Designer',
    description: 'Shape sensing nodes and pair them with UxS lift. Keep payload, power, and sortie timing together.',
    iframe: 'https://node.ceradonsystems.com/web/index.html',
    links: [
      { label: 'Open Node Architect', href: 'https://node.ceradonsystems.com/web/index.html' },
      { label: 'Open UxS Architect', href: 'https://uxs.ceradonsystems.com/web/' }
    ]
  },
  {
    id: 'mesh',
    name: 'Mesh Planner',
    category: 'Mesh Planner',
    description: 'Plan relays, LOS/NLOS links, and coverage so critical links stay redundant.',
    iframe: 'https://mesh.ceradonsystems.com/',
    links: [
      { label: 'Open Mesh Architect', href: 'https://mesh.ceradonsystems.com/' }
    ]
  },
  {
    id: 'mission',
    name: 'Mission Planner',
    category: 'Mission Planner',
    description: 'Mission Architect drives phases, AO constraints, and exports that feed every downstream tool.',
    iframe: 'https://mission.ceradonsystems.com/',
    links: [
      { label: 'Open Mission Architect', href: 'https://mission.ceradonsystems.com/' },
      { label: 'Mission Architect print view', href: 'https://mission.ceradonsystems.com/print.html' }
    ]
  },
  {
    id: 'kitsmith',
    name: 'KitSmith',
    category: 'KitSmith',
    description: 'Sustainment packaging, batteries, and per-person loads tied to mission phases.',
    iframe: 'https://kitsmith.ceradonsystems.com/',
    links: [
      { label: 'Open KitSmith', href: 'https://kitsmith.ceradonsystems.com/' },
      { label: 'KitSmith print view', href: 'https://kitsmith.ceradonsystems.com/print.html' }
    ]
  }
];

const demoStories = [
  {
    name: 'Sample COTS sortie stack',
    entry: 'Mission-first',
    flow: 'Mission Architect → Node Architect → UxS Architect → Mesh Architect → KitSmith',
    outputs: 'Light UxS, lean relays, and kit packaging tied together by MissionProject JSON.',
    links: {
      mission: 'https://mission.ceradonsystems.com/',
      tools: [
        'https://node.ceradonsystems.com/web/index.html',
        'https://uxs.ceradonsystems.com/web/',
        'https://mesh.ceradonsystems.com/',
        'https://kitsmith.ceradonsystems.com/'
      ]
    }
  },
  {
    name: 'Urban mesh in dense block',
    entry: 'RF-environment-first',
    flow: 'Mesh Architect → Mission Architect → Node Architect → UxS Architect → KitSmith',
    outputs: 'RF survey-driven relays, constrained phases, small quad loadouts, and lean sustainment.',
    links: {
      mission: 'https://mission.ceradonsystems.com/',
      tools: [
        'https://mesh.ceradonsystems.com/',
        'https://mission.ceradonsystems.com/',
        'https://node.ceradonsystems.com/web/index.html',
        'https://uxs.ceradonsystems.com/web/',
        'https://kitsmith.ceradonsystems.com/'
      ]
    }
  }
];

const routes = ['home', 'workflow', 'tools', 'mission', 'demos', 'docs'];
const MODULE_STATUS_KEY = 'ceradon_module_statuses';
const moduleStatusOptions = ['Not Started', 'In Progress', 'Complete'];
const DEMO_PROJECT_PATH = 'data/demo_mission_project.json';
const LOAD_WARNING_MARGIN_KG = 2; // Small buffer before weight is flagged.
const SUSTAINMENT_WARNING_BUFFER_HOURS = 6; // Hours of sustainment shortfall tolerated before alerting.
let highlightedTools = [];
let moduleStatuses = {};
let activeModuleId = workflowModules[0].id;
let projectStatusMessage = '';
let projectLoadSource = '';
let editorErrors = [];

const hasDemoAccess = () => localStorage.getItem(DEMO_ACCESS_KEY) === DEMO_ACCESS_CODE;

function formatTimestamp(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString();
}

function setActiveRoute(route) {
  const target = routes.includes(route) ? route : 'home';

  document.querySelectorAll('.view').forEach(section => {
    section.hidden = section.id !== target;
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    const isActive = link.dataset.route === target;
    link.classList.toggle('active', isActive);
  });
}

function handleHashChange() {
  const hash = window.location.hash.replace('#/', '') || 'home';
  setActiveRoute(hash);
}

function renderVersionBadges() {
  document.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = APP_VERSION;
  });
  document.querySelectorAll('[data-schema-version]').forEach((el) => {
    el.textContent = `MissionProject schema v${MISSION_PROJECT_SCHEMA_VERSION}`;
  });
}

function renderChangeLog() {
  const container = document.getElementById('changeLogEntries');
  if (!container) return;
  container.innerHTML = '';

  CHANGE_LOG.forEach((entry) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'change-log-entry';
    wrapper.innerHTML = `
      <div class="change-log-header">
        <strong>${entry.version}</strong>
        <span class="small muted">${entry.date}</span>
      </div>
      <ul class="change-log-list">${entry.changes.map((item) => `<li>${item}</li>`).join('')}</ul>
    `;
    container.appendChild(wrapper);
  });
}

function buildTools() {
  const grid = document.getElementById('toolGrid');
  if (!grid) return;
  grid.innerHTML = '';

  toolData.forEach(tool => {
    const card = document.createElement('article');
    card.className = 'tool-card';
    if (highlightedTools.includes(tool.name)) {
      card.classList.add('highlight');
    }
    card.innerHTML = `
      <div class="status ${tool.status.toLowerCase().replace(' ', '')}">${tool.status}</div>
      <h3>${tool.name}</h3>
      <p class="small">${tool.type}</p>
      <p>${tool.description}</p>
      <div class="badges">${tool.badges.map(b => `<span class="badge">${b}</span>`).join('')}</div>
      <a class="btn primary" href="${tool.link}" target="_blank" rel="noopener">Open in new tab</a>
    `;
    grid.appendChild(card);
  });
}

function buildDemos() {
  const grid = document.getElementById('demoGrid');
  if (!grid) return;
  grid.innerHTML = '';

  demoStories.forEach(demo => {
    const card = document.createElement('div');
    card.className = 'demo-card';
    card.innerHTML = `
      <h3>${demo.name}</h3>
      <p class="small"><strong>Entry:</strong> ${demo.entry}</p>
      <p class="small"><strong>Flow:</strong> ${demo.flow}</p>
      <p>${demo.outputs}</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'demo-actions';

    const openMission = document.createElement('a');
    openMission.className = 'btn ghost';
    openMission.textContent = 'Open Mission Architect';
    openMission.href = demo.links.mission;
    openMission.target = '_blank';
    openMission.rel = 'noopener';
    actions.appendChild(openMission);

    const openTools = document.createElement('a');
    openTools.className = 'btn subtle';
    openTools.textContent = 'Open relevant tools';
    openTools.href = '#';
    openTools.addEventListener('click', (e) => {
      e.preventDefault();
      demo.links.tools.forEach(url => window.open(url, '_blank', 'noopener'));
    });

    actions.appendChild(openTools);
    card.appendChild(actions);
    grid.appendChild(card);
  });
}

function loadModuleStatuses() {
  const stored = localStorage.getItem(MODULE_STATUS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) || {};
  } catch (error) {
    console.warn('Unable to parse module statuses, resetting', error);
    return {};
  }
}

function saveModuleStatuses(statuses) {
  moduleStatuses = { ...statuses };
  localStorage.setItem(MODULE_STATUS_KEY, JSON.stringify(moduleStatuses));
}

function renderModuleNav() {
  const sidebar = document.getElementById('moduleSidebar');
  if (!sidebar) return;
  sidebar.innerHTML = '';

  workflowModules.forEach((module) => {
    const status = moduleStatuses[module.id] || 'Not Started';
    const button = document.createElement('button');
    button.className = `module-nav-item ${activeModuleId === module.id ? 'active' : ''}`;
    button.setAttribute('type', 'button');
    button.innerHTML = `
      <div class="module-nav-text">
        <strong>${module.name}</strong>
        <span class="small">${module.category}</span>
      </div>
      <span class="status-pill ${status.toLowerCase().replace(' ', '-') }">${status}</span>
    `;
    button.addEventListener('click', () => {
      activeModuleId = module.id;
      renderModuleContent();
      renderModuleNav();
    });
    sidebar.appendChild(button);
  });
}

function renderModuleContent() {
  const module = workflowModules.find((item) => item.id === activeModuleId) || workflowModules[0];
  if (!module) return;

  const category = document.getElementById('moduleCategory');
  const title = document.getElementById('moduleTitle');
  const description = document.getElementById('moduleDescription');
  const linksContainer = document.getElementById('moduleLinks');
  const embedContainer = document.getElementById('moduleEmbed');
  const statusSelect = document.getElementById('moduleStatus');

  if (category) category.textContent = module.category;
  if (title) title.textContent = module.name;
  if (description) description.textContent = module.description;

  if (linksContainer) {
    linksContainer.innerHTML = '';
    module.links.forEach(link => {
      const anchor = document.createElement('a');
      anchor.className = 'btn subtle';
      anchor.textContent = link.label;
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      linksContainer.appendChild(anchor);
    });
  }

  if (embedContainer) {
    embedContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.title = module.name;
    iframe.src = module.iframe;
    iframe.loading = 'lazy';
    embedContainer.appendChild(iframe);
  }

  if (statusSelect) {
    statusSelect.innerHTML = '';
    moduleStatusOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      statusSelect.appendChild(opt);
    });
    statusSelect.value = moduleStatuses[module.id] || 'Not Started';
    statusSelect.onchange = (event) => {
      const nextStatus = event.target.value;
      saveModuleStatuses({ ...moduleStatuses, [module.id]: nextStatus });
      renderModuleNav();
    };
  }
}

function getNumeric(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function buildFeasibilityItems(project) {
  const duration = getNumeric(project.meta?.durationHours, 0);
  const sustainment = getNumeric(project.sustainment?.sustainmentHours, 0);
  const perPersonLoad = getNumeric(project.kitsSummary?.perOperatorLoadKg ?? project.kits?.perOperatorLoadKg, 0);
  const loadLimit = getNumeric(project.kitsSummary?.perOperatorLimitKg ?? project.kits?.perOperatorLimitKg, 0);
  const relayCount = getNumeric(project.meshPlan?.relayCount, 0);
  const criticalLinks = getNumeric(project.meshPlan?.criticalLinks, 0);
  const meshLinks = Array.isArray(project.mesh_links) ? project.mesh_links.length : 0;
  const env = Array.isArray(project.environment) && project.environment.length ? project.environment[0] : {};
  const perOperatorLoads = Array.isArray(project.kitsSummary?.perOperatorLoads) ? project.kitsSummary.perOperatorLoads : [];
  const avgOperatorLoad = perOperatorLoads.length
    ? perOperatorLoads.reduce((sum, entry) => sum + getNumeric(entry.weightKg, 0), 0) / perOperatorLoads.length
    : perPersonLoad;

  const sustainmentGap = sustainment - duration;
  let sustainmentStatus = 'alert';
  if (sustainmentGap >= 0) {
    sustainmentStatus = 'good';
  } else if (sustainmentGap >= -SUSTAINMENT_WARNING_BUFFER_HOURS) {
    sustainmentStatus = 'warning';
  }

  const loadMargin = loadLimit - perPersonLoad;
  let loadStatus = 'alert';
  if (loadMargin >= 0) {
    loadStatus = 'good';
  } else if (loadMargin >= -LOAD_WARNING_MARGIN_KG) {
    loadStatus = 'warning';
  }

  const relayMargin = relayCount - criticalLinks;
  let relayStatus = 'alert';
  if (relayMargin >= 0) {
    relayStatus = 'good';
  } else if (relayMargin === -1) {
    relayStatus = 'warning';
  }

  const rfStatus = meshLinks > 0 ? 'good' : (criticalLinks > 0 ? 'alert' : 'warning');
  const envStatus = env.altitudeBand && env.temperatureBand ? 'good' : 'warning';
  const avgLoadStatus = loadLimit && avgOperatorLoad ? (avgOperatorLoad <= loadLimit ? 'good' : 'warning') : 'warning';

  return [
    {
      title: 'Mission duration vs sustainment',
      label: `${sustainment}h sustainment vs ${duration}h duration`,
      detail: sustainmentGap >= 0 ? 'Sustainment covers the planned duration.' : 'Add sustainment hours or shorten phases.',
      status: sustainmentStatus
    },
    {
      title: 'Per-person kit weight',
      label: `${perPersonLoad} kg load vs ${loadLimit} kg limit`,
      detail: loadMargin >= 0 ? 'Load is within the configured per-person limit.' : 'Trim kit weight or increase allowable load.',
      status: loadStatus
    },
    {
      title: 'Average load across team',
      label: perOperatorLoads.length ? `${avgOperatorLoad.toFixed(1)} kg average across ${perOperatorLoads.length} roles` : 'No per-operator loads entered',
      detail: avgLoadStatus === 'good' ? 'Average load fits within per-person limit.' : 'Balance loads or raise the limit in kitsSummary.',
      status: avgLoadStatus
    },
    {
      title: 'Relays vs critical links',
      label: `${relayCount} relays vs ${criticalLinks} critical links`,
      detail: relayMargin >= 0 ? 'Relays match or exceed critical links.' : 'Add redundancy to avoid single points of failure.',
      status: relayStatus
    },
    {
      title: 'RF readiness',
      label: `${meshLinks} mesh links tracked`,
      detail: meshLinks > 0 ? 'Links present for RF planning.' : 'Add mesh_links for contested or long-range missions.',
      status: rfStatus
    },
    {
      title: 'Environment coverage',
      label: env.name ? `${env.name} • ${env.altitudeBand || 'Altitude n/a'} • ${env.temperatureBand || 'Temp n/a'}` : 'Environment not set',
      detail: env.altitudeBand && env.temperatureBand ? 'Baseline environment set for all modules.' : 'Add altitudeBand and temperatureBand to environment[0].',
      status: envStatus
    }
  ];
}

function renderFeasibility(project) {
  const container = document.getElementById('feasibilityItems');
  if (!container) return;
  container.innerHTML = '';

  buildFeasibilityItems(project).forEach(item => {
    const row = document.createElement('div');
    row.className = `feasibility-item ${item.status}`;
    row.innerHTML = `
      <div>
        <p class="small">${item.title}</p>
        <strong>${item.label}</strong>
        <p class="small">${item.detail}</p>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderProjectStatus() {
  const status = document.getElementById('projectStatus');
  if (!status) return;
  status.textContent = projectStatusMessage || '';
  status.hidden = !projectStatusMessage;
}

function getActiveToolList(project) {
  const collections = ['nodes', 'platforms', 'mesh_links', 'kits', 'constraints', 'environment', 'mission'];
  const tools = new Set();
  collections.forEach((key) => {
    const value = project[key];
    if (Array.isArray(value)) {
      value.forEach((item) => item?.origin_tool && tools.add(item.origin_tool));
    } else if (value && typeof value === 'object' && value.origin_tool) {
      tools.add(value.origin_tool);
    }
  });
  if (project.meta?.origin_tool) tools.add(project.meta.origin_tool);
  return Array.from(tools);
}

async function renderMissionProjectHealth(projectOverride) {
  const widget = document.getElementById('missionProjectHealth');
  if (!widget) return;

  const versionEl = document.getElementById('healthSchemaVersion');
  const statusEl = document.getElementById('healthValidationStatus');
  const detailEl = document.getElementById('healthValidationDetail');
  const tile = document.getElementById('healthValidationTile');
  const project = projectOverride || MissionProjectStore.loadMissionProject();
  const version = project?.schemaVersion || MISSION_PROJECT_SCHEMA_VERSION;

  if (versionEl) {
    versionEl.textContent = version || MISSION_PROJECT_SCHEMA_VERSION;
  }

  let status = 'good';
  let headline = 'OK';
  let detail = 'Required fields present for MissionProject v2.0.0.';

  try {
    const { valid, errors } = await MissionProjectStore.validateMissionProjectDetailed(project);
    if (!valid) {
      status = 'alert';
      headline = 'Missing required fields';
      detail = errors.slice(0, 2).join(' • ') || 'Missing required fields.';
    }
  } catch (error) {
    status = 'warning';
    headline = 'Validation unavailable';
    detail = 'Schema could not be loaded for validation.';
  }

  if (statusEl) statusEl.textContent = headline;
  if (detailEl) detailEl.textContent = detail;
  if (tile) {
    tile.classList.remove('good', 'warning', 'alert');
    tile.classList.add(status);
  }
}

function renderSchemaVersion(project) {
  const badge = document.getElementById('schemaVersionBadge');
  const detail = document.getElementById('schemaVersionDetail');
  if (!badge || !detail) return;

  const version = project?.schemaVersion || MISSION_PROJECT_SCHEMA_VERSION;
  badge.textContent = version;
  detail.textContent = version === MISSION_PROJECT_SCHEMA_VERSION
    ? 'Schema matches the hub reference.'
    : `Loaded payload differs from hub reference (${MISSION_PROJECT_SCHEMA_VERSION}).`;
}

function renderSchemaWarning(project) {
  const warning = document.getElementById('schemaWarning');
  if (!warning) return;
  const version = project?.schemaVersion;
  const mismatched = version && version !== MISSION_PROJECT_SCHEMA_VERSION;
  warning.hidden = !mismatched;
  if (mismatched) {
    warning.textContent = `Loaded MissionProject uses schemaVersion ${version}. Hub reference is ${MISSION_PROJECT_SCHEMA_VERSION}. Data will be preserved.`;
  } else {
    warning.textContent = '';
  }
}

function renderProjectSummary(project) {
  const list = document.getElementById('projectSummaryList');
  if (!list) return;
  list.innerHTML = '';

  const env = Array.isArray(project.environment) && project.environment.length ? project.environment[0] : {};
  const summaryItems = [
    { label: 'Duration', value: project.meta?.durationHours ? `${project.meta.durationHours}h` : 'Not set' },
    { label: 'Team size', value: project.meta?.team?.size ? `${project.meta.team.size} personnel` : 'Not set' },
    { label: 'Altitude band', value: env.altitudeBand || 'Not set' },
    { label: 'Temperature band', value: env.temperatureBand || 'Not set' },
    { label: 'Nodes', value: Array.isArray(project.nodes) ? project.nodes.length : 0 },
    { label: 'Platforms', value: Array.isArray(project.platforms) ? project.platforms.length : 0 },
    { label: 'Mesh links', value: Array.isArray(project.mesh_links) ? project.mesh_links.length : 0 },
    { label: 'Kits', value: Array.isArray(project.kits) ? project.kits.length : 0 },
    { label: 'Active tools', value: getActiveToolList(project).join(', ') || 'Not tagged' }
  ];

  summaryItems.forEach((item) => {
    const row = document.createElement('li');
    row.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    list.appendChild(row);
  });
}

function renderEditorErrors() {
  const errorBox = document.getElementById('projectJsonErrors');
  if (!errorBox) return;
  if (!editorErrors.length) {
    errorBox.textContent = 'JSON matches required fields.';
    errorBox.className = 'editor-status success';
    return;
  }
  errorBox.className = 'editor-status alert';
  errorBox.innerHTML = editorErrors.map((err) => `<li>${err}</li>`).join('');
}

function applyWorkflowGuard() {
  const guard = document.getElementById('workflowGuard');
  const overlay = document.getElementById('workflowAccessOverlay');
  const banner = document.getElementById('workflowAccessBanner');
  const dashboard = document.querySelector('.workflow-dashboard');
  const lockedNotice = document.getElementById('plannerLockedNotice');
  const authorized = hasDemoAccess();

  if (guard) {
    guard.classList.toggle('locked', !authorized);
    guard.setAttribute('aria-busy', (!authorized).toString());
  }
  if (overlay) {
    overlay.style.display = authorized ? 'none' : 'flex';
  }
  if (dashboard) {
    dashboard.classList.toggle('blurred', !authorized);
    dashboard.setAttribute('aria-hidden', (!authorized).toString());
  }
  if (banner) {
    banner.hidden = !authorized;
    if (authorized) {
      banner.textContent = `Demo code ${DEMO_ACCESS_CODE} active — embedded planners unlocked.`;
    }
  }
  if (lockedNotice) {
    lockedNotice.hidden = authorized;
  }
}

window.applyWorkflowGuard = applyWorkflowGuard;

function renderMissionProjectStatusPanel(projectOverride) {
  const panel = document.getElementById('missionProjectStatusPanel');
  if (!panel) return;

  const project = projectOverride || MissionProjectStore.loadMissionProject();
  const hasStoredProject = MissionProjectStore.hasMissionProject();
  const env = Array.isArray(project.environment) && project.environment.length ? project.environment[0] : {};
  const lastUpdated = MissionProjectStore.getLastUpdated();
  const displayLoaded = hasStoredProject && projectLoadSource && projectLoadSource !== 'Starter template';

  const nameEl = document.getElementById('statusProjectName');
  const metaEl = document.getElementById('statusProjectMeta');
  const sourceEl = document.getElementById('statusProjectSource');
  const schemaRef = document.getElementById('statusSchemaVersion');
  const updatedRef = document.getElementById('statusLastUpdated');
  const statusActions = document.getElementById('statusActions');
  const importBtn = document.getElementById('homeImportProject');
  const clearBtn = document.getElementById('homeClearProject');

  const name = displayLoaded ? (project.meta?.name || 'Mission project') : 'No project loaded';
  const duration = project.meta?.durationHours ? `${project.meta.durationHours}h` : 'Duration not set';
  const envLabel = env?.name || env?.altitudeBand || 'Environment not set';
  const sourceLabel = displayLoaded ? projectLoadSource : 'Not loaded';
  const updatedLabel = displayLoaded ? formatTimestamp(lastUpdated) : 'Not set';

  if (nameEl) nameEl.textContent = name;
  if (metaEl) metaEl.textContent = displayLoaded
    ? `${duration} • ${envLabel}`
    : 'No MissionProject loaded. Use the demo payload to start.';
  if (sourceEl) sourceEl.textContent = sourceLabel;
  if (schemaRef) schemaRef.textContent = project.schemaVersion || MISSION_PROJECT_SCHEMA_VERSION;
  if (updatedRef) updatedRef.textContent = updatedLabel;
  if (statusActions) {
    const lockToDemo = !displayLoaded;
    if (importBtn) importBtn.hidden = lockToDemo;
    if (clearBtn) clearBtn.hidden = lockToDemo;
  }
  renderSchemaVersion(project);
  renderSchemaWarning(project);
  renderProjectSummary(project);
  renderMissionProjectHealth(project);
}

function setProjectAlert(message, tone = 'info') {
  const alertBox = document.getElementById('projectAlert');
  if (!alertBox) return;
  alertBox.textContent = message || '';
  alertBox.className = `project-alert ${tone}`;
  alertBox.hidden = !message;
}

function loadProjectJsonEditor(project) {
  const editor = document.getElementById('projectJsonEditor');
  if (!editor) return;
  editor.value = JSON.stringify(project, null, 2);
}

async function validateProjectJsonEditor(applyAfterValidate = false) {
  const editor = document.getElementById('projectJsonEditor');
  if (!editor) return;
  try {
    const parsed = JSON.parse(editor.value || '{}');
    const { valid, errors } = await MissionProjectStore.validateMissionProjectDetailed(parsed);
    editorErrors = errors || [];
    if (applyAfterValidate && valid) {
      const saved = MissionProjectStore.importMissionProjectFromText(editor.value);
      projectStatusMessage = saved.meta?.name ? `Imported project: ${saved.meta.name}` : 'Project applied from editor.';
      projectLoadSource = 'JSON editor';
      hydrateProjectForm('JSON editor');
      renderMissionProjectStatusPanel(saved);
      setProjectAlert('JSON applied to MissionProject store.', 'success');
    } else if (applyAfterValidate && !valid) {
      setProjectAlert('Fix schema errors before applying to the workspace.', 'alert');
    } else if (valid) {
      setProjectAlert('JSON looks valid against schema reference.', 'success');
    } else {
      setProjectAlert('Validation found schema issues. See error list below.', 'alert');
    }
  } catch (error) {
    editorErrors = [error.message];
    setProjectAlert('Invalid JSON. Please fix syntax before applying.', 'alert');
  }
  renderEditorErrors();
}

function hydrateProjectForm(sourceLabel) {
  const hasStoredProject = MissionProjectStore.hasMissionProject();
  const baseProject = hasStoredProject ? MissionProjectStore.loadMissionProject() : MissionProjectStore.createEmptyMissionProject();
  setProjectAlert('', 'info');
  const project = MissionProjectStore.saveMissionProject(baseProject);

  if (sourceLabel) {
    projectLoadSource = sourceLabel;
  } else if (!projectLoadSource) {
    projectLoadSource = hasStoredProject ? 'Local storage' : 'Starter template';
  }

  if (!projectStatusMessage && project.meta?.name) {
    projectStatusMessage = `Active project: ${project.meta.name}`;
  }
  const env = Array.isArray(project.environment) ? project.environment[0] : project.meta?.environment;
  document.getElementById('missionName').value = project.meta?.name || '';
  document.getElementById('altitudeBand').value = env?.altitudeBand || '';
  document.getElementById('temperatureBand').value = env?.temperatureBand || '';
  document.getElementById('durationHours').value = project.meta?.durationHours || 24;
  document.getElementById('inventoryReference').value = project.meta?.inventoryReference || '';
  document.getElementById('sustainmentHours').value = project.sustainment?.sustainmentHours ?? '';
  document.getElementById('perPersonLoad').value = project.kitsSummary?.perOperatorLoadKg ?? project.kits?.perOperatorLoadKg ?? '';
  document.getElementById('perPersonLimit').value = project.kitsSummary?.perOperatorLimitKg ?? project.kits?.perOperatorLimitKg ?? '';
  document.getElementById('relayCount').value = project.meshPlan?.relayCount ?? '';
  document.getElementById('criticalLinks').value = project.meshPlan?.criticalLinks ?? '';

  renderFeasibility(project);
  renderProjectStatus();
  renderMissionProjectStatusPanel(project);
  loadProjectJsonEditor(project);
  editorErrors = [];
  renderEditorErrors();
}

function syncProjectFromForm() {
  const project = MissionProjectStore.loadMissionProject();
  project.meta.name = document.getElementById('missionName').value;
  const altitudeBand = document.getElementById('altitudeBand').value;
  const temperatureBand = document.getElementById('temperatureBand').value;
  const env = Array.isArray(project.environment) && project.environment.length ? project.environment[0] : {};
  project.environment[0] = {
    ...env,
    id: env.id || 'env-main',
    name: env.name || 'Baseline AO',
    altitudeBand,
    temperatureBand,
    origin_tool: env.origin_tool || 'hub'
  };
  project.meta.durationHours = getNumeric(document.getElementById('durationHours').value, project.meta.durationHours);
  project.meta.inventoryReference = document.getElementById('inventoryReference').value;
  project.sustainment.sustainmentHours = getNumeric(document.getElementById('sustainmentHours').value, project.sustainment.sustainmentHours);
  project.kitsSummary = {
    ...(project.kitsSummary || {}),
    perOperatorLoadKg: getNumeric(document.getElementById('perPersonLoad').value, project.kitsSummary?.perOperatorLoadKg),
    perOperatorLimitKg: getNumeric(document.getElementById('perPersonLimit').value, project.kitsSummary?.perOperatorLimitKg)
  };
  project.meshPlan.relayCount = getNumeric(document.getElementById('relayCount').value, project.meshPlan.relayCount);
  project.meshPlan.criticalLinks = getNumeric(document.getElementById('criticalLinks').value, project.meshPlan.criticalLinks);

  const saved = MissionProjectStore.saveMissionProject(project);
  renderFeasibility(saved);
  projectStatusMessage = saved.meta?.name ? `Active project: ${saved.meta.name}` : '';
  projectLoadSource = projectLoadSource || 'Local storage';
  renderProjectStatus();
  renderMissionProjectStatusPanel(saved);
}

function bindProjectForm() {
  const form = document.getElementById('projectMetaForm');
  if (!form) return;
  form.addEventListener('input', syncProjectFromForm);
  form.addEventListener('change', syncProjectFromForm);
}

function attachImportHandlers(button, fileInput, sourceLabel = 'Imported JSON') {
  button?.addEventListener('click', (event) => {
    event.preventDefault();
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    MissionProjectStore.importMissionProject(file)
      .then((saved) => {
        projectStatusMessage = saved.meta?.name ? `Imported project: ${saved.meta.name}` : 'Imported MissionProject payload.';
        projectLoadSource = sourceLabel;
        setProjectAlert('MissionProject imported successfully.', 'success');
        hydrateProjectForm(sourceLabel);
      })
      .catch(() => {
        setProjectAlert('Unable to import project JSON. Please verify the MissionProject schema.', 'alert');
      })
      .finally(() => {
        if (fileInput) fileInput.value = '';
        renderProjectStatus();
        renderMissionProjectStatusPanel();
      });
  });
}

async function loadWhitefrostDemo(button) {
  const defaultLabel = button?.dataset.defaultLabel || 'Run the WHITEFROST demo';
  if (button) {
    button.disabled = true;
    button.textContent = 'Preparing WHITEFROST…';
  }

  try {
    // TODO: replace placeholder with WHITEFROST MissionProject v2 JSON once available.
    const stub = MissionProjectStore.createEmptyMissionProject();
    const placeholder = {
      ...stub,
      schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
      meta: {
        ...stub.meta,
        name: 'WHITEFROST demo (stub)',
        description: 'TODO: load WHITEFROST MissionProject v2 JSON when published.'
      }
    };
    const saved = MissionProjectStore.saveMissionProject(placeholder);
    projectStatusMessage = 'WHITEFROST loader stubbed in place.';
    projectLoadSource = 'WHITEFROST (stub)';
    setProjectAlert('WHITEFROST demo placeholder loaded. TODO: attach real MissionProject v2 JSON.', 'info');
    hydrateProjectForm('WHITEFROST (stub)');
    renderMissionProjectHealth(saved);
  } catch (error) {
    console.error(error);
    setProjectAlert('Unable to stage WHITEFROST demo. Please try again.', 'alert');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = defaultLabel;
    }
    renderProjectStatus();
    renderMissionProjectStatusPanel();
  }
}

async function loadDemoProject(button) {
  const defaultLabel = button?.dataset.defaultLabel || 'Load demo project';
  if (button) {
    button.disabled = true;
    button.textContent = 'Loading demo…';
  }

  try {
    const response = await fetch(DEMO_PROJECT_PATH);
    if (!response.ok) {
      throw new Error('Unable to fetch demo project');
    }
    const payload = await response.json();
    if (!MissionProjectStore.validateMissionProject(payload)) {
      throw new Error('Invalid demo project payload');
    }
    const saved = MissionProjectStore.saveMissionProject(payload);
    projectStatusMessage = saved.meta?.name ? `${saved.meta.name} loaded.` : 'Demo project loaded.';
    projectLoadSource = 'Demo project';
    setProjectAlert('Demo project loaded. Exports now mirror the shared schema.', 'success');
    hydrateProjectForm('Demo project');
  } catch (error) {
    console.error(error);
    setProjectAlert('Unable to load the demo project. Please try again.', 'alert');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = defaultLabel;
    }
    renderProjectStatus();
    renderMissionProjectStatusPanel();
  }
}

function bindProjectActions() {
  const exportBtn = document.getElementById('exportProject');
  const importBtn = document.getElementById('importProject');
  const importFile = document.getElementById('importProjectFile');
  const demoBtn = document.getElementById('loadDemoProject');
  const whitefrostBtn = document.getElementById('runWhitefrostDemo');
  const exportGeoBtn = document.getElementById('exportGeo');
  const exportCoTBtn = document.getElementById('exportCoT');
  const validateBtn = document.getElementById('validateProjectJson');
  const applyBtn = document.getElementById('applyProjectJson');

  exportBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    MissionProjectStore.exportMissionProject();
    setProjectAlert('MissionProject exported.', 'info');
  });

  exportGeoBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    MissionProjectStore.exportGeoJSON();
    setProjectAlert('GeoJSON export ready for TAK/overlays.', 'info');
  });

  exportCoTBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    MissionProjectStore.exportCoTStub();
    setProjectAlert('CoT stub export saved.', 'info');
  });

  attachImportHandlers(importBtn, importFile, 'Imported JSON');

  demoBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    loadDemoProject(demoBtn);
  });

  whitefrostBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    loadWhitefrostDemo(whitefrostBtn);
  });

  validateBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    validateProjectJsonEditor(false);
  });

  applyBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    validateProjectJsonEditor(true);
  });
}

function bindStatusPanelActions() {
  const loadBtn = document.getElementById('homeLoadDemo');
  const importBtn = document.getElementById('homeImportProject');
  const importFile = document.getElementById('homeImportProjectFile');
  const clearBtn = document.getElementById('homeClearProject');

  attachImportHandlers(importBtn, importFile, 'Imported JSON');

  loadBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    loadDemoProject(loadBtn);
  });

  clearBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    MissionProjectStore.clearMissionProject();
    projectStatusMessage = '';
    projectLoadSource = 'Starter template';
    setProjectAlert('', 'info');
    hydrateProjectForm('Starter template');
    renderMissionProjectStatusPanel();
  });
}

function initWorkflowDashboard() {
  moduleStatuses = loadModuleStatuses();
  renderModuleNav();
  renderModuleContent();
  hydrateProjectForm();
  bindProjectForm();
  bindProjectActions();
}

function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('ceradon-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  toggle.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙';

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ceradon-theme', next);
    toggle.textContent = next === 'light' ? '☀️' : '🌙';
  });
}

function initApp() {
  buildTools();
  buildDemos();
  initWorkflowDashboard();
  bindStatusPanelActions();
  initThemeToggle();
  renderVersionBadges();
  renderChangeLog();
  applyWorkflowGuard();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('ceradon-demo-authorized', applyWorkflowGuard);
  window.addEventListener('storage', (event) => {
    if (event.key === DEMO_ACCESS_KEY) {
      applyWorkflowGuard();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
