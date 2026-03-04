# PocketMonster

A browser-based monster-catching RPG inspired by classic Game Boy RPGs, built with Three.js and ES6 modules. All creatures, regions, and characters are original.

## ⬇ Download & Play

**Option 1 – GitHub Release (recommended)**
1. Go to the [Releases page](../../releases/latest)
2. Download **`pocketmonster.zip`**
3. Unzip and open **`standalone.html`** in any modern browser — no server needed!

**Option 2 – Source ZIP**
Click **Code → Download ZIP** on the repository home page, unzip, and open `standalone.html`.

**Option 3 – Direct file**
If you already cloned the repo, open **`standalone.html`** directly from the project root.

## 🔧 Development

```bash
npm install          # install dev dependencies (esbuild + three)
npm start            # serve with a local dev server (http://localhost:3000)
npm run build        # regenerate standalone.html after code changes
```

## Controls

| Key | Action |
|---|---|
| Arrow keys | Move / navigate menus |
| Z or Enter | Confirm |
| X or Escape | Cancel / open pause menu |
| Touch D-pad + A/B (mobile) | Move / confirm / cancel |

## Features

- Tile-based overworld (30×30 map)
- Random wild encounters in tall grass
- Turn-based battle system with exact damage formula
- Creature capture with shake/breakout mechanic
- NPC trainer battles with line-of-sight detection
- 15 original creatures across 5 types (Fire, Water, Grass, Electric, Normal)
- 20 original moves with status effects
- Inventory, badges, and save/load via localStorage
