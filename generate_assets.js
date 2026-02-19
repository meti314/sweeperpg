#!/usr/bin/env node
// generate_assets.js v2 — Flat style 64x64 sprites z prawdziwa przezroczystoscia
// Uzycie: node generate_assets.js [OPENAI_API_KEY]

const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const API_KEY = process.argv[2] || process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Brak klucza API! Uzyj: node generate_assets.js <OPENAI_API_KEY>');
  console.error('Lub ustaw env OPENAI_API_KEY');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, 'assets');
const RAW_DIR = path.join(ASSETS_DIR, 'raw');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'manifest.json');
const OUTPUT_SIZE = 64;

// Flat style — prosty, czytelny w 64x64, solid magenta background dla łatwego bg removal
const STYLE = 'simple flat 2D game icon, bold black outlines, minimal shading, solid bright colors, centered sprite, chibi proportions, on solid magenta #FF00FF background, no shadows, no gradients, no text';

const STYLE_NPC = 'simple flat 2D RPG portrait icon, bold black outlines, minimal shading, solid bright colors, bust portrait upper body, chibi proportions, on solid magenta #FF00FF background, no shadows, no gradients, no text';

const STYLE_ITEM = 'simple flat 2D game item icon, bold black outlines, minimal shading, solid bright colors, single centered object, on solid magenta #FF00FF background, no shadows, no gradients, no text';

const STYLE_TILE = 'simple flat 2D dungeon tile icon, bold black outlines, minimal shading, solid bright colors, top-down or front view, on solid magenta #FF00FF background, no shadows, no gradients, no text';

const STYLE_UI = 'simple flat 2D RPG UI element, bold outlines, minimal shading, solid colors, on solid magenta #FF00FF background, no shadows, no gradients, no text';

// ===================== ASSET DEFINITIONS =====================
const ASSETS = [
  // ---- MONSTERS: TIER 0 ----
  { key: 'monster_karaluch', file: 'monster_karaluch.png',
    prompt: `${STYLE}, brown cockroach bug monster, small, antennae, front view` },
  { key: 'monster_szczur_maly', file: 'monster_szczur_maly.png',
    prompt: `${STYLE}, small grey rat, red eyes, front view` },
  { key: 'monster_grzyb', file: 'monster_grzyb.png',
    prompt: `${STYLE}, purple poisonous mushroom creature with angry face, front view` },
  { key: 'monster_robak', file: 'monster_robak.png',
    prompt: `${STYLE}, brown segmented worm creature, teeth, side view` },
  { key: 'monster_stonozka', file: 'monster_stonozka.png',
    prompt: `${STYLE}, red centipede creature, many legs, pincers, front view` },

  // ---- MONSTERS: TIER 1 ----
  { key: 'monster_sluz', file: 'monster_sluz.png',
    prompt: `${STYLE}, green slime blob, dripping, evil grin, front view` },
  { key: 'monster_szczur', file: 'monster_szczur.png',
    prompt: `${STYLE}, large dark brown rat, scarred, aggressive, front view` },
  { key: 'monster_nietoperz', file: 'monster_nietoperz.png',
    prompt: `${STYLE}, purple bat, wings spread, fangs, flying, front view` },
  { key: 'monster_pajak', file: 'monster_pajak.png',
    prompt: `${STYLE}, black spider, eight red eyes, front view` },
  { key: 'monster_mala_sluz', file: 'monster_mala_sluz.png',
    prompt: `${STYLE}, small blue water droplet slime, cute, front view` },

  // ---- MONSTERS: TIER 2 ----
  { key: 'monster_szkielet', file: 'monster_szkielet.png',
    prompt: `${STYLE}, skeleton warrior with sword, glowing eyes, front view` },
  { key: 'monster_goblin', file: 'monster_goblin.png',
    prompt: `${STYLE}, green goblin with dagger, sneering, front view` },
  { key: 'monster_zombie', file: 'monster_zombie.png',
    prompt: `${STYLE}, green-skinned undead creature, tattered clothes, glowing eyes, fantasy RPG enemy, front view` },
  { key: 'monster_wilk', file: 'monster_wilk.png',
    prompt: `${STYLE}, grey dire wolf, yellow eyes, snarling, front view` },

  // ---- MONSTERS: TIER 3 ----
  { key: 'monster_ork', file: 'monster_ork.png',
    prompt: `${STYLE}, green orc warrior with axe, tusks, muscular, front view` },
  { key: 'monster_duch', file: 'monster_duch.png',
    prompt: `${STYLE}, white-blue translucent ghost, floating, spooky, front view` },
  { key: 'monster_mroczny_mag', file: 'monster_mroczny_mag.png',
    prompt: `${STYLE}, dark mage in black robe, purple magic staff, hooded, front view` },
  { key: 'monster_troll', file: 'monster_troll.png',
    prompt: `${STYLE}, large grey-green troll with club, tiny eyes, front view` },
  { key: 'monster_bandyta', file: 'monster_bandyta.png',
    prompt: `${STYLE}, masked bandit with two daggers, dark hood, front view` },

  // ---- MONSTERS: TIER 4 ----
  { key: 'monster_ognisty_zywiolak', file: 'monster_ognisty_zywiolak.png',
    prompt: `${STYLE}, fire elemental, body of orange flames, floating, front view` },
  { key: 'monster_lodowy_zywiolak', file: 'monster_lodowy_zywiolak.png',
    prompt: `${STYLE}, ice elemental, body of blue ice crystals, floating, front view` },
  { key: 'monster_golem', file: 'monster_golem.png',
    prompt: `${STYLE}, stone golem, massive rocky body, glowing rune on chest, front view` },
  { key: 'monster_wampir', file: 'monster_wampir.png',
    prompt: `${STYLE}, vampire lord, pale face, red cape, fangs, front view` },
  { key: 'monster_bazyliszek', file: 'monster_bazyliszek.png',
    prompt: `${STYLE}, green serpent basilisk with crown crest, front view` },

  // ---- MONSTERS: TIER 5 ----
  { key: 'monster_upior', file: 'monster_upior.png',
    prompt: `${STYLE}, dark wraith, red glowing eyes, clawed hands, floating, front view` },
  { key: 'monster_smocze_piskle', file: 'monster_smocze_piskle.png',
    prompt: `${STYLE}, small red baby dragon, tiny wings, breathing fire, cute, front view` },
  { key: 'monster_demon', file: 'monster_demon.png',
    prompt: `${STYLE}, red demon with horns, bat wings, muscular, front view` },
  { key: 'monster_lich', file: 'monster_lich.png',
    prompt: `${STYLE}, skeletal lich sorcerer, crown, purple robe, necromantic orb, front view` },
  { key: 'monster_smok', file: 'monster_smok.png',
    prompt: `${STYLE}, large red dragon, wings spread, breathing fire, front view` },

  // ---- TIER 6-10 MONSTERS ----
  { key: 'monster_mroczny_rycerz', file: 'monster_mroczny_rycerz.png',
    prompt: `${STYLE}, dark knight in black armor, glowing red visor, dark sword, front view` },
  { key: 'monster_chimera', file: 'monster_chimera.png',
    prompt: `${STYLE}, chimera lion head goat body snake tail, three heads, front view` },
  { key: 'monster_banszi', file: 'monster_banszi.png',
    prompt: `${STYLE}, banshee ghost woman, screaming, white wispy hair, front view` },
  { key: 'monster_tropiciel_cieni', file: 'monster_tropiciel_cieni.png',
    prompt: `${STYLE}, shadow stalker, dark figure with glowing white eyes, daggers, stealthy, front view` },
  { key: 'monster_lawowy_golem', file: 'monster_lawowy_golem.png',
    prompt: `${STYLE}, lava golem, cracked rock body with glowing orange magma, massive, front view` },
  { key: 'monster_rycerz_smierci', file: 'monster_rycerz_smierci.png',
    prompt: `${STYLE}, death knight, skeletal face in heavy dark armor, unholy aura, front view` },
  { key: 'monster_pradawny_smok', file: 'monster_pradawny_smok.png',
    prompt: `${STYLE}, ancient dragon, very old and large, scarred scales, breathing golden fire, front view` },
  { key: 'monster_plugawiec', file: 'monster_plugawiec.png',
    prompt: `${STYLE}, mind flayer, tentacle face, purple skin, psychic glow, front view` },
  { key: 'monster_demon_otchlani', file: 'monster_demon_otchlani.png',
    prompt: `${STYLE}, abyss demon, huge red body, massive horns, fiery wings, front view` },
  { key: 'monster_mrozny_wyrm', file: 'monster_mrozny_wyrm.png',
    prompt: `${STYLE}, frost wyrm, ice serpent, frozen blue scales, icy breath, front view` },
  { key: 'monster_pustkowiec', file: 'monster_pustkowiec.png',
    prompt: `${STYLE}, void walker, ethereal shifting figure, purple void energy, front view` },
  { key: 'monster_arcydemon', file: 'monster_arcydemon.png',
    prompt: `${STYLE}, archdemon, massive red demon, throne of skulls, hellfire, front view` },
  { key: 'monster_zniwiarz_dusz', file: 'monster_zniwiarz_dusz.png',
    prompt: `${STYLE}, soul reaper, skeleton in dark robes, glowing scythe, ghostly souls, front view` },
  { key: 'monster_krysztalowy_kolos', file: 'monster_krysztalowy_kolos.png',
    prompt: `${STYLE}, crystal colossus, massive body made of glowing crystals, front view` },
  { key: 'monster_starszy_lich', file: 'monster_starszy_lich.png',
    prompt: `${STYLE}, elder lich, ancient skeletal mage, golden crown, powerful dark magic orb, front view` },
  { key: 'monster_tytan', file: 'monster_tytan.png',
    prompt: `${STYLE}, stone titan, enormous humanoid of rock, ancient runes on body, front view` },
  { key: 'monster_zywiolak_chaosu', file: 'monster_zywiolak_chaosu.png',
    prompt: `${STYLE}, chaos elemental, swirling fire ice wind earth, four elements combined, front view` },
  { key: 'monster_koszmar', file: 'monster_koszmar.png',
    prompt: `${STYLE}, nightmare creature, dark formless horror with many teeth and eyes, front view` },
  { key: 'monster_krol_otchlani', file: 'monster_krol_otchlani.png',
    prompt: `${STYLE}, king of the abyss, demon king, dark crown, massive, dark throne, front view` },
  { key: 'monster_smok_cienia', file: 'monster_smok_cienia.png',
    prompt: `${STYLE}, shadow dragon, dark ethereal dragon, void breath, glowing purple eyes, front view` },
  { key: 'monster_wladca_pustki', file: 'monster_wladca_pustki.png',
    prompt: `${STYLE}, void lord, being of pure nothingness, warping reality around it, front view` },
  // Pack monsters
  { key: 'monster_stado_szczurow', file: 'monster_stado_szczurow.png',
    prompt: `${STYLE}, pack of three rats, swarming together, red eyes, front view` },
  { key: 'monster_chmara_nietoperzy', file: 'monster_chmara_nietoperzy.png',
    prompt: `${STYLE}, swarm of bats, three bats flying together, dark wings, front view` },
  { key: 'monster_sfora_wilkow', file: 'monster_sfora_wilkow.png',
    prompt: `${STYLE}, wolf pack, three dark wolves snarling together, front view` },
  { key: 'monster_roj_duchow', file: 'monster_roj_duchow.png',
    prompt: `${STYLE}, ghost swarm, four ghostly spirits floating together, eerie glow, front view` },

  // ---- BOSSES ----
  { key: 'boss_krol_goblinow', file: 'boss_krol_goblinow.png',
    prompt: `${STYLE}, goblin king with tin crown and scepter, large, menacing grin, front view, boss enemy` },
  { key: 'boss_nekromanta', file: 'boss_nekromanta.png',
    prompt: `${STYLE}, necromancer boss, skull staff, dark purple robe, undead spirits around, front view` },
  { key: 'boss_ognisty_wladca', file: 'boss_ognisty_wladca.png',
    prompt: `${STYLE}, fire lord boss, molten armor, fire crown, massive, front view` },
  { key: 'boss_straznik_otchlani', file: 'boss_straznik_otchlani.png',
    prompt: `${STYLE}, eldritch guardian boss, single massive eye, dark tentacles, front view` },
  { key: 'boss_cien', file: 'boss_cien.png',
    prompt: `${STYLE}, shadow king boss, ghostly dark figure, crown of shadows, red eyes, front view` },
  // New bosses (tiers 6-10)
  { key: 'boss_krolowa_chimer', file: 'boss_krolowa_chimer.png',
    prompt: `${STYLE}, chimera queen boss, three heads lion goat dragon, massive, front view, boss enemy` },
  { key: 'boss_pradawny_nekromanta', file: 'boss_pradawny_nekromanta.png',
    prompt: `${STYLE}, ancient necromancer boss, skeletal, dark robes, army of undead, front view, boss enemy` },
  { key: 'boss_zelazny_wladca', file: 'boss_zelazny_wladca.png',
    prompt: `${STYLE}, iron lord boss, mechanical construct, gears and metal, massive, front view, boss enemy` },
  { key: 'boss_avatar_zarkotha', file: 'boss_avatar_zarkotha.png',
    prompt: `${STYLE}, dark king avatar, shadow lord, crown of darkness, purple energy, front view, boss enemy` },
  { key: 'boss_serce_otchlani', file: 'boss_serce_otchlani.png',
    prompt: `${STYLE}, heart of the abyss boss, pulsating dark heart, tentacles, red glow, final boss, front view` },

  // ---- NPCs ----
  { key: 'npc_borek', file: 'npc_borek.png',
    prompt: `${STYLE_NPC}, old bearded warrior, scarred face, warm smile, retired soldier` },
  { key: 'npc_mirela', file: 'npc_mirela.png',
    prompt: `${STYLE_NPC}, female scientist, goggles on forehead, messy hair, lab coat, holding flask` },
  { key: 'npc_grzegorz', file: 'npc_grzegorz.png',
    prompt: `${STYLE_NPC}, old merchant, grey hair, traveling cloak, tired eyes` },
  { key: 'npc_xardas', file: 'npc_xardas.png',
    prompt: `${STYLE_NPC}, jovial wizard, long beard, pointy hat with stars, twinkling eyes` },
  { key: 'npc_kasia', file: 'npc_kasia.png',
    prompt: `${STYLE_NPC}, brave little girl, messy pigtails, determined eyes, holding a rock` },
  { key: 'npc_aelindra', file: 'npc_aelindra.png',
    prompt: `${STYLE_NPC}, elf ranger, pointed ears, silver hair, green cloak, elegant` },
  { key: 'npc_bromir', file: 'npc_bromir.png',
    prompt: `${STYLE_NPC}, dwarf blacksmith, thick red beard, mining helmet, leather apron, hammer` },
  { key: 'npc_aldric', file: 'npc_aldric.png',
    prompt: `${STYLE_NPC}, ghost knight, translucent blue, medieval armor, noble face, spectral` },

  // ---- MAP / CELL ICONS ----
  { key: 'cell_player', file: 'cell_player.png',
    prompt: `${STYLE_TILE}, mage character, purple robe, glowing staff, front view` },
  { key: 'cell_exit', file: 'cell_exit.png',
    prompt: `${STYLE_TILE}, wooden dungeon door with iron bands, front view` },
  { key: 'cell_entrance', file: 'cell_entrance.png',
    prompt: `${STYLE_TILE}, stone staircase going up, front view` },
  { key: 'cell_gold', file: 'cell_gold.png',
    prompt: `${STYLE_ITEM}, pile of gold coins, shiny` },
  { key: 'cell_equipment', file: 'cell_equipment.png',
    prompt: `${STYLE_ITEM}, wooden treasure chest slightly open, sparkles` },
  { key: 'cell_treasure', file: 'cell_treasure.png',
    prompt: `${STYLE_ITEM}, golden ornate treasure chest with gems, glowing` },
  { key: 'cell_shop', file: 'cell_shop.png',
    prompt: `${STYLE_TILE}, small merchant tent with items on table, lantern` },
  { key: 'cell_flag', file: 'cell_flag.png',
    prompt: `${STYLE_ITEM}, small red warning flag on stick` },
  { key: 'cell_danger', file: 'cell_danger.png',
    prompt: `${STYLE_ITEM}, red question mark symbol, danger warning` },
  { key: 'cell_npc', file: 'cell_npc.png',
    prompt: `${STYLE_TILE}, friendly NPC figure silhouette with speech bubble above` },
  { key: 'cell_potion', file: 'cell_potion.png',
    prompt: `${STYLE_ITEM}, red health potion bottle, glass flask with cork` },
  { key: 'cell_hidden', file: 'cell_hidden.png',
    prompt: `${STYLE_TILE}, dark stone floor tile with cobwebs, mysterious fog` },

  // ---- EQUIPMENT SLOT ICONS ----
  { key: 'slot_helmet', file: 'slot_helmet.png',
    prompt: `${STYLE_ITEM}, iron medieval helmet with visor` },
  { key: 'slot_armor', file: 'slot_armor.png',
    prompt: `${STYLE_ITEM}, steel chest breastplate armor` },
  { key: 'slot_weapon', file: 'slot_weapon.png',
    prompt: `${STYLE_ITEM}, medieval longsword` },
  { key: 'slot_shield', file: 'slot_shield.png',
    prompt: `${STYLE_ITEM}, round wooden shield with iron rim` },
  { key: 'slot_bracers', file: 'slot_bracers.png',
    prompt: `${STYLE_ITEM}, leather arm bracers gauntlets` },
  { key: 'slot_accessory', file: 'slot_accessory.png',
    prompt: `${STYLE_ITEM}, golden ring with glowing blue gem` },
  { key: 'slot_boots', file: 'slot_boots.png',
    prompt: `${STYLE_ITEM}, brown leather adventure boots` },
  { key: 'slot_special', file: 'slot_special.png',
    prompt: `${STYLE_ITEM}, glowing purple crystal ball on stand` },

  // ---- CONSUMABLES ----
  { key: 'consumable_zwoj', file: 'consumable_zwoj.png',
    prompt: `${STYLE_ITEM}, rolled magic scroll with glowing runes` },
  { key: 'consumable_krysztal', file: 'consumable_krysztal.png',
    prompt: `${STYLE_ITEM}, purple tracking crystal, pulsing glow` },
  { key: 'consumable_luneta', file: 'consumable_luneta.png',
    prompt: `${STYLE_ITEM}, brass telescope spyglass` },
  { key: 'consumable_kompas', file: 'consumable_kompas.png',
    prompt: `${STYLE_ITEM}, golden compass with gem needle` },
  { key: 'consumable_kamien', file: 'consumable_kamien.png',
    prompt: `${STYLE_ITEM}, glowing blue rune stone, shield symbol` },

  // ---- STATUS EFFECTS ----
  { key: 'status_trucizna', file: 'status_trucizna.png',
    prompt: `${STYLE_ITEM}, green skull icon, dripping poison` },
  { key: 'status_spowolnienie', file: 'status_spowolnienie.png',
    prompt: `${STYLE_ITEM}, blue snail shell, slow debuff icon` },
  { key: 'status_oslabienie', file: 'status_oslabienie.png',
    prompt: `${STYLE_ITEM}, broken red heart icon, weakness` },
  { key: 'status_krwawienie', file: 'status_krwawienie.png',
    prompt: `${STYLE_ITEM}, red blood drops icon` },
  { key: 'status_ogluszenie', file: 'status_ogluszenie.png',
    prompt: `${STYLE_ITEM}, spinning yellow stars icon, stun` },
  { key: 'status_ogien', file: 'status_ogien.png',
    prompt: `${STYLE_ITEM}, orange fire flame icon, burning` },
  { key: 'status_lod', file: 'status_lod.png',
    prompt: `${STYLE_ITEM}, blue ice crystal snowflake icon, frozen` },
  { key: 'status_szal', file: 'status_szal.png',
    prompt: `${STYLE_ITEM}, red angry face icon with veins, rage berserk` },

  // ---- UI ELEMENTS ----
  { key: 'ui_panel_bg', file: 'ui_panel_bg.png',
    prompt: `${STYLE_UI}, dark grey stone panel texture, dungeon wall, square tile` },
  { key: 'ui_button', file: 'ui_button.png',
    prompt: `${STYLE_UI}, golden RPG button, ornate border, rectangular` },
  { key: 'ui_cell_frame', file: 'ui_cell_frame.png',
    prompt: `${STYLE_UI}, stone tile frame border, square` },
  { key: 'ui_board_border', file: 'ui_board_border.png',
    prompt: `${STYLE_UI}, dungeon stone wall border pattern, horizontal strip` },

  // ---- TILE TEXTURES (no bg removal — fill entire cell) ----
  { key: 'tile_revealed', file: 'tile_revealed.png', skipBgRemoval: true,
    prompt: 'seamless tileable 2D pixel art dungeon floor texture, top-down view, light grey cobblestone, warm torchlit, very subtle cracks and mortar lines, no objects, no text, minimal detail, 16-bit retro game style' },
  { key: 'tile_hidden', file: 'tile_hidden.png', skipBgRemoval: true,
    prompt: 'seamless tileable 2D pixel art dungeon floor texture, top-down view, dark stone floor covered in thick mysterious fog, fog of war, very dark, barely visible stones underneath, no objects, no text, 16-bit retro game style' },
  { key: 'tile_wall', file: 'tile_wall.png', skipBgRemoval: true,
    prompt: 'seamless tileable 2D pixel art dungeon wall texture, front view, dark rough stone bricks, dark grey-brown mortar, cracks, no objects, no text, 16-bit retro game style' },
];

// ===================== API CALL =====================
function callDallE(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message || JSON.stringify(json.error)));
          else if (json.data && json.data[0] && json.data[0].url) resolve(json.data[0].url);
          else reject(new Error('Unexpected: ' + data.substring(0, 200)));
        } catch (e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===================== DOWNLOAD =====================
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const doGet = (u) => {
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doGet(res.headers.location); return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    };
    doGet(url);
  });
}

// ===================== POST-PROCESSING =====================
// Usuwa tlo (magenta lub najczestszy kolor naroznikow) i resizuje do 64x64
async function processImage(inputBuffer, skipBgRemoval) {
  // For tiles: just resize, no background removal
  if (skipBgRemoval) {
    return await sharp(inputBuffer)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
        kernel: 'lanczos3',
        fit: 'cover'
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // 1. Get raw RGBA pixels at original size
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 2. Sample corner pixels to detect background color
  const corners = [
    [0, 0], [width-1, 0], [0, height-1], [width-1, height-1],
    [5, 5], [width-6, 5], [5, height-6], [width-6, height-6],
    [10, 10], [width-11, 10], [10, height-11], [width-11, height-11],
  ];

  // Get most common corner color
  const colorCounts = {};
  for (const [x, y] of corners) {
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // Quantize to reduce noise (round to nearest 8)
    const qr = Math.round(r/8)*8, qg = Math.round(g/8)*8, qb = Math.round(b/8)*8;
    const key = `${qr},${qg},${qb}`;
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }
  const bgColorKey = Object.entries(colorCounts).sort((a,b) => b[1] - a[1])[0][0];
  const [bgR, bgG, bgB] = bgColorKey.split(',').map(Number);

  // 3. Remove background with tolerance (flood-fill from edges)
  const TOLERANCE = 60; // color distance tolerance
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed from all edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(x); // top row
    queue.push((height-1) * width + x); // bottom row
  }
  for (let y = 1; y < height-1; y++) {
    queue.push(y * width); // left col
    queue.push(y * width + width - 1); // right col
  }

  function isBackground(idx) {
    const r = data[idx * channels];
    const g = data[idx * channels + 1];
    const b = data[idx * channels + 2];
    const dr = r - bgR, dg = g - bgG, db = b - bgB;
    return Math.sqrt(dr*dr + dg*dg + db*db) < TOLERANCE;
  }

  // BFS flood fill from edges
  let qi = 0;
  while (qi < queue.length) {
    const pos = queue[qi++];
    if (pos < 0 || pos >= width * height || visited[pos]) continue;
    if (!isBackground(pos)) continue;

    visited[pos] = 1;
    // Set alpha to 0
    data[pos * channels + 3] = 0;

    const x = pos % width, y = Math.floor(pos / width);
    if (x > 0) queue.push(pos - 1);
    if (x < width-1) queue.push(pos + 1);
    if (y > 0) queue.push(pos - width);
    if (y < height-1) queue.push(pos + width);
  }

  // 4. Also make near-edge semi-transparent pixels smoother
  // Anti-alias: pixels touching transparent ones with bg-like color get reduced alpha
  for (let y = 1; y < height-1; y++) {
    for (let x = 1; x < width-1; x++) {
      const pos = y * width + x;
      if (visited[pos]) continue; // already transparent
      const idx = pos * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const dr = r - bgR, dg = g - bgG, db = b - bgB;
      const dist = Math.sqrt(dr*dr + dg*dg + db*db);

      // Check if any neighbor is transparent
      const neighbors = [pos-1, pos+1, pos-width, pos+width];
      const hasTransparentNeighbor = neighbors.some(n => visited[n]);

      if (hasTransparentNeighbor && dist < TOLERANCE * 1.5) {
        // Fade alpha based on distance from bg color
        const alpha = Math.min(255, Math.floor((dist / (TOLERANCE * 1.5)) * 255));
        data[idx + 3] = alpha;
      }
    }
  }

  // 5. Create image from processed pixels and resize to 64x64
  const processed = await sharp(data, { raw: { width, height, channels } })
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      kernel: 'lanczos3',  // smooth downscale (better than nearest for 1024->64)
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return processed;
}

// ===================== MAIN =====================
async function main() {
  for (const dir of [ASSETS_DIR, RAW_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch(e) {}
  }

  const total = ASSETS.length;
  let done = 0, skipped = 0, errors = 0;

  console.log(`\n=== SweeperRPG Asset Generator v2 ===`);
  console.log(`Styl: flat, 64x64, prawdziwa przezroczystosc`);
  console.log(`Assetow: ${total}`);
  console.log(`Katalog: ${ASSETS_DIR}\n`);

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const outPath = path.join(ASSETS_DIR, asset.file);
    const rawPath = path.join(RAW_DIR, asset.file);
    done++;

    // Skip if final file exists (resume support)
    if (fs.existsSync(outPath) && manifest[asset.key]) {
      skipped++;
      console.log(`[${done}/${total}] SKIP: ${asset.key}`);
      continue;
    }

    console.log(`[${done}/${total}] Generuje: ${asset.key}...`);

    try {
      let rawBuffer;

      // Use existing raw if available (only need to re-process)
      if (fs.existsSync(rawPath)) {
        console.log(`  -> Uzywam istniejacego raw...`);
        rawBuffer = fs.readFileSync(rawPath);
      } else {
        const url = await callDallE(asset.prompt);
        console.log(`  -> Pobieranie...`);
        rawBuffer = await downloadBuffer(url);
        fs.writeFileSync(rawPath, rawBuffer);
      }

      // Post-process: bg removal + resize
      console.log(`  -> Przetwarzanie (${asset.skipBgRemoval ? 'resize' : 'bg removal + resize'} 64x64)...`);
      const processed = await processImage(rawBuffer, asset.skipBgRemoval);
      fs.writeFileSync(outPath, processed);

      manifest[asset.key] = asset.file;
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

      const sizeKB = (processed.length / 1024).toFixed(1);
      console.log(`  -> OK: ${asset.file} (${sizeKB} KB)`);

      // Rate limit: 12s between API calls (skip if we used cached raw)
      if (!fs.existsSync(rawPath) || rawBuffer.length > 0) {
        if (done < total && !fs.existsSync(path.join(RAW_DIR, ASSETS[i+1]?.file || ''))) {
          console.log(`  -> Czekam 12s...`);
          await new Promise(r => setTimeout(r, 12000));
        }
      }
    } catch (err) {
      errors++;
      console.error(`  -> BLAD: ${err.message}`);
      if (err.message.includes('Rate limit') || err.message.includes('429')) {
        console.log(`  -> Rate limit! Czekam 60s...`);
        await new Promise(r => setTimeout(r, 60000));
        i--; done--; errors--; // retry
      }
      if (err.message.includes('safety')) {
        console.log(`  -> Safety filter - pomijam, dogeneruj reczne`);
      }
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n=== GOTOWE ===`);
  console.log(`Wygenerowano: ${total - skipped - errors}`);
  console.log(`Pominieto: ${skipped}`);
  console.log(`Bledy: ${errors}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`\nNastepny krok: node patch_game.js`);
}

main().catch(err => {
  console.error('Krytyczny blad:', err);
  process.exit(1);
});
