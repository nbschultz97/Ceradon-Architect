# ATAK / Tactical-App Exports

The hub can export MissionProject data to two offline-friendly formats meant for TAK servers or small companion apps.

## GeoJSON export
- Trigger: **Export GeoJSON** button in the Mission Workflow panel or call `MissionProjectStore.exportGeoJSON()`.
- Output: `FeatureCollection` containing `Point` features for nodes/platforms (when `geo.lat`/`geo.lon` are present) and `LineString` features for `mesh_links` with both endpoints resolved.
- Properties per feature:
  - `id`, `name`, `role`, `origin_tool`
  - Nodes: `rf_band`, `power`, `battery`
  - Platforms: `rf_bands`, `power`, `battery`, `type`
  - Links: `from`, `to`, `band`, `throughputMbps`, `role`, `notes`
- Clients can drop this straight into TAK as a GeoJSON overlay; missing coordinates are skipped instead of failing the export.

## CoT-style JSON stub
- Trigger: **Export CoT Stub** button or `MissionProjectStore.exportCoTStub()`.
- Output: lightweight JSON shaped for quick ingestion by TAK adapters:
```json
{
  "type": "cot-stub",
  "schemaVersion": 2,
  "mission": "Sample demo project",
  "units": [
    { "type": "sensor", "id": "demo-ridge-relay", "callsign": "Portable relay", "role": "LOS hop", "lat": 0.01, "lon": 0.01, "hae": 240, "origin_tool": "mesh" },
    { "type": "platform", "id": "demo-quad", "callsign": "COTS quad", "role": "Short-range recon", "lat": 0.008, "lon": 0.012, "hae": 210, "origin_tool": "uxs" }
  ]
}
```
- Units are emitted only when coordinates are present.
- Adaptation tip: wrap each unit in your preferred CoT XML/JSON envelope (`a-f-G-U-C` or similar) while retaining the stable IDs.

## Access control
Exports are available in the demo without gating. If you need local access controls, implement them in your deployment environment (browser profile, OS account, or kiosk tooling). No external API calls are made during export.
