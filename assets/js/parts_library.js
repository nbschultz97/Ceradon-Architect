/**
 * Parts Library Manager
 * Handles storage, retrieval, and management of COTS component catalogs
 * Uses IndexedDB for efficient storage of large datasets
 * Supports offline-first operation
 */

const PARTS_LIBRARY_VERSION = '1.0.0';
const DB_NAME = 'COTSPartsLibrary';
const LEGACY_DB_NAME = 'CeradonPartsLibrary';
const DB_VERSION = 1;

const PartsLibrary = (() => {
  let db = null;

  // Category definitions
  const CATEGORIES = [
    'airframes',
    'motors',
    'escs',
    'batteries',
    'flight_controllers',
    'radios',
    'sensors',
    'accessories'
  ];

  /**
   * Initialize IndexedDB
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

  const hasAnyRecords = (database) => new Promise((resolve) => {
    const storeNames = Array.from(database.objectStoreNames);
    if (!storeNames.length) {
      resolve(false);
      return;
    }

    let pending = storeNames.length;
    let hasData = false;
    storeNames.forEach((storeName) => {
      const tx = database.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result > 0) {
          hasData = true;
        }
      };
      const finish = () => {
        pending -= 1;
        if (pending === 0) {
          resolve(hasData);
        }
      };
      tx.oncomplete = finish;
      tx.onerror = finish;
      tx.onabort = finish;
    });
  });

  const readAllFromStore = (database, storeName) => new Promise((resolve) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });

  const writeAllToStore = (database, storeName, records) => new Promise((resolve) => {
    if (!records || records.length === 0) {
      resolve();
      return;
    }
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    records.forEach(record => store.put(record));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });

  const migrateLegacyLibrary = async (database) => {
    if (LEGACY_DB_NAME === DB_NAME) {
      return;
    }
    const dbs = await listDatabases();
    const legacyExists = dbs.some((entry) => entry && entry.name === LEGACY_DB_NAME);
    if (!legacyExists) {
      return;
    }
    const hasData = await hasAnyRecords(database);
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

    const legacyStores = Array.from(legacyDb.objectStoreNames);
    for (const storeName of legacyStores) {
      const records = await readAllFromStore(legacyDb, storeName);
      await writeAllToStore(database, storeName, records);
    }

    legacyDb.close();
  };

  const initDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        migrateLegacyLibrary(db).finally(() => resolve(db));
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create object stores for each category
        CATEGORIES.forEach(category => {
          if (!database.objectStoreNames.contains(category)) {
            const store = database.createObjectStore(category, { keyPath: 'id' });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('availability', 'availability', { unique: false });
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          }
        });

        // Create metadata store
        if (!database.objectStoreNames.contains('metadata')) {
          database.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  };

  /**
   * Ensure database is initialized
   */
  const ensureDB = async () => {
    if (!db) {
      await initDB();
    }
    return db;
  };

  /**
   * Create empty parts library structure
   */
  const createEmptyLibrary = () => ({
    schemaVersion: PARTS_LIBRARY_VERSION,
    catalogId: `catalog-${Date.now()}`,
    meta: {
      name: 'Default Catalog',
      description: 'COTS component library',
      unit: '',
      lastUpdated: new Date().toISOString(),
      inventoryReference: ''
    },
    airframes: [],
    motors: [],
    escs: [],
    batteries: [],
    flight_controllers: [],
    radios: [],
    sensors: [],
    accessories: []
  });

  /**
   * Save metadata
   */
  const saveMetadata = async (metadata) => {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key: 'catalog_meta', ...metadata });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Load metadata
   */
  const loadMetadata = async () => {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('catalog_meta');

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          const defaultMeta = createEmptyLibrary().meta;
          saveMetadata(defaultMeta).then(() => resolve(defaultMeta));
        }
      };
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Add a part to a category
   */
  const addPart = async (category, part) => {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([category], 'readwrite');
      const store = transaction.objectStore(category);

      // Ensure part has an ID
      if (!part.id) {
        part.id = `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const request = store.put(part);

      request.onsuccess = () => resolve(part);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Get all parts from a category
   */
  const getAllParts = async (category) => {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([category], 'readonly');
      const store = transaction.objectStore(category);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Get a single part by ID
   */
  const getPart = async (category, id) => {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([category], 'readonly');
      const store = transaction.objectStore(category);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Update a part
   */
  const updatePart = async (category, part) => {
    return addPart(category, part); // put() handles both insert and update
  };

  /**
   * Delete a part
   */
  const deletePart = async (category, id) => {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([category], 'readwrite');
      const store = transaction.objectStore(category);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Search parts by name
   */
  const searchParts = async (category, searchTerm) => {
    const allParts = await getAllParts(category);
    const term = searchTerm.toLowerCase();

    return allParts.filter(part => {
      return (
        part.name?.toLowerCase().includes(term) ||
        part.manufacturer?.toLowerCase().includes(term) ||
        part.part_number?.toLowerCase().includes(term) ||
        part.notes?.toLowerCase().includes(term) ||
        (part.tags && part.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    });
  };

  /**
   * Filter parts by availability
   */
  const filterByAvailability = async (category, availability) => {
    const allParts = await getAllParts(category);
    return allParts.filter(part => part.availability === availability);
  };

  /**
   * Get parts count for all categories
   */
  const getCategoryCounts = async () => {
    const counts = {};

    for (const category of CATEGORIES) {
      const parts = await getAllParts(category);
      counts[category] = parts.length;
    }

    return counts;
  };

  /**
   * Export entire library to JSON
   */
  const exportLibrary = async () => {
    const library = createEmptyLibrary();
    library.meta = await loadMetadata();

    for (const category of CATEGORIES) {
      library[category] = await getAllParts(category);
    }

    return library;
  };

  /**
   * Import library from JSON
   */
  const importLibrary = async (libraryData, mode = 'replace') => {
    await ensureDB();

    // Update metadata
    if (libraryData.meta) {
      await saveMetadata({
        ...libraryData.meta,
        lastUpdated: new Date().toISOString()
      });
    }

    // Import parts for each category
    for (const category of CATEGORIES) {
      if (!libraryData[category]) continue;

      if (mode === 'replace') {
        // Clear existing parts
        await clearCategory(category);
      }

      // Add new parts
      for (const part of libraryData[category]) {
        await addPart(category, part);
      }
    }

    return true;
  };

  /**
   * Clear all parts in a category
   */
  const clearCategory = async (category) => {
    if (!CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    await ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([category], 'readwrite');
      const store = transaction.objectStore(category);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Clear entire library (all categories)
   */
  const clearLibrary = async () => {
    for (const category of CATEGORIES) {
      await clearCategory(category);
    }
    return true;
  };

  /**
   * Download library as JSON file
   */
  const downloadLibrary = async (fileName = 'parts_library.json') => {
    const library = await exportLibrary();
    const blob = new Blob([JSON.stringify(library, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Validate part against category schema
   */
  const validatePart = (category, part) => {
    const errors = [];

    // Basic validation - check required fields based on category
    const requiredFields = {
      airframes: ['id', 'name', 'type', 'weight_g'],
      motors: ['id', 'name', 'kv', 'weight_g', 'max_thrust_g'],
      escs: ['id', 'name', 'max_current_a', 'weight_g'],
      batteries: ['id', 'name', 'chemistry', 'voltage_nominal_v', 'capacity_mah', 'weight_g'],
      flight_controllers: ['id', 'name', 'weight_g'],
      radios: ['id', 'name', 'type', 'frequency_band', 'weight_g'],
      sensors: ['id', 'name', 'type', 'weight_g'],
      accessories: ['id', 'name', 'category', 'weight_g']
    };

    const required = requiredFields[category] || ['id', 'name'];

    required.forEach(field => {
      if (part[field] === undefined || part[field] === null || part[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate numeric fields are positive
    const numericFields = ['weight_g', 'cost_usd', 'max_current_a', 'capacity_mah'];
    numericFields.forEach(field => {
      if (part[field] !== undefined && part[field] < 0) {
        errors.push(`${field} must be non-negative`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  };

  /**
   * Get parts statistics
   */
  const getStatistics = async () => {
    const stats = {
      totalParts: 0,
      categoryCounts: {},
      availabilityCounts: {
        'in-stock': 0,
        'on-order': 0,
        'unavailable': 0,
        'discontinued': 0
      },
      totalValue: 0,
      lastUpdated: null
    };

    const metadata = await loadMetadata();
    stats.lastUpdated = metadata.lastUpdated;

    for (const category of CATEGORIES) {
      const parts = await getAllParts(category);
      stats.categoryCounts[category] = parts.length;
      stats.totalParts += parts.length;

      parts.forEach(part => {
        if (part.availability) {
          stats.availabilityCounts[part.availability] =
            (stats.availabilityCounts[part.availability] || 0) + 1;
        }
        if (part.cost_usd) {
          stats.totalValue += part.cost_usd;
        }
      });
    }

    return stats;
  };

  /**
   * Load sample parts catalog from JSON file
   */
  const loadSampleCatalog = async () => {
    try {
      const response = await fetch('data/sample_parts_library.json');
      if (!response.ok) {
        throw new Error('Failed to load sample catalog');
      }

      const catalog = await response.json();

      // Import the catalog
      await importLibrary(catalog);

      // Update metadata
      await saveMetadata({
        catalogId: `catalog-${Date.now()}`,
        name: 'Sample COTS Catalog',
        description: 'Realistic commercial-off-the-shelf components for UAS platforms',
        lastUpdated: new Date().toISOString(),
        source: 'sample'
      });

      return {
        success: true,
        message: 'Sample catalog loaded successfully'
      };
    } catch (error) {
      console.error('Error loading sample catalog:', error);
      return {
        success: false,
        message: error.message
      };
    }
  };

  // Public API
  return {
    CATEGORIES,
    PARTS_LIBRARY_VERSION,
    initDB,
    createEmptyLibrary,
    saveMetadata,
    loadMetadata,
    addPart,
    getAllParts,
    getPart,
    updatePart,
    deletePart,
    searchParts,
    filterByAvailability,
    getCategoryCounts,
    exportLibrary,
    importLibrary,
    clearCategory,
    clearLibrary,
    downloadLibrary,
    validatePart,
    getStatistics,
    loadSampleCatalog
  };
})();

// Export for browser global scope
window.PartsLibrary = PartsLibrary;
