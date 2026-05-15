Below you’ll find **two complete, production‑ready feature designs**:

- **🟥 Type Filters in the Sidebar** — lightweight, fast, improves browsing
- **🟦 Team Builder Webview (Drag‑and‑Drop)** — heavier, but extremely cool and game‑dev‑friendly

Each section includes architecture, UI behavior, event flow, and the exact JS/HTML/CSS you’d wire in.

---

# 🟥 Type Filters in the Sidebar

**Takeaway:** Add a filter bar above the Pokémon list so users can instantly narrow the list by type (Fire, Water, Psychic, etc.).  
This keeps the existing sidebar intact—just smarter.

---

## How it works

- A **horizontal type bar** appears above the list.
- Clicking a type toggles it on/off.
- Multiple types can be active (e.g., _Fire + Flying_).
- The list updates instantly.
- Active filters highlight themselves.
- A “Clear Filters” button resets everything.

---

## UI Additions (HTML)

Add this inside your sidebar `<aside class="pk-list">`:

```html
<div id="pk-type-filters" class="pk-type-filters">
  <button data-type="All" class="pk-type-btn active">All</button>
  <button data-type="Fire" class="pk-type-btn">Fire</button>
  <button data-type="Water" class="pk-type-btn">Water</button>
  <button data-type="Grass" class="pk-type-btn">Grass</button>
  <button data-type="Electric" class="pk-type-btn">Electric</button>
  <button data-type="Psychic" class="pk-type-btn">Psychic</button>
  <button data-type="Ice" class="pk-type-btn">Ice</button>
  <button data-type="Fighting" class="pk-type-btn">Fighting</button>
  <button data-type="Poison" class="pk-type-btn">Poison</button>
  <button data-type="Ground" class="pk-type-btn">Ground</button>
  <button data-type="Flying" class="pk-type-btn">Flying</button>
  <button data-type="Bug" class="pk-type-btn">Bug</button>
  <button data-type="Rock" class="pk-type-btn">Rock</button>
  <button data-type="Ghost" class="pk-type-btn">Ghost</button>
  <button data-type="Dragon" class="pk-type-btn">Dragon</button>
  <button data-type="Normal" class="pk-type-btn">Normal</button>
</div>
```

---

## CSS Additions

```css
.pk-type-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

.pk-type-btn {
  padding: 2px 6px;
  font-size: 0.7rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: #333;
  color: #eee;
}

.pk-type-btn.active {
  background: #ff5252;
  color: #fff;
}
```

---

## JavaScript Logic (sidebar.js)

Add this near your search logic:

```js
let activeTypes = [];

function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();

  filtered = pokedex.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      String(p.id).padStart(3, "0").includes(q);

    const matchesType =
      activeTypes.length === 0 || activeTypes.every((t) => p.types.includes(t));

    return matchesSearch && matchesType;
  });

  renderList();
}

document.querySelectorAll(".pk-type-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;

    if (type === "All") {
      activeTypes = [];
      document
        .querySelectorAll(".pk-type-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
      return;
    }

    document.querySelector('[data-type="All"]').classList.remove("active");

    if (activeTypes.includes(type)) {
      activeTypes = activeTypes.filter((t) => t !== type);
      btn.classList.remove("active");
    } else {
      activeTypes.push(type);
      btn.classList.add("active");
    }

    applyFilters();
  });
});
```

---

# 🟦 Team Builder Webview (Drag‑and‑Drop)

**Takeaway:** A full second webview where users drag Pokémon from a list into a 6‑slot team panel.  
This is a _feature extension_ rather than a sidebar enhancement.

---

## UX Flow

- Command: **Open Team Builder**
- Opens a new webview panel: `pokedexKanto.teamBuilder`
- Left side: scrollable list of all 151 Pokémon
- Right side: 6 empty slots
- Drag a Pokémon → drop into a slot
- Slots show sprite, name, types
- “Export Team JSON” button inserts JSON into the editor
- “Clear Team” resets all slots

---

## Webview HTML

```html
<div class="team-builder">
  <aside class="team-list">
    <ul id="team-list"></ul>
  </aside>

  <section class="team-slots">
    <div class="slot" data-slot="0"></div>
    <div class="slot" data-slot="1"></div>
    <div class="slot" data-slot="2"></div>
    <div class="slot" data-slot="3"></div>
    <div class="slot" data-slot="4"></div>
    <div class="slot" data-slot="5"></div>

    <button id="export-team">Export Team JSON</button>
    <button id="clear-team">Clear Team</button>
  </section>
</div>
```

---

## CSS

```css
.team-builder {
  display: flex;
  height: 100vh;
}

.team-list {
  width: 40%;
  overflow-y: auto;
  background: #1b1b1b;
  border-right: 1px solid #333;
}

.team-slots {
  flex: 1;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.slot {
  border: 2px dashed #555;
  border-radius: 8px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
}

.slot.filled {
  border-style: solid;
  background: #222;
}
```

---

## Drag‑and‑Drop Logic (teamBuilder.js)

```js
let team = [null, null, null, null, null, null];

function renderList() {
  const list = document.getElementById("team-list");
  list.innerHTML = "";

  pokedex.forEach((p) => {
    const li = document.createElement("li");
    li.className = "team-item";
    li.draggable = true;
    li.dataset.id = p.id;
    li.textContent = `${p.id.toString().padStart(3, "0")} — ${p.name}`;

    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("pokemonId", p.id);
    });

    list.appendChild(li);
  });
}

function renderSlots() {
  document.querySelectorAll(".slot").forEach((slot) => {
    const index = Number(slot.dataset.slot);
    const p = team[index];

    if (!p) {
      slot.classList.remove("filled");
      slot.textContent = "Drop Pokémon";
      return;
    }

    slot.classList.add("filled");
    slot.innerHTML = `
      <strong>${p.name}</strong><br>
      <small>${p.types.join(" / ")}</small>
    `;
  });
}

document.querySelectorAll(".slot").forEach((slot) => {
  slot.addEventListener("dragover", (e) => e.preventDefault());

  slot.addEventListener("drop", (e) => {
    const id = Number(e.dataTransfer.getData("pokemonId"));
    const p = pokedex.find((x) => x.id === id);
    const index = Number(slot.dataset.slot);

    team[index] = p;
    renderSlots();
  });
});

document.getElementById("export-team").addEventListener("click", () => {
  const vscode = acquireVsCodeApi();
  vscode.postMessage({
    type: "exportTeam",
    team,
  });
});

document.getElementById("clear-team").addEventListener("click", () => {
  team = [null, null, null, null, null, null];
  renderSlots();
});

renderList();
renderSlots();
```

---

## VSCode Command Handler (extension.ts)

```ts
context.subscriptions.push(
  vscode.commands.registerCommand("pokedexKanto.openTeamBuilder", () => {
    const panel = vscode.window.createWebviewPanel(
      "teamBuilder",
      "Pokémon Team Builder",
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    panel.webview.html = getTeamBuilderHtml(context, pokedex);

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "exportTeam") {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.insertSnippet(
            new vscode.SnippetString(JSON.stringify(msg.team, null, 2)),
          );
        }
      }
    });
  }),
);
```

---
