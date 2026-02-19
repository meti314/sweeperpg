#!/usr/bin/env node
// patch_game.js — Integruje wygenerowane pixel art assety z index.html
// Uzycie: node patch_game.js
// Wymaga: assets/manifest.json (wygenerowany przez generate_assets.js)

const fs = require('fs');
const path = require('path');

const GAME_FILE = path.join(__dirname, 'index.html');
const MANIFEST_PATH = path.join(__dirname, 'assets', 'manifest.json');
const BACKUP_FILE = path.join(__dirname, 'index_backup.html');

// ===================== LOAD & VALIDATE =====================
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('Brak manifest.json! Najpierw uruchom: node generate_assets.js');
  process.exit(1);
}

if (!fs.existsSync(GAME_FILE)) {
  console.error('Brak index.html!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Always patch from clean backup to avoid double-patching
if (!fs.existsSync(BACKUP_FILE)) {
  // First run: backup the current file
  fs.copyFileSync(GAME_FILE, BACKUP_FILE);
  console.log('Backup zapisany: index_backup.html');
}
let html = fs.readFileSync(BACKUP_FILE, 'utf8');
console.log('Zrodlo: index_backup.html (czysty)');

// ===================== CONVERT ASSETS TO BASE64 =====================
console.log('Konwertuje assety na base64...');
const sprites = {};
let loaded = 0, missing = 0;

for (const [key, filename] of Object.entries(manifest)) {
  const filePath = path.join(__dirname, 'assets', filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    sprites[key] = `data:image/png;base64,${data.toString('base64')}`;
    loaded++;
  } else {
    console.warn(`  BRAK: ${filename}`);
    missing++;
  }
}
console.log(`Zaladowano: ${loaded}, brak: ${missing}`);

// ===================== MONSTER NAME → SPRITE KEY MAPPING =====================
const MONSTER_SPRITE_MAP = {
  'Zmutowany Karaluch': 'monster_karaluch',
  'Mały Szczur': 'monster_szczur_maly',
  'Grzyb Trujący': 'monster_grzyb',
  'Robak': 'monster_robak',
  'Stonożka': 'monster_stonozka',
  'Śluz': 'monster_sluz',
  'Szczur': 'monster_szczur',
  'Nietoperz': 'monster_nietoperz',
  'Pająk': 'monster_pajak',
  'Mała Śluz': 'monster_mala_sluz',
  'Szkielet': 'monster_szkielet',
  'Goblin': 'monster_goblin',
  'Zombie': 'monster_zombie',
  'Wilk': 'monster_wilk',
  'Ork': 'monster_ork',
  'Duch': 'monster_duch',
  'Mroczny Mag': 'monster_mroczny_mag',
  'Troll': 'monster_troll',
  'Bandyta': 'monster_bandyta',
  'Ognisty Żywiołak': 'monster_ognisty_zywiolak',
  'Lodowy Żywiołak': 'monster_lodowy_zywiolak',
  'Golem': 'monster_golem',
  'Wampir': 'monster_wampir',
  'Bazyliszek': 'monster_bazyliszek',
  'Upiór': 'monster_upior',
  'Smocze Pisklę': 'monster_smocze_piskle',
  'Demon': 'monster_demon',
  'Lich': 'monster_lich',
  'Smok': 'monster_smok',
  // Tier 6-10 monsters
  'Mroczny Rycerz': 'monster_mroczny_rycerz',
  'Chimera': 'monster_chimera',
  'Banszi': 'monster_banszi',
  'Tropiciel Cieni': 'monster_tropiciel_cieni',
  'Lawowy Golem': 'monster_lawowy_golem',
  'Rycerz Śmierci': 'monster_rycerz_smierci',
  'Pradawny Smok': 'monster_pradawny_smok',
  'Plugawiec': 'monster_plugawiec',
  'Demon Otchłani': 'monster_demon_otchlani',
  'Mroźny Wyrm': 'monster_mrozny_wyrm',
  'Pustkowiec': 'monster_pustkowiec',
  'Arcydemon': 'monster_arcydemon',
  'Żniwiarz Dusz': 'monster_zniwiarz_dusz',
  'Kryształowy Kolos': 'monster_krysztalowy_kolos',
  'Starszy Lich': 'monster_starszy_lich',
  'Tytan': 'monster_tytan',
  'Żywiołak Chaosu': 'monster_zywiolak_chaosu',
  'Koszmar': 'monster_koszmar',
  'Król Otchłani': 'monster_krol_otchlani',
  'Smok Cienia': 'monster_smok_cienia',
  'Władca Pustki': 'monster_wladca_pustki',
  // Pack monsters
  'Stado Szczurów': 'monster_stado_szczurow',
  'Chmara Nietoperzy': 'monster_chmara_nietoperzy',
  'Sfora Wilków': 'monster_sfora_wilkow',
  'Rój Duchów': 'monster_roj_duchow',
  // Bosses
  'Król Goblinów': 'boss_krol_goblinow',
  'Nekromanta': 'boss_nekromanta',
  'Ognisty Władca': 'boss_ognisty_wladca',
  'Strażnik Otchłani': 'boss_straznik_otchlani',
  "Cień Zar'Kotha": 'boss_cien',
  // New bosses (tiers 6-10)
  'Królowa Chimer': 'boss_krolowa_chimer',
  'Pradawny Nekromanta': 'boss_pradawny_nekromanta',
  'Żelazny Władca': 'boss_zelazny_wladca',
  "Avatar Zar'Kotha": 'boss_avatar_zarkotha',
  'Serce Otchłani': 'boss_serce_otchlani',
};

const NPC_SPRITE_MAP = {
  'borek': 'npc_borek',
  'mirela': 'npc_mirela',
  'grzegorz': 'npc_grzegorz',
  'xardas': 'npc_xardas',
  'kasia': 'npc_kasia',
  'aelindra': 'npc_aelindra',
  'bromir': 'npc_bromir',
  'aldric': 'npc_aldric',
};

const CONSUMABLE_SPRITE_MAP = {
  'vision': 'consumable_zwoj',
  'tracker': 'consumable_krysztal',
  'spyglass': 'consumable_luneta',
  'compass': 'consumable_kompas',
  'safety': 'consumable_kamien',
};

const SLOT_SPRITE_MAP = {
  'helmet': 'slot_helmet',
  'armor': 'slot_armor',
  'weapon': 'slot_weapon',
  'shield': 'slot_shield',
  'bracers': 'slot_bracers',
  'accessory': 'slot_accessory',
  'boots': 'slot_boots',
  'special': 'slot_special',
};

// ===================== BUILD SPRITES JS OBJECT =====================
console.log('Buduje obiekt SPRITES...');

let spritesJS = 'const SPRITES = {\n';
for (const [key, dataUri] of Object.entries(sprites)) {
  // Escape any quotes in the key
  spritesJS += `  '${key}': '${dataUri}',\n`;
}
spritesJS += '};\n\n';

// Add monster name mapping
spritesJS += 'const MONSTER_SPRITE_MAP = {\n';
for (const [name, key] of Object.entries(MONSTER_SPRITE_MAP)) {
  spritesJS += `  '${name.replace(/'/g, "\\'")}': '${key}',\n`;
}
spritesJS += '};\n\n';

// Add NPC mapping
spritesJS += 'const NPC_SPRITE_MAP = {\n';
for (const [id, key] of Object.entries(NPC_SPRITE_MAP)) {
  spritesJS += `  '${id}': '${key}',\n`;
}
spritesJS += '};\n\n';

// Add consumable mapping
spritesJS += 'const CONSUMABLE_SPRITE_MAP = {\n';
for (const [id, key] of Object.entries(CONSUMABLE_SPRITE_MAP)) {
  spritesJS += `  '${id}': '${key}',\n`;
}
spritesJS += '};\n\n';

// Add slot mapping
spritesJS += 'const SLOT_SPRITE_MAP = {\n';
for (const [slot, key] of Object.entries(SLOT_SPRITE_MAP)) {
  spritesJS += `  '${slot}': '${key}',\n`;
}
spritesJS += '};\n\n';

// Helper function for generating sprite img tags
spritesJS += `function spriteImg(key, size, cls) {
  size = size || 24;
  cls = cls || '';
  const src = SPRITES[key];
  if (!src) return '';
  return '<img src="' + src + '" width="' + size + '" height="' + size + '" class="sprite ' + cls + '" style="image-rendering:pixelated;vertical-align:middle;" />';
}

function monsterSprite(name, size) {
  const key = MONSTER_SPRITE_MAP[name];
  return key ? spriteImg(key, size || 32) : '';
}

function npcSprite(id, size) {
  const key = NPC_SPRITE_MAP[id];
  return key ? spriteImg(key, size || 48) : '';
}

function slotSprite(slot, size) {
  const key = SLOT_SPRITE_MAP[slot];
  return key ? spriteImg(key, size || 28) : '';
}

function consumableSprite(consumableId, size) {
  const key = CONSUMABLE_SPRITE_MAP[consumableId];
  return key ? spriteImg(key, size || 24) : '';
}
`;

// ===================== INJECT INTO HTML =====================
console.log('Patchuje index.html...');

// 1. Inject SPRITES object right after the opening <script> tag
const scriptTag = '<script>';
const scriptIdx = html.indexOf(scriptTag);
if (scriptIdx === -1) {
  console.error('Nie znaleziono tagu <script>!');
  process.exit(1);
}
html = html.slice(0, scriptIdx + scriptTag.length) + '\n// ===================== PIXEL ART SPRITES =====================\n' + spritesJS + '\n' + html.slice(scriptIdx + scriptTag.length);

// 2. Add CSS for pixel art rendering
const stylePrefix = `
/* Pixel Art Sprite Styles */
.sprite { image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; display: inline-block; }
.sprite-cell { width: 100%; height: 100%; object-fit: contain; }
.npc-icon img.sprite { width: 64px; height: 64px; }
.eq-icon img.sprite { width: 28px; height: 28px; }
.combat-monster-sprite { position: absolute; image-rendering: pixelated; }
`;

const styleTag = '<style>';
const styleIdx = html.indexOf(styleTag);
if (styleIdx !== -1) {
  html = html.slice(0, styleIdx + styleTag.length) + stylePrefix + html.slice(styleIdx + styleTag.length);
}

// ===================== PATCH RENDERING FUNCTIONS =====================

// 3. Patch renderBoard: Replace emoji cell content with sprites
// Player icon: 🧙 → sprite
html = html.replace(
  /content = `<span class="player-icon">🧙<\/span>/g,
  "content = `<span class=\"player-icon\">${spriteImg('cell_player', cellSz-6)}</span>"
);

// Exit door: 🚪
html = html.replace(/underInfo = '🚪';/g, "underInfo = spriteImg('cell_exit', Math.floor(cellSz*0.4));");
html = html.replace(/content = '🚪';/g, "content = spriteImg('cell_exit', cellSz-8);");

// Entrance: 🔙
html = html.replace(/underInfo = '🔙';/g, "underInfo = spriteImg('cell_entrance', Math.floor(cellSz*0.4));");
html = html.replace(/content = '🔙';/g, "content = spriteImg('cell_entrance', cellSz-8);");

// Shop: 🏪
html = html.replace(/underInfo = '🏪';/g, "underInfo = spriteImg('cell_shop', Math.floor(cellSz*0.4));");
html = html.replace(/content = '🏪';/g, "content = spriteImg('cell_shop', cellSz-8);");

// Equipment sparkle: ✨ and treasure: 💎
html = html.replace(
  /content = isTreasure \? '💎' : '✨';/g,
  "content = isTreasure ? spriteImg('cell_treasure', cellSz-8) : spriteImg('cell_equipment', cellSz-8);"
);

// Gold: 💰
html = html.replace(/content = '💰';/g, "content = spriteImg('cell_gold', cellSz-8);");

// Danger hint: ❓
html = html.replace(
  /content = '❓';/g,
  "content = spriteImg('cell_danger', cellSz-8);"
);

// Monster icon on board: cell.monster.icon → monster sprite
html = html.replace(
  /content = cell\.monster\.icon;/g,
  "content = monsterSprite(cell.monster.name, cellSz-6) || cell.monster.icon;"
);

// NPC on board: cell.npc.icon or 👤
html = html.replace(
  /content = cell\.npc \? cell\.npc\.icon : '👤';/g,
  "content = cell.npc ? (npcSprite(cell.npc.id, cellSz-6) || cell.npc.icon) : spriteImg('cell_npc', cellSz-6);"
);

// NPC underinfo
html = html.replace(
  /underInfo = cell\.npc\.icon;/g,
  "underInfo = npcSprite(cell.npc.id, Math.floor(cellSz*0.4)) || cell.npc.icon;"
);

// Flag: 🚩
html = html.replace(/content = '🚩';/g, "content = spriteImg('cell_flag', cellSz-8);");

// 4. Patch NPC dialogue overlay: npc.icon → sprite
html = html.replace(
  /<div class="npc-icon">\$\{npc\.icon\}<\/div>/g,
  '<div class="npc-icon">${npcSprite(npc.id, 64) || npc.icon}</div>'
);

// 5. Patch combat header: monster icon
html = html.replace(
  /\$\{cs\.monster\.icon\} \$\{cs\.monster\.isBoss\?'BOSS: ':''\}\$\{cs\.monster\.name\}/g,
  "${(monsterSprite(cs.monster.name, 28) || cs.monster.icon)} ${cs.monster.isBoss?'BOSS: ':''}${cs.monster.name}"
);

// 6. Patch combat header: player icon 🧙 Bohater
html = html.replace(
  />🧙 Bohater<\/div>/g,
  ">${spriteImg('cell_player', 28)} Bohater</div>"
);

// 7. Patch paperdoll slot icons
// The slotDefs array with icons
html = html.replace(
  /{key:'helmet',label:'Helm',icon:'🪖',emptyIcon:'○',cls:'eq-slot-helmet'}/g,
  "{key:'helmet',label:'Helm',icon:'🪖',emptyIcon:'○',cls:'eq-slot-helmet',spriteKey:'slot_helmet'}"
);
// Actually, let's replace the icon rendering in the paperdoll loop instead
// Replace: const icon = hasItem ? sd.icon : sd.emptyIcon;
html = html.replace(
  /const icon = hasItem \? sd\.icon : sd\.emptyIcon;/g,
  "const icon = hasItem ? (slotSprite(sd.key, 28) || sd.icon) : (slotSprite(sd.key, 28) || sd.emptyIcon);"
);

// 8. Patch paperdoll body icon
html = html.replace(
  /<div class="paperdoll-body">🧍<\/div>/g,
  '<div class="paperdoll-body">${spriteImg(\'cell_player\', 64)}</div>'
);
// Fix: the paperdoll body is in a template literal already, need to be careful
// Actually it's inside a string concatenation, let me check
// equipHtml += `...🧍...`  - it's in a template literal
// The replace above should work since we're replacing the literal text

// 9. Patch consumable list icons
// ${c.icon} in consumable items → sprite
html = html.replace(
  /<span>\$\{c\.icon\}<\/span><span style="flex:1">\$\{c\.name\}<\/span>/g,
  '<span>${c.consumableId ? (consumableSprite(c.consumableId, 20) || c.icon) : c.icon}</span><span style="flex:1">${c.name}</span>'
);

// 10. Patch shop: consumable icons in buy/sell
html = html.replace(
  /\$\{c\.icon\} \$\{c\.name\}<\/div>/g,
  '${c.consumableId ? (consumableSprite(c.consumableId, 20) || c.icon) : c.icon} ${c.name}</div>'
);

// 11. Patch shop: item.icon prefix
html = html.replace(
  /const namePrefix = item\.icon \? item\.icon \+ ' ' : '';/g,
  "const namePrefix = item.isMapConsumable && item.consumableId ? (consumableSprite(item.consumableId, 20) + ' ' || (item.icon ? item.icon + ' ' : '')) : (item.icon ? item.icon + ' ' : '');"
);

// 12. Patch upgrade icons in menu
html = html.replace(
  /\$\{u\.icon\} \$\{u\.name\}/g,
  '${u.icon} ${u.name}'
  // Keep upgrades with emoji for now - they're stat icons that work fine as emoji
);

// 13. Patch combat stat comparison labels (keep emoji - they're small UI labels)
// These are fine as emoji: ⚔️ 🛡️ ⚡ 💨 🍀

// 14. Patch combat status icons (keep emoji for inline status text)
// These small inline status indicators work well as emoji

// 15. Patch log messages that reference monster icons
// addLog calls with monster.icon - these are text logs, sprites would be too complex
// Keep as emoji in log text

// 16. Preload combat monster sprite as Image for canvas rendering
spritesJS_combat = `
// Preloaded sprite images for canvas
const _spriteImageCache = {};
function getSpriteImage(key) {
  if (_spriteImageCache[key]) return _spriteImageCache[key];
  const src = SPRITES[key];
  if (!src) return null;
  const img = new Image();
  img.src = src;
  _spriteImageCache[key] = img;
  return img;
}
`;

// Add combat sprite preloader right after SPRITES object
const spritesEndMarker = "function spriteImg(key, size, cls) {";
const spritesEndIdx = html.indexOf(spritesEndMarker);
if (spritesEndIdx !== -1) {
  html = html.slice(0, spritesEndIdx) + spritesJS_combat + html.slice(spritesEndIdx);
}

// 17. Patch renderCombat() canvas - draw monster sprites at dynamic position
// The monster is drawn at (cs.mx, cs.my) with emoji or as pack units
// Find the "Draw monster(s)" section and replace with sprite-based rendering
const monsterDrawSearch = "// Draw monster(s)";
const monsterDrawIdx = html.indexOf(monsterDrawSearch);
if (monsterDrawIdx !== -1) {
  // Find end of the monster drawing block (ends before "// Melee range indicator")
  const monsterEndSearch = "// Melee range indicator";
  const monsterEndIdx = html.indexOf(monsterEndSearch, monsterDrawIdx);
  if (monsterEndIdx !== -1) {
    const monsterSpriteCode = `// Draw monster(s) with sprites
  if (cs.isPack) {
    cs.packUnits.forEach(u => {
      if (!u.alive) return;
      ctx.save();
      const mKey = MONSTER_SPRITE_MAP[cs.monster.name];
      const mImg = mKey ? getSpriteImage(mKey) : null;
      if (mImg && mImg.complete && mImg.naturalWidth > 0) {
        const mSize = 36;
        ctx.drawImage(mImg, u.x-mSize/2, u.y-mSize/2, mSize, mSize);
      } else {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff6644';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(u.icon, u.x, u.y);
      }
      // Unit HP bar
      const bw = 30, bh = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(u.x-bw/2, u.y+16, bw, bh);
      ctx.fillStyle = u.hp > u.maxHp*0.5 ? '#44ff44' : u.hp > u.maxHp*0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(u.x-bw/2, u.y+16, bw * (u.hp/u.maxHp), bh);
      ctx.restore();
      ctx.shadowBlur = 0;
    });
  } else {
    ctx.save();
    const mKey = MONSTER_SPRITE_MAP[cs.monster.name];
    const mImg = mKey ? getSpriteImage(mKey) : null;
    if (mImg && mImg.complete && mImg.naturalWidth > 0) {
      const mSize = cs.monster.isBoss ? 80 : 56;
      if (cs.frozen) { ctx.globalAlpha = 0.6; ctx.filter = 'hue-rotate(180deg)'; }
      ctx.drawImage(mImg, cs.mx-mSize/2, cs.my-mSize/2, mSize, mSize);
    } else {
      ctx.shadowBlur = 15;
      ctx.shadowColor = cs.monster.isBoss ? '#ff4444' : '#ff8844';
      ctx.font = cs.monster.isBoss ? '36px sans-serif' : '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cs.monster.icon, cs.mx, cs.my);
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  `;
    html = html.slice(0, monsterDrawIdx) + monsterSpriteCode + html.slice(monsterEndIdx);
  }
}

// 18. Patch player drawing on canvas with sprite
// The player is now drawn as an emoji at (cs.px, cs.py)
// Find the player drawing section and replace with sprite-based rendering
const playerGlowSearch = "// Player glow\n    ctx.shadowBlur = 12;";
const playerGlowIdx = html.indexOf(playerGlowSearch);
if (playerGlowIdx !== -1) {
  // Find end of emoji draw
  const emojiEnd = "ctx.fillText('🧙', cs.px, cs.py);";
  const emojiEndIdx = html.indexOf(emojiEnd, playerGlowIdx);
  if (emojiEndIdx !== -1) {
    const endOfBlock = emojiEndIdx + emojiEnd.length;
    const replacement = `// Player sprite or emoji fallback
    {
      const pImg = getSpriteImage('cell_player');
      if (pImg && pImg.complete && pImg.naturalWidth > 0) {
        const pDrawSize = cs.pSize * 3.5;
        ctx.drawImage(pImg, cs.px - pDrawSize/2, cs.py - pDrawSize/2, pDrawSize, pDrawSize);
      } else {
        ctx.shadowBlur = 12;
        ctx.shadowColor = cs.rageActive ? '#ff4444' : '#44ff44';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧙', cs.px, cs.py);
      }
    }`;
    html = html.slice(0, playerGlowIdx) + replacement + html.slice(endOfBlock);
  }
}

// ===================== TILE BACKGROUNDS =====================
console.log('Patchuje tla kafelkow...');

// Replace CSS cell backgrounds with tile sprites
if (sprites.tile_hidden) {
  // .cell-hidden background: fog-of-war tile with dark overlay
  html = html.replace(
    '.cell-hidden{background:linear-gradient(135deg,#2a2a4a,#1a1a3a);border:1px solid #444;}',
    `.cell-hidden{background:linear-gradient(135deg,rgba(30,30,60,0.55),rgba(15,15,40,0.55)),url('${sprites.tile_hidden}') center/cover;border:1px solid #444;}`
  );
  // .cell-hidden:hover - lighter overlay on hover
  html = html.replace(
    '.cell-hidden:hover{background:linear-gradient(135deg,#3a3a6a,#2a2a5a);border-color:#666;}',
    `.cell-hidden:hover{background:linear-gradient(135deg,rgba(50,50,90,0.5),rgba(35,35,70,0.5)),url('${sprites.tile_hidden}') center/cover;border-color:#666;}`
  );
  console.log('  -> tile_hidden: CSS zaktualizowany');
}

if (sprites.tile_revealed) {
  // .cell-revealed background: visible dungeon floor
  html = html.replace(
    '.cell-revealed{background:#0d0d20;border:1px solid #222;}',
    `.cell-revealed{background:url('${sprites.tile_revealed}') center/cover;border:1px solid #222;}`
  );
  console.log('  -> tile_revealed: CSS zaktualizowany');
}

if (sprites.tile_wall) {
  // Wall cells in renderBoard: replace solid color with wall tile
  html = html.replace(
    `boardHtml += \`<div class="\${cls}" style="width:\${cellSz}px;height:\${cellSz}px;font-size:\${fontSize};background:#1a1210;border:1px solid #2a1f18;cursor:default;opacity:.5;"></div>\`;`,
    `boardHtml += \`<div class="\${cls}" style="width:\${cellSz}px;height:\${cellSz}px;font-size:\${fontSize};background:url('\${SPRITES.tile_wall}') center/cover;border:1px solid #2a1f18;cursor:default;"></div>\`;`
  );
  console.log('  -> tile_wall: renderBoard zaktualizowany');
}

// ===================== WALL BORDER =====================
console.log('Patchuje sciane dookola poziomu...');

// Enforce wall border: after generateMapMask builds the mask, force edges to false
html = html.replace(
  '  return mask;\n}',
  '  // Enforce wall border around the map\n  for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++) { if(yy===0||yy===h-1||xx===0||xx===w-1) mask[yy][xx]=false; }\n  return mask;\n}'
);
console.log('  -> generateMapMask: sciana dookola dodana');

// Increase board dimensions by 2 to compensate for wall border
html = html.replace(
  'const w = Math.min(18, 9 + lvl);',
  'const w = Math.min(20, 11 + lvl);'
);
html = html.replace(
  'const h = Math.min(14, 7 + lvl);',
  'const h = Math.min(16, 9 + lvl);'
);
console.log('  -> generateBoard: wymiary powiekszone o 2 (kompensacja sciany)');

// ===================== SAVE PATCHED HTML =====================
fs.writeFileSync(GAME_FILE, html);
console.log(`\n=== PATCH GOTOWY ===`);
console.log(`Zmodyfikowano: index.html`);
console.log(`Backup: index_backup.html`);
console.log(`Zaladowane sprity: ${loaded}`);
console.log(`\nOtworz index.html w przegladarce i sprawdz!`);
