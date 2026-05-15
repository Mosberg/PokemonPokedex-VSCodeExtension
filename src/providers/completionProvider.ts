import * as vscode from "vscode";
import { getPokedexSettings } from "../config";
import { Pokemon } from "../types";
import {
  formatPokemonAcquisitionInfo,
  formatPokemonEncounterInfo,
  formatPokemonEvolutionInfo,
  formatPokemonId,
  formatPokemonMoveAcquisition,
  formatPokemonMoves,
  formatPokemonStats,
  getPokemonFlavorText,
  toCompletionToken,
} from "../utils/pokemonUtils";

export function registerCompletionProvider(
  _context: vscode.ExtensionContext,
  pokedex: Pokemon[],
): vscode.Disposable {
  const selector: vscode.DocumentSelector = [
    { language: "javascript", scheme: "file" },
    { language: "typescript", scheme: "file" },
    { language: "javascriptreact", scheme: "file" },
    { language: "typescriptreact", scheme: "file" },
  ];

  const provider: vscode.CompletionItemProvider = {
    provideCompletionItems(document, position) {
      const linePrefix = document
        .lineAt(position)
        .text.slice(0, position.character);

      if (!/\bpoke\.[A-Za-z0-9_]*$/i.test(linePrefix)) {
        return undefined;
      }

      const settings = getPokedexSettings();

      const completionItems = pokedex.map((pokemon) => {
        const token = toCompletionToken(pokemon.name);
        const item = new vscode.CompletionItem(
          `poke.${token}`,
          vscode.CompletionItemKind.Constant,
        );

        item.insertText = token;
        item.sortText = formatPokemonId(pokemon.id);
        item.detail = `#${formatPokemonId(pokemon.id)} ${pokemon.name}`;

        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`**${pokemon.name}**\n\n`);
        markdown.appendMarkdown(`Type: ${pokemon.types.join(" / ")}\n\n`);
        markdown.appendMarkdown(`${formatPokemonStats(pokemon)}\n\n`);
        markdown.appendMarkdown(
          `Moves: ${formatPokemonMoves(pokemon, settings.maxMovesToDisplay)}`,
        );
        markdown.appendMarkdown(
          `\n\n${formatPokemonMoveAcquisition(
            pokemon,
            Math.max(3, Math.min(settings.maxMovesToDisplay, 6)),
          ).replace(/\n/g, " | ")}`,
        );
        markdown.appendMarkdown(
          `\n\nEvolution: ${formatPokemonEvolutionInfo(pokemon, 2).replace(
            /\n/g,
            " | ",
          )}`,
        );
        markdown.appendMarkdown(
          `\n\nFRLG Encounters: ${formatPokemonEncounterInfo(
            pokemon,
            2,
          ).replace(/\n/g, " | ")}`,
        );
        markdown.appendMarkdown(
          `\n\nFRLG Acquisition: ${formatPokemonAcquisitionInfo(
            pokemon,
            2,
          ).replace(/\n/g, " | ")}`,
        );

        if (settings.showFlavorTextInHover) {
          markdown.appendMarkdown(`\n\n${getPokemonFlavorText(pokemon)}`);
        }

        item.documentation = markdown;

        return item;
      });

      return completionItems;
    },
  };

  return vscode.languages.registerCompletionItemProvider(
    selector,
    provider,
    ".",
  );
}
