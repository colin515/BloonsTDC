# Sandbox Forge implementation status

Replacement of the BloonsTDC working tree on `main`. Previous site met the public URL using GitHub's branch-based Pages workflow. The branch-publish bundle is generated from the same Vite source as the custom Actions artifact.

| Contract | Status | Working coverage and remaining items |
| --- | --- | --- |
| C / T01, T24 | Partial | Vite, TypeScript, Planck, PixiJS, fixed step, time controls, settings, sleeping and culling. No published stress benchmark, render interpolation or render-scale controls. |
| D / T23 | Partial | Classic Flat, Industrial City, Water Laboratory and Moon & Space. Wind, temperature, light, weather, friction, boundaries and gravity are editable. Per-region gravity and map editing remain open. |
| E / T02–T05, T20 | Partial | Dynamic grab, live ghost, exact numeric transform and Enter anchoring, independent flags, group selection and transforms, context menus, joints and undo. Surface and axis snap, mirror, editable pivot, connection selection, distribution and full wheel/attachment editing remain open. |
| F / T06, T16 | Partial | 205 distinct base entries instantiate, 37 devices have graph nodes, 16 vehicle entries can drive. Several mechanics share generic rigid-body settings, craft use simplified propulsion, specialty weapon/deflection and some tool behaviors are simplified. |
| G / T04, T06, T18 | Partial | Articulated ragdolls, material impacts/destruction, bounded debris, basic weld/hinge/rope/spring/slider/suspension. Gear and pulley transmission, joint breaking, independent limb damage, sustained projectiles and detailed damage states remain open. |
| H / T07–T09 | Partial | NPC steering, low obstacle jump, stop at tall obstacle, several tasks, target UI and team/target inheritance for configurable spawns. Navigation graph, alternative paths, route planning across elevations, equipment, explicit signal-task behavior and lift handling remain open. |
| I / T10–T15 | Partial | Seven signal families, 37 devices with functional core behaviors, sensor queries/filters, typed wires with bends, wireless timeout, basic power, motor joints, moving door and piston, and editable examples. Full settings/ports, all sensor filters, network diagnostics, named source targeting, detailed consumption and tests for each device remain open. |
| J / T12–T13 | Partial | Real Blockly editor, fixed controller ports, event, loop, variable, comparison, math, wait and log blocks. Bounded interpreter with quotas. Named custom ports, advanced world/NPC and typed data blocks, multiple handlers, stepping/breakpoints, and full template catalog remain open. |
| K1 / T17 | Partial | Cell-based liquids and gases, buoyancy, sources, offset pump intake/outlet, level sensing and valve-controlled transfer. Discrete attachable pipe and tank items, pressures, drain and full liquid interaction coverage remain open. |
| K2 / T16 | Partial | Wheel assemblies, controls, connectable parts and motor joints. Custom driving control routing via seat and obstacle-aware vehicle preset remain open. |
| K3 / T15 | Partial | Boolean, number, text, vector, object and event payload forwarding over channel/range/timeout. Wireless addressing, visual wireless edges and interference remain open. |
| K4 / T19 | Partial | Pencil, eraser, color, physical shape/dimensions, local custom catalog and sprite/definition embedded in world and blueprint exports. Standalone item import/export, image import, drawing primitives and advanced custom physics/ports remain open. |
| K5 / T18 | Partial | Local heat, fire, spread, smoke, water cooling, ice, ambient weather and wind on dynamic bodies. Directional environmental zones, configurable wind vectors, fluid temperature/phase detail remain open. |
| L / T21 | Partial | Synthesized spatial effects, material impacts, gameplay and machine cues, mixing/mute, unlock, voice cap and gameplay sound events independent of playback. Expanded sound coverage, gapless motor loops, comfort controls and manual audible mix checks remain open. |
| M–N / T19–T23 | Partial | IndexedDB world and blueprint saves, JSON data validation, autosave, inspector, controls and editable examples. Blueprint thumbnails, key remapping, comprehensive tutorial and some transient simulation state restoration remain open. |
| O–Q / T24–T25 | Partial | Chromium verifies core editor and persistence flows at the production base path. Verify public deployment separately. Continue with the remaining acceptance scenarios and full feature-specific tests. |

Initial local verification includes `npm test` (13 physics, signal, persistence and interpreter tests) and `npm run bundle:pages` (type-check and production build).

The Chromium production smoke test covered the live Build placement and exact values, undo, context actions, Physics drag/drop, all four maps, opening and applying a Blockly program, saving and loading through IndexedDB, and audio mixer state.
