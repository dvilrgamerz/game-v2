'use strict';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

class FakeClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.contains(name) : Boolean(force);
    next ? this.add(name) : this.remove(name);
    return next;
  }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.classList = new FakeClassList(id === 'menu' ? [] : ids.includes(id) && ['hud','upgrade','pause','gameover','settings','scores','touchControls','toast','runtimeError','bossBar'].includes(id) ? ['hidden'] : []);
    this.style = { setProperty() {} };
    this.dataset = {};
    this.listeners = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.checked = false;
    this.files = [];
    this.type = '';
    this.width = 0;
    this.height = 0;
  }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  click() { this.listeners.get('click')?.({ currentTarget: this, target: this }); }
  appendChild(child) { this.children.push(child); return child; }
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 142, height: 142 }; }
  getContext() { return fakeContext; }
}

const gradient = { addColorStop() {} };
const fakeContext = new Proxy({
  createRadialGradient: () => gradient,
  createLinearGradient: () => gradient,
  measureText: () => ({ width: 10 })
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return () => {};
  },
  set(target, prop, value) { target[prop] = value; return true; }
});

const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
for (const id of ['graphics','particles','uiScale','volume','colorMode']) elements.get(id).type = id === 'uiScale' || id === 'volume' ? 'range' : 'select-one';
elements.get('graphics').value = 'High';
elements.get('particles').value = '1';
elements.get('uiScale').value = '100';
elements.get('volume').value = '0.55';
elements.get('colorMode').value = 'normal';
for (const id of ['shake','numbers','grid','glow']) elements.get(id).checked = true;

const skinButtons = ['cyan','violet','gold','emerald'].map((skin) => {
  const el = new FakeElement();
  el.dataset.skin = skin;
  el.classList = new FakeClassList(skin === 'cyan' ? ['skin-choice','active'] : ['skin-choice']);
  return el;
});

const storage = new Map();
const globalListeners = new Map();
const document = {
  readyState: 'complete',
  body: { dataset: {} },
  documentElement: { style: { setProperty() {} } },
  getElementById: (id) => elements.get(id) || null,
  querySelectorAll: (selector) => selector === '.skin-choice' ? skinButtons : [],
  createElement: () => new FakeElement()
};

class FakeImage {
  constructor() { this.width = 64; this.height = 64; this.onload = null; this.onerror = null; this.alt = ''; }
  set src(value) { this._src = value; }
  get src() { return this._src; }
}
class FakeFileReader {
  readAsDataURL() {}
}

const sandbox = {
  window: null,
  document,
  navigator: { getGamepads: () => [] },
  location: { reload() {} },
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value))
  },
  performance: { now: () => 1000 },
  console,
  Math,
  JSON,
  String,
  Number,
  Date,
  Object,
  Array,
  Infinity,
  Image: FakeImage,
  FileReader: FakeFileReader,
  Error,
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  requestAnimationFrame: () => 1,
  setTimeout: () => 1,
  clearTimeout: () => {},
  addEventListener: (type, fn) => globalListeners.set(type, fn)
};
sandbox.window = sandbox;
sandbox.window.addEventListener = sandbox.addEventListener;

vm.runInNewContext(source, sandbox, { filename: 'js/main.js' });

const visible = (id) => !elements.get(id).classList.contains('hidden');
const hidden = (id) => elements.get(id).classList.contains('hidden');

assert.equal(visible('menu'), true, 'menu should be visible after boot');
elements.get('startBtn').click();
assert.equal(visible('hud'), true, 'Start Run should open HUD');
assert.equal(hidden('menu'), true, 'Start Run should hide menu');

elements.get('pauseBtn').click();
assert.equal(visible('pause'), true, 'Pause should open pause screen');
elements.get('pauseSettingsBtn').click();
assert.equal(visible('settings'), true, 'Pause Settings should open settings');
elements.get('settingsBackBtn').click();
assert.equal(visible('pause'), true, 'Settings Back should return to pause when opened from pause');

elements.get('quitBtn').click();
assert.equal(visible('menu'), true, 'Quit should return to menu');
elements.get('settingsBtn').click();
assert.equal(visible('settings'), true, 'Settings button should open settings');
elements.get('volume').value = '0.25';
elements.get('saveSettings').click();
assert.equal(visible('menu'), true, 'Save Settings should return to menu');
assert.equal(JSON.parse(storage.get('nebula.settings')).volume, 0.25, 'Settings should persist normalized volume');

elements.get('scoresBtn').click();
assert.equal(visible('scores'), true, 'High Scores should open score screen');
elements.get('scoresBack').click();
assert.equal(visible('menu'), true, 'High Scores Back should return to menu');
assert.equal(hidden('runtimeError'), true, 'Runtime error screen should remain hidden');

console.log('PASS: UI boot and Start/Settings/Scores/Pause smoke flow');
