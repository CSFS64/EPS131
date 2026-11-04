# Methods and data provenance · V0.3

## Events

USGS events:

- [ci38457511](https://earthquake.usgs.gov/earthquakes/eventpage/ci38457511): Mw 7.1, 2019-07-06 03:19:53 UTC, 35.770 N, -117.599 W, 8 km depth.
- [ci38443183](https://earthquake.usgs.gov/earthquakes/eventpage/ci38443183): Mw 6.4, 2019-07-04 17:33:49 UTC, approximately 35.705334 N, -117.50383 W, 10.5 km depth.

15 CI broadband station coordinates are taken from a published NCEDC Ridgecrest mapping subset. Membership in this scientific selection does not prove operational participation or connectivity in the ShakeAlert network. City coordinates are approximate geographic centers, not population-weighted points.

## Observed arrival picks

The Southern California Earthquake Data Center (SCEDC) publishes event-phase STP files. The fetch script downloads each event archive and selects the earliest recorded nonnegative P or S pick (up to 300 s) for station codes in the selected list. Phase picks may have different channel types and onset quality. The script converts SCEDC-origin-relative times to a chosen USGS origin using an explicit stored origin time offset. Missing picks remain missing.

## Constant-velocity reference

Surface distance d uses a haversine great-circle approximation. With hypocentral depth h and chosen velocities Vp and Vs, arrival time is sqrt(d²+h²)/V. The curved Earth's structure, station elevation, site effects and finite fault rupture are not represented.

## TauP 1D model

ObsPy TauP uses the standard iasp91 spherical 1D Earth model, with first available P/S-family arrivals for a source at USGS catalog depth and receiver epicentral distance. The iasp91 model is not a locally fitted Ridgecrest crustal model. Some regional phase combinations may have no theoretical result; they are displayed as unavailable rather than substituted with constant-speed arrivals.

## Ridgecrest 3D tomography model

The 3D input is the published velocity grid of White, Fang, Catchings, Goldman, Steidl, and Ben-Zion (2021), dataset DOI [10.17632/gv33tgvt5f.2](https://doi.org/10.17632/gv33tgvt5f.2). The CSV has latitude, longitude, depth (relative to sea level) and Vp/Vs columns. The model builder selects relevant cells and builds a spatial KD-tree in a locally approximated Cartesian coordinate system.

For each source-to-receiver segment, it samples 121 positions and estimates Vp/Vs from eight nearby velocity nodes using inverse-distance-squared weights. The travel time is the line integral of slowness over the fixed straight segment, approximated by trapezoidal numerical integration. If velocity coverage exceeds a 5 km nearest-neighbor gap at any sample, the result is null. This is a true spatially variable 3D velocity input, **but it is not 3D ray tracing or fast marching**; the ray path is not bent to minimize travel time. Station elevation and depth datum differences are neglected. Values should not be treated as high-accuracy observed travel times.

The tomography was itself derived from earthquakes in the 2019 sequence. Comparing it with the 2019 Mw 6.4 and 7.1 picks is useful as a software and model comparison, but **does not constitute a fully independent out-of-sample test of the tomography**.

## Validation

For each station and phase with both a valid observed pick and a valid modeled arrival, residual = predicted − observed, MAE = mean absolute residual, Bias = mean signed residual, RMSE = root mean square residual. Positive residuals indicate late predictions, and negative residuals indicate early predictions. Model-specific missing predictions can change sample sizes. Scientific comparisons require matching station subsets and checking phase-pick quality.

## Simulated warning system

An enabled station is available after calculated P arrival + detection delay + station telemetry delay. The hypothetical issue time is the kth available station plus a processing delay, and user message time adds a delivery delay. Lead time is modeled first S arrival at a city minus modeled user message time. This calculation is **not** a real ShakeAlert reconstruction and is not a estimate of damaging shaking arrival.

## Sources

- [USGS Ridgecrest sequence](https://www.usgs.gov/news/2019-ridgecrest-california-earthquake-sequence-geonarrative)
- [NCEDC station locations](https://ncedc.org/ftp/outgoing/taira/RC/ci_bb_sta.txt)
- [SCEDC event phase archive](https://scedc.caltech.edu/data/cloud.html)
- [ObsPy TauP](https://docs.obspy.org/packages/obspy.taup.html)
- [White et al., GJI 2021](https://doi.org/10.1093/gji/ggab224)
- [White et al., tomography dataset](https://data.mendeley.com/datasets/gv33tgvt5f/2)
- [W3C WCAG 2.2 focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
- [Esri World Imagery attribution](https://support.esri.com/en-us/knowledge-base/what-is-the-correct-way-to-cite-an-arcgis-online-basema-000012040)
