/**
 * Platform Visualization Module
 * Updates visual representation when components are selected
 */

const PlatformViz = (() => {
  /**
   * Update visualization based on selected components
   */
  const updateVisualization = (components) => {
    // Get all viz elements
    const vizAirframe = document.getElementById('vizAirframe');
    const vizMotors = document.getElementById('vizMotors');
    const vizBattery = document.getElementById('vizBattery');
    const vizFC = document.getElementById('vizFC');
    const vizRadio = document.getElementById('vizRadio');
    const vizSensors = document.getElementById('vizSensors');
    const vizContainer = document.querySelector('.viz-container');

    if (!vizContainer) return;

    // Update airframe
    if (components.airframe) {
      vizAirframe?.classList.add('active');
    } else {
      vizAirframe?.classList.remove('active');
    }

    // Update motors
    if (components.motors && components.motors.length > 0) {
      vizMotors?.classList.add('active');
      vizContainer.classList.add('has-motors');
    } else {
      vizMotors?.classList.remove('active');
      vizContainer.classList.remove('has-motors');
    }

    // Update battery
    if (components.battery) {
      vizBattery?.classList.add('active');
    } else {
      vizBattery?.classList.remove('active');
    }

    // Update flight controller
    if (components.flight_controller) {
      vizFC?.classList.add('active');
    } else {
      vizFC?.classList.remove('active');
    }

    // Update radio
    if (components.radios && components.radios.length > 0) {
      vizRadio?.classList.add('active');
    } else {
      vizRadio?.classList.remove('active');
    }

    // Update sensors
    if (components.sensors && components.sensors.length > 0) {
      vizSensors?.classList.add('active');
    } else {
      vizSensors?.classList.remove('active');
    }
  };

  /**
   * Clear all visualizations
   */
  const clearVisualization = () => {
    document.querySelectorAll('.viz-layer').forEach(el => {
      el.classList.remove('active');
    });
    document.querySelector('.viz-container')?.classList.remove('has-motors');
  };

  // Public API
  return {
    updateVisualization,
    clearVisualization
  };
})();
