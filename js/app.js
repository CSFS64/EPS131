import {calculateNetwork,fmtSeconds,fmtSignedSeconds} from './physics.js';
import {EEWMap} from './map.js';
import {parseSTP,normalizeObservations,evaluateArrivals} from './observations.js';

const $=id=>document.getElementById(id);
const settings={vp:['vpKmS',true],vs:['vsKmS',true],'trigger-count':['triggersRequired',false],'detect-delay':['detectionDelayS',false],'network-delay':['networkDelayS',false],'process-delay':['processingDelayS',false],'delivery-delay':['deliveryDelayS',false]};
let data,model,defaults,results,map,observed=null,validation=null,modelType='constant',modelData={},cases=[],observationsCache={},selectionEpoch=0;
let elapsed=0,playing=false,speed=1,lastFrame=0,selected={kind:'city',id:'ridgecrest'},activeTab='simulation',toastHandle;
const disabled=new Set();
const format=n=>n==null||!Number.isFinite(n)?'—':n.toFixed(2)+' s';
const simple=n=>n==null||!Number.isFinite(n)?'—':n.toFixed(1);
const signed=n=>n==null||!Number.isFinite(n)?'—':(n>0?'+':'')+n.toFixed(1)+' s';
const numberColor=n=>n==null?'':n<0?'negative':'positive';
function notify(message,error=false){
  const t=$('toast');t.textContent=message;t.classList.toggle('error',error);t.classList.add('show');clearTimeout(toastHandle);toastHandle=setTimeout(()=>t.classList.remove('show'),3400);
}
async function init(){
  try{
    const response=await fetch('./data/events.json',{cache:'no-store'});
    if(!response.ok)throw Error('Event dataset unavailable');
    const collection=await response.json();
    cases=collection.events;
    data={...collection,event:cases[0]};model={...data.model};defaults={...model};
    map=new EEWMap($('map'),select);map.data=data;map.selection=selected;
    $('duration-readout').textContent=model.durationS+' s';$('scrubber').max=model.durationS;
    bind();refresh();setElapsed(0);
    $('load-state').textContent=`${data.stations.length} stations`;
    lastFrame=performance.now();requestAnimationFrame(frame);
    await Promise.all([loadPredictions('1d'),loadPredictions('3d')]);
    await loadObservations();
  }catch(e){$('load-state').textContent='Data error';notify(e.message,true);console.error(e);}
}
async function loadPredictions(key){
  try{
    const response=await fetch(`./data/models-${key}.json`,{cache:'no-store'});
    if(!response.ok)return;
    const record=await response.json();
    if(!record.events || !record.events[cases[0].id])return;
    modelData[key]=record;
    const option=$('model-select').querySelector(`[value="${key}"]`);
    option.disabled=false;option.textContent=key==='1d'?'iasp91 · TauP 1D':'Ridgecrest 3D tomography';
  }catch(e){console.error(e);}
}
async function loadObservations(){
  const epoch=++selectionEpoch;
  observed=null;validation=null;setValidationEmpty();refresh();
  const id=data.event.id;
  try{
    if(!observationsCache[id]){
      const response=await fetch(`./data/observations/${id}.json`,{cache:'no-store'});
      if(!response.ok)throw Error('Observed phases unavailable');
      observationsCache[id]=await response.json();
    }
    if(epoch!==selectionEpoch)return;
    useObservations(observationsCache[id],'SCEDC');
  }catch(e){
    if(epoch!==selectionEpoch)return;
    setValidationEmpty();updateComparison();
  }
}
function selectEvent(id){
  const next=cases.find(x=>x.id===id);
  if(!next || next.id===data.event.id)return;
  data={...data,event:next};map.data=data;selected={kind:'city',id:'ridgecrest'};map.selection=selected;
  $('event-tag').textContent='Mw '+next.magnitude.toFixed(1);
  $('origin-readout').textContent=next.originUTC.replace('T',' ').replace('Z','');
  $('depth-readout').textContent=next.depthKm.toFixed(1)+' km';
  map.focus(next.latitude,next.longitude,8);setPlay(false);setElapsed(0);
  loadObservations();
}
function activePredictions(){
  if(modelType==='constant')return null;
  return modelData[modelType]?.events?.[data.event.id]??null;
}
function setModel(key){
  if(key!=='constant' && !modelData[key]?.events?.[data.event.id]){
    $('model-select').value=modelType;notify('Travel times unavailable for this event',true);return;
  }
  modelType=key;
  $('vp').disabled=key!=='constant';$('vs').disabled=key!=='constant';
  const messages={constant:'Fixed-velocity straight rays', '1d':'iasp91 · spherical 1D TauP first arrivals', '3d':'Ridgecrest tomography · straight-path 3D slowness integral'};
  $('model-status').textContent=messages[key];
  map.showBaselineWavefront=key==='constant';
  refresh();
}
function setValidationEmpty(){
  $('validation-status').textContent='No observations loaded';$('validation-status').classList.add('empty');$('pick-count').textContent='0 picks';
  for(const id of ['p-mae','s-mae','p-bias','s-bias'])$(id).textContent='—';
  $('pick-rows').replaceChildren();const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=3;td.textContent='No phase picks';tr.append(td);$('pick-rows').append(tr);
  $('residual-summary').textContent='No observed arrivals';
  $('comparison-rows').replaceChildren();
}

function useObservations(raw,source){
  observed=normalizeObservations(raw,data.event.id,data.stations.map(x=>x.id));
  map.observed=observed;validation=evaluateArrivals(results.stations,observed);
  const count=validation.comparisons.length;
  $('pick-count').textContent=count+' picks';$('validation-status').classList.remove('empty');$('validation-status').textContent=`${observed.size} stations · ${source}`;
  for(const [id,stat] of [['p-mae',validation.p.mae],['s-mae',validation.s.mae],['p-bias',validation.p.bias],['s-bias',validation.s.bias]])$(id).textContent=format(stat);
  updatePickRows();renderResidual();updateInspector();map.render();
  updateComparison();updateStationList();notify(`${count} observed picks loaded`);
}
function refresh(){
  results=calculateNetwork(data,model,disabled,activePredictions());
  map.results=results;
  validation=observed?evaluateArrivals(results.stations,observed):null;
  if(validation){
    for(const [id,stat] of [['p-mae',validation.p.mae],['s-mae',validation.s.mae],['p-bias',validation.p.bias],['s-bias',validation.s.bias]])$(id).textContent=format(stat);
    updatePickRows();renderResidual();
  }
  map.render();updateReadouts();updateStationList();updateCityList();updateInspector();updateComparison();
}
function updateReadouts(){
  for(const [id,[key,velocity]] of Object.entries(settings)){
    const n=model[key];$(id+'-out').textContent=id==='trigger-count'?String(n):velocity?n.toFixed(1)+' km/s':n.toFixed(1)+' s';
  }
  $('station-count').textContent=results.triggered+' / '+results.stations.length;
}
function changeTab(key){
  activeTab=key;
  for(const b of document.querySelectorAll('.tab')){const yes=b.dataset.panel===key;b.classList.toggle('selected',yes);b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;}
  for(const p of document.querySelectorAll('.side-panel')){const yes=p.id==='panel-'+key;p.classList.toggle('active',yes);p.hidden=!yes;}
  $('validation-drawer').hidden=key!=='validation';
  if(key==='validation')renderResidual();
}
function updateStationList(){
  const list=$('station-list');list.replaceChildren();
  for(const station of results.stations){
    const row=document.createElement('div');row.className='station-row'+(selected.kind==='station'&&selected.id===station.id?' selected':'');
    const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=station.enabled;toggle.setAttribute('aria-label','Enable '+station.id);
    toggle.addEventListener('change',()=>{if(toggle.checked)disabled.delete(station.id);else disabled.add(station.id);refresh();notify(station.code+' '+(toggle.checked?'enabled':'disabled'));});
    const label=document.createElement('div');label.className='station-text';
    const name=document.createElement('b');name.textContent=station.id;const subtitle=document.createElement('small');subtitle.textContent=`P ${station.p===null?'—':simple(station.p)+'s'} · ${simple(station.distanceKm)}km${observed?.has(station.id)?' · observed':''}`;
    label.append(name,subtitle);
    const focus=document.createElement('button');focus.className='station-focus';focus.textContent='⌖';focus.title='Locate '+station.id;focus.setAttribute('aria-label','Select '+station.id);
    focus.addEventListener('click',()=>{select('station',station.id);map.focus(station.latitude,station.longitude,9.5);});
    row.append(toggle,label,focus);list.append(row);
  }
}
function updateCityList(){
  const list=$('city-list');list.replaceChildren();
  for(const city of results.cities){
    const b=document.createElement('button');b.className='city-button'+(selected.kind==='city'&&selected.id===city.id?' selected':'');
    const title=document.createElement('span');title.textContent=city.name;const time=document.createElement('strong');time.textContent=signed(city.lead);time.className=numberColor(city.lead);
    b.append(title,time);b.addEventListener('click',()=>select('city',city.id));list.append(b);
  }
}
function addRow(label,value){const div=document.createElement('div');div.className='metric-row';const span=document.createElement('span');span.textContent=label;const b=document.createElement('b');b.textContent=value;div.append(span,b);$('system-times').append(div);}
function updateInspector(){
  const station=results.stations.find(s=>s.id===selected.id);
  const city=results.cities.find(s=>s.id===selected.id);
  const val=$('lead-value');val.classList.remove('negative');
  if(selected.kind==='station'&&station){
    $('selected-kind').textContent='STATION';$('selected-name').textContent=station.id;$('selected-distance').textContent=`${simple(station.distanceKm)} km from epicenter`;
    $('lead-label').textContent='P arrival';val.innerHTML=`${simple(station.p)} <small>s</small>`;
    $('lead-state').textContent=station.enabled?'Enabled':'Disabled';
  }else if(selected.kind==='event'){
    $('selected-kind').textContent='EVENT';$('selected-name').textContent='Ridgecrest';$('selected-distance').textContent='USGS '+data.event.id;
    $('lead-label').textContent='Alert issue';val.innerHTML=`${simple(results.issue)} <small>s</small>`;$('lead-state').textContent='Modeled';
  }else if(city){
    $('selected-kind').textContent='CITY';$('selected-name').textContent=city.name;$('selected-distance').textContent=`${simple(city.distanceKm)} km from epicenter`;
    $('lead-label').textContent='S-wave lead';val.innerHTML=`${simple(city.lead)} <small>s</small>`;val.classList.toggle('negative',city.lead!==null&&city.lead<0);
    $('lead-state').textContent='Modeled';
  }
  $('system-times').replaceChildren();
  addRow('First P at station',format(results.firstStation?.p));
  addRow(`Station ${model.triggersRequired} available`,format(results.kthStation?.available));
  addRow('Alert issued',format(results.issue));
  addRow('User delivery',format(results.delivered));
  if(station){
    addRow('Predicted S',format(station.s));
    const o=observed?.get(station.id);
    if(o){
      addRow('Observed P',format(o.p));addRow('P residual',format(o.p===undefined?null:station.p-o.p));
      addRow('Observed S',format(o.s));addRow('S residual',format(o.s===undefined?null:station.s-o.s));
    }
  }else if(city){addRow('City P arrival',format(city.p));addRow('City S arrival',format(city.s));}
  $('result-basis').textContent=`Model: ${modelType} · ${observed?'SCEDC picks':'No measured picks'} · hypothetical alert delays`;
}
function updatePickRows(){
  const tbody=$('pick-rows');tbody.replaceChildren();
  if(!validation)return;
  const rows=[...validation.comparisons].sort((a,b)=>a.id.localeCompare(b.id)||a.phase.localeCompare(b.phase));
  for(const p of rows){
    const row=document.createElement('tr');row.dataset.station=p.id;row.tabIndex=0;
    for(const value of [p.id.replace('CI.',''),p.phase.toUpperCase(),signed(p.residual)]){
      const td=document.createElement('td');td.textContent=value;row.append(td);
    }
    row.addEventListener('click',()=>select('station',p.id));row.addEventListener('keydown',e=>{if(e.key==='Enter')select('station',p.id);});tbody.append(row);
  }
}
function renderResidual(){
  if(!validation)return;
  const canvas=$('residual-chart');const box=canvas.getBoundingClientRect();const width=Math.max(250,box.width||260);const height=160;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
  const rows=validation.comparisons;
  if(!rows.length)return;
  const pad={left:38,right:13,top:14,bottom:26};
  const limit=Math.max(1,Math.ceil(Math.max(...rows.map(x=>Math.abs(x.residual)))/2)*2);
  const chartH=height-pad.top-pad.bottom;const mid=pad.top+chartH/2;
  c.strokeStyle='#bbcbd0';c.lineWidth=1;c.font='10px Arial';c.fillStyle='#556e77';
  for(const factor of [-1,0,1]){const y=mid-factor*(chartH/2);c.beginPath();c.moveTo(pad.left,y);c.lineTo(width-pad.right,y);c.stroke();c.fillText(factor===0?'0':(factor*limit).toFixed(0),5,y+3);}
  const stationIds=[...new Set(rows.map(x=>x.id))];const xRange=width-pad.left-pad.right;
  for(const row of rows){const i=stationIds.indexOf(row.id);const x=pad.left+(i+.5)*xRange/stationIds.length+(row.phase==='p'?-3:3);const y=mid-row.residual/limit*(chartH/2);c.beginPath();c.arc(x,y,3.2,0,Math.PI*2);c.fillStyle=row.phase==='p'?'#0081ac':'#d88c16';c.fill();}
  c.textAlign='center';c.fillStyle='#56747b';c.fillText('Station index (P blue, S amber)',pad.left+xRange/2,height-5);
  c.textAlign='start';
  $('residual-summary').textContent=`P n=${validation.p.n} · S n=${validation.s.n} · predicted − observed (s)`;
}
function updateComparison(){
  const root=$('comparison-rows');root.replaceChildren();
  if(!observed){const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=3;cell.textContent='No observed phase picks';row.append(cell);root.append(row);return;}
  for(const [key,label] of [['constant','Constant'],['1d','TauP iasp91'],['3d','3D tomography']]){
    const predictions=key==='constant'?null:modelData[key]?.events?.[data.event.id];
    const row=document.createElement('tr');if(key===modelType)row.classList.add('comparison-selected');
    let values=[label,'—','—'];
    if(key==='constant'||predictions){
      const calculated=calculateNetwork(data,model,disabled,predictions);
      const summary=evaluateArrivals(calculated.stations,observed);
      values=[label,format(summary.p.mae),format(summary.s.mae)];
    }
    for(const value of values){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    root.append(row);
  }
}
function select(kind,id){selected={kind,id};map.selection=selected;updateStationList();updateCityList();updateInspector();map.render();}
function setElapsed(t){
  elapsed=Math.max(0,Math.min(model.durationS,t));$('scrubber').value=elapsed;
  const minutes=Math.floor(elapsed/60).toString().padStart(2,'0');const seconds=(elapsed%60).toFixed(1).padStart(4,'0');$('time-readout').textContent=`${minutes}:${seconds}`;
  map.elapsed=elapsed;map.render();
}
function setPlay(value){playing=value;$('play').textContent=value?'Ⅱ':'▶';$('play').setAttribute('aria-label',value?'Pause':'Play');}
function frame(t){const delta=Math.min(.18,(t-lastFrame)/1000);lastFrame=t;if(playing){const target=Math.min(model.durationS,elapsed+delta*speed);setElapsed(target);if(target>=model.durationS)setPlay(false);}requestAnimationFrame(frame);}
function bind(){
  $('event-select').addEventListener('change',e=>selectEvent(e.target.value));
  $('model-select').addEventListener('change',e=>setModel(e.target.value));
  for(const b of document.querySelectorAll('.tab')){b.addEventListener('click',()=>changeTab(b.dataset.panel));b.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const buttons=[...document.querySelectorAll('.tab')];const index=buttons.indexOf(b);const next=buttons[(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];changeTab(next.dataset.panel);next.focus();e.preventDefault();});}
  for(const b of document.querySelectorAll('.map-mode'))b.addEventListener('click',()=>{
    const base=b.dataset.base;map.baseStyle=base;map.render();
    for(const button of document.querySelectorAll('.map-mode')){const active=button.dataset.base===base;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
    $('map-attribution').textContent=base==='satellite'?'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community':base==='street'?'© OpenStreetMap contributors':'Coordinate grid · WGS84';
  });
  $('toggle-p').addEventListener('change',e=>{map.showP=e.target.checked;map.render();});$('toggle-s').addEventListener('change',e=>{map.showS=e.target.checked;map.render();});
  $('toggle-stations').addEventListener('change',e=>{map.showStations=e.target.checked;map.showLabels=e.target.checked;map.render();});
  $('zoom-in').addEventListener('click',()=>map.changeZoom(.7));$('zoom-out').addEventListener('click',()=>map.changeZoom(-.7));$('recenter').addEventListener('click',()=>map.focus(35.43,-117.77,8));
  for(const [id,[key]] of Object.entries(settings))$(id).addEventListener('input',e=>{model[key]=Number(e.target.value);refresh();});
  $('reset-velocities').addEventListener('click',()=>{model.vpKmS=defaults.vpKmS;model.vsKmS=defaults.vsKmS;$('vp').value=model.vpKmS;$('vs').value=model.vsKmS;refresh();notify('Velocity model reset');});
  $('reset-latency').addEventListener('click',()=>{for(const [id,[key]]of Object.entries(settings))if(id!=='vp'&&id!=='vs'){model[key]=defaults[key];$(id).value=model[key];}refresh();notify('Latencies reset');});
  $('enable-all').addEventListener('click',()=>{disabled.clear();refresh();notify('All stations enabled');});
  $('disable-all').addEventListener('click',()=>{data.stations.forEach(s=>disabled.add(s.id));refresh();notify('All stations disabled');});
  $('export-results').addEventListener('click',exportCSV);
  $('play').addEventListener('click',()=>{if(elapsed>=model.durationS)setElapsed(0);setPlay(!playing);});
  $('restart').addEventListener('click',()=>{setPlay(false);setElapsed(0);});
  $('scrubber').addEventListener('input',e=>setElapsed(Number(e.target.value)));
  $('speed').addEventListener('change',e=>{speed=Number(e.target.value);});
  $('phase-file-trigger').addEventListener('click',()=>$('phase-file').click());
  $('phase-file').addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{const text=await f.text();const raw=f.name.toLowerCase().endsWith('.json')?JSON.parse(text):parseSTP(text,data.event.id,data.stations.map(s=>s.id),data.event.originUTC);
      useObservations(raw,f.name);$('import-state').textContent=f.name;changeTab('validation');
    }catch(err){notify(err.message,true);$('import-state').textContent='Import failed';}
    e.target.value='';
  });
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){e.preventDefault();if(elapsed>=model.durationS)setElapsed(0);setPlay(!playing);}});
}
function exportCSV(){
  const rows=[['EEW Lab V0.3'],['Event',data.event.id],['Model',modelType],['Velocity P',model.vpKmS],['Velocity S',model.vsKmS],['Stations required',model.triggersRequired],['Issue',results.issue??''],['Delivery',results.delivered??''],['City','P predicted','S predicted','Delivery','Lead']];
  for(const city of results.cities)rows.push([city.name,city.p,city.s,results.delivered??'',city.lead??'']);
  rows.push([],['Station','Phase','Predicted','Observed','Residual']);
  for(const r of validation?.comparisons||[])rows.push([r.id,r.phase,r.predicted,r.observed,r.residual]);
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`eew-lab-${data.event.id}-${modelType}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);notify('CSV exported');
}
init();
