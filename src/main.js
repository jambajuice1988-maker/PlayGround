import * as THREE from 'three';
import { Models } from './models.js';
import { Dungeon, DIRS, THEMES } from './dungeon.js';
import { AudioEngine } from './audio.js';
import { rng, makeFloorTexture, makeWallTexture } from './textures.js';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
const canvas = $('game-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
scene.background = new THREE.Color(0x0b0806);
const floorGroup = new THREE.Group(); scene.add(floorGroup);
const models = new Models({
  glowCyan: null, glowWarm: null, glowRed: null, glowBlue: null,
  shadow: null
});
// Models use the same procedural glow maps as their room's visual palette.
import { makeGlowTexture, makeSoftShadowTexture } from './textures.js';
models.tex.glowCyan = makeGlowTexture('#9feaff');
models.tex.glowWarm = makeGlowTexture('#ffbd65');
models.tex.glowRed = makeGlowTexture('#ff5144');
models.tex.glowBlue = makeGlowTexture('#70a5ff');
models.tex.glowPurple = makeGlowTexture('#a58cff');
const audio = new AudioEngine();
const dungeon = new Dungeon();
const player = { x: 0, z: 0, hp: 6, maxHp: 6, coins: 0, bombs: 2, damage: 1, fireRate: 0.31, speed: 5.2, invuln: 0, fireTimer: 0, moveX: 0, moveZ: 0, aimX: 0, aimZ: 1 };
let playerMesh = null, currentRoom = null, floorIndex = 0, roomCount = 1, runTime = 0;
let gameState = 'title', mapVisible = true, bannerTimer = 0, toastTimer = 0, hurtTimer = 0;
let lastTime = 0, stepTimer = 0, bombCooldown = 0;
let enemyList = [], pickups = [], tears = [], enemyShots = [], bombs = [], effects = [], props = [];
const keys = new Set(), raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const pointerAim = new THREE.Vector3();
let mouseDown = false, touchMode = false;
const touch = { move: null, aim: null };
const HALF_W = 10, HALF_D = 8;

function showBanner(title, subtitle) {
  ui['room-banner-name'].textContent = title; ui['room-banner-sub'].textContent = subtitle;
  ui['room-banner'].classList.remove('show'); void ui['room-banner'].offsetWidth; ui['room-banner'].classList.add('show');
  bannerTimer = 2.4;
}
function roomTitle(room) {
  return room.type === 'start' ? 'THE ENTRANCE' : room.type === 'boss' ? dungeon.theme.bossName : room.type === 'treasure' ? 'THE OFFERING' : 'DANK CELLAR';
}
function clearRoom() {
  while (floorGroup.children.length) floorGroup.remove(floorGroup.children[0]);
  enemyList = []; pickups = []; tears = []; enemyShots = []; bombs = []; effects = []; props = [];
}
function makeRoomShell(room, theme) {
  const floorTex = makeFloorTexture(theme), wallTex = makeWallTexture(theme);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 1.6); floorTex.colorSpace = THREE.SRGBColorSpace;
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(2, 1); wallTex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floorGroup.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.98 });
  const wallDark = new THREE.MeshStandardMaterial({ color: theme.wallBase, roughness: 1 });
  const wallHeight = 3.4, doorWidth = 2.8;
  const wall = (x, z, w, h, d, material = wallMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; floorGroup.add(m); return m;
  };
  for (const dir of ['N', 'S']) {
    const z = dir === 'N' ? -HALF_D : HALF_D;
    if (room.doors[dir]) {
      const seg = (HALF_W * 2 - doorWidth) / 2;
      wall(-(doorWidth + seg) / 2, z, seg, wallHeight, 0.55);
      wall((doorWidth + seg) / 2, z, seg, wallHeight, 0.55);
      wall(0, z, doorWidth, 1.2, 0.55, wallDark);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.28, 0.72), new THREE.MeshStandardMaterial({ color: 0x403027, roughness: 0.9 })); lintel.position.set(0, 2.55, z); floorGroup.add(lintel);
    } else wall(0, z, HALF_W * 2, wallHeight, 0.55);
  }
  for (const dir of ['E', 'W']) {
    const x = dir === 'W' ? -HALF_W : HALF_W;
    if (room.doors[dir]) {
      const seg = (HALF_D * 2 - doorWidth) / 2;
      wall(x, -(doorWidth + seg) / 2, 0.55, wallHeight, seg);
      wall(x, (doorWidth + seg) / 2, 0.55, wallHeight, seg);
      wall(x, 0, 0.55, 1.2, doorWidth, wallDark);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, doorWidth), new THREE.MeshStandardMaterial({ color: 0x403027, roughness: 0.9 })); lintel.position.set(x, 2.55, 0); floorGroup.add(lintel);
    } else wall(x, 0, 0.55, wallHeight, HALF_D * 2);
  }
  scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity * 0.5);
  floorGroup.add(new THREE.AmbientLight(theme.ambient, theme.ambientIntensity));
  const keyLight = new THREE.DirectionalLight(theme.directional, theme.directionalIntensity);
  keyLight.position.set(-5, 10, 7); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -13; keyLight.shadow.camera.right = 13; keyLight.shadow.camera.top = 12; keyLight.shadow.camera.bottom = -12; floorGroup.add(keyLight);
  // Wall torches and scattered, deterministic cellar clutter.
  for (const [x, z] of [[-8.8, -6.6], [8.8, -6.6], [-8.8, 6.6], [8.8, 6.6]]) {
    const candle = models.createCandle(0.8); candle.position.set(x, 0, z); floorGroup.add(candle);
  }
  const rand = rng(room.seed + 1991 + floorIndex * 81);
  if (room.type !== 'boss' && room.type !== 'treasure') {
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 14, z = (rand() - 0.5) * 10;
      if (Math.hypot(x, z) < 3.3 || Math.abs(x) < 1.8 || Math.abs(z) < 1.8) continue;
      const mesh = rand() > 0.48 ? models.createRock(i + room.seed, theme) : models.createPot();
      mesh.position.set(x, 0, z); mesh.rotation.y = rand() * Math.PI * 2; mesh.castShadow = true; floorGroup.add(mesh);
      props.push({ mesh, x, z, radius: 0.55, breakable: true });
    }
  }
}

const ITEM_POOL = [
  { name: 'TEAR RING', desc: '+1.0 TEAR DAMAGE', icon: 'ring', apply: () => { player.damage += 1; } },
  { name: 'THE LAST HOUR', desc: 'TEARS FLY 25% FASTER', icon: 'hourglass', apply: () => { player.fireRate = Math.max(0.16, player.fireRate * 0.78); } },
  { name: 'BORROWED WINGS', desc: '+18% MOVEMENT SPEED', icon: 'feather', apply: () => { player.speed *= 1.18; } },
  { name: 'MOTHER’S LENS', desc: 'TEARS DEAL +1 DAMAGE', icon: 'lens', apply: () => { player.damage += 1; } },
  { name: 'RED THREAD', desc: '+2 HEARTS', icon: 'blood', apply: () => { player.maxHp += 2; player.hp = Math.min(player.maxHp, player.hp + 2); } },
  { name: 'CELLAR CLOVER', desc: 'A LITTLE MORE LUCK', icon: 'clover', apply: () => { player.bombs += 2; } }
];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (seed) => rng(seed >>> 0);
const worldRay = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cameraTarget = new THREE.Vector3();
let pedestal = null, trapdoor = null, runRooms = 0, deathCount = 0, floorTransitioning = false;

function setState(state) {
  gameState = state;
  ui['title-screen'].classList.toggle('hidden', state !== 'title');
  ui['pause-screen'].classList.toggle('hidden', state !== 'paused');
  ui['end-screen'].classList.toggle('hidden', state !== 'dead' && state !== 'won');
  ui.hud.classList.toggle('hidden', state === 'title');
  ui['crosshair'].classList.toggle('hidden', state !== 'playing' || touchMode);
  ui['touch-ui'].classList.toggle('hidden', state !== 'playing' || !touchMode);
  if (state === 'paused') {
    ui['pause-stats'].innerHTML = `FLOOR ${floorIndex + 1} · ${runRooms} ROOMS<br>${player.coins} COINS · ${Math.ceil(player.hp / 2)} HEARTS`;
  }
  if (state === 'dead' || state === 'won') {
    ui['end-kicker'].textContent = state === 'won' ? 'THE BASEMENT FALLS SILENT' : 'THE DUNGEON CLAIMS YOU';
    ui['end-title'].textContent = state === 'won' ? 'YOU ESCAPED' : 'YOU DIED';
    ui['end-message'].textContent = state === 'won' ? 'For one breath, there is nothing below.' : 'The basement is hungry. It always was.';
    ui['end-stats'].innerHTML = `DESCENDED ${floorIndex + (state === 'won' ? 1 : 0)} FLOORS<br>${runRooms} ROOMS · ${player.coins} COINS · ${formatTime(runTime)}`;
  }
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function announceItem(item) {
  ui['item-toast-name'].textContent = item.name;
  ui['item-toast-desc'].textContent = item.desc;
  ui['item-toast'].classList.remove('show'); void ui['item-toast'].offsetWidth; ui['item-toast'].classList.add('show');
  toastTimer = 2.8;
}
function updateHud() {
  const hearts = ui.hearts; hearts.innerHTML = '';
  for (let i = 0; i < player.maxHp; i += 2) {
    const value = clamp(player.hp - i, 0, 2);
    const heart = document.createElement('span');
    heart.className = `heart ${value === 0 ? 'empty' : value === 1 ? 'half' : ''}`;
    heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="h-base" d="M12 21S2 14.5 2 8.3C2 3.4 8.1 1.8 12 6.2c3.9-4.4 10-2.8 10 2.1C22 14.5 12 21 12 21Z"/><path class="h-fill" d="M12 21S2 14.5 2 8.3C2 3.4 8.1 1.8 12 6.2c3.9-4.4 10-2.8 10 2.1C22 14.5 12 21 12 21Z"/></svg>';
    hearts.appendChild(heart);
  }
  $('coin-count').textContent = player.coins; $('bomb-count').textContent = player.bombs;
  const theme = THEMES[floorIndex];
  $('floor-label').innerHTML = `${theme.name} <span>${theme.numeral}</span>`;
  const boss = enemyList.find(e => e.boss && e.hp > 0);
  ui['boss-bar'].classList.toggle('hidden', !boss);
  if (boss) {
    $('boss-name').textContent = theme.bossName;
    $('boss-fill').style.transform = `scaleX(${clamp(boss.hp / boss.maxHp, 0, 1)})`;
  }
  ui['room-status'].textContent = currentRoom?.type === 'treasure' ? 'A GIFT WAITS' : currentRoom?.type === 'boss' && !currentRoom.cleared ? 'BOSS ROOM' : enemyList.length && !currentRoom.cleared ? 'DOORS SEALED' : 'ROOM CLEARED';
  ui['room-status'].classList.toggle('active', enemyList.length > 0 && !currentRoom?.cleared);
}
function drawMap() {
  const c = $('minimap'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const rooms = dungeon.discoveredMap();
  const xs = rooms.map(r => r.x), ys = rooms.map(r => r.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cell = Math.min(24, (c.width - 24) / (maxX - minX + 1), (c.height - 24) / (maxY - minY + 1));
  const ox = (c.width - (maxX - minX + 1) * cell) / 2, oy = (c.height - (maxY - minY + 1) * cell) / 2;
  for (const r of rooms) {
    if (!r.discovered) continue;
    const x = ox + (r.x - minX) * cell + 2, y = oy + (r.y - minY) * cell + 2;
    ctx.fillStyle = r === currentRoom ? '#d6bd82' : r.cleared ? 'rgba(190,166,119,.62)' : 'rgba(171,145,106,.35)';
    if (r.type === 'boss') ctx.fillStyle = r === currentRoom ? '#d77765' : 'rgba(180,75,65,.66)';
    if (r.type === 'treasure') ctx.fillStyle = '#d7b85c';
    ctx.fillRect(x, y, cell - 4, cell - 4);
    ctx.fillStyle = '#2c2118';
    for (const [dir, dx, dy] of [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]]) {
      if (r.doors[dir]) ctx.fillRect(x + cell * .42 + dx * cell * .4, y + cell * .42 + dy * cell * .4, cell * .16, cell * .16);
    }
    if (r === currentRoom) {
      ctx.fillStyle = '#fff2ca'; ctx.beginPath(); ctx.arc(x + (cell - 4) / 2, y + (cell - 4) / 2, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function dropPickup(type, x, z) {
  const mesh = models.createPickup(type); mesh.position.set(x, 0, z); floorGroup.add(mesh);
  pickups.push({ mesh, type, x, z });
}
function spawnRoom(room) {
  currentRoom = room; currentRoom.visited = currentRoom.discovered = true;
  roomCount = dungeon.stats().visited;
  clearRoom();
  makeRoomShell(room, dungeon.theme);
  pedestal = null; trapdoor = null;
  if (playerMesh) { floorGroup.add(playerMesh); playerMesh.position.set(player.x, 0, player.z); }
  const seeded = rand(room.seed + floorIndex * 191);
  if (room.type === 'normal' && !room.cleared) {
    const n = 2 + Math.floor(seeded() * 3);
    for (let i = 0; i < n; i++) spawnEnemy(dungeon.theme.enemyPool[Math.floor(seeded() * dungeon.theme.enemyPool.length)], false, seeded);
  } else if (room.type === 'boss' && !room.cleared) {
    spawnEnemy('boss', true, seeded);
    audio.bossRoar();
  } else if (room.type === 'treasure') {
    const item = ITEM_POOL[Math.floor(seeded() * ITEM_POOL.length)];
    pedestal = { item, mesh: models.createPedestal(item) };
    pedestal.mesh.position.set(0, 0, 0); floorGroup.add(pedestal.mesh);
  }
  if (room.type === 'boss' && room.cleared) {
    trapdoor = { mesh: models.createTrapdoor(true), open: true };
    trapdoor.mesh.position.set(0, 0, 0); floorGroup.add(trapdoor.mesh);
  }
  if (room.type !== 'start') runRooms++;
  showBanner(roomTitle(room), `FLOOR ${floorIndex + 1}  ·  ROOM ${String(roomCount).padStart(2, '0')}`);
  updateHud(); drawMap();
}
function spawnEnemy(type, boss = false, random = Math.random) {
  const theme = dungeon.theme;
  const visualTheme = { ...theme, bossColor: theme.boss.color, bossGlow: theme.boss.glow };
  const mesh = models.createEnemy(type, visualTheme, Math.floor(random() * 3));
  let x = 0, z = 0;
  for (let tries = 0; tries < 30; tries++) {
    x = (random() - .5) * 13; z = (random() - .5) * 10;
    const nearDoor = (Math.abs(x) > 7.3 && Math.abs(z) < 2) || (Math.abs(z) > 5.3 && Math.abs(x) < 2);
    if (Math.hypot(x - player.x, z - player.z) > 4 && !nearDoor && !props.some(p => Math.hypot(x - p.x, z - p.z) < 1.2)) break;
  }
  if (boss) { x = 0; z = -2; }
  mesh.position.set(x, 0, z); floorGroup.add(mesh);
  const maxHp = boss ? theme.boss.hp : type === 'fly' ? 2 : type === 'spitter' ? 4 : 5;
  enemyList.push({ mesh, type, boss, x, z, hp: maxHp, maxHp, contact: boss ? theme.boss.contact : 1, shoot: 1 + random() * 1.5, hurt: 0, phase: random() * 6.28, speed: boss ? theme.boss.speed : mesh.userData.speed || 2 });
}
function startFloor(index) {
  floorTransitioning = false;
  floorIndex = index; dungeon.generateFloor(index);
  player.x = 0; player.z = 4.5;
  spawnRoom(dungeon.start); updateHud(); drawMap();
}
function startRun() {
  audio.init(); audio.startMusic();
  Object.assign(player, { hp: 6, maxHp: 6, coins: 0, bombs: 2, damage: 1, fireRate: .31, speed: 5.2, invuln: 0, fireTimer: 0, moveX: 0, moveZ: 0, aimX: 0, aimZ: 1 });
  runTime = 0; runRooms = 0; deathCount = 0;
  playerMesh = models.createPlayer();
  setState('playing'); startFloor(0); audio.ui();
}
function showToast(message) {
  ui['item-toast-name'].textContent = message;
  ui['item-toast-desc'].textContent = '';
  ui['item-toast'].classList.add('show'); toastTimer = 1.5;
}
function clearEnemies() {
  if (currentRoom.cleared) return;
  currentRoom.cleared = true;
  audio.clear(); showToast(currentRoom.type === 'boss' ? 'THE BOSS IS SILENT' : 'ROOM CLEARED');
  if (currentRoom.type === 'boss') {
    trapdoor = { mesh: models.createTrapdoor(true), open: true };
    trapdoor.mesh.position.set(0, 0, 0); floorGroup.add(trapdoor.mesh);
    audio.item();
  } else if (currentRoom.type === 'normal') {
    const r = Math.random();
    if (r < .55) dropPickup(r < .22 ? 'heart' : 'coin', (Math.random() - .5) * 4, (Math.random() - .5) * 3);
    if (r > .88) dropPickup('bomb', 1, 0);
  }
  updateHud(); drawMap();
}
function damageEnemy(enemy, amount) {
  if (enemy.hp <= 0) return;
  enemy.hp -= amount; enemy.hurt = .12;
  enemy.mesh.traverse(o => { if (o.isMesh && o.material?.emissive) o.material.emissive.setHex(0x772222); });
  if (enemy.hp <= 0) {
    floorGroup.remove(enemy.mesh);
    enemyList = enemyList.filter(e => e !== enemy);
    audio.enemyDie();
    if (enemy.boss) dropPickup('heart', 0, 2.5);
    else if (Math.random() < .18) dropPickup(Math.random() < .65 ? 'coin' : 'heart', enemy.x, enemy.z);
    if (!enemyList.length) clearEnemies();
  } else { audio.hit(); }
}

function fireTear() {
  const length = Math.hypot(player.aimX, player.aimZ) || 1;
  const dx = player.aimX / length, dz = player.aimZ / length;
  const mesh = models.createTear();
  const x = player.x + dx * 0.48, z = player.z + dz * 0.48;
  mesh.position.set(x, 0.68, z); floorGroup.add(mesh);
  tears.push({ mesh, x, z, vx: dx * 10, vz: dz * 10, life: 1.65, damage: player.damage });
  playerMesh.rotation.y = Math.atan2(dx, dz);
  audio.shoot();
}
function placeBomb() {
  if (gameState !== 'playing' || player.bombs <= 0 || bombCooldown > 0) return;
  player.bombs--; bombCooldown = 0.35;
  const mesh = models.createBombMesh();
  mesh.position.set(player.x, 0, player.z); floorGroup.add(mesh);
  bombs.push({ mesh, x: player.x, z: player.z, fuse: 1.35, exploded: false, radius: 4.1 });
  audio.bombPlace(); updateHud();
}
function hurtPlayer(amount = 1) {
  if (player.invuln > 0 || gameState !== 'playing') return;
  player.hp = Math.max(0, player.hp - amount); player.invuln = 1.15;
  hurtTimer = 0.24; ui['hurt-flash'].classList.add('show');
  audio.hurt(); updateHud();
  if (!player.hp) { audio.gameOver(); setState('dead'); }
}
function beginNextFloor() {
  if (floorTransitioning) return;
  if (floorIndex >= THEMES.length - 1) {
    floorTransitioning = true;
    audio.victory(); setState('won'); return;
  }
  floorTransitioning = true;
  floorIndex++;
  ui.fade.classList.add('show');
  window.setTimeout(() => {
    if (gameState !== 'playing') return;
    startFloor(floorIndex); ui.fade.classList.remove('show'); audio.door();
  }, 500);
}
function enterDoor(dir) {
  if (!currentRoom?.doors[dir]) return false;
  if (!currentRoom.cleared) return false;
  const d = DIRS[dir], next = dungeon.roomAt(currentRoom.x + d.dx, currentRoom.y + d.dy);
  if (!next) return false;
  audio.door();
  if (dir === 'N') player.z = HALF_D - 1.15;
  if (dir === 'S') player.z = -HALF_D + 1.15;
  if (dir === 'E') player.x = -HALF_W + 1.15;
  if (dir === 'W') player.x = HALF_W - 1.15;
  spawnRoom(next);
  return true;
}
function tryDoorTransition() {
  const inVerticalDoorway = Math.abs(player.x) < 1.15;
  const inHorizontalDoorway = Math.abs(player.z) < 1.15;
  if (inVerticalDoorway && player.z < -HALF_D + 0.5 && currentRoom.doors.N) return enterDoor('N');
  if (inVerticalDoorway && player.z > HALF_D - 0.5 && currentRoom.doors.S) return enterDoor('S');
  if (inHorizontalDoorway && player.x > HALF_W - 0.5 && currentRoom.doors.E) return enterDoor('E');
  if (inHorizontalDoorway && player.x < -HALF_W + 0.5 && currentRoom.doors.W) return enterDoor('W');
  return false;
}
function setAimFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(worldRay, pointerAim);
  if (hit) {
    const dx = pointerAim.x - player.x, dz = pointerAim.z - player.z;
    if (Math.hypot(dx, dz) > 0.15) { player.aimX = dx; player.aimZ = dz; }
  }
}
function collideAt(x, z, radius = 0.3) {
  return props.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + radius);
}
function updatePlayer(dt) {
  let mx = 0, mz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx++;
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz++;
  if (touch.move) { mx = touch.move.x; mz = touch.move.y; }
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  player.moveX = mx; player.moveZ = mz;
  if (touch.aim && Math.hypot(touch.aim.x, touch.aim.y) > 0.18) {
    player.aimX = touch.aim.x; player.aimZ = touch.aim.y;
  }
  const speed = player.speed * dt;
  const nx = player.x + mx * speed, nz = player.z + mz * speed;
  const doorwayHalfWidth = 1.15;
  const openWest = currentRoom.doors.W && Math.abs(player.z) < doorwayHalfWidth;
  const openEast = currentRoom.doors.E && Math.abs(player.z) < doorwayHalfWidth;
  const minX = openWest ? -HALF_W - 1 : -HALF_W + 0.7;
  const maxX = openEast ? HALF_W + 1 : HALF_W - 0.7;
  if (!collideAt(nx, player.z)) player.x = clamp(nx, minX, maxX);
  const openNorth = currentRoom.doors.N && Math.abs(player.x) < doorwayHalfWidth;
  const openSouth = currentRoom.doors.S && Math.abs(player.x) < doorwayHalfWidth;
  const minZ = openNorth ? -HALF_D - 1 : -HALF_D + 0.7;
  const maxZ = openSouth ? HALF_D + 1 : HALF_D - 0.7;
  if (!collideAt(player.x, nz)) player.z = clamp(nz, minZ, maxZ);
  if (mx || mz) {
    playerMesh.userData.legs?.forEach((leg, i) => { leg.rotation.x = Math.sin(runTime * 12 + i * Math.PI) * 0.42; });
    stepTimer -= dt;
    if (stepTimer <= 0) { audio.step(); stepTimer = 0.34; }
  } else playerMesh.userData.legs?.forEach(leg => { leg.rotation.x *= 0.75; });
  playerMesh.position.set(player.x, player.invuln > 0 && Math.floor(runTime * 16) % 2 ? 0.14 : 0, player.z);
  if (mouseDown || touch.aim) {
    player.fireTimer -= dt;
    if (player.fireTimer <= 0) { fireTear(); player.fireTimer = player.fireRate; }
  }
  if (tryDoorTransition()) return;
  if (currentRoom.type === 'boss' && currentRoom.cleared && trapdoor && Math.hypot(player.x, player.z) < 1.05) beginNextFloor();
  if (pedestal && Math.hypot(player.x - pedestal.mesh.position.x, player.z - pedestal.mesh.position.z) < 1.25) {
    pedestal.item.apply(); announceItem(pedestal.item); floorGroup.remove(pedestal.mesh); pedestal = null;
    audio.item(); updateHud();
  }
  for (const p of [...pickups]) {
    if (Math.hypot(player.x - p.x, player.z - p.z) > 0.8) continue;
    if (p.type === 'coin') { player.coins++; audio.coin(); }
    if (p.type === 'bomb') { player.bombs++; audio.coin(); }
    if (p.type === 'heart' || p.type === 'soul') {
      if (player.hp >= player.maxHp) continue;
      player.hp = Math.min(player.maxHp, player.hp + (p.type === 'soul' ? 2 : 2)); audio.heart();
    }
    floorGroup.remove(p.mesh); pickups = pickups.filter(q => q !== p); updateHud();
  }
}
function updateEnemies(dt) {
  for (const e of [...enemyList]) {
    e.phase += dt; e.hurt = Math.max(0, e.hurt - dt);
    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz) || 1;
    let vx = 0, vz = 0;
    if (e.type === 'fly') {
      const target = dist > 2.8 ? 1 : -0.5;
      vx = dx / dist * e.speed * target; vz = dz / dist * e.speed * target;
      e.mesh.position.y = 0.18 + Math.sin(e.phase * 7) * 0.18;
    } else if (e.type === 'spitter' && dist > 4.5) {
      vx = dx / dist * e.speed * 0.55; vz = dz / dist * e.speed * 0.55;
    } else if (e.type !== 'spitter' || dist < 3.2) {
      vx = dx / dist * e.speed; vz = dz / dist * e.speed;
    }
    if (e.boss) { vx += Math.sin(e.phase * 1.3) * 0.42; e.mesh.rotation.y = Math.atan2(dx, dz); }
    const ex = e.x + vx * dt, ez = e.z + vz * dt;
    if (!collideAt(ex, e.z, e.boss ? 1 : 0.35)) e.x = clamp(ex, -8.7, 8.7);
    if (!collideAt(e.x, ez, e.boss ? 1 : 0.35)) e.z = clamp(ez, -6.8, 6.8);
    e.mesh.position.x = e.x; e.mesh.position.z = e.z;
    if (!e.boss) e.mesh.rotation.y = Math.atan2(dx, dz);
    const body = e.mesh.userData.body;
    if (body && !e.boss) body.position.y = Math.sin(e.phase * 5) * 0.035;
    if (dist < (e.boss ? 1.75 : 0.72)) hurtPlayer(e.contact);
    if ((e.type === 'spitter' || e.boss) && dist < 9) {
      e.shoot -= dt;
      if (e.shoot <= 0) {
        const shot = models.createEnemyShot(e.boss ? THEMES[floorIndex].boss.glow : 0xff664d);
        shot.position.set(e.x, e.boss ? 1.05 : 0.55, e.z); floorGroup.add(shot);
        const speed = e.boss ? 4.2 : 3.6;
        enemyShots.push({ mesh: shot, x: e.x, z: e.z, vx: dx / dist * speed, vz: dz / dist * speed, life: 3.2 });
        e.shoot = e.boss ? 1.05 : 2.1 + Math.random() * 0.8;
      }
    }
  }
}
function updateProjectiles(dt) {
  for (const t of [...tears]) {
    t.x += t.vx * dt; t.z += t.vz * dt; t.life -= dt;
    t.mesh.position.set(t.x, 0.58, t.z); t.mesh.rotation.z += dt * 3;
    const target = enemyList.find(e => Math.hypot(t.x - e.x, t.z - e.z) < (e.boss ? 1.25 : e.type === 'fly' ? 0.55 : 0.72));
    if (target) { damageEnemy(target, t.damage); t.life = 0; }
    else if (collideAt(t.x, t.z, 0.12)) { audio.tearBlock(); t.life = 0; }
    if (Math.abs(t.x) > HALF_W || Math.abs(t.z) > HALF_D) t.life = 0;
    if (t.life <= 0) { floorGroup.remove(t.mesh); tears = tears.filter(q => q !== t); }
  }
  for (const s of [...enemyShots]) {
    s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
    s.mesh.position.set(s.x, 0.45, s.z);
    if (Math.hypot(s.x - player.x, s.z - player.z) < 0.48) { hurtPlayer(); s.life = 0; }
    if (s.life <= 0 || Math.abs(s.x) > HALF_W || Math.abs(s.z) > HALF_D) { floorGroup.remove(s.mesh); enemyShots = enemyShots.filter(q => q !== s); }
  }
}
function updateBombs(dt) {
  for (const b of [...bombs]) {
    b.fuse -= dt;
    b.mesh.userData.spark.material.opacity = 0.55 + Math.sin(runTime * 25) * 0.4;
    if (b.fuse > 0) continue;
    audio.explosion();
    const wave = models.createShockwave(0xffb36b); wave.position.set(b.x, 0.08, b.z); floorGroup.add(wave);
    effects.push(wave);
    for (const e of [...enemyList]) if (Math.hypot(e.x - b.x, e.z - b.z) < b.radius) damageEnemy(e, e.boss ? 24 : 12);
    if (Math.hypot(player.x - b.x, player.z - b.z) < b.radius) hurtPlayer();
    for (const p of [...props]) if (Math.hypot(p.x - b.x, p.z - b.z) < b.radius) {
      floorGroup.remove(p.mesh); props = props.filter(q => q !== p);
      if (Math.random() < 0.45) dropPickup(Math.random() < 0.7 ? 'coin' : 'heart', p.x, p.z);
    }
    floorGroup.remove(b.mesh); bombs = bombs.filter(q => q !== b);
  }
}
function updateEffects(dt) {
  for (const effect of [...effects]) {
    const data = effect.userData; data.life -= dt;
    effect.scale.setScalar(1 + (data.max - data.life) * data.grow);
    effect.material.opacity = Math.max(0, data.life / data.max) * 0.65;
    if (data.life <= 0) { floorGroup.remove(effect); effects = effects.filter(e => e !== effect); }
  }
  for (const p of pickups) {
    const d = p.mesh.userData;
    p.mesh.rotation.y += dt * (d.spin || 1); p.mesh.position.y = Math.sin(runTime * 3 + p.x) * (d.bob || 0.04);
  }
  for (const prop of props) {
    if (prop.mesh.userData.flame) prop.mesh.userData.flame.material.opacity = 0.8 + Math.sin(runTime * 9 + prop.x) * 0.15;
  }
}
function update(dt) {
  if (gameState !== 'playing') return;
  runTime += dt; player.invuln = Math.max(0, player.invuln - dt); bombCooldown = Math.max(0, bombCooldown - dt);
  updatePlayer(dt);
  if (gameState !== 'playing') return;
  updateEnemies(dt); updateProjectiles(dt); updateBombs(dt); updateEffects(dt);
  bannerTimer = Math.max(0, bannerTimer - dt); toastTimer = Math.max(0, toastTimer - dt);
  if (hurtTimer > 0 && (hurtTimer -= dt) <= 0) ui['hurt-flash'].classList.remove('show');
  if (Math.floor(runTime) !== Math.floor(runTime - dt)) updateHud();
}
function resize() {
  const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  camera.position.set(player.x, 19, player.z + 20); camera.lookAt(player.x, 0, player.z);
}
function animate(time) {
  requestAnimationFrame(animate);
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
  lastTime = time;
  update(dt);
  camera.position.lerp(new THREE.Vector3(player.x, 19, player.z + 20), 0.08);
  cameraTarget.set(player.x, 0, player.z); camera.lookAt(cameraTarget);
  renderer.render(scene, camera);
}
function bindStick(id, kind) {
  const zone = $(id), knob = zone.querySelector('.stick-knob');
  let activeId = null, center = null;
  const move = event => {
    if (activeId !== event.pointerId) return;
    const dx = event.clientX - center.x, dy = event.clientY - center.y, max = 38;
    const len = Math.hypot(dx, dy), scale = len > max ? max / len : 1;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    const value = { x: clamp(dx / max, -1, 1), y: clamp(dy / max, -1, 1) };
    if (kind === 'move') touch.move = value;
    else { touch.aim = { x: value.x, y: value.y }; if (len > 8) mouseDown = true; }
  };
  const end = event => {
    if (activeId !== event.pointerId) return;
    activeId = null; knob.style.transform = ''; if (kind === 'move') touch.move = null;
    else { touch.aim = null; mouseDown = false; }
  };
  zone.addEventListener('pointerdown', event => {
    event.preventDefault(); activeId = event.pointerId; zone.setPointerCapture(activeId);
    const r = zone.querySelector('.stick-ring').getBoundingClientRect(); center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    move(event);
  });
  zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
function togglePause() { if (gameState === 'playing') setState('paused'); else if (gameState === 'paused') setState('playing'); }
function setSoundLabels() {
  for (const id of ['sound-toggle', 'sound-toggle-2']) $(id).textContent = `SOUND: ${audio.muted ? 'OFF' : 'ON'}`;
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if ((event.code === 'Enter' || event.code === 'Space') && gameState === 'title') startRun();
  else if (event.code === 'KeyR' && (gameState === 'dead' || gameState === 'won')) { setState('title'); startRun(); }
  else if (event.code === 'Escape' || event.code === 'KeyP') togglePause();
  else if (event.code === 'KeyE' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') placeBomb();
});
window.addEventListener('keyup', event => keys.delete(event.code));
canvas.addEventListener('pointermove', event => { if (!touchMode && gameState === 'playing') setAimFromPointer(event); });
canvas.addEventListener('pointerdown', event => {
  if (event.button === 0 && gameState === 'playing' && !touchMode) { mouseDown = true; setAimFromPointer(event); canvas.setPointerCapture(event.pointerId); }
});
window.addEventListener('pointerup', event => { if (event.button === 0) mouseDown = false; });
$('start-btn').addEventListener('click', startRun); $('again-btn').addEventListener('click', () => { setState('title'); startRun(); });
$('pause-btn').addEventListener('click', togglePause); $('pause-touch').addEventListener('click', togglePause);
$('resume-btn').addEventListener('click', togglePause); $('restart-btn').addEventListener('click', () => { setState('title'); startRun(); });
$('bomb-btn').addEventListener('pointerdown', event => { event.preventDefault(); placeBomb(); });
for (const id of ['sound-toggle', 'sound-toggle-2']) $(id).addEventListener('click', () => { audio.setMuted(!audio.muted); setSoundLabels(); });
$('fullscreen-btn').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
window.addEventListener('contextmenu', event => event.preventDefault());
touchMode = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (touchMode) ui.hint.classList.add('hidden');
bindStick('move-stick', 'move'); bindStick('aim-stick', 'aim');
resize(); updateHud(); setSoundLabels();
requestAnimationFrame(animate);
window.setTimeout(() => ui.loading.classList.add('hidden'), 500);
