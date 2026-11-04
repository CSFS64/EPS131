# EEW Lab V0.1 — Model and validation status

## Implemented

The Ridgecrest source is the USGS preferred reviewed event `ci38457511`:
- Time: 2019-07-06T03:19:53 UTC
- Magnitude: Mw 7.1
- Hypocenter: latitude 35.770, longitude -117.599, depth 8.0 km

Station coordinates come from an NCEDC historical Ridgecrest eGF mapping research subset (15 CI broadband sites). The subset is not an inventory of active ShakeAlert stations at the earthquake origin time. Individual network/telemetry status is unknown. City coordinates are approximate geographic city centers.

V0.1 uses a **point source** and a **constant-velocity straight-ray** model:

- Surface epicentral distance: `d = great_circle_distance(epicenter, receiver)` [km]
- Hypocentral straight-ray distance: `R = sqrt(d^2 + depth^2)` [km]
- Arrival times: `t_P = R / Vp` and `t_S = R / Vs`
- Surface wavefront radius: `r(t) = sqrt((v*t)^2 - depth^2)` for `v*t >= depth`, otherwise no surface arrival yet

The path uses Earth-surface great-circle distance plus vertical depth, an approximation. The true 3D ray path, topography, spherical geometry and velocity heterogeneity are not modeled.

**Illustrative** speeds `Vp = 6.0 km/s`, `Vs = 3.5 km/s`. They are not measured from 2019 records.

For each **enabled** station:

`available_i = P_arrival_i + detection_delay + station_network_delay`

`issue = kth_smallest(available_i) + processing_delay`

`delivered = issue + user_delivery_delay`

`lead_city = S_arrival_city - delivered`

The number of stations `k` and all delays are adjustable illustrative parameters, not a reproduction of the proprietary/operational ShakeAlert algorithm. No magnitude-estimation logic, false-alarm logic, finite fault, actual station health, route-specific notification delivery or ground shaking threshold is represented. When enabled stations < k, issue/delivery/lead are unavailable, not zero.

**Important:** S-wave first arrival is not the same as damaging ground motion onset, peak acceleration or maximum shaking. A positive lead does not mean a location would experience damaging shaking, receive an actual alert, or have enough actionable time to respond.

## Intended subsequent validation

1. Download observed event phase picks and compare baseline theoretical P/S times to picks (MAE/bias per station).
2. Add 1D layered TauP predictions and time-aligned model comparison.
3. Add 3D UCVM-based first-arrival travel-time grids; test convergence and surface/receiver treatment.
4. For actual warning performance, gather archival system messages and independently measured delivery latencies, not assumed constants.
5. Add shakemap / population exposure only after clearly distinguishing post-event maps from information available to the warning algorithm.

## Sources

- USGS event: https://earthquake.usgs.gov/earthquakes/eventpage/ci38457511/origin/magnitude
- NCEDC 15-station study: https://ncedc.org/ftp/outgoing/taira/RC/RC_seismicity_map.html
- NCEDC station file: https://ncedc.org/ftp/outgoing/taira/RC/ci_bb_sta.txt
- Optional raw USGS query: https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=ci38457511
- OpenStreetMap tile license/attribution: https://www.openstreetmap.org/copyright

All calculations are in `js/physics.js`, with reproducible tests in `tests/physics.test.mjs`.
