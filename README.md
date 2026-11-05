# EEW Lab V0.4.7

[Open website](https://csfs64.github.io/EPS131/) · [Methods](docs/methodology.md)

Interactive earthquake arrival-time analysis for the July 2019 Ridgecrest Mw 6.4 and Mw 7.1 earthquakes.

## Workspace

The page is organized as a fixed global toolbar and four independent, collapsible research modules. The toolbar keeps the earthquake, propagation model, satellite/street/grid basemap, CSV export and experiment reset available at all times.

- **Model accuracy:** Compare P- and S-wave MAE across constant-speed, iasp91 TauP 1D, and Ridgecrest 3D straight-path velocity integrations. Set baseline velocities when the constant model is selected.
- **Alert timing:** Inspect issue/delivery times and a five-stage origin-to-delivery breakdown. Change the station trigger threshold, detection, telemetry, processing, and delivery delays.
- **Station network:** Review arrival ordering and stations contributing to the current hypothetical trigger. Enable/disable individual sites or all sites.
- **Observed residuals:** Inspect bias, largest absolute residuals and the SCEDC arrival-pick table. Import .phase or .json picks.
- **Map:** Review epicenters, stations, cities, and constant-speed P/S wavefronts. Satellite uses Esri imagery, Street uses OpenStreetMap, and Grid works offline.
- **Keyboard:** Native Tab/Shift+Tab navigation and visible 3px focus outlines. Details summaries toggle with Enter or Space. Buttons do not scale and panels do not fade.

Only the historical earthquake origin and station coordinates are verified inputs to all scenarios. SCEDC phase-pick times are recorded observations. All modeled arrival times and alerts are calculations, not actual historical ShakeAlert messages. Station membership does not establish participation in the operational ShakeAlert network.

## Run locally

From this folder:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/`.

## Refresh published data

The GitHub Actions workflow `Observed events and 1D travel times` retrieves phase picks from the SCEDC public archive for both events and computes iasp91 1D arrival times using ObsPy TauP. Both events and the 1D and 3D results are present in the published repository. Automated jobs publish downloadable 1D artifacts; model outputs are committed independently.

```bash
python -m pip install obspy==1.4.2
python pipeline/fetch_events_phases.py
python pipeline/build_1d.py
```

The published `data/models-3d.json` includes computed travel times for both Ridgecrest events, based on a user-provided result from the White et al. (2021) tomography velocity CSV (https://data.mendeley.com/datasets/gv33tgvt5f/2). The result reports 5,006,725 model nodes and integrates slowness along fixed source-to-receiver lines. This is **not** curved-ray 3D ray tracing or a seismic wavefield simulation. The Los Angeles city target has no valid 3D coverage; its travel times are null. The original velocity CSV is not stored in the repository. The public API downloader remains unavailable because its prior GitHub Actions request returned HTTP 401.

To reproduce 3D results from a locally downloaded file:

```bash
python -m pip install numpy scipy
python pipeline/build_3d.py --input White_et_al_2021__Ridgecrest_2019_velocity.csv
```

If a model's prediction dataset is unavailable, the model is disabled in the website. Missing arrivals are omitted from statistics and are never treated as zero. Downloaded model source files are not committed; only compact calculated arrivals are published.

## Baseline travel-time comparison

Mean absolute error in seconds, computed against SCEDC P/S phase picks on matching station subsets. Smaller MAE is better.

| Event | Phase (n) | Constant speed | iasp91 1D | Tomography 3D straight path |
|---|---|---:|---:|---:|
| Mw 7.1 | P (14) | 0.244 | 0.259 | 0.541 |
| Mw 7.1 | S (10) | 1.203 | 1.035 | 0.711 |
| Mw 6.4 | P (15) | 0.203 | 0.272 | 0.406 |
| Mw 6.4 | S (10) | 0.766 | 0.578 | 0.458 |

3D predictions are improved for S arrivals but worse for P arrivals under the current assumptions. These results are model-to-pick comparisons, not observed ShakeAlert performance. Station elevations and datum alignment, pick quality, finite rupture, and within-sequence tomography data reuse remain methodological limitations.

## Tests

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
```

## Research limitations

- The baseline uses straight rays in homogeneous material. iasp91 uses a global 1D reference Earth model and may be inappropriate for short regional distances.
- The 3D integration samples a tomography grid, without ray bending, accurate station elevations, finite-fault source kinematics or full waveform solution.
- White et al. tomography was derived using 2019 Ridgecrest seismicity. Validation against the same earthquake sequence is **not** independent validation of the velocity inversion, even though two separate events are compared.
- Report P and S sample counts and identical receiver subsets when comparing models; no model is assumed superior.
- The alert network uses hypothetical detector, telemetry, processing and user-message latencies. S-wave onset is not a validated damaging-motion threshold.

Source code and static assets use relative paths for migration to another account. Update the source link in `index.html` when moving the project.

## Interface

The interface uses plain bordered controls with immediate hover, selected, and keyboard focus states. Event, Model, and Map remain available at the top. Model accuracy, Alert timing, Stations, and Observed residuals are independent native disclosure panels. Nonessential headings, labels, decorative icons, and model exposition were removed from the page. Scientific assumptions and limitations remain documented in [Methods](docs/methodology.md).

## Control states

Pointer hover uses a contrasting fill on action controls. An active press uses an inset border. Selected models, cities, and toggles retain a separate persistent outline, while keyboard navigation uses an external focus ring. Controls do not change size or fade during state changes.

## Interface details

The interface uses Windows system typography, 1px control borders, subtle inset bevels and separate hover, pressed, selected and keyboard focus states. Model accuracy is a bordered sheet; Alert timing uses a flat left-side rail; Stations uses a folder-style header and list; Observed residuals uses a rounded data panel. Inner numerical results and parameter rows are unboxed to reduce repeated nested frames. No research data or computational parameters are changed by this styling revision.

## Interface revision

V0.4.5 returns to a flat institutional web-app treatment, guided by ALEKS-like clear selection and U.S. government web-interface practices. It removes desktop-style bevels and artificial highlights while retaining distinct default, hover, pressed, selected and keyboard-focus states. Topbar controls, research disclosures, station lists and model comparisons use restrained but purpose-specific borders. No seismic models or observational data were changed.

## Interaction states

The interface follows the supplied ALEKS control references: primary and secondary buttons, grouped map toggles, persistent selections, direct disclosure headers and keyboard-visible focus rings. Pointer hover, press, keyboard focus and selection each have distinct borders or fills. No animations or code annotations are used.

## Station importance heatmap

Open Stations to see a leave-one-station-out sensitivity matrix. Each row is a station and each column is the number of stations required for a hypothetical alert (k=1–15; scroll horizontally to inspect all thresholds). Each cell represents the increase in message delivery time, in seconds, from disabling exactly that station while keeping the other currently enabled stations and all latency parameters unchanged. A zero means no change; `×` means the alert becomes impossible because too few stations remain. `—` denotes an already disabled station, missing model arrival, or an undefined baseline. The current trigger threshold column is outlined. Clicking a valid cell changes the trigger threshold and selects the corresponding station. The Map colors switch colors station markers by the importance for the current threshold and selected model, rather than by arrival state. Event, model, threshold, velocity, and station enable/disable changes recompute the matrix. Global Export CSV includes the full matrix; the PNG button exports a standalone full-resolution heatmap for reports. These are modeled time sensitivities, not observed operational ShakeAlert criticalities. Under this network model, the change in message delivery time is the same across destinations; individual city lead-time changes differ only when the corresponding modeled S-arrival is unavailable.

## Candidate station placement heatmap (V0.4.7)

Open Stations → Candidate station map. Under Constant velocity, the overlay estimates the decrease in modeled alert delivery time from adding one hypothetical station at each regular geographic-grid cell. Calculations use the current station enable/disable state, trigger threshold, equal station telemetry and detection delays, constant Vp, and either the selected historical event or manual latitude, longitude, and depth. The old network is preserved and one candidate is added at a time. Grid density is adjustable and cells can be exported as CSV. The top candidate locations are listed. The Use map center button switches to Manual source and places the source at the map's current center.

The gain equals the baseline delivery time minus the delivery time after inserting the candidate into the ordered P-wave station arrivals, bounded below by zero; a recovery when the baseline cannot issue an alert is a separate status. Constant velocity produces approximately source-centered gain contours under uniform station delays; it does not model geologic anisotropy, operational noise, site construction feasibility, or a spatially varying telecommunications network. One-dimensional TauP and the existing 3D results cannot safely interpolate arbitrary candidate cells because the current derived files contain only station and city arrivals; this overlay is disabled for 1D and 3D selections. These are illustrative planning sensitivities, not a recommendation to build stations at particular locations or a reconstruction of historical ShakeAlert operations.
