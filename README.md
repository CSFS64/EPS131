# EEW Lab V0.2

[Open website](https://csfs64.github.io/EPS131/)

A lightweight scientific workspace for the 2019 Ridgecrest earthquake. Contains an interactive P/S arrival baseline, 15 real research station coordinates, adjustable station trigger and latency scenarios, and an optional measured-arrival comparison from the Southern California Earthquake Data Center.

## Run

From the project root, run `py -m http.server 8000`, then open `http://localhost:8000/`. Alternatively, double-click `start_windows.bat` on Windows.

- **Propagation:** change assumed constant P/S velocities and show surface wavefronts.
- **Stations:** enable, disable and inspect the 15 NCEDC station sites.
- **Validation:** see phase-specific MAE, bias and station residuals when real SCEDC picks have been loaded. Import `.phase` or `.json` files here.
- **Latency:** change the hypothetical trigger count, station detection and delivery delays; export CSV.
- **Basemap:** Satellite / Street / Grid. Satellite uses Esri World Imagery, with attribution on the map. The Grid mode works offline.
- **Playback:** play/pause, restart, scrub, change speed, or use Space when focus is outside controls.

## Observed data

The SCEDC source archive is `s3://scedc-pds/event_phases/2019/2019_187/38457511.phase` (STP format).

To download and process real observations locally:

```sh
python pipeline/fetch_phases.py
```

The resulting `data/observations.json` is loaded automatically by the site. The script can also process a locally downloaded source using `python pipeline/fetch_phases.py --input local.phase`. GitHub Actions has a manual and push-triggered workflow to retrieve and commit the observed data from the public archive. If downloading fails, the application shows *No observations loaded*; it does not invent reference picks.

## Check

```sh
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
```

## Repo layout

- `index.html`, `css/style.css`, `js/app.js`, `js/map.js`: interface and interaction
- `js/physics.js`, `js/observations.js`: calculations and validation
- `data/ridgecrest-2019.json`: historical source and illustrative model parameters
- `data/observations.json`: generated only after successfully obtaining SCEDC observations
- `pipeline/fetch_phases.py`: reproducible ingestion
- `docs/methodology.md`: scientific definitions, data provenance and limitations
- `.github/workflows/scedc-phases.yml`: automate optional observation refresh

This site is a research demonstration, not a live warning service or a reconstruction of the operational ShakeAlert network. Avoid using simulated S arrivals as a proxy for damaging shaking.

The project uses relative file paths and can be copied into a different GitHub Pages repository. If you change GitHub accounts, update the source-code link in `index.html`.
