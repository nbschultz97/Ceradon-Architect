# MissionProject schema

MissionProject is the neutral JSON contract shared by every Ceradon Architect planner. The shape is intentionally compact so offline tools can exchange files without extra adapters.

## Top-level keys

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `mission` | object | Required | Tasks, phases, and assignments that connect nodes/platforms to the plan. |
| `environment` | array | Required | List of environmental contexts (at least one). |
| `constraints` | array | Optional | Policy, airspace, power, or other constraints. |
| `nodes` | array | Optional | Ground sensors, relays, or control nodes. |
| `platforms` | array | Optional | Uncrewed platforms or relay craft. |
| `mesh_links` | array | Optional | RF links between nodes/platforms. |
| `kits` | array | Optional | Sustainment or payload kits. |

Additional supporting keys often present in exports: `schemaVersion` (number), `projectId` (string), `meta` (object with name, description, durationHours, scenario tag, accessCode, origin_tool), `sustainment` (object), `meshPlan` (object), and `kitsSummary` (object). Unknown keys should be preserved when round-tripping.

## mission (object)

- **Required fields:**
  - `tasks` (array): Each task includes `id` (string), `name` (string), and `description` (string).
  - `phases` (array): Each phase includes `id` (string) and `name` (string).
  - `assignments` (array): Each assignment includes `phaseId` (string).
- **Optional fields:**
  - Task-level: `priority` (string), `assignedPlatforms` (array of strings), `origin_tool` (string).
  - Phase-level: `durationHours` (number), `focus` (string), `origin_tool` (string).
  - Assignment-level: `nodeIds` (array of strings), `platformIds` (array of strings), `origin_tool` (string).

## environment (array of objects)

- **Required fields per entry:**
  - `id` (string)
  - `name` (string)
  - `altitudeBand` (string)
  - `temperatureBand` (string)
- **Optional fields:** `weather` (string), `elevationM` (number), `terrain` (string), `notes` (string), `origin_tool` (string).

## constraints (array of objects)

- **Required fields:** `id` (string), `type` (string), `description` (string).
- **Optional fields:** `severity` (string), `origin_tool` (string), `notes` (string).

## nodes (array of objects)

- **Required fields:** `id` (string), `name` (string), `role` (string).
- **Optional fields:**
  - `rf` (object with `band` string and `powerW` number)
  - `power` (string), `battery` (object)
  - `geo` (object with `lat` number, `lon` number, optional `elevationM` number)
  - `origin_tool` (string), `notes` (string)

## platforms (array of objects)

- **Required fields:** `id` (string), `name` (string), `type` (string).
- **Optional fields:**
  - `role` (string), `rf_bands` (array of strings)
  - `power` (string), `battery` (object), `payloadKg` (number), `enduranceMin` (number)
  - `geo` (object with `lat` number, `lon` number, optional `elevationM` number)
  - `origin_tool` (string), `notes` (string)

## mesh_links (array of objects)

- **Required fields:** `id` (string), `from` (string, node/platform id), `to` (string, node/platform id).
- **Optional fields:** `band` (string), `throughputMbps` (number), `role` (string), `notes` (string), `origin_tool` (string).

## kits (array of objects)

- **Required fields:** `id` (string), `name` (string).
- **Optional fields:** `items` (array of strings), `weightKg` (number), `powerSupportWh` (number), `origin_tool` (string), `notes` (string).

## Persistence expectations

- Tools should accept partial payloads and preserve unknown keys.
- When merging legacy schema v1, map `meshPlan.links` → `mesh_links`, `kitPlans.kits` → `kits`, and `meta.environment` → first `environment[]` entry.
- All entities should carry `origin_tool` markers where available to avoid losing authorship context during exports.
