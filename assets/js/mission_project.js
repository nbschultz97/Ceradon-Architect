// MissionProject schema and persistence helpers
// Keeps mission state consistent across Ceradon Architect tools.

const MISSION_PROJECT_SCHEMA_VERSION = 2;

const MissionProjectStore = (() => {
  const STORAGE_KEY = 'ceradon_mission_project';

  const createEmptyMissionProject = () => ({
    schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
    projectId: `mission-${Date.now()}`,
    meta: {
      name: 'Untitled mission',
      description: '',
      durationHours: 48,
      origin_tool: 'hub',
      scenario: '',
      inventoryReference: 'Pending catalog reference',
      accessCode: 'ARC-STACK-761'
    },
    environment: [
      {
        id: 'env-main',
        name: 'Baseline AO',
        altitudeBand: '0-1000m',
        temperatureBand: '-10-10C',
        weather: '',
        elevationM: 0,
        terrain: 'mixed',
        origin_tool: 'hub',
        notes: ''
      }
    ],
    nodes: [],
    platforms: [],
    mesh_links: [],
    kits: [],
    mission: {
      tasks: [],
      phases: [],
      assignments: []
    },
    constraints: [],
    sustainment: {
      sustainmentHours: 48,
      batteryCounts: 0,
      feasibility: {},
      notes: ''
    },
    meshPlan: {
      relayCount: 0,
      criticalLinks: 0
    },
    kitsSummary: {
      perOperatorLoads: [],
      perOperatorLoadKg: 18,
      perOperatorLimitKg: 22
    }
  });

  const ensureArray = (value) => (Array.isArray(value) ? value : []);

  const tagOrigin = (collection, fallback = 'hub') => ensureArray(collection).map((item, index) => ({
    ...item,
    id: item?.id || `${fallback}-${index}`,
    origin_tool: item?.origin_tool || fallback
  }));

  const mergeWithDefaults = (project) => {
    const defaults = createEmptyMissionProject();
    const environment = ensureArray(project?.environment);
    const metaEnv = project?.meta?.environment;
    const normalizedEnvironment = environment.length ? environment : metaEnv ? [{
      id: 'env-main',
      name: 'Baseline AO',
      altitudeBand: metaEnv.altitudeBand,
      temperatureBand: metaEnv.temperatureBand,
      origin_tool: 'hub'
    }] : defaults.environment;

    const merged = {
      ...defaults,
      ...project,
      schemaVersion: project?.schemaVersion ?? defaults.schemaVersion,
      meta: {
        ...defaults.meta,
        ...(project?.meta || {}),
        origin_tool: project?.meta?.origin_tool || 'hub'
      },
      environment: normalizedEnvironment.map((env, idx) => ({
        id: env?.id || `env-${idx}`,
        name: env?.name || 'AO condition',
        altitudeBand: env?.altitudeBand || defaults.environment[0].altitudeBand,
        temperatureBand: env?.temperatureBand || defaults.environment[0].temperatureBand,
        weather: env?.weather || '',
        elevationM: env?.elevationM ?? defaults.environment[0].elevationM,
        terrain: env?.terrain || defaults.environment[0].terrain,
        origin_tool: env?.origin_tool || 'hub',
        notes: env?.notes || ''
      })),
      nodes: tagOrigin(project?.nodes, 'node'),
      platforms: tagOrigin(project?.platforms, 'uxs'),
      mesh_links: tagOrigin(project?.mesh_links, 'mesh'),
      kits: tagOrigin(project?.kits, 'kit'),
      constraints: tagOrigin(project?.constraints, 'hub'),
      mission: {
        ...defaults.mission,
        ...(project?.mission || {}),
        tasks: ensureArray(project?.mission?.tasks).map((task, idx) => ({
          ...task,
          id: task?.id || `mission-task-${idx}`,
          origin_tool: task?.origin_tool || 'mission'
        })),
        phases: ensureArray(project?.mission?.phases).map((phase, idx) => ({
          ...phase,
          id: phase?.id || `mission-phase-${idx}`,
          origin_tool: phase?.origin_tool || 'mission'
        })),
        assignments: ensureArray(project?.mission?.assignments).map((assignment, idx) => ({
          ...assignment,
          id: assignment?.id || `mission-assignment-${idx}`,
          origin_tool: assignment?.origin_tool || 'mission'
        }))
      },
      sustainment: {
        ...defaults.sustainment,
        ...(project?.sustainment || {})
      },
      meshPlan: {
        ...defaults.meshPlan,
        ...(project?.meshPlan || {})
      },
      kitsSummary: {
        ...defaults.kitsSummary,
        ...(project?.kitsSummary || {}),
        perOperatorLoads: ensureArray(project?.kitsSummary?.perOperatorLoads || project?.kits?.perOperatorLoads)
      }
    };

    return merged;
  };

  const normalizeLegacyProject = (project) => {
    if (!project || typeof project !== 'object') return project;

    const normalized = { ...project };

    if (!normalized.meta && project.missionMeta) {
      normalized.meta = {
        name: project.missionMeta.name,
        durationHours: project.missionMeta.durationHours,
        inventoryReference: project.inventoryCatalog?.reference,
        origin_tool: 'hub'
      };
    }

    if (!normalized.environment && project.meta?.environment) {
      normalized.environment = [
        {
          id: 'env-main',
          altitudeBand: project.meta.environment.altitudeBand,
          temperatureBand: project.meta.environment.temperatureBand,
          origin_tool: 'hub'
        }
      ];
    }

    if (!normalized.kitsSummary && project.kitPlans) {
      normalized.kitsSummary = {
        perOperatorLoads: project.kitPlans.perOperatorLoads || [],
        perOperatorLoadKg: project.kitPlans.perPersonLoadWeight,
        perOperatorLimitKg: project.kitPlans.weightLimit
      };
    }

    if (!normalized.kits && project.kitPlans?.kits) {
      normalized.kits = project.kitPlans.kits;
    }

    if (!normalized.nodes && project.nodeDesigns) {
      normalized.nodes = project.nodeDesigns;
    }

    if (!normalized.platforms && project.uxsDesigns) {
      normalized.platforms = project.uxsDesigns;
    }

    if (!normalized.mesh_links && project.meshPlan?.links) {
      normalized.mesh_links = project.meshPlan.links.map((link, idx) => ({
        ...link,
        id: link?.id || `mesh-link-${idx}`,
        origin_tool: 'mesh'
      }));
    }

    if (!normalized.sustainment && project.kitPlans) {
      normalized.sustainment = {
        sustainmentHours: project.kitPlans.sustainmentHours,
        batteryCounts: project.kitPlans.batteryCounts
      };
    }

    return normalized;
  };

  const migrateMissionProjectIfNeeded = (project) => {
    // Placeholder: keep hook for future schema changes.
    return project;
  };

  const validateMissionProject = (project) => {
    if (!project || typeof project !== 'object') return false;
    if (!project.meta || !project.meta.name) return false;
    if (!project.mission) return false;
    return true;
  };

  const loadMissionProject = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyMissionProject();

    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeLegacyProject(parsed);
      const withVersion = {
        schemaVersion: normalized?.schemaVersion ?? MISSION_PROJECT_SCHEMA_VERSION,
        ...normalized
      };
      if (!validateMissionProject(withVersion)) {
        return createEmptyMissionProject();
      }
      const migrated = migrateMissionProjectIfNeeded(withVersion);
      return mergeWithDefaults(migrated);
    } catch (error) {
      console.warn('Failed to parse mission project, resetting to default', error);
      return createEmptyMissionProject();
    }
  };

  const saveMissionProject = (project) => {
    const merged = mergeWithDefaults(project);
    merged.schemaVersion = MISSION_PROJECT_SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  };

  const exportMissionProject = (fileName = 'mission_project.json') => {
    const project = loadMissionProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildGeoJSON = (project) => {
    const features = [];
    const nodeLookup = {};

    ensureArray(project.nodes).forEach((node) => {
      if (Number.isFinite(node.geo?.lat) && Number.isFinite(node.geo?.lon)) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [node.geo.lon, node.geo.lat, node.geo.elevationM ?? 0]
          },
          properties: {
            id: node.id,
            name: node.name,
            role: node.role,
            origin_tool: node.origin_tool,
            rf_band: node.rf?.band,
            power: node.power,
            battery: node.battery
          }
        });
        nodeLookup[node.id] = node.geo;
      }
    });

    ensureArray(project.platforms).forEach((platform) => {
      if (Number.isFinite(platform.geo?.lat) && Number.isFinite(platform.geo?.lon)) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [platform.geo.lon, platform.geo.lat, platform.geo.elevationM ?? 0]
          },
          properties: {
            id: platform.id,
            name: platform.name,
            role: platform.role,
            origin_tool: platform.origin_tool,
            rf_bands: platform.rf_bands,
            power: platform.power,
            battery: platform.battery,
            type: platform.type
          }
        });
        nodeLookup[platform.id] = platform.geo;
      }
    });

    ensureArray(project.mesh_links).forEach((link) => {
      const from = nodeLookup[link.from];
      const to = nodeLookup[link.to];
      if (from && to) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [from.lon, from.lat, from.elevationM ?? 0],
              [to.lon, to.lat, to.elevationM ?? 0]
            ]
          },
          properties: {
            id: link.id,
            from: link.from,
            to: link.to,
            band: link.band,
            throughputMbps: link.throughputMbps,
            origin_tool: link.origin_tool,
            role: link.role,
            notes: link.notes
          }
        });
      }
    });

    return {
      type: 'FeatureCollection',
      features
    };
  };

  const buildCoTStub = (project) => {
    const units = [];

    ensureArray(project.nodes).forEach((node) => {
      if (Number.isFinite(node.geo?.lat) && Number.isFinite(node.geo?.lon)) {
        units.push({
          type: 'sensor',
          id: node.id,
          callsign: node.name,
          role: node.role,
          lat: node.geo.lat,
          lon: node.geo.lon,
          hae: node.geo.elevationM ?? 0,
          origin_tool: node.origin_tool
        });
      }
    });

    ensureArray(project.platforms).forEach((platform) => {
      if (Number.isFinite(platform.geo?.lat) && Number.isFinite(platform.geo?.lon)) {
        units.push({
          type: 'platform',
          id: platform.id,
          callsign: platform.name,
          role: platform.role || platform.type,
          lat: platform.geo.lat,
          lon: platform.geo.lon,
          hae: platform.geo.elevationM ?? 0,
          origin_tool: platform.origin_tool
        });
      }
    });

    return {
      type: 'cot-stub',
      schemaVersion: project.schemaVersion,
      mission: project.meta?.name,
      units
    };
  };

  const exportGeoJSON = (fileName = 'mission_project_geo.json') => {
    const project = loadMissionProject();
    const payload = buildGeoJSON(project);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCoTStub = (fileName = 'mission_project_cot.json') => {
    const project = loadMissionProject();
    const payload = buildCoTStub(project);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importMissionProjectFromText = (jsonText) => {
    const parsed = JSON.parse(jsonText || '{}');
    const normalized = normalizeLegacyProject(parsed);
    const withVersion = {
      schemaVersion: normalized?.schemaVersion ?? MISSION_PROJECT_SCHEMA_VERSION,
      ...normalized
    };

    if (!validateMissionProject(withVersion)) {
      throw new Error('Invalid mission project payload');
    }

    return saveMissionProject(withVersion);
  };

  const importMissionProject = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const saved = importMissionProjectFromText(event.target.result);
        resolve(saved);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

  return {
    STORAGE_KEY,
    MISSION_PROJECT_SCHEMA_VERSION,
    createEmptyMissionProject,
    loadMissionProject,
    saveMissionProject,
    migrateMissionProjectIfNeeded,
    validateMissionProject,
    exportMissionProject,
    exportGeoJSON,
    exportCoTStub,
    importMissionProject,
    importMissionProjectFromText
  };
})();

// Export globals for non-module environments
window.MISSION_PROJECT_SCHEMA_VERSION = MISSION_PROJECT_SCHEMA_VERSION;
window.MissionProjectStore = MissionProjectStore;
