# PocketMonster

A browser-based monster-catching RPG inspired by classic Game Boy RPGs, built with Three.js and ES6 modules. All creatures, regions, and characters are original.

## ▶ Play instantly (no server needed)

Open **`standalone.html`** directly in any modern browser — no web server required.

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

## Features

- Tile-based overworld (30×30 map)
- Random wild encounters in tall grass
- Turn-based battle system with exact damage formula
- Creature capture with shake/breakout mechanic
- NPC trainer battles with line-of-sight detection
- 15 original creatures across 5 types (Fire, Water, Grass, Electric, Normal)
- 20 original moves with status effects
- Inventory, badges, and save/load via localStorage
