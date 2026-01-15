/**
 * CSV/Excel Import Engine
 * Handles bulk import of parts from spreadsheets
 * Supports column mapping and validation
 */

const CSVImporter = (() => {
  /**
   * Parse CSV text into array of objects
   */
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue; // Skip empty lines

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  /**
   * Parse a single CSV line (handles quoted values)
   */
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  };

  /**
   * Column mapping templates for common formats
   */
  const MAPPING_TEMPLATES = {
    'generic': {
      name: 'Generic COTS Catalog',
      mappings: {
        'id': ['id', 'part_id', 'item_id', 'sku'],
        'name': ['name', 'part_name', 'item_name', 'description'],
        'manufacturer': ['manufacturer', 'mfg', 'maker', 'brand'],
        'part_number': ['part_number', 'part#', 'pn', 'mpn'],
        'weight_g': ['weight_g', 'weight', 'weight_grams', 'mass'],
        'cost_usd': ['cost_usd', 'cost', 'price', 'price_usd'],
        'availability': ['availability', 'status', 'stock_status'],
        'notes': ['notes', 'comments', 'remarks', 'description']
      }
    },
    'battery': {
      name: 'Battery-Specific',
      mappings: {
        'chemistry': ['chemistry', 'type', 'battery_type'],
        'cells': ['cells', 's', 'cell_count'],
        'voltage_nominal_v': ['voltage', 'voltage_nominal_v', 'nominal_voltage', 'v'],
        'capacity_mah': ['capacity_mah', 'capacity', 'mah'],
        'c_rating': ['c_rating', 'c', 'discharge_rate'],
        'connector_type': ['connector', 'connector_type', 'plug']
      }
    },
    'motor': {
      name: 'Motor-Specific',
      mappings: {
        'size': ['size', 'motor_size', 'dimensions'],
        'kv': ['kv', 'kv_rating', 'rpm_v'],
        'max_current_a': ['max_current_a', 'max_current', 'amps'],
        'max_thrust_g': ['max_thrust_g', 'thrust', 'max_thrust'],
        'prop_size_range': ['prop_size', 'prop', 'propeller']
      }
    },
    'nsn': {
      name: 'NATO Stock Number Format',
      mappings: {
        'nsn': ['nsn', 'nato_stock_number', 'stock_number'],
        'nomenclature': ['nomenclature', 'name', 'description']
      }
    }
  };

  /**
   * Auto-detect column mappings based on header names
   */
  const autoDetectMappings = (headers, category) => {
    const mappings = {};
    const templates = [MAPPING_TEMPLATES.generic];

    // Add category-specific template if available
    if (MAPPING_TEMPLATES[category]) {
      templates.push(MAPPING_TEMPLATES[category]);
    }

    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim();

      // Try each template
      for (const template of templates) {
        for (const [targetField, aliases] of Object.entries(template.mappings)) {
          if (aliases.some(alias => headerLower === alias.toLowerCase())) {
            mappings[header] = targetField;
            break;
          }
        }
        if (mappings[header]) break;
      }

      // If no mapping found, keep original header name
      if (!mappings[header]) {
        mappings[header] = headerLower.replace(/\s+/g, '_');
      }
    });

    return mappings;
  };

  /**
   * Apply column mappings to row data
   */
  const applyMappings = (rows, mappings) => {
    return rows.map(row => {
      const mapped = {};

      for (const [sourceCol, targetField] of Object.entries(mappings)) {
        if (row[sourceCol] !== undefined) {
          mapped[targetField] = row[sourceCol];
        }
      }

      return mapped;
    });
  };

  /**
   * Convert string values to appropriate types
   */
  const convertTypes = (row) => {
    const converted = { ...row };

    // Numeric fields
    const numericFields = [
      'weight_g', 'cost_usd', 'max_current_a', 'capacity_mah', 'capacity_wh',
      'voltage_nominal_v', 'max_thrust_g', 'kv', 'cells', 'c_rating',
      'max_power_w', 'power_consumption_w', 'frequency_range_mhz',
      'range_m', 'data_rate_kbps', 'power_output_mw'
    ];

    numericFields.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        const value = parseFloat(String(converted[field]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(value)) {
          converted[field] = value;
        }
      }
    });

    // Integer fields
    const integerFields = ['cells', 'motor_count', 'uart_ports'];
    integerFields.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        const value = parseInt(String(converted[field]).replace(/[^0-9-]/g, ''), 10);
        if (!isNaN(value)) {
          converted[field] = value;
        }
      }
    });

    // Boolean fields
    const booleanFields = ['printable', 'integrated'];
    booleanFields.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        const value = String(converted[field]).toLowerCase();
        converted[field] = ['true', 'yes', '1', 'y'].includes(value);
      }
    });

    // Array fields (comma-separated)
    const arrayFields = ['tags', 'protocols', 'firmware', 'features', 'rf_bands'];
    arrayFields.forEach(field => {
      if (converted[field] !== undefined && typeof converted[field] === 'string') {
        converted[field] = converted[field]
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
    });

    return converted;
  };

  /**
   * Validate imported rows
   */
  const validateRows = (rows, category) => {
    const results = {
      valid: [],
      invalid: []
    };

    rows.forEach((row, index) => {
      const validation = PartsLibrary.validatePart(category, row);

      if (validation.valid) {
        results.valid.push({ rowIndex: index + 2, data: row }); // +2 for header and 0-indexing
      } else {
        results.invalid.push({
          rowIndex: index + 2,
          data: row,
          errors: validation.errors
        });
      }
    });

    return results;
  };

  /**
   * Import parts from CSV text
   */
  const importFromCSV = async (csvText, category, options = {}) => {
    const {
      columnMappings = null,
      skipValidation = false,
      mode = 'append' // 'append' or 'replace'
    } = options;

    try {
      // Parse CSV
      const { headers, rows } = parseCSV(csvText);

      if (rows.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      // Auto-detect or use provided mappings
      const mappings = columnMappings || autoDetectMappings(headers, category);

      // Apply mappings and type conversion
      const mappedRows = applyMappings(rows, mappings);
      const convertedRows = mappedRows.map(convertTypes);

      // Validate rows
      let validation = { valid: convertedRows.map((data, idx) => ({ rowIndex: idx + 2, data })), invalid: [] };

      if (!skipValidation) {
        validation = validateRows(convertedRows, category);
      }

      // Import valid rows
      if (mode === 'replace') {
        await PartsLibrary.clearCategory(category);
      }

      const importedParts = [];
      for (const validRow of validation.valid) {
        try {
          const part = await PartsLibrary.addPart(category, validRow.data);
          importedParts.push(part);
        } catch (error) {
          validation.invalid.push({
            rowIndex: validRow.rowIndex,
            data: validRow.data,
            errors: [error.message]
          });
        }
      }

      return {
        success: true,
        imported: importedParts.length,
        failed: validation.invalid.length,
        invalidRows: validation.invalid,
        mappings
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        imported: 0,
        failed: 0,
        invalidRows: []
      };
    }
  };

  /**
   * Import from Excel file (XLSX/XLS) using SheetJS
   */
  const importFromExcel = async (file, category, options = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to CSV text
          const csvText = XLSX.utils.sheet_to_csv(worksheet);

          // Use existing CSV import logic
          const result = await importFromCSV(csvText, category, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Import from file (auto-detects CSV or Excel)
   */
  const importFromFile = async (file, category, options = {}) => {
    const fileName = file.name.toLowerCase();

    // Check if Excel file
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        throw new Error('Excel support not loaded. Please refresh the page.');
      }
      return importFromExcel(file, category, options);
    }

    // Otherwise treat as CSV
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const result = await importFromCSV(text, category, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  /**
   * Generate CSV template for a category
   */
  const generateTemplate = (category) => {
    const templates = {
      airframes: ['id', 'name', 'type', 'weight_g', 'max_payload_g', 'motor_count', 'material', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      motors: ['id', 'name', 'size', 'kv', 'weight_g', 'max_current_a', 'max_power_w', 'max_thrust_g', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      escs: ['id', 'name', 'max_current_a', 'weight_g', 'firmware', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      batteries: ['id', 'name', 'chemistry', 'cells', 'voltage_nominal_v', 'capacity_mah', 'weight_g', 'c_rating', 'connector_type', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      flight_controllers: ['id', 'name', 'weight_g', 'processor', 'firmware', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      radios: ['id', 'name', 'type', 'frequency_band', 'weight_g', 'power_output_mw', 'range_m', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      sensors: ['id', 'name', 'type', 'weight_g', 'power_consumption_w', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes'],
      accessories: ['id', 'name', 'category', 'weight_g', 'material', 'manufacturer', 'part_number', 'cost_usd', 'availability', 'notes']
    };

    const columns = templates[category] || templates.airframes;
    return columns.join(',') + '\n';
  };

  /**
   * Download CSV template
   */
  const downloadTemplate = (category, fileName = null) => {
    const template = generateTemplate(category);
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${category}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export category to CSV
   */
  const exportToCSV = async (category) => {
    const parts = await PartsLibrary.getAllParts(category);

    if (parts.length === 0) {
      throw new Error(`No parts found in category: ${category}`);
    }

    // Get all unique keys from parts
    const allKeys = new Set();
    parts.forEach(part => {
      Object.keys(part).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);

    // Build CSV
    const csvLines = [headers.join(',')];

    parts.forEach(part => {
      const values = headers.map(header => {
        let value = part[header];

        // Handle arrays
        if (Array.isArray(value)) {
          value = value.join('; ');
        }

        // Handle objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        // Escape and quote values containing commas or quotes
        if (value && (String(value).includes(',') || String(value).includes('"'))) {
          value = `"${String(value).replace(/"/g, '""')}"`;
        }

        return value || '';
      });

      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  };

  /**
   * Download category as CSV
   */
  const downloadCategoryCSV = async (category, fileName = null) => {
    const csv = await exportToCSV(category);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${category}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Normalize category name (handle singular/plural, common aliases)
   */
  const normalizeCategory = (categoryStr) => {
    const normalized = categoryStr.toLowerCase().trim();

    const categoryMap = {
      'airframe': 'airframes',
      'airframes': 'airframes',
      'motor': 'motors',
      'motors': 'motors',
      'esc': 'escs',
      'escs': 'escs',
      'battery': 'batteries',
      'batteries': 'batteries',
      'flight_controller': 'flight_controllers',
      'flight_controllers': 'flight_controllers',
      'fc': 'flight_controllers',
      'radio': 'radios',
      'radios': 'radios',
      'sensor': 'sensors',
      'sensors': 'sensors',
      'accessory': 'accessories',
      'accessories': 'accessories'
    };

    return categoryMap[normalized] || null;
  };

  /**
   * Import multi-category CSV (single file with category column)
   */
  const importMultiCategoryCSV = async (csvText, options = {}) => {
    const { skipValidation = false, mode = 'append' } = options;

    try {
      // Parse CSV
      const { headers, rows } = parseCSV(csvText);

      if (rows.length === 0) {
        throw new Error('No data rows found in CSV');
      }

      // Check for category column
      const categoryColumn = headers.find(h =>
        ['category', 'type', 'part_type', 'item_type'].includes(h.toLowerCase())
      );

      if (!categoryColumn) {
        throw new Error('Multi-category import requires a "category" column. Add a column with part types: airframe, motor, battery, etc.');
      }

      // Group rows by category
      const rowsByCategory = {};
      const invalidCategories = [];

      rows.forEach((row, idx) => {
        const categoryValue = row[categoryColumn];
        if (!categoryValue) {
          invalidCategories.push({ rowIndex: idx + 2, row, error: 'Missing category value' });
          return;
        }

        const category = normalizeCategory(categoryValue);
        if (!category) {
          invalidCategories.push({ rowIndex: idx + 2, row, error: `Unknown category: ${categoryValue}` });
          return;
        }

        if (!rowsByCategory[category]) {
          rowsByCategory[category] = [];
        }
        rowsByCategory[category].push(row);
      });

      // Import each category
      const results = {
        success: true,
        categories: {},
        totalImported: 0,
        totalFailed: invalidCategories.length,
        invalidCategories
      };

      for (const [category, categoryRows] of Object.entries(rowsByCategory)) {
        // Auto-detect mappings for this category
        const mappings = autoDetectMappings(headers, category);

        // Apply mappings and type conversion
        const mappedRows = applyMappings(categoryRows, mappings);
        const convertedRows = mappedRows.map(convertTypes);

        // Validate rows
        let validation = { valid: convertedRows.map((data, idx) => ({ rowIndex: idx + 2, data })), invalid: [] };
        if (!skipValidation) {
          validation = validateRows(convertedRows, category);
        }

        // Import valid rows
        if (mode === 'replace') {
          await PartsLibrary.clearCategory(category);
        }

        const importedParts = [];
        for (const validRow of validation.valid) {
          try {
            const part = await PartsLibrary.addPart(category, validRow.data);
            importedParts.push(part);
          } catch (error) {
            validation.invalid.push({
              rowIndex: validRow.rowIndex,
              data: validRow.data,
              errors: [error.message]
            });
          }
        }

        results.categories[category] = {
          imported: importedParts.length,
          failed: validation.invalid.length,
          invalidRows: validation.invalid
        };

        results.totalImported += importedParts.length;
        results.totalFailed += validation.invalid.length;
      }

      return results;

    } catch (error) {
      return {
        success: false,
        error: error.message,
        totalImported: 0,
        totalFailed: 0,
        categories: {}
      };
    }
  };

  /**
   * Import multi-category from Excel file
   */
  const importMultiCategoryFromExcel = async (file, options = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to CSV text
          const csvText = XLSX.utils.sheet_to_csv(worksheet);

          // Use existing multi-category CSV import logic
          const result = await importMultiCategoryCSV(csvText, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Import multi-category from file (auto-detects CSV or Excel)
   */
  const importMultiCategoryFromFile = async (file, options = {}) => {
    const fileName = file.name.toLowerCase();

    // Check if Excel file
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        throw new Error('Excel support not loaded. Please refresh the page.');
      }
      return importMultiCategoryFromExcel(file, options);
    }

    // Otherwise treat as CSV
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const result = await importMultiCategoryCSV(text, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  /**
   * Extract specs from part name (smart parsing for minimal data)
   */
  const extractSpecsFromName = (name, category) => {
    const specs = {};
    const nameLower = name.toLowerCase();

    // Extract common patterns

    // Motor KV
    const kvMatch = name.match(/(\d+)kv/i);
    if (kvMatch && category === 'motors') {
      specs.kv = parseInt(kvMatch[1]);
    }

    // Battery cells (e.g., "4S", "6S")
    const cellsMatch = name.match(/(\d+)s/i);
    if (cellsMatch && category === 'batteries') {
      specs.cells = parseInt(cellsMatch[1]);
    }

    // Battery capacity (e.g., "1300mAh", "5000mah")
    const capacityMatch = name.match(/(\d+)\s*mah/i);
    if (capacityMatch && category === 'batteries') {
      specs.capacity_mah = parseInt(capacityMatch[1]);
    }

    // Weight (e.g., "95g", "31 grams")
    const weightMatch = name.match(/(\d+\.?\d*)\s*(g|grams?)\b/i);
    if (weightMatch) {
      specs.weight_g = parseFloat(weightMatch[1]);
    }

    // Motor size (e.g., "2207", "2306")
    const motorSizeMatch = name.match(/(\d{4})/);
    if (motorSizeMatch && category === 'motors') {
      specs.size = motorSizeMatch[1];
    }

    // Frame size (e.g., "5\"", "7 inch")
    const frameSizeMatch = name.match(/(\d+)\s*("|inch|in)/i);
    if (frameSizeMatch && category === 'airframes') {
      specs.size_inch = parseInt(frameSizeMatch[1]);
    }

    return specs;
  };

  // Public API
  return {
    parseCSV,
    autoDetectMappings,
    applyMappings,
    convertTypes,
    validateRows,
    importFromCSV,
    importFromFile,
    importMultiCategoryCSV,
    importMultiCategoryFromFile,
    extractSpecsFromName,
    normalizeCategory,
    generateTemplate,
    downloadTemplate,
    exportToCSV,
    downloadCategoryCSV,
    MAPPING_TEMPLATES
  };
})();

// Export for browser global scope
window.CSVImporter = CSVImporter;
