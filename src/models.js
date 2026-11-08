import * as THREE from 'three';
import { makeSoftShadowTexture } from './textures.js';

const G = (geo, mat) => new THREE.Mesh(geo, mat);

export class Models {
  constructor(textures) {
    this.tex = textures;
    this.shadowTex = makeSoftShadowTexture();
    this.mat = {
      skin: new THREE.MeshStandardMaterial({ color: 0xf0d4b1, roughness: 0.82, flatShading: true }),
      skinDark: new THREE.MeshStandardMaterial({ color: 0xcba98a, roughness: 0.9, flatShading: true }),
      black: new THREE.MeshStandardMaterial({ color: 0x080606, roughness: 1 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.7 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc9a44f, roughness: 0.36, metalness: 0.7 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x57504a, roughness: 0.96, flatShading: true }),
      stoneDark: new THREE.MeshStandardMaterial({ color: 0x2f2b28, roughness: 1, flatShading: true }),
      blood: new THREE.MeshStandardMaterial({ color: 0x6e1113, roughness: 0.55, flatShading: true }),
      tear: new THREE.MeshBasicMaterial({ color: 0xcdfbff }),
      glowTear: new THREE.SpriteMaterial({
        map: textures.glowCyan, color: 0x8fe8ff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85
      }),
      glowWarm: new THREE.SpriteMaterial({
        map: textures.glowWarm, color: 0xffb45e, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75
      }),
      glowBlood: new THREE.SpriteMaterial({
        map: textures.glowRed, color: 0xff4a3c, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7
      })
    };
    this.sphere = new THREE.SphereGeometry(1, 16, 12);
    this.sphereLow = new THREE.SphereGeometry(1, 10, 8);
    this.cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
    this.box = new THREE.BoxGeometry(1, 1, 1);
  }

  shadow(scale = 0.8, opacity = 0.55) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.shadowTex, transparent: true, opacity,
        depthWrite: false, color: 0x000000
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(scale, scale, 1);
    m.position.y = 0.012;
    m.renderOrder = 1;
    return m;
  }

  createPlayer() {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    const shadow = this.shadow(1.35, 0.6);
    group.add(shadow);

    const skin = this.mat.skin.clone();
    const skinDark = this.mat.skinDark.clone();
    const black = this.mat.black;

    // legs
    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      const limb = G(this.box, skinDark);
      limb.scale.set(0.13, 0.23, 0.13);
      limb.position.y = -0.11;
      leg.add(limb);
      const foot = G(this.sphereLow, skin);
      foot.scale.set(0.11, 0.07, 0.16);
      foot.position.set(0, -0.23, 0.045);
      leg.add(foot);
      leg.position.set(side * 0.12, 0.32, 0);
      body.add(leg);
      legs.push(leg);
    }

    // torso
    const torso = G(this.sphereLow, skin);
    torso.scale.set(0.31, 0.36, 0.26);
    torso.position.y = 0.52;
    body.add(torso);

    // belly
    const belly = G(this.sphereLow, skin);
    belly.scale.set(0.2, 0.16, 0.15);
    belly.position.set(0, 0.44, 0.12);
    belly.material = skin;
    body.add(belly);

    // arms
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const limb = G(this.sphereLow, skin);
      limb.scale.set(0.1, 0.22, 0.1);
      limb.position.y = -0.1;
      arm.add(limb);
      const hand = G(this.sphereLow, skin);
      hand.scale.set(0.11, 0.1, 0.1);
      hand.position.y = -0.23;
      arm.add(hand);
      arm.position.set(side * 0.3, 0.66, 0.02);
      arm.rotation.z = side * 0.22;
      body.add(arm);
      arms.push(arm);
    }

    // head
    const head = new THREE.Group();
    head.position.y = 1.09;
    body.add(head);
    const skull = G(this.sphere, skin);
    skull.scale.set(0.5, 0.53, 0.47);
    head.add(skull);

    // ears
    for (const side of [-1, 1]) {
      const ear = G(this.sphereLow, skin);
      ear.scale.set(0.1, 0.14, 0.07);
      ear.position.set(side * 0.48, 0.0, -0.04);
      head.add(ear);
    }

    // eyes
    const eyes = [];
    for (const side of [-1, 1]) {
      const socket = G(this.sphereLow, black);
      socket.scale.set(0.115, 0.155, 0.07);
      socket.position.set(side * 0.17, 0.03, 0.435);
      head.add(socket);
      const glint = G(this.sphereLow, new THREE.MeshBasicMaterial({ color: 0xfaf6ee }));
      glint.scale.set(0.028, 0.035, 0.012);
      glint.position.set(side * 0.17 - 0.035, 0.08, 0.493);
      head.add(glint);
      eyes.push(socket);
    }

    // brows / tear streaks
    const streakMat = new THREE.MeshBasicMaterial({ color: 0xa9e2ea, transparent: true, opacity: 0.75 });
    for (const side of [-1, 1]) {
      const streak = G(this.box, streakMat);
      streak.scale.set(0.025, 0.14, 0.01);
      streak.position.set(side * 0.18, -0.1, 0.458);
      streak.rotation.z = side * -0.08;
      head.add(streak);
    }

    // mouth
    const mouth = G(this.sphereLow, black);
    mouth.scale.set(0.06, 0.025, 0.02);
    mouth.position.set(0, -0.16, 0.455);
    head.add(mouth);

    // tiny tear drop on cheek
    const tearDrop = G(this.sphereLow, new THREE.MeshBasicMaterial({ color: 0xaeeeff, transparent: true, opacity: 0.85 }));
    tearDrop.scale.set(0.035, 0.05, 0.03);
    tearDrop.position.set(-0.21, -0.16, 0.45);
    head.add(tearDrop);

    group.userData = { body, head, legs, arms, shadow, skull, eyes };
    return group;
  }

  createEnemy(type, theme, variant = 0) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const shadow = this.shadow(type === 'boss' ? 3.6 : type === 'fly' ? 0.55 : 0.9, 0.58);
    if (type === 'fly') shadow.position.y = 0.01;
    group.add(shadow);

    const colors = {
      gurgle: [0x7d8f5a, 0x8d6f56, 0x687c4d],
      fly: [0x5c4d45, 0x4d4853, 0x3c3a2f],
      spitter: [0x7d557b, 0x5f6b83, 0x865f4d]
    };
    const color = (colors[type] || colors.gurgle)[variant % 3];
    const flesh = new THREE.MeshStandardMaterial({ color, roughness: 0.72, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15110f, roughness: 0.9 });
    const wet = new THREE.MeshStandardMaterial({ color: 0x2a1a18, roughness: 0.25, metalness: 0.1 });
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xf2e7cf });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x0a0605 });
    const accent = new THREE.MeshStandardMaterial({
      color: type === 'spitter' ? 0xc5a44c : 0xa54832,
      roughness: 0.4, emissive: type === 'spitter' ? 0x3a2b05 : 0x1d0404
    });

    if (type === 'gurgle') {
      const torso = G(this.sphereLow, flesh);
      torso.scale.set(0.48, 0.44, 0.42);
      torso.position.y = 0.47;
      body.add(torso);
      // lumpy back
      for (let i = 0; i < 3; i++) {
        const lump = G(this.sphereLow, flesh);
        const a = (i / 3) * Math.PI * 2;
        lump.scale.set(0.17, 0.16, 0.14);
        lump.position.set(Math.cos(a) * 0.3, 0.68 + (i % 2) * 0.13, Math.sin(a) * 0.24);
        body.add(lump);
      }
      // eyes
      for (const side of [-1, 1]) {
        const eye = G(this.sphereLow, eyeWhite);
        eye.scale.set(0.1, 0.13, 0.06);
        eye.position.set(side * 0.17, 0.54, 0.37);
        body.add(eye);
        const p = G(this.sphereLow, pupil);
        p.scale.set(0.045, 0.06, 0.025);
        p.position.set(side * 0.17, 0.54, 0.42);
        body.add(p);
      }
      // mouth
      const mouth = G(this.sphereLow, wet);
      mouth.scale.set(0.19, 0.07, 0.03);
      mouth.position.set(0, 0.34, 0.39);
      body.add(mouth);
      // feet
      for (const side of [-1, 1]) {
        const foot = G(this.sphereLow, flesh);
        foot.scale.set(0.16, 0.07, 0.18);
        foot.position.set(side * 0.2, 0.08, 0.03);
        body.add(foot);
      }
      group.userData = { body, torso, speed: 2.0 + Math.random() * 0.3 };
    } else if (type === 'fly') {
      const torso = G(this.sphereLow, flesh);
      torso.scale.set(0.27, 0.25, 0.25);
      torso.position.y = 0.95;
      body.add(torso);
      for (const side of [-1, 1]) {
        const eye = G(this.sphereLow, eyeWhite);
        eye.scale.set(0.1, 0.12, 0.08);
        eye.position.set(side * 0.11, 0.99, 0.2);
        body.add(eye);
        const p = G(this.sphereLow, pupil);
        p.scale.set(0.045, 0.06, 0.03);
        p.position.set(side * 0.11, 0.99, 0.27);
        body.add(p);
      }
      const wings = [];
      for (const side of [-1, 1]) {
        const wingPivot = new THREE.Group();
        wingPivot.position.set(side * 0.15, 1.05, -0.05);
        const wing = G(new THREE.PlaneGeometry(0.55, 0.32), new THREE.MeshBasicMaterial({
          color: 0xd9d4c0, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false
        }));
        wing.rotation.x = -Math.PI / 2;
        wing.rotation.z = side * 0.25;
        wing.position.x = side * 0.26;
        wingPivot.add(wing);
        body.add(wingPivot);
        wings.push(wingPivot);
      }
      // little dangling legs
      for (let i = 0; i < 3; i++) {
        const leg = G(this.cyl, dark);
        leg.scale.set(0.012, 0.17, 0.012);
        leg.position.set((i - 1) * 0.08, 0.8, -0.03);
        leg.rotation.z = (i - 1) * 0.15;
        body.add(leg);
      }
      group.userData = { body, torso, wings, speed: 2.6 + Math.random() * 0.5 };
    } else if (type === 'spitter') {
      const torso = G(this.sphereLow, flesh);
      torso.scale.set(0.42, 0.5, 0.38);
      torso.position.y = 0.58;
      body.add(torso);
      // spikes
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const spike = G(new THREE.ConeGeometry(0.1, 0.35, 5), accent);
        spike.position.set(Math.cos(a) * 0.4, 0.62 + (i % 3) * 0.09, Math.sin(a) * 0.36);
        spike.rotation.z = -Math.cos(a) * 0.7;
        spike.rotation.x = Math.sin(a) * 0.7;
        body.add(spike);
      }
      // big single eye
      const eye = G(this.sphereLow, eyeWhite);
      eye.scale.set(0.19, 0.21, 0.1);
      eye.position.set(0, 0.68, 0.34);
      body.add(eye);
      const p = G(this.sphereLow, pupil);
      p.scale.set(0.08, 0.11, 0.04);
      p.position.set(0, 0.68, 0.43);
      body.add(p);
      const mouth = G(this.sphereLow, wet);
      mouth.scale.set(0.12, 0.13, 0.05);
      mouth.position.set(0, 0.39, 0.35);
      body.add(mouth);
      // feet
      for (const side of [-1, 1]) {
        const foot = G(this.sphereLow, flesh);
        foot.scale.set(0.14, 0.08, 0.16);
        foot.position.set(side * 0.18, 0.08, 0);
        body.add(foot);
      }
      group.userData = { body, torso, speed: 1.65 + Math.random() * 0.2 };
    } else if (type === 'boss') {
      const themeColor = new THREE.Color(theme.bossColor || 0xb98778);
      const bossFlesh = new THREE.MeshStandardMaterial({ color: themeColor, roughness: 0.62, flatShading: true });
      const bossDark = new THREE.MeshStandardMaterial({ color: 0x3a1214, roughness: 0.45 });
      const teeth = new THREE.MeshStandardMaterial({ color: 0xe6d9b0, roughness: 0.5 });
      const bossGlow = new THREE.MeshBasicMaterial({ color: theme.bossGlow || 0xff5538 });

      const head = new THREE.Group();
      head.position.y = 1.9;
      body.add(head);
      const skull = G(this.sphere, bossFlesh);
      skull.scale.set(1.42, 1.32, 1.28);
      head.add(skull);
      // eye sockets
      for (const side of [-1, 1]) {
        const socket = G(this.sphereLow, bossDark);
        socket.scale.set(0.32, 0.24, 0.15);
        socket.position.set(side * 0.5, 0.34, 1.12);
        head.add(socket);
        const glow = G(this.sphereLow, bossGlow);
        glow.scale.set(0.14, 0.12, 0.05);
        glow.position.set(side * 0.5, 0.34, 1.24);
        head.add(glow);
      }
      // giant mouth
      const mouth = G(this.sphereLow, bossDark);
      mouth.scale.set(0.62, 0.44, 0.12);
      mouth.position.set(0, -0.28, 1.15);
      head.add(mouth);
      // teeth ring
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tooth = G(new THREE.ConeGeometry(0.09, 0.24, 5), teeth);
        tooth.position.set(Math.cos(a) * 0.5, -0.28 + Math.sin(a) * 0.33, 1.25);
        tooth.rotation.z = -a + Math.PI / 2;
        head.add(tooth);
      }
      // crown horns
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const horn = G(new THREE.ConeGeometry(0.14, 0.65, 6), bossDark);
        horn.position.set(Math.cos(a) * 1.02, 1.12, Math.sin(a) * 0.8);
        horn.rotation.z = -Math.cos(a) * 0.5;
        horn.rotation.x = Math.sin(a) * 0.5;
        head.add(horn);
      }
      // floating hands
      const hands = [];
      for (const side of [-1, 1]) {
        const hand = new THREE.Group();
        const palm = G(this.sphereLow, bossFlesh);
        palm.scale.set(0.33, 0.25, 0.2);
        hand.add(palm);
        for (let f = 0; f < 3; f++) {
          const finger = G(this.cyl, bossDark);
          finger.scale.set(0.035, 0.35, 0.035);
          finger.position.set((f - 1) * 0.15, -0.32, 0.03);
          finger.rotation.z = (f - 1) * 0.16;
          hand.add(finger);
        }
        hand.position.set(side * 1.85, 1.7, 0.25);
        body.add(hand);
        hands.push(hand);
      }
      const light = new THREE.PointLight(theme.bossGlow || 0xff5538, 2.2, 7, 2);
      light.position.set(0, 2.1, 1.4);
      group.add(light);
      group.userData = { body, head, hands, speed: 1.35, bossFlesh };
    }
    return group;
  }

  createTear() {
    const group = new THREE.Group();
    const ball = G(new THREE.SphereGeometry(0.145, 10, 8), this.mat.tear);
    group.add(ball);
    const glow = new THREE.Sprite(this.mat.glowTear.clone());
    glow.scale.set(0.9, 0.9, 1);
    group.add(glow);
    // elongated highlight
    const shine = G(this.sphereLow, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.scale.set(0.035, 0.05, 0.035);
    shine.position.set(0.04, 0.04, 0.08);
    group.add(shine);
    return group;
  }

  createEnemyShot(color = 0xff664d) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color });
    const ball = G(new THREE.SphereGeometry(0.16, 10, 8), mat);
    group.add(ball);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.glowRed, color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8
    }));
    glow.scale.set(1.1, 1.1, 1);
    group.add(glow);
    return group;
  }

  createPickup(type) {
    const group = new THREE.Group();
    const inner = new THREE.Group();
    group.add(inner);
    const shadow = this.shadow(0.55, 0.4);
    group.add(shadow);

    if (type === 'coin') {
      const coin = G(new THREE.CylinderGeometry(0.18, 0.18, 0.055, 16), this.mat.gold.clone());
      coin.rotation.x = Math.PI / 2;
      coin.position.y = 0.35;
      inner.add(coin);
      const rim = G(new THREE.TorusGeometry(0.18, 0.022, 6, 16), new THREE.MeshStandardMaterial({
        color: 0xf4d276, metalness: 0.8, roughness: 0.25, emissive: 0x4a2b05
      }));
      rim.position.y = 0.35;
      inner.add(rim);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.tex.glowWarm, color: 0xffd36a, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
      }));
      glow.scale.set(1.4, 1.4, 1);
      glow.position.y = 0.35;
      inner.add(glow);
      group.userData = { spin: 2.2, bob: 0.06 };
    } else if (type === 'heart' || type === 'soul') {
      const h = this.makeHeartMesh(type === 'soul'
        ? new THREE.MeshStandardMaterial({ color: 0x6c9cff, emissive: 0x1b3c9e, emissiveIntensity: 0.8, roughness: 0.35, transparent: true, opacity: 0.92 })
        : new THREE.MeshStandardMaterial({ color: 0xd3323d, emissive: 0x5a0508, emissiveIntensity: 0.6, roughness: 0.35 }));
      h.scale.setScalar(0.6);
      h.position.y = 0.48;
      h.rotation.x = 0.2;
      inner.add(h);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: type === 'soul' ? this.tex.glowBlue : this.tex.glowRed,
        color: type === 'soul' ? 0x6c9cff : 0xff5555,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
      }));
      glow.scale.set(1.7, 1.7, 1);
      glow.position.y = 0.48;
      inner.add(glow);
      group.userData = { spin: 1.1, bob: 0.09 };
    } else if (type === 'bomb') {
      const ball = G(this.sphereLow, new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.4, metalness: 0.25 }));
      ball.scale.setScalar(0.25);
      ball.position.y = 0.3;
      inner.add(ball);
      const fuse = G(this.cyl, new THREE.MeshStandardMaterial({ color: 0xa88458, roughness: 1 }));
      fuse.scale.set(0.02, 0.18, 0.02);
      fuse.position.set(0.08, 0.55, 0);
      fuse.rotation.z = -0.3;
      inner.add(fuse);
      const spark = new THREE.Sprite(this.mat.glowWarm.clone());
      spark.scale.set(0.28, 0.28, 1);
      spark.position.set(0.1, 0.63, 0);
      inner.add(spark);
      group.userData = { spin: 0.7, bob: 0.04 };
    }
    return group;
  }

  makeHeartMesh(material) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.34);
    shape.bezierCurveTo(-0.1, 0.52, -0.42, 0.52, -0.44, 0.24);
    shape.bezierCurveTo(-0.46, -0.02, -0.2, -0.22, 0, -0.42);
    shape.bezierCurveTo(0.2, -0.22, 0.46, -0.02, 0.44, 0.24);
    shape.bezierCurveTo(0.42, 0.52, 0.1, 0.52, 0, 0.34);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 8 });
    geo.center();
    const mesh = G(geo, material);
    return mesh;
  }

  createPedestal(item) {
    const group = new THREE.Group();
    const base = G(this.cyl, this.mat.stoneDark);
    base.scale.set(0.55, 0.18, 0.55);
    base.position.y = 0.09;
    group.add(base);
    const stem = G(this.cyl, this.mat.stone);
    stem.scale.set(0.26, 0.62, 0.26);
    stem.position.y = 0.48;
    group.add(stem);
    const bowl = G(new THREE.CylinderGeometry(0.44, 0.28, 0.18, 12), this.mat.stone);
    bowl.position.y = 0.83;
    group.add(bowl);
    const rune = G(new THREE.RingGeometry(0.5, 0.56, 24), new THREE.MeshBasicMaterial({
      color: 0xd8b36b, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false
    }));
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.02;
    group.add(rune);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.glowWarm, color: 0xffd27a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5
    }));
    glow.scale.set(2.6, 2.6, 1);
    glow.position.y = 0.9;
    group.add(glow);
    const icon = this.createItemIcon(item.icon);
    icon.position.y = 1.35;
    icon.scale.setScalar(0.85);
    group.add(icon);
    const light = new THREE.PointLight(0xffc46a, 1.1, 4.5, 2);
    light.position.y = 1.4;
    group.add(light);
    group.userData = { icon, glow, light, rune };
    return group;
  }

  createItemIcon(kind) {
    const g = new THREE.Group();
    const gold = this.mat.gold.clone();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.glowWarm, color: 0xffe9a5, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35
    }));
    glow.scale.set(1.5, 1.5, 1);
    g.add(glow);
    if (kind === 'ring') {
      const ring = G(new THREE.TorusGeometry(0.22, 0.055, 8, 20), new THREE.MeshStandardMaterial({
        color: 0xe0c071, metalness: 0.8, roughness: 0.25, emissive: 0x2e1e05
      }));
      g.add(ring);
      const gem = G(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({
        color: 0x7be3ff, emissive: 0x1c7f9e, emissiveIntensity: 1.4, roughness: 0.2
      }));
      gem.position.set(0, 0.23, 0);
      g.add(gem);
    } else if (kind === 'hourglass') {
      const top = G(new THREE.ConeGeometry(0.2, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x9a7dd6, emissive: 0x29164f, roughness: 0.3 }));
      top.position.y = 0.14; top.rotation.x = Math.PI;
      g.add(top);
      const bot = top.clone(); bot.position.y = -0.14; bot.rotation.x = 0;
      g.add(bot);
      for (const y of [-0.31, 0.31]) {
        const cap = G(this.cyl, gold); cap.scale.set(0.23, 0.04, 0.23); cap.position.y = y; g.add(cap);
      }
    } else if (kind === 'feather') {
      const feather = G(new THREE.ConeGeometry(0.13, 0.62, 5), new THREE.MeshStandardMaterial({ color: 0xf0ead7, roughness: 0.6 }));
      feather.rotation.z = -0.5;
      g.add(feather);
      const shaft = G(this.cyl, new THREE.MeshStandardMaterial({ color: 0xc9b78d }));
      shaft.scale.set(0.018, 0.8, 0.018); shaft.rotation.z = -0.5; shaft.position.y = -0.05;
      g.add(shaft);
    } else if (kind === 'lens') {
      const ring = G(new THREE.TorusGeometry(0.21, 0.05, 8, 20), gold);
      g.add(ring);
      const glass = G(this.sphere, new THREE.MeshStandardMaterial({
        color: 0x7de2ff, emissive: 0x0d6c88, emissiveIntensity: 1, transparent: true, opacity: 0.55, roughness: 0.1
      }));
      glass.scale.set(0.2, 0.2, 0.09);
      g.add(glass);
    } else if (kind === 'blood') {
      const drop = G(this.sphere, new THREE.MeshStandardMaterial({
        color: 0xc01f2e, emissive: 0x65030a, emissiveIntensity: 1, roughness: 0.25
      }));
      drop.scale.set(0.2, 0.28, 0.2);
      drop.position.y = 0.08;
      g.add(drop);
      const tip = G(new THREE.ConeGeometry(0.19, 0.3, 8), drop.material);
      tip.position.y = 0.34;
      g.add(tip);
    } else {
      const clover = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const leaf = G(this.sphereLow, new THREE.MeshStandardMaterial({
          color: 0x6fa64e, emissive: 0x113106, emissiveIntensity: 0.7, roughness: 0.6
        }));
        leaf.scale.set(0.16, 0.2, 0.08);
        const a = (i / 3) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14 + 0.1, 0);
        clover.add(leaf);
      }
      const stem = G(this.cyl, new THREE.MeshStandardMaterial({ color: 0x41682e }));
      stem.scale.set(0.02, 0.3, 0.02); stem.position.y = -0.14; stem.rotation.z = 0.2;
      clover.add(stem);
      g.add(clover);
    }
    return g;
  }

  createBombMesh() {
    const group = new THREE.Group();
    const body = G(this.sphereLow, new THREE.MeshStandardMaterial({
      color: 0x151413, roughness: 0.35, metalness: 0.3
    }));
    body.scale.setScalar(0.3);
    body.position.y = 0.3;
    group.add(body);
    const fuse = G(this.cyl, new THREE.MeshStandardMaterial({ color: 0x9c7b53 }));
    fuse.scale.set(0.025, 0.22, 0.025);
    fuse.position.set(0.1, 0.63, 0);
    fuse.rotation.z = -0.34;
    group.add(fuse);
    const spark = new THREE.Sprite(this.mat.glowWarm.clone());
    spark.scale.set(0.38, 0.38, 1);
    spark.position.set(0.13, 0.75, 0);
    group.add(spark);
    const shadow = this.shadow(0.5, 0.45);
    group.add(shadow);
    group.userData = { body, spark };
    return group;
  }

  createRock(seed = 1, theme = {}) {
    const rand = (s => () => (s = Math.sin(s) * 10000, s - Math.floor(s)))(seed);
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: theme.rockColor || 0x554d45, roughness: 0.98, flatShading: true
    });
    const geo = new THREE.DodecahedronGeometry(0.62, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i,
        pos.getX(i) * (0.82 + rand() * 0.35),
        pos.getY(i) * (0.72 + rand() * 0.3),
        pos.getZ(i) * (0.82 + rand() * 0.35));
    }
    geo.computeVertexNormals();
    const rock = G(geo, mat);
    rock.position.y = 0.52;
    rock.rotation.y = rand() * 6;
    group.add(rock);
    const rock2 = G(new THREE.DodecahedronGeometry(0.32, 0), mat);
    rock2.position.set(0.38, 0.26, 0.24);
    rock2.rotation.set(rand(), rand(), rand());
    group.add(rock2);
    const shadow = this.shadow(1.4, 0.5);
    group.add(shadow);
    group.userData = { mesh: rock, radius: 0.62, type: 'rock' };
    return group;
  }

  createPot() {
    const group = new THREE.Group();
    const pts = [];
    const profile = [
      [0.0, 0.0], [0.18, 0.0], [0.28, 0.08], [0.33, 0.32], [0.3, 0.52],
      [0.21, 0.68], [0.18, 0.77], [0.24, 0.8], [0.22, 0.84]
    ];
    profile.forEach(p => pts.push(new THREE.Vector2(p[0], p[1])));
    const geo = new THREE.LatheGeometry(pts, 14);
    const clay = new THREE.MeshStandardMaterial({ color: 0x8d4a32, roughness: 0.78, flatShading: true });
    const pot = G(geo, clay);
    group.add(pot);
    const band = G(new THREE.TorusGeometry(0.29, 0.022, 5, 16), new THREE.MeshStandardMaterial({ color: 0xc19a67, roughness: 0.6 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.59;
    group.add(band);
    const shadow = this.shadow(0.75, 0.4);
    group.add(shadow);
    group.userData = { mesh: pot, radius: 0.33, type: 'pot' };
    return group;
  }

  createSpike() {
    const group = new THREE.Group();
    const base = G(new THREE.CylinderGeometry(0.4, 0.46, 0.09, 8), this.mat.stoneDark);
    base.position.y = 0.04;
    group.add(base);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const spike = G(new THREE.ConeGeometry(0.075, 0.45, 5), new THREE.MeshStandardMaterial({
        color: 0x8e8980, roughness: 0.36, metalness: 0.45
      }));
      spike.position.set(Math.cos(a) * 0.16, 0.3, Math.sin(a) * 0.16);
      group.add(spike);
    }
    group.userData = { radius: 0.45, type: 'spike' };
    return group;
  }

  createPillar(height = 2.6) {
    const group = new THREE.Group();
    const mat = this.mat.stone.clone();
    const base = G(new THREE.BoxGeometry(1.1, 0.3, 1.1), mat);
    base.position.y = 0.15;
    group.add(base);
    const shaft = G(new THREE.CylinderGeometry(0.34, 0.4, height, 10), mat);
    shaft.position.y = height / 2 + 0.27;
    group.add(shaft);
    const cap = G(new THREE.BoxGeometry(0.9, 0.24, 0.9), mat);
    cap.position.y = height + 0.38;
    group.add(cap);
    return group;
  }

  createCandle(scale = 1) {
    const group = new THREE.Group();
    const wax = G(new THREE.CylinderGeometry(0.08, 0.1, 0.34, 8), new THREE.MeshStandardMaterial({
      color: 0xd9cba9, roughness: 0.8
    }));
    wax.position.y = 0.17;
    wax.scale.setScalar(scale);
    group.add(wax);
    const flame = new THREE.Sprite(this.mat.glowWarm.clone());
    flame.scale.set(0.34 * scale, 0.44 * scale, 1);
    flame.position.y = 0.42 * scale;
    group.add(flame);
    const core = G(new THREE.ConeGeometry(0.035 * scale, 0.12 * scale, 5), new THREE.MeshBasicMaterial({ color: 0xffe6a1 }));
    core.position.y = 0.4 * scale;
    group.add(core);
    group.userData = { flame, core };
    return group;
  }

  createTrapdoor(open = false) {
    const group = new THREE.Group();
    const frame = G(new THREE.CylinderGeometry(1.05, 1.15, 0.2, 6), this.mat.stoneDark);
    frame.position.y = 0.06;
    group.add(frame);
    const hole = G(new THREE.CircleGeometry(0.94, 32), new THREE.MeshBasicMaterial({ color: 0x020202 }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.17;
    group.add(hole);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.glowPurple, color: 0x9d7bff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0
    }));
    glow.position.y = 0.4;
    glow.scale.set(3.2, 3.2, 1);
    group.add(glow);
    const lid = G(new THREE.CylinderGeometry(0.98, 0.98, 0.12, 6), this.mat.stone);
    lid.position.y = 0.22;
    group.add(lid);
    const ring = G(new THREE.TorusGeometry(0.65, 0.03, 5, 24), this.mat.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.29;
    group.add(ring);
    group.userData = { lid, glow, open, ring };
    return group;
  }

  createShockwave(color = 0x9ee8ff) {
    const geo = new THREE.RingGeometry(0.8, 1.0, 40);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.userData = { life: 0.5, max: 0.5, grow: 4 };
    return ring;
  }

  createSpikeTrapAttack() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 24), new THREE.MeshBasicMaterial({
      color: 0xff4f36, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false
    }));
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    group.userData = { ring };
    return group;
  }
}
