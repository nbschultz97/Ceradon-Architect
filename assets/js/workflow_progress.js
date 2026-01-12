/**
 * Workflow Progress Tracker
 * Monitors module completion status and updates progress bar
 */

const WorkflowProgress = (() => {
  const STORAGE_KEY = 'cots_workflow_progress';

  // Module state enum
  const ModuleState = {
    EMPTY: 'empty',
    DRAFT: 'draft',
    COMPLETED: 'completed'
  };

  /**
   * Get current workflow state from storage
   */
  const getWorkflowState = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        library: ModuleState.EMPTY,
        platform: ModuleState.EMPTY,
        mission: ModuleState.EMPTY,
        comms: ModuleState.EMPTY,
        export: ModuleState.EMPTY
      };
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load workflow state:', error);
      return {
        library: ModuleState.EMPTY,
        platform: ModuleState.EMPTY,
        mission: ModuleState.EMPTY,
        comms: ModuleState.EMPTY,
        export: ModuleState.EMPTY
      };
    }
  };

  /**
   * Save workflow state to storage
   */
  const saveWorkflowState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  /**
   * Update module state
   */
  const updateModuleState = (module, state) => {
    const workflowState = getWorkflowState();
    workflowState[module] = state;
    saveWorkflowState(workflowState);
    updateProgressBar();
  };

  /**
   * Check module status based on stored data
   */
  const checkModuleStatus = (module) => {
    switch (module) {
      case 'library': {
        // Check if parts library has items
        const partsKey = 'cots_parts_library';
        const stored = localStorage.getItem(partsKey);
        if (!stored) return ModuleState.EMPTY;

        try {
          const data = JSON.parse(stored);
          const totalParts = Object.values(data).reduce((sum, cat) => sum + (Array.isArray(cat) ? cat.length : 0), 0);
          return totalParts > 0 ? ModuleState.COMPLETED : ModuleState.EMPTY;
        } catch {
          return ModuleState.EMPTY;
        }
      }

      case 'platform': {
        // Check if platform designs exist
        const platformKey = 'cots_platform_designs';
        const stored = localStorage.getItem(platformKey);
        if (!stored) return ModuleState.EMPTY;

        try {
          const designs = JSON.parse(stored);
          if (!Array.isArray(designs) || designs.length === 0) return ModuleState.EMPTY;

          // Check if any design has been validated (has validation field)
          const hasValidated = designs.some(d => d.validation !== null && d.validation !== undefined);
          return hasValidated ? ModuleState.COMPLETED : ModuleState.DRAFT;
        } catch {
          return ModuleState.EMPTY;
        }
      }

      case 'mission': {
        // Check if mission plans exist
        const missionKey = 'cots_mission_plans';
        const stored = localStorage.getItem(missionKey);
        if (!stored) return ModuleState.EMPTY;

        try {
          const plans = JSON.parse(stored);
          if (!Array.isArray(plans) || plans.length === 0) return ModuleState.EMPTY;

          // Check if any plan has logistics calculated
          const hasLogistics = plans.some(p => p.sustainment && p.sustainment.total_batteries);
          return hasLogistics ? ModuleState.COMPLETED : ModuleState.DRAFT;
        } catch {
          return ModuleState.EMPTY;
        }
      }

      case 'comms': {
        // Check if comms analyses exist
        const commsKey = 'cots_comms_analyses';
        const stored = localStorage.getItem(commsKey);
        if (!stored) return ModuleState.EMPTY;

        try {
          const analyses = JSON.parse(stored);
          if (!Array.isArray(analyses) || analyses.length === 0) return ModuleState.EMPTY;

          // Check if any analysis has been run (has links)
          const hasLinks = analyses.some(a => a.links && a.links.length > 0);
          return hasLinks ? ModuleState.COMPLETED : ModuleState.DRAFT;
        } catch {
          return ModuleState.EMPTY;
        }
      }

      case 'export': {
        // Check if MissionProject exists
        const projectKey = 'MissionProject';
        const stored = localStorage.getItem(projectKey);
        if (!stored) return ModuleState.EMPTY;

        try {
          const project = JSON.parse(stored);
          // Check if project has meaningful data
          const hasPlatforms = project.platforms && project.platforms.length > 0;
          const hasMission = project.mission && project.mission.tasks && project.mission.tasks.length > 0;

          if (hasPlatforms || hasMission) {
            return ModuleState.COMPLETED;
          }
          return ModuleState.EMPTY;
        } catch {
          return ModuleState.EMPTY;
        }
      }

      default:
        return ModuleState.EMPTY;
    }
  };

  /**
   * Auto-detect all module states
   */
  const autoDetectStates = () => {
    const state = {
      library: checkModuleStatus('library'),
      platform: checkModuleStatus('platform'),
      mission: checkModuleStatus('mission'),
      comms: checkModuleStatus('comms'),
      export: checkModuleStatus('export')
    };
    saveWorkflowState(state);
    return state;
  };

  /**
   * Update progress bar UI
   */
  const updateProgressBar = () => {
    const state = getWorkflowState();

    Object.keys(state).forEach(module => {
      const stepEl = document.querySelector(`.progress-step[data-module="${module}"]`);
      if (!stepEl) return;

      // Remove all state classes
      stepEl.classList.remove('empty', 'draft', 'completed');

      // Add current state class
      stepEl.classList.add(state[module]);
    });
  };

  /**
   * Handle click on progress step to navigate to module
   */
  const handleProgressStepClick = (module) => {
    const routes = {
      library: '#/library',
      platform: '#/platform',
      mission: '#/mission',
      comms: '#/comms',
      export: '#/export'
    };

    if (routes[module]) {
      window.location.hash = routes[module];
    }
  };

  /**
   * Initialize progress tracker
   */
  const init = () => {
    // Auto-detect states on init
    autoDetectStates();
    updateProgressBar();

    // Add click listeners to progress steps
    document.querySelectorAll('.progress-step').forEach(stepEl => {
      const module = stepEl.dataset.module;
      if (module) {
        stepEl.addEventListener('click', () => handleProgressStepClick(module));
      }
    });

    // Listen to storage changes to update progress
    window.addEventListener('storage', (e) => {
      if (e.key && ((e.key.includes('cots') || e.key.includes('ceradon')) || e.key === 'MissionProject')) {
        autoDetectStates();
        updateProgressBar();
      }
    });

    // Listen to custom events from modules
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.on(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_UPDATED, () => {
        autoDetectStates();
        updateProgressBar();
      });

      MissionProjectEvents.on(MissionProjectEvents.EVENTS.MISSION_PLAN_UPDATED, () => {
        autoDetectStates();
        updateProgressBar();
      });
    }

    // Periodic check every 2 seconds
    setInterval(() => {
      autoDetectStates();
      updateProgressBar();
    }, 2000);
  };

  // Public API
  return {
    init,
    updateModuleState,
    getWorkflowState,
    ModuleState,
    checkModuleStatus,
    updateProgressBar
  };
})();
