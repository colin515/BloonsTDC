# Sandbox Forge

[Play Sandbox Forge](https://colin515.github.io/BloonsTDC/)

Build machines, move and connect physical parts, wire sensors to devices, and experiment in four maps. The game runs in a desktop browser with WebGL and stores worlds and blueprints in IndexedDB. A keyboard and mouse are recommended.

| Control | Action |
| --- | --- |
| 1 / Physics | Drag catalog parts into the world, or grab and release a live object |
| 2 / Build | Preview a part, rotate it with Q / E, and press Enter to anchor it while the simulation runs |
| 3 / Select | Shift-click or drag a rectangle to select multiple objects |
| Middle drag / wheel | Pan / zoom |
| F / G | Toggle anchoring / grid |
| Space | Pause or resume |
| Ctrl+Z / Ctrl+Y | Undo / redo edits |
| Right-click | Open object and device actions |
| Double-click Logic controller | Open Blockly |

Select an output in a device's **Device** tab, click another device, and choose a compatible input. The example scenes include a sensor-operated door, thermostat, wireless alarm and water transfer. **Load** has local saves and JSON import/export. Use **Save blueprint** with objects selected to reuse an assembly. The menu at the top left includes the pixel editor for custom parts.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:browser
```

The browser test uses installed Chromium or the Playwright browser installed with `npx playwright install chromium`. Set `FORGE_CHROMIUM` to select a browser executable, or `FORGE_BROWSER_URL` to test an existing deployment. Vite uses the `/BloonsTDC/` base. The app shell lives in `src/page.html`.

## Publishing

This repository's existing Pages source publishes the root of `main`. Run `npm run bundle:pages` when preparing a release. It generates the root `index.html`, `forge-assets/` and `forge-media/` from source. Commit those files with the release so GitHub Pages can publish them from the existing source. The production output is also available in `dist/`. The included Actions workflow builds and tests the source on pushes. To publish via the custom workflow, select **GitHub Actions** as the Pages source and dispatch **Sandbox Forge Pages**.

See [implementation status](docs/STATUS.md) for verified coverage and open items. Forge produces its gameplay sounds through Web Audio. The app bundles Planck and PixiJS (MIT) and Blockly and its editor interface media (Apache-2.0).
