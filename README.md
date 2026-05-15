# Pokedex: Kanto Edition

A VS Code extension that provides a complete Generation 1 Pokedex (151 Pokemon) directly in your editor.

Version 0.2 adds richer data and customization options, including FireRed/LeafGreen move learnsets, evolution methods/levels, and acquisition data.

## Features

- Sidebar Pokedex webview with:
  - Search by name or number
  - Type filters
  - Detail panel with sprites, stats, move learnset details, evolution transitions (including methods/levels), FRLG catch locations, acquisition notes, and flavor text
  - Actions: insert JSON, insert Markdown, insert flavor text, copy flavor text, copy stats
- Team Builder panel with drag-and-drop slots and export to JSON
- Hover card support for Pokemon names in code
- Autocomplete support for `poke.` names in JavaScript and TypeScript
- Snippets for Pokemon JSON, stats blocks, flavor text, and evolution chains

## Settings

- `pokedexKanto.defaultSpriteVariant`: `normal` or `shiny`
- `pokedexKanto.maxMovesToDisplay`: number of moves to show in sidebar/hover
- `pokedexKanto.showFlavorTextInSidebar`: toggle flavor in sidebar details
- `pokedexKanto.showFlavorTextInHover`: toggle flavor in hover cards
- `pokedexKanto.enableHoverProvider`: enable or disable hover cards
- `pokedexKanto.enableCompletionProvider`: enable or disable `poke.` completions

## Commands

- `Pokedex: Open Sidebar`
- `Pokedex: Search Pokemon`
- `Pokedex: Random Pokemon`
- `Pokedex: Insert Pokemon JSON`
- `Pokedex: Insert Pokemon Moves`
- `Pokedex: Insert Pokemon Flavor Text`
- `Pokedex: Copy Pokemon Flavor Text`
- `Pokedex: Open Team Builder`
- `Pokedex: Open Extension Settings`

## Development

1. Install dependencies:
   - `npm install`
2. Build:
   - `npm run compile`
3. Press `F5` in VS Code to run the extension in a new Extension Development Host window.

## Data

- Dataset: `src/data/gen1.json`
- Local sprites: `src/images/sprites/normal` and `src/images/sprites/shiny`
- Type icons: `src/images/types`

Flavor text is sourced from PokeAPI English entries (prioritizing Yellow, then Red/Blue).

Each Pokemon entry now also includes FRLG-focused metadata sections:

- `moveLearnset` with per-move metadata:
  - learn method (`level-up`, `machine`, `tutor`, `egg`, etc.)
  - level learned (where applicable)
  - version group (`firered-leafgreen`)
  - machine metadata (`TMxx`/`HMxx`)
- `evolutionLines`, `evolvesFrom`, `evolvesTo`:
  - full evolution line paths
  - method/trigger details (level, item, trade, and other conditions)
- `frlgEncounterLocations`:
  - location and area names
  - encounter methods, version availability, and level ranges
- `frlgAcquisition`:
  - consolidated acquisition notes (catch/evolve/gift/trade/static/event)

Flavor text is sourced from PokeAPI English entries with FireRed/LeafGreen priority.
