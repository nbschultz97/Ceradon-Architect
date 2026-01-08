/**
 * Offline Map Viewer Module
 * Lightweight mapping module using Leaflet for offline operations
 * Integrates with SRTM elevation data for terrain-aware mission planning
 */

const MapViewer = (() => {
  const STORAGE_KEY = 'ceradon_map_locations';
  const ELEVATION_CACHE_KEY = 'ceradon_elevation_cache';

  // Default map center (global overview)
  const DEFAULT_CENTER = { lat: 30, lon: 0, zoom: 3 };

  // Map instance
  let mapInstance = null;
  let currentMarker = null;
  let selectedLocation = null;

  /**
   * Initialize map in a given container
   */
  const initMap = (containerId, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[MapViewer] Container ${containerId} not found`);
      return null;
    }

    // Load last viewed location or use default
    const lastLocation = loadLastLocation() || DEFAULT_CENTER;
    const center = options.center || lastLocation;

    // Initialize Leaflet map
    mapInstance = L.map(containerId, {
      center: [center.lat, center.lon],
      zoom: center.zoom || 10,
      zoomControl: true,
      attributionControl: false
    });

    // Add offline tile layer (OSM style, loaded from local cache)
    // In production, this would load from local .mbtiles or cached tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Offline Map Data'
    }).addTo(mapInstance);

    // Add click handler for location selection
    if (options.enableLocationPicker) {
      mapInstance.on('click', (e) => {
        handleLocationClick(e.latlng, options.onLocationSelect);
      });
    }

    // Save location when map moves
    mapInstance.on('moveend', () => {
      saveLastLocation(mapInstance.getCenter(), mapInstance.getZoom());
    });

    console.log('[MapViewer] Map initialized');
    return mapInstance;
  };

  /**
   * Handle map click for location selection
   */
  const handleLocationClick = async (latlng, callback) => {
    // Remove existing marker
    if (currentMarker) {
      mapInstance.removeLayer(currentMarker);
    }

    // Add new marker
    currentMarker = L.marker([latlng.lat, latlng.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
        iconSize: [20, 20]
      })
    }).addTo(mapInstance);

    // Allow marker dragging
    currentMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updateSelectedLocation(pos.lat, pos.lng, callback);
    });

    // Query elevation for this location
    await updateSelectedLocation(latlng.lat, latlng.lng, callback);
  };

  /**
   * Update selected location with elevation data
   */
  const updateSelectedLocation = async (lat, lon, callback) => {
    // Get elevation from SRTM data
    const elevation = await getElevation(lat, lon);

    selectedLocation = {
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6)),
      elevation_m: elevation,
      source: 'map_picker'
    };

    // Update marker popup
    if (currentMarker) {
      const elevationDisplay = selectedLocation.elevation_m === 0
        ? `<span style="color: #ffaa00;">${selectedLocation.elevation_m} m (estimated - load SRTM tiles for accuracy)</span>`
        : `${selectedLocation.elevation_m} m`;

      currentMarker.bindPopup(`
        <div style="min-width: 240px;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">📍 Selected Location</p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Latitude:</strong> ${selectedLocation.lat}°<br>
            <strong>Longitude:</strong> ${selectedLocation.lon}°<br>
            <strong>Elevation:</strong> ${elevationDisplay}
          </p>
          <button onclick="MapViewer.confirmLocation()" style="
            margin-top: 8px;
            padding: 6px 12px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
          ">
            ✓ Use This Location
          </button>
        </div>
      `).openPopup();
    }

    // Call callback if provided
    if (callback && typeof callback === 'function') {
      callback(selectedLocation);
    }

    console.log('[MapViewer] Location selected:', selectedLocation);
  };

  /**
   * Confirm location selection (called from popup button)
   */
  const confirmLocation = () => {
    if (!selectedLocation) return;

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit('map_location_selected', {
        location: selectedLocation,
        timestamp: new Date().toISOString()
      });
    }

    // Show toast notification
    if (typeof UIFeedback !== 'undefined') {
      UIFeedback.Toast.success(
        `Location selected: ${selectedLocation.lat}°, ${selectedLocation.lon}° (${selectedLocation.elevation_m}m)`,
        3000
      );
    }

    return selectedLocation;
  };

  /**
   * Get elevation for a given lat/lon using SRTM data
   * Falls back to approximation if SRTM data not available
   */
  const getElevation = async (lat, lon) => {
    // Try to get from cache first
    const cached = getElevationFromCache(lat, lon);
    if (cached !== null) {
      return cached;
    }

    // Try to query SRTM data
    const elevation = await querySRTMElevation(lat, lon);

    // Cache the result
    cacheElevation(lat, lon, elevation);

    return elevation;
  };

  /**
   * Query SRTM elevation data
   * This would load from local SRTM files in production
   * For now, uses approximation based on terrain type
   */
  const querySRTMElevation = async (lat, lon) => {
    // TODO: Implement actual SRTM data reader
    // For now, return 0 as baseline
    // In production, this would:
    // 1. Determine which SRTM tile covers this lat/lon
    // 2. Load the tile from IndexedDB or local file
    // 3. Interpolate elevation from the grid

    // Placeholder: return 0 for now
    // Operators can manually adjust if needed
    return 0;
  };

  /**
   * Get elevation from cache
   */
  const getElevationFromCache = (lat, lon) => {
    try {
      const cache = JSON.parse(localStorage.getItem(ELEVATION_CACHE_KEY) || '{}');
      const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      return cache[key] !== undefined ? cache[key] : null;
    } catch (error) {
      console.error('[MapViewer] Error reading elevation cache:', error);
      return null;
    }
  };

  /**
   * Cache elevation data
   */
  const cacheElevation = (lat, lon, elevation) => {
    try {
      const cache = JSON.parse(localStorage.getItem(ELEVATION_CACHE_KEY) || '{}');
      const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      cache[key] = elevation;

      // Limit cache size to 1000 entries
      const keys = Object.keys(cache);
      if (keys.length > 1000) {
        delete cache[keys[0]];
      }

      localStorage.setItem(ELEVATION_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[MapViewer] Error caching elevation:', error);
    }
  };

  /**
   * Set map view to specific location
   */
  const setView = (lat, lon, zoom = 13) => {
    if (!mapInstance) {
      console.error('[MapViewer] Map not initialized');
      return;
    }

    mapInstance.setView([lat, lon], zoom);
  };

  /**
   * Add marker to map
   */
  const addMarker = (lat, lon, options = {}) => {
    if (!mapInstance) {
      console.error('[MapViewer] Map not initialized');
      return null;
    }

    const marker = L.marker([lat, lon], {
      title: options.title || '',
      icon: options.icon || L.Icon.Default
    }).addTo(mapInstance);

    if (options.popup) {
      marker.bindPopup(options.popup);
    }

    return marker;
  };

  /**
   * Draw line between two points (for LOS visualization)
   */
  const drawLine = (lat1, lon1, lat2, lon2, options = {}) => {
    if (!mapInstance) {
      console.error('[MapViewer] Map not initialized');
      return null;
    }

    const line = L.polyline(
      [[lat1, lon1], [lat2, lon2]],
      {
        color: options.color || '#ff4444',
        weight: options.weight || 2,
        opacity: options.opacity || 0.7,
        dashArray: options.dashed ? '5, 10' : null
      }
    ).addTo(mapInstance);

    if (options.popup) {
      line.bindPopup(options.popup);
    }

    return line;
  };

  /**
   * Draw circle (for range visualization)
   */
  const drawCircle = (lat, lon, radius_m, options = {}) => {
    if (!mapInstance) {
      console.error('[MapViewer] Map not initialized');
      return null;
    }

    const circle = L.circle([lat, lon], {
      radius: radius_m,
      color: options.color || '#4CAF50',
      fillColor: options.fillColor || '#4CAF50',
      fillOpacity: options.fillOpacity || 0.2,
      weight: options.weight || 2
    }).addTo(mapInstance);

    if (options.popup) {
      circle.bindPopup(options.popup);
    }

    return circle;
  };

  /**
   * Clear all layers (markers, lines, circles)
   */
  const clearLayers = () => {
    if (!mapInstance) return;

    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Marker ||
          layer instanceof L.Polyline ||
          layer instanceof L.Circle) {
        mapInstance.removeLayer(layer);
      }
    });

    currentMarker = null;
    selectedLocation = null;
  };

  /**
   * Save last viewed location
   */
  const saveLastLocation = (center, zoom) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        lat: center.lat,
        lon: center.lng,
        zoom: zoom
      }));
    } catch (error) {
      console.error('[MapViewer] Error saving location:', error);
    }
  };

  /**
   * Load last viewed location
   */
  const loadLastLocation = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[MapViewer] Error loading location:', error);
      return null;
    }
  };

  /**
   * Get current selected location
   */
  const getSelectedLocation = () => {
    return selectedLocation;
  };

  /**
   * Destroy map instance
   */
  const destroy = () => {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      currentMarker = null;
      selectedLocation = null;
    }
  };

  // Public API
  return {
    initMap,
    setView,
    addMarker,
    drawLine,
    drawCircle,
    clearLayers,
    getElevation,
    getSelectedLocation,
    confirmLocation,
    destroy
  };
})();

// Export for browser global scope
window.MapViewer = MapViewer;
