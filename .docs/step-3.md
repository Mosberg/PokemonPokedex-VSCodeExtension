### Full `teamBuilder.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src https: data: vscode-resource:; script-src 'nonce-{{nonce}}'; style-src {{cspSource}} 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pokémon Team Builder</title>
    <link rel="stylesheet" href="{{stylesUri}}" />
  </head>
  <body class="pk-body">
    <div class="pk-header pk-header--team">
      <div class="pk-title">Pokémon Team Builder</div>
      <div class="pk-subtitle">
        Drag Pokémon into the 6 slots to build a team
      </div>
    </div>

    <div class="team-builder">
      <aside class="team-list">
        <div class="pk-list-header">
          <input
            id="team-search"
            class="pk-search"
            placeholder="Search Pokémon..."
          />
        </div>
        <ul id="team-list" class="pk-list-ul"></ul>
      </aside>

      <section class="team-slots">
        <div class="team-slots-grid">
          <div class="slot" data-slot="0"></div>
          <div class="slot" data-slot="1"></div>
          <div class="slot" data-slot="2"></div>
          <div class="slot" data-slot="3"></div>
          <div class="slot" data-slot="4"></div>
          <div class="slot" data-slot="5"></div>
        </div>

        <div class="team-actions">
          <button id="export-team" class="pk-btn pk-btn-primary">
            Export Team JSON
          </button>
          <button id="clear-team" class="pk-btn pk-btn-secondary">
            Clear Team
          </button>
        </div>
      </section>
    </div>

    <script nonce="{{nonce}}">
      const pokedex = {{pokedexJson}};
    </script>
    <script nonce="{{nonce}}" src="{{scriptUri}}"></script>
  </body>
</html>
```

**Note:** In your `extension.ts`, replace `{{nonce}}`, `{{stylesUri}}`, `{{scriptUri}}`, `{{cspSource}}`, and `{{pokedexJson}}` before assigning to `panel.webview.html`.

---

### Full `teamBuilder.js`

```js
(function () {
  const vscode = acquireVsCodeApi ? acquireVsCodeApi() : null;

  const listEl = document.getElementById("team-list");
  const searchEl = document.getElementById("team-search");
  const exportBtn = document.getElementById("export-team");
  const clearBtn = document.getElementById("clear-team");
  const slotEls = Array.from(document.querySelectorAll(".slot"));

  let filtered = pokedex.slice();
  let team = [null, null, null, null, null, null];

  function renderList() {
    listEl.innerHTML = "";
    filtered.forEach((p) => {
      const li = document.createElement("li");
      li.className = "team-item";
      li.draggable = true;
      li.dataset.id = p.id;
      li.innerHTML = `
        <span>${String(p.id).padStart(3, "0")} — ${p.name}</span>
        <span class="pk-list-types">${p.types.join(" / ")}</span>
      `;

      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("pokemonId", String(p.id));
      });

      listEl.appendChild(li);
    });
  }

  function renderSlots() {
    slotEls.forEach((slot) => {
      const index = Number(slot.dataset.slot);
      const p = team[index];

      if (!p) {
        slot.classList.remove("filled");
        slot.innerHTML = `<span class="slot-placeholder">Drop Pokémon</span>`;
        return;
      }

      slot.classList.add("filled");
      slot.innerHTML = `
        <div class="slot-content">
          <div class="slot-name">${p.name}</div>
          <div class="slot-types">
            ${p.types.map((t) => `<span class="pk-type pk-type--small">${t}</span>`).join("")}
          </div>
          <button class="slot-remove" data-remove="${index}">×</button>
        </div>
      `;
    });

    document.querySelectorAll(".slot-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.remove);
        team[idx] = null;
        renderSlots();
      });
    });
  }

  function applySearch() {
    const q = searchEl.value.trim().toLowerCase();
    filtered = pokedex.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.id).padStart(3, "0").includes(q),
    );
    renderList();
  }

  slotEls.forEach((slot) => {
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("slot--hover");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("slot--hover");
    });

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("slot--hover");

      const idStr = e.dataTransfer.getData("pokemonId");
      if (!idStr) return;

      const id = Number(idStr);
      const p = pokedex.find((x) => x.id === id);
      if (!p) return;

      const index = Number(slot.dataset.slot);
      team[index] = p;
      renderSlots();
    });
  });

  exportBtn.addEventListener("click", () => {
    if (!vscode) return;
    vscode.postMessage({
      type: "exportTeam",
      team,
    });
  });

  clearBtn.addEventListener("click", () => {
    team = [null, null, null, null, null, null];
    renderSlots();
  });

  searchEl.addEventListener("input", applySearch);

  filtered.sort((a, b) => a.id - b.id);
  renderList();
  renderSlots();
})();
```

---

### Full CSS theme for both views (`styles.css`)

```css
/* Base */

.pk-body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #0b0b0b;
  color: #f5f5f5;
}

/* Header */

.pk-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #b71c1c;
  color: #fff;
  border-bottom: 1px solid #880e0e;
}

.pk-header--team {
  background: #283593;
  border-bottom-color: #1a237e;
}

.pk-title {
  font-weight: 600;
  margin-right: 0.75rem;
}

.pk-subtitle {
  font-size: 0.8rem;
  opacity: 0.85;
}

/* Buttons */

.pk-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
}

.pk-btn-primary {
  background: #ff5252;
  color: #fff;
}

.pk-btn-primary:hover {
  background: #ff1744;
}

.pk-btn-secondary {
  background: #424242;
  color: #eee;
}

.pk-btn-secondary:hover {
  background: #616161;
}

/* Search */

.pk-search {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
  font-size: 0.8rem;
  background: #212121;
  color: #eee;
}

/* Sidebar Pokédex layout */

.pk-main {
  display: flex;
  height: calc(100vh - 40px);
}

.pk-list {
  width: 40%;
  border-right: 1px solid #333;
  overflow-y: auto;
  background: #111;
}

.pk-list-header {
  padding: 0.4rem;
  border-bottom: 1px solid #333;
  background: #151515;
}

.pk-list-ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pk-list-ul li {
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #222;
  font-size: 0.8rem;
}

.pk-list-ul li:hover,
.pk-list-ul li.active {
  background: #263238;
}

.pk-list-types {
  opacity: 0.8;
  font-size: 0.75rem;
}

/* Detail panel */

.pk-detail {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
}

.pk-detail-empty {
  opacity: 0.7;
  font-style: italic;
}

.pk-detail-card.hidden {
  display: none;
}

.pk-detail-card h2 {
  margin-top: 0;
}

/* Types */

.pk-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.pk-type {
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  background: #424242;
}

.pk-type--small {
  font-size: 0.65rem;
}

/* Stats */

.pk-stats {
  margin-top: 0.5rem;
}

.pk-stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

/* Type filters */

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

/* Team builder layout */

.team-builder {
  display: flex;
  height: calc(100vh - 40px);
}

.team-list {
  width: 40%;
  overflow-y: auto;
  background: #111;
  border-right: 1px solid #333;
}

.team-slots {
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.team-slots-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.slot {
  border: 2px dashed #555;
  border-radius: 8px;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  font-size: 0.8rem;
  text-align: center;
  padding: 0.5rem;
}

.slot.filled {
  border-style: solid;
  background: #1c1c1c;
  color: #eee;
}

.slot--hover {
  border-color: #ff5252;
}

.slot-placeholder {
  opacity: 0.7;
}

.slot-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
  position: relative;
}

.slot-name {
  font-weight: 600;
}

.slot-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.slot-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  border: none;
  border-radius: 999px;
  width: 18px;
  height: 18px;
  font-size: 0.8rem;
  cursor: pointer;
  background: #b71c1c;
  color: #fff;
}

/* Team actions */

.team-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}
```

---

### Combined multi‑webview architecture

#### Overview

- **Sidebar Pokédex:** `WebviewViewProvider` with id `pokedexKantoView`.
- **Team Builder Panel:** `WebviewPanel` created via command `pokedexKanto.openTeamBuilder`.
- **Shared assets:** `media/styles.css`, `media/sidebar.js`, `media/teamBuilder.js`.
- **Shared data:** `gen1.json` loaded once in `extension.ts` and injected into both webviews.

---

#### Extension wiring (`extension.ts` core pieces)

```ts
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getTeamBuilderHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  pokedex: Pokemon[],
): string {
  const nonce = getNonce();
  const cspSource = webview.cspSource;
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "teamBuilder.js"),
  );
  const stylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "styles.css"),
  );
  const pokedexJson = JSON.stringify(pokedex);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src https: data: ${cspSource}; script-src 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline';" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pokémon Team Builder</title>
        <link rel="stylesheet" href="${stylesUri}" />
      </head>
      <body class="pk-body">
        <div class="pk-header pk-header--team">
          <div class="pk-title">Pokémon Team Builder</div>
          <div class="pk-subtitle">Drag Pokémon into the 6 slots to build a team</div>
        </div>
        <div class="team-builder">
          <aside class="team-list">
            <div class="pk-list-header">
              <input id="team-search" class="pk-search" placeholder="Search Pokémon..." />
            </div>
            <ul id="team-list" class="pk-list-ul"></ul>
          </aside>
          <section class="team-slots">
            <div class="team-slots-grid">
              <div class="slot" data-slot="0"></div>
              <div class="slot" data-slot="1"></div>
              <div class="slot" data-slot="2"></div>
              <div class="slot" data-slot="3"></div>
              <div class="slot" data-slot="4"></div>
              <div class="slot" data-slot="5"></div>
            </div>
            <div class="team-actions">
              <button id="export-team" class="pk-btn pk-btn-primary">Export Team JSON</button>
              <button id="clear-team" class="pk-btn pk-btn-secondary">Clear Team</button>
            </div>
          </section>
        </div>
        <script nonce="${nonce}">
          const pokedex = ${pokedexJson};
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

export function activate(context: vscode.ExtensionContext) {
  const data = loadGen1Data(context);

  // Sidebar provider (already implemented)
  const sidebarProvider = createSidebarWebview(context, data);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "pokedexKantoView",
      sidebarProvider,
    ),
  );

  // Team builder command
  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.openTeamBuilder", () => {
      const panel = vscode.window.createWebviewPanel(
        "pokedexKanto.teamBuilder",
        "Pokémon Team Builder",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );

      panel.webview.html = getTeamBuilderHtml(context, panel.webview, data);

      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.type === "exportTeam") {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;
          const cleanTeam = (msg.team || []).filter(Boolean);
          editor.insertSnippet(
            new vscode.SnippetString(JSON.stringify(cleanTeam, null, 2)),
          );
        }
      });
    }),
  );

  // ...hover + completion providers, other commands...
}
```

---
