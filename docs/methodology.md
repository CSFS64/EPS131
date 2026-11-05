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

## Station criticality experiment

For each modeled earthquake, velocity model, enabled-station configuration, and trigger threshold k, the station-importance matrix is computed by removing one currently enabled station at a time. For station i, ΔT_i(k) = T_delivery(without i, k) − T_delivery(baseline, k). Detection, telemetry, processing, and delivery delays remain fixed across the counterfactual. A missing baseline alert, a previously disabled station, a missing P prediction, or a counterfactual that makes the alert impossible is reported separately; no missing value is replaced by zero. Because the simulation uses one global alert issue time and one common delivery delay, the effect of disabling a station on delivery time is global, not city-specific. The matrix is a leave-one-out sensitivity measure and does not quantify false alerts, redundancy under multiple simultaneous faults, or actual ShakeAlert operational station importance.

## Candidate-station sensitivity

The grid-based station-placement study is available only with the constant-velocity reference. For each hypothetical candidate latitude and longitude, calculate its P-wave hypocentral arrival using current source position and depth, append the station to the currently enabled network, and recompute the kth earliest station availability and simulated user delivery. Cell gain is the difference between original and added-station delivery times, truncated to nonnegative values. An undefined baseline that becomes possible with one addition is marked separately. Since the detection and telemetry delays are identical for all stations, they cancel when calculating timing gains. Under uniform Vp the spatial benefit is controlled by hypocentral distance and the existing kth station threshold, so contours are nearly radial; this does not determine optimal construction sites. For 1D and 3D models, arbitrary candidate-location travel times have not been computed and the overlay is intentionally unavailable.

## Candidate heatmap visualization

The colored overlay is derived from calculated station-addition benefits for each candidate grid point under the homogeneous constant-velocity model. Colors are normalized to the maximum gain in the current calculation: blue indicates zero benefit and red indicates the current maximum gain. Because the color scale is recalibrated for each source and configuration, hue alone must not be compared across maps; use the displayed time scale or exported numerical CSV. Only grid cells with positive modeled benefit are assigned a positive gain. The original grid values are not interpolated for calculations; the optional Smooth display interpolates colors only.

## Scenario ensemble, plateau behavior and visualization (V0.4.9)

For a single fixed source and equal per-station delays, let a_(k-1) and a_k be the ordered arrival-plus-station-delay times for the existing enabled network, and let c(x) be the candidate station's arrival-plus-delay. Adding one candidate changes the kth threshold to max(a_(k-1), min(c(x), a_k)) for k > 1. The advance is ΔT(x) = max[0, a_k − max(a_(k-1), min(c(x), a_k))]. When c(x) ≤ a_(k-1), the gain becomes a flat plateau equal to a_k − a_(k-1). With homogeneous constant Vp, its boundary depends largely on hypocentral distance, so a circular high-gain zone is expected. For k = 1, the revised threshold is min(c(x), a_1). The implementation preserves distinct undefined/no-alert and recovered-alert cases rather than inventing numeric values.

The optional Regional scenarios analysis replaces the one-source assumption by 21 **deterministic, equally weighted scenario sources**: the center, 8 samples on a 0.52R ring, and 12 samples on a 0.88R ring; R is a user-chosen 20, 35, or 50 km. Every sample retains the center depth. Each existing-network kth availability and each candidate-source P-wave travel time are recomputed independently at every candidate grid point. The displayed score is mean_s[ΔT_s(x)], and the improvement fraction is count_s(ΔT_s(x) > 0)/21. This fraction is not a probabilistic earthquake forecast because the sample locations and equal weights are hypothetical; it cannot be called expected risk reduction without a seismicity model, false-trigger analysis, and station-operating assumptions. Shared detection, telemetry, processing and delivery delays cancel from the station-addition gain, but varying the kth threshold or enabled network changes the geography of benefits.

The Smooth option bilinearly interpolates **displayed raster colors** between calculated grid cells; it does not refine the physical calculations and can visually obscure a true discontinuity or flat region. The Cells option and CSV preserve exact grid sampling. Colors are dynamically normalized to each grid's maximum score; compare labeled seconds and exported CSV values rather than color alone. Neither analysis models local ground-motion thresholds, candidate-site costs, topology-driven communication latency, station noise, fault-specific seismic hazard, or operational ShakeAlert configuration.

## Candidate map: exact gain and P-wave trigger margin

For identical station detection and telemetry delays and a fixed hypocenter, let `t₁ ≤ ... ≤ tₖ` be P arrival times of the enabled stations and `tₓ` the candidate P arrival. When at least k original stations are available and k>1, the new kth arrival is `min(tₖ,max(tₖ₋₁,tₓ))`. Thus actual saved delivery time is `max(0,min(tₖ−tₖ₋₁,tₖ−tₓ))`. The candidate P-wave trigger margin, `tₖ−tₓ`, is different from actual alert gain because gain saturates once the candidate is among the earliest k−1 sensors. For k=1, the new first arrival is `min(t₁,tₓ)` instead. With one fixed source under a homogeneous velocity assumption, candidate P-wave travel time is radial and cannot produce geography-specific irregular boundaries without added physically supported heterogeneity. Both metrics are independently exportable; regional values are equal-weight averages across explicitly hypothetical sources, not estimates of earthquake incidence. Rendered smoothing is visual interpolation between genuine grid calculations.

## Interactive simulated-station network

Version 0.4.12 supports adding or relocating a hypothetical NEW1 station by right-clicking the map. The station is active in the Constant velocity propagation model, where its P and S arrivals are recalculated for the selected historical event and the current latency parameters. The resulting P arrival participates in the kth trigger threshold just like existing stations. Thus alert issue and delivery times, city lead times, station removal sensitivity, station lists, and the candidate placement heatmap all update against the same enabled-station network.

For candidate placement, the baseline network includes an enabled NEW1 when present. Each heatmap cell represents one more candidate sensor added to that baseline, and a disabled NEW1 contributes no arrival. The candidate grid domain remains anchored to the historical reference stations and source rather than expanding when NEW1 is placed outside the study region. Observed picks and their validation statistics remain tied to the original real stations; no observed arrival is generated for NEW1. The 1D and 3D derived model datasets have no arbitrary-site arrivals, so the simulated station is inactive and gray when these models are selected. The calculations are research simulations, not operational ShakeAlert observations or physically validated station siting results.
