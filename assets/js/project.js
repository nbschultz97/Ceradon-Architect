// Shared mission project helpers for Ceradon Architect Stack
// Exposes a stable MissionProject schema and localStorage persistence so sibling tools can adopt the same contract.

const MissionProjectStore = (() => {
  const STORAGE_KEY = 'ceradon_mission_project';

  const defaultProject = {
    missionMeta: {
      name: 'Untitled mission',
      environment: {
        altitudeBand: '0-1000m',
        temperatureBand: '10-25C'
      },
      durationHours: 24
    },
    inventoryCatalog: {
      reference: 'Pending catalog reference',
      parts: []
    },
    nodeDesigns: [],
    uxsDesigns: [],
    meshPlan: {
      nodes: [],
      links: [],
      relayCount: 0,
      criticalLinks: 0,
      losSummary: []
    },
    kitPlans: {
      kits: [],
      perPersonLoadWeight: 18,
      weightLimit: 22,
      sustainmentHours: 24,
      batteryCounts: 0
    }
  };

  const cloneDefault = () => JSON.parse(JSON.stringify(defaultProject));

  const loadMissionProject = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefault();
    try {
      const parsed = JSON.parse(raw);
      return { ...cloneDefault(), ...parsed, missionMeta: { ...cloneDefault().missionMeta, ...parsed.missionMeta, environment: { ...cloneDefault().missionMeta.environment, ...(parsed.missionMeta?.environment || {}) } }, inventoryCatalog: { ...cloneDefault().inventoryCatalog, ...parsed.inventoryCatalog }, meshPlan: { ...cloneDefault().meshPlan, ...parsed.meshPlan }, kitPlans: { ...cloneDefault().kitPlans, ...parsed.kitPlans } };
    } catch (error) {
      console.warn('Failed to parse mission project, resetting to default', error);
      return cloneDefault();
    }
  };

  const saveMissionProject = (updatedProject) => {
    const toPersist = { ...cloneDefault(), ...updatedProject };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    return toPersist;
  };

  const updateMissionMeta = (partialMeta) => {
    const project = loadMissionProject();
    const merged = {
      ...project,
      missionMeta: {
        ...project.missionMeta,
        ...partialMeta,
        environment: {
          ...project.missionMeta.environment,
          ...(partialMeta.environment || {})
        }
      }
    };
    return saveMissionProject(merged);
  };

  const exportMissionProject = (fileName = 'ceradon_mission_project.json') => {
    const project = loadMissionProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importMissionProject = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result || '{}');
        const saved = saveMissionProject(parsed);
        resolve(saved);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

  return {
    defaultProject,
    cloneDefault,
    loadMissionProject,
    saveMissionProject,
    updateMissionMeta,
    exportMissionProject,
    importMissionProject,
    STORAGE_KEY
  };
})();
