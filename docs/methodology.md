# EEW Lab V0.2 — Methods

## Event and stations

- USGS catalog event `ci38457511`, 2019-07-06 03:19:53 UTC, Mw 7.1, depth 8.0 km, 35.770°N, 117.599°W.
- Station subset: 15 CI broadband station coordinates used in a Ridgecrest study published by NCEDC. This subset is not a historical ShakeAlert operational station inventory.
- City points: approximate geographic centers, not census-weighted population estimates.

## Baseline propagation

V0.2 retains a single point hypocenter with straight rays and spatially constant crustal P and S wave speeds. The geodesic distance is approximated with the haversine great-circle distance. The hypocentral range is `R = sqrt(d_surface² + depth²)`. Predicted phase arrival is `R / velocity`. A surface wavefront at elapsed time `t` is only shown for `v * t >= depth`; its horizontal radius is `sqrt((v*t)² - depth²)`.

Defaults are `Vp = 6.0 km/s`, `Vs = 3.5 km/s`, both illustrative. Sliders change these assumptions; they are not fitted measurements of Ridgecrest's crustal velocity. V0.2 does not include layered velocity structure, 3D heterogeneity or finite-fault rupture.

## Station alert model

For each enabled station `i`, `available_i = P_i + detection_delay + telemetry_delay`. The alarm issue time is the time of the *k*th earliest available station plus processing delay. User receipt time adds delivery delay. A city lead time is predicted first S-arrival minus simulated user receipt. The algorithm is an intentionally simplified hypothetical trigger chain, not a reimplementation of ShakeAlert. No actual historical alarm or phone alert times are incorporated.

## Observed phase validation

SCEDC publishes Ridgecrest 2019 phase picks in a publicly hosted STP text file. The optional local pipeline fetches the exact file, selects matching CI station codes, takes the earliest nonnegative P and S pick on the available channels (within 300 seconds), and converts time-after-SCEDC-origin to time-after-the-referenced-USGS-origin. The original origin timestamps and their difference are stored for provenance.

On the website, residual is `predicted - observed`; therefore positive residual means the model arrival is later than the observed pick. `MAE = mean(|residual|)`, `bias = mean(residual)`, and `RMSE = sqrt(mean(residual²))`. Counts are phase-specific; only stations with actual picks are included. A missing archive is represented as *no observed data*, never as an inferred or filled-in value. Users can import a raw `.phase` or generated `.json` file.

Observed phase picks may correspond to different station channels or phases with varying onset quality. Selecting the earliest pick is a documented simple rule; further work should incorporate quality flags, channel selection, station metadata and uncertainty. A mismatch between SCEDC and USGS origins is explicitly corrected, but differences in hypocenter, event magnitude or station elevation still affect residuals. Results cannot be interpreted as purely velocity-model error.

## Map imagery

Three map modes are supported: Esri World Imagery (satellite/aerial), OpenStreetMap tiles, and an offline WGS84 coordinate grid. Tile imagery is external content and subject to its publisher's access conditions. Source credits are shown in the map and no imagery is included in the project repository.

## Verification and limits

Node unit tests cover distance geometry, wavefront formation, trigger ordering, no-alarm cases, latency monotonicity, STP parsing, origin alignment and signed residual statistics. Python unit tests independently check text pick parsing.

Positive simulated lead time does not establish that an actual alert was delivered, that damaging shaking occurred, or that actionable warning time was available. S-wave onset is not synonymous with threshold ground motion. This is a historical teaching/research baseline rather than an operational EEW service.

## Sources

- USGS Ridgecrest event: https://earthquake.usgs.gov/earthquakes/eventpage/ci38457511
- NCEDC Ridgecrest research station set: https://ncedc.org/ftp/outgoing/taira/RC/RC_seismicity_map.html
- NCEDC station coordinates: https://ncedc.org/ftp/outgoing/taira/RC/ci_bb_sta.txt
- SCEDC public phase archive: https://scedc-pds.s3.us-west-2.amazonaws.com/event_phases/2019/2019_187/38457511.phase
- SCEDC STP manual: https://scedc.caltech.edu/research-tools/stp/STP_Manual_v1.01.pdf
- SCEDC dataset citation: https://doi.org/10.7909/C3WD3xH1
- Esri attribution: https://support.esri.com/en-us/knowledge-base/what-is-the-correct-way-to-cite-an-arcgis-online-basema-000012040
- OpenStreetMap attribution: https://www.openstreetmap.org/copyright
