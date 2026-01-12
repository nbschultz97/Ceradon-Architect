# COTS Architect Stack - Implementation Plan

## Executive Summary

This document outlines the implementation strategy for transforming the COTS Architect Stack from an orchestration hub into a fully offline-capable, unified mission-planning application for small teams in disconnected environments.

**Current State:** Static hub with links to external tools (NOT offline-capable)
**Target State:** Complete offline-first application with all planning modules built-in

---

## I. Critical Architectural Gap

### Problem Statement
The current implementation relies on external URLs for all planning modules. This violates the core requirement for **zero cloud dependencies** and **offline-first operation** in air-gapped, contested environments.

### Solution Architecture
Build all planning modules as **local JavaScript applications** that:
- Run entirely in the browser with no external API calls
- Share a unified MissionProject JSON data model
- Persist data to localStorage/IndexedDB
- Support CSV/Excel import for parts catalogs
- Export to military-standard formats

---

## II. Core Modules to Build

### Module 1: Platform Designer
**Purpose:** Virtual composition and validation of sUAS platforms

#### Components:
1. **Parts Library Manager**
   - CSV/Excel import engine for COTS components
   - Categories: Airframes, Motors, ESCs, Batteries, Flight Controllers, Radios, Sensors
   - Fields: Part number, weight, dimensions, power specs, cost, availability
   - Storage: IndexedDB for large datasets
   - Search/filter capabilities

2. **Virtual Platform Composer**
   - Component selection UI (drag-and-drop or form-based)
   - Real-time weight and power budget tracking
   - Visual representation of platform configuration
   - Validation warnings (overweight, underpowered, incompatible parts)

3. **Physics Validation Engine**
   ```javascript
   // Core calculations needed:
   - Thrust-to-Weight Ratio: T/W >= 2.0 for multi-rotor, 1.2 for fixed-wing
   - All-Up Weight (AUW): Sum of all component weights
   - Flight Time Estimation: Battery capacity / power draw
   - Power Budget: Sum of component power consumption vs battery output
   ```

4. **Environmental Derating Calculator**
   ```javascript
   // Altitude effects:
   - Air density reduction: ρ = ρ0 * (1 - 0.0065 * altitude / 288.15)^(5.255)
   - Thrust reduction: 15-20% per 1000m elevation
   - Propeller efficiency degradation

   // Temperature effects:
   - Battery capacity: -1% capacity per °C below 20°C
   - Cold weather: -20% to -40% capacity below -10°C
   - Hot weather: Reduced discharge rates, thermal throttling
   ```

5. **Platform Validation Report**
   - Pass/fail criteria for mission environment
   - Recommended component swaps for marginal designs
   - Comparison table for alternative configurations

---

### Module 2: Mission Planner
**Purpose:** Operational planning with logistics integration

#### Components:
1. **Mission Phase Manager**
   - Phase types: ORP (Objective Rally Point), Infil, On-Station, Exfil
   - Duration and activity level per phase
   - Platform-to-phase assignments
   - Timeline visualization

2. **Sustainment Calculator**
   ```javascript
   // Battery requirements calculation:
   batteries_needed = (mission_duration_hours * average_power_draw_W) /
                      (battery_capacity_Wh * depth_of_discharge * efficiency)

   // Factors:
   - Depth of discharge: 0.8 for Li-ion/LiPo (preserve battery life)
   - Efficiency: 0.85 (account for losses)
   - Temperature derating: Apply based on environment
   - Redundancy margin: +20% for critical missions
   ```

3. **Per-Operator Packing List Generator**
   - Weight distribution across team members
   - Role-based assignments (pilot, payload operator, mesh lead)
   - Terrain-adjusted weight limits:
     - Temperate terrain: 18-22 kg per operator
     - Mountain terrain: 15-18 kg per operator
     - Urban terrain: 20-25 kg per operator
   - Color-coded warnings for overweight conditions

4. **Logistics Validation**
   - Total mission weight vs transport capacity
   - Resupply requirements for multi-day operations
   - Battery swap schedules
   - Spare parts recommendations (10% rule)

---

### Module 3: Comms Validator (Embedded in Mission Planner)
**Purpose:** RF link quality and coverage analysis

#### Components:
1. **Link Budget Calculator**
   ```javascript
   // Free-space path loss:
   FSPL_dB = 20 * log10(distance_km) + 20 * log10(frequency_MHz) + 32.45

   // Received power:
   P_rx = P_tx + G_tx + G_rx - FSPL - losses

   // Link margin:
   margin_dB = P_rx - receiver_sensitivity
   // Minimum margin: 10 dB for reliable link
   ```

2. **Terrain Effects**
   - Fresnel zone clearance calculations
   - Line-of-sight validation
   - Multi-path fading estimates
   - Urban canyon effects (signal attenuation)

3. **Relay Node Placement**
   - Optimal positions for relay nodes
   - Coverage gap identification
   - Redundancy analysis (N+1 relay requirement)
   - EW-aware recommendations (frequency diversity)

4. **Radio Selection Advisor**
   - Wi-Fi: Short range, high bandwidth, contested spectrum
   - LoRa: Long range, low bandwidth, better penetration
   - FPV: Video streaming, line-of-sight only
   - Recommend radio types based on mission profile

---

### Module 4: Parts Library Import Engine
**Purpose:** Bulk load unit inventory from spreadsheets

#### Features:
1. **CSV/Excel Parser**
   - Support for .csv, .xlsx, .xls formats
   - Column mapping UI (map spreadsheet columns to schema fields)
   - Validation and error reporting
   - Duplicate detection

2. **Template Library**
   - Pre-defined templates for common inventory formats
   - NATO Stock Number (NSN) support
   - Property book format compatibility
   - COTS vendor catalog formats

3. **Parts Catalog Schema**
   ```json
   {
     "airframes": {
       "id": "string",
       "name": "string",
       "type": "fixed-wing|multi-rotor|vtol|ground",
       "weight_g": "number",
       "max_payload_g": "number",
       "cost_usd": "number",
       "availability": "in-stock|on-order|unavailable",
       "notes": "string"
     },
     "motors": {...},
     "batteries": {...},
     "radios": {...}
   }
   ```

---

### Module 5: Doctrinal Reporting & Exports
**Purpose:** Military-standard outputs

#### Report Types:
1. **Mission Cards**
   - Icon-driven visual layout
   - Simplified for low-literacy or non-English speakers
   - QR codes for digital handoff
   - Print-optimized (A5 size, B&W compatible)

2. **SALUTE Report**
   - Size, Activity, Location, Unit, Time, Equipment
   - Auto-populated from mission data
   - Editable text fields for operator notes
   - Export to PDF/plain text

3. **16-Line MEDEVAC Format**
   - Standard military incident report
   - Pre-filled location data from mission
   - Template with mandatory fields highlighted

4. **Technical Build Package**
   - Bill of Materials (BOM) with part numbers
   - Assembly instructions
   - Wiring diagrams (auto-generated from platform design)
   - Pre-flight checklist

5. **Export Formats**
   - PDF (for printing)
   - JSON (for data handoff)
   - GeoJSON (for TAK/ATAK integration)
   - CoT (Cursor on Target) for real-time SA

---

## III. Technical Library System

### Purpose: Build template and knowledge repository

#### Components:
1. **Validated Build Templates**
   - Proven platform configurations
   - Performance specs and test results
   - Recommended use cases
   - Assembly difficulty rating

2. **Print-to-Flight Wiki**
   - 3D-printable airframe STL files
   - Slicing settings for common printers
   - Material recommendations (PLA, PETG, carbon-fiber)
   - Assembly workflows with photos

3. **Wiring Diagrams**
   - Auto-generated from platform configuration
   - Color-coded by subsystem
   - Connector pinout tables
   - Troubleshooting guides

4. **Version Control**
   - Track template revisions
   - User-submitted improvements
   - Approval workflow for reviewed designs
   - Change logs

---

## IV. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up offline-first application architecture
- [ ] Build parts library data model and storage (IndexedDB)
- [ ] Create CSV/Excel import engine
- [ ] Implement basic UI framework (React or vanilla JS)
- [ ] Integrate with existing MissionProject schema

### Phase 2: Platform Designer (Week 3-4)
- [ ] Build component selection UI
- [ ] Implement physics validation engine
- [ ] Create environmental derating calculator
- [ ] Build platform configuration export
- [ ] Add validation warnings and recommendations

### Phase 3: Mission Planner (Week 5-6)
- [ ] Build mission phase manager
- [ ] Implement sustainment calculator
- [ ] Create packing list generator
- [ ] Build logistics validation
- [ ] Add mission timeline visualization

### Phase 4: Comms Validator (Week 7)
- [ ] Build link budget calculator
- [ ] Implement terrain effects model
- [ ] Create relay node placement advisor
- [ ] Add radio selection recommendations

### Phase 5: Reporting & Exports (Week 8)
- [ ] Build mission card generator
- [ ] Create SALUTE report template
- [ ] Implement 16-line format
- [ ] Build technical build package export
- [ ] Add PDF generation capability

### Phase 6: Technical Library (Week 9-10)
- [ ] Build template management system
- [ ] Create STL file repository
- [ ] Implement wiring diagram generator
- [ ] Add version control system
- [ ] Build GitHub Pages wiki

### Phase 7: Integration & Testing (Week 11-12)
- [ ] End-to-end workflow testing
- [ ] Offline capability verification
- [ ] Performance optimization
- [ ] User documentation
- [ ] Demo scenario walkthroughs

---

## V. Technology Stack

### Frontend
- **Framework:** Vanilla JavaScript (no build step for true offline capability) OR React (with bundled offline build)
- **UI Library:** Custom CSS + minimal dependencies
- **Charts:** Chart.js (bundled locally)
- **PDF Generation:** jsPDF (bundled locally)
- **Excel Parsing:** SheetJS (bundled locally)

### Storage
- **Small data:** localStorage (MissionProject state)
- **Large data:** IndexedDB (parts library, build templates)
- **Export:** File download API (no server required)

### Deployment
- **Primary:** GitHub Pages (static hosting)
- **Offline:** Single HTML file with embedded assets (for air-gapped laptops)
- **Mobile:** Progressive Web App (PWA) for tablet/phone use

---

## VI. Data Model Integration

### MissionProject Schema Extensions
```json
{
  "schemaVersion": "2.0.0",

  "partsLibrary": {
    "airframes": [],
    "motors": [],
    "escs": [],
    "batteries": [],
    "flight_controllers": [],
    "radios": [],
    "sensors": []
  },

  "platformDesigns": [
    {
      "id": "string",
      "name": "string",
      "components": {
        "airframe_id": "string",
        "motor_ids": ["string"],
        "esc_id": "string",
        "battery_id": "string",
        "fc_id": "string",
        "radio_ids": ["string"],
        "sensor_ids": ["string"]
      },
      "validation": {
        "auw_g": "number",
        "thrust_to_weight": "number",
        "estimated_flight_time_min": "number",
        "power_budget_W": "number",
        "pass_fail": "boolean",
        "warnings": ["string"]
      },
      "environment_derating": {
        "altitude_m": "number",
        "temperature_c": "number",
        "thrust_reduction_pct": "number",
        "battery_capacity_reduction_pct": "number",
        "adjusted_flight_time_min": "number"
      }
    }
  ],

  "missionPhases": [
    {
      "id": "string",
      "name": "string",
      "type": "orp|infil|on-station|exfil",
      "duration_hours": "number",
      "assigned_platforms": ["string"],
      "power_requirements_W": "number",
      "battery_swaps": "number"
    }
  ],

  "sustainment": {
    "total_batteries_required": "number",
    "battery_swap_schedule": [],
    "packing_lists": [
      {
        "operator_role": "string",
        "items": [],
        "weight_kg": "number",
        "weight_limit_kg": "number",
        "overweight": "boolean"
      }
    ]
  },

  "commsAnalysis": {
    "links": [
      {
        "from": "string",
        "to": "string",
        "distance_m": "number",
        "frequency_mhz": "number",
        "link_budget_db": "number",
        "margin_db": "number",
        "los_clear": "boolean",
        "relay_required": "boolean"
      }
    ],
    "coverage_gaps": []
  }
}
```

---

## VII. User Workflows

### Workflow 1: Build-First (Platform Designer → Mission Planner)
1. Import parts library from unit inventory spreadsheet
2. Design platform in Platform Designer
3. Validate physics and environmental factors
4. Export platform to MissionProject
5. Open Mission Planner and assign platform to mission phases
6. Calculate sustainment requirements
7. Generate packing lists
8. Export mission package

### Workflow 2: Mission-First (Mission Planner → Platform Designer)
1. Define mission phases and duration
2. Identify required capabilities (range, payload, endurance)
3. Open Platform Designer with constraints from mission
4. Design or select platform that meets requirements
5. Validate and export to mission
6. Calculate sustainment
7. Export mission package

### Workflow 3: RF-First (Comms Validator → Platform Designer)
1. Define AO geography and terrain
2. Run comms analysis to identify relay requirements
3. Design relay nodes in Platform Designer
4. Validate RF coverage
5. Build mission timeline with relay deployment
6. Export mission package

---

## VIII. Success Criteria

### Functional Requirements
- [x] Zero external API calls or cloud dependencies
- [ ] Runs completely offline after initial page load
- [ ] CSV/Excel import for parts catalogs works with 1000+ parts
- [ ] Physics validation catches common design errors (underpowered motors, overweight, etc.)
- [ ] Environmental derating provides accurate flight time estimates
- [ ] Mission planner generates correct battery counts for 24/48/72-hour missions
- [ ] Packing lists distribute weight appropriately across team
- [ ] Comms validator identifies coverage gaps
- [ ] All exports are military-standard formats

### Non-Functional Requirements
- Page load time: < 3 seconds on typical laptop
- Offline operation: Works without internet for 100% of features
- Data size: Parts library with 5000 parts < 5 MB
- Browser support: Chrome, Firefox, Safari, Edge (last 2 versions)
- Mobile responsive: Works on tablets (10" screen minimum)
- Accessibility: WCAG 2.1 AA compliant

---

## IX. Risk Mitigation

### Risk 1: Complex Physics Calculations
**Mitigation:** Start with simplified models, iterate toward accuracy. Use lookup tables for common scenarios.

### Risk 2: Large Parts Library Performance
**Mitigation:** Use IndexedDB for storage, implement search indexing, lazy-load data.

### Risk 3: Offline File Handling
**Mitigation:** Use File API for imports, Blob/download API for exports. Test extensively.

### Risk 4: User Adoption
**Mitigation:** Build intuitive UI with guided workflows. Create video tutorials. Provide demo datasets.

---

## X. Next Steps

1. **Immediate:** Review and approve this implementation plan
2. **Week 1:** Set up development environment and data models
3. **Week 2:** Build CSV import engine and parts library UI
4. **Week 3+:** Follow phased implementation schedule

---

## Appendix A: Physics Formulas Reference

### Thrust-to-Weight Ratio
```
T/W = (Total Thrust N) / (AUW kg × 9.81 m/s²)
Minimum: 2.0 for multi-rotor, 1.2 for fixed-wing
```

### Flight Time Estimation
```
Flight Time (min) = (Battery Capacity Wh × Efficiency × DoD) / (Average Power Draw W) × 60
- Efficiency: 0.85 typical
- DoD: 0.8 (Depth of Discharge)
```

### Air Density at Altitude
```
ρ = ρ₀ × (1 - 0.0065 × h / 288.15)^5.255
- ρ₀: 1.225 kg/m³ (sea level)
- h: altitude in meters
```

### Battery Temperature Derating
```
Capacity_adjusted = Capacity_nominal × (1 - 0.01 × |20 - T|)
- T: temperature in °C
- Below -10°C: Apply additional 20-40% reduction
```

---

## Appendix B: Sample Parts Library Schema

See `schema/parts_library_schema.json` (to be created)

---

## Document Control
- **Version:** 1.0
- **Date:** 2026-01-07
- **Author:** Claude Code
- **Status:** Draft for Review
