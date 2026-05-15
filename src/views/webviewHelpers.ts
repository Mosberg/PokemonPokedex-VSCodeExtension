import * as vscode from "vscode";
import { Pokemon, WebviewPokemon } from "../types";
import { formatPokemonId } from "../utils/pokemonUtils";

export function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 32; index += 1) {
    const random = Math.floor(Math.random() * chars.length);
    nonce += chars.charAt(random);
  }

  return nonce;
}

export function getWebviewLocalResourceRoots(
  context: vscode.ExtensionContext,
): vscode.Uri[] {
  return [
    vscode.Uri.joinPath(context.extensionUri, "media"),
    vscode.Uri.joinPath(context.extensionUri, "src", "images"),
  ];
}

export function toWebviewPokemon(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  pokedex: Pokemon[],
): WebviewPokemon[] {
  return pokedex.map((pokemon) => {
    const spriteNormal = webview
      .asWebviewUri(
        vscode.Uri.joinPath(
          context.extensionUri,
          "src",
          "images",
          "sprites",
          "normal",
          `${pokemon.id}.png`,
        ),
      )
      .toString();

    const spriteShiny = webview
      .asWebviewUri(
        vscode.Uri.joinPath(
          context.extensionUri,
          "src",
          "images",
          "sprites",
          "shiny",
          `${pokemon.id}.png`,
        ),
      )
      .toString();

    return {
      ...pokemon,
      indexLabel: formatPokemonId(pokemon.id),
      spriteNormal,
      spriteShiny,
    };
  });
}

export function getSortedTypes(pokedex: Pokemon[]): string[] {
  const allTypes = new Set<string>();

  for (const pokemon of pokedex) {
    for (const type of pokemon.types) {
      allTypes.add(type);
    }
  }

  return Array.from(allTypes).sort((a, b) => a.localeCompare(b));
}
