# Ceradon Architect Stack Hub

This repo is the front-door, static SPA hub for the Ceradon Architect tools, published via GitHub Pages at <https://nbschultz97.github.io/Ceradon-Architect/>. It links to the live module apps, explains the integrated planning workflow, and now provides a single-page Mission Workflow dashboard that embeds every planner.

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
- MissionProject schema v2 lives in `assets/js/mission_project.js` and persists to `localStorage` under `ceradon_mission_project`. Full reference: `docs/mission_project_schema.md`.
- Core shape: `meta`, `environment[]`, `nodes[]`, `platforms[]`, `mesh_links[]`, `kits[]`, `mission{tasks,phases,assignments}`, `constraints[]`, `sustainment`, `meshPlan` summary, `kitsSummary`. Every entity includes `origin_tool` for cross-tool provenance.

- Helper API exposed globally as `MissionProjectStore`:
  - `createEmptyMissionProject()`, `loadMissionProject()`, `saveMissionProject(updatedProject)`
  - `exportMissionProject(fileName)`, `exportGeoJSON()`, `exportCoTStub()` / `importMissionProject(file)`
  - `validateMissionProject()` and `migrateMissionProjectIfNeeded(project)` placeholders for forward compatibility
- The workflow dashboard form writes directly to this object, so other repos can read the same structure without extra wiring.
- WHITEFROST demo: `data/whitefrost_demo_project.json` provides the cold-weather scenario with TAK-ready exports.

## Tool deep links
- Node Architect: <https://node-architect.ceradonsystems.com/?access_code=ARC-STACK-761>
- UxS Architect: <https://uxs-architect.ceradonsystems.com/?access_code=ARC-STACK-761>
- Mesh Architect: <https://mesh-architect.ceradonsystems.com/?access_code=ARC-STACK-761>
- KitSmith: <https://kitsmith.ceradonsystems.com/?access_code=ARC-STACK-761>
- Mission Architect: <https://mission-architect.ceradonsystems.com/?access_code=ARC-STACK-761>

## Notes
- The site is fully static and GitHub Pages–compatible; no backend or build tooling is required.
- Mission Architect already exists as its own app and is integrated via links/iframe only.
