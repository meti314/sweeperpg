# SweeperRPG - Kompletna Dokumentacja Projektu

## 1. Informacje ogolne

- **Nazwa**: Sweeper RPG
- **Typ**: Jednoplikowa gra HTML (index.html, ~3660 linii)
- **Jezyk UI**: Polski (caly tekst po polsku, humor w stylu Munchkina)
- **Stack technologiczny**: Czysty HTML + CSS + JavaScript (zero zaleznosci)

## 2. Pliki w projekcie

| Plik | Opis |
|------|------|
| `index.html` | Cala gra (~3660 linii: CSS + JS w jednym pliku) |
| `Lochy, Łupy i Lamy.mp3` | Muzyka eksploracji (ambient) |
| `Lovers in the Dungeon.mp3` | Muzyka walki (combat) |

## 3. Struktura kodu (index.html)

### Linie 1-220: CSS
- Body: full viewport, ciemny motyw (`#0a0a1a`)
- Layout glowny: `.game-screen` (flex: left-panel 220px | center-panel flex:1 | right-panel 240px)
- `.board`: CSS Grid, dynamiczny rozmiar komorek (28-72px)
- `.cell-*`: Style komorek (hidden, revealed, player, exit, monster, boss, treasure, gold, shop, npc)
- `.paperdoll`: 8 slotow ekwipunku pozycjonowanych absolutnie
- `.combat-overlay`: Fullscreen overlay z canvas
- `.combat-arena`: Dynamiczna szerokosc/wysokosc (CSS-skalowany canvas 500x350)
- Animacje: `bossGlow`, `treasureGlow`, `popIn`
- Responsive: @media (max-width: 900px) zmniejsza panele

### Linie 225-253: Utilitki + Skalowanie
- `$()`, `rng()`, `pick()`, `clamp()`, `lerp()`
- `calcCellSize()` - oblicza rozmiar komorki planszy na podstawie dostepnej przestrzeni
- `calcCombatSize()` - oblicza rozmiar areny walki (proporcja 10:7, max 900px)

### Linie 255-419: System audio
- **SFX**: Web Audio API (OscillatorNode) - 12 typow dzwiekow
  - `hit`, `attack`, `crit`, `miss`, `pickup`, `equip`, `victory`, `defeat`, `levelup`, `quest`, `step`, `dodge`, `shop`
- **Muzyka**: HTML5 Audio z crossfade
  - `bgMusicAudio` -> "Lochy, Łupy i Lamy.mp3" (ambient, vol 0.3, loop)
  - `combatMusicAudio` -> "Lovers in the Dungeon.mp3" (combat, vol 0.35, loop)
  - `crossfadeTo(target)` - 20 krokow przez 1 sekunde (setInterval)
  - `startCombatMusic()` / `stopCombatMusic()` - wywolywane przy wejsciu/wyjsciu z walki

### Linie 421-487: Dane potworow (MONSTER_TEMPLATES)
**27 potworow w 6 tierach:**

| Tier | Danger | Potwory | Opis |
|------|--------|---------|------|
| 0 | 0-1 | Karaluch, Maly Szczur, Grzyb, Robak, Stonozka | Tutorial, bardzo slabe |
| 1 | 1-2 | Sluz, Szczur, Nietoperz, Pajak, Mala Sluz | Latwe |
| 2 | 3-4 | Szkielet, Goblin, Zombie, Wilk | Srednie |
| 3 | 4-6 | Ork, Duch, Mroczny Mag, Troll, Bandyta | Trudne |
| 4 | 6-7 | Ognisty Zywiolak, Lodowy Zywiolak, Golem, Wampir, Bazyliszek | Bardzo trudne |
| 5 | 8-10 | Upior, Smocze Piskle, Demon, Lich, Smok | Najtrudniejsze |

Kazdy potwor ma: name, icon (emoji), danger, hp, atk, def, spd, desc, tier, patterns[]

**Wzorce ataku (projectile patterns):**
- `scatter` - losowe kierunki
- `burst` - eksplozja ze srodka
- `fan` - wachlarz z kata
- `wave` - falowe pociski
- `spiral` - spirala ze srodka
- `rain` - deszcz z gory
- `line` - linia pociskow
- `charge` - szybkie ladowanie
- `homing` - naprowadzajace (turnRate)
- `phase` - migajace (przechodzace/nie)
- `expand` - rozszerzajacy sie pierscien
- `beam` - laser obracajacy sie
- `shockwave` - fala uderzeniowa

### Linie 489-561: Dane ekwipunku (EQUIPMENT_TEMPLATES)
**~70 przedmiotow w 8 slotach:**

| Slot | Klucz | Specjalne |
|------|-------|-----------|
| Bron | weapon | `atkType` (timing/rapid/charge/magic), `onHit` |
| Zbroja | armor | - |
| Helm | helmet | - |
| Akcesorium | accessory | - |
| Tarcza | shield | - |
| Buty | boots | `spd` idzie do `dodgeSpd` |
| Karwasze | bracers | - |
| Specjalny | special | - |

**Rzadkosci**: common (szary), uncommon (zielony), rare (niebieski), epic (fioletowy), legendary (zloty)

**Staty przedmiotow**: str, def, spd, hp, luck, ability

**Typy ataku broni (atkType)**:
- `timing` - miecze: pasek z markerem, traf w strefe
- `rapid` - sztylety: klikaj SPACJE jak najszybciej
- `charge` - topory: laduj i zwolnij w zlotej strefie
- `magic` - rozdzki: rysuj rune klikajac punkty na canvasie

**Efekty onHit**: poison, stun, weaken, bleedM

### Linie 563-603: Bossy i Debuffs

**5 Bossow:**
1. Krol Goblinow (tier 2, HP 120)
2. Nekromanta (tier 3, HP 160)
3. Ognisty Wladca (tier 4, HP 200)
4. Straznik Otchlani (tier 5, HP 280)
5. Cien Zar'Kotha (tier 5, HP 350)

**Debuffs na gracza (od potworow)**: Trucizna, Spowolnienie, Oslabianie, Krwawienie
**Debuffs na potwory (od gracza)**: Trucizna, Ogluszenie, Oslabienie, Krwawienie

### Linie 605-615: Wzorce run (RUNE_PATTERNS)
8 run do minigry magicznego ataku: Ignis, Aqua, Terra, Ventus, Fulgur, Umbra, Lux, Mortem
- Kazda runa to lista punktow {x, y} na canvasie 500x350
- Gracz klika punkty po kolei w czasowym limicie

### Linie 617-650: Stale ulepszenia + Umiejetnosci

**Stale ulepszenia (PERM_UPGRADES)** - kupowane za Punkty Duszy miedzy runami:
- Wytrzymalosc (+5 HP, max 20)
- Moc Duszy (+1 STR, max 15)
- Odpornosc (+1 DEF, max 15)
- Precyzja (+1 atkSpd, max 10)
- Refleks (+1 dodgeSpd, max 10)
- Fortuna (+1 luck, max 10)
- Regeneracja (+1 HP za odkryte pole, max 5)

**Umiejetnosci (ABILITY_INFO)** - 20 umiejetnosci:
- magicBolt, freeze, burn, holyStrike, lifeSteal, meteor
- magicShield, fireResist, shadowCloak, rage, stealth, command
- dash, regen, fireShield, immortal, warCry, ironSkin, haste, curse

### Linie 652-736: NPC i Questy (NPC_TEMPLATES)

**8 NPC z dialogami w stylu Munchkina:**
1. Borek 🧔 - Stary Wojak
2. Mirela 👩‍🔬 - Naukowiec (canReveal: true)
3. Grzegorz 🧑‍🦳 - Kupiec
4. Xardas 🧙‍♂️ - Mag (canReveal: true)
5. Kasia 👧 - Dziecko
6. Aelindra 🧝‍♀️ - Elfka
7. Bromir ⛏️ - Krasnolud
8. Sir Aldric 👻 - Duch

**Kazdy NPC ma:**
- `lines[]` - 3 linijki dialogu
- `questLine` - tekst questa (z placeholderami $MONSTER_PL, $MONSTER_D, $TARGET)
- `rewardLine` - dialog po odbiorze nagrody
- `postQuestLine` - dialog po ukonczonym quescie
- `quest` - {type:'killSpecific', target: N, reward: {gold, revealMap}}

### Linie 738-824: Sklep + Kszalty map

**Sklep**: 3-6 losowych przedmiotow + mikstura zdrowia, kupno/sprzedaz (40% wartosci)

**7 ksztaltow map**: rect, cave, cross, lshape, diamond, corridors, islands
- `generateMapMask(w, h, shape)` tworzy boolowska maske
- cave: random walk od centrum
- islands: dwie wyspy polaczone waskim mostem

### Linie 826-893: Stan gry

**Save (localStorage):**
```js
save = {
  soulPoints: 0,
  totalRuns: 0,
  bestLevel: 0,
  bestKills: 0,
  upgrades: {hp, str, def, atkSpd, dodgeSpd, luck, regen}
}
```

**Game state (per-run):**
```js
game = {
  screen: 'board', // menu, board, combat, gameover, levelcomplete, itemfound, shop, dialogue
  level, board[][], boardW, boardH, playerPos,
  player: {maxHp, hp, str, def, atkSpd, dodgeSpd, luck, regen},
  equipment: {weapon, armor, helmet, accessory, shield, boots, bracers, special},
  inventory: [], gold, monstersKilled, cellsExplored, equipmentFound,
  log: [], quests: [], questsCompleted,
  dialogueState, shopState, mapMask, goldCollected, treasurePos,
  levelNodes: {}, currentNodeId, nextNodeCounter
}
```

**Migracja save**: stare `spd` -> `atkSpd` + `dodgeSpd`

### Linie 895-1050: Generowanie planszy (generateBoard)

- Rozmiar: `min(18, 9+lvl)` x `min(14, 7+lvl)`
- Losowy ksztalt mapy (lvl 1 = rect, potem losowy)
- Gestosc potworow: 0.16 (lvl1) -> 0.45 (lvl6+)
- Rozmieszczanie: klastry (70% przy centrach, 30% losowo)
- Skalowanie statow potworow: HP/DEF * (1 + (lvl-1)*0.25), ATK * (1 + (lvl-1)*0.3)
- Boss co 2 poziomy od lvl 2, skalowanie: HP/DEF * (1 + (lvl-1)*0.25), ATK * (1 + (lvl-1)*0.35)
- Wazony dobor tierow: lvl 1-2 preferuje slabe (4:1), lvl 3-4 srednie, lvl 5+ trudne
- 1-2 wyjsc (branching od lvl 2), wejscie powrotne
- Skarb: 1 na level (50% szans od lvl 2)
- Ekwipunek: 3 bazowe na lvl 1-2, potem 2 + lvl/2
- NPC: 1-3 losowych
- Sklep: 66% szans

### Linie 1050-1200: Treasure, Equipment, Level save/load

- `placeTreasure()` - rzadki/epicki/legendarny przedmiot z bonusem
- `getAvailableEquipment(level)` - filtruje przedmioty po rzadkosci wedlug poziomu
- `saveLevelState()` / `loadLevelState()` - zapisuje/wczytuje stan poziomu do node'a
- System branchingu: grafy wezlow, kazdy wezel = jeden odwiedzony poziom

### Linie 1206-1229: getPlayerStats()
- Oblicza finalne staty gracza z bazy + ekwipunku
- spd broni -> atkSpd, spd butow -> dodgeSpd, reszta -> split 50/50
- Zbiera abilities z ekwipunku

### Linie 1231-1395: Ruch, interakcje, nawigacja

- `isAdjacent(x,y)` - 8-kierunkowy ruch (siatka)
- `movePlayer(x,y)` - odkrywanie pol, walka, zbieranie, NPC, sklep, wyjscia
- `revealSafeNeighbors()` - kaskadowe odkrywanie pustych pol (jak Saper)
- `toggleFlag()` - flagowanie potencjalnych potworow (prawy klik)
- `recalcDangersFor()` - przelicza liczby niebezpieczenstwa (jak Saper)
- Wyjscia -> `saveLevelState()` -> nowy lub zapisany level
- Wejscia -> powrot do rodzica w grafie

### Linie 1397-1500: System walki (startCombat)

**CombatState** zawiera:
- Pozycje gracza (px, py), rozmiar (pSize=12), predkosc
- Pociski (projectiles[])
- Stan minigry ataku (dla kazdego atkType)
- Cooldowny umiejetnosci
- Efekty statusowe (frozen, burning, rage, haste, defBoost, monsterAtkReduction, defReduction)
- Debuffs (playerDebuffs, monsterDebuffs)
- Floating damage numbers, combat journal

### Linie 1500-2300: Petla walki (combatLoop)

**Fazy walki:**
1. **intro** (1.5s) - tekst "Walka!"
2. **dodge** (5s + danger*600ms) - unikanie pociskow
   - Gracz steruje WASD/strzalki
   - Pociski generowane wedlug patterns[] potwora
   - Predkosc gracza: 2 + dodgeSpd*0.3
   - Predkosc pociskow skalowana: bazowa * (1 + monster.spd*0.1)
   - Trafienie: dmg = max(1, monster.atk - player.def)
   - Beam: laser z centrum areny
3. **attack** - minigra ataku wedlug atkType broni
   - timing: marker biegnie po pasku, SPACE w odpowiednim momencie
   - rapid: kliker SPACE w limit czasu
   - charge: naladuj do zlotej strefy i SPACE
   - magic: klikaj punkty runy na canvasie
4. **victory/defeat** - koniec walki

**Kalkulacja obrazen (dealDamage)**:
- Bazowy dmg = player.str * multiplier (0.2-2.0 w zaleznosci od jakosci ataku)
- Crit chance: 10% + luck*2%
- Obrona potwora odjeta od dmg
- onHit efekty (poison, stun, weaken, bleedM)

**Dash (umiejetnosc unik):**
- 30 losowych kandydatow, scoring: odleglosc od pociskow, trajektoria, odleglosc od krawedzi
- Teleport do najlepszej pozycji + 500ms invincibility

### Linie 2300-2600: Zakonczenie walki, Questy

**combatVictory():**
- Gold drop: bazowy + danger*5 + losowy bonus
- Quest progress: killSpecific sprawdza nazwe potwora
- Boss daje podwojny progress
- 1.5s delay, potem powrot na plansze + stopCombatMusic()

**combatDefeat():**
- Soul Points = lvl*3 + kills*2 + quests*10
- Zapisz do save, pokaz game over

**System questow:**
- `getQuestMonster(level)` - losuje docelowego potwora z dostepnych tierow
- `fillQuestText(text, monsterName, target)` - zamienia $MONSTER_PL, $MONSTER_D, $TARGET
- `acceptQuest()` - przypisuje quest z wylosowanym potworem
- `checkQuestCompletion()` - ustawia `readyForReward` gdy progress >= target
- `claimQuestReward(npcId)` - daje nagrode, oznacza jako completed
- Cykl: pending -> readyForReward (wroc do NPC) -> completed

### Linie 2650-2870: Renderowanie planszy (renderBoard)

**3-kolumnowy layout:**
- Lewy panel: staty gracza, HP bar, zadania, umiejetnosci, dziennik
- Centrum: plansza z dynamicznym rozmiarem komorek (`calcCellSize()`)
- Prawy panel: paperdoll (8 slotow), ekwipunek tooltips, plecak

**Komorki planszy:**
- wall: szara, niekliklana
- hidden: ciemna, klikalna (odkryj)
- revealed: rozne typy (monster, gold, exit, entrance, equipment, shop, npc, empty+danger count)
- player: zielona ze emoji 🧙
- Tooltips na hover (staty potworow, nazwy przedmiotow, info o NPC)

### Linie 2870-3050: Overlaye (Sklep, Dialog, Quest Complete)

**Sklep:**
- Zakladki: Kup / Sprzedaj
- Przedmioty z cenami, mikstura zdrowia
- Sprzedaz za 40% ceny bazowej

**Dialog NPC:**
- Stan: linie dialogu -> oferta questa -> quest zaakceptowany / odrzucony
- readyForReward: dialog nagrody z przyciskiem "Odbierz"
- completed: post-quest dialog

**Quest Complete popup:**
- Overlay z info "Wroc do X po nagrode!"

### Linie 3080-3210: Renderowanie walki (renderCombatScreen + renderCombat)

**renderCombatScreen(app):**
- Combat header: HP obu stron
- Stat Compare panel: 3 kolumny (gracz | nazwa | potwor) z podswietlaniem fazy
- Speed banner: SZYBSZY/WOLNIEJSZY z kolorami
- Canvas arena (500x350 internal, CSS-skalowany przez calcCombatSize)
- Attack bar (timing/rapid/charge/magic)
- Ability buttons, combat info, combat journal

**renderCombat():**
- requestAnimationFrame loop
- Rysuje na canvasie: tlo, siatka, beam, pociski, gracz, runy magiczne, floating dmg
- Per-frame updates: HP bars, stat panel, speed banner, attack bars, ability buttons

### Linie 3560-3660: Input + Init

**Klawiatura:**
- WASD / strzalki: ruch gracza w walce (dodge)
- SPACE / Enter: atak w fazie ataku
- Klik na canvas: magia (rune points)

**Mouse:**
- Klik na komorke: ruch
- Prawy klik: flagowanie
- Klik na canvas: magic rune click (skalowane przez getBoundingClientRect)

**Window resize:**
- 150ms debounce -> render()

## 4. Balansowanie

### Staty startowe gracza
| Stat | Wartosc |
|------|---------|
| STR | 5 (+upgrade) |
| DEF | 3 (+upgrade) |
| atkSpd | 2 (+upgrade) |
| dodgeSpd | 2 (+upgrade) |
| HP | 50 (+upgrade*5) |
| Luck | 1 (+upgrade) |

### Skalowanie potworow
| Parametr | Formula |
|----------|---------|
| HP, DEF | bazowe * (1 + (lvl-1) * 0.25) |
| ATK | bazowe * (1 + (lvl-1) * 0.3) |
| Boss HP, DEF | bazowe * (1 + (lvl-1) * 0.25) |
| Boss ATK | bazowe * (1 + (lvl-1) * 0.35) |

### Gestosc potworow
| Level | Gestosc |
|-------|---------|
| 1 | 0.16 |
| 2 | 0.20 |
| 3 | 0.25 |
| 4-5 | 0.30 |
| 6+ | 0.30 + (lvl-5)*0.03, max 0.45 |

### Tier weights
| Level | Tier 0-1 | Tier 2 | Tier 3+ |
|-------|----------|--------|---------|
| 1-2 | waga 4 | waga 1 | - |
| 3-4 | waga 2 | waga 3 | waga 1 |
| 5+ | waga 1 | waga 1 | waga 2 |

### Inne wartosci
- Leczenie miedzy poziomami: 30% maxHP
- Ekwipunek na lvl 1-2: 3 bazowe (potem 2)
- Zloto na lvl 1-2: 3 bazowe (potem 2)
- Boss spawn: co 2 levele od lvl 2
- Sklep: 66% szans na pojawienie sie

## 5. Systemy gry

### System map (Saper)
- Komorki maja `dangerCount` (ile potworow w sasiedztwie 8-kierunkowym)
- Kolorowanie: d1=niebieski, d2=zielony, d3=zolty, d4=pomaranczowy, d5=czerwony
- Kaskadowe odkrywanie pustych pol (jak Saper)
- Flagowanie prawym klikiem

### System branchingu
- Kazdy level moze miec 1-2 wyjscia
- Drzewo wezlow: `game.levelNodes[id]` = {depth, parentId, board, ...}
- Wejscia powrotne na poprzedni level
- `saveLevelState()` / `loadLevelState()` zachowuje stan kazdego odwiedzonego poziomu

### System ekwipunku
- Paperdoll z 8 slotami
- Kliknij slot aby zdekwipowac
- Kliknij przedmiot w plecaku aby ekwipowac
- Tooltips z pelnymi statami
- Item found overlay: "Zabierz" lub "Wymien na zloto"

### System questow
1. Gracz rozmawia z NPC (3 linie dialogu)
2. NPC oferuje quest (killSpecific: zabij N sztuk konkretnego potwora)
3. Potwor docelowy losowany z dostepnych tierow (`getQuestMonster`)
4. Tekst questa wypelniony ($MONSTER_PL, $MONSTER_D, $TARGET)
5. Quest progress rosnie po zabiciu wlasciwego potwora
6. Po osiagnieciu celu: "Wroc do NPC po nagrode!" (status: readyForReward)
7. Powrot do NPC: dialog nagrody, przycisk "Odbierz"
8. Po odebraniu: post-quest dialog (zabawny, Munchkin-style)

### System sklepu
- Losowy asortyment (3-6 przedmiotow + mikstura)
- Zakladki Kup/Sprzedaj
- Mikstura: leczy 25 + lvl*5 HP
- Sprzedaz za 40% wartosci bazowej

## 6. Styl i humor

- Wszystkie opisy w stylu Munchkina (sarkastyczny, absurdalny humor)
- Przyklad potwora: "Zombie - Wolny, glupi i smierdzi. Jak kolega z pracy w poniedzialek."
- Przyklad przedmiotu: "Berlo Arcymaga - Sprowadza meteory. Overreaction? Moze troche."
- NPC maja charakterystyczne osobowosci i zabawne dialogi
- Quest dialogi i post-quest komentarze poglebiaja historie i humor
