/**
 * SRTM Elevation Data Module
 * Handles SRTM (Shuttle Radar Topography Mission) elevation data for offline terrain analysis
 * Supports both SRTM1 (30m resolution) and SRTM3 (90m resolution)
 */

const SRTMElevation = (() => {
  const DB_NAME = 'cots_srtm_tiles';
  const LEGACY_DB_NAME = 'ceradon_srtm_tiles';
  const DB_VERSION = 1;
  const STORE_NAME = 'elevation_tiles';

  let db = null;

  // SRTM tile specifications
  const SRTM_SPECS = {
    SRTM1: { resolution_m: 30, samples: 3601 }, // 1 arc-second
    SRTM3: { resolution_m: 90, samples: 1201 }  // 3 arc-second
  };

  /**
   * Initialize IndexedDB for SRTM tile storage
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

  const migrateLegacyTiles = async (database) => {
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
        console.error('[SRTM] Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[SRTM] Database initialized');
        migrateLegacyTiles(db).finally(() => resolve(db));
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create object store for SRTM tiles
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'tile_id' });
          store.createIndex('region', 'region', { unique: false });
          console.log('[SRTM] Object store created');
        }
      };
    });
  };

  /**
   * Get SRTM tile ID for a given lat/lon
   * Format: N37E122 (for 37°N, 122°E tile)
   */
  const getTileId = (lat, lon) => {
    const latPrefix = lat >= 0 ? 'N' : 'S';
    const lonPrefix = lon >= 0 ? 'E' : 'W';

    const latInt = Math.floor(Math.abs(lat));
    const lonInt = Math.floor(Math.abs(lon));

    return `${latPrefix}${String(latInt).padStart(2, '0')}${lonPrefix}${String(lonInt).padStart(3, '0')}`;
  };

  /**
   * Query elevation for a specific lat/lon
   */
  const getElevation = async (lat, lon) => {
    try {
      await initDB();

      const tileId = getTileId(lat, lon);
      const tile = await loadTile(tileId);

      if (!tile) {
        console.warn(`[SRTM] No tile data for ${tileId}, using fallback`);
        return estimateElevation(lat, lon);
      }

      // Calculate elevation from tile data
      return interpolateElevation(lat, lon, tile);
    } catch (error) {
      console.error('[SRTM] Error getting elevation:', error);
      return estimateElevation(lat, lon);
    }
  };

  /**
   * Load SRTM tile from IndexedDB
   */
  const loadTile = (tileId) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(tileId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  };

  /**
   * Interpolate elevation from SRTM tile data
   * Uses bilinear interpolation for smoother results
   */
  const interpolateElevation = (lat, lon, tile) => {
    const spec = SRTM_SPECS[tile.type] || SRTM_SPECS.SRTM3;
    const samples = spec.samples;

    // Calculate fractional position within tile
    const latFrac = (lat - Math.floor(lat)) * (samples - 1);
    const lonFrac = (lon - Math.floor(lon)) * (samples - 1);

    // Get surrounding grid points
    const row0 = Math.floor(latFrac);
    const row1 = Math.min(row0 + 1, samples - 1);
    const col0 = Math.floor(lonFrac);
    const col1 = Math.min(col0 + 1, samples - 1);

    // Get elevation values at grid points
    const e00 = tile.data[row0 * samples + col0] || 0;
    const e01 = tile.data[row0 * samples + col1] || 0;
    const e10 = tile.data[row1 * samples + col0] || 0;
    const e11 = tile.data[row1 * samples + col1] || 0;

    // Bilinear interpolation
    const rowFrac = latFrac - row0;
    const colFrac = lonFrac - col0;

    const e0 = e00 * (1 - colFrac) + e01 * colFrac;
    const e1 = e10 * (1 - colFrac) + e11 * colFrac;
    const elevation = e0 * (1 - rowFrac) + e1 * rowFrac;

    return Math.round(elevation);
  };

  /**
   * Estimate elevation when SRTM data not available
   * Uses SRTMFallback if available, otherwise rough approximations
   */
  const estimateElevation = (lat, lon) => {
    // Use SRTMFallback if available (provides better estimates)
    if (typeof SRTMFallback !== 'undefined') {
      return SRTMFallback.getEstimatedElevation(lat, lon);
    }

    // Fallback to basic estimation
    // Coastal areas and major basins
    if (isCoastalArea(lat, lon)) {
      return 0;
    }

    // Mountain ranges (rough approximation)
    if (isMountainousRegion(lat, lon)) {
      return 1500; // Typical mountain elevation
    }

    // Plains and plateaus
    return 300; // Average continental elevation
  };

  /**
   * Check if location is likely coastal (simplified)
   */
  const isCoastalArea = (lat, lon) => {
    // This is a placeholder - in production, would use coastline database
    return false;
  };

  /**
   * Check if location is in mountainous region (simplified)
   */
  const isMountainousRegion = (lat, lon) => {
    // Major mountain ranges (very rough approximation)
    // Himalayas
    if (lat > 27 && lat < 40 && lon > 70 && lon < 105) return true;
    // Rockies
    if (lat > 30 && lat < 55 && lon > -120 && lon < -100) return true;
    // Andes
    if (lat > -55 && lat < 10 && lon > -80 && lon < -65) return true;
    // Alps
    if (lat > 43 && lat < 48 && lon > 5 && lon < 17) return true;

    return false;
  };

  /**
   * Import SRTM tile data (for manual loading)
   */
  const importTile = async (tileId, type, data, region = 'unknown') => {
    try {
      await initDB();

      const tile = {
        tile_id: tileId,
        type: type, // 'SRTM1' or 'SRTM3'
        data: data, // Array of elevation values
        region: region,
        imported: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(tile);

        request.onsuccess = () => {
          console.log(`[SRTM] Tile ${tileId} imported successfully`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`[SRTM] Error importing tile ${tileId}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SRTM] Import error:', error);
      return false;
    }
  };

  /**
   * List all imported SRTM tiles
   */
  const listTiles = async () => {
    try {
      await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SRTM] Error listing tiles:', error);
      return [];
    }
  };

  /**
   * Delete SRTM tile
   */
  const deleteTile = async (tileId) => {
    try {
      await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(tileId);

        request.onsuccess = () => {
          console.log(`[SRTM] Tile ${tileId} deleted`);
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[SRTM] Delete error:', error);
      return false;
    }
  };

  /**
   * Get elevation profile between two points
   * Returns array of {distance_m, elevation_m} points
   */
  const getElevationProfile = async (lat1, lon1, lat2, lon2, samples = 100) => {
    const profile = [];

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const lat = lat1 + (lat2 - lat1) * t;
      const lon = lon1 + (lon2 - lon1) * t;

      const elevation = await getElevation(lat, lon);

      // Calculate distance from start
      const distance = calculateDistance(lat1, lon1, lat, lon);

      profile.push({
        lat: lat,
        lon: lon,
        distance_m: distance,
        elevation_m: elevation
      });
    }

    return profile;
  };

  /**
   * Calculate distance between two points (Haversine formula)
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
   * Check if terrain clears line-of-sight between two points
   */
  const checkTerrainClearance = async (lat1, lon1, elev1, lat2, lon2, elev2, clearanceM = 10) => {
    const profile = await getElevationProfile(lat1, lon1, lat2, lon2, 50);

    // Calculate LOS line elevation at each sample point
    const totalDistance = profile[profile.length - 1].distance_m;

    for (const point of profile) {
      const t = point.distance_m / totalDistance;
      const losElevation = elev1 + (elev2 - elev1) * t;

      // Check if terrain blocks LOS
      if (point.elevation_m + clearanceM > losElevation) {
        return {
          clear: false,
          obstruction: point,
          required_clearance: (point.elevation_m + clearanceM) - losElevation
        };
      }
    }

    return {
      clear: true,
      obstruction: null,
      required_clearance: 0
    };
  };

  // Public API
  return {
    initDB,
    getElevation,
    getTileId,
    importTile,
    listTiles,
    deleteTile,
    getElevationProfile,
    checkTerrainClearance
  };
})();

// Export for browser global scope
window.SRTMElevation = SRTMElevation;
