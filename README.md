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

The GitHub Actions workflow `Observed events and 1D travel times` retrieves phase picks from the SCEDC public archive for both events and computes iasp91 1D arrival times using ObsPy TauP.

```bash
python -m pip install obspy==1.4.2
python pipeline/fetch_events_phases.py
python pipeline/build_1d.py
```

The `Ridgecrest 3D tomography` workflow retrieves White et al. (2021) tomography data (if accessible) and integrates slowness along fixed source-to-receiver lines. The 3D calculation is **not** a full 3D ray-bending or seismic wavefield simulation; it uses the published 3D velocities under a straight-ray approximation.

To reproduce 3D results from a locally downloaded file:

```bash
python -m pip install numpy scipy
python pipeline/build_3d.py --input White_et_al_2021__Ridgecrest_2019_velocity.csv
```

If a model's prediction dataset is unavailable, the model is disabled in the website. Missing arrivals are omitted from statistics and are never treated as zero. Downloaded model source files are not committed; only compact calculated arrivals are published.

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
