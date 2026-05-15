import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  Pokemon,
  PokemonAcquisitionEntry,
  PokemonEncounterLocation,
  PokemonEvolutionRequirement,
  PokemonEvolutionTransition,
  PokemonMoveEntry,
} from "../types";

let cachedPokedex: Pokemon[] | undefined;

function normalizeMoveLearnset(moveLearnset: unknown): PokemonMoveEntry[] {
  if (!Array.isArray(moveLearnset)) {
    return [];
  }

  return moveLearnset
    .filter((entry): entry is PokemonMoveEntry => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const candidate = entry as PokemonMoveEntry;
      return (
        typeof candidate.name === "string" &&
        Array.isArray(candidate.learnMethods)
      );
    })
    .map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      slug: typeof entry.slug === "string" ? entry.slug : "",
      type: typeof entry.type === "string" ? entry.type : "unknown",
      damageClass:
        typeof entry.damageClass === "string" ? entry.damageClass : "unknown",
      power: typeof entry.power === "number" ? entry.power : null,
      accuracy: typeof entry.accuracy === "number" ? entry.accuracy : null,
      pp: typeof entry.pp === "number" ? entry.pp : null,
      learnMethods: entry.learnMethods
        .filter((method) => method && typeof method === "object")
        .map((method) => ({
          method: String(method.method ?? "unknown"),
          versionGroup: String(method.versionGroup ?? "unknown"),
          level:
            typeof method.level === "number" && Number.isFinite(method.level)
              ? method.level
              : null,
          machineCode:
            typeof method.machineCode === "string"
              ? method.machineCode
              : undefined,
          machineType:
            method.machineType === "TM" || method.machineType === "HM"
              ? method.machineType
              : undefined,
        })),
    }));
}

function normalizeEvolutionRequirement(
  value: unknown,
): PokemonEvolutionRequirement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const requirement = value as PokemonEvolutionRequirement;
  const trigger =
    typeof requirement.trigger === "string" && requirement.trigger.trim()
      ? requirement.trigger.trim()
      : "unknown";

  return {
    trigger,
    minLevel:
      typeof requirement.minLevel === "number" &&
      Number.isFinite(requirement.minLevel)
        ? requirement.minLevel
        : null,
    item: typeof requirement.item === "string" ? requirement.item : undefined,
    heldItem:
      typeof requirement.heldItem === "string"
        ? requirement.heldItem
        : undefined,
    tradeSpecies:
      typeof requirement.tradeSpecies === "string"
        ? requirement.tradeSpecies
        : undefined,
    knownMove:
      typeof requirement.knownMove === "string"
        ? requirement.knownMove
        : undefined,
    knownMoveType:
      typeof requirement.knownMoveType === "string"
        ? requirement.knownMoveType
        : undefined,
    location:
      typeof requirement.location === "string"
        ? requirement.location
        : undefined,
    minHappiness:
      typeof requirement.minHappiness === "number" &&
      Number.isFinite(requirement.minHappiness)
        ? requirement.minHappiness
        : undefined,
    minBeauty:
      typeof requirement.minBeauty === "number" &&
      Number.isFinite(requirement.minBeauty)
        ? requirement.minBeauty
        : undefined,
    minAffection:
      typeof requirement.minAffection === "number" &&
      Number.isFinite(requirement.minAffection)
        ? requirement.minAffection
        : undefined,
    needsOverworldRain:
      typeof requirement.needsOverworldRain === "boolean"
        ? requirement.needsOverworldRain
        : undefined,
    partySpecies:
      typeof requirement.partySpecies === "string"
        ? requirement.partySpecies
        : undefined,
    partyType:
      typeof requirement.partyType === "string"
        ? requirement.partyType
        : undefined,
    relativePhysicalStats:
      typeof requirement.relativePhysicalStats === "number" &&
      Number.isFinite(requirement.relativePhysicalStats)
        ? requirement.relativePhysicalStats
        : undefined,
    timeOfDay:
      typeof requirement.timeOfDay === "string"
        ? requirement.timeOfDay
        : undefined,
    gender:
      requirement.gender === "male" || requirement.gender === "female"
        ? requirement.gender
        : undefined,
    turnUpsideDown:
      typeof requirement.turnUpsideDown === "boolean"
        ? requirement.turnUpsideDown
        : undefined,
  };
}

function normalizeEvolutionTransition(
  value: unknown,
): PokemonEvolutionTransition | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const transition = value as PokemonEvolutionTransition;
  if (
    typeof transition.fromId !== "number" ||
    !Number.isFinite(transition.fromId) ||
    typeof transition.toId !== "number" ||
    !Number.isFinite(transition.toId)
  ) {
    return undefined;
  }

  const methods = Array.isArray(transition.methods)
    ? transition.methods
        .map((method) => normalizeEvolutionRequirement(method))
        .filter(
          (method): method is PokemonEvolutionRequirement =>
            method !== undefined,
        )
    : [];

  return {
    fromId: transition.fromId,
    fromName:
      typeof transition.fromName === "string" && transition.fromName.trim()
        ? transition.fromName.trim()
        : `#${transition.fromId}`,
    toId: transition.toId,
    toName:
      typeof transition.toName === "string" && transition.toName.trim()
        ? transition.toName.trim()
        : `#${transition.toId}`,
    methods,
  };
}

function normalizeEncounterLocations(
  locations: unknown,
): PokemonEncounterLocation[] {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const source = entry as PokemonEncounterLocation;

      return {
        location:
          typeof source.location === "string" ? source.location.trim() : "",
        area: typeof source.area === "string" ? source.area.trim() : "",
        methods: Array.isArray(source.methods)
          ? Array.from(
              new Set(
                source.methods
                  .map((method) =>
                    typeof method === "string" ? method.trim() : "",
                  )
                  .filter((method) => method.length > 0),
              ),
            )
          : [],
        versions: Array.isArray(source.versions)
          ? Array.from(
              new Set(
                source.versions
                  .map((version) =>
                    typeof version === "string" ? version.trim() : "",
                  )
                  .filter((version) => version.length > 0),
              ),
            )
          : [],
        minLevel:
          typeof source.minLevel === "number" &&
          Number.isFinite(source.minLevel)
            ? source.minLevel
            : null,
        maxLevel:
          typeof source.maxLevel === "number" &&
          Number.isFinite(source.maxLevel)
            ? source.maxLevel
            : null,
      };
    })
    .filter((entry) => entry.location.length > 0 || entry.area.length > 0);
}

function normalizeAcquisitionEntries(
  acquisition: unknown,
): PokemonAcquisitionEntry[] {
  if (!Array.isArray(acquisition)) {
    return [];
  }

  return acquisition
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const source = entry as PokemonAcquisitionEntry;
      return {
        method: typeof source.method === "string" ? source.method.trim() : "",
        games: Array.isArray(source.games)
          ? Array.from(
              new Set(
                source.games
                  .map((game) => (typeof game === "string" ? game.trim() : ""))
                  .filter((game) => game.length > 0),
              ),
            )
          : [],
        summary:
          typeof source.summary === "string" ? source.summary.trim() : "",
      };
    })
    .filter((entry) => entry.method.length > 0 && entry.summary.length > 0);
}

function normalizeEvolutionLines(lines: unknown): number[][] {
  if (!Array.isArray(lines)) {
    return [];
  }

  return lines
    .filter((line) => Array.isArray(line))
    .map((line) =>
      line
        .map((value) => (typeof value === "number" ? value : Number.NaN))
        .filter((value) => Number.isFinite(value)),
    )
    .filter((line) => line.length > 0);
}

function deriveMovesFromLearnset(moveLearnset: PokemonMoveEntry[]): string[] {
  return moveLearnset
    .map((entry) => entry.name)
    .filter((name) => Boolean(name && name.length > 0))
    .sort((a, b) => a.localeCompare(b));
}

function normalizePokemon(record: Pokemon): Pokemon {
  const normalizedLearnset = normalizeMoveLearnset(record.moveLearnset);
  const normalizedEncounterLocations = normalizeEncounterLocations(
    record.frlgEncounterLocations,
  );
  const normalizedAcquisition = normalizeAcquisitionEntries(
    record.frlgAcquisition,
  );
  const normalizedEvolvesFrom = normalizeEvolutionTransition(
    record.evolvesFrom,
  );
  const normalizedEvolvesTo = Array.isArray(record.evolvesTo)
    ? record.evolvesTo
        .map((transition) => normalizeEvolutionTransition(transition))
        .filter(
          (transition): transition is PokemonEvolutionTransition =>
            transition !== undefined,
        )
    : [];

  const normalizedLocations = Array.isArray(record.locations)
    ? record.locations
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter((name) => name.length > 0)
    : normalizedEncounterLocations
        .map((entry) => entry.location)
        .filter((name) => name.length > 0);

  const normalizedMoves = Array.from(
    new Set(
      (Array.isArray(record.moves)
        ? record.moves
            .map((name) => (typeof name === "string" ? name.trim() : ""))
            .filter((name) => name.length > 0)
        : deriveMovesFromLearnset(normalizedLearnset)
      ).sort((a, b) => a.localeCompare(b)),
    ),
  );

  return {
    ...record,
    types: Array.isArray(record.types) ? record.types : [],
    evolutions: Array.isArray(record.evolutions)
      ? Array.from(
          new Set(
            record.evolutions
              .map((id) => (typeof id === "number" ? id : Number.NaN))
              .filter((id) => Number.isFinite(id)),
          ),
        ).sort((a, b) => a - b)
      : [],
    evolutionLines: normalizeEvolutionLines(record.evolutionLines),
    evolvesFrom: normalizedEvolvesFrom ?? null,
    evolvesTo: normalizedEvolvesTo,
    moves: normalizedMoves,
    moveLearnset: normalizedLearnset,
    flavorText:
      typeof record.flavorText === "string" ? record.flavorText.trim() : "",
    locations: Array.from(new Set(normalizedLocations)).sort((a, b) =>
      a.localeCompare(b),
    ),
    frlgEncounterLocations: normalizedEncounterLocations,
    frlgAcquisition: normalizedAcquisition,
    classification:
      typeof record.classification === "string" ? record.classification : "",
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
