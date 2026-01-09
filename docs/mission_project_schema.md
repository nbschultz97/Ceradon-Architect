# MissionProject schema v2.0.0

MissionProject is the neutral JSON contract shared by every Ceradon Architect planner. Version `2.0.0` lives in this repo as `schema/mission_project_schema_v2.json` and is the single source of truth for downstream tools.

## Top-level keys

| Key | Type | Required | Primary owner | Notes |
| --- | --- | --- | --- | --- |
| `schemaVersion` | string | Required | Hub | Semantic version for compatibility checks. Current: `2.0.0`. |
| `meta` | object | Required | Mission Architect | Name, description, duration, scenario tags, and team size/roles. |
| `mission` | object | Required | Mission Architect | Tasks, phases, assignments, and mission_cards. |
| `environment` | array | Required | Mission Architect / Node / Mesh | One or more AO contexts (altitudeBand, temperatureBand, terrain, weather). |
| `constraints` | array | Optional | Mission Architect / Node | Airspace, EW, policy, and power constraints that other tools should preserve. |
| `nodes` | array | Optional | Node Architect | Ground/relay nodes with RF, power, and geo hints. |
| `platforms` | array | Optional | UxS Architect | Uncrewed platforms with payload/endurance details. |
| `mesh_links` | array | Optional | Mesh Architect | RF links between nodes/platforms with throughput and band data. |
| `kits` | array | Optional | KitSmith | Sustainment/payload kits with weight/power support. |
| `sustainment` | object | Optional | KitSmith | Duration coverage, power plans, packing lists. |
| `meshPlan` | object | Optional | Mesh Architect | Relay counts, critical links, rf_bands, ew_profile. |
| `kitsSummary` | object | Optional | KitSmith | Per-operator load summaries and limits. |
| `exports` | object | Optional | Mission Architect | Export links/notes for TAK, GeoJSON, or other formats. |
| `projectId` | string | Optional | Hub | Stable identifier for local persistence. |

Unknown fields must be preserved when round-tripping between tools.

## Field expectations by module

- **Mission Architect** populates `meta`, `mission`, `constraints`, and final `exports` including TAK products. It should preserve any unknown fields.
- **Node Architect** adds or edits `nodes[]` and can append environmental constraints (`environment[]`, `constraints[]`).
- **UxS Architect** populates `platforms[]`, endurance, payload metrics, and sorts assignments via `mission.assignments` when applicable.
- **Mesh Architect** writes `mesh_links[]`, `meshPlan` (relay counts, rf_bands, ew_profile), and may add environment RF notes.
- **KitSmith** writes `kits[]`, `sustainment` (power_plan, packing_lists), and `kitsSummary` load figures.
- **Hub (this repo)** seeds `schemaVersion`, `projectId`, starter metadata, and provides validation helpers.

## Required structures

### meta (object)
- `name` (string), `durationHours` (number), `origin_tool` (string).
- Optional: `description`, `scenario`, `inventoryReference`, `accessCode` (local-only label, unused in demo), `team{size, roles[]}`.

### mission (object)
- `tasks[]`: `id`, `name`; optional `description`, `priority`, `assignedPlatforms[]`, `origin_tool`.
- `phases[]`: `id`, `name`; optional `durationHours`, `focus`, `origin_tool`.
- `assignments[]`: `phaseId`; optional `nodeIds[]`, `platformIds[]`, `origin_tool`.
- `mission_cards[]`: optional free-form mission card entries.

### environment (array)
- Each entry: `id`, `name`, `altitudeBand`, `temperatureBand`; optional `weather`, `elevationM`, `terrain`, `notes`, `origin_tool`.

### constraints (array)
- Each entry: `id`, `type`, `description`; optional `severity`, `notes`, `origin_tool`.

### nodes (array)
- Each node: `id`, `name`, `role`; optional `rf{band,powerW}`, `power`, `battery`, `geo{lat,lon,elevationM}`, `origin_tool`, `notes`.

### platforms (array)
- Each platform: `id`, `name`, `type`; optional `role`, `rf_bands[]`, `power`, `battery`, `payloadKg`, `enduranceMin`, `geo{lat,lon,elevationM}`, `origin_tool`, `notes`.

### mesh_links (array)
- Each link: `id`, `from`, `to`; optional `band`, `throughputMbps`, `role`, `notes`, `origin_tool`.

### kits (array)
- Each kit: `id`, `name`; optional `items[]`, `weightKg`, `powerSupportWh`, `origin_tool`, `notes`.

### sustainment (object)
- Optional `sustainmentHours`, `batteryCounts`, `feasibility`, `notes`, `power_plan`, `packing_lists[]`.

### meshPlan (object)
- Optional `relayCount`, `criticalLinks`, `rf_bands[]`, `ew_profile`.

### kitsSummary (object)
- Optional `perOperatorLoads[]`, `perOperatorLoadKg`, `perOperatorLimitKg`.

### exports (object)
- Optional `links[]` and `notes` to describe planned or delivered export artifacts.

## Validation

- Authoritative schema file: `schema/mission_project_schema_v2.json`.
- The hub provides a lightweight validator that checks required fields and basic types before saving/importing.
- Older payloads with numeric `schemaVersion` are accepted but tagged with `schemaVersion: "2.0.0"` and surfaced with a warning banner in the UI.

## Round-tripping guarantees

- Tools should accept partial payloads and preserve unknown keys.
- Legacy v1 fields map cleanly: `meshPlan.links` → `mesh_links`, `kitPlans.kits` → `kits`, `meta.environment` → first `environment[]` entry.
- All entities should carry `origin_tool` markers where available to avoid losing authorship context during exports.
