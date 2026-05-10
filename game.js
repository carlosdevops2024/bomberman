/* ═══════════════════════════════════════
   CORPOFFICE — game.js
   Escena Phaser + lógica de juego completa
═══════════════════════════════════════ */

import { SFX, ensureAudio } from './audio.js';

/* ─── Constantes de mapa ─── */
export const W    = 832;
export const H    = 576;
export const TILE = 64;
export const COLS = 13;
export const ROWS = 9;

/* ─── Estado global ─── */
export let gameScene = null;
export let lives     = 3;
export let level     = 1;

const powerCooldowns = { Q: 0, E: 0, R: 0, F: 0 };
const COOLDOWN       = { Q: 8000, E: 12000, R: 10000, F: 15000 };

/* ─── Arquetipos de jefes ─── */
export const BOSS_TYPES = {
  DIRECTOR: {
    key:        'DIRECTOR',
    names:      ['Dir. Pérez', 'Dir. Salinas', 'Dir. Fuentes'],
    color:      0x3d6b00,
    tieColor:   0xff0000,
    speed:      1.0,
    deathTitle: '📄 ¡ENVIADO AL ARCHIVO MUERTO!',
    deathSub:   'Sus KPIs llegaron a cero. Para siempre.',
  },
  VP: {
    key:        'VP',
    names:      ['VP Rodríguez', 'VP Herrera', 'VP Castillo'],
    color:      0x1a5c00,
    tieColor:   0xffd700,
    speed:      1.2,
    deathTitle: '📉 ¡LAS ACCIONES EN CAÍDA LIBRE!',
    deathSub:   'Beneficios corporativos: revocados.',
  },
  MANAGER: {
    key:        'MANAGER',
    names:      ['Mgr. Gómez', 'Mgr. López', 'Jefe Ruiz'],
    color:      0x4a6b1a,
    tieColor:   0x0055ff,
    speed:      0.9,
    deathTitle: '📋 ¡CARTA DE DESPIDO ENVIADA!',
    deathSub:   'Irónicamente, a sí mismo.',
  },
  CEO: {
    key:        'CEO',
    names:      ['CEO Blanco', 'CEO Montoya'],
    color:      0x2d4d00,
    tieColor:   0xffd700,
    speed:      1.4,
    deathTitle: '👑 ¡EL TRONO CORPORATIVO HA CAÍDO!',
    deathSub:   'El helicóptero privado no lo salvó.',
  },
};

/* ─── Mensajes aleatorios ─── */
const HIT_MSGS = [
  '😱 ¡Te atraparon en una reunión sin agenda! (-1 ☕)',
  '📧 ¡Te mandaron un correo con 47 destinatarios en CC! (-1 ☕)',
  '😰 ¡Te pidieron el informe para ayer! (-1 ☕)',
  '🤮 ¡Obligatorio el team building del viernes! (-1 ☕)',
];
const STATUS_MSGS = [
  '📊 Actualizando métricas de supervivencia...',
  '☕ Nivel de cafeína: crítico',
  '📋 Pendiente: no morir. Prioridad: ALTA',
];

/* ─── Helpers de UI ─── */
export function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function showStatus(msg, duration = 2800) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

export function showDeathCaption(title, sub, duration = 2200) {
  const el    = document.getElementById('death-caption');
  const main  = document.getElementById('caption-main');
  const subEl = document.getElementById('caption-sub');
  main.textContent  = title;
  subEl.textContent = sub;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

export function updateLivesHUD() {
  for (let i = 0; i < 3; i++) {
    const d      = document.getElementById('life-' + i);
    d.className  = 'life-dot' + (i < lives ? '' : ' lost');
    d.textContent = i < lives ? '☕' : '💀';
  }
}

export function updatePowerSlot(key, onCooldown) {
  const slot = document.getElementById('slot-' + key);
  if (onCooldown) {
    slot.classList.add('cooldown');
    slot.classList.remove('active');
  } else {
    slot.classList.remove('cooldown');
  }
}

export function activatePowerSlot(key) {
  const slot = document.getElementById('slot-' + key);
  slot.classList.add('active');
  setTimeout(() => slot.classList.remove('active'), 400);
}

/* ══════════════════════════════════════════════════
   ESCENA PRINCIPAL DE PHASER
══════════════════════════════════════════════════ */
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  /* ─── Texturas procedurales ─── */
  createTextures() {
    // Becario
    const pg = this.add.graphics();
    pg.fillStyle(0xffd700); pg.fillCircle(16, 11, 9);
    pg.fillStyle(0x1a0a00); pg.fillRect(9, 20, 14, 18);
    pg.fillStyle(0xffa040); pg.fillRect(6, 21, 7, 14);
    pg.fillStyle(0xffa040); pg.fillRect(19, 21, 7, 14);
    pg.fillStyle(0x8b4513); pg.fillRect(14, 8, 4, 7);
    pg.fillStyle(0xd2691e); pg.fillRect(10, 13, 12, 10);
    pg.generateTexture('player', 32, 42); pg.destroy();

    // Director zombie (base)
    const zg = this.add.graphics();
    zg.fillStyle(0x3d6b00); zg.fillCircle(20, 14, 13);
    zg.fillStyle(0x2a4800); zg.fillRect(10, 10, 5, 8); zg.fillRect(22, 8, 4, 6);
    zg.fillStyle(0x1a3300); zg.fillRect(9, 27, 22, 18);
    zg.fillStyle(0xff0000); zg.fillRect(18, 27, 4, 14);
    zg.fillStyle(0x3d6b00); zg.fillRect(4, 28, 8, 14); zg.fillRect(28, 28, 8, 14);
    zg.fillStyle(0x8b6914); zg.fillRect(22, 36, 14, 10);
    zg.fillStyle(0x5c4400); zg.fillRect(26, 34, 6, 4);
    zg.fillStyle(0xff0000); zg.fillCircle(15, 12, 3); zg.fillCircle(25, 12, 3);
    zg.fillStyle(0xffffff); zg.fillCircle(14, 11, 1); zg.fillCircle(24, 11, 1);
    zg.generateTexture('enemy', 40, 48); zg.destroy();

    // VP zombie — corbata dorada, monóculo, corona
    const vpg = this.add.graphics();
    vpg.fillStyle(0x1a5c00); vpg.fillCircle(20, 14, 13);
    vpg.fillStyle(0x0f3d00); vpg.fillRect(10, 10, 5, 8); vpg.fillRect(22, 8, 4, 6);
    vpg.fillStyle(0x0d2800); vpg.fillRect(9, 27, 22, 18);
    vpg.fillStyle(0xffd700); vpg.fillRect(18, 27, 4, 14);
    vpg.fillStyle(0x1a5c00); vpg.fillRect(4, 28, 8, 14); vpg.fillRect(28, 28, 8, 14);
    vpg.fillStyle(0xb8860b); vpg.fillRect(22, 36, 14, 10);
    vpg.fillStyle(0x8b6914); vpg.fillRect(26, 34, 6, 4);
    vpg.lineStyle(2, 0xffd700); vpg.strokeCircle(25, 11, 5);
    vpg.fillStyle(0xff4400); vpg.fillCircle(15, 12, 3); vpg.fillCircle(25, 12, 3);
    vpg.fillStyle(0xffffff); vpg.fillCircle(14, 11, 1); vpg.fillCircle(24, 11, 1);
    vpg.fillStyle(0xffd700);
    vpg.fillTriangle(10, 8, 14, 2, 18, 8); vpg.fillTriangle(18, 8, 22, 2, 26, 8);
    vpg.generateTexture('enemy_VP', 40, 48); vpg.destroy();

    // Manager zombie — corbata azul, ojeras
    const mg = this.add.graphics();
    mg.fillStyle(0x4a6b1a); mg.fillCircle(20, 14, 13);
    mg.fillStyle(0x2d4200); mg.fillRect(10, 10, 5, 8); mg.fillRect(22, 8, 4, 6);
    mg.fillStyle(0x1f2e00); mg.fillRect(9, 27, 22, 18);
    mg.fillStyle(0x0055ff); mg.fillRect(18, 27, 4, 14);
    mg.fillStyle(0x4a6b1a); mg.fillRect(4, 28, 8, 14); mg.fillRect(28, 28, 8, 14);
    mg.fillStyle(0x5c4400); mg.fillRect(22, 36, 14, 10);
    mg.fillStyle(0x3d2d00); mg.fillRect(26, 34, 6, 4);
    mg.fillStyle(0x2a4800); mg.fillRect(11, 16, 8, 3); mg.fillRect(21, 16, 8, 3);
    mg.fillStyle(0xff0000); mg.fillCircle(15, 12, 3); mg.fillCircle(25, 12, 3);
    mg.fillStyle(0xffffff); mg.fillCircle(14, 11, 1); mg.fillCircle(24, 11, 1);
    mg.generateTexture('enemy_MANAGER', 40, 48); mg.destroy();

    // CEO zombie — todo dorado, triple corona, maletín XL
    const cg = this.add.graphics();
    cg.fillStyle(0x2d4d00); cg.fillCircle(20, 14, 14);
    cg.fillStyle(0x1a3300); cg.fillRect(9, 10, 6, 9); cg.fillRect(25, 8, 5, 7);
    cg.fillStyle(0x0d1a00); cg.fillRect(8, 27, 24, 20);
    cg.fillStyle(0xffd700); cg.fillRect(17, 27, 5, 16);
    cg.fillStyle(0xd4af37); cg.fillRect(3, 28, 9, 16); cg.fillRect(28, 28, 9, 16);
    cg.fillStyle(0xd4af37); cg.fillRect(20, 36, 16, 12);
    cg.fillStyle(0xffd700); cg.fillRect(24, 34, 7, 4);
    cg.fillStyle(0xd4af37); cg.fillRect(10, 30, 4, 2); cg.fillRect(10, 33, 4, 2); cg.fillRect(12, 29, 2, 7);
    cg.fillStyle(0xffd700);
    cg.fillTriangle(8, 9, 13, 1, 18, 9); cg.fillTriangle(15, 9, 20, 1, 25, 9); cg.fillTriangle(22, 9, 27, 1, 32, 9);
    cg.fillStyle(0xff0000); cg.fillCircle(14, 12, 4); cg.fillCircle(26, 12, 4);
    cg.fillStyle(0xffffff); cg.fillCircle(13, 11, 1.5); cg.fillCircle(25, 11, 1.5);
    cg.generateTexture('enemy_CEO', 44, 52); cg.destroy();

    // Termo (bomba)
    const tg = this.add.graphics();
    tg.fillStyle(0xd2691e); tg.fillRect(6, 2, 18, 24);
    tg.fillStyle(0x8b4513); tg.fillRect(4, 0, 22, 5);
    tg.fillStyle(0xffa040); tg.fillRect(4, 2, 22, 4);
    tg.fillStyle(0xffffff); tg.fillRect(8, 10, 3, 3);
    tg.generateTexture('bomb', 30, 28); tg.destroy();

    // Explosión
    const eg = this.add.graphics();
    eg.lineStyle(3, 0xd2691e, 1); eg.strokeCircle(24, 24, 20);
    eg.fillStyle(0x8b4513, 0.35); eg.fillCircle(24, 24, 20);
    eg.fillStyle(0xffa040, 0.5); eg.fillCircle(24, 24, 10);
    eg.generateTexture('explosion', 48, 48); eg.destroy();

    // Papel (muerte Director)
    const ppg = this.add.graphics();
    ppg.fillStyle(0xf5f5dc); ppg.fillRect(0, 0, 10, 12);
    ppg.lineStyle(1, 0xaaa080); ppg.strokeRect(0, 0, 10, 12);
    ppg.fillStyle(0x888060);
    ppg.fillRect(2, 3, 6, 1); ppg.fillRect(2, 5, 6, 1); ppg.fillRect(2, 7, 4, 1);
    ppg.generateTexture('paper', 10, 12); ppg.destroy();

    // Moneda dorada (muerte CEO)
    const gcg = this.add.graphics();
    gcg.fillStyle(0xffd700); gcg.fillCircle(7, 7, 7);
    gcg.fillStyle(0xd4af37); gcg.fillCircle(7, 7, 5);
    gcg.fillStyle(0xffd700); gcg.fillRect(5, 4, 4, 6);
    gcg.generateTexture('coin', 14, 14); gcg.destroy();

    // Carta de despido (muerte Manager)
    const tlg = this.add.graphics();
    tlg.fillStyle(0xfff8dc); tlg.fillRect(0, 0, 24, 30);
    tlg.lineStyle(1, 0xcc0000); tlg.strokeRect(0, 0, 24, 30);
    tlg.fillStyle(0xcc0000);
    tlg.fillRect(3, 3, 18, 2); tlg.fillRect(3, 7, 18, 1);
    tlg.fillRect(3, 10, 12, 1); tlg.fillRect(3, 13, 15, 1); tlg.fillRect(3, 16, 18, 1);
    tlg.fillStyle(0xff0000); tlg.fillRect(5, 22, 14, 4);
    tlg.generateTexture('letter', 24, 30); tlg.destroy();

    // Pared sólida
    const wg = this.add.graphics();
    wg.fillStyle(0x1e0d00); wg.fillRect(0, 0, 64, 64);
    wg.lineStyle(2, 0x5c2d0a); wg.strokeRect(0, 0, 64, 64);
    wg.fillStyle(0x2a1200); wg.fillRect(4, 4, 56, 56);
    wg.fillStyle(0x3d1a00); wg.fillRect(8, 8, 48, 48);
    wg.fillStyle(0x5c2d0a); wg.fillRect(14, 16, 36, 28);
    wg.fillStyle(0x3d1a00); wg.fillRect(16, 20, 32, 8); wg.fillRect(16, 32, 32, 8);
    wg.fillStyle(0xd2691e); wg.fillRect(28, 23, 8, 2); wg.fillRect(28, 35, 8, 2);
    wg.generateTexture('wall', 64, 64); wg.destroy();

    // Pared rompible
    const bwg = this.add.graphics();
    bwg.fillStyle(0x200a00); bwg.fillRect(0, 0, 64, 64);
    bwg.lineStyle(1, 0x3d1a00); bwg.strokeRect(0, 0, 64, 64);
    bwg.fillStyle(0x8b6914);
    bwg.fillRect(4, 4, 26, 26); bwg.fillRect(34, 4, 26, 26);
    bwg.fillRect(4, 34, 26, 26); bwg.fillRect(34, 34, 26, 26);
    bwg.lineStyle(1, 0x5c4500);
    bwg.strokeRect(4, 4, 26, 26); bwg.strokeRect(34, 4, 26, 26);
    bwg.strokeRect(4, 34, 26, 26); bwg.strokeRect(34, 34, 26, 26);
    bwg.fillStyle(0x6b5010); bwg.fillRect(8, 8, 18, 2); bwg.fillRect(8, 12, 14, 2);
    bwg.generateTexture('breakWall', 64, 64); bwg.destroy();

    // Suelo
    const flg = this.add.graphics();
    flg.fillStyle(0x1a0a00); flg.fillRect(0, 0, 64, 64);
    flg.lineStyle(0.5, 0x2a1200, 0.6); flg.strokeRect(0, 0, 64, 64);
    flg.lineStyle(0.3, 0x3d1a00, 0.3);
    for (let x = 8; x < 64; x += 16) flg.strokeRect(x, 8, 8, 48);
    flg.generateTexture('floor', 64, 64); flg.destroy();

    // Power-ups (uno por tecla)
    const pColors = { Q: 0xffa040, E: 0x7ec8e3, R: 0xff4400, F: 0xc77dff };
    for (const [k, c] of Object.entries(pColors)) {
      const g = this.add.graphics();
      g.fillStyle(c, 0.15); g.fillCircle(16, 16, 14);
      g.lineStyle(2, c);    g.strokeCircle(16, 16, 14);
      g.fillStyle(c);       g.fillCircle(16, 16, 6);
      g.generateTexture('power_' + k, 32, 32); g.destroy();
    }

    // Cuarentena (poder Reunión)
    const qwg = this.add.graphics();
    qwg.fillStyle(0xff4400, 0.1); qwg.fillRect(0, 0, 64, 64);
    qwg.lineStyle(3, 0xff4400, 0.9); qwg.strokeRect(2, 2, 60, 60);
    qwg.lineStyle(1, 0xff4400, 0.4);
    for (let i = -64; i < 64; i += 12) qwg.lineBetween(i, 0, i + 64, 64);
    qwg.generateTexture('quarantine', 64, 64); qwg.destroy();
  }

  preload() {
    this.load.audio('enemyDieSound', 'sounds/enemyDie.mp3');
  }

  create() {
    gameScene = this;
    this.createTextures();

    // Estado de juego
    this.invincible   = false;
    this.canPlaceBomb = true;
    this.bombRange    = 1;
    this.maxBombs     = 1;
    this.activeBombs  = 0;
    this.powers       = { Q: false, E: false, R: false, F: false };

    // Grupos de física
    this.walls          = this.physics.add.staticGroup();
    this.breakWalls     = this.physics.add.staticGroup();
    this.bombs          = this.physics.add.staticGroup();
    this.explosions     = this.physics.add.group();
    this.enemies        = this.physics.add.group();
    this.powerUps       = this.physics.add.group();
    this.quarantineWalls = this.physics.add.staticGroup();

    this.buildMap();

    this.player = this.physics.add.sprite(96, 96, 'player');
    this.player.setCollideWorldBounds(true).setDepth(5);
    this.player.body.setSize(24, 30);

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.placeBomb());
    this.input.keyboard.on('keydown-Q',     () => this.activatePower('Q'));
    this.input.keyboard.on('keydown-E',     () => this.activatePower('E'));
    this.input.keyboard.on('keydown-R',     () => this.activatePower('R'));
    this.input.keyboard.on('keydown-F',     () => this.activatePower('F'));

    this.spawnEnemies();

    // Colisiones
    this.physics.add.collider(this.player,  this.walls);
    this.physics.add.collider(this.player,  this.breakWalls);
    this.physics.add.collider(this.player,  this.bombs);
    this.physics.add.collider(this.player,  this.quarantineWalls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.breakWalls);
    this.physics.add.collider(this.enemies, this.quarantineWalls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player,   this.explosions, this.onPlayerHit,    null, this);
    this.physics.add.overlap(this.enemies,  this.explosions, this.onEnemyHit,     null, this);
    this.physics.add.overlap(this.player,   this.powerUps,   this.onCollectPower, null, this);
    this.physics.add.overlap(this.player,   this.enemies,    this.onEnemyContact, null, this);

    // Scanlines decorativas
    const sg = this.add.graphics().setDepth(100).setAlpha(0.04);
    for (let y = 0; y < H; y += 4) { sg.fillStyle(0x000000); sg.fillRect(0, y, W, 2); }

    this.enemyChangeTimer = 0;
    document.getElementById('h-enemies').textContent = this.enemies.getChildren().length;
    showStatus(rnd(STATUS_MSGS), 3000);
  }

  /* ─── Construcción del mapa ─── */
  buildMap() {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const px = col * TILE + TILE / 2;
        const py = row * TILE + TILE / 2;
        this.add.image(px, py, 'floor').setDepth(0);

        const isBorder = col === 0 || row === 0 || col === COLS - 1 || row === ROWS - 1;
        const isPillar = col % 2 === 0 && row % 2 === 0;

        if (isBorder || isPillar) {
          this.walls.create(px, py, 'wall').setDepth(2).refreshBody();
        } else {
          const safe = (col <= 2 && row <= 2) || (col >= COLS - 3 && row >= ROWS - 3);
          if (!safe && Math.random() > 0.45) {
            this.breakWalls.create(px, py, 'breakWall').setDepth(2).refreshBody();
          }
        }
      }
    }
  }

  /* ─── Spawn de enemigos ─── */
  spawnEnemies() {
    const spawnPoints = [
      { x: COLS - 2, y: ROWS - 2 },
      { x: COLS - 2, y: 3 },
      { x: 3,        y: ROWS - 2 },
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
    ];
    const typeKeys = ['DIRECTOR', 'VP', 'MANAGER', 'CEO'];
    const count    = Math.min(2 + level, spawnPoints.length);

    for (let i = 0; i < count; i++) {
      const sp       = spawnPoints[i];
      const bossType = BOSS_TYPES[typeKeys[i % typeKeys.length]];
      const texKey   = bossType.key === 'DIRECTOR' ? 'enemy' : ('enemy_' + bossType.key);

      const e = this.enemies.create(sp.x * TILE + TILE / 2, sp.y * TILE + TILE / 2, texKey);
      e.setDepth(4).setCollideWorldBounds(true);
      e.body.setSize(bossType.key === 'CEO' ? 32 : 28, bossType.key === 'CEO' ? 40 : 36);

      const spd = (50 + level * 10) * bossType.speed;
      const ang = Math.random() * Math.PI * 2;
      e.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd).setBounce(1);
      e.frozen   = false;
      e.marked   = false;
      e.bossType = bossType;
      e.name     = rnd(bossType.names);

      // Aura dorada exclusiva del CEO
      if (bossType.key === 'CEO') {
        const aura = this.add.graphics().setDepth(3);
        aura.lineStyle(2, 0xffd700, 0.4);
        aura.strokeCircle(0, 0, 28);
        e._aura = aura;
      }

      const fontSize = bossType.key === 'CEO' ? '10px' : '8px';
      const color    = bossType.key === 'CEO' ? '#ffd700' : '#3d6b00';
      const label    = this.add.text(
        sp.x * TILE + TILE / 2,
        sp.y * TILE + TILE / 2 - 34,
        e.name,
        { fontSize, color, fontFamily: 'Comic Neue', fontStyle: bossType.key === 'CEO' ? 'bold' : 'normal' }
      ).setOrigin(0.5).setDepth(6);
      e._label = label;
    }
  }

  /* ══════════════════════════════════════════
     ANIMACIONES DE MUERTE ÚNICAS POR TIPO
  ══════════════════════════════════════════ */

  /* DIRECTOR — tormenta de papeles y KPIs */
  killDirector(enemy) {
    const ex = enemy.x, ey = enemy.y;
    SFX.deathDirector();
    showDeathCaption(enemy.bossType.deathTitle, enemy.bossType.deathSub);

    const flash = this.add.graphics().setDepth(20);
    flash.fillStyle(0xffffff, 0.8); flash.fillCircle(ex, ey, 32);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 300, onComplete: () => flash.destroy() });

    const kpiWords = ['EBITDA', 'Q4 META', 'ROI', 'KPI', 'OKR', 'PIVOT', 'SYNERGY', 'AGILE'];
    for (let i = 0; i < 14; i++) {
      const ang   = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 80 + Math.random() * 140;
      const paper = this.physics.add.image(ex, ey, 'paper').setDepth(15).setRotation(ang);
      paper.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      paper.setAngularVelocity(180 + Math.random() * 360);
      paper.setGravityY(120);
      this.tweens.add({ targets: paper, alpha: 0, duration: 900 + Math.random() * 400, onComplete: () => { if (paper.active) paper.destroy(); } });

      if (i % 2 === 0) {
        const word = this.add.text(ex + Math.cos(ang) * 10, ey + Math.sin(ang) * 10, rnd(kpiWords), {
          fontSize: '9px', color: '#1a3380', fontFamily: 'Bebas Neue', letterSpacing: 1,
        }).setOrigin(0.5).setDepth(16);
        this.tweens.add({ targets: word, x: word.x + Math.cos(ang) * 60, y: word.y + Math.sin(ang) * 60, alpha: 0, rotation: Math.random() * 1.5 - 0.75, duration: 700, onComplete: () => word.destroy() });
      }
    }

    const chartText = this.add.text(ex, ey - 20, '📊 → 0%', { fontSize: '16px', color: '#ff4400', fontFamily: 'Bebas Neue', letterSpacing: 2 }).setOrigin(0.5).setDepth(18);
    this.tweens.add({ targets: chartText, y: chartText.y - 50, alpha: 0, duration: 1200, onComplete: () => chartText.destroy() });

    SFX.enemyDie(this);
    this.createExplosion(ex, ey);
    if (enemy._label) enemy._label.destroy();
    if (enemy._aura)  enemy._aura.destroy();
    enemy.destroy();
  }

  /* VP — colapso de acciones, lluvia de dólares */
  killVP(enemy) {
    const ex = enemy.x, ey = enemy.y;
    SFX.deathVP();
    showDeathCaption(enemy.bossType.deathTitle, enemy.bossType.deathSub);

    const ghost = this.add.image(ex, ey, 'enemy_VP').setDepth(15).setScale(1);
    this.tweens.add({ targets: ghost, scaleY: 0.05, scaleX: 1.8, y: ey + 28, alpha: 0, duration: 900, ease: 'Cubic.easeIn', onComplete: () => ghost.destroy() });

    const ticker = this.add.text(ex - 60, ey - 30, '▼ CORP.SA -94%  ▼ VP.HOLDINGS -100%  ▼ BONUS -∞', { fontSize: '10px', color: '#ff2200', fontFamily: 'Bebas Neue', letterSpacing: 1 }).setDepth(18);
    this.tweens.add({ targets: ticker, x: ticker.x + 200, alpha: 0, duration: 1500, onComplete: () => ticker.destroy() });

    const symbols = ['💲', '$', '€', '¥'];
    for (let i = 0; i < 8; i++) {
      const ds = this.add.text(ex + (Math.random() - 0.5) * 60, ey - 10, rnd(symbols), { fontSize: '14px', color: '#ffd700', fontFamily: 'Comic Neue' }).setOrigin(0.5).setDepth(17);
      this.tweens.add({ targets: ds, y: ds.y + 60 + Math.random() * 40, x: ds.x + (Math.random() - 0.5) * 30, alpha: 0, delay: i * 80, duration: 700, onComplete: () => ds.destroy() });
    }

    const lineG = this.add.graphics().setDepth(16);
    lineG.lineStyle(3, 0xff2200, 0.9);
    lineG.beginPath(); lineG.moveTo(ex - 40, ey - 20); lineG.lineTo(ex + 40, ey + 20); lineG.strokePath();
    this.tweens.add({ targets: lineG, alpha: 0, duration: 800, onComplete: () => lineG.destroy() });

    if (enemy._label) enemy._label.destroy();
    if (enemy._aura)  enemy._aura.destroy();
    enemy.destroy();
    SFX.enemyDie(this);
    this.createExplosion(ex, ey);
  }

  /* MANAGER — sello DESPEDIDO + lluvia de útiles */
  killManager(enemy) {
    const ex = enemy.x, ey = enemy.y;
    SFX.deathManager();
    showDeathCaption(enemy.bossType.deathTitle, enemy.bossType.deathSub);

    const ghost = this.add.image(ex, ey, 'enemy_MANAGER').setDepth(15);
    this.tweens.add({ targets: ghost, angle: 720, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 700, ease: 'Cubic.easeIn', onComplete: () => ghost.destroy() });

    const letter = this.add.image(ex, ey, 'letter').setDepth(18).setScale(0.8);
    this.tweens.add({ targets: letter, y: letter.y - 120, angle: -15 + Math.random() * 30, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => letter.destroy() });

    const stamp = this.add.text(ex, ey, 'DESPEDIDO', { fontSize: '22px', color: '#cc0000', fontFamily: 'Bebas Neue', letterSpacing: 3, stroke: '#660000', strokeThickness: 2 }).setOrigin(0.5).setDepth(20).setAlpha(0).setRotation(-0.3);
    this.tweens.add({ targets: stamp, alpha: 1, scaleX: 1.4, scaleY: 1.4, duration: 200,
      onComplete: () => {
        this.tweens.add({ targets: stamp, alpha: 0, scaleX: 1, scaleY: 1, y: stamp.y - 30, duration: 700, delay: 400, onComplete: () => stamp.destroy() });
      },
    });
    this.cameras.main.shake(200, 0.008);

    const items = ['📎', '🖇️', '✏️', '📌', '📁'];
    for (let i = 0; i < 5; i++) {
      const ang  = Math.random() * Math.PI * 2;
      const item = this.add.text(ex, ey, rnd(items), { fontSize: '16px', fontFamily: 'Comic Neue' }).setOrigin(0.5).setDepth(17);
      this.tweens.add({ targets: item, x: item.x + Math.cos(ang) * 55, y: item.y + Math.sin(ang) * 55, angle: Math.random() * 360, alpha: 0, duration: 600, delay: i * 60, onComplete: () => item.destroy() });
    }

    if (enemy._label) enemy._label.destroy();
    if (enemy._aura)  enemy._aura.destroy();
    enemy.destroy();
    SFX.enemyDie(this);
    this.createExplosion(ex, ey);
  }

  /* CEO — explosión dorada épica total */
  killCEO(enemy) {
    const ex = enemy.x, ey = enemy.y;
    SFX.deathCEO();
    showDeathCaption(enemy.bossType.deathTitle, enemy.bossType.deathSub);
    this.cameras.main.shake(500, 0.022);
    this.cameras.main.flash(400, 255, 215, 0, false);

    const wave = this.add.graphics().setDepth(20);
    wave.lineStyle(4, 0xffd700, 1); wave.strokeCircle(ex, ey, 10);
    this.tweens.add({ targets: wave, scaleX: 6, scaleY: 6, alpha: 0, duration: 700, onComplete: () => wave.destroy() });

    this.time.delayedCall(150, () => {
      const w2 = this.add.graphics().setDepth(20);
      w2.lineStyle(3, 0xffa040, 0.8); w2.strokeCircle(ex, ey, 10);
      this.tweens.add({ targets: w2, scaleX: 5, scaleY: 5, alpha: 0, duration: 600, onComplete: () => w2.destroy() });
    });

    const ghost = this.add.image(ex, ey, 'enemy_CEO').setDepth(15).setScale(1.3);
    this.tweens.add({ targets: ghost, angle: 1080, scaleX: 0, scaleY: 0, duration: 1000, ease: 'Back.easeIn', onComplete: () => ghost.destroy() });

    for (let i = 0; i < 20; i++) {
      const ang  = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
      const spd  = 60 + Math.random() * 160;
      const coin = this.physics.add.image(ex, ey, 'coin').setDepth(16);
      coin.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd - 40);
      coin.setAngularVelocity(300 + Math.random() * 400);
      coin.setGravityY(200);
      this.tweens.add({ targets: coin, alpha: 0, duration: 1000 + Math.random() * 400, delay: i * 30, onComplete: () => { if (coin.active) coin.destroy(); } });
    }

    const crown = this.add.text(ex, ey - 10, '👑', { fontSize: '28px' }).setOrigin(0.5).setDepth(19);
    this.tweens.add({ targets: crown, y: crown.y - 80, x: crown.x + 30, angle: 90, alpha: 0, duration: 800, ease: 'Power2', onComplete: () => crown.destroy() });

    const boardWords = ['POWER BI', 'DASHBOARD', 'QUARTERLY', 'LEVERAGE', 'PARADIGM', 'DISRUPTIVE', 'HOLISTIC'];
    for (let i = 0; i < 6; i++) {
      const bw = this.add.text(ex + (Math.random() - 0.5) * 80, ey - 20, rnd(boardWords), { fontSize: '11px', color: '#ffd700', fontFamily: 'Bebas Neue', letterSpacing: 1, stroke: '#5c4400', strokeThickness: 1 }).setOrigin(0.5).setDepth(18);
      this.tweens.add({ targets: bw, y: bw.y + 50 + Math.random() * 30, x: bw.x + (Math.random() - 0.5) * 40, alpha: 0, delay: i * 120, duration: 900, onComplete: () => bw.destroy() });
    }

    this.time.delayedCall(300, () => {
      const big = this.add.text(ex, ey - 40, '¡CHECKMATE!', { fontFamily: 'Bebas Neue', fontSize: '30px', color: '#ffd700', letterSpacing: 4, stroke: '#3d2a00', strokeThickness: 3 }).setOrigin(0.5).setDepth(22).setAlpha(0);
      this.tweens.add({ targets: big, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 300, yoyo: true,
        onComplete: () => {
          this.tweens.add({ targets: big, alpha: 0, y: big.y - 40, duration: 600, onComplete: () => big.destroy() });
        },
      });
    });

    if (enemy._label) enemy._label.destroy();
    if (enemy._aura)  enemy._aura.destroy();
    enemy.destroy();
    SFX.enemyDie(this);
    this.createExplosion(ex, ey);
    this.time.delayedCall(200, () => this.createExplosion(ex + 30, ey - 20));
    this.time.delayedCall(350, () => this.createExplosion(ex - 30, ey + 10));
  }

  /* ─── Despachar muerte según tipo ─── */
  dispatchDeath(enemy) {
    if (!enemy || !enemy.active) return;
    const type = enemy.bossType ? enemy.bossType.key : 'DIRECTOR';
    switch (type) {
      case 'VP':      this.killVP(enemy);      break;
      case 'MANAGER': this.killManager(enemy);  break;
      case 'CEO':     this.killCEO(enemy);      break;
      default:        this.killDirector(enemy); break;
    }
    document.getElementById('h-enemies').textContent = this.enemies.getChildren().length;
    this.checkWin();
  }

  /* ─── Colocar bomba ─── */
  placeBomb() {
    if (!this.canPlaceBomb || this.activeBombs >= this.maxBombs) return;
    const gx = Math.floor(this.player.x / TILE) * TILE + TILE / 2;
    const gy = Math.floor(this.player.y / TILE) * TILE + TILE / 2;
    for (const b of this.bombs.getChildren()) if (b.x === gx && b.y === gy) return;

    SFX.placeBomb();
    this.canPlaceBomb = false;
    this.activeBombs++;

    const bomb = this.bombs.create(gx, gy, 'bomb');
    bomb.setDepth(3).setImmovable(true).refreshBody();
    this.tweens.add({ targets: bomb, scaleX: 1.2, scaleY: 1.2, duration: 350, yoyo: true, repeat: 5 });

    const circle = this.add.graphics().setDepth(3);
    bomb._ring      = circle;
    bomb._timer     = 0;
    bomb._totalTime = 2500;
    bomb._range     = this.bombRange;

    this.time.delayedCall(bomb._totalTime, () => {
      this.explodeBomb(gx, gy, bomb._range || this.bombRange);
      if (bomb._ring) bomb._ring.destroy();
      bomb.destroy();
      this.activeBombs--;
      this.canPlaceBomb = true;
    });

    this.time.addEvent({ delay: 50, repeat: 49, callback: () => {
      if (!bomb.active) return;
      bomb._timer += 50;
      const p = bomb._timer / bomb._totalTime;
      circle.clear();
      circle.lineStyle(2, 0xd2691e, 0.9);
      circle.beginPath();
      circle.arc(gx, gy, 22, -Math.PI / 2, -Math.PI / 2 + (1 - p) * Math.PI * 2, false);
      circle.strokePath();
    }});
  }

  /* ─── Explosión en cruz ─── */
  explodeBomb(cx, cy, range) {
    const allTiles = [[0, 0]];
    for (let r = 1; r <= range; r++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) allTiles.push([dx * r, dy * r]);
    }
    SFX.explosion();
    this.cameras.main.shake(220, 0.01);

    for (const [dx, dy] of allTiles) {
      const ex = cx + dx * TILE, ey = cy + dy * TILE;
      if (ex < 0 || ex > W || ey < 0 || ey > H) continue;

      let blocked = false;
      for (const w of this.walls.getChildren()) {
        if (Math.abs(w.x - ex) < 10 && Math.abs(w.y - ey) < 10) { blocked = true; break; }
      }
      if (blocked) continue;

      for (const bw of [...this.breakWalls.getChildren()]) {
        if (Math.abs(bw.x - ex) < 10 && Math.abs(bw.y - ey) < 10) {
          bw.destroy();
          if (Math.random() > 0.5) this.spawnPowerUp(ex, ey);
          break;
        }
      }
      this.createExplosion(ex, ey);
    }
  }

  /* ─── Partícula de explosión ─── */
  createExplosion(x, y) {
    const exp = this.explosions.create(x, y, 'explosion');
    exp.setDepth(6).setAlpha(0.9).setScale(0.8);
    this.tweens.add({ targets: exp, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 550, onComplete: () => { if (exp.active) exp.destroy(); } });

    const g = this.add.graphics().setDepth(7);
    g.lineStyle(2, 0xffa040, 0.8); g.strokeCircle(x, y, 5);
    this.tweens.add({ targets: g, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 450, onComplete: () => g.destroy() });

    for (let i = 0; i < 4; i++) {
      const drop = this.add.graphics().setDepth(6);
      const ang  = (i / 4) * Math.PI * 2;
      drop.fillStyle(0x8b4513, 0.8); drop.fillCircle(x, y, 4);
      this.tweens.add({ targets: drop, x: Math.cos(ang) * 30, y: Math.sin(ang) * 30, alpha: 0, duration: 400, onComplete: () => drop.destroy() });
    }
    this.time.delayedCall(550, () => { if (exp.active) exp.destroy(); });
  }

  /* ─── Spawn power-up ─── */
  spawnPowerUp(x, y) {
    const type = Phaser.Math.RND.pick(['Q', 'E', 'R', 'F']);
    const pu   = this.powerUps.create(x, y, 'power_' + type);
    pu.powerType = type; pu.setDepth(3);
    this.tweens.add({ targets: pu, y: y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /* ══════════════════════════════
     PODERES ESPECIALES
  ══════════════════════════════ */
  activatePower(key) {
    if (!this.powers[key]) {
      showStatus('📋 No tienes ese poder. ¡Busca cajas en la oficina!'); return;
    }
    const now = this.time.now;
    if (powerCooldowns[key] > now) {
      showStatus(`⏳ ${key} en cooldown: ${Math.ceil((powerCooldowns[key] - now) / 1000)}s — ¡espera como en el ascensor!`); return;
    }
    powerCooldowns[key] = now + COOLDOWN[key];
    updatePowerSlot(key, true);
    activatePowerSlot(key);
    SFX.powerActivate();
    this.time.delayedCall(COOLDOWN[key], () => updatePowerSlot(key, false));

    switch (key) {
      case 'Q': this.powerPPT();     break;
      case 'E': this.powerCooler();  break;
      case 'R': this.powerMeeting(); break;
      case 'F': this.powerAudit();   break;
    }
  }

  /* Q — PowerPoint: cadena de muerte por aburrimiento */
  powerPPT() {
    showStatus('📊 ¡SLIDE 1 de 200! — Cadena de aburrimiento letal');
    const enemies = this.enemies.getChildren();
    if (!enemies.length) return;

    let nearest = null, minDist = Infinity;
    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    if (!nearest || minDist > TILE * 4) { showStatus('📊 Sin gerentes en rango de aburrimiento'); return; }

    const chainKill = (enemy, depth) => {
      if (!enemy.active) return;
      this.time.delayedCall(depth * 350, () => {
        if (!enemy.active) return;
        const g     = this.add.graphics().setDepth(8);
        g.fillStyle(0x1f4e79, 0.6); g.fillCircle(enemy.x, enemy.y, 30);
        const slide = this.add.text(enemy.x, enemy.y - 20, `SLIDE ${depth * 70 + 1}/200`, { fontSize: '10px', color: '#ffffff', fontFamily: 'Comic Neue', fontStyle: 'bold' }).setOrigin(0.5).setDepth(9);
        this.tweens.add({ targets: [g, slide], alpha: 0, duration: 500, onComplete: () => { g.destroy(); slide.destroy(); } });

        const saved = enemy;
        this.time.delayedCall(200, () => {
          if (!saved.active) return;
          this.dispatchDeath(saved);
          if (depth < 3) {
            for (const other of [...this.enemies.getChildren()]) {
              if (other.active && Phaser.Math.Distance.Between(saved.x, saved.y, other.x, other.y) < TILE * 2)
                chainKill(other, depth + 1);
            }
          }
        });
      });
    };
    chainKill(nearest, 0);
  }

  /* E — Cooler: congelar con el chisme del año */
  powerCooler() {
    showStatus('🧊 "¿Sabías que el CEO se fue a Cancún?" — Todos paralizados');
    SFX.freeze();

    const overlay = this.add.graphics().setDepth(50).setAlpha(0.12);
    overlay.fillStyle(0x7ec8e3); overlay.fillRect(0, 0, W, H);

    const gossip = ['¡SE SEPARÓ!', 'NUEVO JEFE', '¡QUÉ ESCÁNDALO!', 'REDUCCIÓN...', 'BONO CERO 😱'];
    gossip.forEach((txt, i) => {
      const t = this.add.text(100 + i * 140, 80 + Math.random() * 300, txt, { fontSize: '12px', color: '#7ec8e3', fontFamily: 'Comic Neue', fontStyle: 'bold' }).setDepth(51).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 0.8, duration: 500, delay: i * 200, yoyo: true, repeat: 3, onComplete: () => t.destroy() });
    });
    this.tweens.add({ targets: overlay, alpha: 0, duration: 4000, onComplete: () => overlay.destroy() });

    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      e._savedVX = e.body.velocity.x; e._savedVY = e.body.velocity.y;
      e.setVelocity(e.body.velocity.x * 0.1, e.body.velocity.y * 0.1);
      e.setTint(0x7ec8e3); e.frozen = true;
    }
    this.time.delayedCall(4000, () => {
      for (const e of this.enemies.getChildren()) {
        if (!e.active) continue;
        e.setVelocity(e._savedVX || 60, e._savedVY || 60);
        e.clearTint(); e.frozen = false;
      }
      showStatus('🧊 El chisme terminó. Los gerentes retoman su marcha...');
    });
  }

  /* R — Reunión en sala: barrera de cuarentena */
  powerMeeting() {
    showStatus('🚧 ¡Sala RESERVADA — Reunión sin fin! Barrera 6 segundos');
    const gx = Math.floor(this.player.x / TILE);
    const gy = Math.floor(this.player.y / TILE);
    const placed = [];

    for (const [ox, oy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      const nx = gx + ox, ny = gy + oy;
      if (nx <= 0 || ny <= 0 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
      const tx = nx * TILE + TILE / 2, ty = ny * TILE + TILE / 2;
      let onWall = false;
      for (const w of this.walls.getChildren()) if (Math.abs(w.x - tx) < 10 && Math.abs(w.y - ty) < 10) { onWall = true; break; }
      if (onWall) continue;
      const qw = this.quarantineWalls.create(tx, ty, 'quarantine');
      qw.setDepth(3).setImmovable(true).refreshBody().setAlpha(0);
      this.tweens.add({ targets: qw, alpha: 1, duration: 250 });
      placed.push(qw);
    }
    this.time.delayedCall(6000, () => {
      for (const qw of placed) {
        if (qw.active) this.tweens.add({ targets: qw, alpha: 0, duration: 300, onComplete: () => { if (qw.active) qw.destroy(); } });
      }
      showStatus('🚧 La reunión terminó. Sin conclusiones. Como siempre.');
    });
  }

  /* F — Auditoría: marcar enemigos para seguimiento */
  powerAudit() {
    showStatus('🔍 ¡AUDITORÍA SORPRESA! Todos los gerentes están en el acta');
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      e.setTint(0xffa040); e.marked = true;
      const g        = this.add.graphics().setDepth(9);
      e._marker      = g;
      const auditTag = this.add.text(e.x, e.y + 28, '📋 AUDITADO', { fontSize: '8px', color: '#ffa040', fontFamily: 'Comic Neue', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
      e._auditTag    = auditTag;
      e._markerUpdate = () => {
        if (!e.active) { g.destroy(); if (auditTag.active) auditTag.destroy(); return; }
        g.clear();
        g.lineStyle(2, 0xffa040, 0.9); g.strokeCircle(e.x, e.y, 26);
        g.lineStyle(1, 0xffa040, 0.4); g.strokeRect(e.x - 22, e.y - 22, 44, 44);
        if (auditTag.active) { auditTag.x = e.x; auditTag.y = e.y + 30; }
      };
      this.time.delayedCall(5000, () => {
        if (e.active) { e.clearTint(); e.marked = false; }
        g.destroy(); if (auditTag.active) auditTag.destroy();
        e._marker = null; e._markerUpdate = null; e._auditTag = null;
      });
    }
  }

  /* ══════════════════════════════
     OVERLAPS / COLISIONES
  ══════════════════════════════ */
  onPlayerHit(player) {
    if (this.invincible) return;
    this.invincible = true;
    lives--;
    updateLivesHUD();
    SFX.playerHit();
    showStatus(rnd(HIT_MSGS));
    this.cameras.main.shake(300, 0.015);
    player.setTint(0xff0040);
    this.tweens.add({ targets: player, alpha: 0.3, duration: 150, yoyo: true, repeat: 8, onComplete: () => { player.clearTint(); player.setAlpha(1); this.invincible = false; } });
    if (lives <= 0) this.gameOver();
  }

  onEnemyContact(player, enemy) { this.onPlayerHit(player); }

  onEnemyHit(enemy) {
    if (!enemy.active) return;
    this.dispatchDeath(enemy);
  }

  onCollectPower(player, pu) {
    const type = pu.powerType;
    this.powers[type] = true;
    pu.destroy();
    SFX.collectPower();
    const names = { Q: 'PowerPoint', E: 'Agua del Cooler', R: 'Reunión en sala', F: 'Auditoría' };
    const icons = { Q: '📊', E: '🧊', R: '🚧', F: '🔍' };
    showStatus(`${icons[type]} ¡Poder "${names[type]}" adquirido! Presiona ${type} cuando lo necesites`);
    document.getElementById('slot-' + type).classList.add('has-power');
    this.tweens.add({ targets: player, scaleX: 1.2, scaleY: 1.2, duration: 200, yoyo: true });
  }

  /* ─── Verificar victoria ─── */
  checkWin() {
    this.time.delayedCall(400, () => {
      if (!this.enemies.getChildren().length) this.levelComplete();
    });
  }

  levelComplete() {
    level++;
    document.getElementById('h-level').textContent = level;
    SFX.levelUp();

    const floors = ['Sótano de Archivos', 'Piso RR.HH.', 'Sala de Juntas', 'Torre Ejecutiva', 'Ático del CEO'];
    showStatus(`🛗 ¡Subiendo al ${floors[Math.min(level - 1, floors.length - 1)]}! Nivel ${level}`, 3500);
    this.cameras.main.flash(600, 210, 105, 30);

    const lt = this.add.text(W / 2, H / 2, `¡PISO ${level}!`, { fontFamily: 'Bebas Neue', fontSize: '80px', color: '#d2691e', alpha: 0.9 }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({ targets: lt, alpha: 0.9, scaleX: 1.3, scaleY: 1.3, duration: 500, yoyo: true, onComplete: () => lt.destroy() });

    this.time.delayedCall(2200, () => {
      this.breakWalls.clear(true, true);
      this.bombs.clear(true, true);
      this.explosions.clear(true, true);
      this.powerUps.clear(true, true);
      this.quarantineWalls.clear(true, true);
      this.canPlaceBomb  = true;
      this.activeBombs   = 0;
      this.bombRange     = Math.min(this.bombRange + (level % 3 === 0 ? 1 : 0), 3);
      this.walls.clear(true, true);
      this.buildMap();
      this.collidersRebuild();
      this.player.setPosition(96, 96);
      this.spawnEnemies();
      document.getElementById('h-enemies').textContent = this.enemies.getChildren().length;
      setTimeout(() => showStatus(rnd(STATUS_MSGS), 3000), 500);
    });
  }

  collidersRebuild() {
    this.physics.add.collider(this.player,  this.walls);
    this.physics.add.collider(this.player,  this.breakWalls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.breakWalls);
    this.physics.add.collider(this.enemies, this.quarantineWalls);
  }

  /* ─── Game Over ─── */
  gameOver() {
    SFX.gameOver();
    this.physics.pause();
    this.player.setTint(0xff0000);
    const g = this.add.graphics().setDepth(99);
    g.fillStyle(0x1a0a00, 0.9); g.fillRect(0, 0, W, H);

    const lines = [
      { text: 'DESPEDIDO.',                                           size: '52px', color: '#d2691e', y: H / 2 - 90 },
      { text: '(Y DEVORADO)',                                         size: '28px', color: '#ff4400', y: H / 2 - 30 },
      { text: 'Lamentamos informarle que su contrato',                size: '13px', color: '#8b6347', y: H / 2 + 20 },
      { text: 'ha sido rescindido por causas de fuerza mayor zombi.', size: '13px', color: '#8b6347', y: H / 2 + 42 },
      { text: 'No habrá liquidación. No habrá carta de recomendación.', size: '11px', color: '#5c3317', y: H / 2 + 75 },
      { text: 'Recarga para volver a fichar.',                        size: '11px', color: '#3d1a00', y: H / 2 + 100 },
    ];
    lines.forEach(l => {
      const t = this.add.text(W / 2, l.y, l.text, { fontFamily: 'Bebas Neue', fontSize: l.size, color: l.color, letterSpacing: 2 }).setDepth(100).setOrigin(0.5);
      if (l.y === H / 2 - 90) this.tweens.add({ targets: t, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    });
    showStatus('💀 MISIÓN FALLIDA — HR ha sido notificado', 9999);
  }

  /* ─── Loop principal ─── */
  update(time, delta) {
    if (!this.player.active) return;
    this.player.setVelocity(0);
    const spd = 180;
    if (this.cursors.left.isDown)  this.player.setVelocityX(-spd);
    else if (this.cursors.right.isDown) this.player.setVelocityX(spd);
    if (this.cursors.up.isDown)    this.player.setVelocityY(-spd);
    else if (this.cursors.down.isDown)  this.player.setVelocityY(spd);

    this.enemyChangeTimer += delta;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || e.frozen) continue;
      if (e._label && e._label.active) { e._label.x = e.x; e._label.y = e.y - 36; }
      if (e._aura) { e._aura.x = e.x; e._aura.y = e.y; }
      if (e.marked) {
        const dx  = this.player.x - e.x, dy = this.player.y - e.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const s   = 75 + level * 8;
        e.setVelocity((dx / len) * s, (dy / len) * s);
      }
      if (e._markerUpdate) e._markerUpdate();
      if (this.enemyChangeTimer > 2200 + Math.random() * 800) {
        const s   = 50 + level * 10;
        const ang = Math.random() * Math.PI * 2;
        e.setVelocity(Math.cos(ang) * s, Math.sin(ang) * s);
      }
    }
    if (this.enemyChangeTimer > 3000) this.enemyChangeTimer = 0;
    document.getElementById('h-enemies').textContent = this.enemies.getChildren().length;
  }
}