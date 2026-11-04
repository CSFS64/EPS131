import {calculateNetwork} from './physics.js';
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
