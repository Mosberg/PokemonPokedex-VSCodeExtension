# **Pokédex Gen‑1 — VSCode Extension Concept**

A VSCode extension that gives developers an **instant, interactive Pokédex** for all 151 Kanto Pokémon — searchable, browsable, and integrated with code snippets, hover cards, and commands.

---

## **Core Identity**

- **Name:** Pokédex: Kanto Edition
- **Purpose:** Provide a fast, developer‑friendly reference for all Gen‑1 Pokémon inside VSCode
- **Audience:** Developers building Pokémon‑themed tools, games, scripts, or learning projects
- **Tone:** Retro, clean, minimal, nostalgic

---

# **1. Extension Features**

## **🟥 Sidebar Pokédex Panel**

A dedicated sidebar view showing:

- **Pokémon List** — scrollable list of all 151 Pokémon
- **Type Filters** — Fire, Water, Grass, etc.
- **Search Bar** — instant fuzzy search
- **Favorites** — user‑starred Pokémon

Each Pokémon entry shows:

- Sprite
- Name + ID
- Types
- Mini‑stats preview

---

## **🟦 Pokémon Detail View**

When a Pokémon is selected, a full detail panel opens:

- Name, ID, classification
- Sprite (front + shiny)
- Types
- Base stats (HP, ATK, DEF, SP.ATK, SP.DEF, SPD)
- Evolutions
- Moves (Gen‑1 only)
- Locations (Red/Blue/Yellow)
- Flavor text (summarized to avoid copyright issues)

Includes buttons:

- **Insert JSON**
- **Insert Markdown**
- **Copy Stats**

---

## **🟩 Hover Cards**

Hovering over a Pokémon name in code shows a tooltip:

- Sprite
- Types
- Base stats
- Evolution chain
- Short description

Example trigger:

```ts
const starter = "Bulbasaur";
```

Hovering “Bulbasaur” shows a Pokédex card.

---

## **🟨 Autocomplete & Snippets**

Typing “poke.” triggers autocomplete suggestions:

- **poke.bulbasaur**
- **poke.charmander**
- **poke.pikachu**

Snippets include:

- **Insert Pokémon JSON**
- **Insert Base Stats Block**
- **Insert Evolution Chain**

---

## **🟪 Commands Palette Integration**

Commands like:

- **Open Pokédex**
- **Search Pokémon**
- **Random Pokémon**
- **Insert Pokémon Data**

---

# **2. Data Model**

A clean JSON structure stored locally (no copyrighted text):

```json
{
  "id": 1,
  "name": "Bulbasaur",
  "types": ["Grass", "Poison"],
  "stats": {
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "spAttack": 65,
    "spDefense": 65,
    "speed": 45
  },
  "evolutions": [1, 2, 3],
  "moves": ["tackle", "vine-whip", "razor-leaf"],
  "locations": ["Route 1 (Yellow)", "Starter (Red/Blue)"]
}
```

---

# **3. UI/UX Style**

### **Retro Pokédex Theme**

- Pixel fonts
- Red/black color palette
- Rounded “Pokédex‑style” panels
- Optional “Game Boy Mode”

### **Modern Developer Mode**

- Clean VSCode‑native UI
- Light/dark theme support
- Minimalist icons

---

# **4. Extension Architecture**

### **/src**

- **extension.ts** — activation, commands, providers
- **data/** — JSON files for all 151 Pokémon
- **views/** — webview HTML/JS for sidebar + detail view
- **providers/**
  - HoverProvider
  - CompletionProvider
  - TreeDataProvider

### **/media**

- Icons
- Sprites (public domain or user‑provided)

### **/snippets**

- Pokémon JSON snippet
- Stats snippet
- Evolution snippet

### **/package.json**

- Contributions
- Commands
- Activation events
- Snippets
- Views

---

# **5. Advanced Features (Optional)**

- **Team Builder** — drag‑and‑drop 6 Pokémon
- **Type Matchup Calculator**
- **Move Damage Calculator**
- **Shiny Mode Toggle**
- **Random Encounter Generator**

---

# **6. Why This Extension Works**

- It’s nostalgic but practical
- It integrates deeply with coding workflows
- It’s fast, offline, and lightweight
- It’s perfect for game devs, modders, and hobby coders

---
