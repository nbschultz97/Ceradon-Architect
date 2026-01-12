/**
 * Mission Planner with Sustainment Calculator
 * Calculates battery requirements, swap schedules, and per-operator packing lists
 * Integrates with Platform Designer for mission-specific logistics
 */

const MissionPlanner = (() => {
  const STORAGE_KEY = 'cots_mission_plans';

  // Standard mission phase types
  const PHASE_TYPES = {
    ORP: 'Objective Rally Point',
    INFIL: 'Infiltration',
    ON_STATION: 'On-Station Operations',
    EXFIL: 'Exfiltration',
    CONTINGENCY: 'Contingency / Reserve'
  };

  // Terrain-based weight limits (kg per operator)
  const WEIGHT_LIMITS = {
    'urban': { standard: 25, maximum: 30 },
    'suburban': { standard: 22, maximum: 27 },
    'temperate': { standard: 20, maximum: 25 },
    'mountain': { standard: 18, maximum: 22 },
    'arctic': { standard: 15, maximum: 20 },
    'desert': { standard: 18, maximum: 23 },
    'jungle': { standard: 16, maximum: 21 }
  };

  // Operator roles
  const OPERATOR_ROLES = [
    'Team Lead',
    'UxS Pilot',
    'Payload Operator',
    'Mesh Lead',
    'Comms Specialist',
    'Medic'
  ];

  /**
   * Create empty mission plan
   */
  const createEmptyPlan = () => ({
    id: `mission-${Date.now()}`,
    name: 'Untitled Mission',
    description: '',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    duration_hours: 48,
    team: {
      size: 4,
      roles: ['Team Lead', 'UxS Pilot', 'Payload Operator', 'Mesh Lead']
    },
    terrain: 'temperate',
    phases: [],
    platforms: [], // Platform design IDs
    sustainment: null,
    packing_lists: [],
    notes: ''
  });

  /**
   * Add a mission phase
   */
  const addPhase = (plan, phase) => {
    if (!phase.id) {
      phase.id = `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const newPhase = {
      id: phase.id,
      name: phase.name || 'Unnamed Phase',
      type: phase.type || 'ON_STATION',
      duration_hours: phase.duration_hours || 1,
      activity_level: phase.activity_level || 'medium', // low, medium, high
      platforms_active: phase.platforms_active || [],
      notes: phase.notes || ''
    };

    plan.phases.push(newPhase);
    plan.modified = new Date().toISOString();

    return plan;
  };

  /**
   * Remove a phase
   */
  const removePhase = (plan, phaseId) => {
    plan.phases = plan.phases.filter(p => p.id !== phaseId);
    plan.modified = new Date().toISOString();
    return plan;
  };

  /**
   * Calculate power consumption for a phase
   */
  const calculatePhasePower = (phase, platformDesigns) => {
    let totalPowerW = 0;

    phase.platforms_active.forEach(platformId => {
      const design = platformDesigns.find(d => d.id === platformId);
      if (!design || !design.validation) return;

      const powerBudget = design.validation.metrics.power_budget_w || 0;

      // Adjust for activity level
      const activityMultiplier = {
        'low': 0.6,     // Loiter/standby
        'medium': 0.8,  // Normal operations
        'high': 1.0     // Maximum operations
      };

      totalPowerW += powerBudget * (activityMultiplier[phase.activity_level] || 0.8);
    });

    return totalPowerW;
  };

  /**
   * Calculate battery requirements for entire mission
   */
  const calculateSustainment = (plan, platformDesigns) => {
    const sustainment = {
      total_duration_hours: plan.duration_hours,
      phases: [],
      batteries_by_platform: {},
      total_batteries: 0,
      battery_swaps: [],
      weight_kg: 0,
      feasibility: {
        pass: false,
        warnings: [],
        errors: []
      }
    };

    // Group platforms by unique design
    const platformsUsed = new Set();
    plan.phases.forEach(phase => {
      phase.platforms_active.forEach(pid => platformsUsed.add(pid));
    });

    // Calculate battery needs per platform
    platformsUsed.forEach(platformId => {
      const design = platformDesigns.find(d => d.id === platformId);
      if (!design) {
        sustainment.feasibility.errors.push(
          `Platform ${platformId} not found in designs`
        );
        return;
      }

      const battery = design.components.battery;
      if (!battery) {
        sustainment.feasibility.errors.push(
          `Platform ${design.name} has no battery configured`
        );
        return;
      }

      // Calculate total hours this platform operates
      let totalOperatingHours = 0;
      plan.phases.forEach(phase => {
        if (phase.platforms_active.includes(platformId)) {
          totalOperatingHours += phase.duration_hours;
        }
      });

      // Get flight time per battery (adjusted for environment)
      const validation = design.validation;
      const flightTimeMin = validation?.metrics?.environment?.adjusted_flight_time_min ||
                           validation?.metrics?.nominal_flight_time_min ||
                           20;
      const flightTimeHours = flightTimeMin / 60;

      // Calculate batteries needed (with 20% margin)
      const batteriesNeeded = Math.ceil((totalOperatingHours / flightTimeHours) * 1.2);

      sustainment.batteries_by_platform[platformId] = {
        platform_name: design.name,
        platform_id: platformId,
        battery: {
          name: battery.name,
          capacity_wh: battery.capacity_wh,
          weight_g: battery.weight_g
        },
        flight_time_hours: flightTimeHours,
        operating_hours: totalOperatingHours,
        batteries_needed: batteriesNeeded,
        weight_kg: (battery.weight_g * batteriesNeeded) / 1000
      };

      sustainment.total_batteries += batteriesNeeded;
      sustainment.weight_kg += sustainment.batteries_by_platform[platformId].weight_kg;
    });

    // Generate battery swap schedule
    sustainment.battery_swaps = generateSwapSchedule(plan, platformDesigns, sustainment);

    // Validate feasibility
    if (sustainment.total_batteries === 0) {
      sustainment.feasibility.errors.push('No batteries calculated - check platform configurations');
    }

    if (sustainment.weight_kg > plan.team.size * 10) {
      sustainment.feasibility.warnings.push(
        `Battery weight (${sustainment.weight_kg.toFixed(1)} kg) may be excessive for ${plan.team.size} operators`
      );
    }

    sustainment.feasibility.pass = sustainment.feasibility.errors.length === 0;

    return sustainment;
  };

  /**
   * Generate battery swap schedule
   */
  const generateSwapSchedule = (plan, platformDesigns, sustainment) => {
    const swapSchedule = [];
    let currentTime = 0;

    plan.phases.forEach(phase => {
      phase.platforms_active.forEach(platformId => {
        const platformBatteries = sustainment.batteries_by_platform[platformId];
        if (!platformBatteries) return;

        const flightTimeHours = platformBatteries.flight_time_hours;
        const phaseDuration = phase.duration_hours;

        // Calculate how many swaps needed during this phase
        const swapsInPhase = Math.floor(phaseDuration / flightTimeHours);

        for (let i = 0; i < swapsInPhase; i++) {
          swapSchedule.push({
            time_hours: currentTime + (i + 1) * flightTimeHours,
            phase: phase.name,
            platform_id: platformId,
            platform_name: platformBatteries.platform_name,
            battery_number: i + 1,
            action: 'Battery swap required'
          });
        }
      });

      currentTime += phase.duration_hours;
    });

    return swapSchedule.sort((a, b) => a.time_hours - b.time_hours);
  };

  /**
   * Generate per-operator packing lists
   */
  const generatePackingLists = (plan, platformDesigns, sustainment) => {
    const packingLists = [];
    const weightLimits = WEIGHT_LIMITS[plan.terrain] || WEIGHT_LIMITS['temperate'];

    // Distribute batteries across operators
    const batteriesPerOperator = Math.ceil(sustainment.total_batteries / plan.team.size);

    plan.team.roles.forEach((role, index) => {
      const packingList = {
        operator_id: `op-${index + 1}`,
        role: role,
        items: [],
        total_weight_kg: 0,
        weight_limit_kg: weightLimits.standard,
        weight_limit_max_kg: weightLimits.maximum,
        overweight: false
      };

      // Add platform-specific batteries
      Object.values(sustainment.batteries_by_platform).forEach(platformBatt => {
        const batteriesForThisOperator = Math.min(
          batteriesPerOperator,
          platformBatt.batteries_needed
        );

        if (batteriesForThisOperator > 0) {
          packingList.items.push({
            category: 'Battery',
            name: `${platformBatt.battery.name} (${platformBatt.platform_name})`,
            quantity: batteriesForThisOperator,
            unit_weight_kg: platformBatt.battery.weight_g / 1000,
            total_weight_kg: (platformBatt.battery.weight_g * batteriesForThisOperator) / 1000
          });

          packingList.total_weight_kg += (platformBatt.battery.weight_g * batteriesForThisOperator) / 1000;

          // Reduce remaining batteries
          platformBatt.batteries_needed -= batteriesForThisOperator;
        }
      });

      // Add role-specific equipment (estimates)
      const roleEquipment = {
        'Team Lead': [
          { name: 'Tablet/Planning Device', weight_kg: 0.8 },
          { name: 'Radio (Command)', weight_kg: 0.5 },
          { name: 'Maps/References', weight_kg: 0.3 }
        ],
        'UxS Pilot': [
          { name: 'Controller', weight_kg: 0.6 },
          { name: 'FPV Goggles', weight_kg: 0.4 },
          { name: 'Spare Props/Tools', weight_kg: 0.5 }
        ],
        'Payload Operator': [
          { name: 'Payload Controller', weight_kg: 0.5 },
          { name: 'Display/Tablet', weight_kg: 0.7 }
        ],
        'Mesh Lead': [
          { name: 'Mesh Router', weight_kg: 0.4 },
          { name: 'Antennas', weight_kg: 0.6 },
          { name: 'Network Diagnostic Tools', weight_kg: 0.3 }
        ],
        'Comms Specialist': [
          { name: 'Radio Set', weight_kg: 1.2 },
          { name: 'Crypto Device', weight_kg: 0.4 }
        ],
        'Medic': [
          { name: 'Medical Kit', weight_kg: 2.5 }
        ]
      };

      const equipment = roleEquipment[role] || [];
      equipment.forEach(item => {
        packingList.items.push({
          category: 'Equipment',
          name: item.name,
          quantity: 1,
          unit_weight_kg: item.weight_kg,
          total_weight_kg: item.weight_kg
        });
        packingList.total_weight_kg += item.weight_kg;
      });

      // Check if overweight
      packingList.overweight = packingList.total_weight_kg > packingList.weight_limit_kg;
      if (packingList.total_weight_kg > packingList.weight_limit_max_kg) {
        packingList.critically_overweight = true;
      }

      packingLists.push(packingList);
    });

    return packingLists;
  };

  /**
   * Calculate complete mission logistics
   */
  const calculateMissionLogistics = (plan, platformDesigns) => {
    // Calculate sustainment
    const sustainment = calculateSustainment(plan, platformDesigns);

    // Generate packing lists
    const packingLists = generatePackingLists(plan, platformDesigns, sustainment);

    // Update plan
    plan.sustainment = sustainment;
    plan.packing_lists = packingLists;
    plan.modified = new Date().toISOString();

    // Add packing list warnings to feasibility
    packingLists.forEach(list => {
      if (list.critically_overweight) {
        sustainment.feasibility.errors.push(
          `${list.role} is critically overweight: ${list.total_weight_kg.toFixed(1)} kg > ${list.weight_limit_max_kg} kg`
        );
        sustainment.feasibility.pass = false;
      } else if (list.overweight) {
        sustainment.feasibility.warnings.push(
          `${list.role} exceeds standard load: ${list.total_weight_kg.toFixed(1)} kg > ${list.weight_limit_kg} kg`
        );
      }
    });

    return plan;
  };

  /**
   * Load all saved plans
   */
  const loadPlans = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) || [];
    } catch (error) {
      console.error('Failed to load mission plans:', error);
      return [];
    }
  };

  /**
   * Save plans
   */
  const savePlans = (plans) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  };

  /**
   * Save a single plan
   */
  const savePlan = (plan) => {
    const plans = loadPlans();
    plan.modified = new Date().toISOString();

    const index = plans.findIndex(p => p.id === plan.id);
    const isNew = index < 0;

    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }

    savePlans(plans);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.MISSION_PLAN_UPDATED, {
        plan: plan,
        isNew: isNew,
        allPlans: plans
      });
    }

    return plan;
  };

  /**
   * Get a single plan
   */
  const getPlan = (id) => {
    const plans = loadPlans();
    return plans.find(p => p.id === id) || null;
  };

  /**
   * Delete a plan
   */
  const deletePlan = (id) => {
    const plans = loadPlans();
    const filtered = plans.filter(p => p.id !== id);
    savePlans(filtered);

    // Emit event for cross-module propagation
    if (typeof MissionProjectEvents !== 'undefined') {
      MissionProjectEvents.emit(MissionProjectEvents.EVENTS.MISSION_PLAN_DELETED, {
        planId: id,
        allPlans: filtered
      });
    }

    return true;
  };

  /**
   * Export to MissionProject format
   */
  const exportToMissionProject = (plan, platformDesigns) => {
    const missionProject = MissionProjectStore.loadMissionProject();

    // Update mission phases
    missionProject.mission.phases = plan.phases.map(phase => ({
      id: phase.id,
      name: phase.name,
      durationHours: phase.duration_hours,
      focus: phase.type,
      origin_tool: 'mission_planner'
    }));

    // Update meta
    missionProject.meta.name = plan.name;
    missionProject.meta.durationHours = plan.duration_hours;
    missionProject.meta.team = plan.team;

    // Update sustainment
    if (plan.sustainment) {
      missionProject.sustainment.sustainmentHours = plan.duration_hours;
      missionProject.sustainment.batteryCounts = plan.sustainment.total_batteries;
      missionProject.sustainment.packing_lists = plan.packing_lists;
      missionProject.sustainment.feasibility = plan.sustainment.feasibility;
    }

    // Add platforms
    missionProject.platforms = platformDesigns.map(design =>
      PlatformDesigner.exportToMissionProject(design)
    );

    return missionProject;
  };

  /**
   * Download packing list as CSV
   */
  const downloadPackingList = (packingList, fileName = null) => {
    const csvLines = [
      'Category,Item,Quantity,Unit Weight (kg),Total Weight (kg)'
    ];

    packingList.items.forEach(item => {
      csvLines.push([
        item.category,
        item.name,
        item.quantity,
        item.unit_weight_kg.toFixed(2),
        item.total_weight_kg.toFixed(2)
      ].join(','));
    });

    // Add totals
    csvLines.push('');
    csvLines.push(`TOTAL,,,${packingList.total_weight_kg.toFixed(2)}`);
    csvLines.push(`LIMIT,,,${packingList.weight_limit_kg.toFixed(2)}`);
    csvLines.push(`STATUS,,,${packingList.overweight ? 'OVERWEIGHT' : 'OK'}`);

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `packing_list_${packingList.role.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Download mission plan as JSON
   */
  const downloadPlan = (plan, fileName = null) => {
    const json = JSON.stringify(plan, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${plan.name.replace(/\s+/g, '_')}_mission_plan.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Generate mission summary report
   */
  const generateSummaryReport = (plan) => {
    const lines = [];

    lines.push('MISSION SUMMARY REPORT');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Mission: ${plan.name}`);
    lines.push(`Duration: ${plan.duration_hours} hours`);
    lines.push(`Terrain: ${plan.terrain}`);
    lines.push(`Team Size: ${plan.team.size} operators`);
    lines.push('');

    lines.push('PHASES:');
    plan.phases.forEach((phase, idx) => {
      lines.push(`  ${idx + 1}. ${phase.name} (${phase.type})`);
      lines.push(`     Duration: ${phase.duration_hours} hours`);
      lines.push(`     Activity: ${phase.activity_level}`);
    });
    lines.push('');

    if (plan.sustainment) {
      lines.push('SUSTAINMENT:');
      lines.push(`  Total Batteries: ${plan.sustainment.total_batteries}`);
      lines.push(`  Battery Weight: ${plan.sustainment.weight_kg.toFixed(1)} kg`);
      lines.push(`  Battery Swaps: ${plan.sustainment.battery_swaps.length}`);
      lines.push('');

      lines.push('BATTERY REQUIREMENTS BY PLATFORM:');
      Object.values(plan.sustainment.batteries_by_platform).forEach(pb => {
        lines.push(`  ${pb.platform_name}:`);
        lines.push(`    Batteries: ${pb.batteries_needed}`);
        lines.push(`    Weight: ${pb.weight_kg.toFixed(1)} kg`);
        lines.push(`    Flight Time: ${(pb.flight_time_hours * 60).toFixed(0)} min`);
      });
      lines.push('');
    }

    if (plan.packing_lists && plan.packing_lists.length > 0) {
      lines.push('OPERATOR LOADS:');
      plan.packing_lists.forEach(list => {
        const status = list.critically_overweight ? 'CRITICAL' :
                      list.overweight ? 'WARNING' : 'OK';
        lines.push(`  ${list.role}: ${list.total_weight_kg.toFixed(1)} kg [${status}]`);
      });
      lines.push('');
    }

    if (plan.sustainment && plan.sustainment.feasibility) {
      lines.push('FEASIBILITY:');
      lines.push(`  Status: ${plan.sustainment.feasibility.pass ? 'PASS' : 'FAIL'}`);

      if (plan.sustainment.feasibility.errors.length > 0) {
        lines.push('  Errors:');
        plan.sustainment.feasibility.errors.forEach(err => {
          lines.push(`    - ${err}`);
        });
      }

      if (plan.sustainment.feasibility.warnings.length > 0) {
        lines.push('  Warnings:');
        plan.sustainment.feasibility.warnings.forEach(warn => {
          lines.push(`    - ${warn}`);
        });
      }
    }

    return lines.join('\n');
  };

  /**
   * Download summary report
   */
  const downloadSummaryReport = (plan, fileName = null) => {
    const report = generateSummaryReport(plan);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `${plan.name.replace(/\s+/g, '_')}_summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Auto-update mission plans when platform designs change
   */
  const initPlatformDesignListener = () => {
    if (typeof MissionProjectEvents === 'undefined') return;

    MissionProjectEvents.on(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_UPDATED, (detail) => {
      // Reload all mission plans and recalculate logistics if they reference updated platforms
      const plans = loadPlans();
      const updatedDesign = detail.design;

      plans.forEach(plan => {
        // Check if this plan uses the updated platform
        if (plan.platforms && plan.platforms.includes(updatedDesign.id)) {
          // Recalculate logistics with updated design
          const allDesigns = typeof PlatformDesigner !== 'undefined'
            ? PlatformDesigner.loadDesigns()
            : detail.allDesigns || [];

          const platformDesigns = allDesigns.filter(d => plan.platforms.includes(d.id));

          if (platformDesigns.length > 0) {
            calculateMissionLogistics(plan, platformDesigns);
            savePlan(plan);

            console.log(`[MissionPlanner] Auto-updated plan "${plan.name}" due to platform design change`);

            // Show toast notification
            if (typeof UIFeedback !== 'undefined') {
              UIFeedback.Toast.sync(
                `Mission "${plan.name}" updated — Recalculated batteries and packing lists`,
                5000
              );
            }
          }
        }
      });
    });

    MissionProjectEvents.on(MissionProjectEvents.EVENTS.PLATFORM_DESIGN_DELETED, (detail) => {
      // Remove deleted platform from mission plans
      const plans = loadPlans();
      const deletedPlatformId = detail.designId;

      plans.forEach(plan => {
        if (plan.platforms && plan.platforms.includes(deletedPlatformId)) {
          plan.platforms = plan.platforms.filter(id => id !== deletedPlatformId);

          // Recalculate logistics
          const allDesigns = typeof PlatformDesigner !== 'undefined'
            ? PlatformDesigner.loadDesigns()
            : detail.allDesigns || [];

          const platformDesigns = allDesigns.filter(d => plan.platforms.includes(d.id));

          if (platformDesigns.length > 0) {
            calculateMissionLogistics(plan, platformDesigns);
          } else {
            // No platforms left, clear sustainment
            plan.sustainment = null;
            plan.packing_lists = [];
          }

          savePlan(plan);
          console.log(`[MissionPlanner] Removed deleted platform from plan "${plan.name}"`);

          // Show toast notification
          if (typeof UIFeedback !== 'undefined') {
            UIFeedback.Toast.warning(
              `Platform removed from mission "${plan.name}" — Logistics updated`,
              5000
            );
          }
        }
      });
    });
  };

  // Initialize listeners on load
  if (typeof window !== 'undefined') {
    setTimeout(initPlatformDesignListener, 100); // Wait for MissionProjectEvents to load
  }

  // Public API
  return {
    PHASE_TYPES,
    WEIGHT_LIMITS,
    OPERATOR_ROLES,
    createEmptyPlan,
    addPhase,
    removePhase,
    calculateSustainment,
    generatePackingLists,
    calculateMissionLogistics,
    loadPlans,
    savePlan,
    getPlan,
    deletePlan,
    exportToMissionProject,
    downloadPackingList,
    downloadPlan,
    generateSummaryReport,
    downloadSummaryReport,
    initPlatformDesignListener
  };
})();

// Export for browser global scope
window.MissionPlanner = MissionPlanner;
