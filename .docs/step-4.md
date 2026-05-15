# 🧱 Internal UI Framework for Your VSCode Pokédex Extension

This framework lives inside `/src/ui/` and gives you:

- **WebviewBuilder** — builds HTML with CSP, nonce, injected scripts/styles/data
- **AssetResolver** — resolves URIs for scripts, CSS, images
- **PokedexData** — shared data loader
- **ViewRegistry** — consistent registration of sidebar + panels
- **UI Components** — reusable HTML fragments (headers, lists, slots, etc.)

This is the exact structure:

```
src/
  ui/
    WebviewBuilder.ts
    AssetResolver.ts
    PokedexData.ts
    ViewRegistry.ts
    components/
      header.ts
      typeFilters.ts
      pokemonList.ts
      teamSlots.ts
```

---

# 🟥 1. WebviewBuilder — the core of the framework

This is the heart of the system.  
It builds CSP‑safe HTML with injected data, scripts, and styles.

```ts
// src/ui/WebviewBuilder.ts
import * as vscode from "vscode";
import { resolveAssetUri } from "./AssetResolver";

export class WebviewBuilder {
  constructor(
    private context: vscode.ExtensionContext,
    private webview: vscode.Webview,
  ) {}

  private nonce(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 32 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");
  }

  build(options: {
    title: string;
    body: string;
    scripts?: string[];
    styles?: string[];
    data?: Record<string, any>;
  }): string {
    const nonce = this.nonce();
    const csp = this.webview.cspSource;

    const scriptTags = (options.scripts || [])
      .map(
        (s) =>
          `<script nonce="${nonce}" src="${resolveAssetUri(this.context, this.webview, s)}"></script>`,
      )
      .join("\n");

    const styleTags = (options.styles || [])
      .map(
        (s) =>
          `<link rel="stylesheet" href="${resolveAssetUri(this.context, this.webview, s)}">`,
      )
      .join("\n");

    const dataScript = options.data
      ? `<script nonce="${nonce}">window.__POKEDEX_DATA__ = ${JSON.stringify(options.data)};</script>`
      : "";

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   img-src https: data: ${csp};
                   script-src 'nonce-${nonce}';
                   style-src ${csp} 'unsafe-inline';" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${options.title}</title>
        ${styleTags}
      </head>
      <body>
        ${options.body}
        ${dataScript}
        ${scriptTags}
      </body>
      </html>
    `;
  }
}
```

---

# 🟦 2. AssetResolver — consistent asset paths

```ts
// src/ui/AssetResolver.ts
import * as vscode from "vscode";

export function resolveAssetUri(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  assetPath: string,
) {
  return webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", assetPath),
  );
}
```

---

# 🟩 3. PokedexData — shared data loader

```ts
// src/ui/PokedexData.ts
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function loadPokedex(context: vscode.ExtensionContext) {
  const file = path.join(context.extensionPath, "src", "data", "gen1.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
```

---

# 🟨 4. ViewRegistry — clean registration of all webviews

This makes adding new views trivial.

```ts
// src/ui/ViewRegistry.ts
import * as vscode from "vscode";
import { WebviewBuilder } from "./WebviewBuilder";
import { loadPokedex } from "./PokedexData";

export function registerTeamBuilder(context: vscode.ExtensionContext) {
  const pokedex = loadPokedex(context);

  vscode.commands.registerCommand("pokedexKanto.openTeamBuilder", () => {
    const panel = vscode.window.createWebviewPanel(
      "pokedexKanto.teamBuilder",
      "Pokémon Team Builder",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const builder = new WebviewBuilder(context, panel.webview);

    panel.webview.html = builder.build({
      title: "Pokémon Team Builder",
      body: require("../ui/components/teamSlots").teamBuilderHtml(),
      scripts: ["teamBuilder.js"],
      styles: ["styles.css"],
      data: { pokedex },
    });

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
  });
}
```

---

# 🟪 5. UI Components — reusable HTML fragments

Example: header + type filters + list + slots.

### `header.ts`

```ts
export function header(title: string, subtitle?: string) {
  return `
    <div class="pk-header">
      <div class="pk-title">${title}</div>
      ${subtitle ? `<div class="pk-subtitle">${subtitle}</div>` : ""}
    </div>
  `;
}
```

### `teamSlots.ts`

```ts
export function teamBuilderHtml() {
  return `
    ${require("./header").header("Pokémon Team Builder", "Drag Pokémon into slots")}
    <div class="team-builder">
      <aside class="team-list">
        <div class="pk-list-header">
          <input id="team-search" class="pk-search" placeholder="Search Pokémon..." />
        </div>
        <ul id="team-list" class="pk-list-ul"></ul>
      </aside>

      <section class="team-slots">
        <div class="team-slots-grid">
          ${Array.from({ length: 6 })
            .map((_, i) => `<div class="slot" data-slot="${i}"></div>`)
            .join("")}
        </div>

        <div class="team-actions">
          <button id="export-team" class="pk-btn pk-btn-primary">Export Team JSON</button>
          <button id="clear-team" class="pk-btn pk-btn-secondary">Clear Team</button>
        </div>
      </section>
    </div>
  `;
}
```

---

# 🧩 6. How this transforms your extension

### Before

Every new webview required:

- Manual CSP
- Manual nonce
- Manual script/style injection
- Manual data injection
- Manual HTML boilerplate

### After

Every new webview becomes:

```ts
const builder = new WebviewBuilder(context, webview);

webview.html = builder.build({
  title: "My View",
  body: myHtmlComponent(),
  scripts: ["myScript.js"],
  styles: ["styles.css"],
  data: { pokedex },
});
```

That’s it.

---

# 🧠 Why this is the right move

You’re building a **multi‑tool VSCode extension**:

- Pokédex sidebar
- Team builder
- Type matchups
- Move database
- Sprite viewer
- Shader playground (Phaser‑powered)
- Scene editor
- Visual scripting graph

A small internal UI framework keeps everything:

- **Consistent**
- **Composable**
- **Maintainable**
- **Extensible**
- **Fast to build**

This is exactly how professional VSCode extensions scale.

---
