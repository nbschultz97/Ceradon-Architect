# Changelog

All notable changes to Ceradon Architect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Offline Tool
- Nothing yet

### Web Playground
- Nothing yet

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
