/**
 * Environmental Almanac Module
 * Local historical weather database for mission planning
 * Provides temperature, wind, and atmospheric data based on location and season
 */

const EnvironmentAlmanac = (() => {
  const DB_NAME = 'cots_environment_almanac';
  const LEGACY_DB_NAME = 'ceradon_environment_almanac';
  const DB_VERSION = 1;
  const STORE_NAME = 'climate_regions';

  let db = null;

  /**
   * Initialize IndexedDB for climate data storage
   */
  const listDatabases = async () => {
    if (typeof indexedDB.databases !== 'function') {
      return [];
    }
    try {
      return await indexedDB.databases();
    } catch (error) {
      return [];
    }
  };

  const storeHasData = (database) => new Promise((resolve) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => resolve(false);
  });

  const readAllFromStore = (database) => new Promise((resolve) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });

  const writeAllToStore = (database, records) => new Promise((resolve) => {
    if (!records || records.length === 0) {
      resolve();
      return;
    }
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    records.forEach(record => store.put(record));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });

  const migrateLegacyAlmanac = async (database) => {
    if (LEGACY_DB_NAME === DB_NAME) {
      return;
    }
    const dbs = await listDatabases();
    const legacyExists = dbs.some((entry) => entry && entry.name === LEGACY_DB_NAME);
    if (!legacyExists) {
      return;
    }
    const hasData = await storeHasData(database);
    if (hasData) {
      return;
    }

    const legacyRequest = indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
    const legacyDb = await new Promise((resolve) => {
      legacyRequest.onsuccess = () => resolve(legacyRequest.result);
      legacyRequest.onerror = () => resolve(null);
      legacyRequest.onupgradeneeded = () => resolve(null);
    });

    if (!legacyDb) {
      return;
    }

    const records = await readAllFromStore(legacyDb);
    await writeAllToStore(database, records);
    legacyDb.close();
  };

  const initDB = () => {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Almanac] Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[Almanac] Database initialized');
        migrateLegacyAlmanac(db).finally(() => resolve(db));
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'region_id' });
          store.createIndex('coordinates', ['lat_center', 'lon_center'], { unique: false });
          store.createIndex('climate_zone', 'climate_zone', { unique: false });
          console.log('[Almanac] Object store created');
        }
      };
    });
  };

  /**
   * Get environmental data for a location and date
   */
  const getEnvironmentalData = async (lat, lon, date = new Date()) => {
    try {
      await initDB();

      // Find nearest climate region
      const region = await findNearestRegion(lat, lon);

      if (!region) {
        console.warn('[Almanac] No climate data found, using global defaults');
        return getGlobalDefaults(lat, lon, date);
      }

      // Get month-specific data
      const month = date.getMonth(); // 0-11
      const monthData = region.monthly_data[month];

      // Calculate day-of-year for seasonal interpolation
      const dayOfYear = getDayOfYear(date);
      const seasonalData = interpolateSeasonalData(region, dayOfYear);

      return {
        region_id: region.region_id,
        region_name: region.name,
        coordinates: {
          lat: lat,
          lon: lon,
          nearest_station_distance_km: calculateDistance(
            lat, lon,
            region.lat_center,
            region.lon_center
          ) / 1000
        },
        date: date.toISOString(),
        month: month + 1,
        temperature: {
          avg_high_c: monthData.avg_high_c,
          avg_low_c: monthData.avg_low_c,
          record_high_c: monthData.record_high_c,
          record_low_c: monthData.record_low_c,
          suggested_c: seasonalData.suggested_temp_c
        },
        wind: {
          avg_speed_ms: monthData.avg_wind_ms,
          max_gust_ms: monthData.max_gust_ms,
          prevailing_direction: monthData.wind_direction,
          suggested_ms: seasonalData.suggested_wind_ms
        },
        precipitation: {
          avg_rainfall_mm: monthData.rainfall_mm,
          avg_snowfall_cm: monthData.snowfall_cm,
          rainy_days: monthData.rainy_days
        },
        atmospheric: {
          avg_pressure_hpa: monthData.pressure_hpa,
          avg_humidity_pct: monthData.humidity_pct,
          cloud_cover_pct: monthData.cloud_cover_pct
        },
        warnings: generateEnvironmentalWarnings(monthData, seasonalData)
      };
    } catch (error) {
      console.error('[Almanac] Error getting environmental data:', error);
      return getGlobalDefaults(lat, lon, date);
    }
  };

  /**
   * Find nearest climate region to a given location
   */
  const findNearestRegion = async (lat, lon) => {
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const regions = request.result || [];

        if (regions.length === 0) {
          resolve(null);
          return;
        }

        // Find closest region by distance
        let nearest = null;
        let minDistance = Infinity;

        regions.forEach(region => {
          const distance = calculateDistance(
            lat, lon,
            region.lat_center,
            region.lon_center
          );

          // Only use if within region's coverage radius
          if (distance <= region.coverage_radius_km * 1000 && distance < minDistance) {
            minDistance = distance;
            nearest = region;
          }
        });

        resolve(nearest);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  };

  /**
   * Interpolate seasonal data based on day of year
   */
  const interpolateSeasonalData = (region, dayOfYear) => {
    // Simple linear interpolation between monthly values
    const month = Math.floor((dayOfYear / 365.25) * 12);
    const nextMonth = (month + 1) % 12;
    const t = ((dayOfYear / 365.25) * 12) % 1;

    const currentMonth = region.monthly_data[month];
    const nextMonthData = region.monthly_data[nextMonth];

    return {
      suggested_temp_c: Math.round(
        currentMonth.avg_high_c * 0.7 + currentMonth.avg_low_c * 0.3
      ),
      suggested_wind_ms: Math.round(
        currentMonth.avg_wind_ms * (1 - t) + nextMonthData.avg_wind_ms * t
      )
    };
  };

  /**
   * Generate environmental warnings based on data
   */
  const generateEnvironmentalWarnings = (monthData, seasonalData) => {
    const warnings = [];

    // Extreme cold warning
    if (seasonalData.suggested_temp_c < -20) {
      warnings.push({
        severity: 'critical',
        type: 'extreme_cold',
        message: `Extreme cold (${seasonalData.suggested_temp_c}°C) - Battery capacity severely reduced`
      });
    } else if (seasonalData.suggested_temp_c < -10) {
      warnings.push({
        severity: 'warning',
        type: 'cold_weather',
        message: `Cold weather (${seasonalData.suggested_temp_c}°C) - Battery derating required`
      });
    }

    // High wind warning
    if (seasonalData.suggested_wind_ms > 15) {
      warnings.push({
        severity: 'critical',
        type: 'high_winds',
        message: `High winds (${seasonalData.suggested_wind_ms} m/s) - May exceed platform stall speed`
      });
    } else if (seasonalData.suggested_wind_ms > 10) {
      warnings.push({
        severity: 'warning',
        type: 'moderate_winds',
        message: `Moderate winds (${seasonalData.suggested_wind_ms} m/s) - Reduced stability and endurance`
      });
    }

    // Precipitation warning
    if (monthData.rainy_days > 20) {
      warnings.push({
        severity: 'info',
        type: 'wet_season',
        message: `Wet season - ${monthData.rainy_days} rainy days average`
      });
    }

    return warnings;
  };

  /**
   * Get global defaults when no regional data available
   */
  const getGlobalDefaults = (lat, lon, date) => {
    const month = date.getMonth();

    // Estimate based on latitude and season
    const isNorthernHemisphere = lat >= 0;
    const isSummer = isNorthernHemisphere
      ? (month >= 5 && month <= 8)
      : (month <= 2 || month >= 11);

    // Rough temperature estimate based on latitude
    const baseTemp = 30 - Math.abs(lat) * 0.6;
    const seasonalAdjust = isSummer ? 5 : -5;
    const avgTemp = Math.round(baseTemp + seasonalAdjust);

    // Rough wind estimate (higher in mid-latitudes)
    const avgWind = Math.abs(lat) > 30 && Math.abs(lat) < 60 ? 7 : 4;

    return {
      region_id: 'default',
      region_name: 'Global Default',
      coordinates: { lat, lon, nearest_station_distance_km: 0 },
      date: date.toISOString(),
      month: month + 1,
      temperature: {
        avg_high_c: avgTemp + 5,
        avg_low_c: avgTemp - 5,
        record_high_c: avgTemp + 15,
        record_low_c: avgTemp - 15,
        suggested_c: avgTemp
      },
      wind: {
        avg_speed_ms: avgWind,
        max_gust_ms: avgWind * 2,
        prevailing_direction: 'Variable',
        suggested_ms: avgWind
      },
      precipitation: {
        avg_rainfall_mm: 50,
        avg_snowfall_cm: avgTemp < 0 ? 10 : 0,
        rainy_days: 10
      },
      atmospheric: {
        avg_pressure_hpa: 1013,
        avg_humidity_pct: 60,
        cloud_cover_pct: 50
      },
      warnings: []
    };
  };

  /**
   * Import climate region data
   */
  const importRegion = async (regionData) => {
    try {
      await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(regionData);

        request.onsuccess = () => {
          console.log(`[Almanac] Region ${regionData.region_id} imported`);
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[Almanac] Import error:', error);
      return false;
    }
  };

  /**
   * Load sample climate data for common regions
   */
  const loadSampleData = async () => {
    const sampleRegions = [
      createRegion('afghanistan_kandahar', 'Kandahar, Afghanistan', 31.6, 65.7, 500,
        // Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
        [10,  13,  18,  24,  30,  35,  37,  35,  31,  25,  17,  12], // avg_high
        [-3,  0,   5,   10,  15,  20,  24,  23,  17,  10,  4,   -1], // avg_low
        [4,   5,   6,   7,   8,   9,   8,   7,   6,   5,   4,   4]   // wind_ms
      ),
      createRegion('arctic_circle', 'Arctic Circle', 66.5, -45.0, 1000,
        [-25, -23, -18, -10, -2,  5,   10,  8,   3,   -5,  -15, -22],
        [-32, -30, -25, -17, -8,  -1,  4,   3,   -2,  -12, -22, -29],
        [8,   8,   7,   7,   6,   5,   5,   6,   7,   8,   8,   8]
      ),
      createRegion('sahara_desert', 'Sahara Desert', 25.0, 5.0, 750,
        [22,  25,  30,  35,  40,  42,  43,  42,  40,  35,  28,  23],
        [8,   10,  13,  18,  22,  25,  27,  26,  24,  19,  13,  9],
        [5,   6,   7,   7,   7,   6,   6,   6,   6,   5,   5,   5]
      )
    ];

    for (const region of sampleRegions) {
      await importRegion(region);
    }

    console.log('[Almanac] Sample climate data loaded');
  };

  /**
   * Helper to create region data structure
   */
  const createRegion = (id, name, lat, lon, radius, avgHigh, avgLow, wind) => {
    const monthly_data = [];

    for (let i = 0; i < 12; i++) {
      monthly_data.push({
        month: i,
        avg_high_c: avgHigh[i],
        avg_low_c: avgLow[i],
        record_high_c: avgHigh[i] + 10,
        record_low_c: avgLow[i] - 10,
        avg_wind_ms: wind[i],
        max_gust_ms: wind[i] * 2.5,
        wind_direction: 'Variable',
        rainfall_mm: lat > 23 || lat < -23 ? 30 : 5, // More rain in temperate zones
        snowfall_cm: avgHigh[i] < 5 ? 10 : 0,
        rainy_days: lat > 23 || lat < -23 ? 8 : 2,
        pressure_hpa: 1013,
        humidity_pct: lat > 23 || lat < -23 ? 60 : 20,
        cloud_cover_pct: lat > 23 || lat < -23 ? 50 : 20
      });
    }

    return {
      region_id: id,
      name: name,
      lat_center: lat,
      lon_center: lon,
      coverage_radius_km: radius,
      climate_zone: determineClimateZone(lat),
      monthly_data: monthly_data,
      imported: new Date().toISOString()
    };
  };

  /**
   * Determine climate zone from latitude
   */
  const determineClimateZone = (lat) => {
    const absLat = Math.abs(lat);
    if (absLat > 66.5) return 'polar';
    if (absLat > 50) return 'subarctic';
    if (absLat > 40) return 'temperate';
    if (absLat > 23.5) return 'subtropical';
    return 'tropical';
  };

  /**
   * Calculate distance between two points (Haversine)
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Get day of year (1-365)
   */
  const getDayOfYear = (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  // Initialize and load sample data on first use
  const initialize = async () => {
    await initDB();

    // Check if sample data already loaded
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      if (request.result === 0) {
        console.log('[Almanac] Loading sample climate data...');
        loadSampleData();
      }
    };
  };

  // Auto-initialize
  if (typeof window !== 'undefined') {
    setTimeout(initialize, 500);
  }

  // Public API
  return {
    initDB,
    getEnvironmentalData,
    importRegion,
    loadSampleData
  };
})();

// Export for browser global scope
window.EnvironmentAlmanac = EnvironmentAlmanac;
