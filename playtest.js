const puppeteer = require('puppeteer');
const path = require('path');

const GAME_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const TICK = 150;       // ms between actions
const COMBAT_TIMEOUT = 120000; // max ms to wait for auto-play combat (2min for time-accel)
const COMBAT_POLL = 200;      // ms between combat state polls
const MAX_STUCK = 40;   // max ticks without progress before fallback
const MAX_LEVEL = parseInt(process.argv[2]) || 20; // pass target level as CLI arg

// Feedback collector
const feedback = {
  weaponsFound: [],
  weaponsSeen: [],       // all weapons encountered (shop + loot)
  shopOfferings: [],     // per-level shop contents
  questsAccepted: [],
  questsCompleted: [],
  levelsReached: [],
  deathCount: 0,
  itemsDiscarded: [],
  goldSpent: 0,
  monstersKilled: 0,
  chaptersCompleted: [],
  issues: [],            // potential bugs/balance issues
  timeline: [],          // major events log
};

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
  feedback.timeline.push(`[${ts}] ${msg}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  // Enable debug mode + time acceleration
  await page.evaluate(() => { window.debugMode = true; window.simSpeed = 4; });
  await page.click('#debugCheckbox');
  log('Debug mode ON, simSpeed=4x');

  // Start new game
  await sleep(500);
  await page.evaluate(() => { newGame(); });
  log('New game started');
  await sleep(800);

  // Enter dungeon from intro
  await page.evaluate(() => { startFromIntro(); });
  log('Entered dungeon');
  await sleep(500);

  // Main game loop
  let running = true;
  let stuckCounter = 0;
  let lastLevel = 0;
  let lastMonstersKilled = 0;

  while (running) {
    let state;
    try {
      state = await page.evaluate(() => {
        if (!game) return { screen: 'none' };
        return {
          screen: game.screen,
          level: game.level,
          hp: game.player ? game.player.hp : 0,
          maxHp: game.player ? getPlayerStats().maxHp : 0,
          gold: game.gold,
          mana: game.player ? game.player.mana : 0,
          monstersKilled: game.monstersKilled || 0,
          mainQuestStage: game.mainQuest ? game.mainQuest.stage : 0,
          mainQuestProgress: game.mainQuest ? game.mainQuest.progress : 0,
          mainQuestTotal: typeof MAIN_STORY !== 'undefined' && game.mainQuest
            ? (MAIN_STORY[game.mainQuest.stage] ? MAIN_STORY[game.mainQuest.stage].target : '?') : '?',
          px: game.playerPos ? game.playerPos.x : -1,
          py: game.playerPos ? game.playerPos.y : -1,
          boardW: game.boardW,
          boardH: game.boardH,
          questCount: game.quests ? game.quests.length : 0,
          inventoryCount: game.inventory ? game.inventory.length : 0,
          weaponName: game.equipment && game.equipment.weapon ? game.equipment.weapon.name : 'brak',
        };
      });
    } catch(e) {
      await sleep(500);
      continue;
    }

    // Track level changes
    if (state.level !== lastLevel) {
      log(`=== LEVEL ${state.level} === HP:${state.hp}/${state.maxHp} Gold:${state.gold} Weapon:${state.weaponName} Quest:${state.mainQuestStage}/${10}`);
      feedback.levelsReached.push(state.level);
      lastLevel = state.level;
      stuckCounter = 0;
      if (state.level > MAX_LEVEL) {
        log(`TARGET LEVEL ${MAX_LEVEL} REACHED — stopping session`);
        running = false;
        break;
      }
    }

    // Track kills
    if (state.monstersKilled !== lastMonstersKilled) {
      stuckCounter = 0;
      lastMonstersKilled = state.monstersKilled;
    }

    // Check win condition
    if (state.mainQuestStage >= 10) {
      log('GAME WON! All 10 chapters completed!');
      running = false;
      break;
    }

    // Handle different screens
    switch (state.screen) {
      case 'board':
        // Dismiss any quest overlay that might be blocking
        await page.evaluate(() => {
          const overlay = document.querySelector('.quest-complete-overlay');
          if (overlay) { try { dismissQuestComplete(); } catch(e) { overlay.remove(); } }
        });
        stuckCounter++;
        await handleBoard(page, state);
        break;

      case 'combat':
        stuckCounter = 0;
        await handleCombat(page);
        break;

      case 'itemfound':
        stuckCounter = 0;
        await handleItemFound(page);
        break;

      case 'shop':
        stuckCounter = 0;
        // Check if shop already visited (re-entry from pathing through)
        const shopRevisit = await page.evaluate(() => {
          if (!game._visitedCells) game._visitedCells = {};
          const k = game.playerPos.x + ',' + game.playerPos.y;
          if (game._visitedCells[k]) return true;
          game._visitedCells[k] = true;
          return false;
        });
        if (shopRevisit) {
          await page.evaluate(() => { closeShop(); });
          await sleep(200);
        } else {
          await handleShop(page, state);
        }
        break;

      case 'puzzle':
        stuckCounter = 0;
        // Auto-solve minigame (debugMode auto-solves, but just in case)
        await page.evaluate(() => {
          if(game.puzzleState && !game.puzzleState.solved && !game.puzzleState.failed) {
            if(typeof autoSolveMinigame === 'function') autoSolveMinigame();
            else { game.puzzleState.solved = true; }
          }
          if(game.puzzleState && (game.puzzleState.solved || game.puzzleState.failed)) closePuzzle();
        });
        await sleep(300);
        break;

      case 'dialogue':
        stuckCounter = 0;
        // Check if NPC already visited (re-entry from pathing through)
        const npcRevisit = await page.evaluate(() => {
          if (!game._visitedCells) game._visitedCells = {};
          const k = game.playerPos.x + ',' + game.playerPos.y;
          if (game._visitedCells[k]) return true;
          game._visitedCells[k] = true;
          return false;
        });
        if (npcRevisit) {
          await page.evaluate(() => { closeDialogue(); });
          await sleep(200);
        } else {
          await handleDialogue(page);
        }
        break;

      case 'levelcomplete':
        stuckCounter = 0;
        await handleLevelComplete(page);
        break;

      case 'gameover':
        stuckCounter = 0;
        feedback.deathCount++;
        log('GAME OVER - restarting');
        await page.evaluate(() => { game = { screen: 'menu' }; render(); });
        await sleep(500);
        await page.evaluate(() => { newGame(); });
        await sleep(500);
        await page.evaluate(() => { startFromIntro(); });
        await sleep(500);
        // Reset node tracking on new game
        await page.evaluate(() => {
          game._visitedCells = {};
          game._visitedPerNode = {};
          game._exploredNodes = {};
          game._npcsDone = {};
        });
        break;

      default:
        // quest complete popup or other overlay
        await page.evaluate(() => {
          if (typeof dismissQuestComplete === 'function') {
            try { dismissQuestComplete(); } catch(e) {}
          }
        });
        await sleep(300);
        break;
    }

    // Stuck detection
    if (stuckCounter > MAX_STUCK) {
      log(`STUCK for ${stuckCounter} ticks, forcing exploration`);
      feedback.issues.push(`Stuck at level ${state.level}, pos (${state.px},${state.py})`);
      // Try to reveal and move to random adjacent cell
      await page.evaluate(() => {
        if (!game || game.screen !== 'board' || !game.board) return;
        const dirs = [{dx:-1,dy:0},{dx:1,dy:0},{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:-1},{dx:1,dy:-1},{dx:-1,dy:1},{dx:1,dy:1}];
        for (const d of dirs) {
          const nx = game.playerPos.x + d.dx, ny = game.playerPos.y + d.dy;
          if (nx >= 0 && ny >= 0 && nx < game.boardW && ny < game.boardH && game.board[ny] && game.board[ny][nx]) {
            const cell = game.board[ny][nx];
            if (cell.type !== 'wall') {
              cell.revealed = true;
              movePlayer(nx, ny);
              return;
            }
          }
        }
      });
      stuckCounter = 0;
      await sleep(TICK);
    }

    await sleep(TICK);
  }

  // Collect final stats
  const finalStats = await page.evaluate(() => ({
    level: game.level,
    monstersKilled: game.monstersKilled,
    gold: game.gold,
    goldCollected: game.goldCollected,
    hp: game.hp,
    maxHp: game.maxHp,
    weapon: game.equipment.weapon ? game.equipment.weapon.name : 'brak',
    armor: game.equipment.armor ? game.equipment.armor.name : 'brak',
    helmet: game.equipment.helmet ? game.equipment.helmet.name : 'brak',
    shield: game.equipment.shield ? game.equipment.shield.name : 'brak',
    boots: game.equipment.boots ? game.equipment.boots.name : 'brak',
    bracers: game.equipment.bracers ? game.equipment.bracers.name : 'brak',
    accessory: game.equipment.accessory ? game.equipment.accessory.name : 'brak',
    special: game.equipment.special ? game.equipment.special.name : 'brak',
    inventoryCount: game.inventory.length,
    questStage: game.mainQuest.stage,
  }));

  feedback.monstersKilled = finalStats.monstersKilled;

  // Print feedback report
  console.log('\n' + '='.repeat(60));
  console.log('          PLAYTEST FEEDBACK REPORT');
  console.log('='.repeat(60));
  console.log(`\nFinal Level: ${finalStats.level}`);
  console.log(`Monsters Killed: ${finalStats.monstersKilled}`);
  console.log(`Gold Collected: ${finalStats.goldCollected}`);
  console.log(`Deaths: ${feedback.deathCount}`);
  console.log(`Main Quest Chapters: ${finalStats.questStage}/10`);

  console.log('\n--- FINAL EQUIPMENT ---');
  for (const [slot, name] of Object.entries(finalStats).filter(([k]) =>
    ['weapon','armor','helmet','shield','boots','bracers','accessory','special'].includes(k))) {
    console.log(`  ${slot}: ${name}`);
  }

  console.log('\n--- WEAPONS FOUND ---');
  feedback.weaponsFound.forEach(w => console.log(`  Lvl ${w.level}: ${w.name} (${w.rarity}, ${w.atkType}) - ${w.action}`));

  console.log('\n--- SHOP OFFERINGS BY LEVEL ---');
  feedback.shopOfferings.forEach(s => console.log(`  Lvl ${s.level}: ${s.items.join(', ')}`));

  console.log('\n--- ISSUES/NOTES ---');
  if (feedback.issues.length === 0) console.log('  No issues detected');
  feedback.issues.forEach(i => console.log(`  ! ${i}`));

  console.log('\n--- LEVELS REACHED ---');
  console.log(`  ${feedback.levelsReached.join(' → ')}`);

  console.log('\n--- CHAPTERS COMPLETED ---');
  feedback.chaptersCompleted.forEach(c => console.log(`  ${c}`));

  console.log('\n--- TIMELINE (last 50 events) ---');
  feedback.timeline.slice(-50).forEach(t => console.log(`  ${t}`));

  console.log('\n' + '='.repeat(60));

  await sleep(3000);
  await browser.close();
})();

// ==================== HANDLERS ====================

async function handleBoard(page, state) {
  // Strategy: Minesweeper-aware BFS — avoid monsters, prioritize loot
  const action = await page.evaluate(() => {
    if (!game || game.screen !== 'board' || !game.board) return { type: 'wait' };

    const board = game.board;
    const w = game.boardW, h = game.boardH;
    const px = game.playerPos.x, py = game.playerPos.y;
    if (px === undefined || py === undefined) return { type: 'wait' };

    // === MINESWEEPER ANALYSIS ===
    // Classify unrevealed cells as safe/dangerous/unknown using dangerCount constraints
    const cellSafety = {}; // "x,y" -> 'safe' | 'dangerous' | 'unknown'

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = board[y][x];
        if (!cell.revealed || cell.type === 'wall') continue;
        if (cell.dangerCount === undefined) continue;

        // Count adjacent unrevealed non-wall cells and known revealed monsters
        const unrevealed = [];
        let knownMonsters = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nc = board[ny][nx];
            if (!nc || nc.type === 'wall') continue;
            if (!nc.revealed) {
              unrevealed.push({ x: nx, y: ny });
            } else if (nc.type === 'monster') {
              knownMonsters++;
            }
          }
        }

        const remaining = cell.dangerCount - knownMonsters;

        if (remaining <= 0) {
          // All monsters accounted for — unrevealed neighbors are safe
          for (const u of unrevealed) {
            const k = u.x + ',' + u.y;
            if (cellSafety[k] !== 'dangerous') cellSafety[k] = 'safe';
          }
        } else if (remaining >= unrevealed.length && unrevealed.length > 0) {
          // All unrevealed must be monsters
          for (const u of unrevealed) {
            cellSafety[u.x + ',' + u.y] = 'dangerous';
          }
        }
      }
    }

    // === QUEST AWARENESS ===
    if (!game._visitedCells) game._visitedCells = {};
    if (!game._npcsDone) game._npcsDone = {};  // NPCs fully done (reward claimed or post-quest)

    // Side quest: killSpecific — need to hunt a specific monster type
    const sideQuest = game.quests ? game.quests.find(q => !q.completed && q.type === 'killSpecific' && q.progress < q.target) : null;
    const questMonster = sideQuest ? sideQuest.targetMonster : null;

    // Check if any quest is readyForReward (need to go back to NPC)
    const rewardReady = game.quests ? game.quests.find(q => !q.completed && q.readyForReward) : null;
    const rewardNpcId = rewardReady ? rewardReady.npcId : null;

    // Main quest: killCount — need to kill any N monsters
    const mq = game.mainQuest;
    const mainNeedsKills = mq && MAIN_STORY[mq.stage] && MAIN_STORY[mq.stage].type === 'killCount' && mq.progress < MAIN_STORY[mq.stage].target;

    // HP status for fountain priority
    const stats = getPlayerStats();
    const hpRatio = game.player.hp / stats.maxHp;
    const manaRatio = game.player.mana / stats.maxMana;

    // === BFS WITH SAFETY-AWARE PATHFINDING ===
    const visited = {};
    const queue = [{ x: px, y: py, dist: 0, firstStep: null, danger: 0 }];
    visited[px + ',' + py] = true;

    const targets = [];
    const dirs = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];

    while (queue.length > 0) {
      const cur = queue.shift();
      const cell = board[cur.y] && board[cur.y][cur.x];
      if (!cell) continue;

      if (cur.dist > 0) {
        const cellKey = cur.x + ',' + cur.y;
        const wasVisited = !!game._visitedCells[cellKey];
        let priority = 99;

        if (cell.revealed) {
          // === REVEALED CELLS — we can see what they are ===
          if (cell.type === 'equipment') priority = 1;          // Loot first!
          else if (cell.type === 'treasure') priority = 2;      // Treasure
          else if (cell.type === 'gold') priority = 3;          // Gold
          else if (cell.type === 'npc') {
            // Smart NPC priority based on quest state
            const npcCell = cell;
            const npcId = npcCell.npcId || cellKey;
            if (game._npcsDone[npcId]) {
              priority = 70;  // Already done — never revisit
            } else if (rewardNpcId && npcCell.npcId === rewardNpcId) {
              priority = 2;   // Reward ready — go claim it!
            } else if (!wasVisited) {
              priority = 5;   // First visit — pick up quest
            } else {
              priority = 70;  // Already visited, quest not ready — skip
            }
          }
          else if (cell.type === 'shop' && !wasVisited) priority = 6;  // Shop
          else if (cell.type === 'fountain' && !cell.used && (hpRatio < 0.7 || manaRatio < 0.5)) priority = 4; // Fountain when needed
          else if (cell.type === 'exit') {
            // Check if this exit leads to a NEW (unexplored) node
            const exitIdx = cell.exitIndex || 0;
            const curNode = game.levelNodes[game.currentNodeId];
            const childId = curNode && curNode.childIds && curNode.childIds[exitIdx];
            const isExplored = childId && game._exploredNodes && game._exploredNodes[childId];
            const childDepth = childId && game.levelNodes[childId] ? game.levelNodes[childId].depth : 999;
            const curDepth = curNode ? curNode.depth : 1;
            if (!childId) priority = 11;                    // NEW node — top priority!
            else if (!isExplored) priority = 11;            // Not fully explored yet
            else if (childDepth > curDepth) priority = 13;  // Deeper explored — path to frontier
            else priority = 70;                             // Same/lower depth — avoid
          }
          else if (cell.type === 'entrance') {
            // Going backwards — only as very last resort
            priority = 70;
          }
          else if (cell.type === 'questItem') priority = 3;     // Quest item — important
          else if (cell.type === 'trap') priority = 40;           // Trap — AVOID (damage + time waste)
          else if (cell.type === 'monster' && cell.monster) {
            // Monsters: fight them! This is a dungeon crawler.
            if (questMonster && cell.monster.name === questMonster) {
              priority = 4;   // Quest target — high priority
            } else if (mainNeedsKills) {
              priority = 9;   // Main quest needs kills — go fight
            } else {
              priority = 15;  // Normal monster — fight when convenient
            }
          }
        } else {
          // === UNREVEALED CELLS — use minesweeper classification ===
          const safety = cellSafety[cellKey] || 'unknown';
          if (safety === 'safe') priority = 10;       // Safe to explore
          else if (safety === 'dangerous') priority = 55; // Known monster — avoid
          else priority = 14;                          // Unknown — cautious explore
        }

        if (priority < 99) {
          targets.push({
            x: cur.x, y: cur.y, dist: cur.dist, firstStep: cur.firstStep,
            priority, danger: cur.danger,
            cellType: cell.revealed ? cell.type : (cellSafety[cellKey] || 'unknown'),
          });
        }
      }

      if (cur.dist < 50) {
        for (const d of dirs) {
          const nx = cur.x + d.dx, ny = cur.y + d.dy;
          const nk = nx + ',' + ny;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || visited[nk]) continue;
          const nc = board[ny] && board[ny][nx];
          if (!nc || nc.type === 'wall') continue;

          visited[nk] = true;

          // Calculate path danger for this step
          let stepDanger = 0;
          if (nc.revealed && nc.type === 'monster') {
            // Known monster in path — moderate penalty (fighting is OK)
            stepDanger = 20;
          } else if (nc.revealed && nc.type === 'trap') {
            // Known trap in path — avoid (deals damage)
            stepDanger = 60;
          } else if (nc.revealed && nc.type === 'npc') {
            const npcId2 = nc.npcId || nk;
            if (game._npcsDone[npcId2] || game._visitedCells[nk]) {
              stepDanger = 80;  // Done NPC — heavy penalty to avoid re-entry
            }
          } else if (nc.revealed && nc.type === 'shop' && game._visitedCells[nk]) {
            // Visited shop — avoid pathing through to prevent re-entry
            stepDanger = 80;
          } else if (!nc.revealed) {
            const safety = cellSafety[nk];
            if (safety === 'dangerous') stepDanger = 100;
            else if (safety !== 'safe') stepDanger = 5;
          }

          queue.push({
            x: nx, y: ny, dist: cur.dist + 1,
            firstStep: cur.firstStep || { x: nx, y: ny },
            danger: cur.danger + stepDanger,
          });
        }
      }
    }

    if (targets.length === 0) return { type: 'stuck' };

    // Sort: priority > path safety > distance
    targets.sort((a, b) => a.priority - b.priority || a.danger - b.danger || a.dist - b.dist);
    const best = targets[0];

    const step = best.firstStep;
    if (step && board[step.y] && board[step.y][step.x]) {
      const dx = Math.abs(step.x - px), dy = Math.abs(step.y - py);
      if (dx <= 1 && dy <= 1) {
        return { type: 'move', x: step.x, y: step.y, target: best.cellType, dist: best.dist, priority: best.priority };
      }
    }

    return { type: 'stuck' };
  });

  if (action.type === 'move') {
    // When stepping on exit/entrance, mark current node as explored and save visited cells
    if (action.target === 'exit' || action.target === 'entrance') {
      await page.evaluate(() => {
        if (!game._visitedPerNode) game._visitedPerNode = {};
        if (!game._exploredNodes) game._exploredNodes = {};
        const nodeId = game.currentNodeId;
        game._visitedPerNode[nodeId] = game._visitedCells || {};
        game._exploredNodes[nodeId] = true;
      });
    }
    await page.evaluate(({ x, y }) => { movePlayer(x, y); }, { x: action.x, y: action.y });
    // After entrance transition, load visited cells for the new node
    if (action.target === 'entrance') {
      await page.evaluate(() => {
        if (!game._visitedPerNode) game._visitedPerNode = {};
        const newId = game.currentNodeId;
        game._visitedCells = game._visitedPerNode[newId] || {};
      });
    }
  } else if (action.type === 'stuck') {
    // Fallback: reveal adjacent cells to get more minesweeper data
    await page.evaluate(() => {
      if (!game || !game.board) return;
      const dirs = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }];
      // Find the safest adjacent unrevealed cell to step on
      let bestCell = null, bestDanger = Infinity;
      for (const d of dirs) {
        const nx = game.playerPos.x + d.dx, ny = game.playerPos.y + d.dy;
        if (nx < 0 || ny < 0 || nx >= game.boardW || ny >= game.boardH) continue;
        const c = game.board[ny] && game.board[ny][nx];
        if (!c || c.type === 'wall' || c.revealed) continue;
        // Check danger from adjacent revealed cells' dangerCount
        let danger = 0;
        for (let dy2 = -1; dy2 <= 1; dy2++) {
          for (let dx2 = -1; dx2 <= 1; dx2++) {
            const ax = nx + dx2, ay = ny + dy2;
            if (ax < 0 || ay < 0 || ax >= game.boardW || ay >= game.boardH) continue;
            const ac = game.board[ay] && game.board[ay][ax];
            if (ac && ac.revealed && ac.dangerCount > 0) danger += ac.dangerCount;
          }
        }
        if (danger < bestDanger) { bestDanger = danger; bestCell = { x: nx, y: ny }; }
      }
      if (bestCell) {
        movePlayer(bestCell.x, bestCell.y);
      } else {
        // Absolute fallback: move to any adjacent non-wall
        for (const d of dirs) {
          const nx = game.playerPos.x + d.dx, ny = game.playerPos.y + d.dy;
          if (nx < 0 || ny < 0 || nx >= game.boardW || ny >= game.boardH) continue;
          const c = game.board[ny] && game.board[ny][nx];
          if (c && c.type !== 'wall') { movePlayer(nx, ny); return; }
        }
      }
    });
  }
}

async function handleCombat(page) {
  const monsterName = await page.evaluate(() =>
    combatState ? combatState.monster.name : '?'
  );
  const hpBefore = await page.evaluate(() => game.player.hp);
  log(`Combat: ${monsterName} (HP before: ${hpBefore})`);

  // Poll until combat ends naturally (auto-play fights for us)
  const startTime = Date.now();
  let result = 'timeout';
  while (Date.now() - startTime < COMBAT_TIMEOUT) {
    let state;
    try {
      state = await page.evaluate(() => {
        if (!combatState) return { phase: 'none', screen: game.screen };
        return {
          phase: combatState.phase,
          screen: game.screen,
          playerHp: game.player.hp,
          monsterHp: combatState.monster.hp,
          monsterMaxHp: combatState.monsterMaxHp,
        };
      });
    } catch(e) {
      await sleep(500);
      continue;
    }

    if (state.screen !== 'combat') {
      result = 'left_combat';
      break;
    }
    if (state.phase === 'victory') {
      result = 'victory';
      break;
    }
    if (state.phase === 'defeat') {
      result = 'defeat';
      break;
    }
    await sleep(COMBAT_POLL);
  }

  const hpAfter = await page.evaluate(() => game.player.hp);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Combat result: ${result} vs ${monsterName} (${elapsed}s, HP: ${hpBefore}→${hpAfter})`);

  if (result === 'timeout') {
    feedback.issues.push(`Combat timeout vs ${monsterName} at level ${await page.evaluate(() => game.level)}`);
    // Force exit to avoid being stuck
    await page.evaluate(() => {
      if (combatState) {
        combatState.monster.hp = 0;
        combatVictory();
      }
    });
    await sleep(1500);
  }

  // Wait for victory/defeat animation to finish
  await sleep(1500);

  // Clean up if still on combat screen
  await page.evaluate(() => {
    if (game.screen === 'combat') {
      combatState = null;
      game.screen = 'board';
      stopCombatMusic();
      render();
    }
  });
  await sleep(300);
}

async function handleItemFound(page) {
  const item = await page.evaluate(() => {
    if (!game.foundItem) return null;
    return {
      name: game.foundItem.name,
      slot: game.foundItem.slot,
      rarity: game.foundItem.rarity,
      str: game.foundItem.str || 0,
      def: game.foundItem.def || 0,
      spd: game.foundItem.spd || 0,
      hp: game.foundItem.hp || 0,
      atkType: game.foundItem.atkType || null,
      level: game.level,
    };
  });

  if (!item) {
    await page.evaluate(() => { if (typeof discardItem === 'function') discardItem(); });
    return;
  }

  // Decide: equip if weapon with better str, or pick up if inventory has space
  const shouldPickup = await page.evaluate(() => {
    const item = game.foundItem;
    if (!item) return false;
    // Always pick up if inventory not full
    if (game.inventory.length < 20) return true;
    return false;
  });

  const action = shouldPickup ? 'pickup' : 'discard';
  if (shouldPickup) {
    await page.evaluate(() => { pickupItem(); });
  } else {
    await page.evaluate(() => { discardItem(); });
  }

  if (item.slot === 'weapon') {
    feedback.weaponsFound.push({ ...item, action });
    log(`Found weapon: ${item.name} (${item.rarity}, ${item.atkType}) str:${item.str} - ${action}`);
  } else {
    log(`Found item: ${item.name} (${item.rarity}) - ${action}`);
  }

  // Auto-equip best items (magic weapons heavily preferred for auto-play)
  await page.evaluate(() => {
    if (!game.inventory || game.inventory.length === 0) return;
    function itemScore(item) {
      let score = (item.str || 0) + (item.def || 0) + (item.spd || 0) + (item.hp || 0) / 5 + (item.mana || 0) / 5 + (item.manaOnKill || 0) * 2 + (item.magicPower || 0);
      // Auto-play strongly prefers magic (ranged) weapons — melee approach is slow
      if (item.slot === 'weapon' && item.atkType === 'magic') score += 5;
      return score;
    }
    for (const item of game.inventory) {
      const cur = game.equipment[item.slot];
      if (!cur) { equipItem(item); continue; }
      if (itemScore(item) > itemScore(cur)) equipItem(item);
    }
  });
  await sleep(200);
}

async function handleShop(page, state) {
  // Log shop offerings
  const shopInfo = await page.evaluate(() => {
    const stock = game.shopState && game.shopState.stock;
    if (!stock || stock.length === 0) return { items: [], level: game.level };
    return {
      level: game.level,
      items: stock.map(i => `${i.name}(${i.rarity || ''},${i.price}g)`),
      weaponItems: stock.filter(i => i.slot === 'weapon').map(i => ({
        name: i.name, rarity: i.rarity, atkType: i.atkType, str: i.str, price: i.price
      }))
    };
  });

  feedback.shopOfferings.push(shopInfo);
  if (shopInfo.weaponItems) {
    shopInfo.weaponItems.forEach(w => {
      feedback.weaponsSeen.push({ ...w, source: 'shop', level: state.level });
    });
  }
  log(`Shop (lvl ${shopInfo.level}): ${shopInfo.items.join(', ')}`);

  // Buy upgrades: prioritize weapon > equipment > potions
  await page.evaluate(() => {
    const stock = game.shopState && game.shopState.stock;
    if (!stock) return;
    // First pass: buy weapon/equipment upgrades
    function itemScore(it) {
      let s = (it.str||0) + (it.def||0) + (it.spd||0) + (it.hp||0)/5;
      if (it.slot === 'weapon' && it.atkType === 'magic') s += 10;
      return s;
    }
    for (let i = 0; i < stock.length; i++) {
      const item = stock[i];
      if (!item || item.isPotion || item.isManaPotion || game.gold < item.price) continue;
      if (!item.slot) continue;
      const cur = game.equipment[item.slot];
      if (!cur) { shopBuy(i); continue; }
      if (itemScore(item) > itemScore(cur)) shopBuy(i);
    }
    // Second pass: buy potions if HP low or always buy mana potions
    for (let i = 0; i < stock.length; i++) {
      const item = stock[i];
      if (!item || game.gold < item.price) continue;
      if (item.isPotion && game.player.hp < getPlayerStats().maxHp * 0.7) {
        shopBuy(i);
      } else if (item.isManaPotion && game.player.mana < getPlayerStats().maxMana * 0.5) {
        shopBuy(i);
      }
    }
  });
  await sleep(200);

  // Close shop
  await page.evaluate(() => { closeShop(); });
  await sleep(300);
}

async function handleDialogue(page) {
  log('NPC dialogue');
  let claimedReward = false;
  let acceptedQuest = false;
  for (let i = 0; i < 30; i++) {
    const screen = await page.evaluate(() => game.screen);
    if (screen !== 'dialogue') break;

    // Click the best button available in the dialogue overlay DOM
    const result = await page.evaluate(() => {
      if (game.screen !== 'dialogue') return 'done';
      const overlay = document.querySelector('.dialogue-overlay');
      if (!overlay) { closeDialogue(); return 'done'; }

      // Priority: claim reward > quest npc talk > accept quest > mood reveal > choice btn > back to topics > finish topics > select topic > advance > close
      const btns = overlay.querySelectorAll('button');
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('claimQuestReward')) { btn.click(); return 'claimed'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('completeQuestNpcTalk')) { btn.click(); return 'questnpc'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('acceptQuest')) { btn.click(); return 'accepted'; }
      }
      // Mood-based map reveal — always accept
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('moodRevealMap')) { btn.click(); return 'mood-revealed'; }
      }
      // Branching dialogue: click first choice button (usually positive mood)
      const choiceBtns = overlay.querySelectorAll('.choice-btn');
      if (choiceBtns.length > 0) { choiceBtns[0].click(); return 'choice-picked'; }
      // Back to topics after reading a choice response
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('backToTopics')) { btn.click(); return 'back-to-topics'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('finishTopics')) { btn.click(); return 'topics-done'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('showQuestNpcResponse')) { btn.click(); return 'questnpc-resp'; }
      }
      // Click topic buttons (selectTopic)
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('selectTopic')) { btn.click(); return 'topic-selected'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('advanceDialogue')) { btn.click(); return 'advancing'; }
      }
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('closeDialogue') || oc.includes('closePuzzle')) { btn.click(); return 'closed'; }
      }
      // Decline mood reveal as last resort (prefer accepting above)
      for (const btn of btns) {
        const oc = btn.getAttribute('onclick') || '';
        if (oc.includes('declineMoodReveal')) { btn.click(); return 'mood-declined'; }
      }
      // Fallback: click any button
      if (btns.length > 0) { btns[0].click(); return 'clicked'; }
      // No buttons found, force close
      closeDialogue();
      return 'force-closed';
    });

    if (result === 'claimed') claimedReward = true;
    if (result === 'accepted') acceptedQuest = true;
    if (result === 'done' || result === 'closed' || result === 'force-closed' || result === 'questnpc') break;
    await sleep(250);
  }

  // Mark NPC as done if reward was claimed (or just visited and accepted quest)
  if (claimedReward || acceptedQuest) {
    await page.evaluate((claimed) => {
      if (!game._npcsDone) game._npcsDone = {};
      // Mark current position NPC as done
      const k = game.playerPos.x + ',' + game.playerPos.y;
      const cell = game.board[game.playerPos.y] && game.board[game.playerPos.y][game.playerPos.x];
      if (cell && cell.npcId) game._npcsDone[cell.npcId] = true;
      game._npcsDone[k] = true;
      if (claimed) {
        // After claiming reward, mark ALL quest NPCs as done
        if (game.quests) {
          game.quests.forEach(q => {
            if (q.completed && q.npcId) game._npcsDone[q.npcId] = true;
          });
        }
      }
    }, claimedReward);
  }

  // Absolute fallback: force close
  await page.evaluate(() => {
    if (game.screen === 'dialogue') {
      game.dialogueState = null;
      game.screen = 'board';
    }
    // Remove any lingering overlay
    document.querySelectorAll('.dialogue-overlay').forEach(el => el.remove());
    render();
  });
  await sleep(200);
}

async function handleLevelComplete(page) {
  const lvl = await page.evaluate(() => game.level);
  log(`Level ${lvl} complete, advancing...`);

  // Check for quest complete overlay first
  await page.evaluate(() => {
    try { dismissQuestComplete(); } catch(e) {}
  });
  await sleep(300);

  // Save visited cells for current node, then advance
  await page.evaluate(() => {
    // Persist visited cells per node
    if (!game._visitedPerNode) game._visitedPerNode = {};
    if (!game._exploredNodes) game._exploredNodes = {};

    // NOTE: By the time we get here, the exit handler already changed currentNodeId to the CHILD.
    // So we need to mark the PARENT node (the one we just left) as explored.
    const childId = game.currentNodeId;
    const childNode = game.levelNodes[childId];
    if (childNode && childNode.parentId) {
      const parentId = childNode.parentId;
      game._visitedPerNode[parentId] = game._visitedCells || {};
      game._exploredNodes[parentId] = true;
    }

    nextLevel();

    // Load visited cells for the new node (or start fresh)
    const newId = game.currentNodeId;
    game._visitedCells = game._visitedPerNode[newId] || {};
  });
  await sleep(800);

  // Handle intro screen if shown
  const screen = await page.evaluate(() => game.screen);
  if (screen === 'intro') {
    await page.evaluate(() => { startFromIntro(); });
    await sleep(500);
  }
}
