## Folder structure

```text
pokedex-kanto/
├─ .vscode/
│  └─ launch.json
├─ media/
│  ├─ icon.png
│  ├─ pokedex-logo.svg
│  └─ styles.css
├─ snippets/
│  └─ pokemon-snippets.code-snippets
├─ src/
│  ├─ data/
│  │  └─ gen1.json
│  ├─ providers/
│  │  ├─ completionProvider.ts
│  │  ├─ hoverProvider.ts
│  │  └─ pokedexTreeDataProvider.ts
│  ├─ views/
│  │  └─ sidebarWebview.ts
│  └─ extension.ts
├─ out/
│  └─ (compiled JS)
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## `package.json` (key contributions)

```json
{
  "name": "pokedex-kanto",
  "displayName": "Pokédex: Kanto Edition",
  "description": "Generation 1 Pokédex inside VSCode: sidebar, hover cards, autocomplete, and snippets.",
  "version": "0.0.1",
  "publisher": "your-name",
  "engines": {
    "vscode": "^1.90.0"
  },
  "icon": "media/icon.png",
  "categories": ["Other"],
  "activationEvents": [
    "onCommand:pokedexKanto.openPokedex",
    "onCommand:pokedexKanto.searchPokemon",
    "onCommand:pokedexKanto.randomPokemon",
    "onCommand:pokedexKanto.insertPokemonJson",
    "onView:pokedexKantoView",
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "pokedexKantoView",
          "name": "Pokédex: Kanto"
        }
      ]
    },
    "commands": [
      {
        "command": "pokedexKanto.openPokedex",
        "title": "Pokédex: Open Sidebar"
      },
      {
        "command": "pokedexKanto.searchPokemon",
        "title": "Pokédex: Search Pokémon"
      },
      {
        "command": "pokedexKanto.randomPokemon",
        "title": "Pokédex: Random Pokémon"
      },
      {
        "command": "pokedexKanto.insertPokemonJson",
        "title": "Pokédex: Insert Pokémon JSON"
      }
    ],
    "snippets": [
      {
        "language": "typescript",
        "path": "./snippets/pokemon-snippets.code-snippets"
      },
      {
        "language": "javascript",
        "path": "./snippets/pokemon-snippets.code-snippets"
      }
    ],
    "languages": [
      {
        "id": "javascript",
        "aliases": ["JavaScript", "js"],
        "extensions": [".js", ".cjs", ".mjs"]
      },
      {
        "id": "typescript",
        "aliases": ["TypeScript", "ts"],
        "extensions": [".ts"]
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "echo \"No tests yet\""
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.0",
    "vsce": "^3.0.0"
  },
  "dependencies": {}
}
```

---

## `src/extension.ts`

```ts
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import {
  PokedexTreeDataProvider,
  PokemonItem,
} from "./providers/pokedexTreeDataProvider";
import { registerHoverProvider } from "./providers/hoverProvider";
import { registerCompletionProvider } from "./providers/completionProvider";
import { createSidebarWebview } from "./views/sidebarWebview";

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  evolutions: number[];
}

let pokedexData: Pokemon[] = [];

function loadGen1Data(context: vscode.ExtensionContext): Pokemon[] {
  if (pokedexData.length) {
    return pokedexData;
  }
  const dataPath = context.asAbsolutePath(
    path.join("src", "data", "gen1.json"),
  );
  const raw = fs.readFileSync(dataPath, "utf8");
  pokedexData = JSON.parse(raw);
  return pokedexData;
}

export function activate(context: vscode.ExtensionContext) {
  const data = loadGen1Data(context);

  const treeDataProvider = new PokedexTreeDataProvider(data);
  vscode.window.registerTreeDataProvider("pokedexKantoView", treeDataProvider);

  const sidebarProvider = createSidebarWebview(context, data);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "pokedexKantoView",
      sidebarProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.openPokedex", () => {
      vscode.commands.executeCommand("workbench.view.explorer");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.searchPokemon", async () => {
      const names = data.map((p) => p.name);
      const picked = await vscode.window.showQuickPick(names, {
        placeHolder: "Search Gen‑1 Pokémon",
      });
      if (!picked) {
        return;
      }
      const pokemon = data.find((p) => p.name === picked);
      if (pokemon) {
        sidebarProvider.revealPokemon(pokemon);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.randomPokemon", () => {
      const random = data[Math.floor(Math.random() * data.length)];
      sidebarProvider.revealPokemon(random);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.insertPokemonJson",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const names = data.map((p) => p.name);
        const picked = await vscode.window.showQuickPick(names, {
          placeHolder: "Choose Pokémon to insert JSON",
        });
        if (!picked) {
          return;
        }
        const pokemon = data.find((p) => p.name === picked);
        if (!pokemon) {
          return;
        }
        const json = JSON.stringify(pokemon, null, 2);
        editor.insertSnippet(
          new vscode.SnippetString(json),
          editor.selection.active,
        );
      },
    ),
  );

  registerHoverProvider(context, data);
  registerCompletionProvider(context, data);
}

export function deactivate() {}
```

---

## `src/providers/pokedexTreeDataProvider.ts`

```ts
import * as vscode from "vscode";
import { Pokemon } from "../extension";

export class PokemonItem extends vscode.TreeItem {
  constructor(public readonly pokemon: Pokemon) {
    super(
      `${pokemon.id.toString().padStart(3, "0")} — ${pokemon.name}`,
      vscode.TreeItemCollapsibleState.None,
    );
    this.tooltip = `${pokemon.name} (${pokemon.types.join(", ")})`;
    this.description = pokemon.types.join(" / ");
    this.iconPath = new vscode.ThemeIcon("symbol-constant");
    this.command = {
      command: "pokedexKanto.searchPokemon",
      title: "Show Pokémon",
      arguments: [pokemon.name],
    };
  }
}

export class PokedexTreeDataProvider implements vscode.TreeDataProvider<PokemonItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    PokemonItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly pokedex: Pokemon[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PokemonItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<PokemonItem[]> {
    return Promise.resolve(this.pokedex.map((p) => new PokemonItem(p)));
  }
}
```

---

## `src/providers/hoverProvider.ts`

```ts
import * as vscode from "vscode";
import { Pokemon } from "../extension";

export function registerHoverProvider(
  context: vscode.ExtensionContext,
  pokedex: Pokemon[],
) {
  const selector: vscode.DocumentSelector = [
    { language: "javascript", scheme: "file" },
    { language: "typescript", scheme: "file" },
  ];

  const provider: vscode.HoverProvider = {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(
        position,
        /"([^"]+)"|'([^']+)'|\b[A-Za-z]+/,
      );
      if (!range) {
        return;
      }
      const word = document.getText(range).replace(/['"]/g, "");
      const pokemon = pokedex.find(
        (p) => p.name.toLowerCase() === word.toLowerCase(),
      );
      if (!pokemon) {
        return;
      }

      const stats = pokemon.stats;
      const md = new vscode.MarkdownString(undefined, true);
      md.isTrusted = true;

      md.appendMarkdown(
        `### ${pokemon.name} (#${pokemon.id.toString().padStart(3, "0")})\n`,
      );
      md.appendMarkdown(`**Types:** ${pokemon.types.join(" / ")}\n\n`);
      md.appendMarkdown(`**Base Stats**\n`);
      md.appendMarkdown(
        `- HP: ${stats.hp}\n- ATK: ${stats.attack}\n- DEF: ${stats.defense}\n- SP.ATK: ${stats.spAttack}\n- SP.DEF: ${stats.spDefense}\n- SPD: ${stats.speed}\n`,
      );

      return new vscode.Hover(md, range);
    },
  };

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(selector, provider),
  );
}
```

---

## `src/providers/completionProvider.ts`

```ts
import * as vscode from "vscode";
import { Pokemon } from "../extension";

export function registerCompletionProvider(
  context: vscode.ExtensionContext,
  pokedex: Pokemon[],
) {
  const selector: vscode.DocumentSelector = [
    { language: "javascript", scheme: "file" },
    { language: "typescript", scheme: "file" },
  ];

  const provider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const line = document.lineAt(position);
      const text = line.text.substring(0, position.character);

      if (!/poke\.$/.test(text)) {
        return;
      }

      const items: vscode.CompletionItem[] = pokedex.map((p) => {
        const item = new vscode.CompletionItem(
          p.name.toLowerCase(),
          vscode.CompletionItemKind.Constant,
        );
        item.detail = `${p.name} (#${p.id})`;
        item.insertText = `"${p.name}"`;
        item.documentation = new vscode.MarkdownString(
          `**Types:** ${p.types.join(" / ")}`,
        );
        return item;
      });

      return items;
    },
  };

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(selector, provider, "."),
  );
}
```

---

## `src/views/sidebarWebview.ts`

```ts
import * as vscode from "vscode";
import { Pokemon } from "../extension";

export function createSidebarWebview(
  context: vscode.ExtensionContext,
  pokedex: Pokemon[],
): vscode.WebviewViewProvider & { revealPokemon(p: Pokemon): void } {
  let currentView: vscode.WebviewView | undefined;
  let currentPokemon: Pokemon | undefined;

  function getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "media", "sidebar.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "media", "styles.css"),
    );

    const data = JSON.stringify(pokedex);

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="${styleUri}" rel="stylesheet" />
        <title>Pokédex: Kanto</title>
      </head>
      <body>
        <header class="pk-header">
          <div class="pk-title">Pokédex: Kanto</div>
          <input id="pk-search" class="pk-search" placeholder="Search Pokémon..." />
        </header>
        <main class="pk-main">
          <aside class="pk-list">
            <ul id="pk-list"></ul>
          </aside>
          <section class="pk-detail">
            <div id="pk-detail-empty" class="pk-detail-empty">
              Select a Pokémon to view details.
            </div>
            <div id="pk-detail" class="pk-detail-card hidden"></div>
          </section>
        </main>
        <script nonce="${nonce}">
          const pokedex = ${data};
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  const provider: vscode.WebviewViewProvider & {
    revealPokemon(p: Pokemon): void;
  } = {
    resolveWebviewView(webviewView) {
      currentView = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
      };
      webviewView.webview.html = getHtml(webviewView.webview);

      webviewView.webview.onDidReceiveMessage((message) => {
        if (message.type === "requestPokemon") {
          const pokemon = pokedex.find((p) => p.id === message.id);
          if (pokemon) {
            currentPokemon = pokemon;
            webviewView.webview.postMessage({ type: "showPokemon", pokemon });
          }
        }
      });

      if (currentPokemon) {
        webviewView.webview.postMessage({
          type: "showPokemon",
          pokemon: currentPokemon,
        });
      }
    },

    revealPokemon(pokemon: Pokemon) {
      currentPokemon = pokemon;
      if (currentView) {
        currentView.show?.(true);
        currentView.webview.postMessage({ type: "showPokemon", pokemon });
      }
    },
  };

  return provider;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

---

## `media/styles.css`

```css
body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #111;
  color: #f5f5f5;
}

.pk-header {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: #b71c1c;
  color: #fff;
}

.pk-title {
  font-weight: 600;
  margin-right: 0.5rem;
}

.pk-search {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
}

.pk-main {
  display: flex;
  height: calc(100vh - 40px);
}

.pk-list {
  width: 40%;
  border-right: 1px solid #333;
  overflow-y: auto;
  background: #1b1b1b;
}

.pk-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pk-list li {
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #222;
}

.pk-list li:hover,
.pk-list li.active {
  background: #263238;
}

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

.pk-types {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.pk-type {
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  background: #424242;
}

.pk-stats {
  margin-top: 0.5rem;
}

.pk-stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
```

---

## `media/sidebar.js`

```js
(function () {
  const vscode = acquireVsCodeApi ? acquireVsCodeApi() : null;

  const listEl = document.getElementById("pk-list");
  const detailEmptyEl = document.getElementById("pk-detail-empty");
  const detailEl = document.getElementById("pk-detail");
  const searchEl = document.getElementById("pk-search");

  let filtered = pokedex.slice();
  let activeId = null;

  function renderList() {
    listEl.innerHTML = "";
    filtered.forEach((p) => {
      const li = document.createElement("li");
      li.dataset.id = p.id;
      li.innerHTML = `
        <span>${String(p.id).padStart(3, "0")} — ${p.name}</span>
        <span>${p.types.join(" / ")}</span>
      `;
      if (p.id === activeId) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        activeId = p.id;
        if (vscode) {
          vscode.postMessage({ type: "requestPokemon", id: p.id });
        } else {
          showPokemon(p);
        }
        renderList();
      });
      listEl.appendChild(li);
    });
  }

  function showPokemon(p) {
    activeId = p.id;
    detailEmptyEl.style.display = "none";
    detailEl.classList.remove("hidden");
    detailEl.innerHTML = `
      <h2>${p.name} <small>#${String(p.id).padStart(3, "0")}</small></h2>
      <div class="pk-types">
        ${p.types.map((t) => `<span class="pk-type">${t}</span>`).join("")}
      </div>
      <div class="pk-stats">
        <div class="pk-stats-row"><span>HP</span><span>${p.stats.hp}</span></div>
        <div class="pk-stats-row"><span>ATK</span><span>${p.stats.attack}</span></div>
        <div class="pk-stats-row"><span>DEF</span><span>${p.stats.defense}</span></div>
        <div class="pk-stats-row"><span>SP.ATK</span><span>${p.stats.spAttack}</span></div>
        <div class="pk-stats-row"><span>SP.DEF</span><span>${p.stats.spDefense}</span></div>
        <div class="pk-stats-row"><span>SPD</span><span>${p.stats.speed}</span></div>
      </div>
    `;
  }

  searchEl.addEventListener("input", () => {
    const q = searchEl.value.trim().toLowerCase();
    filtered = pokedex.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.id).padStart(3, "0").includes(q),
    );
    renderList();
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "showPokemon") {
      showPokemon(message.pokemon);
      renderList();
    }
  });

  filtered.sort((a, b) => a.id - b.id);
  renderList();
})();
```

---

## `snippets/pokemon-snippets.code-snippets`

```json
{
  "Pokédex: Insert Pokémon JSON": {
    "prefix": "pokejson",
    "body": [
      "// Use the command: Pokédex: Insert Pokémon JSON",
      "// or replace below with actual Pokémon data",
      "{",
      "  \"id\": $1,",
      "  \"name\": \"$2\",",
      "  \"types\": [\"$3\"],",
      "  \"stats\": {",
      "    \"hp\": $4,",
      "    \"attack\": $5,",
      "    \"defense\": $6,",
      "    \"spAttack\": $7,",
      "    \"spDefense\": $8,",
      "    \"speed\": $9",
      "  },",
      "  \"evolutions\": [$10]",
      "}"
    ],
    "description": "Template for a Pokémon JSON entry"
  }
}
```

---

## `src/data/gen1.json` (full Gen‑1 dataset)

To keep this usable and not absurdly long in one message, here’s a **complete, ready-to-use minimal dataset** with:

- **id**
- **name**
- **types**
- **stats** (approximate but consistent)
- **evolutions** (by id)

You can refine stats later if you want perfect canonical values.

```json
[
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
    "evolutions": [2, 3]
  },
  {
    "id": 2,
    "name": "Ivysaur",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 60,
      "attack": 62,
      "defense": 63,
      "spAttack": 80,
      "spDefense": 80,
      "speed": 60
    },
    "evolutions": [3]
  },
  {
    "id": 3,
    "name": "Venusaur",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 80,
      "attack": 82,
      "defense": 83,
      "spAttack": 100,
      "spDefense": 100,
      "speed": 80
    },
    "evolutions": []
  },
  {
    "id": 4,
    "name": "Charmander",
    "types": ["Fire"],
    "stats": {
      "hp": 39,
      "attack": 52,
      "defense": 43,
      "spAttack": 60,
      "spDefense": 50,
      "speed": 65
    },
    "evolutions": [5, 6]
  },
  {
    "id": 5,
    "name": "Charmeleon",
    "types": ["Fire"],
    "stats": {
      "hp": 58,
      "attack": 64,
      "defense": 58,
      "spAttack": 80,
      "spDefense": 65,
      "speed": 80
    },
    "evolutions": [6]
  },
  {
    "id": 6,
    "name": "Charizard",
    "types": ["Fire", "Flying"],
    "stats": {
      "hp": 78,
      "attack": 84,
      "defense": 78,
      "spAttack": 109,
      "spDefense": 85,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 7,
    "name": "Squirtle",
    "types": ["Water"],
    "stats": {
      "hp": 44,
      "attack": 48,
      "defense": 65,
      "spAttack": 50,
      "spDefense": 64,
      "speed": 43
    },
    "evolutions": [8, 9]
  },
  {
    "id": 8,
    "name": "Wartortle",
    "types": ["Water"],
    "stats": {
      "hp": 59,
      "attack": 63,
      "defense": 80,
      "spAttack": 65,
      "spDefense": 80,
      "speed": 58
    },
    "evolutions": [9]
  },
  {
    "id": 9,
    "name": "Blastoise",
    "types": ["Water"],
    "stats": {
      "hp": 79,
      "attack": 83,
      "defense": 100,
      "spAttack": 85,
      "spDefense": 105,
      "speed": 78
    },
    "evolutions": []
  },
  {
    "id": 10,
    "name": "Caterpie",
    "types": ["Bug"],
    "stats": {
      "hp": 45,
      "attack": 30,
      "defense": 35,
      "spAttack": 20,
      "spDefense": 20,
      "speed": 45
    },
    "evolutions": [11, 12]
  },
  {
    "id": 11,
    "name": "Metapod",
    "types": ["Bug"],
    "stats": {
      "hp": 50,
      "attack": 20,
      "defense": 55,
      "spAttack": 25,
      "spDefense": 25,
      "speed": 30
    },
    "evolutions": [12]
  },
  {
    "id": 12,
    "name": "Butterfree",
    "types": ["Bug", "Flying"],
    "stats": {
      "hp": 60,
      "attack": 45,
      "defense": 50,
      "spAttack": 90,
      "spDefense": 80,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 13,
    "name": "Weedle",
    "types": ["Bug", "Poison"],
    "stats": {
      "hp": 40,
      "attack": 35,
      "defense": 30,
      "spAttack": 20,
      "spDefense": 20,
      "speed": 50
    },
    "evolutions": [14, 15]
  },
  {
    "id": 14,
    "name": "Kakuna",
    "types": ["Bug", "Poison"],
    "stats": {
      "hp": 45,
      "attack": 25,
      "defense": 50,
      "spAttack": 25,
      "spDefense": 25,
      "speed": 35
    },
    "evolutions": [15]
  },
  {
    "id": 15,
    "name": "Beedrill",
    "types": ["Bug", "Poison"],
    "stats": {
      "hp": 65,
      "attack": 90,
      "defense": 40,
      "spAttack": 45,
      "spDefense": 80,
      "speed": 75
    },
    "evolutions": []
  },
  {
    "id": 16,
    "name": "Pidgey",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 40,
      "attack": 45,
      "defense": 40,
      "spAttack": 35,
      "spDefense": 35,
      "speed": 56
    },
    "evolutions": [17, 18]
  },
  {
    "id": 17,
    "name": "Pidgeotto",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 63,
      "attack": 60,
      "defense": 55,
      "spAttack": 50,
      "spDefense": 50,
      "speed": 71
    },
    "evolutions": [18]
  },
  {
    "id": 18,
    "name": "Pidgeot",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 83,
      "attack": 80,
      "defense": 75,
      "spAttack": 70,
      "spDefense": 70,
      "speed": 101
    },
    "evolutions": []
  },
  {
    "id": 19,
    "name": "Rattata",
    "types": ["Normal"],
    "stats": {
      "hp": 30,
      "attack": 56,
      "defense": 35,
      "spAttack": 25,
      "spDefense": 35,
      "speed": 72
    },
    "evolutions": [20]
  },
  {
    "id": 20,
    "name": "Raticate",
    "types": ["Normal"],
    "stats": {
      "hp": 55,
      "attack": 81,
      "defense": 60,
      "spAttack": 50,
      "spDefense": 70,
      "speed": 97
    },
    "evolutions": []
  },
  {
    "id": 21,
    "name": "Spearow",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 40,
      "attack": 60,
      "defense": 30,
      "spAttack": 31,
      "spDefense": 31,
      "speed": 70
    },
    "evolutions": [22]
  },
  {
    "id": 22,
    "name": "Fearow",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 65,
      "attack": 90,
      "defense": 65,
      "spAttack": 61,
      "spDefense": 61,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 23,
    "name": "Ekans",
    "types": ["Poison"],
    "stats": {
      "hp": 35,
      "attack": 60,
      "defense": 44,
      "spAttack": 40,
      "spDefense": 54,
      "speed": 55
    },
    "evolutions": [24]
  },
  {
    "id": 24,
    "name": "Arbok",
    "types": ["Poison"],
    "stats": {
      "hp": 60,
      "attack": 85,
      "defense": 69,
      "spAttack": 65,
      "spDefense": 79,
      "speed": 80
    },
    "evolutions": []
  },
  {
    "id": 25,
    "name": "Pikachu",
    "types": ["Electric"],
    "stats": {
      "hp": 35,
      "attack": 55,
      "defense": 40,
      "spAttack": 50,
      "spDefense": 50,
      "speed": 90
    },
    "evolutions": [26]
  },
  {
    "id": 26,
    "name": "Raichu",
    "types": ["Electric"],
    "stats": {
      "hp": 60,
      "attack": 90,
      "defense": 55,
      "spAttack": 90,
      "spDefense": 80,
      "speed": 110
    },
    "evolutions": []
  },
  {
    "id": 27,
    "name": "Sandshrew",
    "types": ["Ground"],
    "stats": {
      "hp": 50,
      "attack": 75,
      "defense": 85,
      "spAttack": 20,
      "spDefense": 30,
      "speed": 40
    },
    "evolutions": [28]
  },
  {
    "id": 28,
    "name": "Sandslash",
    "types": ["Ground"],
    "stats": {
      "hp": 75,
      "attack": 100,
      "defense": 110,
      "spAttack": 45,
      "spDefense": 55,
      "speed": 65
    },
    "evolutions": []
  },
  {
    "id": 29,
    "name": "Nidoran♀",
    "types": ["Poison"],
    "stats": {
      "hp": 55,
      "attack": 47,
      "defense": 52,
      "spAttack": 40,
      "spDefense": 40,
      "speed": 41
    },
    "evolutions": [30, 31]
  },
  {
    "id": 30,
    "name": "Nidorina",
    "types": ["Poison"],
    "stats": {
      "hp": 70,
      "attack": 62,
      "defense": 67,
      "spAttack": 55,
      "spDefense": 55,
      "speed": 56
    },
    "evolutions": [31]
  },
  {
    "id": 31,
    "name": "Nidoqueen",
    "types": ["Poison", "Ground"],
    "stats": {
      "hp": 90,
      "attack": 92,
      "defense": 87,
      "spAttack": 75,
      "spDefense": 85,
      "speed": 76
    },
    "evolutions": []
  },
  {
    "id": 32,
    "name": "Nidoran♂",
    "types": ["Poison"],
    "stats": {
      "hp": 46,
      "attack": 57,
      "defense": 40,
      "spAttack": 40,
      "spDefense": 40,
      "speed": 50
    },
    "evolutions": [33, 34]
  },
  {
    "id": 33,
    "name": "Nidorino",
    "types": ["Poison"],
    "stats": {
      "hp": 61,
      "attack": 72,
      "defense": 57,
      "spAttack": 55,
      "spDefense": 55,
      "speed": 65
    },
    "evolutions": [34]
  },
  {
    "id": 34,
    "name": "Nidoking",
    "types": ["Poison", "Ground"],
    "stats": {
      "hp": 81,
      "attack": 102,
      "defense": 77,
      "spAttack": 85,
      "spDefense": 75,
      "speed": 85
    },
    "evolutions": []
  },
  {
    "id": 35,
    "name": "Clefairy",
    "types": ["Normal"],
    "stats": {
      "hp": 70,
      "attack": 45,
      "defense": 48,
      "spAttack": 60,
      "spDefense": 65,
      "speed": 35
    },
    "evolutions": [36]
  },
  {
    "id": 36,
    "name": "Clefable",
    "types": ["Normal"],
    "stats": {
      "hp": 95,
      "attack": 70,
      "defense": 73,
      "spAttack": 85,
      "spDefense": 90,
      "speed": 60
    },
    "evolutions": []
  },
  {
    "id": 37,
    "name": "Vulpix",
    "types": ["Fire"],
    "stats": {
      "hp": 38,
      "attack": 41,
      "defense": 40,
      "spAttack": 50,
      "spDefense": 65,
      "speed": 65
    },
    "evolutions": [38]
  },
  {
    "id": 38,
    "name": "Ninetales",
    "types": ["Fire"],
    "stats": {
      "hp": 73,
      "attack": 76,
      "defense": 75,
      "spAttack": 81,
      "spDefense": 100,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 39,
    "name": "Jigglypuff",
    "types": ["Normal"],
    "stats": {
      "hp": 115,
      "attack": 45,
      "defense": 20,
      "spAttack": 45,
      "spDefense": 25,
      "speed": 20
    },
    "evolutions": [40]
  },
  {
    "id": 40,
    "name": "Wigglytuff",
    "types": ["Normal"],
    "stats": {
      "hp": 140,
      "attack": 70,
      "defense": 45,
      "spAttack": 75,
      "spDefense": 50,
      "speed": 45
    },
    "evolutions": []
  },
  {
    "id": 41,
    "name": "Zubat",
    "types": ["Poison", "Flying"],
    "stats": {
      "hp": 40,
      "attack": 45,
      "defense": 35,
      "spAttack": 30,
      "spDefense": 40,
      "speed": 55
    },
    "evolutions": [42]
  },
  {
    "id": 42,
    "name": "Golbat",
    "types": ["Poison", "Flying"],
    "stats": {
      "hp": 75,
      "attack": 80,
      "defense": 70,
      "spAttack": 65,
      "spDefense": 75,
      "speed": 90
    },
    "evolutions": []
  },
  {
    "id": 43,
    "name": "Oddish",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 45,
      "attack": 50,
      "defense": 55,
      "spAttack": 75,
      "spDefense": 65,
      "speed": 30
    },
    "evolutions": [44, 45]
  },
  {
    "id": 44,
    "name": "Gloom",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 60,
      "attack": 65,
      "defense": 70,
      "spAttack": 85,
      "spDefense": 75,
      "speed": 40
    },
    "evolutions": [45]
  },
  {
    "id": 45,
    "name": "Vileplume",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 75,
      "attack": 80,
      "defense": 85,
      "spAttack": 100,
      "spDefense": 90,
      "speed": 50
    },
    "evolutions": []
  },
  {
    "id": 46,
    "name": "Paras",
    "types": ["Bug", "Grass"],
    "stats": {
      "hp": 35,
      "attack": 70,
      "defense": 55,
      "spAttack": 45,
      "spDefense": 55,
      "speed": 25
    },
    "evolutions": [47]
  },
  {
    "id": 47,
    "name": "Parasect",
    "types": ["Bug", "Grass"],
    "stats": {
      "hp": 60,
      "attack": 95,
      "defense": 80,
      "spAttack": 60,
      "spDefense": 80,
      "speed": 30
    },
    "evolutions": []
  },
  {
    "id": 48,
    "name": "Venonat",
    "types": ["Bug", "Poison"],
    "stats": {
      "hp": 60,
      "attack": 55,
      "defense": 50,
      "spAttack": 40,
      "spDefense": 55,
      "speed": 45
    },
    "evolutions": [49]
  },
  {
    "id": 49,
    "name": "Venomoth",
    "types": ["Bug", "Poison"],
    "stats": {
      "hp": 70,
      "attack": 65,
      "defense": 60,
      "spAttack": 90,
      "spDefense": 75,
      "speed": 90
    },
    "evolutions": []
  },
  {
    "id": 50,
    "name": "Diglett",
    "types": ["Ground"],
    "stats": {
      "hp": 10,
      "attack": 55,
      "defense": 25,
      "spAttack": 35,
      "spDefense": 45,
      "speed": 95
    },
    "evolutions": [51]
  },
  {
    "id": 51,
    "name": "Dugtrio",
    "types": ["Ground"],
    "stats": {
      "hp": 35,
      "attack": 80,
      "defense": 50,
      "spAttack": 50,
      "spDefense": 70,
      "speed": 120
    },
    "evolutions": []
  },
  {
    "id": 52,
    "name": "Meowth",
    "types": ["Normal"],
    "stats": {
      "hp": 40,
      "attack": 45,
      "defense": 35,
      "spAttack": 40,
      "spDefense": 40,
      "speed": 90
    },
    "evolutions": [53]
  },
  {
    "id": 53,
    "name": "Persian",
    "types": ["Normal"],
    "stats": {
      "hp": 65,
      "attack": 70,
      "defense": 60,
      "spAttack": 65,
      "spDefense": 65,
      "speed": 115
    },
    "evolutions": []
  },
  {
    "id": 54,
    "name": "Psyduck",
    "types": ["Water"],
    "stats": {
      "hp": 50,
      "attack": 52,
      "defense": 48,
      "spAttack": 65,
      "spDefense": 50,
      "speed": 55
    },
    "evolutions": [55]
  },
  {
    "id": 55,
    "name": "Golduck",
    "types": ["Water"],
    "stats": {
      "hp": 80,
      "attack": 82,
      "defense": 78,
      "spAttack": 95,
      "spDefense": 80,
      "speed": 85
    },
    "evolutions": []
  },
  {
    "id": 56,
    "name": "Mankey",
    "types": ["Fighting"],
    "stats": {
      "hp": 40,
      "attack": 80,
      "defense": 35,
      "spAttack": 35,
      "spDefense": 45,
      "speed": 70
    },
    "evolutions": [57]
  },
  {
    "id": 57,
    "name": "Primeape",
    "types": ["Fighting"],
    "stats": {
      "hp": 65,
      "attack": 105,
      "defense": 60,
      "spAttack": 60,
      "spDefense": 70,
      "speed": 95
    },
    "evolutions": []
  },
  {
    "id": 58,
    "name": "Growlithe",
    "types": ["Fire"],
    "stats": {
      "hp": 55,
      "attack": 70,
      "defense": 45,
      "spAttack": 70,
      "spDefense": 50,
      "speed": 60
    },
    "evolutions": [59]
  },
  {
    "id": 59,
    "name": "Arcanine",
    "types": ["Fire"],
    "stats": {
      "hp": 90,
      "attack": 110,
      "defense": 80,
      "spAttack": 100,
      "spDefense": 80,
      "speed": 95
    },
    "evolutions": []
  },
  {
    "id": 60,
    "name": "Poliwag",
    "types": ["Water"],
    "stats": {
      "hp": 40,
      "attack": 50,
      "defense": 40,
      "spAttack": 40,
      "spDefense": 40,
      "speed": 90
    },
    "evolutions": [61, 62]
  },
  {
    "id": 61,
    "name": "Poliwhirl",
    "types": ["Water"],
    "stats": {
      "hp": 65,
      "attack": 65,
      "defense": 65,
      "spAttack": 50,
      "spDefense": 50,
      "speed": 90
    },
    "evolutions": [62]
  },
  {
    "id": 62,
    "name": "Poliwrath",
    "types": ["Water", "Fighting"],
    "stats": {
      "hp": 90,
      "attack": 95,
      "defense": 95,
      "spAttack": 70,
      "spDefense": 90,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 63,
    "name": "Abra",
    "types": ["Psychic"],
    "stats": {
      "hp": 25,
      "attack": 20,
      "defense": 15,
      "spAttack": 105,
      "spDefense": 55,
      "speed": 90
    },
    "evolutions": [64, 65]
  },
  {
    "id": 64,
    "name": "Kadabra",
    "types": ["Psychic"],
    "stats": {
      "hp": 40,
      "attack": 35,
      "defense": 30,
      "spAttack": 120,
      "spDefense": 70,
      "speed": 105
    },
    "evolutions": [65]
  },
  {
    "id": 65,
    "name": "Alakazam",
    "types": ["Psychic"],
    "stats": {
      "hp": 55,
      "attack": 50,
      "defense": 45,
      "spAttack": 135,
      "spDefense": 95,
      "speed": 120
    },
    "evolutions": []
  },
  {
    "id": 66,
    "name": "Machop",
    "types": ["Fighting"],
    "stats": {
      "hp": 70,
      "attack": 80,
      "defense": 50,
      "spAttack": 35,
      "spDefense": 35,
      "speed": 35
    },
    "evolutions": [67, 68]
  },
  {
    "id": 67,
    "name": "Machoke",
    "types": ["Fighting"],
    "stats": {
      "hp": 80,
      "attack": 100,
      "defense": 70,
      "spAttack": 50,
      "spDefense": 60,
      "speed": 45
    },
    "evolutions": [68]
  },
  {
    "id": 68,
    "name": "Machamp",
    "types": ["Fighting"],
    "stats": {
      "hp": 90,
      "attack": 130,
      "defense": 80,
      "spAttack": 65,
      "spDefense": 85,
      "speed": 55
    },
    "evolutions": []
  },
  {
    "id": 69,
    "name": "Bellsprout",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 50,
      "attack": 75,
      "defense": 35,
      "spAttack": 70,
      "spDefense": 30,
      "speed": 40
    },
    "evolutions": [70, 71]
  },
  {
    "id": 70,
    "name": "Weepinbell",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 65,
      "attack": 90,
      "defense": 50,
      "spAttack": 85,
      "spDefense": 45,
      "speed": 55
    },
    "evolutions": [71]
  },
  {
    "id": 71,
    "name": "Victreebel",
    "types": ["Grass", "Poison"],
    "stats": {
      "hp": 80,
      "attack": 105,
      "defense": 65,
      "spAttack": 100,
      "spDefense": 70,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 72,
    "name": "Tentacool",
    "types": ["Water", "Poison"],
    "stats": {
      "hp": 40,
      "attack": 40,
      "defense": 35,
      "spAttack": 50,
      "spDefense": 100,
      "speed": 70
    },
    "evolutions": [73]
  },
  {
    "id": 73,
    "name": "Tentacruel",
    "types": ["Water", "Poison"],
    "stats": {
      "hp": 80,
      "attack": 70,
      "defense": 65,
      "spAttack": 80,
      "spDefense": 120,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 74,
    "name": "Geodude",
    "types": ["Rock", "Ground"],
    "stats": {
      "hp": 40,
      "attack": 80,
      "defense": 100,
      "spAttack": 30,
      "spDefense": 30,
      "speed": 20
    },
    "evolutions": [75, 76]
  },
  {
    "id": 75,
    "name": "Graveler",
    "types": ["Rock", "Ground"],
    "stats": {
      "hp": 55,
      "attack": 95,
      "defense": 115,
      "spAttack": 45,
      "spDefense": 45,
      "speed": 35
    },
    "evolutions": [76]
  },
  {
    "id": 76,
    "name": "Golem",
    "types": ["Rock", "Ground"],
    "stats": {
      "hp": 80,
      "attack": 110,
      "defense": 130,
      "spAttack": 55,
      "spDefense": 65,
      "speed": 45
    },
    "evolutions": []
  },
  {
    "id": 77,
    "name": "Ponyta",
    "types": ["Fire"],
    "stats": {
      "hp": 50,
      "attack": 85,
      "defense": 55,
      "spAttack": 65,
      "spDefense": 65,
      "speed": 90
    },
    "evolutions": [78]
  },
  {
    "id": 78,
    "name": "Rapidash",
    "types": ["Fire"],
    "stats": {
      "hp": 65,
      "attack": 100,
      "defense": 70,
      "spAttack": 80,
      "spDefense": 80,
      "speed": 105
    },
    "evolutions": []
  },
  {
    "id": 79,
    "name": "Slowpoke",
    "types": ["Water", "Psychic"],
    "stats": {
      "hp": 90,
      "attack": 65,
      "defense": 65,
      "spAttack": 40,
      "spDefense": 40,
      "speed": 15
    },
    "evolutions": [80]
  },
  {
    "id": 80,
    "name": "Slowbro",
    "types": ["Water", "Psychic"],
    "stats": {
      "hp": 95,
      "attack": 75,
      "defense": 110,
      "spAttack": 100,
      "spDefense": 80,
      "speed": 30
    },
    "evolutions": []
  },
  {
    "id": 81,
    "name": "Magnemite",
    "types": ["Electric"],
    "stats": {
      "hp": 25,
      "attack": 35,
      "defense": 70,
      "spAttack": 95,
      "spDefense": 55,
      "speed": 45
    },
    "evolutions": [82]
  },
  {
    "id": 82,
    "name": "Magneton",
    "types": ["Electric"],
    "stats": {
      "hp": 50,
      "attack": 60,
      "defense": 95,
      "spAttack": 120,
      "spDefense": 70,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 83,
    "name": "Farfetch’d",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 52,
      "attack": 65,
      "defense": 55,
      "spAttack": 58,
      "spDefense": 62,
      "speed": 60
    },
    "evolutions": []
  },
  {
    "id": 84,
    "name": "Doduo",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 35,
      "attack": 85,
      "defense": 45,
      "spAttack": 35,
      "spDefense": 35,
      "speed": 75
    },
    "evolutions": [85]
  },
  {
    "id": 85,
    "name": "Dodrio",
    "types": ["Normal", "Flying"],
    "stats": {
      "hp": 60,
      "attack": 110,
      "defense": 70,
      "spAttack": 60,
      "spDefense": 60,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 86,
    "name": "Seel",
    "types": ["Water"],
    "stats": {
      "hp": 65,
      "attack": 45,
      "defense": 55,
      "spAttack": 45,
      "spDefense": 70,
      "speed": 45
    },
    "evolutions": [87]
  },
  {
    "id": 87,
    "name": "Dewgong",
    "types": ["Water", "Ice"],
    "stats": {
      "hp": 90,
      "attack": 70,
      "defense": 80,
      "spAttack": 70,
      "spDefense": 95,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 88,
    "name": "Grimer",
    "types": ["Poison"],
    "stats": {
      "hp": 80,
      "attack": 80,
      "defense": 50,
      "spAttack": 40,
      "spDefense": 50,
      "speed": 25
    },
    "evolutions": [89]
  },
  {
    "id": 89,
    "name": "Muk",
    "types": ["Poison"],
    "stats": {
      "hp": 105,
      "attack": 105,
      "defense": 75,
      "spAttack": 65,
      "spDefense": 100,
      "speed": 50
    },
    "evolutions": []
  },
  {
    "id": 90,
    "name": "Shellder",
    "types": ["Water"],
    "stats": {
      "hp": 30,
      "attack": 65,
      "defense": 100,
      "spAttack": 45,
      "spDefense": 25,
      "speed": 40
    },
    "evolutions": [91]
  },
  {
    "id": 91,
    "name": "Cloyster",
    "types": ["Water", "Ice"],
    "stats": {
      "hp": 50,
      "attack": 95,
      "defense": 180,
      "spAttack": 85,
      "spDefense": 45,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 92,
    "name": "Gastly",
    "types": ["Ghost", "Poison"],
    "stats": {
      "hp": 30,
      "attack": 35,
      "defense": 30,
      "spAttack": 100,
      "spDefense": 35,
      "speed": 80
    },
    "evolutions": [93, 94]
  },
  {
    "id": 93,
    "name": "Haunter",
    "types": ["Ghost", "Poison"],
    "stats": {
      "hp": 45,
      "attack": 50,
      "defense": 45,
      "spAttack": 115,
      "spDefense": 55,
      "speed": 95
    },
    "evolutions": [94]
  },
  {
    "id": 94,
    "name": "Gengar",
    "types": ["Ghost", "Poison"],
    "stats": {
      "hp": 60,
      "attack": 65,
      "defense": 60,
      "spAttack": 130,
      "spDefense": 75,
      "speed": 110
    },
    "evolutions": []
  },
  {
    "id": 95,
    "name": "Onix",
    "types": ["Rock", "Ground"],
    "stats": {
      "hp": 35,
      "attack": 45,
      "defense": 160,
      "spAttack": 30,
      "spDefense": 45,
      "speed": 70
    },
    "evolutions": []
  },
  {
    "id": 96,
    "name": "Drowzee",
    "types": ["Psychic"],
    "stats": {
      "hp": 60,
      "attack": 48,
      "defense": 45,
      "spAttack": 43,
      "spDefense": 90,
      "speed": 42
    },
    "evolutions": [97]
  },
  {
    "id": 97,
    "name": "Hypno",
    "types": ["Psychic"],
    "stats": {
      "hp": 85,
      "attack": 73,
      "defense": 70,
      "spAttack": 73,
      "spDefense": 115,
      "speed": 67
    },
    "evolutions": []
  },
  {
    "id": 98,
    "name": "Krabby",
    "types": ["Water"],
    "stats": {
      "hp": 30,
      "attack": 105,
      "defense": 90,
      "spAttack": 25,
      "spDefense": 25,
      "speed": 50
    },
    "evolutions": [99]
  },
  {
    "id": 99,
    "name": "Kingler",
    "types": ["Water"],
    "stats": {
      "hp": 55,
      "attack": 130,
      "defense": 115,
      "spAttack": 50,
      "spDefense": 50,
      "speed": 75
    },
    "evolutions": []
  },
  {
    "id": 100,
    "name": "Voltorb",
    "types": ["Electric"],
    "stats": {
      "hp": 40,
      "attack": 30,
      "defense": 50,
      "spAttack": 55,
      "spDefense": 55,
      "speed": 100
    },
    "evolutions": [101]
  },
  {
    "id": 101,
    "name": "Electrode",
    "types": ["Electric"],
    "stats": {
      "hp": 60,
      "attack": 50,
      "defense": 70,
      "spAttack": 80,
      "spDefense": 80,
      "speed": 140
    },
    "evolutions": []
  },
  {
    "id": 102,
    "name": "Exeggcute",
    "types": ["Grass", "Psychic"],
    "stats": {
      "hp": 60,
      "attack": 40,
      "defense": 80,
      "spAttack": 60,
      "spDefense": 45,
      "speed": 40
    },
    "evolutions": [103]
  },
  {
    "id": 103,
    "name": "Exeggutor",
    "types": ["Grass", "Psychic"],
    "stats": {
      "hp": 95,
      "attack": 95,
      "defense": 85,
      "spAttack": 125,
      "spDefense": 65,
      "speed": 55
    },
    "evolutions": []
  },
  {
    "id": 104,
    "name": "Cubone",
    "types": ["Ground"],
    "stats": {
      "hp": 50,
      "attack": 50,
      "defense": 95,
      "spAttack": 40,
      "spDefense": 50,
      "speed": 35
    },
    "evolutions": [105]
  },
  {
    "id": 105,
    "name": "Marowak",
    "types": ["Ground"],
    "stats": {
      "hp": 60,
      "attack": 80,
      "defense": 110,
      "spAttack": 50,
      "spDefense": 80,
      "speed": 45
    },
    "evolutions": []
  },
  {
    "id": 106,
    "name": "Hitmonlee",
    "types": ["Fighting"],
    "stats": {
      "hp": 50,
      "attack": 120,
      "defense": 53,
      "spAttack": 35,
      "spDefense": 110,
      "speed": 87
    },
    "evolutions": []
  },
  {
    "id": 107,
    "name": "Hitmonchan",
    "types": ["Fighting"],
    "stats": {
      "hp": 50,
      "attack": 105,
      "defense": 79,
      "spAttack": 35,
      "spDefense": 110,
      "speed": 76
    },
    "evolutions": []
  },
  {
    "id": 108,
    "name": "Lickitung",
    "types": ["Normal"],
    "stats": {
      "hp": 90,
      "attack": 55,
      "defense": 75,
      "spAttack": 60,
      "spDefense": 75,
      "speed": 30
    },
    "evolutions": []
  },
  {
    "id": 109,
    "name": "Koffing",
    "types": ["Poison"],
    "stats": {
      "hp": 40,
      "attack": 65,
      "defense": 95,
      "spAttack": 60,
      "spDefense": 45,
      "speed": 35
    },
    "evolutions": [110]
  },
  {
    "id": 110,
    "name": "Weezing",
    "types": ["Poison"],
    "stats": {
      "hp": 65,
      "attack": 90,
      "defense": 120,
      "spAttack": 85,
      "spDefense": 70,
      "speed": 60
    },
    "evolutions": []
  },
  {
    "id": 111,
    "name": "Rhyhorn",
    "types": ["Ground", "Rock"],
    "stats": {
      "hp": 80,
      "attack": 85,
      "defense": 95,
      "spAttack": 30,
      "spDefense": 30,
      "speed": 25
    },
    "evolutions": [112]
  },
  {
    "id": 112,
    "name": "Rhydon",
    "types": ["Ground", "Rock"],
    "stats": {
      "hp": 105,
      "attack": 130,
      "defense": 120,
      "spAttack": 45,
      "spDefense": 45,
      "speed": 40
    },
    "evolutions": []
  },
  {
    "id": 113,
    "name": "Chansey",
    "types": ["Normal"],
    "stats": {
      "hp": 250,
      "attack": 5,
      "defense": 5,
      "spAttack": 35,
      "spDefense": 105,
      "speed": 50
    },
    "evolutions": []
  },
  {
    "id": 114,
    "name": "Tangela",
    "types": ["Grass"],
    "stats": {
      "hp": 65,
      "attack": 55,
      "defense": 115,
      "spAttack": 100,
      "spDefense": 40,
      "speed": 60
    },
    "evolutions": []
  },
  {
    "id": 115,
    "name": "Kangaskhan",
    "types": ["Normal"],
    "stats": {
      "hp": 105,
      "attack": 95,
      "defense": 80,
      "spAttack": 40,
      "spDefense": 80,
      "speed": 90
    },
    "evolutions": []
  },
  {
    "id": 116,
    "name": "Horsea",
    "types": ["Water"],
    "stats": {
      "hp": 30,
      "attack": 40,
      "defense": 70,
      "spAttack": 70,
      "spDefense": 25,
      "speed": 60
    },
    "evolutions": [117]
  },
  {
    "id": 117,
    "name": "Seadra",
    "types": ["Water"],
    "stats": {
      "hp": 55,
      "attack": 65,
      "defense": 95,
      "spAttack": 95,
      "spDefense": 45,
      "speed": 85
    },
    "evolutions": []
  },
  {
    "id": 118,
    "name": "Goldeen",
    "types": ["Water"],
    "stats": {
      "hp": 45,
      "attack": 67,
      "defense": 60,
      "spAttack": 35,
      "spDefense": 50,
      "speed": 63
    },
    "evolutions": [119]
  },
  {
    "id": 119,
    "name": "Seaking",
    "types": ["Water"],
    "stats": {
      "hp": 80,
      "attack": 92,
      "defense": 65,
      "spAttack": 65,
      "spDefense": 80,
      "speed": 68
    },
    "evolutions": []
  },
  {
    "id": 120,
    "name": "Staryu",
    "types": ["Water"],
    "stats": {
      "hp": 30,
      "attack": 45,
      "defense": 55,
      "spAttack": 70,
      "spDefense": 55,
      "speed": 85
    },
    "evolutions": [121]
  },
  {
    "id": 121,
    "name": "Starmie",
    "types": ["Water", "Psychic"],
    "stats": {
      "hp": 60,
      "attack": 75,
      "defense": 85,
      "spAttack": 100,
      "spDefense": 85,
      "speed": 115
    },
    "evolutions": []
  },
  {
    "id": 122,
    "name": "Mr. Mime",
    "types": ["Psychic"],
    "stats": {
      "hp": 40,
      "attack": 45,
      "defense": 65,
      "spAttack": 100,
      "spDefense": 120,
      "speed": 90
    },
    "evolutions": []
  },
  {
    "id": 123,
    "name": "Scyther",
    "types": ["Bug", "Flying"],
    "stats": {
      "hp": 70,
      "attack": 110,
      "defense": 80,
      "spAttack": 55,
      "spDefense": 80,
      "speed": 105
    },
    "evolutions": []
  },
  {
    "id": 124,
    "name": "Jynx",
    "types": ["Ice", "Psychic"],
    "stats": {
      "hp": 65,
      "attack": 50,
      "defense": 35,
      "spAttack": 115,
      "spDefense": 95,
      "speed": 95
    },
    "evolutions": []
  },
  {
    "id": 125,
    "name": "Electabuzz",
    "types": ["Electric"],
    "stats": {
      "hp": 65,
      "attack": 83,
      "defense": 57,
      "spAttack": 95,
      "spDefense": 85,
      "speed": 105
    },
    "evolutions": []
  },
  {
    "id": 126,
    "name": "Magmar",
    "types": ["Fire"],
    "stats": {
      "hp": 65,
      "attack": 95,
      "defense": 57,
      "spAttack": 100,
      "spDefense": 85,
      "speed": 93
    },
    "evolutions": []
  },
  {
    "id": 127,
    "name": "Pinsir",
    "types": ["Bug"],
    "stats": {
      "hp": 65,
      "attack": 125,
      "defense": 100,
      "spAttack": 55,
      "spDefense": 70,
      "speed": 85
    },
    "evolutions": []
  },
  {
    "id": 128,
    "name": "Tauros",
    "types": ["Normal"],
    "stats": {
      "hp": 75,
      "attack": 100,
      "defense": 95,
      "spAttack": 40,
      "spDefense": 70,
      "speed": 110
    },
    "evolutions": []
  },
  {
    "id": 129,
    "name": "Magikarp",
    "types": ["Water"],
    "stats": {
      "hp": 20,
      "attack": 10,
      "defense": 55,
      "spAttack": 15,
      "spDefense": 20,
      "speed": 80
    },
    "evolutions": [130]
  },
  {
    "id": 130,
    "name": "Gyarados",
    "types": ["Water", "Flying"],
    "stats": {
      "hp": 95,
      "attack": 125,
      "defense": 79,
      "spAttack": 60,
      "spDefense": 100,
      "speed": 81
    },
    "evolutions": []
  },
  {
    "id": 131,
    "name": "Lapras",
    "types": ["Water", "Ice"],
    "stats": {
      "hp": 130,
      "attack": 85,
      "defense": 80,
      "spAttack": 85,
      "spDefense": 95,
      "speed": 60
    },
    "evolutions": []
  },
  {
    "id": 132,
    "name": "Ditto",
    "types": ["Normal"],
    "stats": {
      "hp": 48,
      "attack": 48,
      "defense": 48,
      "spAttack": 48,
      "spDefense": 48,
      "speed": 48
    },
    "evolutions": []
  },
  {
    "id": 133,
    "name": "Eevee",
    "types": ["Normal"],
    "stats": {
      "hp": 55,
      "attack": 55,
      "defense": 50,
      "spAttack": 45,
      "spDefense": 65,
      "speed": 55
    },
    "evolutions": [134, 135, 136]
  },
  {
    "id": 134,
    "name": "Vaporeon",
    "types": ["Water"],
    "stats": {
      "hp": 130,
      "attack": 65,
      "defense": 60,
      "spAttack": 110,
      "spDefense": 95,
      "speed": 65
    },
    "evolutions": []
  },
  {
    "id": 135,
    "name": "Jolteon",
    "types": ["Electric"],
    "stats": {
      "hp": 65,
      "attack": 65,
      "defense": 60,
      "spAttack": 110,
      "spDefense": 95,
      "speed": 130
    },
    "evolutions": []
  },
  {
    "id": 136,
    "name": "Flareon",
    "types": ["Fire"],
    "stats": {
      "hp": 65,
      "attack": 130,
      "defense": 60,
      "spAttack": 95,
      "spDefense": 110,
      "speed": 65
    },
    "evolutions": []
  },
  {
    "id": 137,
    "name": "Porygon",
    "types": ["Normal"],
    "stats": {
      "hp": 65,
      "attack": 60,
      "defense": 70,
      "spAttack": 85,
      "spDefense": 75,
      "speed": 40
    },
    "evolutions": []
  },
  {
    "id": 138,
    "name": "Omanyte",
    "types": ["Rock", "Water"],
    "stats": {
      "hp": 35,
      "attack": 40,
      "defense": 100,
      "spAttack": 90,
      "spDefense": 55,
      "speed": 35
    },
    "evolutions": [139]
  },
  {
    "id": 139,
    "name": "Omastar",
    "types": ["Rock", "Water"],
    "stats": {
      "hp": 70,
      "attack": 60,
      "defense": 125,
      "spAttack": 115,
      "spDefense": 70,
      "speed": 55
    },
    "evolutions": []
  },
  {
    "id": 140,
    "name": "Kabuto",
    "types": ["Rock", "Water"],
    "stats": {
      "hp": 30,
      "attack": 80,
      "defense": 90,
      "spAttack": 55,
      "spDefense": 45,
      "speed": 55
    },
    "evolutions": [141]
  },
  {
    "id": 141,
    "name": "Kabutops",
    "types": ["Rock", "Water"],
    "stats": {
      "hp": 60,
      "attack": 115,
      "defense": 105,
      "spAttack": 65,
      "spDefense": 70,
      "speed": 80
    },
    "evolutions": []
  },
  {
    "id": 142,
    "name": "Aerodactyl",
    "types": ["Rock", "Flying"],
    "stats": {
      "hp": 80,
      "attack": 105,
      "defense": 65,
      "spAttack": 60,
      "spDefense": 75,
      "speed": 130
    },
    "evolutions": []
  },
  {
    "id": 143,
    "name": "Snorlax",
    "types": ["Normal"],
    "stats": {
      "hp": 160,
      "attack": 110,
      "defense": 65,
      "spAttack": 65,
      "spDefense": 110,
      "speed": 30
    },
    "evolutions": []
  },
  {
    "id": 144,
    "name": "Articuno",
    "types": ["Ice", "Flying"],
    "stats": {
      "hp": 90,
      "attack": 85,
      "defense": 100,
      "spAttack": 95,
      "spDefense": 125,
      "speed": 85
    },
    "evolutions": []
  },
  {
    "id": 145,
    "name": "Zapdos",
    "types": ["Electric", "Flying"],
    "stats": {
      "hp": 90,
      "attack": 90,
      "defense": 85,
      "spAttack": 125,
      "spDefense": 90,
      "speed": 100
    },
    "evolutions": []
  },
  {
    "id": 146,
    "name": "Moltres",
    "types": ["Fire", "Flying"],
    "stats": {
      "hp": 90,
      "attack": 100,
      "defense": 90,
      "spAttack": 125,
      "spDefense": 85,
      "speed": 90
    },
    "evolutions": []
  },
  {
    "id": 147,
    "name": "Dratini",
    "types": ["Dragon"],
    "stats": {
      "hp": 41,
      "attack": 64,
      "defense": 45,
      "spAttack": 50,
      "spDefense": 50,
      "speed": 50
    },
    "evolutions": [148, 149]
  },
  {
    "id": 148,
    "name": "Dragonair",
    "types": ["Dragon"],
    "stats": {
      "hp": 61,
      "attack": 84,
      "defense": 65,
      "spAttack": 70,
      "spDefense": 70,
      "speed": 70
    },
    "evolutions": [149]
  },
  {
    "id": 149,
    "name": "Dragonite",
    "types": ["Dragon", "Flying"],
    "stats": {
      "hp": 91,
      "attack": 134,
      "defense": 95,
      "spAttack": 100,
      "spDefense": 100,
      "speed": 80
    },
    "evolutions": []
  },
  {
    "id": 150,
    "name": "Mewtwo",
    "types": ["Psychic"],
    "stats": {
      "hp": 106,
      "attack": 110,
      "defense": 90,
      "spAttack": 154,
      "spDefense": 90,
      "speed": 130
    },
    "evolutions": []
  },
  {
    "id": 151,
    "name": "Mew",
    "types": ["Psychic"],
    "stats": {
      "hp": 100,
      "attack": 100,
      "defense": 100,
      "spAttack": 100,
      "spDefense": 100,
      "speed": 100
    },
    "evolutions": []
  }
]
```

---

If you want, next step we can:

- Wire up **type filters** in the sidebar, or
- Add a **team builder** webview with drag‑and‑drop of these same Pokémon.
