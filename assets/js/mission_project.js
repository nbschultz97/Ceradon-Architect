// MissionProject schema and persistence helpers
// Keeps mission state consistent across Ceradon Architect tools.

const MISSION_PROJECT_SCHEMA_VERSION = 1;

const MissionProjectStore = (() => {
  const STORAGE_KEY = 'ceradon_mission_project';

  const createEmptyMissionProject = () => ({
    schemaVersion: MISSION_PROJECT_SCHEMA_VERSION,
    meta: {
      name: 'Untitled mission',
      description: '',
      durationHours: 48,
      environment: {
        altitudeBand: '0-1000m',
        temperatureBand: '10-25C'
      },
      inventoryReference: 'Pending catalog reference'
    },
    nodes: [],
    platforms: [],
    meshPlan: {
      nodes: [],
      links: [],
      relayCount: 0,
      criticalLinks: 0,
      geodata: {
        locations: [],
        area: null
      }
    },
    mission: {
      tasks: [],
      phases: [],
      assignments: []
    },
    kits: {
      packages: [],
      perOperatorLoads: [],
      perOperatorLoadKg: 18,
      perOperatorLimitKg: 22
    },
    sustainment: {
      sustainmentHours: 48,
      batteryCounts: 0,
      feasibility: {},
      notes: ''
    }
  });

  const mergeWithDefaults = (project) => {
    const defaults = createEmptyMissionProject();
    return {
      ...defaults,
      ...project,
      schemaVersion: project?.schemaVersion ?? defaults.schemaVersion,
      meta: {
        ...defaults.meta,
        ...(project?.meta || {}),
        environment: {
          ...defaults.meta.environment,
          ...(project?.meta?.environment || {})
        }
      },
      meshPlan: {
        ...defaults.meshPlan,
        ...(project?.meshPlan || {}),
        geodata: {
          ...defaults.meshPlan.geodata,
          ...(project?.meshPlan?.geodata || {})
        }
      },
      mission: {
        ...defaults.mission,
        ...(project?.mission || {})
      },
      kits: {
        ...defaults.kits,
        ...(project?.kits || {})
      },
      sustainment: {
        ...defaults.sustainment,
        ...(project?.sustainment || {})
      }
    };
  };

  const normalizeLegacyProject = (project) => {
    if (!project || typeof project !== 'object') return project;

    const normalized = { ...project };

    if (!normalized.meta && project.missionMeta) {
      normalized.meta = {
        name: project.missionMeta.name,
        durationHours: project.missionMeta.durationHours,
        environment: project.missionMeta.environment,
        inventoryReference: project.inventoryCatalog?.reference
      };
    }

    if (!normalized.kits && project.kitPlans) {
      normalized.kits = {
        packages: project.kitPlans.kits,
        perOperatorLoadKg: project.kitPlans.perPersonLoadWeight,
        perOperatorLimitKg: project.kitPlans.weightLimit
      };
    }

    if (!normalized.nodes && project.nodeDesigns) {
      normalized.nodes = project.nodeDesigns;
    }

    if (!normalized.platforms && project.uxsDesigns) {
      normalized.platforms = project.uxsDesigns;
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
    if (!project.meshPlan || !project.kits || !project.mission) return false;
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
    importMissionProject,
    importMissionProjectFromText
  };
})();

// Export globals for non-module environments
window.MISSION_PROJECT_SCHEMA_VERSION = MISSION_PROJECT_SCHEMA_VERSION;
window.MissionProjectStore = MissionProjectStore;
