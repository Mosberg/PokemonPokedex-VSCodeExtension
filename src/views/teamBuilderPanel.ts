import * as vscode from "vscode";
import { Pokemon } from "../types";
import {
  getNonce,
  getWebviewLocalResourceRoots,
  toWebviewPokemon,
} from "./webviewHelpers";

let currentPanel: vscode.WebviewPanel | undefined;

type TeamBuilderInboundMessage = {
  type?: string;
  teamIds?: unknown;
};

export function registerTeamBuilderCommand(
  context: vscode.ExtensionContext,
  pokedex: Pokemon[],
): vscode.Disposable {
  const pokemonById = new Map<number, Pokemon>(
    pokedex.map((pokemon) => [pokemon.id, pokemon]),
  );

  return vscode.commands.registerCommand("pokedexKanto.openTeamBuilder", () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "pokedexKanto.teamBuilder",
      "Pokemon Team Builder",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: getWebviewLocalResourceRoots(context),
      },
    );

    currentPanel = panel;
    panel.onDidDispose(() => {
      currentPanel = undefined;
    });

    panel.webview.html = getTeamBuilderHtml(context, panel.webview, pokedex);

    panel.webview.onDidReceiveMessage((message: TeamBuilderInboundMessage) => {
      void handleTeamMessage(message, pokemonById);
    });
  });
}

async function handleTeamMessage(
  message: TeamBuilderInboundMessage,
  pokemonById: Map<number, Pokemon>,
): Promise<void> {
  if (message.type !== "exportTeam") {
    return;
  }

  const idsRaw = Array.isArray(message.teamIds) ? message.teamIds : [];
  const team = idsRaw
    .map((value) => Number(value))
    .filter((id) => Number.isFinite(id))
    .map((id) => pokemonById.get(id))
    .filter((pokemon): pokemon is Pokemon => pokemon !== undefined);

  if (!team.length) {
    void vscode.window.showWarningMessage(
      "Build a team first before exporting.",
    );
    return;
  }

  const payload = JSON.stringify(team, null, 2);
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, payload);
    });

    void vscode.window.showInformationMessage(
      "Team JSON inserted into editor.",
    );
    return;
  }

  await vscode.env.clipboard.writeText(payload);
  void vscode.window.showInformationMessage(
    "No active editor found. Team JSON copied to clipboard.",
  );
}

function getTeamBuilderHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  pokedex: Pokemon[],
): string {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "teamBuilder.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "styles.css"),
  );

  const payload = {
    pokedex: toWebviewPokemon(context, webview, pokedex),
  };

  const jsonPayload = JSON.stringify(payload);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pokemon Team Builder</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body class="pk-body pk-team-mode">
    <div class="pk-shell">
      <header class="pk-header pk-header-team">
        <h1 class="pk-title">Pokemon Team Builder</h1>
        <span class="pk-subtitle">Drag from the list into 6 slots</span>
      </header>

      <section class="team-builder">
        <aside class="team-list">
          <div class="pk-toolbar pk-toolbar-team">
            <input id="team-search" class="pk-search" type="search" placeholder="Search Pokemon" />
          </div>
          <ul id="team-list" class="pk-list-ul team-list-ul"></ul>
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
            <button id="team-export" class="pk-button pk-button-primary" type="button">Export Team JSON</button>
            <button id="team-clear" class="pk-button pk-button-secondary" type="button">Clear Team</button>
          </div>
        </section>
      </section>
    </div>

    <script nonce="${nonce}">
      window.__TEAM_DATA__ = ${jsonPayload};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}
