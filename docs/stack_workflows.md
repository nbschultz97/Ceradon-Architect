# Architect Stack workflows

This hub is the connective tissue across Mission Architect, Node Architect, UxS Architect, Mesh Architect, and KitSmith. Every module reads/writes the same `MissionProject` JSON (see `docs/mission_project_schema.md`). Unknown fields should be preserved during edits to avoid data loss. Current reference: **schemaVersion 2.0.0**.

## Data flow overview

1. **Mission Architect (mission-first)** defines `meta`, `mission`, `environment`, and `constraints`. It exports MissionProject for downstream tools.
2. **Node Architect** ingests MissionProject, adds `nodes[]`, and may refine `environment` and `constraints` with RF/power realities.
3. **UxS Architect** consumes the updated project, adds `platforms[]`, endurance, payload checks, and ties `mission.assignments` to platforms.
4. **Mesh Architect** reads nodes/platforms to build `mesh_links[]` and `meshPlan` (relayCount, criticalLinks, rf_bands, ew_profile). It should not discard unrelated mission metadata.
5. **KitSmith** pulls the same project to fill `kits[]`, `sustainment`, and `kitsSummary` while leaving RF/mission fields intact.
6. **Mission Architect (round-trip)** can re-import the enriched payload, generate final TAK/GeoJSON exports, and publish under `exports`.

## Example workflows

- **Mission-first:** Mission Architect → Node Architect → UxS Architect → Mesh Architect → KitSmith → Mission Architect exports.
- **Kit/sustainment-first:** KitSmith (build sustainment baselines) → Mission Architect → Node Architect → UxS Architect → Mesh Architect → exports.
- **RF-first:** Mesh Architect (survey-driven links) → Mission Architect → Node Architect → UxS Architect → KitSmith → exports.

## Preservation rules

- Treat MissionProject as a shared contract; do not delete unrecognized keys. If the UI cannot render a field, leave it untouched in the saved JSON.
- Maintain `origin_tool` on every entity to track provenance across edits.
- When encountering older payloads (`schemaVersion` < `2.0.0`), keep the data, tag it with the current version, and show a non-blocking warning to the user.

## Validation guidance

- Validate against `schema/mission_project_schema_v2.json` before saving or exporting.
- Warn users when required fields are missing (`meta.name`, `meta.durationHours`, `mission`, `environment[]`).
- Prefer additive edits—append constraints, add mesh links, or attach kits—without rewriting or renumbering IDs from other tools.

## Links to demo modules

- Mission Planner: https://nbschultz97.github.io/Ceradon-Architect/#/mission
- Comms Validator: https://nbschultz97.github.io/Ceradon-Architect/#/comms
- Platform Designer: https://nbschultz97.github.io/Ceradon-Architect/#/platform
- Parts Library: https://nbschultz97.github.io/Ceradon-Architect/#/library
- Export: https://nbschultz97.github.io/Ceradon-Architect/#/export
