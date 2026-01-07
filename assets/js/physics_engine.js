/**
 * Physics Validation Engine
 * Validates platform designs against real-world physics constraints
 * Includes environmental derating for altitude and temperature
 */

const PhysicsEngine = (() => {
  // Constants
  const GRAVITY = 9.81; // m/s²
  const SEA_LEVEL_AIR_DENSITY = 1.225; // kg/m³
  const STANDARD_TEMP_K = 288.15; // Standard temperature in Kelvin (15°C)
  const LAPSE_RATE = 0.0065; // Temperature lapse rate (K/m)

  /**
   * Calculate air density at altitude
   * Uses ISA (International Standard Atmosphere) model
   */
  const calculateAirDensity = (altitudeM, temperatureC = 15) => {
    // Convert temperature to Kelvin
    const tempK = temperatureC + 273.15;

    // Calculate pressure ratio using barometric formula
    const pressureRatio = Math.pow(1 - (LAPSE_RATE * altitudeM / STANDARD_TEMP_K), 5.255);

    // Calculate temperature ratio
    const tempRatio = tempK / STANDARD_TEMP_K;

    // Air density = sea level density * pressure ratio / temperature ratio
    const density = SEA_LEVEL_AIR_DENSITY * (pressureRatio / tempRatio);

    return density;
  };

  /**
   * Calculate thrust reduction due to altitude
   * Propeller thrust is proportional to air density
   */
  const calculateThrustReduction = (altitudeM, temperatureC = 15) => {
    const seaLevelDensity = SEA_LEVEL_AIR_DENSITY;
    const altitudeDensity = calculateAirDensity(altitudeM, temperatureC);

    const reductionRatio = altitudeDensity / seaLevelDensity;
    const reductionPercent = (1 - reductionRatio) * 100;

    return {
      ratio: reductionRatio,
      reductionPercent: reductionPercent
    };
  };

  /**
   * Calculate battery capacity reduction due to temperature
   * Li-ion/LiPo batteries lose capacity in cold weather
   */
  const calculateBatteryDerating = (temperatureC, chemistry = 'LiPo') => {
    let derating = 1.0; // Default: no derating

    // Temperature derating models
    if (temperatureC < 20 && temperatureC >= -10) {
      // Mild cold: -1% capacity per degree below 20°C
      derating = 1 - (0.01 * (20 - temperatureC));
    } else if (temperatureC < -10) {
      // Severe cold: Base 30% reduction + additional -2% per degree below -10°C
      const baseLoss = 0.30;
      const additionalLoss = 0.02 * (-10 - temperatureC);
      derating = 1 - (baseLoss + additionalLoss);
    } else if (temperatureC > 40) {
      // High temperature: Reduced discharge capability
      // -0.5% per degree above 40°C
      derating = 1 - (0.005 * (temperatureC - 40));
    }

    // Ensure minimum 20% capacity even in extreme conditions
    derating = Math.max(derating, 0.2);

    return {
      deratingFactor: derating,
      capacityReduction: (1 - derating) * 100
    };
  };

  /**
   * Calculate All-Up Weight (AUW)
   */
  const calculateAUW = (components) => {
    let totalWeight = 0;

    // Sum all component weights
    if (components.airframe) totalWeight += components.airframe.weight_g || 0;

    if (components.motors && Array.isArray(components.motors)) {
      components.motors.forEach(motor => {
        totalWeight += motor.weight_g || 0;
      });
    }

    if (components.escs) totalWeight += components.escs.weight_g || 0;
    if (components.battery) totalWeight += components.battery.weight_g || 0;
    if (components.flight_controller) totalWeight += components.flight_controller.weight_g || 0;

    if (components.radios && Array.isArray(components.radios)) {
      components.radios.forEach(radio => {
        totalWeight += radio.weight_g || 0;
      });
    }

    if (components.sensors && Array.isArray(components.sensors)) {
      components.sensors.forEach(sensor => {
        totalWeight += sensor.weight_g || 0;
      });
    }

    if (components.accessories && Array.isArray(components.accessories)) {
      components.accessories.forEach(accessory => {
        totalWeight += accessory.weight_g || 0;
      });
    }

    return totalWeight;
  };

  /**
   * Calculate total thrust output
   */
  const calculateTotalThrust = (motors) => {
    if (!motors || !Array.isArray(motors)) return 0;

    return motors.reduce((total, motor) => {
      return total + (motor.max_thrust_g || 0);
    }, 0);
  };

  /**
   * Calculate Thrust-to-Weight Ratio
   */
  const calculateThrustToWeight = (totalThrustG, auwG) => {
    if (auwG === 0) return 0;
    return totalThrustG / auwG;
  };

  /**
   * Calculate power budget
   */
  const calculatePowerBudget = (components) => {
    let totalPower = 0;

    // Motors (estimate based on max power or assume 80% of max thrust power)
    if (components.motors && Array.isArray(components.motors)) {
      components.motors.forEach(motor => {
        if (motor.max_power_w) {
          totalPower += motor.max_power_w || 0;
        } else if (motor.max_current_a && components.battery) {
          // Estimate: P = I * V
          totalPower += motor.max_current_a * components.battery.voltage_nominal_v;
        }
      });
    }

    // Flight controller
    if (components.flight_controller && components.flight_controller.current_draw_ma) {
      const fcPower = (components.flight_controller.current_draw_ma / 1000) *
                      (components.battery ? components.battery.voltage_nominal_v : 12);
      totalPower += fcPower;
    }

    // Radios
    if (components.radios && Array.isArray(components.radios)) {
      components.radios.forEach(radio => {
        totalPower += radio.power_consumption_w || 0;
      });
    }

    // Sensors
    if (components.sensors && Array.isArray(components.sensors)) {
      components.sensors.forEach(sensor => {
        totalPower += sensor.power_consumption_w || 0;
      });
    }

    return totalPower;
  };

  /**
   * Estimate flight time
   * Based on battery capacity and average power draw
   */
  const estimateFlightTime = (battery, powerBudgetW, efficiency = 0.85, doD = 0.8) => {
    if (!battery || !battery.capacity_wh || powerBudgetW === 0) {
      return 0;
    }

    // Available energy = capacity * depth of discharge
    const availableEnergyWh = battery.capacity_wh * doD;

    // Usable energy after efficiency losses
    const usableEnergyWh = availableEnergyWh * efficiency;

    // Flight time = usable energy / power draw
    // Convert to minutes
    const flightTimeHours = usableEnergyWh / powerBudgetW;
    const flightTimeMinutes = flightTimeHours * 60;

    return Math.max(0, flightTimeMinutes);
  };

  /**
   * Validate platform design
   */
  const validatePlatform = (components, environment = {}) => {
    const validation = {
      pass: false,
      warnings: [],
      errors: [],
      metrics: {},
      recommendations: []
    };

    // Extract environment parameters
    const altitudeM = environment.altitude_m || 0;
    const temperatureC = environment.temperature_c || 15;
    const platformType = components.airframe?.type || 'multi-rotor';

    // Calculate metrics
    const auw = calculateAUW(components);
    const totalThrust = calculateTotalThrust(components.motors);
    const thrustToWeight = calculateThrustToWeight(totalThrust, auw);
    const powerBudget = calculatePowerBudget(components);

    // Environmental derating
    const thrustDerating = calculateThrustReduction(altitudeM, temperatureC);
    const batteryDerating = calculateBatteryDerating(temperatureC, components.battery?.chemistry);

    // Adjusted metrics
    const adjustedThrust = totalThrust * thrustDerating.ratio;
    const adjustedTW = calculateThrustToWeight(adjustedThrust, auw);

    let adjustedBattery = null;
    if (components.battery) {
      adjustedBattery = {
        ...components.battery,
        capacity_wh: (components.battery.capacity_wh || 0) * batteryDerating.deratingFactor
      };
    }

    const nominalFlightTime = estimateFlightTime(components.battery, powerBudget);
    const adjustedFlightTime = estimateFlightTime(adjustedBattery, powerBudget);

    // Store metrics
    validation.metrics = {
      auw_g: auw,
      auw_kg: auw / 1000,
      total_thrust_g: totalThrust,
      thrust_to_weight: thrustToWeight,
      power_budget_w: powerBudget,
      nominal_flight_time_min: nominalFlightTime,
      environment: {
        altitude_m: altitudeM,
        temperature_c: temperatureC,
        thrust_reduction_pct: thrustDerating.reductionPercent,
        battery_capacity_reduction_pct: batteryDerating.capacityReduction,
        adjusted_thrust_g: adjustedThrust,
        adjusted_thrust_to_weight: adjustedTW,
        adjusted_flight_time_min: adjustedFlightTime
      }
    };

    // Validation rules
    const minTW = platformType === 'multi-rotor' ? 2.0 : 1.2;
    const minAdjustedTW = platformType === 'multi-rotor' ? 1.5 : 1.0;

    // Check thrust-to-weight ratio
    if (thrustToWeight < minTW) {
      validation.errors.push(
        `Thrust-to-weight ratio (${thrustToWeight.toFixed(2)}) is below minimum (${minTW}) for ${platformType}`
      );
    } else if (thrustToWeight < minTW + 0.3) {
      validation.warnings.push(
        `Thrust-to-weight ratio (${thrustToWeight.toFixed(2)}) is marginal. Recommend ${minTW + 0.5} or higher.`
      );
    }

    // Check adjusted T/W with environmental factors
    if (adjustedTW < minAdjustedTW) {
      validation.errors.push(
        `Adjusted T/W (${adjustedTW.toFixed(2)}) at ${altitudeM}m altitude is insufficient. Consider more powerful motors.`
      );
    }

    // Check battery capacity
    if (!components.battery || !components.battery.capacity_wh) {
      validation.errors.push('No battery selected');
    }

    // Check flight time
    if (nominalFlightTime < 5) {
      validation.errors.push('Estimated flight time is too short (< 5 minutes)');
    } else if (nominalFlightTime < 10) {
      validation.warnings.push('Flight time is short (< 10 minutes). Consider larger battery.');
    }

    if (adjustedFlightTime < nominalFlightTime * 0.5) {
      validation.warnings.push(
        `Environmental conditions reduce flight time by ${((1 - adjustedFlightTime / nominalFlightTime) * 100).toFixed(0)}%`
      );
    }

    // Check payload capacity
    if (components.airframe && components.airframe.max_payload_g) {
      const payload = auw - (components.airframe.weight_g || 0);
      if (payload > components.airframe.max_payload_g) {
        validation.errors.push(
          `Payload (${payload}g) exceeds airframe capacity (${components.airframe.max_payload_g}g)`
        );
      }
    }

    // Check motor/ESC compatibility
    if (components.motors && components.escs) {
      const maxMotorCurrent = Math.max(...components.motors.map(m => m.max_current_a || 0));
      const escCurrent = components.escs.max_current_a || 0;

      if (maxMotorCurrent > escCurrent) {
        validation.errors.push(
          `Motor max current (${maxMotorCurrent}A) exceeds ESC rating (${escCurrent}A)`
        );
      }
    }

    // Check battery discharge capability
    if (components.battery && components.battery.max_discharge_a && powerBudget > 0) {
      const estimatedCurrent = powerBudget / components.battery.voltage_nominal_v;
      if (estimatedCurrent > components.battery.max_discharge_a) {
        validation.warnings.push(
          `Estimated current draw (${estimatedCurrent.toFixed(1)}A) may exceed battery discharge limit (${components.battery.max_discharge_a}A)`
        );
      }
    }

    // Generate recommendations
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      validation.recommendations.push('Platform design looks good!');
    } else {
      if (thrustToWeight < minTW) {
        validation.recommendations.push('Increase motor size/KV or reduce weight');
      }
      if (nominalFlightTime < 10) {
        validation.recommendations.push('Use a larger battery for longer flight time');
      }
      if (adjustedFlightTime < 8) {
        validation.recommendations.push('Consider altitude/temperature effects - add 20% battery margin');
      }
    }

    // Overall pass/fail
    validation.pass = validation.errors.length === 0;

    return validation;
  };

  /**
   * Calculate battery requirements for mission duration
   */
  const calculateBatteryRequirements = (platformConfig, missionDurationHours, environment = {}) => {
    const powerBudget = calculatePowerBudget(platformConfig.components);
    const battery = platformConfig.components.battery;

    if (!battery) {
      return {
        error: 'No battery configured'
      };
    }

    // Apply environmental derating
    const batteryDerating = calculateBatteryDerating(
      environment.temperature_c || 15,
      battery.chemistry
    );

    const effectiveCapacity = battery.capacity_wh * batteryDerating.deratingFactor;

    // Calculate flight time per battery
    const flightTimePerBattery = estimateFlightTime(
      { capacity_wh: effectiveCapacity },
      powerBudget
    );

    // Convert mission duration to minutes
    const missionDurationMin = missionDurationHours * 60;

    // Calculate number of batteries needed
    // Add 20% margin for safety
    const batteriesNeeded = Math.ceil((missionDurationMin / flightTimePerBattery) * 1.2);

    return {
      flight_time_per_battery_min: flightTimePerBattery,
      batteries_needed: batteriesNeeded,
      total_mission_time_min: missionDurationMin,
      effective_capacity_wh: effectiveCapacity,
      capacity_reduction_pct: batteryDerating.capacityReduction,
      redundancy_margin: 0.2 // 20%
    };
  };

  // Public API
  return {
    calculateAirDensity,
    calculateThrustReduction,
    calculateBatteryDerating,
    calculateAUW,
    calculateTotalThrust,
    calculateThrustToWeight,
    calculatePowerBudget,
    estimateFlightTime,
    validatePlatform,
    calculateBatteryRequirements
  };
})();

// Export for browser global scope
window.PhysicsEngine = PhysicsEngine;
