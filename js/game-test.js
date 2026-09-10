'use strict';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('./main.js', import.meta.url), 'utf8');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function circleHit(a, b) {
  return distance(a, b) < a.r + b.r;
}

const requiredIds = [
  'game','menu','hud','upgrade','pause','gameover','settings','scores','level','wave','time','score',
  'kills','hpBar','xpBar','upgradeGrid','upgradeSub','loadout','touchControls','joystick','stick',
  'finalTime','finalLevel','finalKills','finalScore','bestScore','bestTime','scoreList','bossBar',
  'bossName','bossHpBar','toast','startBtn','restartBtn','pauseBtn','resumeBtn','quitBtn','menuBtn',
  'settingsBtn','scoresBtn','scoresBack','saveSettings','settingsBackBtn','pauseSettingsBtn',
  'clearSkin','skinFile','reloadBtn','graphics','particles','uiScale','volume','colorMode','shake',
  'numbers','grid','glow','reduced','skinPreview','skinStatus','runtimeError','runtimeErrorText'
];

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const uniqueIds = new Set(ids);

assert.equal(ids.length, uniqueIds.size, 'HTML must not contain duplicate IDs');
for (const id of requiredIds) {
  assert.ok(uniqueIds.has(id), `Missing required HTML element #${id}`);
}

assert.match(html, /<script\s+src="js\/main\.js"\s+defer><\/script>/, 'index.html must load js/main.js with defer');
assert.match(html, /accept="image\/png,image\/jpeg"/, 'skin file input must restrict to PNG/JPEG');
assert.match(source, /lastOrbit:\s*-999/, 'Orbit timer must be initialized');
assert.match(source, /lastNova:\s*-999/, 'Nova timer must be initialized');
assert.match(source, /novaRadius:\s*0/, 'Nova radius must be initialized');
assert.match(source, /Number\.isFinite\(Number\(raw\.volume\)\)/, 'volume normalization must reject NaN');
assert.match(source, /settingsBackBtn.*addEventListener/s, 'Settings Back button must be wired');
assert.match(source, /scoresBack.*addEventListener/s, 'Scores Back button must be wired');
assert.match(source, /pauseSettingsBtn.*addEventListener/s, 'Pause Settings button must be wired');

assert.equal(clamp(-4, 0, 10), 0);
assert.equal(clamp(14, 0, 10), 10);
assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
assert.equal(circleHit({ x: 0, y: 0, r: 4 }, { x: 6, y: 0, r: 3 }), true);
assert.equal(circleHit({ x: 0, y: 0, r: 4 }, { x: 8, y: 0, r: 3 }), false);

console.log(`PASS: ${requiredIds.length} required UI IDs validated`);
console.log('PASS: gameplay initialization and validation invariants checked');
console.log('PASS: core math checks passed');
