// Ceradon Architect SPA
// - Hash-based routes: home, workflow, tools, mission, demos, docs
// - Theme tokens live in assets/css/styles.css
// - Add new tools/demos by editing the data blocks below

const toolData = [
  {
    name: 'Mission Architect',
    type: 'Mission composition',
    description: 'Mission-first entry point for phases, AO geometry, and constraints that drive the rest of the stack.',
    status: 'Live demo',
    badges: ['Mission composition', 'JSON export'],
    link: 'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761'
  },
  {
    name: 'Node Architect',
    type: 'Planning tool',
    description: 'Define sensing nodes, payload stacks, power envelopes, and deployment conditions.',
    status: 'Live demo',
    badges: ['Node planning', 'Payload design'],
    link: 'https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761'
  },
  {
    name: 'UxS Architect',
    type: 'Planning tool',
    description: 'Pair nodes to UxS platforms (air/ground/surface) with loadouts and sortie timing.',
    status: 'Live demo',
    badges: ['Platform design', 'Loadouts'],
    link: 'https://uxs-architect.ceradonsystems.com/?access_code=ARC-STACK-761'
  },
  {
    name: 'Mesh Architect',
    type: 'RF tool',
    description: 'Shape RF meshes, relays, and gateways for contested environments.',
    status: 'Live demo',
    badges: ['Mesh / RF', 'Coverage'],
    link: 'https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761'
  },
  {
    name: 'KitSmith',
    type: 'Planning tool',
    description: 'Build kits, spares, and sustainment loads aligned to mission phases and roles.',
    status: 'Live demo',
    badges: ['Kits & sustainment', 'Resupply'],
    link: 'https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761'
  }
];

const workflowModules = [
  {
    id: 'platform',
    name: 'Platform Designer (Node + UxS)',
    category: 'Platform Designer',
    description: 'Shape sensing nodes and pair them with UxS lift. Keep payload, power, and sortie timing together.',
    iframe: 'https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
    links: [
      { label: 'Open Node Architect', href: 'https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761' },
      { label: 'Open UxS Architect', href: 'https://uxs-architect.ceradonsystems.com/?access_code=ARC-STACK-761' }
    ]
  },
  {
    id: 'mesh',
    name: 'Mesh Planner',
    category: 'Mesh Planner',
    description: 'Plan relays, LOS/NLOS links, and coverage so critical links stay redundant.',
    iframe: 'https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
    links: [
      { label: 'Open Mesh Architect', href: 'https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761' }
    ]
  },
  {
    id: 'mission',
    name: 'Mission Planner',
    category: 'Mission Planner',
    description: 'Mission Architect drives phases, AO constraints, and exports that feed every downstream tool.',
    iframe: 'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
    links: [
      { label: 'Open Mission Architect', href: 'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761' },
      { label: 'Mission Architect print view', href: 'https://mission-architect.ceradonsystems.com/print.html?access_code=ARC-STACK-761' }
    ]
  },
  {
    id: 'kitsmith',
    name: 'KitSmith',
    category: 'KitSmith',
    description: 'Sustainment packaging, batteries, and per-person loads tied to mission phases.',
    iframe: 'https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761',
    links: [
      { label: 'Open KitSmith', href: 'https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761' },
      { label: 'KitSmith print view', href: 'https://kitsmith.ceradonsystems.com/print.html?access_code=ARC-STACK-761' }
    ]
  }
];

const demoStories = [
  {
    name: 'Project WHITEFROST – alpine recon',
    entry: 'Mission-first',
    flow: 'Mission Architect → Node Architect → UxS Architect → Mesh Architect → KitSmith',
    outputs: 'Cold-weather printed quad, ridge relays, partner sustainment cache, and TAK-friendly exports.',
    links: {
      mission: 'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
      tools: [
        'https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://uxs-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761'
      ]
    }
  },
  {
    name: 'Urban mesh in dense city block',
    entry: 'RF-environment-first',
    flow: 'Mesh Architect → Mission Architect → Node Architect → UxS Architect → KitSmith',
    outputs: 'RF survey-driven relays, mission phases constrained to coverage pockets, small quad loadouts, lean kits.',
    links: {
      mission: 'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
      tools: [
        'https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://uxs-architect.ceradonsystems.com/?access_code=ARC-STACK-761',
        'https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761'
      ]
    }
  }
];

const routes = ['home', 'workflow', 'tools', 'mission', 'demos', 'docs'];
const MODULE_STATUS_KEY = 'ceradon_module_statuses';
const moduleStatusOptions = ['Not Started', 'In Progress', 'Complete'];
let highlightedTools = [];
let moduleStatuses = {};
let activeModuleId = workflowModules[0].id;
let projectStatusMessage = '';

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

  const sustainmentGap = sustainment - duration;
  let sustainmentStatus = 'alert';
  if (sustainmentGap >= 0) {
    sustainmentStatus = 'good';
  } else if (sustainmentGap >= -6) {
    sustainmentStatus = 'warning';
  }

  const loadMargin = loadLimit - perPersonLoad;
  let loadStatus = 'alert';
  if (loadMargin >= 0) {
    loadStatus = 'good';
  } else if (loadMargin >= -2) {
    loadStatus = 'warning';
  }

  const relayMargin = relayCount - criticalLinks;
  let relayStatus = 'alert';
  if (relayMargin >= 0) {
    relayStatus = 'good';
  } else if (relayMargin === -1) {
    relayStatus = 'warning';
  }

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
      title: 'Relays vs critical links',
      label: `${relayCount} relays vs ${criticalLinks} critical links`,
      detail: relayMargin >= 0 ? 'Relays match or exceed critical links.' : 'Add redundancy to avoid single points of failure.',
      status: relayStatus
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

function setProjectAlert(message, tone = 'info') {
  const alertBox = document.getElementById('projectAlert');
  if (!alertBox) return;
  alertBox.textContent = message || '';
  alertBox.className = `project-alert ${tone}`;
  alertBox.hidden = !message;
}

function hydrateProjectForm() {
  const project = MissionProjectStore.loadMissionProject();
  setProjectAlert('', 'info');
  MissionProjectStore.saveMissionProject(project);
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
  renderProjectStatus();
}

function bindProjectForm() {
  const form = document.getElementById('projectMetaForm');
  if (!form) return;
  form.addEventListener('input', syncProjectFromForm);
  form.addEventListener('change', syncProjectFromForm);
}

function bindProjectActions() {
  const exportBtn = document.getElementById('exportProject');
  const importBtn = document.getElementById('importProject');
  const importFile = document.getElementById('importProjectFile');
  const demoBtn = document.getElementById('loadWhitefrostDemo');
  const exportGeoBtn = document.getElementById('exportGeo');
  const exportCoTBtn = document.getElementById('exportCoT');

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

  importBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    importFile?.click();
  });

  importFile?.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    MissionProjectStore.importMissionProject(file)
      .then(() => {
        projectStatusMessage = `Imported project from ${file.name}`;
        setProjectAlert('MissionProject imported successfully.', 'success');
        hydrateProjectForm();
      })
      .catch(() => {
        setProjectAlert('Unable to import project JSON. Please verify the MissionProject schema.', 'alert');
      })
      .finally(() => {
        importFile.value = '';
        renderProjectStatus();
      });
  });

  demoBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    demoBtn.disabled = true;
    demoBtn.textContent = 'Loading WHITEFROST…';

    try {
      const response = await fetch('data/whitefrost_demo_project.json');
      if (!response.ok) {
        throw new Error('Unable to fetch demo project');
      }
      const payload = await response.json();
      if (!MissionProjectStore.validateMissionProject(payload)) {
        throw new Error('Invalid demo project payload');
      }
      MissionProjectStore.saveMissionProject(payload);
      projectStatusMessage = payload.meta?.name ? `${payload.meta.name} loaded.` : 'Demo project loaded.';
      setProjectAlert('WHITEFROST demo loaded. Exports now match the shared schema.', 'success');
      hydrateProjectForm();
    } catch (error) {
      console.error(error);
      setProjectAlert('Unable to load the WHITEFROST demo project. Please try again.', 'alert');
    } finally {
      demoBtn.disabled = false;
      demoBtn.textContent = 'Load WHITEFROST Demo';
      renderProjectStatus();
    }
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

function initWhitefrostMode() {
  const toggle = document.getElementById('whitefrostToggle');
  const panel = document.getElementById('whitefrostPanel');
  if (!toggle || !panel) return;

  const stored = localStorage.getItem('ceradon-whitefrost-mode') === 'true';
  if (stored) {
    panel.hidden = false;
    toggle.classList.add('active');
    toggle.textContent = 'WHITEFROST Demo Mode On';
  }

  toggle.addEventListener('click', () => {
    const nextState = panel.hidden;
    panel.hidden = !panel.hidden;
    toggle.classList.toggle('active', nextState);
    toggle.textContent = nextState ? 'WHITEFROST Demo Mode On' : 'Enable WHITEFROST Demo Mode';
    localStorage.setItem('ceradon-whitefrost-mode', nextState);
  });
}

function initApp() {
  buildTools();
  buildDemos();
  initWorkflowDashboard();
  initThemeToggle();
  initWhitefrostMode();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
}

document.addEventListener('DOMContentLoaded', initApp);
