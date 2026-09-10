(() => {
'use strict';

function boot() {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ui = {
    menu: $('menu'),
    hud: $('hud'),
    up: $('upgrade'),
    pause: $('pause'),
    over: $('gameover'),
    settings: $('settings'),
    scores: $('scores'),
    runtimeError: $('runtimeError'),
    runtimeErrorText: $('runtimeErrorText'),
    level: $('level'),
    wave: $('wave'),
    time: $('time'),
    score: $('score'),
    kills: $('kills'),
    hp: $('hpBar'),
    xp: $('xpBar'),
    grid: $('upgradeGrid'),
    upgradeSub: $('upgradeSub'),
    loadout: $('loadout'),
    touch: $('touchControls'),
    joy: $('joystick'),
    stick: $('stick'),
    finalTime: $('finalTime'),
    finalLevel: $('finalLevel'),
    finalKills: $('finalKills'),
    finalScore: $('finalScore'),
    bestScore: $('bestScore'),
    bestTime: $('bestTime'),
    scoreList: $('scoreList'),
    bossBar: $('bossBar'),
    bossName: $('bossName'),
    bossHp: $('bossHpBar'),
    toast: $('toast'),
    skinPreview: $('skinPreview'),
    skinStatus: $('skinStatus'),
    uiScaleValue: $('uiScaleValue'),
    volumeValue: $('volumeValue')
  };

  const requiredIds = [
    'menu','hud','upgrade','pause','gameover','settings','scores','level','wave','time','score',
    'kills','hpBar','xpBar','upgradeGrid','upgradeSub','loadout','touchControls','joystick','stick',
    'finalTime','finalLevel','finalKills','finalScore','bestScore','bestTime','scoreList','bossBar',
    'bossName','bossHpBar','toast','startBtn','restartBtn','pauseBtn','resumeBtn','quitBtn','menuBtn',
    'settingsBtn','scoresBtn','scoresBack','saveSettings','settingsBackBtn','pauseSettingsBtn',
    'clearSkin','skinFile','reloadBtn'
  ];
  const missing = requiredIds.filter((id) => !$(id));
  if (missing.length) {
    console.error('Missing required UI elements:', missing);
    if (ui.runtimeError && ui.runtimeErrorText) {
      ui.runtimeErrorText.textContent = `Missing UI elements: ${missing.join(', ')}`;
      ui.runtimeError.classList.remove('hidden');
    }
    return;
  }

  const DEFAULT_SETTINGS = Object.freeze({
    graphics: 'High',
    particles: 1,
    uiScale: 100,
    volume: 0.55,
    colorMode: 'normal',
    shake: true,
    numbers: true,
    grid: true,
    glow: true,
    reduced: false,
    skin: 'cyan'
  });

  const WEAPON_BASE = Object.freeze({
    pulse: { name: 'Pulse Blaster', icon: '◈', level: 1, max: 5, damage: 26, rate: 0.42 },
    orbit: { name: 'Orbit Shards', icon: '✦', level: 0, max: 5, damage: 22, rate: 0.9 },
    nova: { name: 'Nova Ring', icon: '✺', level: 0, max: 5, damage: 42, rate: 1.75 }
  });

  const PASSIVE_BASE = Object.freeze({
    reactor: { name: 'Reactor Core', icon: '♥', level: 0, max: 5 },
    magnet: { name: 'Flux Magnet', icon: '◎', level: 0, max: 5 },
    armor: { name: 'Aegis Plating', icon: '⬡', level: 0, max: 5 },
    haste: { name: 'Time Drive', icon: '»', level: 0, max: 5 }
  });

  const SKINS = {
    cyan: { main: '#22d3ee', glow: '#67e8f9' },
    violet: { main: '#8b5cf6', glow: '#c4b5fd' },
    gold: { main: '#f59e0b', glow: '#fde68a' },
    emerald: { main: '#10b981', glow: '#6ee7b7' }
  };

  let W = Math.max(320, innerWidth);
  let H = Math.max(240, innerHeight);
  let DPR = 1;
  let audio = null;
  let lastFrame = performance.now();
  let settings = normalizeSettings(loadJSON('nebula.settings', DEFAULT_SETTINGS));
  let savedScores = normalizeScores(loadJSON('nebula.scores', []));
  let skinData = null;
  let skinImg = null;
  let game = fresh();
  const keys = Object.create(null);
  const touch = { on: false, x: 0, y: 0, cx: 0, cy: 0, pointerId: null };

  function loadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`Could not load ${key}`, error);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Could not save ${key}`, error);
      return false;
    }
  }

  function normalizeSettings(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const graphics = ['Low', 'Medium', 'High', 'Ultra'].includes(raw.graphics) ? raw.graphics : DEFAULT_SETTINGS.graphics;
    const colorMode = ['normal', 'contrast'].includes(raw.colorMode) ? raw.colorMode : DEFAULT_SETTINGS.colorMode;
    const skin = Object.prototype.hasOwnProperty.call(SKINS, raw.skin) ? raw.skin : DEFAULT_SETTINGS.skin;
    return {
      graphics,
      particles: clamp(Number(raw.particles) || DEFAULT_SETTINGS.particles, 0.25, 2),
      uiScale: clamp(Number(raw.uiScale) || DEFAULT_SETTINGS.uiScale, 90, 130),
      volume: clamp(Number.isFinite(Number(raw.volume)) ? Number(raw.volume) : DEFAULT_SETTINGS.volume, 0, 1),
      colorMode,
      shake: raw.shake !== false,
      numbers: raw.numbers !== false,
      grid: raw.grid !== false,
      glow: raw.glow !== false,
      reduced: raw.reduced === true,
      skin
    };
  }

  function normalizeScores(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((r) => r && Number.isFinite(Number(r.score)))
      .map((r) => ({
        score: Math.max(0, Math.floor(Number(r.score) || 0)),
        time: Math.max(0, Math.floor(Number(r.time) || 0)),
        level: Math.max(1, Math.floor(Number(r.level) || 1)),
        kills: Math.max(0, Math.floor(Number(r.kills) || 0)),
        date: Number(r.date) || Date.now()
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  function fresh() {
    return {
      run: false,
      pause: false,
      t: 0,
      kills: 0,
      level: 1,
      xp: 0,
      next: 10,
      wave: 1,
      spawnClock: 0.2,
      bossAt: 90,
      lastShot: -999,
      lastOrbit: -999,
      lastNova: -999,
      novaRadius: 0,
      score: 0,
      shards: 0,
      damageFlash: 0,
      shakePower: 0,
      combo: 0,
      comboTimer: 0,
      player: {
        x: 0,
        y: 0,
        r: 18,
        hp: 100,
        max: 100,
        speed: 225,
        damage: 1,
        shots: 1,
        magnet: 95,
        armor: 0,
        haste: 1
      },
      enemies: [],
      bullets: [],
      gems: [],
      parts: [],
      numbers: [],
      weapons: clone(WEAPON_BASE),
      passives: clone(PASSIVE_BASE),
      evolved: {}
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(value));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function activeScreens() {
    return [ui.menu, ui.hud, ui.up, ui.pause, ui.over, ui.settings, ui.scores, ui.runtimeError];
  }

  function showOnly(target) {
    activeScreens().forEach((element) => element && element.classList.add('hidden'));
    if (target) target.classList.remove('hidden');
  }

  function resize() {
    W = Math.max(320, innerWidth);
    H = Math.max(240, innerHeight);
    const cap = settings.graphics === 'Ultra' ? 2 : settings.graphics === 'Low' ? 1 : 1.5;
    DPR = Math.min(devicePixelRatio || 1, cap);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function applySettings() {
    document.documentElement.style.setProperty('--ui-scale', String(settings.uiScale / 100));
    document.body.dataset.contrast = settings.colorMode;
    document.body.dataset.reduced = settings.reduced ? 'true' : 'false';
    resize();
  }

  function initAudio() {
    try {
      if (!audio) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        audio = new AudioCtor();
      }
      if (audio.state === 'suspended') audio.resume();
    } catch (error) {
      console.warn('Audio unavailable', error);
    }
  }

  function beep(frequency = 440, duration = 0.06, type = 'sine', gain = 0.045) {
    if (!audio || settings.volume <= 0) return;
    try {
      const oscillator = audio.createOscillator();
      const amp = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      amp.gain.setValueAtTime(gain * settings.volume, audio.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(amp).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch (error) {
      console.warn('Sound failed', error);
    }
  }

  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ui.toast.classList.add('hidden'), settings.reduced ? 900 : 1500);
  }

  function resetInput() {
    for (const key of Object.keys(keys)) keys[key] = false;
    touch.on = false;
    touch.x = 0;
    touch.y = 0;
    touch.pointerId = null;
    if (ui.stick) ui.stick.style.transform = 'translate(0, 0)';
  }

  function start() {
    initAudio();
    resetInput();
    game = fresh();
    game.run = true;
    for (let i = 0; i < 7; i += 1) spawn('grunt');
    showOnly(ui.hud);
    ui.touch.classList.remove('hidden');
    toast('SURVIVE • BUILD • EVOLVE');
    updateHud();
    lastFrame = performance.now();
  }

  function spawn(kind = 'grunt') {
    const definitions = {
      grunt: [34, 52, 14, '#4ade80', 1],
      runner: [28, 92, 11, '#fb7185', 2],
      tank: [180, 31, 24, '#94a3b8', 5],
      elite: [560, 62, 30, '#a78bfa', 16],
      boss: [4300 + game.t * 24, 27, 56, '#ef4444', 60]
    };
    const data = definitions[kind] || definitions.grunt;
    const p = game.player;
    const angle = random(0, Math.PI * 2);
    const radius = Math.max(W, H) * 0.62 + random(100, 340);
    const scale = 1 + game.t * 0.011 + game.wave * 0.065;
    game.enemies.push({
      x: p.x + Math.cos(angle) * radius,
      y: p.y + Math.sin(angle) * radius,
      hp: data[0] * scale,
      max: data[0] * scale,
      speed: data[1] * (1 + game.t * 0.001),
      r: data[2],
      color: data[3],
      value: data[4],
      kind,
      hitFlash: 0
    });
  }

  function nearest() {
    let target = null;
    let best = Infinity;
    for (const enemy of game.enemies) {
      if (enemy.hp <= 0) continue;
      const d = distance(enemy, game.player);
      if (d < best) {
        best = d;
        target = enemy;
      }
    }
    return target;
  }

  function burst(origin, count = 7) {
    if (settings.reduced) count = Math.min(count, 3);
    if (settings.graphics === 'Low') count = Math.ceil(count * 0.35);
    if (settings.graphics === 'Medium') count = Math.ceil(count * 0.7);
    count = Math.max(0, Math.round(count * settings.particles));
    for (let i = 0; i < count; i += 1) {
      const angle = random(0, Math.PI * 2);
      const velocity = random(35, 150);
      game.parts.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random(0.22, 0.58),
        color: origin.color || '#67e8f9'
      });
    }
  }

  function hit(enemy, damage) {
    if (enemy.hp <= 0 || !Number.isFinite(damage) || damage <= 0) return;
    enemy.hp -= damage;
    enemy.hitFlash = 0.06;
    burst(enemy, 3);
    if (settings.numbers) {
      game.numbers.push({
        x: enemy.x,
        y: enemy.y - 12,
        text: String(Math.round(damage)),
        life: 0.55,
        color: enemy.color
      });
    }
    if (enemy.hp <= 0) {
      game.kills += 1;
      game.combo += 1;
      game.comboTimer = 2.5;
      const comboBonus = 1 + Math.min(game.combo, 25) * 0.02;
      game.score += Math.round(enemy.value * (1 + game.level * 0.08) * 10 * comboBonus);
      game.shards += enemy.value;
      const gems = enemy.kind === 'boss' ? 24 : enemy.kind === 'elite' ? 7 : 1;
      for (let i = 0; i < gems; i += 1) {
        game.gems.push({
          x: enemy.x + random(-14, 14),
          y: enemy.y + random(-14, 14),
          value: enemy.value
        });
      }
      burst(enemy, enemy.kind === 'boss' ? 38 : 12);
      game.shakePower = Math.max(game.shakePower, enemy.kind === 'boss' ? 10 : 3);
      beep(enemy.kind === 'boss' ? 95 : 180, 0.08, 'triangle');
    }
  }

  function weaponDamage(weapon) {
    return weapon.damage * (1 + weapon.level * 0.32) * game.player.damage;
  }

  function shoot() {
    const p = game.player;
    const w = game.weapons;
    const enemy = nearest();
    if (!enemy) return;
    const base = Math.atan2(enemy.y - p.y, enemy.x - p.x);

    if (w.pulse.level > 0) {
      for (let i = 0; i < p.shots; i += 1) {
        const angle = base + (i - (p.shots - 1) / 2) * 0.13;
        game.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * 680,
          vy: Math.sin(angle) * 680,
          life: 1.35,
          r: 5,
          damage: weaponDamage(w.pulse),
          color: '#67e8f9',
          pierce: game.evolved.pulse ? 1 : 0
        });
      }
    }

    const hasteCooldown = Math.max(0.45, 1 - game.passives.haste.level * 0.06);
    if (w.orbit.level > 0 && game.t - game.lastOrbit >= w.orbit.rate * hasteCooldown) {
      game.lastOrbit = game.t;
      const count = 1 + w.orbit.level + (game.evolved.orbit ? 2 : 0);
      for (let i = 0; i < count; i += 1) {
        const angle = game.t * 1.8 + i * Math.PI * 2 / count;
        game.bullets.push({
          x: p.x + Math.cos(angle) * 58,
          y: p.y + Math.sin(angle) * 58,
          vx: Math.cos(angle) * 280,
          vy: Math.sin(angle) * 280,
          life: game.evolved.orbit ? 1.2 : 0.82,
          r: 7,
          damage: weaponDamage(w.orbit),
          color: '#a78bfa',
          pierce: game.evolved.orbit ? 4 : 2
        });
      }
    }

    if (w.nova.level > 0 && game.t - game.lastNova >= w.nova.rate * hasteCooldown) {
      game.lastNova = game.t;
      const radius = 100 + w.nova.level * 16 + (game.evolved.nova ? 80 : 0);
      game.novaRadius = radius;
      for (const target of game.enemies) {
        if (target.hp > 0 && distance(target, p) <= radius + target.r) {
          hit(target, weaponDamage(w.nova));
        }
      }
      burst(p, game.evolved.nova ? 30 : 20);
      game.shakePower = Math.max(game.shakePower, 4);
      beep(260, 0.1, 'sine');
    }
  }

  function checkEvolution(key) {
    const requirements = { pulse: 'reactor', orbit: 'magnet', nova: 'haste' };
    const weapon = game.weapons[key];
    const passive = game.passives[requirements[key]];
    if (!weapon || !passive || game.evolved[key]) return;
    if (weapon.level >= weapon.max && passive.level >= 3) {
      game.evolved[key] = true;
      weapon.name += ' Ω';
      weapon.damage *= 2.1;
      toast(`${weapon.name} EVOLVED!`);
      beep(880, 0.25, 'sawtooth');
    }
  }

  function checkAllEvolutions() {
    Object.keys(game.weapons).forEach(checkEvolution);
  }

  function upgradePassive(key) {
    const passive = game.passives[key];
    if (!passive || passive.level >= passive.max) return;
    passive.level += 1;
    const p = game.player;
    if (key === 'reactor') {
      p.max += 24;
      p.hp = Math.min(p.max, p.hp + 45);
    } else if (key === 'magnet') {
      p.magnet += 35;
    } else if (key === 'armor') {
      p.armor = Math.min(0.65, p.armor + 0.08);
    } else if (key === 'haste') {
      p.haste += 0.08;
    }
    checkAllEvolutions();
  }

  function getChoices() {
    const choices = [];
    for (const key of Object.keys(game.weapons)) {
      const weapon = game.weapons[key];
      if (weapon.level < weapon.max) {
        choices.push({
          title: weapon.name,
          desc: `Weapon level ${weapon.level + 1} • stronger attacks`,
          tag: 'WEAPON',
          fn: () => {
            weapon.level += 1;
            checkEvolution(key);
          }
        });
      }
    }
    for (const key of Object.keys(game.passives)) {
      const passive = game.passives[key];
      if (passive.level < passive.max) {
        choices.push({
          title: passive.name,
          desc: `Passive level ${passive.level + 1}`,
          tag: 'PASSIVE',
          fn: () => upgradePassive(key)
        });
      }
    }
    choices.push(
      { title: 'Overdrive', desc: 'All weapon damage +15%', tag: 'POWER', fn: () => { game.player.damage *= 1.15; } },
      { title: 'Twin Core', desc: '+1 Pulse projectile', tag: 'POWER', fn: () => { game.player.shots = Math.min(7, game.player.shots + 1); } },
      { title: 'Thrusters', desc: 'Move speed +14%', tag: 'POWER', fn: () => { game.player.speed = Math.min(480, game.player.speed * 1.14); } }
    );
    return choices
      .map((choice) => ({ choice, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 3)
      .map((item) => item.choice);
  }

  function levelUp() {
    game.level += 1;
    game.next = Math.floor(game.next * 1.22 + 6);
    game.pause = true;
    resetInput();
    ui.grid.innerHTML = '';
    ui.upgradeSub.textContent = `Level ${game.level} • Max a weapon + matching passive to evolve it.`;
    for (const option of getChoices()) {
      const button = document.createElement('button');
      button.className = 'upgrade-choice';
      button.type = 'button';
      button.innerHTML = `<span class="icon">${option.tag === 'WEAPON' ? '◈' : option.tag === 'PASSIVE' ? '⬡' : '✦'}</span><h3>${option.title}</h3><p>${option.desc}</p><span class="tag">${option.tag}</span>`;
      button.addEventListener('click', () => {
        option.fn();
        game.pause = false;
        showOnly(ui.hud);
        ui.touch.classList.remove('hidden');
        beep(620, 0.07);
        updateHud();
        lastFrame = performance.now();
      }, { once: true });
      ui.grid.appendChild(button);
    }
    showOnly(ui.up);
    ui.touch.classList.add('hidden');
  }

  function getMoveVector() {
    let x = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
    let y = (keys.w || keys.arrowup ? -1 : 0) + (keys.s || keys.arrowdown ? 1 : 0);

    if (touch.on) {
      x += touch.x;
      y += touch.y;
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (pad && pad.connected) {
      const dead = 0.16;
      const gx = Math.abs(pad.axes[0] || 0) > dead ? pad.axes[0] : 0;
      const gy = Math.abs(pad.axes[1] || 0) > dead ? pad.axes[1] : 0;
      x += gx;
      y += gy;
    }

    const magnitude = Math.hypot(x, y);
    return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
  }

  function update(dt) {
    if (!game.run || game.pause) return;

    game.t += dt;
    game.wave = 1 + Math.floor(game.t / 30);
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;

    const p = game.player;
    const move = getMoveVector();
    p.x += move.x * p.speed * dt;
    p.y += move.y * p.speed * dt;

    game.spawnClock -= dt;
    if (game.spawnClock <= 0) {
      const count = Math.min(6, 1 + Math.floor(game.t / 50));
      game.spawnClock = Math.max(0.14, 0.72 - game.t * 0.0036);
      for (let i = 0; i < count; i += 1) {
        const roll = Math.random();
        const kind =
          game.t > 100 && roll < 0.045 ? 'elite' :
          game.t > 45 && roll < 0.18 ? 'tank' :
          game.t > 20 && roll < 0.32 ? 'runner' : 'grunt';
        spawn(kind);
      }
    }

    if (game.t >= game.bossAt) {
      spawn('boss');
      game.bossAt += 105;
      toast('BOSS INCOMING');
      beep(90, 0.3, 'sawtooth');
    }

    if (game.t - game.lastShot >= game.weapons.pulse.rate / game.player.haste) {
      game.lastShot = game.t;
      shoot();
    }

    for (const bullet of game.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) continue;
      for (const enemy of game.enemies) {
        if (enemy.hp <= 0 || distance(bullet, enemy) >= enemy.r + bullet.r) continue;
        hit(enemy, bullet.damage);
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullet.life = 0;
        }
        break;
      }
    }
    game.bullets = game.bullets.filter((bullet) => bullet.life > 0);

    for (const enemy of game.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const d = distance(enemy, p);
      if (d > enemy.r + p.r) {
        const divisor = Math.max(d, 1);
        enemy.x += (p.x - enemy.x) / divisor * enemy.speed * dt;
        enemy.y += (p.y - enemy.y) / divisor * enemy.speed * dt;
      } else {
        const contact = enemy.kind === 'boss' ? 24 : enemy.kind === 'elite' ? 14 : 9;
        p.hp -= contact * (1 - p.armor) * dt;
        game.damageFlash = 0.12;
        game.shakePower = Math.max(game.shakePower, 2);
      }
    }

    for (const gem of game.gems) {
      const d = distance(gem, p);
      if (d < p.magnet) {
        const divisor = Math.max(d, 1);
        gem.x += (p.x - gem.x) / divisor * 380 * dt;
        gem.y += (p.y - gem.y) / divisor * 380 * dt;
      }
      if (distance(gem, p) < 28) {
        game.xp += gem.value;
        gem.dead = true;
      }
    }

    game.gems = game.gems.filter((gem) => !gem.dead);
    game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
    game.parts.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    });
    game.parts = game.parts.filter((particle) => particle.life > 0);
    game.numbers.forEach((number) => {
      number.y -= 28 * dt;
      number.life -= dt;
    });
    game.numbers = game.numbers.filter((number) => number.life > 0);

    if (game.xp >= game.next && !game.pause) {
      game.xp -= game.next;
      levelUp();
    }

    if (p.hp <= 0) endRun();
    updateHud();
  }

  function endRun() {
    game.run = false;
    game.pause = false;
    resetInput();
    const record = {
      score: Math.max(0, Math.round(game.score)),
      time: Math.floor(game.t),
      level: game.level,
      kills: game.kills,
      date: Date.now()
    };
    savedScores = normalizeScores([record, ...savedScores]);
    saveJSON('nebula.scores', savedScores);

    ui.finalTime.textContent = formatTime(game.t);
    ui.finalLevel.textContent = String(game.level);
    ui.finalKills.textContent = String(game.kills);
    ui.finalScore.textContent = String(record.score);
    ui.bestScore.textContent = String(savedScores[0]?.score || 0);
    ui.bestTime.textContent = formatTime(savedScores.reduce((best, row) => Math.max(best, row.time), 0));
    ui.touch.classList.add('hidden');
    showOnly(ui.over);
    beep(120, 0.4, 'sawtooth');
  }

  function updateHud() {
    ui.level.textContent = String(game.level);
    ui.wave.textContent = String(game.wave);
    ui.time.textContent = formatTime(game.t);
    ui.score.textContent = String(Math.round(game.score));
    ui.kills.textContent = String(game.kills);
    ui.hp.style.width = `${clamp(game.player.hp / game.player.max * 100, 0, 100)}%`;
    ui.xp.style.width = `${clamp(game.xp / game.next * 100, 0, 100)}%`;

    ui.loadout.innerHTML = '';
    for (const [key, weapon] of Object.entries(game.weapons)) {
      if (weapon.level <= 0) continue;
      const item = document.createElement('span');
      item.textContent = `${weapon.icon} ${weapon.name} ${weapon.level}${game.evolved[key] ? ' Ω' : ''}`;
      ui.loadout.appendChild(item);
    }

    const boss = game.enemies.find((enemy) => enemy.kind === 'boss' && enemy.hp > 0);
    ui.bossBar.classList.toggle('hidden', !boss);
    if (boss) {
      ui.bossName.textContent = 'VOID WARDEN';
      ui.bossHp.style.width = `${clamp(boss.hp / boss.max * 100, 0, 100)}%`;
    }
  }

  function drawBackground() {
    const gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
    gradient.addColorStop(0, settings.colorMode === 'contrast' ? '#123c66' : '#193c61');
    gradient.addColorStop(1, '#02050b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPlayer(cx, cy) {
    const skin = SKINS[settings.skin] || SKINS.cyan;
    ctx.save();
    ctx.translate(cx, cy);
    if (settings.glow && settings.graphics !== 'Low') {
      ctx.shadowBlur = 30;
      ctx.shadowColor = skinImg ? '#67e8f9' : skin.glow;
    }
    if (skinImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(skinImg, -27, -27, 54, 54);
      ctx.restore();
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = skin.main;
      ctx.beginPath();
      ctx.moveTo(31, 0);
      ctx.lineTo(-17, -16);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-17, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(2, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    const p = game.player;
    const cx = W / 2;
    const cy = H / 2;
    let shakeX = 0;
    let shakeY = 0;
    if (settings.shake && !settings.reduced && game.shakePower > 0.05) {
      shakeX = random(-game.shakePower, game.shakePower);
      shakeY = random(-game.shakePower, game.shakePower);
      game.shakePower *= 0.86;
    } else {
      game.shakePower = Math.max(0, game.shakePower - 0.5);
    }

    ctx.save();
    ctx.translate(cx - p.x + shakeX, cy - p.y + shakeY);

    if (settings.grid) {
      ctx.strokeStyle = settings.colorMode === 'contrast' ? '#ffffff29' : '#78d2ff14';
      ctx.lineWidth = 1;
      const step = settings.graphics === 'Low' ? 100 : 70;
      const left = p.x - W - 100;
      const right = p.x + W + 100;
      const top = p.y - H - 100;
      const bottom = p.y + H + 100;
      for (let a = Math.floor(left / step) * step; a < right; a += step) {
        ctx.beginPath();
        ctx.moveTo(a, top);
        ctx.lineTo(a, bottom);
        ctx.stroke();
      }
      for (let a = Math.floor(top / step) * step; a < bottom; a += step) {
        ctx.beginPath();
        ctx.moveTo(left, a);
        ctx.lineTo(right, a);
        ctx.stroke();
      }
      if (settings.graphics !== 'Low') {
        for (let r = 180; r < 900; r += 180) {
          ctx.strokeStyle = settings.colorMode === 'contrast' ? '#ffffff16' : '#67e8f90c';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    for (const gem of game.gems) {
      ctx.fillStyle = gem.value > 10 ? '#fbbf24' : '#22d3ee';
      if (settings.glow && settings.graphics !== 'Low') {
        ctx.shadowBlur = 14;
        ctx.shadowColor = ctx.fillStyle;
      }
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 6);
      ctx.lineTo(gem.x + 5, gem.y);
      ctx.lineTo(gem.x, gem.y + 6);
      ctx.lineTo(gem.x - 5, gem.y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const bullet of game.bullets) {
      ctx.fillStyle = bullet.color;
      if (settings.glow && settings.graphics !== 'Low') {
        ctx.shadowBlur = 14;
        ctx.shadowColor = bullet.color;
      }
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const enemy of game.enemies) {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
      if (settings.glow && settings.graphics !== 'Low') {
        ctx.shadowBlur = enemy.kind === 'boss' ? 30 : 14;
        ctx.shadowColor = enemy.color;
      }
      if (enemy.kind === 'tank' || enemy.kind === 'elite' || enemy.kind === 'boss') {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - enemy.r);
        for (let i = 1; i < 8; i += 1) {
          const angle = -Math.PI / 2 + i * Math.PI / 4;
          ctx.lineTo(enemy.x + Math.cos(angle) * enemy.r, enemy.y + Math.sin(angle) * enemy.r);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (enemy.hp < enemy.max) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2, 3);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(enemy.x - enemy.r, enemy.y - enemy.r - 9, enemy.r * 2 * clamp(enemy.hp / enemy.max, 0, 1), 3);
      }
    }

    for (const particle of game.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const number of game.numbers) {
      ctx.globalAlpha = Math.max(0, Math.min(1, number.life * 2));
      ctx.fillStyle = number.color;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(number.text, number.x, number.y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
    drawPlayer(cx + shakeX, cy + shakeY);

    if (game.damageFlash > 0) {
      ctx.fillStyle = `rgba(255,50,70,${Math.min(0.18, game.damageFlash)})`;
      ctx.fillRect(0, 0, W, H);
      game.damageFlash = Math.max(0, game.damageFlash - 0.016);
    }
  }

  function togglePause() {
    if (!game.run) return;
    game.pause = !game.pause;
    resetInput();
    showOnly(game.pause ? ui.pause : ui.hud);
    ui.touch.classList.toggle('hidden', game.pause);
    if (!game.pause) {
      initAudio();
      lastFrame = performance.now();
    }
  }

  function openSettings(returnTarget = 'menu') {
    ui.settings.dataset.returnTarget = returnTarget;
    syncSettingsUI();
    showOnly(ui.settings);
    ui.touch.classList.add('hidden');
  }

  function closeSettings() {
    const target = ui.settings.dataset.returnTarget === 'pause' && game.run ? ui.pause : ui.menu;
    showOnly(target);
    if (target === ui.pause) game.pause = true;
  }

  function syncSettingsUI() {
    const values = {
      graphics: settings.graphics,
      particles: String(settings.particles),
      uiScale: String(settings.uiScale),
      volume: String(settings.volume),
      colorMode: settings.colorMode
    };
    for (const [id, value] of Object.entries(values)) {
      const input = $(id);
      if (input) input.value = value;
    }
    for (const key of ['shake', 'numbers', 'grid', 'glow', 'reduced']) {
      const input = $(key);
      if (input) input.checked = Boolean(settings[key]);
    }
    updateRangeLabels();
    renderSkin();
  }

  function readSettingsUI() {
    return normalizeSettings({
      graphics: $('graphics').value,
      particles: Number($('particles').value),
      uiScale: Number($('uiScale').value),
      volume: Number($('volume').value),
      colorMode: $('colorMode').value,
      shake: $('shake').checked,
      numbers: $('numbers').checked,
      grid: $('grid').checked,
      glow: $('glow').checked,
      reduced: $('reduced').checked,
      skin: settings.skin
    });
  }

  function saveSettings() {
    settings = readSettingsUI();
    saveJSON('nebula.settings', settings);
    applySettings();
    closeSettings();
    toast('SETTINGS SAVED');
  }

  function updateRangeLabels() {
    if (ui.uiScaleValue) ui.uiScaleValue.value = $('uiScale').value;
    if (ui.volumeValue) ui.volumeValue.value = String(Math.round(Number($('volume').value) * 100));
  }

  function renderSkin() {
    ui.skinPreview.innerHTML = '';
    if (skinImg) {
      const image = new Image();
      image.src = skinData;
      image.alt = 'Custom player skin preview';
      ui.skinPreview.appendChild(image);
    } else {
      const skin = SKINS[settings.skin] || SKINS.cyan;
      ui.skinPreview.textContent = settings.skin.toUpperCase();
      ui.skinPreview.style.background = `radial-gradient(circle, ${skin.glow}, ${skin.main} 48%, #111827)`;
    }
    document.querySelectorAll('.skin-choice').forEach((button) => {
      button.classList.toggle('active', button.dataset.skin === settings.skin && !skinImg);
    });
  }

  function setBuiltInSkin(name) {
    if (!Object.prototype.hasOwnProperty.call(SKINS, name)) return;
    settings.skin = name;
    skinData = null;
    skinImg = null;
    if (ui.skinStatus) ui.skinStatus.textContent = `${name.toUpperCase()} skin selected`;
    renderSkin();
  }

  function clearSkin() {
    skinData = null;
    skinImg = null;
    settings.skin = DEFAULT_SETTINGS.skin;
    if (ui.skinStatus) ui.skinStatus.textContent = 'Custom skin cleared';
    renderSkin();
  }

  function handleSkinFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      event.target.value = '';
      toast('Use PNG or JPEG only');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = '';
      toast('Image must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      event.target.value = '';
      toast('Could not read image');
    };
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => {
        event.target.value = '';
        toast('Invalid image file');
      };
      image.onload = () => {
        if (image.width > 1024 || image.height > 1024 || image.width < 16 || image.height < 16) {
          event.target.value = '';
          toast('Image must be 16–1024 px');
          return;
        }
        skinData = String(reader.result);
        skinImg = image;
        if (ui.skinStatus) ui.skinStatus.textContent = `${image.width}×${image.height} custom skin ready`;
        renderSkin();
        toast('CUSTOM SKIN READY');
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function renderScores() {
    if (!savedScores.length) {
      ui.scoreList.innerHTML = '<p class="hint">No runs yet. Finish a run to set the first record.</p>';
      return;
    }
    ui.scoreList.innerHTML = savedScores.map((row, index) =>
      `<div class="score-row"><b>#${index + 1}</b><span>Score ${row.score}<small> • Lv ${row.level}</small></span><span>${formatTime(row.time)}</span><span>${row.kills} K</span></div>`
    ).join('');
  }

  function updateStick(event) {
    const dx = event.clientX - touch.cx;
    const dy = event.clientY - touch.cy;
    const magnitude = Math.hypot(dx, dy) || 1;
    const size = Math.min(52, magnitude);
    touch.x = dx / magnitude * size / 52;
    touch.y = dy / magnitude * size / 52;
    ui.stick.style.transform = `translate(${dx / magnitude * size}px, ${dy / magnitude * size}px)`;
  }

  $('startBtn').addEventListener('click', start);
  $('restartBtn').addEventListener('click', start);
  $('pauseBtn').addEventListener('click', togglePause);
  $('resumeBtn').addEventListener('click', () => {
    game.pause = false;
    showOnly(ui.hud);
    ui.touch.classList.remove('hidden');
    initAudio();
    lastFrame = performance.now();
  });
  $('quitBtn').addEventListener('click', () => {
    game.run = false;
    game.pause = false;
    resetInput();
    ui.touch.classList.add('hidden');
    showOnly(ui.menu);
  });
  $('menuBtn').addEventListener('click', () => {
    game.run = false;
    game.pause = false;
    resetInput();
    ui.touch.classList.add('hidden');
    showOnly(ui.menu);
  });
  $('settingsBtn').addEventListener('click', () => openSettings('menu'));
  $('pauseSettingsBtn').addEventListener('click', () => openSettings('pause'));
  $('settingsBackBtn').addEventListener('click', closeSettings);
  $('saveSettings').addEventListener('click', saveSettings);
  $('scoresBtn').addEventListener('click', () => {
    renderScores();
    showOnly(ui.scores);
  });
  $('scoresBack').addEventListener('click', () => showOnly(ui.menu));
  $('clearSkin').addEventListener('click', clearSkin);
  $('reloadBtn').addEventListener('click', () => location.reload());
  $('skinFile').addEventListener('change', handleSkinFile);
  $('uiScale').addEventListener('input', updateRangeLabels);
  $('volume').addEventListener('input', () => {
    updateRangeLabels();
    initAudio();
  });

  document.querySelectorAll('.skin-choice').forEach((button) => {
    button.addEventListener('click', () => setBuiltInSkin(button.dataset.skin));
  });

  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys[key] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (key === 'p' || key === 'escape') togglePause();
  });
  addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });
  addEventListener('blur', resetInput);
  addEventListener('resize', resize);

  ui.joy.addEventListener('pointerdown', (event) => {
    initAudio();
    touch.on = true;
    touch.pointerId = event.pointerId;
    ui.joy.setPointerCapture(event.pointerId);
    const rect = ui.joy.getBoundingClientRect();
    touch.cx = rect.left + rect.width / 2;
    touch.cy = rect.top + rect.height / 2;
    updateStick(event);
  });
  ui.joy.addEventListener('pointermove', (event) => {
    if (touch.on && event.pointerId === touch.pointerId) updateStick(event);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
    ui.joy.addEventListener(type, resetInput);
  });

  window.addEventListener('error', (event) => {
    console.error(event.error || event.message);
  });

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    try {
      update(dt);
      draw();
    } catch (error) {
      console.error(error);
      game.run = false;
      game.pause = false;
      resetInput();
      ui.runtimeErrorText.textContent = error instanceof Error ? error.message : String(error);
      showOnly(ui.runtimeError);
    }
    requestAnimationFrame(loop);
  }

  applySettings();
  syncSettingsUI();
  showOnly(ui.menu);
  updateHud();
  draw();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
})();
