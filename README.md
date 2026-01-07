# Ceradon Architect Stack

**Offline-First Mission Planning Tool for Special Operations Forces**

The Ceradon Architect Stack is a professional, offline-capable web application designed for use in air-gapped, contested environments. It functions as a "Digital Construction Foreman," enabling small teams to virtually design, validate, and sustain custom small unmanned systems (sUAS) using commercial off-the-shelf (COTS) components before any physical assembly begins.

Published via GitHub Pages at <https://nbschultz97.github.io/Ceradon-Architect/>. The authoritative MissionProject schema and Parts Library schema live here and surface throughout the UI.

## Quick start
- Serve locally with any static file host (e.g., `python -m http.server 8000`) and open `http://localhost:8000`.
- Navigate with hash routes: `/#/home`, `/#/workflow`, `/#/tools`, `/#/mission`, `/#/demos`, `/#/docs`.
- Use the light/dark toggle in the nav to switch themes.
- Open `/#/workflow` to reach the unified Mission Workflow dashboard with embedded tools, module status selectors, project import/export controls, and feasibility checks.

## Updating content
- **Theme tokens:** edit `assets/css/styles.css` (`:root` and `[data-theme="light"]`).
- **Routes & views:** sections live in `index.html`; routing is in `assets/js/app.js`.
- **Tools:** update the `toolData` array in `assets/js/app.js` to add or change tool cards.
- **Workflow dashboard:** adjust the `workflowModules` array in `assets/js/app.js` to point the left-nav items to new URLs or change descriptions. The dashboard uses iframes by default to keep everything static-hostable.
- **Demo stories:** edit the `demoStories` array in `assets/js/app.js`.
- **Mission Architect embed:** update the iframe/link URL in the `mission` section of `index.html`.

## Mission Workflow dashboard
- Navigate to `/#/workflow` to stay in one shell while operating the core modules:
  - Platform Designer (Node + UxS Architect)
  - Mesh Planner (Mesh Architect)
  - Mission Planner (Mission Architect)
  - KitSmith
- Each module opens in an iframe with quick-launch links. A per-module status selector (Not Started / In Progress / Complete) is stored in `localStorage` under `ceradon_module_statuses`.
- A mission project panel exposes shared metadata fields and import/export buttons to keep a single JSON object in sync across tools.
- A feasibility panel reads the stored project JSON and highlights sustainment coverage, kit weight margins, and comms relay redundancy.

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

## Tool deep links
- Node Architect: <https://node.ceradonsystems.com/web/index.html>
- UxS Architect: <https://uxs.ceradonsystems.com/web/>
- Mesh Architect: <https://mesh.ceradonsystems.com/>
- KitSmith: <https://kitsmith.ceradonsystems.com/>
- Mission Architect: <https://mission.ceradonsystems.com/>

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

### Data Flow

```
Unit Inventory (CSV)
    ↓ [CSV Import Engine]
Parts Library (IndexedDB)
    ↓ [Platform Designer]
Platform Design
    ↓ [Physics Engine Validation]
Validated Platform + BOM
    ↓ [Export]
MissionProject JSON → Mission Planner
```

### Offline Capability

**Zero external dependencies:**
- All modules run entirely in the browser
- Data stored in localStorage and IndexedDB
- No API calls or cloud services required
- Works in air-gapped, contested environments
- Can be deployed as a single HTML file with embedded assets

### Getting Started with New Modules

```javascript
// Initialize Parts Library
await PartsLibrary.initDB();

// Import sample catalog
const response = await fetch('data/sample_parts_library.json');
const catalog = await response.json();
await PartsLibrary.importLibrary(catalog);

// Create a platform design
const design = PlatformDesigner.createEmptyDesign();
design.name = 'Recon Quad';
design.environment = { altitude_m: 1500, temperature_c: -5 };

// Add components from parts library
const motor = await PartsLibrary.getPart('motors', 'motor-001');
PlatformDesigner.addComponent(design, 'motors', motor);

// Validate design
const validation = PlatformDesigner.validateDesign(design);
console.log(validation.metrics); // AUW, T/W, flight time, etc.

// Export BOM
PlatformDesigner.downloadBOM(design);
```

### Documentation

- **Implementation Plan:** `docs/IMPLEMENTATION_PLAN.md` - Full architectural roadmap
- **Parts Library Schema:** `schema/parts_library_schema.json`
- **Sample Data:** `data/sample_parts_library.json` - Realistic COTS components

---

## Tool deep links
- Node Architect: <https://node.ceradonsystems.com/web/index.html>
- UxS Architect: <https://uxs.ceradonsystems.com/web/>
- Mesh Architect: <https://mesh.ceradonsystems.com/>
- KitSmith: <https://kitsmith.ceradonsystems.com/>
- Mission Architect: <https://mission.ceradonsystems.com/>

## Notes
- The site is fully static and GitHub Pages–compatible; no backend or build tooling is required.
- New offline modules are completely self-contained and operate without external dependencies.
