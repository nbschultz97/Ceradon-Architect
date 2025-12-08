# MissionProject Schema (v2)

MissionProject is the common JSON contract across the Ceradon Architect Stack. The hub, Node Architect, UxS Architect, Mesh Architect, KitSmith, and Mission Architect exchange this structure to avoid brittle per-tool adapters.

## Top-level fields

- `schemaVersion` (number): Current version is **2**.
- `projectId` (string): Stable ID for the mission package.
- `meta` (object): Name, description, duration, `origin_tool`, scenario tag, inventory reference, and gate access code used when the project was authored.
- `environment` (array): AO and weather contexts with altitude/temperature bands and elevation cues.
- `nodes` (array): Sensors or RF nodes with stable IDs, RF bands, power/battery notes, and optional geo coordinates.
- `platforms` (array): UxS or relay platforms with payload roles, RF bands, power/battery envelopes, and optional geo coordinates.
- `mesh_links` (array): RF links/edges tying nodes and platforms together; include band, throughput, and path notes.
- `kits` (array): Sustainment or payload kits with weight and power support details.
- `mission` (object): Tasks, phases, and assignments tying nodes/platforms to phases.
- `constraints` (array): Mission or policy constraints (airspace, comms, logistics) with severity.
- `sustainment` (object): Hours of support and battery counts.
- `meshPlan` (object): Summary counts for relays and critical links (optional but preserved for UI checks).
- `kitsSummary` (object): Per-operator load summary for quick feasibility reads.

All entities accept an `origin_tool` tag (`"hub"`, `"node"`, `"uxs"`, `"mesh"`, `"kit"`, `"mission"`) to document where they were first authored. Tools should leave existing tags intact and only stamp missing values.

## Detailed shapes

### environment[]
```json
{
  "id": "env-main",
  "name": "Baseline AO",
  "altitudeBand": "2000-3200m",
  "temperatureBand": "-20-0C",
  "weather": "Light blowing snow",
  "elevationM": 2750,
  "terrain": "alpine",
  "origin_tool": "hub",
  "notes": "Whiteout risk after 1500L"
}
```

### nodes[]
```json
{
  "id": "ridge-relay",
  "name": "Ridgeline relay",
  "role": "LOS relay",
  "rf": { "band": "L/S", "powerW": 8 },
  "power": "Smart battery",
  "battery": { "chemistry": "Li-ion", "capacityWh": 98 },
  "geo": { "lat": 46.1, "lon": 90.4, "elevationM": 2870 },
  "origin_tool": "mesh",
  "notes": "Tripod mount to clear saddle"
}
```

### platforms[]
```json
{
  "id": "wf-quad-alpha",
  "name": "Printed quad",
  "type": "Quad",
  "role": "Cold-weather recon",
  "rf_bands": ["2.4 GHz", "915 MHz"],
  "power": "6S Li-ion",
  "battery": { "capacityWh": 150, "lowTempLimitC": -20 },
  "payloadKg": 1.6,
  "enduranceMin": 32,
  "geo": { "lat": 46.102, "lon": 90.405, "elevationM": 2785 },
  "origin_tool": "uxs"
}
```

### mesh_links[]
```json
{
  "id": "link-1",
  "from": "base-mesh",
  "to": "ridge-relay",
  "band": "L/S",
  "throughputMbps": 12,
  "role": "Backhaul",
  "notes": "Primary mesh leg",
  "origin_tool": "mesh"
}
```

### kits[]
```json
{
  "id": "kit-alpha",
  "name": "Alpha sustainment",
  "items": ["6x cold-rated batteries", "Tripod", "Heater cartridges"],
  "weightKg": 11.2,
  "powerSupportWh": 588,
  "origin_tool": "kit"
}
```

### mission
```json
{
  "tasks": [
    { "id": "task-1", "name": "Route recon", "description": "Scout saddle and village approaches", "assignedPlatforms": ["wf-quad-alpha"], "priority": "High", "origin_tool": "mission" }
  ],
  "phases": [
    { "id": "phase-1", "name": "Insertion", "durationHours": 12, "focus": "Establish relay and cache", "origin_tool": "mission" }
  ],
  "assignments": [
    { "phaseId": "phase-1", "nodeIds": ["ridge-relay"], "platformIds": ["wf-quad-alpha"], "origin_tool": "mission" }
  ]
}
```

### constraints[]
```json
{
  "id": "constraint-battery",
  "type": "power",
  "description": "Limit sorties to 25 minutes below -15C",
  "severity": "medium",
  "origin_tool": "hub"
}
```

### Sustainment and kit summary
```json
{
  "sustainment": { "sustainmentHours": 72, "batteryCounts": 20, "feasibility": {}, "notes": "Rotate packs indoors" },
  "kitsSummary": { "perOperatorLoads": [{ "role": "Alpha TL", "weightKg": 21 }], "perOperatorLoadKg": 20, "perOperatorLimitKg": 23 }
}
```

## Import/export expectations
- Tools should accept partial payloads (e.g., platforms without kits or mesh_links without all endpoints) and preserve unknown fields.
- When importing legacy schema v1, map `meshPlan.links` to `mesh_links`, `kitPlans.kits` to `kits`, and `meta.environment` to the first `environment[]` entry.
- Exporters should include `origin_tool` tags and stable IDs untouched.
- Geo features rely on `geo.lat` and `geo.lon`; exporters skip entries without coordinates rather than failing.
