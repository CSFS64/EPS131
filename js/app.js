import {calculateNetwork} from './physics.js';
import {EEWMap} from './map.js';
import {parseSTP,normalizeObservations,evaluateArrivals} from './observations.js';
import {modelComparisons,timingStages,alertStations,topResiduals} from './research.js';

const $=id=>document.getElementById(id);
const settings={vp:['vpKmS',true],vs:['vsKmS',true],'trigger-count':['triggersRequired',false],'detect-delay':['detectionDelayS',false],'network-delay':['networkDelayS',false],'process-delay':['processingDelayS',false],'delivery-delay':['deliveryDelayS',false]};
const phases={p:'P',s:'S'};
const stageColors=['#376f86','#80a6b3','#a9c0c8','#c2a476','#b98067'];
const make=(tag,cls='',value='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined&&value!==null)e.textContent=String(value);return e;};
const f2=n=>n===null||n===undefined||!Number.isFinite(n)?'—':n.toFixed(2)+' s';
const signed=n=>n===null||n===undefined||!Number.isFinite(n)?'—':(n>0?'+':'')+n.toFixed(2)+' s';
const polarity=n=>n===null?'':n<0?'negative':'positive';
let data,defaults,params,results,map,observed=null,validation=null,modelType='constant',modelData={},cases=[],observationsCache={},selectionEpoch=0;
let elapsed=0,playing=false,speed=1,lastFrame=0,selected={kind:'city',id:'ridgecrest'},toastHandle;
const disabled=new Set();

function notify(text,error=false){
  const box=$('toast');box.textContent=text;box.classList.toggle('error',error);box.classList.add('show');
  clearTimeout(toastHandle);toastHandle=setTimeout(()=>box.classList.remove('show'),2800);
}

async function init(){
  try{
    const request=await fetch('./data/events.json',{cache:'no-store'});
    if(!request.ok)throw Error('Event catalog unavailable');
    const collection=await request.json();cases=collection.events;
    data={...collection,event:cases[0]};params={...collection.model};defaults={...params};
    map=new EEWMap($('map'),select);map.data=data;map.selection=selected;
    $('scrubber').max=params.durationS;$('duration-readout').textContent=params.durationS+' s';
    bind();refresh();setElapsed(0);
    $('load-state').textContent='';
    lastFrame=performance.now();requestAnimationFrame(frame);
    await Promise.all([loadPredictions('1d'),loadPredictions('3d')]);
    await loadObservations();
  }catch(error){$('load-state').textContent='Data error';notify(error.message,true);console.error(error);}
}

async function loadPredictions(key){
  try{
    const response=await fetch(`./data/models-${key}.json`,{cache:'no-store'});
    if(!response.ok)return;
    const record=await response.json();
    if(!cases.every(x=>record.events?.[x.id]))return;
    modelData[key]=record;
    const option=$('model-select').querySelector(`option[value="${key}"]`);
    option.disabled=false;option.textContent=key==='1d'?'iasp91 · 1D':'Tomography · 3D';
    if(results)updateComparison();
  }catch(error){console.error(error);}
}

async function loadObservations(){
  const epoch=++selectionEpoch;
  observed=null;validation=null;map.observed=new Map();refresh();
  $('validation-status').textContent='Loading SCEDC picks';
  const id=data.event.id;
  try{
    if(!observationsCache[id]){
      const request=await fetch(`./data/observations/${id}.json`,{cache:'no-store'});
      if(!request.ok)throw Error('Observed picks unavailable');
      observationsCache[id]=await request.json();
    }
    if(epoch!==selectionEpoch)return;
    useObservations(observationsCache[id],'SCEDC');
  }catch(error){
    if(epoch!==selectionEpoch)return;
    $('validation-status').textContent='No observed picks';$('validation-status').classList.add('empty');
    refresh();
  }
}

function useObservations(raw,source){
  observed=normalizeObservations(raw,data.event.id,data.stations.map(x=>x.id));
  map.observed=observed;
  $('validation-status').textContent=`${source} picks`;
  $('validation-status').classList.remove('empty');
  refresh();notify(`${observed.size} stations: observations loaded`);
}

function selectEvent(id){
  const event=cases.find(x=>x.id===id);
  if(!event||event.id===data.event.id)return;
  data={...data,event};map.data=data;selected={kind:'city',id:'ridgecrest'};map.selection=selected;
  $('event-select').value=event.id;map.focus(event.latitude,event.longitude,8);
  setPlay(false);setElapsed(0);loadObservations();
}

function activePredictions(){return modelType==='constant'?null:modelData[modelType]?.events?.[data.event.id]??null;}

function setModel(key){
  if(key!=='constant'&&!modelData[key]?.events?.[data.event.id]){
    $('model-select').value=modelType;notify('Model data unavailable',true);return;
  }
  modelType=key;$('model-select').value=key;
  map.showBaselineWavefront=key==='constant';
  $('velocity-fields').hidden=key!=='constant';
  $('toggle-p').disabled=key!=='constant';$('toggle-s').disabled=key!=='constant';
  refresh();
}

function refresh(){
  if(!data)return;
  results=calculateNetwork(data,params,disabled,activePredictions());
  map.results=results;
  validation=observed?evaluateArrivals(results.stations,observed):null;
  map.render();updateReadouts();updateComparison();updateTiming();updateStationList();updateCityList();updateInspector();updateValidation();
}

function updateReadouts(){
  for(const [id,[key,velocity]] of Object.entries(settings)){
    const v=params[key];$(''+id+'-out').textContent=id==='trigger-count'?String(v):velocity?v.toFixed(1)+' km/s':v.toFixed(1)+' s';
  }
  $('station-count').textContent=results.stations.filter(x=>x.enabled).length+' / '+results.stations.length;
}

function updateComparison(){
  if(!data)return;
  const comparison=modelComparisons(data,params,disabled,observed,modelData);
  const maxP=Math.max(.01,...comparison.map(x=>x.p??0));
  const maxS=Math.max(.01,...comparison.map(x=>x.s??0));
  const root=$('comparison-list');root.replaceChildren();
  for(const item of comparison){
    const btn=make('button','model-choice');btn.type='button';btn.dataset.model=item.key;btn.disabled=!item.available;
    btn.classList.toggle('selected',item.key===modelType);btn.setAttribute('aria-pressed',String(item.key===modelType));
    const name=make('span','model-label',item.label);
    btn.append(name);
    for(const [phase,max] of [['p',maxP],['s',maxS]]){
      const value=make('span','model-value');
      value.append(make('b','',item[phase]===null?'—':item[phase].toFixed(2)+' s'));
      const meter=make('span','model-meter '+(phase==='s'?'s':''));
      const fill=make('i');fill.style.width=item[phase]===null?'0%':Math.max(2,item[phase]/max*100)+'%';
      meter.append(fill);value.append(meter);btn.append(value);
    }
    btn.title=item.available?`${item.label}. P MAE ${f2(item.p)}, S MAE ${f2(item.s)}. Lower is better.`:'Model data unavailable';
    btn.addEventListener('click',()=>setModel(item.key));root.append(btn);
  }
  $('p-mae').textContent=f2(validation?.p.mae);
  $('s-mae').textContent=f2(validation?.s.mae);
}

function updateTiming(){
  $('issue-main').textContent=f2(results.issue);
  $('delivered-main').textContent=f2(results.delivered);
  const pieces=timingStages(results,params);
  const strip=$('timing-strip'),explain=$('timing-breakdown');strip.replaceChildren();explain.replaceChildren();
  if(!pieces.length){strip.append(make('div','', 'No alert'));return;}
  const total=pieces.reduce((n,item)=>n+item.value,0);
  for(const [i,part] of pieces.entries()){
    const segment=make('span','timing-segment');segment.style.width=(total>0?part.value/total*100:0)+'%';
    segment.title=`${part.label}: ${f2(part.value)}`;strip.append(segment);
    const item=make('div','stage-item');const color=make('i','stage-color');color.style.background=stageColors[i];
    item.append(color,make('span','',part.label),make('b','',f2(part.value)));explain.append(item);
  }
}

function updateStationList(){
  const root=$('station-list');root.replaceChildren();
  const active=alertStations(results,params.triggersRequired);
  const candidates=results.stations.filter(s=>s.enabled&&s.p!==null);
  const ranks=new Map(candidates.map((s,i)=>[s.id,i+1]));
  for(const station of [...results.stations].sort((a,b)=>Number(b.enabled)-Number(a.enabled)||(a.available??Infinity)-(b.available??Infinity))){
    const row=make('div','station-row');row.classList.toggle('trigger-key',active.has(station.id));
    row.classList.toggle('selected',selected.kind==='station'&&selected.id===station.id);
    const toggle=make('input');toggle.type='checkbox';toggle.checked=station.enabled;
    toggle.setAttribute('aria-label','Enable '+station.id);
    toggle.addEventListener('change',()=>{
      if(toggle.checked)disabled.delete(station.id);else disabled.add(station.id);
      refresh();notify(`${station.id}: ${toggle.checked?'enabled':'disabled'}`);
    });
    const btn=make('button','station-pick');btn.type='button';btn.setAttribute('aria-label',`Focus station ${station.id}`);
    const left=make('span','station-main');
    left.append(make('span','rank',ranks.get(station.id)||'–'),make('b','',station.code));
    btn.append(left,make('small','',`${station.p===null?'—':station.p.toFixed(2)+' s'} · ${station.distanceKm.toFixed(1)} km`));
    btn.addEventListener('click',()=>{select('station',station.id);map.focus(station.latitude,station.longitude,9.5);});
    row.append(toggle,btn);root.append(row);
  }
}

function updateCityList(){
  const root=$('city-list');root.replaceChildren();
  for(const city of results.cities){
    const btn=make('button','city-button');btn.type='button';
    btn.classList.toggle('selected',selected.kind==='city'&&selected.id===city.id);
    btn.setAttribute('aria-pressed',String(selected.kind==='city'&&selected.id===city.id));
    const name=make('span','',city.name);
    const lead=make('strong',polarity(city.lead),f2(city.lead));
    btn.append(name,lead);btn.addEventListener('click',()=>select('city',city.id));root.append(btn);
  }
}

function updateInspector(){
  const station=results.stations.find(s=>s.id===selected.id);
  const city=results.cities.find(s=>s.id===selected.id);
  const display=$('lead-value');display.classList.remove('negative');
  if(selected.kind==='station'&&station){
    $('selected-name').textContent=station.id;
    $('selected-distance').textContent=station.distanceKm.toFixed(1)+' km';
    $('lead-label').textContent='P arrival';display.textContent=f2(station.p);

  }else if(selected.kind==='event'){
    $('selected-name').textContent='Ridgecrest';
    $('selected-distance').textContent=data.event.id;
    $('lead-label').textContent='Alert issue';display.textContent=f2(results.issue);

  }else if(city){
    $('selected-name').textContent=city.name;
    $('selected-distance').textContent=city.distanceKm.toFixed(1)+' km';
    $('lead-label').textContent='S-wave lead';display.textContent=f2(city.lead);
    display.classList.toggle('negative',city.lead!==null&&city.lead<0);

  }
}

function updateValidation(){
  $('p-bias').textContent=f2(validation?.p.bias);
  $('s-bias').textContent=f2(validation?.s.bias);
  $('pick-count').textContent=(validation?.comparisons.length??0)+' picks';
  if(!validation){$('residual-chart').replaceChildren();$('residual-summary').textContent='No observed arrivals';$('pick-rows').replaceChildren();return;}
  const sorted=validation.comparisons.slice().sort((a,b)=>a.id.localeCompare(b.id)||a.phase.localeCompare(b.phase));
  const body=$('pick-rows');body.replaceChildren();
  for(const value of sorted){
    const row=make('tr');const cell=make('td');const btn=make('button','pick-link',value.id.replace('CI.',''));
    btn.type='button';btn.addEventListener('click',()=>{
      select('station',value.id);
      const station=results.stations.find(s=>s.id===value.id);if(station)map.focus(station.latitude,station.longitude,9.5);
    });
    cell.append(btn);row.append(cell,make('td','',phases[value.phase]),make('td',polarity(value.residual),signed(value.residual)));body.append(row);
  }
  renderResidual();
}

function renderResidual(){
  const root=$('residual-chart');root.replaceChildren();
  const rows=topResiduals(validation,10);
  if(!rows.length){root.append(make('div','field-hint','No comparable picks'));return;}
  const max=Math.max(1,...rows.map(x=>Math.abs(x.residual)));
  for(const row of rows){
    const line=make('div','residual-row');
    line.append(make('span','',row.id.replace('CI.','')),make('i','phase-symbol '+(row.phase==='s'?'s':'p'),row.phase.toUpperCase()));
    const track=make('div','residual-track');const bar=make('i','residual-bar '+(row.phase==='s'?'s':''));
    const width=Math.abs(row.residual)/max*47;
    bar.style.left=(row.residual<0?50-width:50)+'%';bar.style.width=width+'%';track.append(bar);
    line.append(track,make('span','residual-num '+polarity(row.residual),signed(row.residual).replace(' s','')));root.append(line);
  }
  $('residual-summary').textContent=`P ${validation.p.n} · S ${validation.s.n}`;
}

function select(kind,id){
  selected={kind,id};map.selection=selected;
  updateStationList();updateCityList();updateInspector();map.render();
}

function setElapsed(t){
  elapsed=Math.max(0,Math.min(params.durationS,t));$('scrubber').value=elapsed;
  const mins=Math.floor(elapsed/60).toString().padStart(2,'0');const secs=(elapsed%60).toFixed(1).padStart(4,'0');
  $('time-readout').textContent=`${mins}:${secs}`;map.elapsed=elapsed;map.render();
}

function setPlay(value){
  playing=value;$('play').setAttribute('aria-pressed',String(value));$('play').setAttribute('aria-label',value?'Pause':'Play');$('play').title=value?'Pause':'Play';
  $('play').textContent=value?'Ⅱ':'▶';
}

function frame(now){
  const delta=Math.min(.18,(now-lastFrame)/1000);lastFrame=now;
  if(playing){const next=Math.min(params.durationS,elapsed+delta*speed);setElapsed(next);if(next>=params.durationS)setPlay(false);}
  requestAnimationFrame(frame);
}

function setBasemap(style){
  map.baseStyle=style;map.render();$('base-select').value=style;
  $('map-attribution').textContent=style==='satellite'?'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community':style==='street'?'© OpenStreetMap contributors':'WGS84 coordinate grid';
}

function restoreSettings(){
  params={...defaults};disabled.clear();
  for(const [id,[key]] of Object.entries(settings))$(id).value=params[key];
  setPlay(false);setElapsed(0);map.focus(data.event.latitude,data.event.longitude,8);
  refresh();notify('Experiment settings reset');
}

function bind(){
  $('event-select').addEventListener('change',e=>selectEvent(e.target.value));
  $('model-select').addEventListener('change',e=>setModel(e.target.value));
  $('base-select').addEventListener('change',e=>setBasemap(e.target.value));
  $('export-results').addEventListener('click',exportCSV);
  $('reset-all').addEventListener('click',restoreSettings);
  $('toggle-p').addEventListener('change',e=>{map.showP=e.target.checked;map.render();});
  $('toggle-s').addEventListener('change',e=>{map.showS=e.target.checked;map.render();});
  $('toggle-stations').addEventListener('change',e=>{map.showStations=e.target.checked;map.showLabels=e.target.checked;map.render();});
  $('zoom-in').addEventListener('click',()=>map.changeZoom(.7));
  $('zoom-out').addEventListener('click',()=>map.changeZoom(-.7));
  $('recenter').addEventListener('click',()=>map.focus(data.event.latitude,data.event.longitude,8));
  for(const [id,[key]]of Object.entries(settings))$(id).addEventListener('input',e=>{params[key]=Number(e.target.value);refresh();});
  $('reset-velocities').addEventListener('click',()=>{
    params.vpKmS=defaults.vpKmS;params.vsKmS=defaults.vsKmS;
    $('vp').value=params.vpKmS;$('vs').value=params.vsKmS;refresh();notify('Velocity values reset');
  });
  $('reset-latency').addEventListener('click',()=>{
    for(const [id,[key]]of Object.entries(settings))if(id!=='vp'&&id!=='vs'){params[key]=defaults[key];$(id).value=params[key];}
    refresh();notify('Trigger and latency values reset');
  });
  $('enable-all').addEventListener('click',()=>{disabled.clear();refresh();notify('All stations enabled');});
  $('disable-all').addEventListener('click',()=>{data.stations.forEach(s=>disabled.add(s.id));refresh();notify('All stations disabled');});
  $('play').addEventListener('click',()=>{if(elapsed>=params.durationS)setElapsed(0);setPlay(!playing);});
  $('restart').addEventListener('click',()=>{setPlay(false);setElapsed(0);});
  $('scrubber').addEventListener('input',e=>setElapsed(Number(e.target.value)));
  $('speed').addEventListener('change',e=>{speed=Number(e.target.value);});
  $('phase-file-trigger').addEventListener('click',()=>$('phase-file').click());
  $('phase-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      const text=await file.text();const parsed=file.name.toLowerCase().endsWith('.json')?JSON.parse(text):parseSTP(text,data.event.id,data.stations.map(s=>s.id),data.event.originUTC);
      useObservations(parsed,file.name);$('import-state').textContent=file.name;$('section-observed').open=true;
    }catch(error){notify(error.message,true);$('import-state').textContent='Import failed';}
    e.target.value='';
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY','A'].includes(document.activeElement?.tagName)){
      e.preventDefault();if(elapsed>=params.durationS)setElapsed(0);setPlay(!playing);
    }
  });
}

function exportCSV(){
  const rows=[['EEW Lab V0.4'],['Event',data.event.id],['Model',modelType],['P velocity',params.vpKmS],['S velocity',params.vsKmS],['Trigger stations',params.triggersRequired],['Detection',params.detectionDelayS],['Telemetry',params.networkDelayS],['Processing',params.processingDelayS],['Delivery latency',params.deliveryDelayS],['Alert issue',results.issue??''],['Message delivery',results.delivered??''],[],['City','P predicted','S predicted','Delivery','S-wave lead']];
  for(const city of results.cities)rows.push([city.name,city.p??'',city.s??'',results.delivered??'',city.lead??'']);
  rows.push([],['Station','Phase','Predicted','Observed','Residual']);
  for(const r of validation?.comparisons||[])rows.push([r.id,r.phase,r.predicted,r.observed,r.residual]);
  rows.push([],['Model','P MAE','P N','S MAE','S N']);
  for(const m of modelComparisons(data,params,disabled,observed,modelData))rows.push([m.label,m.p??'',m.pN??'',m.s??'',m.sN??'']);
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`eew-lab-${data.event.id}-${modelType}-v0.4.csv`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);notify('CSV exported');
}

init();
