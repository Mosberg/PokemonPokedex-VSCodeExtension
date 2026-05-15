import * as path from "path";
import * as vscode from "vscode";
import { getPokedexSettings } from "../config";
import { Pokemon } from "../types";
import {
  createPokemonLookup,
  formatPokemonAcquisitionInfo,
  formatPokemonEncounterInfo,
  formatPokemonEvolutionInfo,
  formatPokemonId,
  formatPokemonMoveAcquisition,
  formatPokemonMoves,
  getPokemonFlavorText,
  normalizePokemonName,
} from "../utils/pokemonUtils";

export function registerHoverProvider(
  context: vscode.ExtensionContext,
  pokedex: Pokemon[],
): vscode.Disposable {
  const lookup = createPokemonLookup(pokedex);

  const provider: vscode.HoverProvider = {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(
        position,
        /[A-Za-z0-9.'\-_\u2640\u2642]+/,
      );

      if (!range) {
        return undefined;
      }

      const token = document.getText(range);
      const pokemon =
        lookup.get(token.toLowerCase()) ??
        lookup.get(normalizePokemonName(token)) ??
        undefined;

      if (!pokemon) {
        return undefined;
      }

      const spriteUri = vscode.Uri.file(
        path.join(
          context.extensionPath,
          "src",
          "images",
          "sprites",
          "normal",
          `${pokemon.id}.png`,
        ),
      ).toString();

      const markdown = new vscode.MarkdownString(undefined, true);
      markdown.appendMarkdown(`![${pokemon.name}](${spriteUri})\n\n`);
      markdown.appendMarkdown(
        `### #${formatPokemonId(pokemon.id)} ${pokemon.name}\n`,
      );
      markdown.appendMarkdown(`**Type:** ${pokemon.types.join(" / ")}\n\n`);
      markdown.appendMarkdown(
        `HP ${pokemon.stats.hp} | ATK ${pokemon.stats.attack} | DEF ${pokemon.stats.defense} | SPA ${pokemon.stats.spAttack} | SPD ${pokemon.stats.spDefense} | SPE ${pokemon.stats.speed}\n\n`,
      );

      const settings = getPokedexSettings();
      const movesText = formatPokemonMoves(pokemon, settings.maxMovesToDisplay);
      const acquisition = formatPokemonMoveAcquisition(
        pokemon,
        Math.max(3, Math.min(settings.maxMovesToDisplay, 8)),
      );
      const evolutionText = formatPokemonEvolutionInfo(pokemon, 3);
      const encounterText = formatPokemonEncounterInfo(pokemon, 3);
      const acquisitionText = formatPokemonAcquisitionInfo(pokemon, 3);

      markdown.appendMarkdown(`**Moves:** ${movesText}\n\n`);
      markdown.appendMarkdown(
        `**Learnset:** ${acquisition.replace(/\n/g, "  \n")}\n\n`,
      );
      markdown.appendMarkdown(
        `**Evolution:** ${evolutionText.replace(/\n/g, "  \n")}\n\n`,
      );
      markdown.appendMarkdown(
        `**FRLG Encounters:** ${encounterText.replace(/\n/g, "  \n")}\n\n`,
      );
      markdown.appendMarkdown(
        `**FRLG Acquisition:** ${acquisitionText.replace(/\n/g, "  \n")}`,
      );

      if (settings.showFlavorTextInHover) {
        markdown.appendMarkdown(`\n\n> ${getPokemonFlavorText(pokemon)}`);
      }

      markdown.isTrusted = true;

      return new vscode.Hover(markdown, range);
    },
  };

  const selector: vscode.DocumentSelector = [
    { scheme: "file" },
    { scheme: "untitled" },
  ];

  return vscode.languages.registerHoverProvider(selector, provider);
}
