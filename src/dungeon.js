export const DIRS = {
  N: { dx: 0, dy: -1, opposite: 'S', angle: Math.PI },
  S: { dx: 0, dy: 1, opposite: 'N', angle: 0 },
  E: { dx: 1, dy: 0, opposite: 'W', angle: Math.PI / 2 },
  W: { dx: -1, dy: 0, opposite: 'E', angle: -Math.PI / 2 }
};
export const DIR_NAMES = ['N', 'E', 'S', 'W'];

export const THEMES = [
  {
    id: 0,
    name: 'THE CELLAR',
    numeral: 'I',
    seed: 116,
    floorBase: '#1d1611',
    floorTile: '#4b3b2c',
    wallBase: '#120d0a',
    wallTile: '#413329',
    stain: 'rgba(18,9,4,.35)',
    moss: 'rgba(49,57,31,.16)',
    fog: 0x0b0806,
    fogDensity: 0.028,
    ambient: 0x8f806b,
    ambientIntensity: 0.62,
    directional: 0xffd0a0,
    directionalIntensity: 1.55,
    torch: 0xff9c48,
    torchIntensity: 26,
    rockColor: 0x5a5045,
    accent: '#c9a45c',
    enemyPool: ['gurgle', 'gurgle', 'fly', 'spitter'],
    boss: {
      name: 'THE MAW',
      color: 0xb98778,
      glow: 0xff5a34,
      hp: 180,
      contact: 2,
      speed: 1.15
    },
    bossName: 'THE MAW',
    musicTone: 'low'
  },
  {
    id: 1,
    name: 'THE DEPTHS',
    numeral: 'II',
    seed: 709,
    floorBase: '#121a1a',
    floorTile: '#35423f',
    wallBase: '#0a1212',
    wallTile: '#2b3a39',
    stain: 'rgba(4,18,18,.4)',
    moss: 'rgba(30,70,63,.22)',
    fog: 0x050c0d,
    fogDensity: 0.034,
    ambient: 0x7e9e9d,
    ambientIntensity: 0.55,
    directional: 0xa9dde0,
    directionalIntensity: 1.25,
    torch: 0x63d5cb,
    torchIntensity: 24,
    rockColor: 0x45554f,
    accent: '#75cfc6',
    enemyPool: ['gurgle', 'fly', 'spitter', 'spitter'],
    boss: {
      name: 'THE DROWNED CHOIR',
      color: 0x748e96,
      glow: 0x5fe8e0,
      hp: 245,
      contact: 2,
      speed: 1.35
    },
    bossName: 'THE DROWNED CHOIR',
    musicTone: 'mid'
  },
  {
    id: 2,
    name: 'THE WOMB',
    numeral: 'III',
    seed: 2210,
    floorBase: '#240d10',
    floorTile: '#59272b',
    wallBase: '#160608',
    wallTile: '#4a1c20',
    stain: 'rgba(38,3,7,.5)',
    moss: 'rgba(96,20,26,.2)',
    fog: 0x0e0304,
    fogDensity: 0.04,
    ambient: 0xa06f6a,
    ambientIntensity: 0.52,
    directional: 0xff9a8c,
    directionalIntensity: 1.15,
    torch: 0xff4b45,
    torchIntensity: 22,
    rockColor: 0x6a3e3b,
    accent: '#dc6a61',
    enemyPool: ['fly', 'spitter', 'spitter', 'gurgle'],
    boss: {
      name: 'MOTHER',
      color: 0xa85c5c,
      glow: 0xff3535,
      hp: 320,
      contact: 2,
      speed: 1.5
    },
    bossName: 'MOTHER',
    musicTone: 'high'
  }
];

const key = (x, y) => `${x},${y}`;

export class Dungeon {
  constructor(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.floorIndex = 0;
    this.rooms = new Map();
    this.start = null;
  }

  rng(offset = 0) {
    let a = (this.seed + this.floorIndex * 7717 + offset) >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  get theme() { return THEMES[this.floorIndex]; }

  generateFloor(floorIndex) {
    this.floorIndex = floorIndex;
    this.rooms = new Map();
    const rand = this.rng(3);
    const target = 8 + floorIndex;
    const addRoom = (x, y, type = 'normal') => {
      const r = {
        x, y, type, seed: Math.floor(rand() * 100000),
        visited: false, cleared: type === 'start',
        doors: { N: false, E: false, S: false, W: false },
        discovered: false,
        entered: false
      };
      this.rooms.set(key(x, y), r);
      return r;
    };
    const start = addRoom(0, 0, 'start');
    this.start = start;
    let attempts = 0;
    while (this.rooms.size < target && attempts < 600) {
      attempts++;
      const list = [...this.rooms.values()].filter(r => r.type !== 'boss' && r.type !== 'treasure');
      if (!list.length) break;
      const from = list[Math.floor(rand() * list.length)];
      const dirName = DIR_NAMES[Math.floor(rand() * 4)];
      const d = DIRS[dirName];
      const nx = from.x + d.dx, ny = from.y + d.dy;
      if (Math.abs(nx) > 5 || Math.abs(ny) > 5) continue;
      if (this.rooms.has(key(nx, ny))) continue;
      addRoom(nx, ny);
    }

    // A couple of loops make the map less like a pure corridor.
    const all = [...this.rooms.values()];
    for (let i = 0; i < 2; i++) {
      const a = all[Math.floor(rand() * all.length)];
      const dirName = DIR_NAMES[Math.floor(rand() * 4)];
      const b = this.rooms.get(key(a.x + DIRS[dirName].dx, a.y + DIRS[dirName].dy));
      if (b && a.type !== 'start' && b.type !== 'start' && (a.type === 'normal' || b.type === 'normal')) {
        // connections are derived from adjacency, so this already creates a loop
      }
    }

    const dist = this.bfs(start);
    let bossRoom = null, bossDist = -1;
    for (const r of this.rooms.values()) {
      if (r === start) continue;
      const adjacent = DIR_NAMES.filter(dn => this.rooms.has(key(r.x + DIRS[dn].dx, r.y + DIRS[dn].dy)));
      const dd = dist.get(key(r.x, r.y)) || 0;
      if (adjacent.length <= 1 && dd > bossDist) { bossDist = dd; bossRoom = r; }
    }
    if (!bossRoom) bossRoom = all[all.length - 1];
    bossRoom.type = 'boss';
    bossRoom.cleared = false;

    let treasure = null, treasureDist = -1;
    for (const r of this.rooms.values()) {
      if (r === start || r === bossRoom) continue;
      const adjacent = DIR_NAMES.filter(dn => this.rooms.has(key(r.x + DIRS[dn].dx, r.y + DIRS[dn].dy)));
      const dd = dist.get(key(r.x, r.y)) || 0;
      if (adjacent.length <= 1 && dd > treasureDist) { treasureDist = dd; treasure = r; }
    }
    if (!treasure) treasure = all.find(r => r !== start && r !== bossRoom);
    if (treasure) {
      treasure.type = 'treasure';
      treasure.cleared = true;
    }

    // Derive doors from adjacency.
    for (const r of this.rooms.values()) {
      for (const dn of DIR_NAMES) {
        const d = DIRS[dn];
        if (this.rooms.has(key(r.x + d.dx, r.y + d.dy))) r.doors[dn] = true;
      }
    }

    // Entrance room gets a warm safe-room feel; everything is pre-lit by theme.
    start.cleared = true;
    start.entered = true;
    start.visited = true;
    start.discovered = true;
    return start;
  }

  bfs(from) {
    const dist = new Map([[key(from.x, from.y), 0]]);
    const queue = [from];
    while (queue.length) {
      const r = queue.shift();
      const d0 = dist.get(key(r.x, r.y));
      for (const dn of DIR_NAMES) {
        const d = DIRS[dn];
        const n = this.rooms.get(key(r.x + d.dx, r.y + d.dy));
        if (n && !dist.has(key(n.x, n.y))) {
          dist.set(key(n.x, n.y), d0 + 1);
          queue.push(n);
        }
      }
    }
    return dist;
  }

  roomAt(x, y) { return this.rooms.get(key(x, y)); }

  getRoomWorldPos(r) { return { x: r.x, y: r.y }; }

  stats() {
    return {
      total: this.rooms.size,
      visited: [...this.rooms.values()].filter(r => r.visited).length,
      cleared: [...this.rooms.values()].filter(r => r.cleared).length
    };
  }

  discoveredMap() {
    return [...this.rooms.values()];
  }
}
