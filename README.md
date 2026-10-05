# VAAYU — Air Operations Planning

An integrated, responsive working prototype for humanitarian aviation planning, inspired by the user-supplied SIH26250 problem summary. The default workspace contains no operational records. A separately enabled demo uses synthetic records. No restricted operational systems are connected.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open the address printed by the development server. A clean local environment uses the framework's portable development profile. No API keys, database setup or accounts are required.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The source follows Next.js App Router conventions, uses React 19 and strict TypeScript, and is built through Vinext/Vite for the included Cloudflare-compatible deployment. `npm run build` generates `dist/client` and `dist/server`. `npm start` serves the generated Worker locally with Wrangler. The supplied Sites hosting manifest connects to the original private deployment; use a new project identity for a separate deployment.

The application opens in a clean geographic workspace. **Load demo** enables the optional sample scenario; **Leave demo** returns to the empty operational workspace without deleting saved demo progress. The browser owns this explicitly local demonstration. It persists in `localStorage` under `vaayu-demo-v1` on the current device. A storage failure leaves a clearly labelled session-only mode. Reloading retains the scenario. Reset Demo restores every seeded domain collection; selected viewing role is a UI preference.

## What is included

- Dashboard with live-derived fleet readiness, mission feasibility, utilisation, resource bottlenecks and alerts.
- Fourteen fictional aircraft, eight independently selectable components each, eighteen fictional flight teams, twelve humanitarian missions, eight maintenance history records, three open seeded work orders, five fictional locations, five synthetic weather records, two seeded restrictions and twelve initial audit entries.
- Interactive representative twin-engine jet inspection mesh using Three.js, React Three Fiber and Drei: rotate, zoom, pan, select, focus, reset, labels, status overlay and exploded view.
- Automatic Three.js SVGRenderer compatibility mode when WebGL2 is unavailable. This still projects and rotates real 3D geometry, with raycast component selection and OrbitControls. It is not a screenshot.
- Accessible selectable 2D aircraft schematic, component register and detail panel backed by the same records.
- Maintenance workflow: fault → created work order → in progress → task completed → verified → recorded clearance. Completion alone does not make the aircraft available.
- Scheduling timeline, mission register and manual assignment form with immediate constraint explanations.
- Deterministic alternatives, transparent scores, dynamic before/after metrics, manual selection, approval, reject, cancel, undo and a chronological audit trail.
- Interactive Leaflet geographic map on a bundled basemap showing India's official boundaries (all of J&K and Ladakh, including PoK, Gilgit-Baltistan and Aksai Chin), with state/UT borders, pan/zoom, regional presets and optional demo route/weather/airspace layers.
- Crew qualification/readiness and duty management, fuel allocation and inventory reservations/consumption.
- Role switcher, five scenario disruptions, comprehensive reset, clear source/freshness metadata and no live-feed claims.

## Architecture

| Module                              | Responsibility                                                         |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `domain/types.ts`                   | Typed domain objects, actions, roles, proposals and metrics            |
| `domain/seed.ts`                    | Single synthetic seed and public context references                    |
| `domain/engine.ts`                  | Pure constraints, metrics, state transitions, approval, audit and undo |
| `domain/store.tsx`                  | Shared React context; local persistence and error feedback             |
| `components/shell.tsx`              | Navigation, role switcher, global search, loading/error boundaries     |
| `components/aircraft-model.tsx`     | WebGL aircraft rendering and interactive controls                      |
| `components/software-aircraft.tsx`  | GPU-independent 3D compatibility renderer                              |
| `components/aircraft-schematic.tsx` | Accessible selectable 2D airframe schematic                            |
| `components/inspection.tsx`         | Fleet and component/maintenance interaction                            |
| `components/operations.tsx`         | Timeline, assignments, alternatives, comparison and approval           |
| `components/mission-map.tsx`        | Interactive synthetic operational map and route details                |
| `components/resources.tsx`          | Maintenance, crews, fuel and inventory                                 |
| `components/control.tsx`            | Alerts, audit, scenario controls and provenance                        |
| `tests/engine.test.ts`              | Deterministic workflow, migration and constraint tests                    |

No page has a separate operational dataset. State changes run through `transition`, which clones the previous state, checks permissions/constraints, records events and revalidates affected missions. Derived selectors feed the dashboard, timeline, map and detail views. Work-order clearance is stored with officer, time, work, inspection result, notes and previous/new status. Audit events survive schedule undo; the explicit full demo reset restores the seed audit.

### Constraints and ranking

Hard constraints cover unresolved component faults, open maintenance clearance, missing/stale component records, positioning, payload, medical equipment, range reserve, minimum aircraft fuel, base fuel allocation, crew availability/fitness, crew/aircraft qualification, rest, cumulative duty, inspection expiry, aircraft and crew overlap, 45-minute turnaround, mission departure windows, severe weather and route restrictions.

For each aircraft and eligible crew team, candidate times are drawn from original departure, aircraft readiness, other assignment end plus turnaround, and weather/restriction end times. Invalid options are excluded from recommendation. Feasible options are ordered by:

```text
score = delayMinutes × (5 − missionPriority)
      + missionFuelLitres / 1000
      + otherActiveAircraftWorkMinutes / 60
      + 20 × inspectionRequiredComponents
```

Lower is better. A manual choice must also be feasible. Operational changes invalidate a pending proposal. Approval rechecks the selected option; it never silently commits a stale plan. P1 changes additionally require the Operations Supervisor. This is a bounded, per-mission deterministic planner, not a global mathematical optimiser.

## Exact hero demonstration

1. Click **Reset Demo**. The initial RLF-204 assignment is TR-03, 18 tonnes, 14:00 IST.
2. Open **3D Inspection**, select **VAAYU-TR-03** and **Left engine**. Click **Enable maintenance controls**, or choose **Maintenance Officer** in the top-right role switcher.
3. Click **Record component fault**. The prefilled fault is _EGT sensor anomaly_, Major, 150 minutes. Submit.
4. The component is FAULT; TR-03 is grounded. MX-204 is created and one EGT spare is reserved. RLF-204 becomes CONFLICT; alerts, metrics and the timeline update.
5. Switch to **Operations Planner**. Open **Schedule**, select RLF-204 and click **Find alternatives**.
6. TR-07 is recommended at 14:18 (+18 min). TR-06 is feasible at 14:47 (+47 min). TR-04 is rejected for insufficient payload/inspection expiry; TR-05 for unavailable crew. Inspect every alternative and its constraints.
7. Compare current vs proposed metrics. **Approve Replan** applies TR-07/CREW-07 consistently. The mission conflict is resolved; the TR-03 fault alert stays open.
8. **Undo applied plan** restores TR-03 and the conflict, preserving the approval audit event. Regenerate and approve again if continuing to recovery.
9. Switch to **Maintenance Officer**, open **Maintenance**, and find MX-204. Click **Start maintenance**. Complete the inspection checks and work notes, then **Complete maintenance task**. Complete the verification checks and result, then **Record passed verification**. Enter a clearance statement and click **Issue maintenance clearance**.
10. TR-03 remains grounded through task completion and verification. Only the final recorded clearance makes it available. The spare is consumed and the maintenance history is appended.
11. Reset restores the original state without restarting the application.

For a quicker presentation, **Scenario Control → Record engine fault** injects the same domain action. Scenario injection intentionally bypasses the demo role gate; ordinary workflow controls do not.

## Other scenarios

- Severe weather at Delta invalidates affected missions and makes departures after 15:30 candidates.
- Crew-03 unavailable invalidates that team's assignments.
- Alpha–Delta corridor closure blocks departure windows until 15:00.
- Urgent P1 medevac creates an unassigned request. Medical capability, turnaround and timing may leave no feasible option; the application explains and blocks approval rather than fabricating capacity.
- TR-12 demonstrates UNKNOWN avionics and STALE tail information; neither is assumed healthy.
- TR-04 demonstrates inspection expiry and payload limits.

## Data provenance

Public context links:

- https://www.sih.gov.in/
- https://mausam.imd.gov.in/imd_latest/contents/meteorological-services-civil-aviation.php
- https://aim-india.aai.aero/
- https://aim-india.aai.aero/notam-summaries

The IMD and AAI public context pages were accessible during development. The SIH homepage returned a 403 response. The complete official SIH26250 brief has **not** been independently verified; full official-brief compliance is not claimed.

Weather/restriction records explicitly store source context URL, SIMULATED mode, updated time, null retrieval time and staleness. No observations or NOTAMs are ingested from those sources. No IMD, AAI, IAF or Ministry of Defence operational integrations exist. Locations and map coordinates are fictional and are not suitable for real navigation.

## Validation

`npm test` covers the hero chain, exact 18/47-minute options, dynamic comparisons, approval, undo, maintenance clearance, permissions, manual rejection, stale proposal invalidation, missing data, payload, duty/rest, range/fuel, inspections, turnaround, weather, airspace, spare shortages, P1 approval and full reset. See `VERIFICATION.md` for the browser checks and their scope.

## Known limitations

- A demonstration only: no operational certification, enterprise authentication or secure server-side access control. Role gates are local prototype controls, not a security boundary.
- State is device-local; no shared multi-user database, backend concurrency, cross-device synchronisation or real telemetry.
- The simulation clock stays at 02 Oct 2026, 13:30 IST for repeatability; interaction audit timestamps use actual time. No automatic mission completion or flight execution occurs.
- Crew records represent complete fictional flight teams. Medical fitness is a simple readiness flag.
- Maintenance stages advance on explicit recorded actions. Repair estimates are forecasts, not real elapsed-time gates; spare logistics is a simplified +4h shortage model.
- The Leaflet map uses real geographic context from a fully bundled basemap; it makes no external tile requests. Demo hub placements remain synthetic and are not real facilities. The basemap supplies no operational telemetry, weather or airspace clearances.
- The default viewer uses five licensed reference models: A320, A350 and B737 (amvlab), Rafale (andertan), and Su-35 (Muhamad Mirza Arrafi), all CC BY 4.0 with embedded textures in WebGL. Inspection zones are approximate external overlays, not segmented manufacturer CAD. Synthetic transport capacities belong to the planning records, not the displayed aircraft. SVG compatibility mode uses simplified untextured materials. The exploded view is a separate illustrative component assembly.
- The planner evaluates one mission at a time; it does not solve simultaneous disruptions globally, reposition aircraft automatically, model return legs or replace other missions automatically.
- Fuel is a synthetic per-mission requirement plus a base allocation constraint, not a certified aerodynamic or flight-performance model. Known simulated restrictions are checked by route/time, not real altitude volumes.
- Search is local. Public fonts require a network connection; system font fallbacks keep the app usable offline. All simulation data, geometry and map layers are bundled.

## Inspection and maintenance redesign

The component register now includes a fleet-wide issues filter, component-specific inspection points, equipment and spare requirements, and direct work-order navigation. A non-faulted component can receive an inspection-only work order; this withholds the aircraft until recorded clearance without consuming a spare. See `DESIGN_NOTES.md` for tool provenance and `public/models/ATTRIBUTION.md` for the aircraft license.

## Distinct fleet and fighter references

The airframe selector loads separate A320, A350, B737, Rafale and Su-35 meshes with their authored materials. Fleet category filters and silhouettes distinguish transport, medical and fighter records. VAAYU-FJ-01 and VAAYU-FJ-02 are fictional readiness/inspection demonstrations, with independent component records and qualified demo teams. They cannot carry humanitarian missions in this prototype; the constraint engine rejects such assignments explicitly. No combat or targeting functionality exists.

`domain/airframes.ts` maps operational records to licensed visual references. Model proportions and appearance are visual context, never real performance data. `domain/migration.ts` upgrades saved v1 scenarios without discarding missions, faults, work orders or audit history. Reset restores the expanded 14-aircraft seed. Su-35 uses a simplified model in software rendering; WebGL retains the full asset and textures. Fighter 2D schematics and inspection-zone layouts differ from transport layouts. The exploded assembly remains an illustrative systems diagram, not disassembly of manufacturer CAD.

## Geographic dashboard and workspace modes

The clean workspace is the default for new and existing users upgrading to this version. It shows an India-region map and unavailable operational feeds, without simulated fleet counts, sample missions, hub labels or generated weather. The original scenario remains behind **Load demo** for workflow demonstrations. Mode choice persists separately under `vaayu-workspace-mode-v2`; scenario data remains under the existing `vaayu-demo-v1` key. Leaving the demo removes its records from every operational view without destroying the saved scenario.

The map uses Leaflet 1.9.4 over `public/maps/india-official.geojson`, built from Natural Earth's public-domain 1:10m India point-of-view boundaries. Third-party raster tiles (including OpenStreetMap) draw de facto lines in Jammu & Kashmir, so none are used. See `public/maps/ATTRIBUTION.md` for how the file was built. It is small-scale reference cartography, not navigation-grade or a Survey of India product. Location labels appear on hover/focus, keeping routes unobstructed; mission details sit below the map.
# VAAYU_Demo
