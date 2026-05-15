import * as vscode from "vscode";
import { PokedexSettings, SpriteVariant } from "./types";

const CONFIG_NAMESPACE = "pokedexKanto";
const DEFAULT_MAX_MOVES = 12;

function toSpriteVariant(value: unknown): SpriteVariant {
  return value === "shiny" ? "shiny" : "normal";
}

function toMaxMoves(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_MOVES;
  }

  const rounded = Math.round(value);
  return Math.min(60, Math.max(1, rounded));
}

export function getPokedexSettings(): PokedexSettings {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

  return {
    defaultSpriteVariant: toSpriteVariant(
      config.get<string>("defaultSpriteVariant", "normal"),
    ),
    maxMovesToDisplay: toMaxMoves(config.get<number>("maxMovesToDisplay", 12)),
    showFlavorTextInSidebar: config.get<boolean>(
      "showFlavorTextInSidebar",
      true,
    ),
    showFlavorTextInHover: config.get<boolean>("showFlavorTextInHover", true),
    enableHoverProvider: config.get<boolean>("enableHoverProvider", true),
    enableCompletionProvider: config.get<boolean>(
      "enableCompletionProvider",
      true,
    ),
  };
}

export function getConfigNamespace(): string {
  return CONFIG_NAMESPACE;
}
