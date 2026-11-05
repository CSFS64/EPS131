import {calculateNetwork, travelTimeS} from './physics.js';
import {evaluateArrivals} from './observations.js';

export function modelComparisons(data, params, disabled, observed, predictions) {
  return [['constant','Constant'],['1d','TauP iasp91'],['3d','Tomography 3D']].map(([key,label])=>{
    const arrivals=key==='constant'?null:predictions[key]?.events?.[data.event.id];
    if(key!=='constant'&&!arrivals)return {key,label,available:false,p:null,s:null};
    const network=calculateNetwork(data,params,disabled,arrivals);
    const stats=observed?evaluateArrivals(network.stations,observed):null;
    return {key,label,available:true,p:stats?.p.mae??null,s:stats?.s.mae??null,pN:stats?.p.n??0,sN:stats?.s.n??0};
  });
}

export function timingStages(result, params) {
  if(result.delivered===null || result.kthStation?.p===null || !Number.isFinite(result.kthStation?.p))return [];
  return [
    {key:'travel',label:'P travel',value:result.kthStation.p},
    {key:'detect',label:'Detection',value:params.detectionDelayS},
    {key:'network',label:'Telemetry',value:params.networkDelayS},
    {key:'process',label:'Processing',value:params.processingDelayS},
    {key:'delivery',label:'Delivery',value:params.deliveryDelayS}
  ];
}

export function alertStations(result, count) {
  const relevant=result.stations.filter(s=>s.enabled && s.p!==null && Number.isFinite(s.p));
  return new Set(relevant.slice(0,count).map(s=>s.id));
}

export function topResiduals(validation, count=10) {
  return validation?.comparisons?.filter(x=>Number.isFinite(x.residual)).slice().sort((a,b)=>Math.abs(b.residual)-Math.abs(a.residual)).slice(0,count)??[];
}

export function stationImportance(result, maxK=8) {
  const enabled=result.stations.filter(s=>s.enabled&&Number.isFinite(s.available)).sort((a,b)=>a.available-b.available);
  const thresholds=Array.from({length:Math.min(result.stations.length,Math.max(1,maxK))},(_,i)=>i+1);
  const processing=result.params.processingDelayS;
  const delivery=result.params.deliveryDelayS;
  const rows=result.stations.map(station=>{
    const other=enabled.filter(s=>s.id!==station.id);
    const cells=thresholds.map(k=>{
      const baseline=enabled[k-1];
      if(!station.enabled)return {k,status:'disabled',delta:null};
      if(!Number.isFinite(station.available))return {k,status:'missing',delta:null};
      if(!baseline)return {k,status:'unavailable',delta:null};
      const without=other[k-1];
      if(!without)return {k,status:'lost',delta:null,baseline:baseline.available+processing+delivery,without:null};
      const original=baseline.available+processing+delivery;
      const changed=without.available+processing+delivery;
      const delta=Math.max(0,without.available-baseline.available);
      return {k,status:delta>1e-9?'delay':'unchanged',delta,baseline:original,without:changed};
    });
    return {id:station.id,code:station.code,enabled:station.enabled,available:station.available,cells};
  });
  return {thresholds,rows,currentK:result.params.triggersRequired,activeCount:enabled.length};
}

export function importanceColor(cell) {
  if(!cell||cell.status==='unavailable'||cell.status==='missing')return '#edf0f1';
  if(cell.status==='disabled')return '#e4e6e7';
  if(cell.status==='lost')return '#9b4542';
  const value=cell.delta||0;
  if(value<1e-9)return '#ffffff';
  if(value<.5)return '#d8eaee';
  if(value<1.5)return '#a8d1d9';
  if(value<3)return '#62acbb';
  return '#006d82';
}

export function candidateBounds(data, source, paddingDeg=.45) {
  const lats=[source.latitude,...data.stations.map(s=>s.latitude),...data.cities.map(c=>c.latitude)];
  const lons=[source.longitude,...data.stations.map(s=>s.longitude),...data.cities.map(c=>c.longitude)];
  return {
    minLat:Math.max(-85,Math.min(...lats)-paddingDeg),
    maxLat:Math.min(85,Math.max(...lats)+paddingDeg),
    minLon:Math.max(-180,Math.min(...lons)-paddingDeg),
    maxLon:Math.min(180,Math.max(...lons)+paddingDeg)
  };
}

export function candidateCellColor(cell) {
  if(!cell)return '#ffffff';
  if(cell.status==='recover')return '#6a63a4';
  if(cell.status==='none')return '#efecea';
  const value=cell.gain||0;
  if(value<.02)return '#ffffff';
  if(value<.2)return '#e5f0f3';
  if(value<.8)return '#bedbe2';
  if(value<1.5)return '#7fb8c6';
  return '#1d7f96';
}

export function candidateStationMap(data, params, disabled, source, stepDeg=.1) {
  const sourceData={...data,event:{...source,id:source.id??'manual',magnitude:source.magnitude??data.event.magnitude,originUTC:source.originUTC??data.event.originUTC}};
  const baseline=calculateNetwork(sourceData,params,disabled);
  const active=baseline.stations.filter(s=>s.enabled&&Number.isFinite(s.available)).sort((a,b)=>a.available-b.available);
  const bounds=candidateBounds(data,sourceData.event);
  const cells=[];
  const detection=params.detectionDelayS+params.networkDelayS;
  const kth=params.triggersRequired;
  const cols=Math.max(1,Math.round((bounds.maxLon-bounds.minLon)/stepDeg)+1);
  const rows=Math.max(1,Math.round((bounds.maxLat-bounds.minLat)/stepDeg)+1);
  for(let r=0;r<rows;r++){
    const lat=Number((bounds.maxLat-r*stepDeg).toFixed(6));
    for(let c=0;c<cols;c++){
      const lon=Number((bounds.minLon+c*stepDeg).toFixed(6));
      const p=travelTimeS(sourceData.event,{latitude:lat,longitude:lon},params.vpKmS);
      const available=p+detection;
      const augmented=[...active,{id:'candidate',code:'NEW',latitude:lat,longitude:lon,p,available,enabled:true}].sort((a,b)=>a.available-b.available);
      const rank=augmented.findIndex(x=>x.id==='candidate')+1;
      const kthStation=augmented[kth-1]??null;
      const delivered=kthStation?kthStation.available+params.processingDelayS+params.deliveryDelayS:null;
      let status='nochange',gain=0;
      if(baseline.delivered===null && delivered!==null){status='recover';gain=null;}
      else if(delivered===null){status='none';gain=null;}
      else {
        gain=Math.max(0,(baseline.delivered??delivered)-delivered);
        status=gain>1e-9?'gain':'nochange';
      }
      cells.push({lat,lon,p,available,rank,delivered,gain,status,stepDeg});
    }
  }
  const top=cells.filter(cell=>cell.status==='gain').sort((a,b)=>b.gain-a.gain||a.rank-b.rank).slice(0,8);
  return {source:sourceData.event,baseline,bounds,stepDeg,rows,cols,cells,top,coverage:`${rows} × ${cols}`};
}
