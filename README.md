> Interface update V0.1.1: academic light theme informed by common learning-platform interaction patterns. Physics, data provenance, and model limitations remain identical to V0.1.

# EEW Lab — V0.1.1

**Earthquake Early Warning Research Lab · Ridgecrest 2019 Historical Replay**

An interactive, browser-based teaching/research baseline for 2019 Ridgecrest earthquake travel-time simulations. The app loads one reviewed USGS historical event, 15 **real geolocated broadband station sites from an NCEDC research subset**, and displays theoretical P/S surface arrival fronts, station P-wave timing, a configurable illustrative trigger/latency chain, and lead-time estimates for six city centers. It is **not** an operational ShakeAlert reconstruction, a damaging shaking model, or a live warning service.

## Run on Windows

1. Extract this ZIP (all files should be directly inside the `EEW-Lab-v0.1` directory, not inside a second nested folder).
2. Double-click `start_windows.bat` **or** open PowerShell in the extracted folder.
3. If using PowerShell, run:

   ```powershell
   py -m http.server 8000
   ```

4. Open http://localhost:8000/ in the browser. (The `.bat` file also prints this address.)

The website **does not require npm, Python packages or a backend**. Python is only used to start a small local static HTTP server. The event/station data and scientific calculations work offline. For an online basemap, your browser needs access to OpenStreetMap raster tiles; uncheck **Street basemap (online)** to use the built-in coordinate grid offline.

## Interactions

- ▶ Play / pause; timeline scrubber; time speed selector; `Space` to play/pause (when a form control is not focused)
- Drag map to pan; mouse wheel or +/- to zoom; recenter control
- Toggle P/S waves and station/basemap layers
- Click a station or city to inspect theoretical arrivals and simulated warning timeline
- Enable/disable stations individually in **Station network**
- Vary trigger count, detection delay, network latency, processing delay and delivery latency in **Experiments**
- Export event/city/station calculations and scenario parameters as CSV
- **Method & sources** clearly separates verified data from modeled assumptions

## Run unit tests (optional)

```powershell
node --test tests/physics.test.mjs
```

Node 18+ is required for tests only, not to use the website.

## Host on GitHub Pages

This site uses only **relative asset paths**, so you can move it between accounts/repositories without changing source code.

1. Create a new, otherwise empty public repository (for example `eew-lab-test`).
2. Upload the **contents** of this folder to the repository root, including `index.html`, `css/`, `js/`, `data/`, `docs/`, `pipeline/`, `tests/`.
3. In repo **Settings → Pages**, select **Deploy from a branch**, `main`, `/(root)`, **Save**.
4. The project will normally be served at `https://ACCOUNT.github.io/REPOSITORY/`. To remove the account from the visible URL, attach a custom domain, or publish from a separate GitHub account.

GitHub public repositories are browsable and reveal their owner. A custom domain hides the username in the URL but does not make the public code anonymous. Other repos remain private only if their visibility is Private.

## Project structure

```text
index.html              website
css/style.css           styles
js/app.js               UI, playback, controls, export
js/map.js               canvas tile map and wavefront rendering
js/physics.js           travel-time and alert-chain functions
\ndata/ridgecrest-2019.json    verified event/station locations + clearly marked assumptions
pipeline/refresh_sources.py  optional USGS source data downloader
samples: none fabricated
\ndocs/methodology.md     formulae, sources, limitations
\ntests/physics.test.mjs  automated checks
```

## What comes later?

- V0.2: observed SCEDC phase pick comparisons, model error metrics, reproducible multi-event tests
- V0.3: 1D TauP layered velocities and measured/sourced latency distributions
- V1.0: 3D SCEC UCVM travel-time maps, uncertainty and rigorously defined population exposure

Do **not** infer that station coordinates mean live network connectivity or that theoretical S-wave arrival means damaging shaking.

### 中文快速说明

解压后进入文件夹，打开 PowerShell，运行 `py -m http.server 8000`，浏览器访问 `http://localhost:8000/`。这是可交互、可打包转移到其他 GitHub 账号的静态网站。内置 USGS 真实地震参数与 NCEDC 研究用真实台站坐标，但波速和延迟是演示用假设参数，**不是**实际 ShakeAlert 系统历史性能。点击左侧 `Experiments` 可以改变台站数和延迟，右下侧可以看到预警时间变化；GitHub Pages 可以直接托管。

## V0.1.1 interface update (4 November 2026)

- Academic light-theme research workspace inspired by conventional learning-platform interaction patterns (teal header, structured controls, progress markers and calm data cards); not affiliated with or using ALEKS assets.
- Reworked map, results and playback styling for clear separation of **historical source facts** from **modeled results**.
- Recolored the canvas wavefronts and station markers for legibility on a light map.
- Numerical baseline and all scientific limitations are unchanged from V0.1.

### GitHub Pages deployment

1. Create or authorize an empty repository. Copy the **contents of this folder** to the root of the repository (do not nest under another EEW-Lab folder).
2. Go to repository **Settings → Pages** and select **Deploy from a branch** → **main** → **/(root)**, then save.
3. Once GitHub reports the site as published, open the Pages URL shown in Settings.
4. The site uses relative paths and can later be moved to a different account without changing the application paths. Replace the source-code link in `index.html` if you move accounts.

This is a research/teaching demonstration and not a live public safety application. The website does not use ALEKS design assets, trademarks or source code.