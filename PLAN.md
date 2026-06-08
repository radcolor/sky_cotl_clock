# Isekai SkyGame-Data Companion Plan

This file tracks the implementation plan for turning Isekai into an in-game
execution companion for Sky: Children of the Light. The app should complement
Sky Planner, not clone it.

## Product Direction

- [x] Keep the existing clock overlay as the default in-game experience.
- [x] Treat the overlay as a compact execution aid, not a full planner window.
- [x] Use SkyGame-Data as the canonical content source.
- [x] Build route and mini map features around manual player-selected routes.
- [ ] Expand deeper planner features after the data foundation is stable.

## Safety Boundary

- [x] Do not read game memory.
- [x] Do not inject into or modify the game process.
- [x] Do not automate gameplay input.
- [x] Do not connect to Sky accounts or game servers.
- [x] Do not claim live player tracking or GPS.
- [x] Keep all route progress and planner state local to the user's device.

## Phase 1: Planning Document

- [x] Add `PLAN.md`.
- [x] Document product direction and safety boundary.
- [x] Track implementation phases with checkboxes.
- [x] Update this file as phases are completed.

Acceptance: contributors can open this file and understand what has shipped,
what is active, and what is future work.

## Phase 2: Full SkyGame-Data Foundation

- [x] Add a repeatable data generator script.
- [x] Read `node_modules/skygame-data/assets/everything.json`.
- [x] Resolve references with `SkyDataResolver` during generation only.
- [x] Write acyclic runtime JSON to `src-ui/data/skygame/selected-data.json`.
- [x] Bundle all major SkyGame-Data groups:
  - [x] realms
  - [x] areas
  - [x] winged-lights
  - [x] map-shrines
  - [x] constellations
  - [x] seasons
  - [x] events
  - [x] event-instances
  - [x] event-instance-spirits
  - [x] spirits
  - [x] spirit-trees
  - [x] spirit-tree-tiers
  - [x] nodes
  - [x] traveling-spirits
  - [x] returning spirits via special-visits and special-visit-spirits
  - [x] items
  - [x] item-lists
  - [x] shops
  - [x] iaps
  - [x] candles
- [x] Add route-ready summaries for realms, areas, spirits, and winged lights.

Acceptance: the app can load the generated data without circular references and
can query route targets by realm and area.

## Phase 3: Route State And Settings

- [x] Extend planner state with active route and route progress.
- [x] Preserve old planner state during migration.
- [x] Add route navigation helpers.
- [x] Add overlay mode settings.
- [x] Add route and mini map hotkey settings.

Acceptance: existing goals and wishlist survive migration, and route progress
can be advanced, toggled, and reset locally.

## Phase 4: Routes Page

- [x] Add a Routes page to the sidebar.
- [x] Add realm and area selectors.
- [x] Add spirit and winged light route filters.
- [x] Add route preview and progress controls.
- [x] Add area image, target counts, and connected area context.

Acceptance: a user can choose an area route and send it to the overlay without
using Sky Planner or leaving the app.

## Phase 5: Overlay Modes

- [x] Keep Clock mode as the default overlay.
- [x] Add Route mode for one compact current objective.
- [x] Add Mini Map mode for selected area reference.
- [x] Add Clock + Route mode for clock plus mini map and route text.
- [x] Budget Clock + Route rows: up to 2 clock rows with mini map, up to 3
  clock rows with route text only.
- [x] Redesign overlay settings so enabled layouts control both the default
  dropdown and mode-cycle hotkey.
- [x] Add hotkeys for mode cycling and target navigation.
- [x] Sync route planner state to the overlay window.

Acceptance: the overlay can switch between clock, route, and mini map modes
without breaking click-through use.

## Phase 6: Mini Map V1

- [x] Show selected area image when available.
- [x] Render winged light pins using generated map positions.
- [x] Render spirit pins as area-level reference pins when exact positions are
  unavailable.
- [x] Highlight the active target and dim completed targets.
- [x] Fall back to route-card mode when mini map data is incomplete.
- [x] Allow mini map mode to show route text below the map.

Acceptance: V1 gives useful in-game location guidance for spirits and winged
lights while clearly remaining a reference overlay.

## Phase 7: Tests And Verification

- [x] Test generated data counts and required groups.
- [x] Test route target grouping.
- [x] Test mini map pins.
- [x] Test planner migration.
- [x] Test route navigation helpers.
- [x] Run `bun run test`.
- [x] Run `bun run build`.
- [x] Run `cd src-rs && cargo check`.

Acceptance: route data, planner state, overlay mode behavior, and existing clock
features are covered by automated checks where practical.

## Future Data Features

- [ ] Add map shrine route targets.
- [ ] Add candle route sessions.
- [ ] Add spirit tree cost planning.
- [ ] Add traveling and returning spirit visit planning.
- [ ] Add shop, IAP, and item source detail views.
- [ ] Add constellation and realm completion views.
