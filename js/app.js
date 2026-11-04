import { calculateNetwork, fmtSeconds, fmtSignedSeconds } from './physics.js';
import { EEWMap } from './map.js';

const $ = id => document.getElementById(id);
const defaults = {};
const controlIds = {
  'trigger-count': ['triggersRequired', true],
  'detect-delay': ['detectionDelayS', false],
  'network-delay': ['networkDelayS', false],
  'process-delay': ['processingDelayS', false],
  'delivery-delay': ['deliveryDelayS', false]
};
let data, model, results, map;
let elapsed = 0, playing = false, speed = 1, lastFrame = 0, selected = {kind:'city',id:'ridgecrest'};
const disabled = new Set();
const rounded = n => n === null ? '—' : n.toFixed(1);

async function init() {
  try {
    const response = await fetch('./data/ridgecrest-2019.json', {cache:'no-cache'});
    if (!response.ok) throw Error(`HTTP ${response.status} reading local data`);
    data = await response.json();
    model = {...data.model}; Object.assign(defaults,model);
    $('load-state').textContent = `${data.stations.length} real station coordinates loaded`;
    $('duration-readout').textContent = `${model.durationS} SEC`;
    $('scrubber').max = model.durationS;
    $('vp-readout').innerHTML = `${model.vpKmS.toFixed(1)} <span>km/s</span>`;
    $('vs-readout').innerHTML = `${model.vsKmS.toFixed(1)} <span>km/s</span>`;
    map = new EEWMap($('map'), onSelect);
    map.data = data;
    map.selection = selected;
    for (const [id,[key]] of Object.entries(controlIds)) $(id).value = model[key];
    wireControls();
    updateCalculations();
    setElapsed(0);
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  } catch (err) {
    $('load-state').textContent = 'Dataset failed to load';
    const box=document.createElement('div');box.className='error-banner';
    box.textContent=`Unable to load local JSON data: ${err.message}. Run the project via "py -m http.server 8000" rather than opening index.html with file://.`;
    document.querySelector('.workspace').append(box);
    console.error(err);
  }
}
function updateCalculations() {
  results = calculateNetwork(data,model,disabled);
  map.results = results;
  map.render();
  updateControlLabels();
  updateStationList();
  updateCityList();
  updateInspector();
}
function updateControlLabels() {
  for(const [id,[key,whole]] of Object.entries(controlIds)){
    $(id+'-val').textContent = whole ? String(model[key]) : fmtSeconds(model[key]);
  }
}
function updateStationList() {
  const root=$('station-list');root.replaceChildren();
  for(const st of results.stations){
    const label=document.createElement('label');label.className='station-item';
    const check=document.createElement('input');check.type='checkbox';check.checked=st.enabled;
    check.setAttribute('aria-label',`Enable station ${st.id}`);
    check.addEventListener('change',()=>{if(check.checked)disabled.delete(st.id);else disabled.add(st.id);updateCalculations();});
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent=st.id;
    const subtitle=document.createElement('small');subtitle.textContent=`P ${fmtSeconds(st.p)} · ${st.distanceKm.toFixed(1)} km`;
    info.append(title,subtitle);
    const focus=document.createElement('button');focus.type='button';focus.textContent='⌖';focus.title=`Focus on ${st.id}`;
    focus.addEventListener('click',()=>{onSelect('station',st.id);map.focus(st.latitude,st.longitude,9.4);});
    label.append(check,info,focus);root.append(label);
  }
}
function updateCityList() {
  const root=$('city-list');root.replaceChildren();
  for(const c of results.cities){
    const btn=document.createElement('button');btn.type='button';
    btn.className=`city-item${selected.kind==='city'&&selected.id===c.id?' selected':''}`;
    const name=document.createElement('span');name.textContent=c.name;
    const time=document.createElement('strong');time.textContent=fmtSignedSeconds(c.lead);
    time.className=c.lead===null?'':c.lead>=0?'positive':'negative';
    btn.append(name,time);btn.addEventListener('click',()=>onSelect('city',c.id));
    root.append(btn);
  }
}
function textRow(label,value,color='') {
  const row=document.createElement('div');row.className='metric-row';
  const l=document.createElement('span');l.textContent=label;
  const v=document.createElement('strong');v.textContent=value;if(color)v.className=color;
  row.append(l,v);return row;
}
function updateInspector() {
  const root=$('system-times');root.replaceChildren();
  root.append(textRow('First station P arrival',fmtSeconds(results.firstStation?.p ?? null),'cyan'));
  root.append(textRow(`Station #${model.triggersRequired} available`,fmtSeconds(results.kthStation?.available ?? null)));
  root.append(textRow('Simulated alert issue',fmtSeconds(results.issue),'amber'));
  root.append(textRow('Simulated user delivery',fmtSeconds(results.delivered),'amber'));
  root.append(textRow('Enabled stations',`${results.triggered} / ${results.stations.length}`));
  $('timeline-mini').replaceChildren();
  for(const t of [0, results.firstStation?.p, results.kthStation?.available,results.issue,results.delivered]) {
    const m=document.createElement('div');m.className=`milestone ${t!==null&&t!==undefined&&elapsed>=t?'done':''} ${t===results.issue?'alert':''}`;
    m.title=t===undefined||t===null?'Unavailable':`t = ${t.toFixed(1)} s`;$('timeline-mini').append(m);
  }
  const selectedCity=results.cities.find(c=>c.id===selected.id);
  const selectedStation=results.stations.find(s=>s.id===selected.id);
  const value=$('lead-value');value.className='lead-value';
  const eyebrow=document.querySelector('.summary-lead .section-eyebrow');
  if(selected.kind==='station'&&selectedStation){
    const s=selectedStation;
    $('inspector-title').textContent=s.id;
    $('inspector-subtitle').textContent=`Real station coordinates · ${s.distanceKm.toFixed(1)} km from epicenter`;
    eyebrow.textContent='THEORETICAL P-WAVE ARRIVAL';
    value.innerHTML=`${rounded(s.p)} <span>s</span>`;
    value.classList.add('neutral');
    $('lead-description').textContent=`S-wave arrival ${fmtSeconds(s.s)} · Hypothetical data availability ${fmtSeconds(s.available)} · ${s.enabled?'Station enabled':'Station disabled'}`;
  } else if(selected.kind==='event'){
    $('inspector-title').textContent='Ridgecrest 2019';
    $('inspector-subtitle').textContent='USGS reviewed earthquake origin';
    eyebrow.textContent='SIMULATED ALERT ISSUE';
    value.innerHTML=`${rounded(results.issue)} <span>s</span>`;
    value.classList.add('neutral');
    $('lead-description').textContent='Point-source approximation · historical origin, simulated alert timing';
  }else if(selectedCity){
    $('inspector-title').textContent=selectedCity.name;
    $('inspector-subtitle').textContent=`Approximate city center · ${selectedCity.distanceKm.toFixed(1)} km from epicenter`;
    eyebrow.textContent='MODEL ESTIMATED LEAD TIME';
    value.innerHTML=`${rounded(selectedCity.lead)} <span>s</span>`;
    value.classList.add(selectedCity.lead===null?'neutral':selectedCity.lead>=0?'':'negative');
    $('lead-description').textContent=selectedCity.lead===null?'Not enough enabled stations to issue a simulated alert.':selectedCity.lead>=0?'Hypothetical message delivery before first S-wave arrival.':'Hypothetical message delivery AFTER first S-wave arrival.';
    root.append(textRow(`${selectedCity.name}: P arrival`,fmtSeconds(selectedCity.p),'cyan'));
    root.append(textRow(`${selectedCity.name}: S arrival`,fmtSeconds(selectedCity.s),'amber'));
  }
}
function onSelect(kind,id) {
  selected={kind,id};map.selection=selected;
  if(kind==='station'){
    const station=results.stations.find(s=>s.id===id);
    if(!station)return;
  }
  updateCityList();updateInspector();map.render();
}
function setElapsed(t) {
  elapsed=Math.min(model.durationS,Math.max(0,t));
  $('scrubber').value=String(elapsed);
  $('scrubber').style.setProperty('--fill',`${elapsed/model.durationS*100}%`);
  const mm=Math.floor(elapsed/60).toString().padStart(2,'0');
  const ss=(elapsed%60).toFixed(1).padStart(4,'0');
  $('time-readout').textContent=`${mm}:${ss}`;
  map.elapsed=elapsed;map.render();
  updateInspector();
}
function setPlay(b) {playing=b; $('play').textContent=b?'Ⅱ':'▶'; $('play').setAttribute('aria-label',b?'Pause':'Play');}
function frame(ts) {
  const delta=Math.min(0.2,(ts-lastFrame)/1000);lastFrame=ts;
  if(playing){let t=elapsed+delta*speed;if(t>=model.durationS){t=model.durationS;setPlay(false);}setElapsed(t);}
  requestAnimationFrame(frame);
}
function wireControls() {
  for (const tab of document.querySelectorAll('.side-tab')) tab.addEventListener('click',()=>{
    document.querySelectorAll('.side-tab').forEach(t=>{t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab));});
    document.querySelectorAll('.panel-content').forEach(p=>p.classList.toggle('active',p.id===`panel-${tab.dataset.panel}`));
  });
  $('toggle-p').addEventListener('change',e=>{map.showP=e.target.checked;map.render();});
  $('toggle-s').addEventListener('change',e=>{map.showS=e.target.checked;map.render();});
  $('toggle-stations').addEventListener('change',e=>{map.showStations=e.target.checked;map.showLabels=e.target.checked;map.render();});
  $('toggle-tiles').addEventListener('change',e=>{map.showTiles=e.target.checked;map.render();});
  $('zoom-in').addEventListener('click',()=>map.changeZoom(0.6));
  $('zoom-out').addEventListener('click',()=>map.changeZoom(-0.6));
  $('recenter').addEventListener('click',()=>map.focus(35.43,-117.77,8));
  $('play').addEventListener('click',()=>{if(elapsed>=model.durationS)setElapsed(0);setPlay(!playing);});
  $('restart').addEventListener('click',()=>{setPlay(false);setElapsed(0);});
  $('scrubber').addEventListener('input',e=>{setElapsed(Number(e.target.value));});
  $('speed').addEventListener('change',e=>{speed=Number(e.target.value);});
  for (const [id,[key]] of Object.entries(controlIds)){
    $(id).addEventListener('input',e=>{model[key]=Number(e.target.value);updateCalculations();});
  }
  $('enable-all').addEventListener('click',()=>{disabled.clear();updateCalculations();});
  $('disable-all').addEventListener('click',()=>{data.stations.forEach(s=>disabled.add(s.id));updateCalculations();});
  $('reset-experiment').addEventListener('click',()=>{
    Object.assign(model,defaults);disabled.clear();
    for(const [id,[key]] of Object.entries(controlIds))$(id).value=String(model[key]);
    updateCalculations();
  });
  $('export-results').addEventListener('click',exportCSV);
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement)&&!(e.target instanceof HTMLButtonElement)){
      e.preventDefault();if(elapsed>=model.durationS)setElapsed(0);setPlay(!playing);
    }
  });
}
function exportCSV() {
  const row = (...cols)=>cols.map(c=>`"${String(c??'').replaceAll('"','""')}"`).join(',');
  const lines=[row('EEW Lab V0.1 - illustrative model results'),row('Source event ID',data.event.id),row('Station source',data.stationSource.url),row('P-wave km/s',model.vpKmS),row('S-wave km/s',model.vsKmS),row('Required stations',model.triggersRequired),row('Pick delay s',model.detectionDelayS),row('Network delay s',model.networkDelayS),row('Processing delay s',model.processingDelayS),row('Delivery delay s',model.deliveryDelayS),row('Simulated alert issue s',results.issue),row('Simulated user delivery s',results.delivered),'',row('Location','Latitude','Longitude','P time s','S time s','Alert delivery s','S-wave lead time s')];
  for(const city of results.cities) lines.push(row(city.name,city.latitude,city.longitude,city.p.toFixed(4),city.s.toFixed(4),results.delivered,city.lead?.toFixed(4)));
  lines.push('',row('Station','Latitude','Longitude','Enabled','P time s','S time s','Data availability s'));
  for(const s of results.stations) lines.push(row(s.id,s.latitude,s.longitude,s.enabled,s.p.toFixed(4),s.s.toFixed(4),s.available.toFixed(4)));
  const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='EEW-Lab-Ridgecrest-v0.1-results.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
init();
