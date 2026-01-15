/**
 * SRTM Fallback Elevation Data
 * Provides approximate elevation data for common operational areas when SRTM tiles aren't available
 * This is NOT a replacement for real SRTM data, but provides reasonable estimates
 */

const SRTMFallback = (() => {
  'use strict';

  /**
   * Pre-defined elevation zones for common operational areas
   * Format: [minLat, maxLat, minLon, maxLon, avgElevation_m, terrainType]
   */
  const ELEVATION_ZONES = [
    // CONUS (Continental United States)
    // East Coast lowlands
    [24, 45, -85, -70, 100, 'coastal'],
    // Appalachian Mountains
    [33, 47, -85, -75, 600, 'hills'],
    // Great Plains
    [35, 49, -105, -90, 600, 'plains'],
    // Rocky Mountains
    [31, 49, -115, -100, 2400, 'mountains'],
    // Southwest Desert
    [31, 37, -115, -103, 1200, 'desert'],
    // West Coast
    [32, 49, -125, -115, 300, 'coastal'],

    // Europe
    // UK & Ireland
    [50, 60, -10, 2, 150, 'coastal'],
    // Central Europe Plains
    [48, 55, 5, 25, 200, 'plains'],
    // Alps
    [43, 48, 5, 17, 1800, 'mountains'],
    // Pyrenees
    [42, 43, -2, 3, 1500, 'mountains'],
    // Scandinavian Mountains
    [58, 70, 5, 20, 600, 'mountains'],

    // Middle East
    // Arabian Peninsula lowlands
    [12, 30, 35, 60, 500, 'desert'],
    // Zagros Mountains (Iran/Iraq)
    [30, 38, 44, 50, 1800, 'mountains'],
    // Levant
    [29, 37, 33, 43, 700, 'hills'],
    // Afghanistan/Pakistan mountains
    [29, 38, 60, 75, 2500, 'mountains'],

    // Asia
    // Indian subcontinent plains
    [8, 30, 70, 90, 300, 'plains'],
    // Himalayas
    [27, 36, 72, 95, 3500, 'mountains'],
    // Tibetan Plateau
    [30, 40, 78, 95, 4500, 'plateau'],
    // Southeast Asia lowlands
    [0, 25, 95, 110, 200, 'tropical'],
    // East Asia plains
    [20, 45, 105, 125, 400, 'plains'],
    // Siberia
    [50, 70, 60, 140, 400, 'tundra'],

    // Africa
    // Sahara Desert
    [15, 30, -10, 35, 400, 'desert'],
    // Sub-Saharan Africa plains
    [-10, 15, -15, 50, 800, 'plains'],
    // East African Highlands
    [-5, 5, 30, 42, 1500, 'plateau'],
    // Southern Africa
    [-35, -15, 15, 35, 1000, 'plains'],

    // Americas
    // Amazon Basin
    [-10, 5, -75, -50, 200, 'tropical'],
    // Andes Mountains
    [-50, 10, -78, -65, 3000, 'mountains'],
    // Canadian Shield
    [45, 65, -105, -60, 400, 'tundra'],
    // Central America
    [7, 20, -92, -78, 600, 'tropical'],
    // Caribbean lowlands
    [10, 25, -85, -60, 50, 'coastal'],

    // Australia & Oceania
    // Australian Outback
    [-35, -15, 115, 145, 300, 'desert'],
    // New Zealand mountains
    [-47, -34, 166, 179, 500, 'mountains']
  ];

  /**
   * Get terrain classification for location
   */
  const getTerrainType = (lat, lon) => {
    for (const zone of ELEVATION_ZONES) {
      const [minLat, maxLat, minLon, maxLon, , terrainType] = zone;
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        return terrainType;
      }
    }
    return 'unknown';
  };

  /**
   * Get estimated elevation for location
   * Uses pre-defined zones with some randomization for realism
   */
  const getEstimatedElevation = (lat, lon) => {
    // Check all zones, use most specific match
    let bestMatch = null;
    let bestArea = Infinity;

    for (const zone of ELEVATION_ZONES) {
      const [minLat, maxLat, minLon, maxLon, avgElevation, terrainType] = zone;

      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        const area = (maxLat - minLat) * (maxLon - minLon);
        if (area < bestArea) {
          bestArea = area;
          bestMatch = { avgElevation, terrainType, zone };
        }
      }
    }

    if (!bestMatch) {
      // No match found, use ocean/default
      return isLikelyOcean(lat, lon) ? 0 : 300;
    }

    // Add some variation based on terrain type
    const variation = getTerrainVariation(bestMatch.terrainType);
    const offset = (Math.sin(lat * 100) * Math.cos(lon * 100)) * variation;

    return Math.max(0, Math.round(bestMatch.avgElevation + offset));
  };

  /**
   * Get typical elevation variation for terrain type
   */
  const getTerrainVariation = (terrainType) => {
    switch (terrainType) {
      case 'mountains': return 500;
      case 'hills': return 200;
      case 'plateau': return 300;
      case 'plains': return 50;
      case 'coastal': return 30;
      case 'desert': return 100;
      case 'tropical': return 80;
      case 'tundra': return 40;
      default: return 100;
    }
  };

  /**
   * Check if location is likely ocean
   * Simplified check based on major water bodies
   */
  const isLikelyOcean = (lat, lon) => {
    // Major ocean areas (very rough)
    // Atlantic Ocean
    if (lat > -60 && lat < 70 && lon > -60 && lon < -10) {
      // But not near coasts
      if (!(lat > 24 && lat < 50 && lon > -85 && lon < -70)) return true;
    }

    // Pacific Ocean
    if (lat > -60 && lat < 60 && lon > 140 && lon < -100) return true;
    if (lat > -60 && lat < 60 && lon > -180 && lon < -140) return true;

    // Indian Ocean
    if (lat > -50 && lat < 25 && lon > 40 && lon < 110) {
      // But not near coasts
      if (!(lat > 5 && lat < 30 && lon > 60 && lon < 85)) return true;
    }

    return false;
  };

  /**
   * Get elevation profile for a route (array of [lat, lon] points)
   * Returns array of elevations
   */
  const getRouteProfile = (points) => {
    return points.map(([lat, lon]) => getEstimatedElevation(lat, lon));
  };

  /**
   * Calculate total elevation gain/loss for a route
   */
  const getRouteElevationStats = (points) => {
    const elevations = getRouteProfile(points);

    let gain = 0;
    let loss = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) {
        gain += diff;
      } else {
        loss += Math.abs(diff);
      }
      minElevation = Math.min(minElevation, elevations[i]);
      maxElevation = Math.max(maxElevation, elevations[i]);
    }

    return {
      elevations,
      totalGain: Math.round(gain),
      totalLoss: Math.round(loss),
      minElevation: Math.round(minElevation),
      maxElevation: Math.round(maxElevation),
      elevationRange: Math.round(maxElevation - minElevation)
    };
  };

  /**
   * Get description of terrain for user feedback
   */
  const getTerrainDescription = (lat, lon) => {
    const terrainType = getTerrainType(lat, lon);
    const elevation = getEstimatedElevation(lat, lon);

    const descriptions = {
      mountains: `Mountainous terrain at approximately ${elevation}m elevation. Expect significant altitude effects on aircraft performance.`,
      hills: `Hilly terrain at approximately ${elevation}m elevation. Moderate altitude effects expected.`,
      plateau: `High plateau at approximately ${elevation}m elevation. Consistent altitude, significant performance impact.`,
      plains: `Flat plains at approximately ${elevation}m elevation. Minimal altitude effects.`,
      coastal: `Coastal area near sea level (${elevation}m). Minimal altitude effects, potential for maritime weather.`,
      desert: `Desert terrain at approximately ${elevation}m elevation. High temperatures may reduce performance.`,
      tropical: `Tropical lowlands at approximately ${elevation}m elevation. High humidity and temperature expected.`,
      tundra: `Tundra environment at approximately ${elevation}m elevation. Cold weather operations.`,
      unknown: `Estimated elevation ${elevation}m. Actual terrain data recommended.`
    };

    return descriptions[terrainType] || descriptions.unknown;
  };

  // Public API
  return {
    getEstimatedElevation,
    getTerrainType,
    getTerrainDescription,
    getRouteProfile,
    getRouteElevationStats,
    isLikelyOcean
  };
})();

// Export for browser global scope
window.SRTMFallback = SRTMFallback;
