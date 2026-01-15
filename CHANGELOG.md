# Changelog

All notable changes to COTS Architect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Offline Tool
- Nothing yet

### Web Playground
- Fixed map viewer boot to degrade gracefully when Leaflet fails to load, avoiding a blank page on the demo.
- Updated demo footer resource links to point at the current repository for accurate changelog and docs access.

---

## [0.4.0-alpha.3] - 2026-01-15

### Offline Tool + Web Playground (SYNCED)

#### Added
- **Excel File Import Support**
  - Parts Library now accepts .xlsx and .xls files in addition to .csv
  - Integrated SheetJS library for Excel parsing
  - Auto-detects file format and converts Excel to CSV internally
  - Drag-and-drop supports all formats (.csv, .xlsx, .xls)
  - Multi-category import works with Excel files

- **Leaflet Basemap for Comms Validator**
  - Replaced basic canvas grid with full OpenStreetMap basemap
  - Interactive map with zoom, pan, and real terrain visualization
  - Comms nodes shown as colored markers (green=GCS, blue=UAV, yellow=Relay)
  - Node markers show detailed popup information on click
  - RF link lines drawn between nodes with dashed styling
  - Map auto-fits bounds to show all placed nodes
  - Integration with SRTM elevation data for accurate node elevations

- **Map Location Sharing Across Tools**
  - Comms Validator now listens for map location events from Mission Planner
  - When map location selected in Mission Planner, Comms Validator map auto-centers
  - Shared localStorage for last map position across tools
  - Event-driven architecture ensures all tools stay in sync

#### Changed
- **Comms Validator UI Improvements**
  - Updated drop zone text to indicate Excel support
  - Changed "Import CSV" button to "Import CSV/Excel"
  - File input now accepts .csv, .xlsx, .xls extensions
  - Map legend moved below map for better visibility
  - Legend now uses flexbox layout for horizontal display

#### Fixed
- **Electron Desktop App Fixes**
  - Fixed syntax error in app.js (orphaned code block removed)
  - Fixed ReferenceError: updateComponentSelectionDisplay → updateSelectedComponentsDisplay
  - Fixed "prompt() is not supported" errors in Electron
  - Created custom electronPrompt() function with modal dialogs
  - Made all prompt-using functions async (saveCurrentPlatform, addMissionPhase, addCommsNode)
  - Hidden web-only demo banners in desktop app using .desktop-mode class
  - DevTools auto-open for debugging during development

#### Technical Improvements
- Added SheetJS (xlsx) library v0.20.1 via CDN
- CSV importer module now has Excel-specific import functions
- Comms map uses Leaflet L.map() API instead of raw canvas
- Map markers use L.divIcon() for custom colored node markers
- MissionProjectEvents used for cross-tool map location synchronization
- SRTM elevation integration for accurate node placement elevations

---

## [0.4.0-alpha.2] - 2026-01-09

### Offline Tool + Web Playground (SYNCED)

#### Added
- Governance, contributing, security reporting, and disclaimer documents to clarify individual maintenance and contribution flow.
- Apache-2.0 license for open-source distribution.

#### Changed
- Demo hosting posture updated to GitHub Pages default domain with explicit no-endorsement banner/footer.
- README updated with maintainer attribution, disclaimer language, and bring-your-own inventory model.
- Demo UI copy scrubbed of organization funnel language and email contact.
- Sample data updated to remove access-code phrasing.
- Web metadata updated to point to the neutral demo URL.

#### Removed
- Custom domain CNAME from the repository.

---

## [0.4.0-alpha.1] - 2026-01-08

### Offline Tool + Web Playground (SYNCED)

**DEPLOYMENT POLICY**: Web playground now ALWAYS mirrors offline version.

#### Added
- **Automatic Data Propagation System (CRITICAL FEATURE)**
  - Created centralized event bus (`mission_project_events.js`) for cross-module communication
  - Platform Designer changes now automatically trigger Mission Planner recalculations
  - Motor swap in Platform Designer immediately updates battery requirements and ruck weight
  - All modules emit and listen for relevant events (platform updates, mission updates, comms updates)
  - Cross-tab synchronization via localStorage events
  - Console logging for debugging data propagation flow

- **Doctrinal Reporting (SOF REQUIREMENTS)**
  - **Spot Report Generator**: 6-line tactical report (Size, Activity, Location, Unit, Time, Equipment)
  - **SALUTE Report Generator**: Comprehensive situational awareness report with auto-populated fields
  - **16-Line Incident Report**: MEDEVAC/incident template with mission data pre-filled
  - All reports auto-extract coordinates, team info, and equipment from MissionProject
  - Export as formatted text files ready for tactical use
  - DTG (Date-Time-Group) automatically generated in military format

- **Mission Cards (Stub for Future Enhancement)**
  - Basic mission card generation from mission phases
  - JSON export with phase names, durations, and platform assignments
  - TODO markers for icon library, QR codes, and print-optimized PDF layout

- **UI Feedback System (NEW)**
  - Comprehensive toast notification system with 5 types (success, error, warning, info, sync)
  - Auto-dismiss toasts with manual close option
  - Loading spinner overlay for async operations
  - Success checkmark animations
  - Pulse animations for badges
  - Confirm dialog system (replaces native alerts)
  - All UI feedback accessible via `UIFeedback` global object

- **Visual Feedback for Data Propagation**
  - Toast notifications when platform changes trigger mission updates
  - Animated sync icon (🔄) for propagation events
  - Warning toasts when platforms removed from missions
  - Success toasts for all doctrinal report exports

#### Changed
- **Platform Designer** (v1.0.0 → v1.1.0)
  - Now emits events when designs are saved or deleted
  - Automatic validation propagation to dependent modules

- **Mission Planner** (v1.0.0 → v1.1.0)
  - Automatically recalculates logistics when platform designs change
  - Listens for platform deletion events and updates mission plans accordingly
  - Console warnings when platforms are removed from missions

- **Export Module** (v0.5.0-alpha → v1.0.0-beta)
  - Added three doctrinal report export buttons with icons (📍 📊 🚑)
  - Success toast notifications for all exports
  - Error handling with user-friendly toast messages
  - Upgraded from alpha to beta status with comprehensive reporting

- **UI Enhancements**
  - Report buttons now have emoji icons for better visual identification
  - CSS animations for toasts, spinners, and success checkmarks (~280 lines)
  - Responsive toast container (top-right on desktop, full-width on mobile)
  - Accessible ARIA labels for all notifications

#### Technical Improvements
- Event-driven architecture eliminates manual refresh requirements
- All modules now extend window object for cross-module access
- MissionProjectStore emits events on save operations
- Storage event listeners enable multi-tab synchronization

#### Documentation
- Updated version.json to reflect new features and version bumps
- Added "Digital Construction Foreman" subtitle to description
- Documented data propagation system in module notes
- **CRITICAL**: Added "MIRROR-FIRST" deployment policy to version.json
- WebPlayground version synced to offline (both v0.4.0-alpha.1)

#### Files Added
- `assets/js/ui_feedback.js` - Toast notification and UI feedback system (+240 lines)
- `assets/css/styles.css` - UI feedback CSS (+280 lines appended)

---

## [0.3.0-alpha.2] - 2026-01-07

### Offline Tool

#### Added
- **Sample Data System**
  - 40+ realistic COTS components with actual specs and pricing
  - Sample catalog includes: airframes, motors, ESCs, batteries, flight controllers, radios, sensors, accessories
  - One-click sample project loader creates complete demo workflow
  - Pre-configured platform designs (X500 ISR Quadcopter, Skywalker X8 Long Range)
  - 48-hour ISR mission scenario with 6 phases
  - 3-node communications network (GCS, UAV, Relay)

- **Export Module**
  - Comprehensive mission package export as JSON
  - Project status dashboard showing all modules
  - Validation status indicators for platforms and comms networks
  - Metadata tracking (total parts, platforms, missions, analyses)

- **Platform Designer**
  - Component selection from Parts Library with live updates
  - Real-time physics validation with PhysicsEngine integration
  - Environmental derating for altitude and temperature effects
  - Detailed metrics: AUW, T/W ratio, flight time (nominal + adjusted)
  - Error, warning, and recommendation system
  - Platform design persistence to localStorage

- **Mission Planner**
  - Mission phase editor (add/remove phases)
  - Battery requirements calculator from platform designs
  - Battery swap schedule generation
  - Per-operator packing lists with terrain-adjusted weight limits
  - Role-specific equipment assignments
  - Packing list CSV export
  - Feasibility analysis with errors and warnings

- **Comms Validator**
  - Node editor with location and radio specifications
  - RF link budget calculations (FSPL, LOS, Fresnel zone)
  - Terrain and weather attenuation modeling
  - Link quality assessment (excellent/good/marginal/poor/no LOS)
  - Coverage gap identification
  - Relay placement recommendations
  - Detailed comms analysis report download

- **Physics Engine**
  - Air density calculations using ISA model
  - Thrust reduction at altitude
  - Battery capacity derating for temperature
  - All-Up Weight (AUW) calculations
  - Thrust-to-Weight ratio validation
  - Power budget estimation
  - Flight time prediction

### Web Playground

#### Added
- Complete redesign as functional playground mirroring offline tool
- Single-page application with hash-based routing
- All 4 offline modules now functional in browser
- Sample data loads with one click
- Real physics validation
- Interactive UIs for all modules
- Export module with comprehensive project status

#### Removed
- Access gate system (159 lines)
- External demo links
- Marketing-focused placeholder content

#### Changed
- Home page focuses on workflow overview
- All modules functional instead of placeholders

#### Fixed
- CSS for new UI elements
- Form styles and button states
- Validation result displays

---

## Previous Releases (Marketing Hub)

### v1.3.0 – 2024-11-05
- Hardened the demo access gate (client-side validation, no public code display, localStorage grant flag).
- Added schema validation console in Docs with MissionProject JSON paste/apply flow.
- Published canonical environment/EW taxonomy and wired workflow metadata to the shared enums.
- Added mission archetype presets (WHITEFROST ridge, urban high-EW lane, partner sustainment, low-infrastructure mesh).
- Surfaced Architect Hub Web v1.3 versioning in UI and documentation.

### v0.4.0 – 2024-06-06
- Added version and schema badges with mirrored footer metadata.
- Introduced access overlays, status cards, and timestamps for MissionProject.
- Consolidated modules/workflows copy and added a collapsible change log.

### v0.3.1 – 2024-05-20
- Refined MissionProject validation, summaries, and schema warnings.
- Improved embedded workflow navigation and module status tracking.

### v0.3.0 – 2024-05-05
- Initial static hub with MissionProject storage, exports, and tool launchers.

---

## Roadmap

### v0.4.0-alpha.1 (Target: Feb 2026)
- Electron packaging for desktop distribution
- Comprehensive error handling
- Offline installers (Windows, macOS, Linux)
- User documentation
- Settings panel
- Undo/redo functionality

### v0.5.0-alpha.1 (Target: Mar 2026)
- Import/export improvements
- Advanced filtering in Parts Library
- Platform comparison tool
- Mission timeline visualization
- Comms network map

### v0.9.0-beta.1 (Target: Q2 2026)
- Feature freeze
- External user testing
- Performance optimization
- Full documentation

### v1.0.0 (Target: Q3 2026)
- First stable release
- Production installers
- Complete user manual
- Video tutorials
