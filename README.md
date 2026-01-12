# COTS Architect - Offline Mission Planning Tool

![Version](https://img.shields.io/badge/version-0.4.0--alpha.2-blue)
![Stage](https://img.shields.io/badge/stage-alpha-orange)
![Schema](https://img.shields.io/badge/schema-v2.0.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Air-Gap](https://img.shields.io/badge/air--gap-ready-success)

**Fully Offline Mission Planning for Air-Gapped Environments**

COTS Architect is a professional, offline-first web application for sUAS mission planning in contested environments. Build custom platforms from COTS components, plan multi-day missions with logistics, and validate RF communications — entirely in your browser with **zero cloud dependencies**.

Maintained by **Noah Schultz (individual)**.

> **Not affiliated with or endorsed by DoD/USG.** Open-source project with example data.

**Live Demo:** <https://nbschultz97.github.io/Ceradon-Architect/> (GitHub Pages)

> **✅ v0.4.0-alpha.2** - Offline GIS, historical weather almanac, and enhanced cold-weather derating. See [v0.3_offline_gis_almanac.md](docs/v0.3_offline_gis_almanac.md) for full documentation.

## What's New in v0.4.0-alpha.2 🗺️

**Offline GIS & Coordinate Automation:**
- ✅ **Interactive Map Viewer** - Leaflet-based offline mapping with click-to-select location picker
- ✅ **Auto-Population** - Lat/lon/elevation automatically populate mission planning from map clicks
- ✅ **SRTM Elevation Data** - Terrain-aware planning with Shuttle Radar Topography Mission integration
- ✅ **Elevation Caching** - LocalStorage-based caching for performance (<50ms queries)
- ✅ **Cross-Module Propagation** - Location selections automatically update Platform Designer, Mission Planner, Comms Validator

**Offline Environmental Intelligence (The Almanac):**
- ✅ **Historical Weather Database** - IndexedDB-backed climate data indexed by region and month
- ✅ **Auto-Suggestion System** - Temperature and wind auto-suggested based on location + mission date
- ✅ **Regional Coverage** - Pre-loaded Kandahar, Arctic Circle, Sahara (expandable to any region)
- ✅ **Seasonal Interpolation** - Day-of-year based calculations for accurate seasonal conditions
- ✅ **Mission Feasibility Warnings** - Automated alerts for extreme conditions that impact mission success

**Enhanced Cold-Weather Battery Derating:**
- ✅ **Extended Temperature Range** - Now supports -40°C to +50°C (enhanced from -10°C to +40°C)
- ✅ **Piecewise Linear Model** - 5 temperature zones with granular derating factors
- ✅ **Severity-Based Warnings** - Nominal/Caution/Warning/Severe/Critical alerts with mission impact
- ✅ **Arctic Mission Support** - At -40°C: 5% battery capacity with CRITICAL failure warning
- ✅ **Real-Time Validation** - Battery derating instantly propagates to flight time and logistics

**Security Posture & Air-Gap Notes:**
- ✅ **100% Client-Agnostic** - No hard-coded units, exercises, or locations (generic demo data only)
- ✅ **Skeleton Engine / Bring-Your-Own Inventory** - Load inventory locally via CSV/XLSX after install
- ✅ **Offline-First Architecture** - Zero external API calls; runs on disconnected laptops with local assets
- ✅ **Self-Review Notes** - See [SECURITY_AUDIT_v0.3.md](SECURITY_AUDIT_v0.3.md) for a non-certifying checklist

**Doctrinal Reporting & ATAK Interoperability:**
- ✅ **SALUTE Reports** - Pre-filled tactical reports from mission data
- ✅ **16-Line Incident Reports** - MEDEVAC/incident template with mission context
- ✅ **Spot Reports** - Quick tactical reporting with auto-generated DTG
- ✅ **CoT/GeoJSON Export** - ATAK-compatible mission packages with nodes, platforms, and mesh links

**Verified Data Propagation:**
- ✅ **Auto-Updates** - Platform battery changes automatically recalculate mission logistics
- ✅ **Event-Driven Architecture** - Changes flow seamlessly across all modules
- ✅ **Toast Notifications** - User feedback when cross-module updates occur

**What's New (Previous: v0.3.0-alpha.2)**

**One-Click Sample Project** - Load 40+ COTS components, 2 sample platforms, a 48-hour recon mission, and 3-node comms network instantly.

**Complete Module UIs:**
- ✅ **Parts Library** - Browse, search, import CSV, load sample catalog
- ✅ **Platform Designer** - Real-time physics validation with environmental derating
- ✅ **Mission Planner** - Battery calculations, packing lists, logistics
- ✅ **Comms Validator** - RF link budgets, LOS checks, relay recommendations
- ✅ **Export Module** - Download complete mission package as JSON

**Key Features:**
- 40+ realistic COTS components (motors, batteries, radios, sensors)
- Physics-based validation (thrust-to-weight, flight time, altitude effects)
- Terrain-adjusted packing lists for multi-day missions
- RF link analysis with line-of-sight and Fresnel zone calculations
- Zero cloud dependencies - works 100% offline

See [CHANGELOG.md](CHANGELOG.md) for complete details.

## Quick Start

```bash
# Serve locally
python -m http.server 8000
# Open http://localhost:8000
```

## Desktop App (Windows)

You can package this repo as a Windows desktop app with an installer and desktop shortcut. The desktop build auto-saves MissionProject JSON to a timestamped file for each session so you can open older sessions later.

### Build installer (connected machine)
1. Install Node.js LTS.
2. From the repo root:

```bash
npm install
npm run desktop:dist
```

The installer will be created in `dist-desktop`. Copy the installer to your air-gapped machine and run it.

For local desktop testing:

```bash
npm run desktop:dev
```

Debug tools:
- Press `Ctrl+Shift+I` inside the desktop app to open DevTools.
- Or launch with `COTS_DEBUG=1` (or `CERADON_DEBUG=1`) to auto-open DevTools.

### Session files
Each app launch creates a new session file at:

```
%USERPROFILE%\Documents\COTS-Architect\Sessions\session_YYYYMMDD_HHMMSS.json
```

To open an older session, use the **Import JSON** button on the Home screen and select the file.

Navigate with hash routes:
- `#/home` - Overview and quick start
- `#/library` - Parts Library (manage COTS components)
- `#/platform` - Platform Designer (build and validate platforms)
- `#/mission` - Mission Planner (phases, logistics, packing lists)
- `#/comms` - Comms Validator (RF link budgets, relay placement)
- `#/map` - **NEW** Map Viewer (GIS, location picker, environmental almanac)
- `#/export` - Export mission packages (JSON, GeoJSON, CoT)

### Demo Site vs Production Deployment

**GitHub Pages Demo** ([nbschultz97.github.io/Ceradon-Architect](https://nbschultz97.github.io/Ceradon-Architect/)):
- ✅ All features functional online
- ✅ Map viewer, environmental almanac, and SRTM elevation work
- ⚠️ Leaflet loads from CDN (requires internet for first load)
- ⚠️ Map tiles load from OpenStreetMap (requires internet)

**Production Air-Gap Deployment:**
- For true offline operation, bundle Leaflet locally and pre-cache map tiles
- See [docs/v0.3_offline_gis_almanac.md](docs/v0.3_offline_gis_almanac.md) for air-gap deployment instructions
- SRTM tiles can be loaded manually for your area of operations

## Application Structure

### Frontend Modules
- `index.html` - Single-page application with route-based views
- `assets/js/app.js` - Main application logic, routing, and UI initialization
- `assets/css/styles.css` - Theme system (dark/light mode)

### Offline Planning Modules
All modules operate entirely client-side with no external dependencies:

1. **Parts Library** (`assets/js/parts_library.js`)
   - IndexedDB storage for 1000+ COTS components
   - CSV import for unit inventory
   - Categories: airframes, motors, ESCs, batteries, flight controllers, radios, sensors, accessories

2. **Platform Designer** (`assets/js/platform_designer.js`)
   - Build virtual platforms from parts library components
   - Real-time physics validation (thrust-to-weight, flight time)
   - Environmental derating for altitude and temperature

3. **Mission Planner** (`assets/js/mission_planner.js`)
   - Define mission phases (ORP, infil, on-station, exfil)
   - Calculate battery swap schedules
   - Generate per-operator packing lists
   - Terrain-adjusted weight limits

4. **Comms Validator** (`assets/js/comms_validator.js`)
   - RF link budget calculator
   - Line-of-sight analysis
   - Fresnel zone clearance
   - Relay placement recommendations

5. **Supporting Modules**
   - `physics_engine.js` - Physics calculations and environmental modeling
   - `csv_importer.js` - CSV parsing for bulk imports
   - `mission_project.js` - MissionProject JSON store and validation

## MissionProject schema and helpers
- MissionProject schema v2.0.0 is defined in `schema/mission_project_schema_v2.json` and described in `docs/mission_project_schema.md`. The UI surfaces the current version in a schema card and warns on mismatches.
- Core shape: `schemaVersion`, `meta`, `environment[]`, `nodes[]`, `platforms[]`, `mesh_links[]`, `kits[]`, `mission{tasks,phases,assignments,mission_cards}`, `constraints[]`, `sustainment`, `meshPlan` summary, `kitsSummary`, and `exports`. Every entity includes `origin_tool` for cross-tool provenance.

- Helper API exposed globally as `MissionProjectStore`:
  - `createEmptyMissionProject()`, `loadMissionProject()`, `saveMissionProject(updatedProject)`
  - `exportMissionProject(fileName)`, `exportGeoJSON()`, `exportCoTStub()` / `importMissionProject(file)`
  - `validateMissionProject()` plus `validateMissionProjectDetailed()` (schema-backed) and `fetchMissionProjectSchema()` helpers
- The workflow dashboard form writes directly to this object, so other repos can read the same structure without extra wiring.
- Sample demo: `data/demo_mission_project.json` provides a neutral COTS planning scenario with TAK-ready exports.
- Data flow reference: `docs/stack_workflows.md` documents mission-first, kit-first, and RF-first chains and stresses preserving unknown fields when round-tripping.

## Data Storage

All data is stored locally in the browser:
- **localStorage**: MissionProject JSON, user preferences, theme
- **IndexedDB**: Parts Library catalog (efficient for 1000+ parts)

No data ever leaves your device. Works completely offline in air-gapped environments.

---

## Offline-First Architecture (NEW)

### Core Modules

The Architect Stack now includes **fully offline-capable** planning modules that operate with zero cloud dependencies:

#### 1. **Parts Library Manager** (`assets/js/parts_library.js`)
- **Purpose:** Manage COTS component catalogs for platform design
- **Storage:** IndexedDB for efficient handling of 1000+ parts
- **Features:**
  - Categories: Airframes, Motors, ESCs, Batteries, Flight Controllers, Radios, Sensors, Accessories
  - Search, filter, and organize components
  - Import/export entire catalogs as JSON
  - Track availability, cost, and specifications
- **Schema:** `schema/parts_library_schema.json`
- **Sample Data:** `data/sample_parts_library.json`

#### 2. **CSV Import Engine** (`assets/js/csv_importer.js`)
- **Purpose:** Bulk-load unit inventory from spreadsheets
- **Features:**
  - Parse CSV files with auto-column mapping
  - Support for common formats (property books, NSN catalogs, vendor lists)
  - Validation and error reporting
  - Template generation for standardized imports
  - Export parts back to CSV
- **Use Case:** Load a unit's property book directly into the parts catalog

#### 3. **Physics Validation Engine** (`assets/js/physics_engine.js`)
- **Purpose:** Validate platform designs against real-world physics constraints
- **Features:**
  - Calculate All-Up Weight (AUW), Thrust-to-Weight ratio, Power budget
  - Estimate flight time based on battery capacity and power draw
  - **Environmental Derating:**
    - Altitude effects: Thrust reduction due to air density (ISA model)
    - Temperature effects: Battery capacity loss in cold weather (-40% at -10°C)
  - Pass/fail validation with actionable recommendations
- **Formulas:**
  - T/W >= 2.0 for multi-rotor, 1.2 for fixed-wing
  - Flight Time = (Battery Wh × DoD × Efficiency) / Power Draw
  - Air Density at Altitude using barometric formula

#### 4. **Platform Designer** (`assets/js/platform_designer.js`)
- **Purpose:** Virtual platform composition and validation
- **Features:**
  - Select components from parts library
  - Real-time weight and power budget tracking
  - Physics validation with environmental factors
  - Generate Bill of Materials (BOM) with costs
  - Export to MissionProject format
  - Calculate battery requirements for mission duration
- **Workflow:**
  1. Select airframe, motors, battery, flight controller, radios, sensors
  2. Set operational environment (altitude, temperature)
  3. Validate design (automatically checks T/W, flight time, compatibility)
  4. Generate BOM and export
  5. Integrate with Mission Planner

#### 5. **Mission Planner with Sustainment Calculator** (`assets/js/mission_planner.js`)
- **Purpose:** Operational mission planning with logistics integration
- **Features:**
  - **Phase Management:** ORP, Infil, On-Station, Exfil with durations and activity levels
  - **Battery Swap Schedules:** Calculate when operators need to swap batteries during mission
  - **Per-Operator Packing Lists:** Distribute batteries and equipment across team members
  - **Weight Distribution:** Terrain-adjusted weight limits (urban: 25kg, mountain: 18kg, etc.)
  - **Mission Feasibility:** Validate logistics against mission duration and team capacity
- **Calculations:**
  - Batteries needed = (Operating Hours / Flight Time per Battery) × 1.2 safety margin
  - Per-operator load balanced across team with role-specific equipment
  - Weight validation against terrain limits (standard + maximum thresholds)
- **Exports:** Mission summary reports, per-operator packing lists (CSV), MissionProject JSON

#### 6. **Comms Validator / Link Budget Calculator** (`assets/js/comms_validator.js`)
- **Purpose:** RF link quality analysis and relay node placement
- **Features:**
  - **Link Budget Calculation:** Free-space path loss, received power, link margin
  - **Line-of-Sight Analysis:** Earth curvature, radio horizon, LOS clearance
  - **Fresnel Zone Clearance:** First Fresnel zone must be 60% clear for reliable signal
  - **Terrain Effects:** Signal attenuation (open: 0dB, urban: 12dB, dense urban: 20dB)
  - **Weather Effects:** Rain, snow, fog attenuation
  - **Relay Recommendations:** Optimal placement for LOS and link margin issues
  - **Radio Selection Advisor:** Suggest radios based on range, data rate, terrain
- **Formulas:**
  - FSPL (dB) = 20×log10(distance_km) + 20×log10(freq_MHz) + 32.45
  - Link Margin = RX Power - Sensitivity (minimum: 10 dB for reliable comms)
  - Radio Horizon = √(2 × Earth Radius × Antenna Height)
- **Coverage Analysis:** Identifies gaps, recommends relay heights and positions

### Data Flow

```
Unit Inventory (CSV)
    ↓ [CSV Import Engine]
Parts Library (IndexedDB)
    ↓ [Platform Designer]
Platform Design
    ↓ [Physics Engine Validation]
Validated Platform + BOM
    ↓ [Mission Planner]
Mission Phases + Battery Swaps + Packing Lists
    ↓ [Comms Validator]
RF Link Analysis + Relay Placement
    ↓ [Export]
Complete MissionProject JSON
```

### Offline Capability

**Zero external dependencies:**
- All modules run entirely in the browser
- Data stored in localStorage and IndexedDB
- No API calls or cloud services required
- Works in air-gapped, contested environments
- Can be deployed as a single HTML file with embedded assets

### Getting Started with New Modules

#### Complete Workflow Example

```javascript
// ═══════════════════════════════════════════════════════════════
// STEP 1: Initialize Parts Library
// ═══════════════════════════════════════════════════════════════
await PartsLibrary.initDB();

// Import sample catalog
const response = await fetch('data/sample_parts_library.json');
const catalog = await response.json();
await PartsLibrary.importLibrary(catalog);

// ═══════════════════════════════════════════════════════════════
// STEP 2: Design Platform
// ═══════════════════════════════════════════════════════════════
const design = PlatformDesigner.createEmptyDesign();
design.name = 'Long-Range Recon Quad';
design.type = 'multi-rotor';
design.environment = { altitude_m: 1500, temperature_c: -5 };

// Add components from parts library
const airframe = await PartsLibrary.getPart('airframes', 'frame-002'); // 7" frame
const motor = await PartsLibrary.getPart('motors', 'motor-002'); // 2806 1300KV
const battery = await PartsLibrary.getPart('batteries', 'battery-002'); // 4S 3000mAh
const fc = await PartsLibrary.getPart('flight_controllers', 'fc-002'); // Pixhawk
const radio = await PartsLibrary.getPart('radios', 'radio-001'); // ELRS

PlatformDesigner.addComponent(design, 'airframe', airframe);
for (let i = 0; i < 4; i++) {
  PlatformDesigner.addComponent(design, 'motors', motor);
}
PlatformDesigner.addComponent(design, 'battery', battery);
PlatformDesigner.addComponent(design, 'flight_controller', fc);
PlatformDesigner.addComponent(design, 'radios', radio);

// Validate design
const validation = PlatformDesigner.validateDesign(design);
console.log(validation.metrics);
// Output:
// {
//   auw_kg: 0.85,
//   thrust_to_weight: 2.18,
//   nominal_flight_time_min: 42,
//   environment: {
//     adjusted_flight_time_min: 34,  // Cold + altitude effects
//     thrust_reduction_pct: 15,
//     battery_capacity_reduction_pct: 19
//   }
// }

// Save design
PlatformDesigner.saveDesign(design);

// ═══════════════════════════════════════════════════════════════
// STEP 3: Plan Mission with Sustainment
// ═══════════════════════════════════════════════════════════════
const mission = MissionPlanner.createEmptyPlan();
mission.name = 'Ridge Reconnaissance - 48hr';
mission.duration_hours = 48;
mission.terrain = 'mountain';
mission.team = {
  size: 4,
  roles: ['Team Lead', 'UxS Pilot', 'Payload Operator', 'Mesh Lead']
};

// Add mission phases
MissionPlanner.addPhase(mission, {
  name: 'ORP Setup',
  type: 'ORP',
  duration_hours: 2,
  activity_level: 'low',
  platforms_active: []
});

MissionPlanner.addPhase(mission, {
  name: 'Initial Recon',
  type: 'ON_STATION',
  duration_hours: 8,
  activity_level: 'high',
  platforms_active: [design.id]
});

MissionPlanner.addPhase(mission, {
  name: 'Sustained Surveillance',
  type: 'ON_STATION',
  duration_hours: 36,
  activity_level: 'medium',
  platforms_active: [design.id]
});

MissionPlanner.addPhase(mission, {
  name: 'Exfil',
  type: 'EXFIL',
  duration_hours: 2,
  activity_level: 'low',
  platforms_active: []
});

// Calculate logistics
mission.platforms = [design.id];
const platformDesigns = [design];
MissionPlanner.calculateMissionLogistics(mission, platformDesigns);

console.log(mission.sustainment);
// Output:
// {
//   total_batteries: 78,
//   weight_kg: 23.0,
//   battery_swaps: [
//     { time_hours: 0.57, platform_name: 'Long-Range Recon Quad', action: 'Battery swap required' },
//     { time_hours: 1.14, ... },
//     ...
//   ],
//   feasibility: { pass: true, warnings: [], errors: [] }
// }

// Check packing lists
mission.packing_lists.forEach(list => {
  console.log(`${list.role}: ${list.total_weight_kg.toFixed(1)} kg (limit: ${list.weight_limit_kg} kg)`);
  // Team Lead: 21.5 kg (limit: 18 kg) ⚠ Overweight
  // UxS Pilot: 20.8 kg (limit: 18 kg) ⚠ Overweight
  // ...
});

// Download packing list for each operator
mission.packing_lists.forEach(list => {
  MissionPlanner.downloadPackingList(list);
});

// Save mission plan
MissionPlanner.savePlan(mission);

// ═══════════════════════════════════════════════════════════════
// STEP 4: Validate Communications
// ═══════════════════════════════════════════════════════════════
const comms = CommsValidator.createEmptyAnalysis();
comms.name = 'Ridge Recon Comms Plan';
comms.terrain = 'mountain';
comms.weather = 'clear';

// Add nodes
CommsValidator.addNode(comms, {
  name: 'ORP Base Station',
  type: 'transceiver',
  location: { lat: 40.7608, lon: -111.8910, elevation_m: 1500, height_agl_m: 3 },
  radio: {
    frequency_mhz: 900,
    power_output_dbm: 20,
    tx_gain_dbi: 5,
    rx_gain_dbi: 5,
    sensitivity_dbm: -110
  }
});

CommsValidator.addNode(comms, {
  name: 'Ridge Observation Point',
  type: 'transceiver',
  location: { lat: 40.7808, lon: -111.9010, elevation_m: 1800, height_agl_m: 2 },
  radio: {
    frequency_mhz: 900,
    power_output_dbm: 20,
    tx_gain_dbi: 2,
    rx_gain_dbi: 2,
    sensitivity_dbm: -110
  }
});

CommsValidator.addNode(comms, {
  name: 'UxS (airborne)',
  type: 'transceiver',
  location: { lat: 40.7708, lon: -111.8960, elevation_m: 1650, height_agl_m: 100 },
  radio: {
    frequency_mhz: 900,
    power_output_dbm: 20,
    tx_gain_dbi: 2,
    rx_gain_dbi: 2,
    sensitivity_dbm: -110
  }
});

// Analyze links
CommsValidator.analyzeLinks(comms);

console.log(comms.links);
// Output:
// [
//   {
//     from_name: 'ORP Base Station',
//     to_name: 'Ridge Observation Point',
//     distance_km: 2.5,
//     link_margin_db: 18.3,
//     quality: 'excellent',
//     relay_required: false
//   },
//   {
//     from_name: 'ORP Base Station',
//     to_name: 'UxS (airborne)',
//     distance_km: 1.8,
//     link_margin_db: 22.1,
//     quality: 'excellent',
//     relay_required: false
//   }
// ]

console.log(comms.relay_recommendations);
// Output: [] (no relays needed - all links good)

// Download comms analysis report
CommsValidator.downloadReport(comms);

// ═══════════════════════════════════════════════════════════════
// STEP 5: Export Complete Mission Package
// ═══════════════════════════════════════════════════════════════
const missionProject = MissionPlanner.exportToMissionProject(mission, platformDesigns);
MissionProjectStore.saveMissionProject(missionProject);
MissionProjectStore.exportMissionProject('ridge_recon_48hr.json');

// Generate summary report
MissionPlanner.downloadSummaryReport(mission);
```

### Documentation

- **Implementation Plan:** `docs/IMPLEMENTATION_PLAN.md` - Full architectural roadmap
- **Parts Library Schema:** `schema/parts_library_schema.json`
- **Sample Data:** `data/sample_parts_library.json` - Realistic COTS components
- **Governance:** `GOVERNANCE.md`
- **Contributing:** `CONTRIBUTING.md`
- **Security Reporting:** `SECURITY.md`
- **Disclaimer:** `DISCLAIMER.md`

---

## Deployment

The site is fully static and GitHub Pages-compatible:
- No backend or build tooling required
- Can be deployed to any static file host
- Works offline once cached by the browser
- All modules are self-contained JavaScript files

**GitHub Pages setup (default domain):**
1. In GitHub repo settings, open **Pages**.
2. Set **Source** to `Deploy from a branch`.
3. Select the `main` branch and `/ (root)` folder.
4. Save and use the published URL: `https://nbschultz97.github.io/Ceradon-Architect/`.

---

## Security Notes

COTS Architect is built to avoid external dependencies and keep data local to the browser. The project includes a non-certifying, self-review checklist in [SECURITY_AUDIT_v0.3.md](SECURITY_AUDIT_v0.3.md); it is not an accreditation or operational approval.

**Security Highlights:**
- ✅ **Zero External Dependencies** - No CDN calls, API requests, or cloud services when deployed offline
- ✅ **Client-Agnostic Design** - Generic "Empty Ledger" model with scrubbed client references
- ✅ **CSV Import Hygiene** - Input validation and schema checks for local inventory ingestion
- ✅ **Local-Only Storage** - All data in browser localStorage and IndexedDB
- ✅ **Offline-First Architecture** - Fully functional without internet connectivity when assets are bundled
