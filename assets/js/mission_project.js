// MissionProject schema and persistence helpers
// Keeps mission state consistent across Ceradon Architect tools.
// Downstream tool responsibilities:
// - Node Architect: populates nodes[], RF/power envelopes, environment + constraint hints.
// - UxS Architect: populates platforms[], platform metrics, sortie timing, and lift/payload checks.
// - Mesh Architect: populates mesh_links[], rf_bands, and EW context for coverage planning.
// - KitSmith: populates kits[], sustainment, power_plan, packing_lists, and load summaries.
// - Mission Architect: owns mission, phases, assignments, mission_cards, and final exports.

const MISSION_PROJECT_SCHEMA_VERSION = '2.0.0';

const MissionProjectStore = (() => {
  const STORAGE_KEY = 'ceradon_mission_project';
  const UPDATED_AT_KEY = 'ceradon_mission_project_updated_at';

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
      accessCode: '',
      team: { size: 0, roles: [] }
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
    constraints: [],
    nodes: [],
    platforms: [],
    mesh_links: [],
    kits: [],
    mission: {
      tasks: [],
      phases: [],
      assignments: [],
      mission_cards: []
    },
    sustainment: {
      sustainmentHours: 48,
      batteryCounts: 0,
      feasibility: {},
      notes: '',
      power_plan: '',
      packing_lists: []
    },
    meshPlan: {
      relayCount: 0,
      criticalLinks: 0,
      rf_bands: [],
      ew_profile: ''
    },
    kitsSummary: {
      perOperatorLoads: [],
      perOperatorLoadKg: 18,
      perOperatorLimitKg: 22
    },
    exports: {
      links: [],
      notes: ''
    }
  });

  const ensureArray = (value) => (Array.isArray(value) ? value : []);

  const hasMissionProject = () => Boolean(localStorage.getItem(STORAGE_KEY));

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
      schemaVersion: String(project?.schemaVersion ?? defaults.schemaVersion),
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
    if (!project.environment || !Array.isArray(project.environment)) return false;
    return true;
  };

  let schemaCache = null;

  const fetchMissionProjectSchema = async () => {
    if (schemaCache) return schemaCache;
    const response = await fetch('schema/mission_project_schema_v2.json');
    if (!response.ok) {
      throw new Error('Unable to load MissionProject schema');
    }
    schemaCache = await response.json();
    return schemaCache;
  };

  const validateAgainstSchema = (value, schema, path = 'root') => {
    const errors = [];
    if (!schema) return errors;

    if (schema.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push(`${path} should be an object`);
        return errors;
      }

      const required = schema.required || [];
      required.forEach((key) => {
        if (value[key] === undefined) {
          errors.push(`${path}.${key} is required`);
        }
      });

      const properties = schema.properties || {};
      Object.entries(properties).forEach(([key, propertySchema]) => {
        if (value[key] === undefined) return;
        errors.push(...validateAgainstSchema(value[key], propertySchema, `${path}.${key}`));
      });
      return errors;
    }

    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${path} should be an array`);
        return errors;
      }
      const itemSchema = schema.items;
      if (itemSchema) {
        value.forEach((item, index) => {
          errors.push(...validateAgainstSchema(item, itemSchema, `${path}[${index}]`));
        });
      }
      return errors;
    }

    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`${path} should be a string`);
    }
    if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`${path} should be a number`);
    }
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${path} should be a boolean`);
    }
    return errors;
  };

  const validateMissionProjectDetailed = async (project) => {
    try {
      const schema = await fetchMissionProjectSchema();
      const errors = validateAgainstSchema(project, schema);
      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { valid: false, errors: ['Unable to load schema for validation', error.message] };
    }
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
    merged.schemaVersion = String(project?.schemaVersion || MISSION_PROJECT_SCHEMA_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
    return merged;
  };

  const clearMissionProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(UPDATED_AT_KEY);
    return createEmptyMissionProject();
  };

  const getLastUpdated = () => localStorage.getItem(UPDATED_AT_KEY);

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
      schemaVersion: String(normalized?.schemaVersion ?? MISSION_PROJECT_SCHEMA_VERSION),
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

  /**
   * Generate Spot Report from mission project
   * Standard format used for immediate tactical reporting
   */
  const generateSpotReport = (project) => {
    const now = new Date();
    const dtg = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

    // Extract location from first node or platform with coordinates
    let location = 'PENDING COORDINATES';
    const firstNode = ensureArray(project.nodes).find(n => n.geo?.lat && n.geo?.lon);
    const firstPlatform = ensureArray(project.platforms).find(p => p.geo?.lat && p.geo?.lon);
    const geoEntity = firstNode || firstPlatform;

    if (geoEntity) {
      const lat = geoEntity.geo.lat.toFixed(6);
      const lon = geoEntity.geo.lon.toFixed(6);
      location = `${lat}N ${lon}E`;
    }

    const report = {
      type: 'SPOT_REPORT',
      dtg: dtg,
      mission_name: project.meta?.name || 'UNTITLED MISSION',
      line1_size: `${ensureArray(project.platforms).length} UxS platforms, ${ensureArray(project.nodes).length} ground nodes`,
      line2_activity: project.mission?.tasks?.map(t => t.name).join('; ') || 'Mission planning in progress',
      line3_location: location,
      line4_unit: project.meta?.team?.size ? `${project.meta.team.size}-person team` : 'Team size TBD',
      line5_time: `Mission duration: ${project.meta?.durationHours || 0} hours`,
      line6_equipment: [
        ...ensureArray(project.platforms).map(p => `${p.name} (${p.type})`),
        ...ensureArray(project.nodes).filter(n => n.role === 'relay').map(n => n.name)
      ].join(', ') || 'Equipment list pending',
      narrative: `Planning ${project.meta?.scenario || 'mission'} with ${ensureArray(project.platforms).length} platforms across ${project.mission?.phases?.length || 0} phases.`,
      reported_by: 'CERADON_ARCHITECT'
    };

    return report;
  };

  /**
   * Export Spot Report as text file
   */
  const exportSpotReport = (fileName = 'spot_report.txt') => {
    const project = loadMissionProject();
    const report = generateSpotReport(project);

    const lines = [
      '='.repeat(60),
      'SPOT REPORT',
      '='.repeat(60),
      '',
      `DTG: ${report.dtg}`,
      `MISSION: ${report.mission_name}`,
      '',
      `LINE 1 - SIZE: ${report.line1_size}`,
      `LINE 2 - ACTIVITY: ${report.line2_activity}`,
      `LINE 3 - LOCATION: ${report.line3_location}`,
      `LINE 4 - UNIT: ${report.line4_unit}`,
      `LINE 5 - TIME: ${report.line5_time}`,
      `LINE 6 - EQUIPMENT: ${report.line6_equipment}`,
      '',
      'NARRATIVE:',
      report.narrative,
      '',
      `REPORTED BY: ${report.reported_by}`,
      '',
      '='.repeat(60)
    ];

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    return report;
  };

  /**
   * Generate SALUTE Report from mission project
   * Standard format: Size, Activity, Location, Unit, Time, Equipment
   */
  const generateSALUTEReport = (project) => {
    const now = new Date();
    const dtg = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

    // Extract primary operating area
    const env = ensureArray(project.environment)[0] || {};
    let location = 'AREA OF OPERATIONS TBD';
    const firstNode = ensureArray(project.nodes).find(n => n.geo?.lat && n.geo?.lon);
    if (firstNode) {
      location = `${firstNode.geo.lat.toFixed(5)}N ${firstNode.geo.lon.toFixed(5)}E, ALT ${env.elevationM || 0}m`;
    }

    const report = {
      type: 'SALUTE_REPORT',
      dtg: dtg,
      mission_ref: project.meta?.name || 'UNTITLED',
      size: {
        platforms: ensureArray(project.platforms).length,
        nodes: ensureArray(project.nodes).length,
        operators: project.meta?.team?.size || 0,
        description: `${ensureArray(project.platforms).length} UxS, ${ensureArray(project.nodes).length} nodes, ${project.meta?.team?.size || 0} personnel`
      },
      activity: {
        phases: ensureArray(project.mission?.phases).length,
        duration_hours: project.meta?.durationHours || 0,
        tasks: ensureArray(project.mission?.tasks).map(t => t.name),
        description: ensureArray(project.mission?.tasks).map(t => t.name).join(', ') || 'Planning in progress'
      },
      location: {
        primary_ao: location,
        terrain: env.terrain || 'mixed',
        altitude_band: env.altitudeBand || 'TBD',
        temperature_band: env.temperatureBand || 'TBD'
      },
      unit: {
        team_size: project.meta?.team?.size || 0,
        roles: ensureArray(project.meta?.team?.roles),
        description: ensureArray(project.meta?.team?.roles).join(', ') || 'Team composition TBD'
      },
      time: {
        mission_duration_hours: project.meta?.durationHours || 0,
        phases: ensureArray(project.mission?.phases).map(p => ({
          name: p.name,
          duration_hours: p.durationHours || 0
        })),
        description: `${project.meta?.durationHours || 0}hr operation across ${ensureArray(project.mission?.phases).length} phases`
      },
      equipment: {
        platforms: ensureArray(project.platforms).map(p => ({
          name: p.name,
          type: p.type,
          role: p.role,
          endurance_min: p.enduranceMin
        })),
        rf_systems: [...new Set(ensureArray(project.platforms).flatMap(p => p.rf_bands || []))],
        kits: ensureArray(project.kits).map(k => k.name),
        description: ensureArray(project.platforms).map(p => `${p.name} (${p.type})`).join(', ')
      },
      narrative: `Mission: ${project.meta?.scenario || project.meta?.description || 'TBD'}. Planning ${ensureArray(project.platforms).length} UxS platforms with ${project.meta?.team?.size || 0} operators for ${project.meta?.durationHours || 0}-hour operation.`,
      reported_by: 'CERADON_ARCHITECT'
    };

    return report;
  };

  /**
   * Export SALUTE Report as text file
   */
  const exportSALUTEReport = (fileName = 'salute_report.txt') => {
    const project = loadMissionProject();
    const report = generateSALUTEReport(project);

    const lines = [
      '='.repeat(70),
      'SALUTE REPORT',
      '='.repeat(70),
      '',
      `DTG: ${report.dtg}`,
      `MISSION REF: ${report.mission_ref}`,
      '',
      'S - SIZE:',
      `  ${report.size.description}`,
      `  Platforms: ${report.size.platforms}`,
      `  Ground Nodes: ${report.size.nodes}`,
      `  Operators: ${report.size.operators}`,
      '',
      'A - ACTIVITY:',
      `  ${report.activity.description}`,
      `  Duration: ${report.activity.duration_hours} hours`,
      `  Phases: ${report.activity.phases}`,
      '',
      'L - LOCATION:',
      `  AO: ${report.location.primary_ao}`,
      `  Terrain: ${report.location.terrain}`,
      `  Altitude: ${report.location.altitude_band}`,
      `  Temperature: ${report.location.temperature_band}`,
      '',
      'U - UNIT:',
      `  Team Size: ${report.unit.team_size}`,
      `  Composition: ${report.unit.description}`,
      '',
      'T - TIME:',
      `  ${report.time.description}`,
      report.time.phases.map(p => `  - ${p.name}: ${p.duration_hours}hrs`).join('\n'),
      '',
      'E - EQUIPMENT:',
      `  ${report.equipment.description}`,
      `  RF Bands: ${report.equipment.rf_systems.join(', ') || 'TBD'}`,
      `  Kits: ${report.equipment.kits.join(', ') || 'None'}`,
      '',
      'NARRATIVE:',
      report.narrative,
      '',
      `REPORTED BY: ${report.reported_by}`,
      '',
      '='.repeat(70)
    ];

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    return report;
  };

  /**
   * Generate 16-Line Incident Report template from mission project
   * Standard military incident/MEDEVAC report format
   */
  const generate16LineReport = (project) => {
    const now = new Date();
    const dtg = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

    // Extract location from project
    let location = 'GRID PENDING';
    const firstNode = ensureArray(project.nodes).find(n => n.geo?.lat && n.geo?.lon);
    if (firstNode) {
      location = `${firstNode.geo.lat.toFixed(5)}N ${firstNode.geo.lon.toFixed(5)}E`;
    }

    const report = {
      type: '16_LINE_REPORT',
      dtg: dtg,
      mission_ref: project.meta?.name || 'UNTITLED',
      line1_location: location,
      line2_callsign: project.meta?.name?.replace(/\s+/g, '_').toUpperCase() || 'MISSION_CALLSIGN',
      line3_precedence: 'ROUTINE',
      line4_special_equipment: ensureArray(project.platforms).map(p => p.name).join(', ') || 'NONE',
      line5_patients: '0 (TEMPLATE - UPDATE AS NEEDED)',
      line6_security: 'GREEN (Area secure)',
      line7_marking: 'TO BE DETERMINED',
      line8_nationality: 'FRIENDLY',
      line9_terrain: (ensureArray(project.environment)[0]?.terrain || 'MIXED').toUpperCase(),
      line10_obstacles: 'NONE KNOWN',
      line11_weather: (ensureArray(project.environment)[0]?.weather || 'CLEAR').toUpperCase(),
      line12_temp: ensureArray(project.environment)[0]?.temperatureBand || 'TBD',
      line13_winds: 'UNKNOWN',
      line14_hoist: 'NOT REQUIRED',
      line15_crew: 'NONE',
      line16_ventilation: 'N/A',
      notes: 'This is a TEMPLATE generated from mission planning data. Update fields 5-16 based on actual situation.',
      reported_by: 'CERADON_ARCHITECT'
    };

    return report;
  };

  /**
   * Generate Mission Cards from mission project (Stub for future enhancement)
   * TODO: Full implementation with icon library, QR codes, and print-optimized layout
   */
  const generateMissionCards = (project) => {
    const cards = [];

    ensureArray(project.mission?.phases).forEach((phase, idx) => {
      cards.push({
        card_number: idx + 1,
        phase_name: phase.name,
        duration_hours: phase.durationHours || 0,
        focus: phase.focus || 'TBD',
        platforms: ensureArray(project.platforms).map(p => ({ name: p.name, type: p.type })),
        simple_instructions: `Phase ${idx + 1}: ${phase.name}. Duration: ${phase.durationHours || 0} hours.`
      });
    });

    return {
      mission_name: project.meta?.name || 'Untitled Mission',
      total_cards: cards.length,
      cards: cards,
      note: 'Full icon library and print-optimized PDF layout coming in future release'
    };
  };

  /**
   * Export Mission Cards as JSON (stub for future print-optimized PDF)
   */
  const exportMissionCards = (fileName = 'mission_cards.json') => {
    const project = loadMissionProject();
    const cards = generateMissionCards(project);

    const json = JSON.stringify(cards, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    return cards;
  };

  /**
   * Export 16-Line Report as text file
   */
  const export16LineReport = (fileName = '16line_report.txt') => {
    const project = loadMissionProject();
    const report = generate16LineReport(project);

    const lines = [
      '='.repeat(70),
      '16-LINE INCIDENT REPORT TEMPLATE',
      '='.repeat(70),
      '',
      `DTG: ${report.dtg}`,
      `MISSION REF: ${report.mission_ref}`,
      '',
      '⚠️  THIS IS A TEMPLATE - UPDATE WITH ACTUAL INCIDENT DATA',
      '',
      `LINE 1 - LOCATION: ${report.line1_location}`,
      `LINE 2 - CALLSIGN/FREQUENCY: ${report.line2_callsign}`,
      `LINE 3 - PRECEDENCE: ${report.line3_precedence}`,
      `LINE 4 - SPECIAL EQUIPMENT: ${report.line4_special_equipment}`,
      `LINE 5 - NUMBER OF PATIENTS: ${report.line5_patients}`,
      `LINE 6 - SECURITY AT SITE: ${report.line6_security}`,
      `LINE 7 - MARKING METHOD: ${report.line7_marking}`,
      `LINE 8 - NATIONALITY: ${report.line8_nationality}`,
      `LINE 9 - TERRAIN DESCRIPTION: ${report.line9_terrain}`,
      `LINE 10 - OBSTACLES: ${report.line10_obstacles}`,
      `LINE 11 - WEATHER: ${report.line11_weather}`,
      `LINE 12 - TEMPERATURE: ${report.line12_temp}`,
      `LINE 13 - WINDS: ${report.line13_winds}`,
      `LINE 14 - HOIST REQUIRED: ${report.line14_hoist}`,
      `LINE 15 - CREW ON SCENE: ${report.line15_crew}`,
      `LINE 16 - VENTILATION REQUIRED: ${report.line16_ventilation}`,
      '',
      'NOTES:',
      report.notes,
      '',
      `GENERATED BY: ${report.reported_by}`,
      '',
      '='.repeat(70)
    ];

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    return report;
  };

  return {
    STORAGE_KEY,
    MISSION_PROJECT_SCHEMA_VERSION,
    createEmptyMissionProject,
    loadMissionProject,
    saveMissionProject,
    clearMissionProject,
    hasMissionProject,
    migrateMissionProjectIfNeeded,
    validateMissionProject,
    validateMissionProjectDetailed,
    fetchMissionProjectSchema,
    exportMissionProject,
    exportGeoJSON,
    exportCoTStub,
    importMissionProject,
    importMissionProjectFromText,
    getLastUpdated,
    UPDATED_AT_KEY,
    // Doctrinal reporting
    generateSpotReport,
    exportSpotReport,
    generateSALUTEReport,
    exportSALUTEReport,
    generate16LineReport,
    export16LineReport,
    // Mission Cards (stub)
    generateMissionCards,
    exportMissionCards
  };
})();

// Export globals for non-module environments
window.MISSION_PROJECT_SCHEMA_VERSION = MISSION_PROJECT_SCHEMA_VERSION;
window.MissionProjectStore = MissionProjectStore;
