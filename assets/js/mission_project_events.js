/**
 * Mission Project Event Bus
 * Centralized event system for cross-module data propagation
 * Ensures changes in one module automatically update dependent modules
 */

const MissionProjectEvents = (() => {
  // Event types
  const EVENTS = {
    PLATFORM_DESIGN_UPDATED: 'platform_design_updated',
    PLATFORM_DESIGN_DELETED: 'platform_design_deleted',
    MISSION_PLAN_UPDATED: 'mission_plan_updated',
    MISSION_PLAN_DELETED: 'mission_plan_deleted',
    COMMS_ANALYSIS_UPDATED: 'comms_analysis_updated',
    COMMS_ANALYSIS_DELETED: 'comms_analysis_deleted',
    MISSION_PROJECT_UPDATED: 'mission_project_updated',
    PARTS_LIBRARY_UPDATED: 'parts_library_updated',
    MAP_LOCATION_SELECTED: 'map_location_selected',
    ENV_DATA_LOADED: 'env_data_loaded'
  };

  // Event emitter using CustomEvent
  const emit = (eventType, detail = {}) => {
    const event = new CustomEvent(eventType, {
      detail: {
        timestamp: new Date().toISOString(),
        ...detail
      },
      bubbles: false,
      cancelable: false
    });

    window.dispatchEvent(event);

    // Also emit to localStorage for cross-tab sync
    localStorage.setItem('ceradon_last_event', JSON.stringify({
      type: eventType,
      detail: detail,
      timestamp: new Date().toISOString()
    }));
  };

  // Subscribe to events
  const on = (eventType, callback) => {
    const handler = (event) => {
      try {
        callback(event.detail);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    };

    window.addEventListener(eventType, handler);

    // Return unsubscribe function
    return () => {
      window.removeEventListener(eventType, handler);
    };
  };

  // Subscribe once
  const once = (eventType, callback) => {
    const unsubscribe = on(eventType, (detail) => {
      callback(detail);
      unsubscribe();
    });

    return unsubscribe;
  };

  // Cross-tab storage event listener
  const initStorageSync = () => {
    window.addEventListener('storage', (event) => {
      if (event.key === 'ceradon_platform_designs' && event.newValue !== event.oldValue) {
        emit(EVENTS.PLATFORM_DESIGN_UPDATED, {
          source: 'storage_sync',
          designs: JSON.parse(event.newValue || '[]')
        });
      }

      if (event.key === 'ceradon_mission_plans' && event.newValue !== event.oldValue) {
        emit(EVENTS.MISSION_PLAN_UPDATED, {
          source: 'storage_sync',
          plans: JSON.parse(event.newValue || '[]')
        });
      }

      if (event.key === 'ceradon_comms_analyses' && event.newValue !== event.oldValue) {
        emit(EVENTS.COMMS_ANALYSIS_UPDATED, {
          source: 'storage_sync',
          analyses: JSON.parse(event.newValue || '[]')
        });
      }

      if (event.key === 'ceradon_mission_project' && event.newValue !== event.oldValue) {
        emit(EVENTS.MISSION_PROJECT_UPDATED, {
          source: 'storage_sync',
          project: JSON.parse(event.newValue || '{}')
        });
      }
    });
  };

  // Initialize on load
  if (typeof window !== 'undefined') {
    initStorageSync();
  }

  // Public API
  return {
    EVENTS,
    emit,
    on,
    once
  };
})();

// Export for browser global scope
window.MissionProjectEvents = MissionProjectEvents;
