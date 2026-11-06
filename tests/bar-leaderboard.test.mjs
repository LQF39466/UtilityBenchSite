import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {benchmarkRuns} from '../src/models.js';
import {barRuns,chartName} from '../src/bar-leaderboard.js';
const data=JSON.parse(readFileSync(new URL('../data/results.json',import.meta.url)));
test('reference chart shows each model once and marks only thinking-only models',()=>{
 const rows=barRuns(benchmarkRuns(data));assert.equal(rows.length,29);
 assert.equal(rows[0].name,'Gemini 4 Argon');
 assert.deepEqual(rows.filter(m=>m.mode==='T').map(m=>m.name).sort(),['Claude Opus 5.5','GLM-5.3 Flash','GPT-6 Astra','Gemini 4 Argon']);
 assert.equal(rows.find(m=>m.name==='GPT-5.6 Luna').auc,.6991);
 assert.deepEqual(chartName('DeepSeek V4 Flash (Preview)'),['DeepSeek','V4 Flash Prv.']);
 assert.deepEqual(chartName('DeepSeek V4.1 Flash (1017)'),['DeepSeek','V4.1 Flash']);
});
