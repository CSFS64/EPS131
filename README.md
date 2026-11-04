# EEW Lab V0.3

[Open website](https://csfs64.github.io/EPS131/) · [Methods](docs/methodology.md)

Interactive earthquake arrival-time analysis for the July 2019 Ridgecrest Mw 6.4 and Mw 7.1 earthquakes.

## Controls

- **Event:** Select either historical USGS event.
- **Model:** Select constant-speed baseline, TauP iasp91 1D (when computed data are present), or Ridgecrest 3D tomography (when computed data are present).
- **Propagation:** Adjust constant-speed P and S velocities; wavefront circles are displayed only for the constant-speed baseline.
- **Stations:** Review 15 real research station locations and change simulated trigger-network availability.
- **Validation:** Compare modeled station arrivals with SCEDC phase picks; view MAE, signed bias, and per-station residuals.
- **Latency:** Adjust simulated trigger and notification delays; export results as CSV.
- **Map:** Satellite (Esri), Street (OpenStreetMap), and offline coordinate Grid.
- **Keyboard:** Tab navigates controls; visible border indicates keyboard focus; Left/Right switches analysis tabs; Space toggles playback when no control is focused.

Only the historical earthquake origin and station coordinates are verified inputs to all scenarios. SCEDC phase-pick times are recorded observations. All modeled arrival times and alerts are calculations, not actual historical ShakeAlert messages. Station membership does not establish participation in the operational ShakeAlert network.

## Run locally

From this folder:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/`.

## Refresh published data

The GitHub Actions workflow `Observed events and 1D travel times` retrieves phase picks from the SCEDC public archive for both events and computes iasp91 1D arrival times using ObsPy TauP. Both events and the 1D and 3D result files are present in the published repository. Automated jobs publish downloadable 1D artifacts; model outputs are committed independently.

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