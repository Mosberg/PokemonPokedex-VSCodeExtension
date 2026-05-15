import * as vscode from "vscode";
import { PokedexSettings, Pokemon } from "../types";
import {
  getNonce,
  getSortedTypes,
  getWebviewLocalResourceRoots,
  toWebviewPokemon,
} from "./webviewHelpers";

interface SidebarActions {
  onInsertPokemonJson(pokemon: Pokemon): void | Thenable<void>;
  onInsertPokemonMarkdown(pokemon: Pokemon): void | Thenable<void>;
  onInsertPokemonFlavorText(pokemon: Pokemon): void | Thenable<void>;
  onCopyPokemonFlavorText(pokemon: Pokemon): void | Thenable<void>;
  onCopyPokemonStats(pokemon: Pokemon): void | Thenable<void>;
  onOpenTeamBuilder(): void | Thenable<void>;
  onOpenSettings(): void | Thenable<void>;
}

type SidebarInboundMessage = {
  type?: string;
  pokemonId?: number | string;
};

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private pendingRevealPokemonId: number | undefined;
  private readonly pokemonById: Map<number, Pokemon>;
  private settings: PokedexSettings;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly pokedex: Pokemon[],
    private readonly actions: SidebarActions,
    initialSettings: PokedexSettings,
  ) {
    this.pokemonById = new Map<number, Pokemon>(
      pokedex.map((pokemon) => [pokemon.id, pokemon]),
    );
    this.settings = initialSettings;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: getWebviewLocalResourceRoots(this.context),
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: SidebarInboundMessage) => {
        void this.handleMessage(message);
      },
    );

    if (this.pendingRevealPokemonId !== undefined) {
      this.revealPokemon(this.pendingRevealPokemonId);
      this.pendingRevealPokemonId = undefined;
    }
  }

  revealPokemon(pokemonId: number): void {
    if (!this.view) {
      this.pendingRevealPokemonId = pokemonId;
      return;
    }

    this.view.show(true);
    void this.view.webview.postMessage({
      type: "showPokemon",
      pokemonId,
    });
  }

  updateSettings(settings: PokedexSettings): void {
    this.settings = settings;
    if (!this.view) {
      return;
    }

    void this.view.webview.postMessage({
      type: "updateSettings",
      settings: this.settings,
    });
  }

  private async handleMessage(message: SidebarInboundMessage): Promise<void> {
    const type = message.type;

    if (type === "openTeamBuilder") {
      await this.actions.onOpenTeamBuilder();
      return;
    }

    if (type === "openSettings") {
      await this.actions.onOpenSettings();
      return;
    }

    const pokemon = this.getPokemonFromMessage(message);
    if (!pokemon) {
      return;
    }

    if (type === "insertPokemonJson") {
      await this.actions.onInsertPokemonJson(pokemon);
      return;
    }

    if (type === "insertPokemonMarkdown") {
      await this.actions.onInsertPokemonMarkdown(pokemon);
      return;
    }

    if (type === "insertPokemonFlavorText") {
      await this.actions.onInsertPokemonFlavorText(pokemon);
      return;
    }

    if (type === "copyPokemonFlavorText") {
      await this.actions.onCopyPokemonFlavorText(pokemon);
      return;
    }

    if (type === "copyPokemonStats") {
      await this.actions.onCopyPokemonStats(pokemon);
    }
  }

  private getPokemonFromMessage(
    message: SidebarInboundMessage,
  ): Pokemon | undefined {
    const rawId = message.pokemonId;
    if (rawId === undefined || rawId === null) {
      return undefined;
    }

    const pokemonId = Number(rawId);
    if (!Number.isFinite(pokemonId)) {
      return undefined;
    }

    return this.pokemonById.get(pokemonId);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "sidebar.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "styles.css"),
    );

    const payload = {
      pokedex: toWebviewPokemon(this.context, webview, this.pokedex),
      types: getSortedTypes(this.pokedex),
      settings: this.settings,
    };

    const jsonPayload = JSON.stringify(payload);

    return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kanto Pokedex</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body class="pk-body">
    <div class="pk-shell">
      <header class="pk-header">
        <h1 class="pk-title">Kanto Pokedex</h1>
        <div class="pk-header-actions">
          <button id="pk-open-settings" class="pk-button pk-button-quiet" type="button">Options</button>
          <button id="pk-open-team" class="pk-button pk-button-quiet" type="button">Team Builder</button>
        </div>
      </header>

      <section class="pk-toolbar">
        <input id="pk-search" class="pk-search" type="search" placeholder="Search by name, number, or type" />
        <button id="pk-random" class="pk-button pk-button-primary" type="button">Random</button>
      </section>

      <section id="pk-type-filters" class="pk-type-filters" aria-label="Type filters"></section>

      <main class="pk-main">
        <aside class="pk-list" aria-label="Pokemon list">
          <ul id="pk-list" class="pk-list-ul"></ul>
        </aside>

        <section class="pk-detail">
          <div id="pk-detail-empty" class="pk-detail-empty">
            Select a Pokemon to inspect its details.
          </div>

          <article id="pk-detail-card" class="pk-detail-card hidden" aria-live="polite">
            <div class="pk-detail-top">
              <h2 id="pk-name" class="pk-name"></h2>
              <div class="pk-sprites">
                <figure>
                  <img id="pk-sprite-normal" alt="Normal sprite" />
                  <figcaption>Normal</figcaption>
                </figure>
                <figure>
                  <img id="pk-sprite-shiny" alt="Shiny sprite" />
                  <figcaption>Shiny</figcaption>
                </figure>
              </div>
            </div>

            <div id="pk-types" class="pk-types"></div>
            <div id="pk-meta" class="pk-meta"></div>
            <div id="pk-stats" class="pk-stats"></div>
            <div id="pk-evolutions" class="pk-evolutions"></div>
            <div id="pk-moves" class="pk-moves"></div>
            <div id="pk-locations" class="pk-locations"></div>
            <div id="pk-acquisition" class="pk-acquisition"></div>
            <blockquote id="pk-flavor" class="pk-flavor"></blockquote>

            <div class="pk-actions">
              <button id="pk-btn-json" class="pk-button pk-button-primary" type="button">Insert JSON</button>
              <button id="pk-btn-markdown" class="pk-button pk-button-secondary" type="button">Insert Markdown</button>
              <button id="pk-btn-flavor" class="pk-button pk-button-secondary" type="button">Insert Flavor</button>
              <button id="pk-btn-copy-flavor" class="pk-button pk-button-secondary" type="button">Copy Flavor</button>
              <button id="pk-btn-copy-stats" class="pk-button pk-button-secondary" type="button">Copy Stats</button>
            </div>
          </article>
        </section>
      </main>
    </div>

    <script nonce="${nonce}">
      window.__POKEDEX_DATA__ = ${jsonPayload};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}
