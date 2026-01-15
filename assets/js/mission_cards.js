/**
 * Mission Cards Generator
 * Creates printable mission cards with icons and PDF export
 */

const MissionCards = (() => {
  'use strict';

  /**
   * Icon library for common mission elements
   */
  const ICONS = {
    // Platform types
    quadcopter: '🚁',
    fixed_wing: '✈️',
    vtol: '🛩️',
    helicopter: '🚁',

    // Mission phases
    transit: '➡️',
    survey: '📷',
    recon: '👁️',
    patrol: '🔄',
    loiter: '⭕',
    return: '🏠',
    landing: '🛬',
    takeoff: '🛫',

    // Equipment
    camera: '📷',
    sensor: '📡',
    radio: '📻',
    battery: '🔋',
    motor: '⚙️',

    // Status
    ready: '✅',
    pending: '⏳',
    complete: '✔️',
    warning: '⚠️',
    error: '❌',

    // Weather
    sunny: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    wind: '💨',
    snow: '❄️',

    // Nav
    waypoint: '📍',
    location: '🗺️',
    altitude: '📏',
    distance: '↔️'
  };

  /**
   * Generate mission card data from mission project
   */
  const generateCardData = (missionProject) => {
    if (!missionProject || !missionProject.missions || missionProject.missions.length === 0) {
      throw new Error('No mission data available');
    }

    const mission = missionProject.missions[0]; // Use first mission
    const cards = [];

    // Create a card for each mission phase
    if (mission.phases && mission.phases.length > 0) {
      mission.phases.forEach((phase, index) => {
        const card = {
          phaseNumber: index + 1,
          phaseTotal: mission.phases.length,
          phaseName: phase.name || `Phase ${index + 1}`,
          icon: getPhaseIcon(phase.name),
          duration: phase.duration_minutes || 0,
          platform: phase.platform_name || 'Unknown',
          platformIcon: ICONS.quadcopter,
          description: phase.description || 'No description',

          // Mission details
          missionName: mission.name || 'Unnamed Mission',
          location: mission.location ? `${mission.location.lat.toFixed(4)}°, ${mission.location.lon.toFixed(4)}°` : 'Unknown',
          altitude: mission.location ? `${mission.location.elevation_m}m AGL` : 'N/A',

          // Time calculations
          startTime: calculatePhaseStartTime(mission.phases, index),
          endTime: calculatePhaseEndTime(mission.phases, index),

          // Battery info
          batteryRequired: phase.batteries_required || 0,

          // Weather (if available)
          weather: mission.environment ? {
            temp: mission.environment.temperature_c || 'N/A',
            wind: mission.environment.wind_speed_mps || 'N/A',
            icon: getWeatherIcon(mission.environment)
          } : null,

          // Status
          status: 'pending',
          statusIcon: ICONS.pending
        };

        cards.push(card);
      });
    }

    return {
      missionName: mission.name || 'Unnamed Mission',
      totalPhases: mission.phases ? mission.phases.length : 0,
      totalDuration: mission.phases ? mission.phases.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) : 0,
      cards: cards,
      generatedAt: new Date().toISOString()
    };
  };

  /**
   * Get appropriate icon for phase name
   */
  const getPhaseIcon = (phaseName) => {
    const name = (phaseName || '').toLowerCase();
    if (name.includes('transit') || name.includes('travel')) return ICONS.transit;
    if (name.includes('survey') || name.includes('map')) return ICONS.survey;
    if (name.includes('recon') || name.includes('scout')) return ICONS.recon;
    if (name.includes('patrol')) return ICONS.patrol;
    if (name.includes('loiter') || name.includes('orbit')) return ICONS.loiter;
    if (name.includes('return') || name.includes('rtl')) return ICONS.return;
    if (name.includes('land')) return ICONS.landing;
    if (name.includes('takeoff') || name.includes('launch')) return ICONS.takeoff;
    return '📋';
  };

  /**
   * Get weather icon
   */
  const getWeatherIcon = (environment) => {
    if (!environment) return ICONS.sunny;
    const temp = environment.temperature_c || 20;
    const wind = environment.wind_speed_mps || 0;

    if (temp < 0) return ICONS.snow;
    if (wind > 10) return ICONS.wind;
    if (temp > 30) return ICONS.sunny;
    return ICONS.cloudy;
  };

  /**
   * Calculate start time for phase (cumulative)
   */
  const calculatePhaseStartTime = (phases, index) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
      totalMinutes += phases[i].duration_minutes || 0;
    }
    return formatDuration(totalMinutes);
  };

  /**
   * Calculate end time for phase
   */
  const calculatePhaseEndTime = (phases, index) => {
    let totalMinutes = 0;
    for (let i = 0; i <= index; i++) {
      totalMinutes += phases[i].duration_minutes || 0;
    }
    return formatDuration(totalMinutes);
  };

  /**
   * Format duration as HH:MM
   */
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  /**
   * Generate HTML for print-friendly mission cards
   */
  const generateHTML = (cardData) => {
    let html = `
      <div class="mission-cards-print" style="font-family: Arial, sans-serif;">
        <div class="mission-header" style="text-align: center; margin-bottom: 20px; page-break-after: avoid;">
          <h1 style="margin: 0; font-size: 24px;">${cardData.missionName}</h1>
          <p style="margin: 5px 0; color: #666;">${cardData.totalPhases} Phases | Total Duration: ${formatDuration(cardData.totalDuration)}</p>
          <p style="margin: 5px 0; font-size: 12px; color: #999;">Generated: ${new Date(cardData.generatedAt).toLocaleString()}</p>
        </div>
        <div class="cards-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
    `;

    cardData.cards.forEach(card => {
      html += `
        <div class="mission-card" style="border: 2px solid #667eea; border-radius: 8px; padding: 16px; background: white; page-break-inside: avoid;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #667eea;">
            <div>
              <h2 style="margin: 0; font-size: 18px;">${card.icon} ${card.phaseName}</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Phase ${card.phaseNumber} of ${card.phaseTotal}</p>
            </div>
            <div style="font-size: 32px;">${card.statusIcon}</div>
          </div>

          <div class="card-body" style="font-size: 13px;">
            <div style="margin-bottom: 8px;">
              <strong>${ICONS.quadcopter} Platform:</strong> ${card.platform}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>⏱️ Duration:</strong> ${card.duration} minutes
            </div>
            <div style="margin-bottom: 8px;">
              <strong>🕐 Time Window:</strong> ${card.startTime} - ${card.endTime}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>${ICONS.battery} Batteries:</strong> ${card.batteryRequired}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>${ICONS.location} Location:</strong> ${card.location}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>${ICONS.altitude} Altitude:</strong> ${card.altitude}
            </div>
            ${card.weather ? `
            <div style="margin-bottom: 8px;">
              <strong>${card.weather.icon} Weather:</strong> ${card.weather.temp}°C, ${card.weather.wind} m/s wind
            </div>
            ` : ''}
            ${card.description && card.description !== 'No description' ? `
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
              <strong>📝 Notes:</strong>
              <p style="margin: 4px 0 0 0; color: #555;">${card.description}</p>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  };

  /**
   * Export mission cards as PDF (requires jsPDF)
   */
  const exportToPDF = async (cardData) => {
    // Check if jsPDF is loaded
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF library not loaded. PDF export unavailable.');
    }

    const { jsPDF } = window.jspdf || jspdf;
    const doc = new jsPDF();

    // Title page
    doc.setFontSize(24);
    doc.text(cardData.missionName, 105, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`${cardData.totalPhases} Mission Phases`, 105, 45, { align: 'center' });
    doc.text(`Total Duration: ${formatDuration(cardData.totalDuration)}`, 105, 52, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(cardData.generatedAt).toLocaleString()}`, 105, 65, { align: 'center' });

    // Mission cards (2 per page)
    cardData.cards.forEach((card, index) => {
      if (index % 2 === 0 && index > 0) {
        doc.addPage();
      }

      const yOffset = (index % 2) * 140 + 80;

      // Card border
      doc.setDrawColor(102, 126, 234);
      doc.setLineWidth(0.5);
      doc.rect(10, yOffset, 190, 130);

      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`${card.phaseName}`, 15, yOffset + 10);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Phase ${card.phaseNumber} of ${card.phaseTotal}`, 15, yOffset + 17);

      // Details
      let y = yOffset + 30;
      doc.setFontSize(10);
      doc.text(`Platform: ${card.platform}`, 15, y);
      y += 7;
      doc.text(`Duration: ${card.duration} minutes`, 15, y);
      y += 7;
      doc.text(`Time Window: ${card.startTime} - ${card.endTime}`, 15, y);
      y += 7;
      doc.text(`Batteries Required: ${card.batteryRequired}`, 15, y);
      y += 7;
      doc.text(`Location: ${card.location}`, 15, y);
      y += 7;
      doc.text(`Altitude: ${card.altitude}`, 15, y);
      y += 7;

      if (card.weather) {
        doc.text(`Weather: ${card.weather.temp}C, ${card.weather.wind} m/s wind`, 15, y);
        y += 7;
      }

      if (card.description && card.description !== 'No description') {
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', 15, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        const splitDescription = doc.splitTextToSize(card.description, 170);
        doc.text(splitDescription, 15, y);
      }
    });

    // Save PDF
    const filename = `mission-cards-${cardData.missionName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);

    return filename;
  };

  /**
   * Export mission cards as JSON
   */
  const exportToJSON = (cardData) => {
    const json = JSON.stringify(cardData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-cards-${cardData.missionName.replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Print mission cards (opens print dialog with formatted HTML)
   */
  const printCards = (cardData) => {
    const html = generateHTML(cardData);
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mission Cards - ${cardData.missionName}</title>
        <style>
          body { margin: 20px; }
          @media print {
            .mission-card { page-break-inside: avoid; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Public API
  return {
    generateCardData,
    generateHTML,
    exportToPDF,
    exportToJSON,
    printCards,
    ICONS
  };
})();

// Export for browser global scope
window.MissionCards = MissionCards;
