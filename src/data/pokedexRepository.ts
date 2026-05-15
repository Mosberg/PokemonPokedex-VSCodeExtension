import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Pokemon } from "../types";

let cachedPokedex: Pokemon[] | undefined;

function normalizePokemon(record: Pokemon): Pokemon {
  return {
    ...record,
    types: Array.isArray(record.types) ? record.types : [],
    evolutions: Array.isArray(record.evolutions) ? record.evolutions : [],
    moves: Array.isArray(record.moves) ? record.moves : [],
    flavorText:
      typeof record.flavorText === "string" ? record.flavorText.trim() : "",
    locations: Array.isArray(record.locations) ? record.locations : [],
    classification: record.classification ?? "",
  };
}

export function loadPokedex(context: vscode.ExtensionContext): Pokemon[] {
  if (cachedPokedex) {
    return cachedPokedex;
  }

  const dataPath = path.join(context.extensionPath, "src", "data", "gen1.json");
  const rawData = fs.readFileSync(dataPath, "utf8");
  const parsed = JSON.parse(rawData) as Pokemon[];

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid pokedex data format: expected array.");
  }

  cachedPokedex = parsed.map(normalizePokemon).sort((a, b) => a.id - b.id);
  return cachedPokedex;
}
