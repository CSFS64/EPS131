import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {modelComparisons,timingStages,alertStations,topResiduals,stationImportance,importanceColor} from '../js/research.js';
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

test('station importance reports observed fourth-station delivery shift',()=>{
 const result=calculateNetwork(data,data.model);
 const matrix=stationImportance(result,8);
 assert.equal(matrix.thresholds.length,8);
 const row=matrix.rows.find(r=>r.id==='CI.CLC');
 const fourth=row.cells.find(c=>c.k===4);
 assert.equal(fourth.status,'delay');
 const expected=calculateNetwork(data,data.model,new Set(['CI.CLC'])).delivered-result.delivered;
 assert.ok(Math.abs(fourth.delta-expected)<1e-9);
 assert.ok(Math.abs(fourth.delta-1.578)<.005);
 assert.equal(matrix.rows.length,15);
});

test('station importance marks loss of alert if fewer than k remain',()=>{
 const matrix=stationImportance(calculateNetwork(data,{...data.model,triggersRequired:15}),15);
 assert.ok(matrix.rows.every(row=>row.cells[14].status==='lost'));
 const inactive=stationImportance(calculateNetwork(data,{...data.model,triggersRequired:4},new Set(['CI.CLC'])),8);
 assert.equal(inactive.rows.find(r=>r.id==='CI.CLC').cells[3].status,'disabled');
});

test('station importance does not invent times when no baseline alert',()=>{
 const matrix=stationImportance(calculateNetwork(data,data.model,new Set(data.stations.map(s=>s.id))),8);
 assert.ok(matrix.rows.every(row=>row.cells.every(cell=>cell.delta===null)));
});

test('station impact shift is independent of common delivery latency',()=>{
 const a=stationImportance(calculateNetwork(data,data.model),8);
 const b=stationImportance(calculateNetwork(data,{...data.model,deliveryDelayS:15}),8);
 for(let i=0;i<a.rows.length;i++)for(let k=0;k<8;k++){
   assert.equal(a.rows[i].cells[k].status,b.rows[i].cells[k].status);
   assert.equal(a.rows[i].cells[k].delta,b.rows[i].cells[k].delta);
 }
});

test('3D station impact responds to event and threshold changes',()=>{
 const events=JSON.parse(readFileSync(new URL('../data/events.json',import.meta.url)));
 const second={...events,event:events.events[1]};
 const model=JSON.parse(readFileSync(new URL('../data/models-3d.json',import.meta.url)));
 const a=stationImportance(calculateNetwork(data,data.model,new Set(),model.events[data.event.id]),8);
 const b=stationImportance(calculateNetwork(second,second.model,new Set(),model.events[second.event.id]),8);
 assert.ok(a.rows.some((row,i)=>row.cells[3].delta!==b.rows[i].cells[3].delta));
 assert.ok(a.rows.some(row=>row.cells[3].status==='delay'));
});
