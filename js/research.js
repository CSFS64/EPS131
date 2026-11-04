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
