import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modelComparisons,timingStages,alertStations,topResiduals} from '../js/research.js';
import {calculateNetwork} from '../js/physics.js';
import {normalizeObservations} from '../js/observations.js';
const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
const one=JSON.parse(readFileSync(new URL('../data/models-1d.json',import.meta.url)));
const three=JSON.parse(readFileSync(new URL('../data/models-3d.json',import.meta.url)));
const picks=JSON.parse(readFileSync(new URL('../data/observations/ci38457511.json',import.meta.url)));
const data={...events,event:events.events[0]};
const obs=normalizeObservations(picks,data.event.id,data.stations.map(s=>s.id));

test('comparison returns three measured-model entries',()=>{
 const list=modelComparisons(data,data.model,new Set(),obs,{"1d":one,"3d":three});
 assert.equal(list.length,3);
 assert.equal(list[0].available,true);
 assert.ok(Math.abs(list[0].p-.2437)<.002);
 assert.ok(Math.abs(list[1].s-1.03535)<.003);
 assert.ok(Math.abs(list[2].s-.7115)<.005);
});

test('absent model is marked unavailable rather than replaced',()=>{
 const list=modelComparisons(data,data.model,new Set(),obs,{});
 assert.equal(list[1].available,false);assert.equal(list[1].p,null);
 assert.equal(list[2].available,false);assert.equal(list[2].s,null);
});

test('timing segments exactly sum to delivered time',()=>{
 const result=calculateNetwork(data,data.model);
 const stages=timingStages(result,data.model);
 assert.equal(stages.length,5);
 assert.ok(Math.abs(stages.reduce((s,x)=>s+x.value,0)-result.delivered)<1e-8);
});

test('no alert produces an empty timing breakdown',()=>{
 const result=calculateNetwork(data,data.model,new Set(data.stations.map(s=>s.id)));
 assert.deepEqual(timingStages(result,data.model),[]);
});

test('contributing stations match the trigger threshold',()=>{
 const result=calculateNetwork(data,data.model);
 const active=alertStations(result,4);
 assert.equal(active.size,4);
 assert.ok(active.has(result.kthStation.id));
});

test('largest residuals are sorted by absolute magnitude',()=>{
 const list=topResiduals({comparisons:[{residual:1},{residual:-6},{residual:2}]},2);
 assert.deepEqual(list.map(x=>x.residual),[-6,2]);
});
