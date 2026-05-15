import * as vscode from "vscode";
import { getConfigNamespace, getPokedexSettings } from "./config";
import { loadPokedex } from "./data/pokedexRepository";
import { registerCompletionProvider } from "./providers/completionProvider";
import { registerHoverProvider } from "./providers/hoverProvider";
import { Pokemon } from "./types";
import {
  findPokemonByQuery,
  formatPokemonId,
  formatPokemonMoves,
  formatPokemonStats,
  getPokemonFlavorText,
} from "./utils/pokemonUtils";
import { SidebarWebviewProvider } from "./views/sidebarWebviewProvider";
import { registerTeamBuilderCommand } from "./views/teamBuilderPanel";

export function activate(context: vscode.ExtensionContext): void {
  const pokedex = loadPokedex(context);
  const pokemonById = new Map<number, Pokemon>(
    pokedex.map((pokemon) => [pokemon.id, pokemon]),
  );

  let settings = getPokedexSettings();

  const sidebarProvider = new SidebarWebviewProvider(
    context,
    pokedex,
    {
      onInsertPokemonJson: async (pokemon) => {
        await insertPokemonJson(pokemon);
      },
      onInsertPokemonMarkdown: async (pokemon) => {
        await insertPokemonMarkdown(
          pokemon,
          pokemonById,
          getPokedexSettings().maxMovesToDisplay,
        );
      },
      onInsertPokemonFlavorText: async (pokemon) => {
        await insertPokemonFlavorText(pokemon);
      },
      onCopyPokemonFlavorText: async (pokemon) => {
        await copyPokemonFlavorText(pokemon);
      },
      onCopyPokemonStats: async (pokemon) => {
        await vscode.env.clipboard.writeText(formatPokemonStats(pokemon));
        void vscode.window.showInformationMessage(
          `${pokemon.name} stats copied to clipboard.`,
        );
      },
      onOpenTeamBuilder: async () => {
        await vscode.commands.executeCommand("pokedexKanto.openTeamBuilder");
      },
      onOpenSettings: async () => {
        await openPokedexSettings(context.extension.id);
      },
    },
    settings,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "pokedexKanto.sidebar",
      sidebarProvider,
    ),
  );

  context.subscriptions.push(registerTeamBuilderCommand(context, pokedex));

  let hoverDisposable: vscode.Disposable | undefined;
  let completionDisposable: vscode.Disposable | undefined;

  const disposeProviders = (): void => {
    hoverDisposable?.dispose();
    completionDisposable?.dispose();
    hoverDisposable = undefined;
    completionDisposable = undefined;
  };

  const registerProviders = (): void => {
    disposeProviders();

    if (settings.enableHoverProvider) {
      hoverDisposable = registerHoverProvider(context, pokedex);
    }

    if (settings.enableCompletionProvider) {
      completionDisposable = registerCompletionProvider(context, pokedex);
    }
  };

  registerProviders();

  context.subscriptions.push({
    dispose: () => {
      disposeProviders();
    },
  });

  const revealInSidebar = async (pokemon: Pokemon): Promise<void> => {
    await vscode.commands.executeCommand(
      "workbench.view.extension.pokedexKanto",
    );
    sidebarProvider.revealPokemon(pokemon.id);
  };

  const pickPokemon = async (): Promise<Pokemon | undefined> => {
    const selection = await vscode.window.showQuickPick(
      pokedex.map((pokemon) => ({
        label: `#${formatPokemonId(pokemon.id)} ${pokemon.name}`,
        description: pokemon.types.join(" / "),
        detail: getPokemonFlavorText(pokemon),
        pokemon,
      })),
      {
        title: "Kanto Pokedex",
        placeHolder: "Search Pokemon",
        matchOnDescription: true,
        matchOnDetail: true,
      },
    );

    return selection?.pokemon;
  };

  const resolvePokemon = async (
    query?: string | number,
  ): Promise<Pokemon | undefined> => {
    if (query === undefined) {
      return pickPokemon();
    }

    return findPokemonByQuery(pokedex, query);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.openPokedex", async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.pokedexKanto",
      );
      if (pokedex.length > 0) {
        sidebarProvider.revealPokemon(pokedex[0].id);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.searchPokemon",
      async (query?: string | number) => {
        const pokemon = await resolvePokemon(query);

        if (!pokemon) {
          if (query !== undefined) {
            void vscode.window.showWarningMessage(
              `No Pokemon found for "${String(query)}".`,
            );
          }
          return;
        }

        await revealInSidebar(pokemon);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.randomPokemon", async () => {
      if (!pokedex.length) {
        return;
      }

      const random = pokedex[Math.floor(Math.random() * pokedex.length)];
      await revealInSidebar(random);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.insertPokemonJson",
      async (query?: string | number) => {
        const pokemon = await resolvePokemon(query);
        if (!pokemon) {
          return;
        }

        await insertPokemonJson(pokemon);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.insertPokemonMoves",
      async (query?: string | number) => {
        const pokemon = await resolvePokemon(query);
        if (!pokemon) {
          return;
        }

        await insertPokemonMoves(
          pokemon,
          getPokedexSettings().maxMovesToDisplay,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.insertPokemonFlavorText",
      async (query?: string | number) => {
        const pokemon = await resolvePokemon(query);
        if (!pokemon) {
          return;
        }

        await insertPokemonFlavorText(pokemon);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pokedexKanto.copyPokemonFlavorText",
      async (query?: string | number) => {
        const pokemon = await resolvePokemon(query);
        if (!pokemon) {
          return;
        }

        await copyPokemonFlavorText(pokemon);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pokedexKanto.openSettings", async () => {
      await openPokedexSettings(context.extension.id);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(getConfigNamespace())) {
        return;
      }

      settings = getPokedexSettings();
      registerProviders();
      sidebarProvider.updateSettings(settings);
    }),
  );

  void vscode.window.setStatusBarMessage(
    `Pokedex ready: ${pokedex.length} Pokemon loaded with moves and flavor text`,
    4000,
  );
}

export function deactivate(): void {}

async function openPokedexSettings(extensionId: string): Promise<void> {
  await vscode.commands.executeCommand(
    "workbench.action.openSettings",
    `@ext:${extensionId} pokedexKanto`,
  );
}

async function insertPokemonJson(pokemon: Pokemon): Promise<void> {
  const payload = JSON.stringify(pokemon, null, 2);
  const inserted = await insertTextAtCursor(payload);

  if (inserted) {
    void vscode.window.showInformationMessage(
      `${pokemon.name} JSON inserted into editor.`,
    );
  }
}

async function insertPokemonMoves(
  pokemon: Pokemon,
  maxMoves: number,
): Promise<void> {
  const moves = formatPokemonMoves(pokemon, maxMoves);
  const text = `Moves for ${pokemon.name}: ${moves}`;

  const inserted = await insertTextAtCursor(text);
  if (inserted) {
    void vscode.window.showInformationMessage(
      `${pokemon.name} moves inserted into editor.`,
    );
  }
}

async function insertPokemonFlavorText(pokemon: Pokemon): Promise<void> {
  const text = getPokemonFlavorText(pokemon);
  const inserted = await insertTextAtCursor(text);

  if (inserted) {
    void vscode.window.showInformationMessage(
      `${pokemon.name} flavor text inserted into editor.`,
    );
  }
}

async function copyPokemonFlavorText(pokemon: Pokemon): Promise<void> {
  await vscode.env.clipboard.writeText(getPokemonFlavorText(pokemon));
  void vscode.window.showInformationMessage(
    `${pokemon.name} flavor text copied to clipboard.`,
  );
}

async function insertPokemonMarkdown(
  pokemon: Pokemon,
  pokemonById: Map<number, Pokemon>,
  maxMoves: number,
): Promise<void> {
  const evolutions = pokemon.evolutions.length
    ? pokemon.evolutions
        .map((id) => pokemonById.get(id)?.name ?? `#${formatPokemonId(id)}`)
        .join(" -> ")
    : "Final evolution";

  const markdown = [
    `## #${formatPokemonId(pokemon.id)} ${pokemon.name}`,
    `- Classification: ${pokemon.classification || "Unknown"}`,
    `- Types: ${pokemon.types.join(" / ")}`,
    `- Stats: ${formatPokemonStats(pokemon)}`,
    `- Evolutions: ${evolutions}`,
    `- Moves: ${formatPokemonMoves(pokemon, maxMoves)}`,
    "",
    `> ${getPokemonFlavorText(pokemon)}`,
  ].join("\n");

  const inserted = await insertTextAtCursor(markdown);
  if (inserted) {
    void vscode.window.showInformationMessage(
      `${pokemon.name} markdown inserted.`,
    );
  }
}

async function insertTextAtCursor(text: string): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    void vscode.window.showWarningMessage(
      "No active editor found. Open a file and try again.",
    );
    return false;
  }

  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, text);
  });

  return true;
}
