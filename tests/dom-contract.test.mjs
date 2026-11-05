import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);

test('every static application control reference exists in HTML',()=>{
  const known=new Set(ids);
  const missing=[...new Set(refs.filter(id=>!known.has(id)))];
  assert.deepEqual(missing,[]);
});

test('HTML control identifiers are unique',()=>{
  assert.equal(new Set(ids).size,ids.length);
});

test('candidate metric and dynamic scale controls are present',()=>{
  for(const id of ['candidate-metric','candidate-scale-title','candidate-scale-min','candidate-scale-mid','candidate-scale-max','candidate-colorbar']){
    assert.ok(ids.includes(id),id);
  }
  assert.match(html,/<option value="margin" selected>/);
});
