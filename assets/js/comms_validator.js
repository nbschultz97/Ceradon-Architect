/**
 * Comms Validator - Link Budget Calculator
 * RF link quality analysis and relay node placement for contested environments
 * Validates communications architecture for mission plans
 */

const CommsValidator = (() => {
  const STORAGE_KEY = 'cots_comms_analyses';

  // Speed of light (m/s)
  const SPEED_OF_LIGHT = 299792458;

  // Earth radius for line-of-sight calculations (meters)
  const EARTH_RADIUS = 6371000;

  // Minimum link margin for reliable communications (dB)
  const MIN_LINK_MARGIN = 10;

  // Terrain types and their signal attenuation characteristics
  const TERRAIN_ATTENUATION = {
    'open': { attenuation_db: 0, description: 'Open terrain, minimal obstruction' },
    'rural': { attenuation_db: 3, description: 'Rural, light vegetation' },
    'suburban': { attenuation_db: 6, description: 'Suburban, moderate buildings' },
    'urban': { attenuation_db: 12, description: 'Urban, dense buildings' },
    'dense_urban': { attenuation_db: 20, description: 'Dense urban canyon' },
    'forest': { attenuation_db: 8, description: 'Forest, heavy vegetation' },
    'mountain': { attenuation_db: 5, description: 'Mountain, line-of-sight dependent' }
  };

  // Weather effects on RF propagation
  const WEATHER_ATTENUATION = {
    'clear': 0,
    'light_rain': 1,
    'heavy_rain': 3,
    'snow': 2,
    'fog': 1
  };

  /**
   * Create empty comms analysis
   */
  const createEmptyAnalysis = () => ({
    id: `comms-${Date.now()}`,
    name: 'Untitled Comms Analysis',
    description: '',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    terrain: 'rural',
    weather: 'clear',
    nodes: [],
    links: [],
    relay_recommendations: [],
    coverage_gaps: [],
    feasibility: {
      pass: false,
      warnings: [],
      errors: []
    }
  });

  /**
   * Add a node (transmitter/receiver/relay)
   */
  const addNode = (analysis, node) => {
    if (!node.id) {
      node.id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const newNode = {
      id: node.id,
      name: node.name || 'Unnamed Node',
      type: node.type || 'transceiver', // 'transmitter', 'receiver', 'transceiver', 'relay'
      location: {
        lat: node.location?.lat || 0,
        lon: node.location?.lon || 0,
        elevation_m: node.location?.elevation_m || 0,
        height_agl_m: node.location?.height_agl_m || 2 // Height above ground level
      },
      radio: {
        frequency_mhz: node.radio?.frequency_mhz || 900,
        power_output_dbm: node.radio?.power_output_dbm || 20,
        tx_gain_dbi: node.radio?.tx_gain_dbi || 2,
        rx_gain_dbi: node.radio?.rx_gain_dbi || 2,
        sensitivity_dbm: node.radio?.sensitivity_dbm || -110,
        tx_cable_loss_db: node.radio?.tx_cable_loss_db || 1,
        rx_cable_loss_db: node.radio?.rx_cable_loss_db || 1
      },
      notes: node.notes || ''
    };

    analysis.nodes.push(newNode);
    analysis.modified = new Date().toISOString();

    return analysis;
  };

  /**
   * Calculate distance between two geographic points (Haversine formula)
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS * c;

    return distance; // meters
  };

  /**
   * Calculate Free-Space Path Loss (FSPL)
   * FSPL (dB) = 20 * log10(distance_km) + 20 * log10(frequency_MHz) + 32.45
   */
  const calculateFSPL = (distance_m, frequency_mhz) => {
    const distance_km = distance_m / 1000;
    const fspl = 20 * Math.log10(distance_km) + 20 * Math.log10(frequency_mhz) + 32.45;
    return fspl;
  };

  /**
   * Check line-of-sight clearance between two points
   * Accounts for Earth curvature
   */
  const checkLineOfSight = (node1, node2, distance_m) => {
    // Calculate radio horizon for each node
    const horizon1 = Math.sqrt(2 * EARTH_RADIUS * node1.location.height_agl_m);
    const horizon2 = Math.sqrt(2 * EARTH_RADIUS * node2.location.height_agl_m);

    const totalHorizon = horizon1 + horizon2;

    // Check if distance exceeds radio horizon
    const los_clear = distance_m <= totalHorizon;

    // Calculate required relay height if LOS is blocked
    let required_relay_height = 0;
    if (!los_clear) {
      // Simplified calculation for relay height needed at midpoint
      const midpoint_distance = distance_m / 2;
      required_relay_height = Math.pow(midpoint_distance, 2) / (2 * EARTH_RADIUS);
    }

    return {
      clear: los_clear,
      horizon_m: totalHorizon,
      required_relay_height_m: required_relay_height
    };
  };

  /**
   * Calculate Fresnel zone radius at midpoint
   * First Fresnel zone must be at least 60% clear for good signal
   */
  const calculateFresnelZone = (distance_m, frequency_mhz) => {
    const wavelength = SPEED_OF_LIGHT / (frequency_mhz * 1e6);
    const d1 = distance_m / 2;
    const d2 = distance_m / 2;

    // Fresnel radius (meters) = √(n * λ * d1 * d2 / (d1 + d2))
    const fresnelRadius = Math.sqrt((wavelength * d1 * d2) / (d1 + d2));

    return {
      radius_m: fresnelRadius,
      clearance_60pct_m: fresnelRadius * 0.6
    };
  };

  /**
   * Calculate link budget between two nodes
   */
  const calculateLinkBudget = (node1, node2, analysis) => {
    // Calculate distance
    const distance_m = calculateDistance(
      node1.location.lat, node1.location.lon,
      node2.location.lat, node2.location.lon
    );

    // Use average frequency if different
    const frequency_mhz = (node1.radio.frequency_mhz + node2.radio.frequency_mhz) / 2;

    // Calculate Free-Space Path Loss
    const fspl_db = calculateFSPL(distance_m, frequency_mhz);

    // Get terrain attenuation
    const terrainAtt = TERRAIN_ATTENUATION[analysis.terrain] || TERRAIN_ATTENUATION['rural'];
    const terrain_loss_db = terrainAtt.attenuation_db;

    // Get weather attenuation
    const weather_loss_db = WEATHER_ATTENUATION[analysis.weather] || 0;

    // Transmit power (dBm)
    const tx_power_dbm = node1.radio.power_output_dbm;

    // Gains and losses
    const tx_gain_dbi = node1.radio.tx_gain_dbi;
    const rx_gain_dbi = node2.radio.rx_gain_dbi;
    const tx_cable_loss_db = node1.radio.tx_cable_loss_db;
    const rx_cable_loss_db = node2.radio.rx_cable_loss_db;

    // Calculate received power
    // P_rx = P_tx + G_tx - L_tx_cable - FSPL - terrain_loss - weather_loss + G_rx - L_rx_cable
    const received_power_dbm =
      tx_power_dbm +
      tx_gain_dbi -
      tx_cable_loss_db -
      fspl_db -
      terrain_loss_db -
      weather_loss_db +
      rx_gain_dbi -
      rx_cable_loss_db;

    // Receiver sensitivity
    const sensitivity_dbm = node2.radio.sensitivity_dbm;

    // Link margin
    const link_margin_db = received_power_dbm - sensitivity_dbm;

    // Check line-of-sight
    const los = checkLineOfSight(node1, node2, distance_m);

    // Calculate Fresnel zone
    const fresnel = calculateFresnelZone(distance_m, frequency_mhz);

    // Determine link quality
    let quality = 'unknown';
    let relay_required = false;

    if (!los.clear) {
      quality = 'no_los';
      relay_required = true;
    } else if (link_margin_db >= MIN_LINK_MARGIN + 10) {
      quality = 'excellent';
    } else if (link_margin_db >= MIN_LINK_MARGIN) {
      quality = 'good';
    } else if (link_margin_db >= 0) {
      quality = 'marginal';
    } else {
      quality = 'poor';
      relay_required = true;
    }

    return {
      from_node: node1.id,
      from_name: node1.name,
      to_node: node2.id,
      to_name: node2.name,
      distance_m: distance_m,
      distance_km: distance_m / 1000,
      frequency_mhz: frequency_mhz,
      tx_power_dbm: tx_power_dbm,
      fspl_db: fspl_db,
      terrain_loss_db: terrain_loss_db,
      weather_loss_db: weather_loss_db,
      received_power_dbm: received_power_dbm,
      sensitivity_dbm: sensitivity_dbm,
      link_margin_db: link_margin_db,
      quality: quality,
      relay_required: relay_required,
      los: los,
      fresnel: fresnel
    };
  };

  /**
   * Analyze all links in the comms plan
   */
  const analyzeLinks = (analysis) => {
    analysis.links = [];
    analysis.coverage_gaps = [];
    analysis.relay_recommendations = [];

    // Calculate links between all nodes
    for (let i = 0; i < analysis.nodes.length; i++) {
      for (let j = i + 1; j < analysis.nodes.length; j++) {
        const link = calculateLinkBudget(analysis.nodes[i], analysis.nodes[j], analysis);

        // Add bidirectional link
        analysis.links.push(link);

        // Check for issues
        if (link.relay_required) {
          analysis.coverage_gaps.push({
            from: link.from_name,
            to: link.to_name,
            reason: link.quality === 'no_los' ? 'No line-of-sight' : 'Insufficient link margin',
            link_margin_db: link.link_margin_db,
            distance_km: link.distance_km
          });

          // Generate relay recommendation
          if (link.quality === 'no_los' && link.los.required_relay_height_m > 0) {
            analysis.relay_recommendations.push({
              type: 'los_relay',
              description: `Place relay between ${link.from_name} and ${link.to_name}`,
              location: 'Midpoint between nodes',
              required_height_m: link.los.required_relay_height_m,
              distance_from_node1_km: link.distance_km / 2
            });
          } else if (link.link_margin_db < MIN_LINK_MARGIN) {
            analysis.relay_recommendations.push({
              type: 'power_relay',
              description: `Add powered relay between ${link.from_name} and ${link.to_name}`,
              location: 'Midpoint or elevated position',
              reason: `Link margin is ${link.link_margin_db.toFixed(1)} dB, need ${MIN_LINK_MARGIN} dB minimum`
            });
          }
        }
      }
    }

    // Update feasibility
    analysis.feasibility.errors = [];
    analysis.feasibility.warnings = [];

    if (analysis.nodes.length < 2) {
      analysis.feasibility.errors.push('Need at least 2 nodes to analyze links');
    }

    if (analysis.coverage_gaps.length > 0) {
      analysis.feasibility.errors.push(
        `${analysis.coverage_gaps.length} link(s) require relays or improved positioning`
      );
    }

    const marginalLinks = analysis.links.filter(l => l.quality === 'marginal');
    if (marginalLinks.length > 0) {
      analysis.feasibility.warnings.push(
        `${marginalLinks.length} link(s) have marginal quality - consider adding redundancy`
      );
    }

    analysis.feasibility.pass = analysis.feasibility.errors.length === 0;
    analysis.modified = new Date().toISOString();

    return analysis;
  };

  /**
   * Recommend optimal relay placement
   */
  const recommendRelayPlacement = (node1, node2, terrain_elevation_m = 0) => {
    // Calculate midpoint
    const midLat = (node1.location.lat + node2.location.lat) / 2;
    const midLon = (node1.location.lon + node2.location.lon) / 2;

    const distance_m = calculateDistance(
      node1.location.lat, node1.location.lon,
      node2.location.lat, node2.location.lon
    );

    // Calculate required height for LOS clearance
    const los = checkLineOfSight(node1, node2, distance_m);

    // Fresnel zone clearance
    const fresnel = calculateFresnelZone(distance_m, node1.radio.frequency_mhz);

    // Recommended relay height = LOS requirement + 60% Fresnel clearance
    const recommended_height_m = los.required_relay_height_m + fresnel.clearance_60pct_m + 5; // +5m safety margin

    return {
      location: {
        lat: midLat,
        lon: midLon,
        elevation_m: terrain_elevation_m,
        height_agl_m: Math.max(recommended_height_m, 10) // Minimum 10m relay height
      },
      reasoning: {
        los_clearance_m: los.required_relay_height_m,
        fresnel_clearance_m: fresnel.clearance_60pct_m,
        total_height_m: recommended_height_m
      }
    };
  };

  /**
   * Suggest radio selection based on mission requirements
   */
  const suggestRadio = (max_distance_km, required_data_rate_kbps, terrain) => {
    const suggestions = [];

    // LoRa - Long range, low data rate
    if (max_distance_km > 20 && required_data_rate_kbps < 50) {
      suggestions.push({
        type: 'LoRa 900MHz',
        range_km: 40,
        data_rate_kbps: 19,
        power_output_dbm: 20,
        pros: ['Excellent range', 'Low power', 'Good penetration'],
        cons: ['Low data rate', 'Telemetry only'],
        use_case: 'MAVLink telemetry, long-range control'
      });
    }

    // 2.4GHz - Medium range, high data rate
    if (max_distance_km <= 30 && required_data_rate_kbps < 1000) {
      suggestions.push({
        type: 'ExpressLRS 2.4GHz',
        range_km: 30,
        data_rate_kbps: 250,
        power_output_dbm: 20,
        pros: ['Good range', 'Low latency', 'Reliable'],
        cons: ['Line-of-sight dependent', 'Moderate penetration'],
        use_case: 'UxS control, telemetry'
      });
    }

    // 5.8GHz - Short range, very high data rate
    if (max_distance_km <= 5 && required_data_rate_kbps >= 1000) {
      suggestions.push({
        type: '5.8GHz Video',
        range_km: 3,
        data_rate_kbps: 10000,
        power_output_dbm: 23,
        pros: ['High bandwidth', 'Video capable'],
        cons: ['Short range', 'Poor penetration', 'Line-of-sight only'],
        use_case: 'FPV video, high-bandwidth sensors'
      });
    }

    // Wi-Fi Mesh - Medium range, high data rate
    if (terrain === 'urban' || terrain === 'suburban') {
      suggestions.push({
        type: 'Wi-Fi Mesh 2.4/5GHz',
        range_km: 5,
        data_rate_kbps: 54000,
        power_output_dbm: 20,
        pros: ['High bandwidth', 'Mesh capable', 'Standard protocols'],
        cons: ['Contested spectrum', 'Moderate range'],
        use_case: 'Mesh backbone, relay nodes'
      });
    }

    return suggestions;
  };

  /**
   * Load all saved analyses
   */
  const loadAnalyses = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) || [];
    } catch (error) {
      console.error('Failed to load comms analyses:', error);
      return [];
    }
  };

  /**
   * Save analyses
   */
  const saveAnalyses = (analyses) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
  };

  /**
   * Save a single analysis
   */
  const saveAnalysis = (analysis) => {
    const analyses = loadAnalyses();
    analysis.modified = new Date().toISOString();

    const index = analyses.findIndex(a => a.id === analysis.id);
    const isNew = index < 0;

    if (index >= 0) {
      analyses[index] = analysis;
    } else {
      analyses.push(analysis);
    }

    saveAnalyses(analyses);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.COMMS_ANALYSIS_UPDATED, {
        analysis: analysis,
        isNew: isNew,
        allAnalyses: analyses
      });
    }

    return analysis;
  };

  /**
   * Get a single analysis
   */
  const getAnalysis = (id) => {
    const analyses = loadAnalyses();
    return analyses.find(a => a.id === id) || null;
  };

  /**
   * Delete an analysis
   */
  const deleteAnalysis = (id) => {
    const analyses = loadAnalyses();
    const filtered = analyses.filter(a => a.id !== id);
    saveAnalyses(filtered);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.COMMS_ANALYSIS_DELETED, {
        analysisId: id,
        allAnalyses: filtered
      });
    }

    return true;
  };

  /**
   * Download analysis report
   */
  const downloadReport = (analysis, fileName = null) => {
    const lines = [];

    lines.push('COMMUNICATIONS ANALYSIS REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Analysis: ${analysis.name}`);
    lines.push(`Terrain: ${analysis.terrain}`);
    lines.push(`Weather: ${analysis.weather}`);
    lines.push(`Nodes: ${analysis.nodes.length}`);
    lines.push(`Links Analyzed: ${analysis.links.length}`);
    lines.push('');

    lines.push('NODES:');
    analysis.nodes.forEach((node, idx) => {
      lines.push(`  ${idx + 1}. ${node.name} (${node.type})`);
      lines.push(`     Frequency: ${node.radio.frequency_mhz} MHz`);
      lines.push(`     TX Power: ${node.radio.power_output_dbm} dBm`);
      lines.push(`     Location: ${node.location.lat.toFixed(5)}, ${node.location.lon.toFixed(5)}`);
    });
    lines.push('');

    lines.push('LINK ANALYSIS:');
    analysis.links.forEach((link, idx) => {
      lines.push(`  ${idx + 1}. ${link.from_name} → ${link.to_name}`);
      lines.push(`     Distance: ${link.distance_km.toFixed(2)} km`);
      lines.push(`     Link Margin: ${link.link_margin_db.toFixed(1)} dB`);
      lines.push(`     Quality: ${link.quality.toUpperCase()}`);
      lines.push(`     LOS Clear: ${link.los.clear ? 'YES' : 'NO'}`);
      if (link.relay_required) {
        lines.push(`     ⚠ RELAY REQUIRED`);
      }
    });
    lines.push('');

    if (analysis.coverage_gaps.length > 0) {
      lines.push('COVERAGE GAPS:');
      analysis.coverage_gaps.forEach((gap, idx) => {
        lines.push(`  ${idx + 1}. ${gap.from} → ${gap.to}`);
        lines.push(`     Reason: ${gap.reason}`);
        lines.push(`     Link Margin: ${gap.link_margin_db.toFixed(1)} dB`);
      });
      lines.push('');
    }

    if (analysis.relay_recommendations.length > 0) {
      lines.push('RELAY RECOMMENDATIONS:');
      analysis.relay_recommendations.forEach((rec, idx) => {
        lines.push(`  ${idx + 1}. ${rec.description}`);
        lines.push(`     Location: ${rec.location}`);
        if (rec.required_height_m) {
          lines.push(`     Required Height: ${rec.required_height_m.toFixed(1)} m`);
        }
        if (rec.reason) {
          lines.push(`     Reason: ${rec.reason}`);
        }
      });
      lines.push('');
    }

    lines.push('FEASIBILITY:');
    lines.push(`  Status: ${analysis.feasibility.pass ? 'PASS' : 'FAIL'}`);
    if (analysis.feasibility.errors.length > 0) {
      lines.push('  Errors:');
      analysis.feasibility.errors.forEach(err => lines.push(`    - ${err}`));
    }
    if (analysis.feasibility.warnings.length > 0) {
      lines.push('  Warnings:');
      analysis.feasibility.warnings.forEach(warn => lines.push(`    - ${warn}`));
    }

    const report = lines.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${analysis.name.replace(/\s+/g, '_')}_comms_report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Auto-update comms analyses when platform designs change (RF bands)
   */
  const initPlatformDesignListener = () => {
    if (typeof MissionProjectEvents === 'undefined') return;

    MissionProjectEvents.on(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_UPDATED, (detail) => {
      // Platform radio changes could affect comms analysis
      // Log for now - future enhancement: auto-sync platform radios to comms nodes
      console.log(`[CommsValidator] Platform design updated: ${detail.design.name}`);
      console.log(`[CommsValidator] Consider updating comms nodes if platform radios changed`);
    });
  };

  // Initialize listeners on load
  if (typeof window !== 'undefined') {
    setTimeout(initPlatformDesignListener, 100); // Wait for MissionProjectEvents to load
  }

  // Public API
  return {
    MIN_LINK_MARGIN,
    TERRAIN_ATTENUATION,
    WEATHER_ATTENUATION,
    createEmptyAnalysis,
    addNode,
    calculateDistance,
    calculateFSPL,
    checkLineOfSight,
    calculateFresnelZone,
    calculateLinkBudget,
    analyzeLinks,
    recommendRelayPlacement,
    suggestRadio,
    loadAnalyses,
    saveAnalysis,
    getAnalysis,
    deleteAnalysis,
    downloadReport,
    initPlatformDesignListener
  };
})();

// Export for browser global scope
window.CommsValidator = CommsValidator;
