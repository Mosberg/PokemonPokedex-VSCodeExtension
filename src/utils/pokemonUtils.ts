import {
  Pokemon,
  PokemonEvolutionRequirement,
  PokemonEvolutionTransition,
  PokemonMoveEntry,
  PokemonMoveLearnMethod,
} from "../types";

export function formatPokemonId(id: number): string {
  return id.toString().padStart(3, "0");
}

export function normalizePokemonName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

export function toCompletionToken(name: string): string {
  return normalizePokemonName(name);
}

export function createPokemonLookup(pokedex: Pokemon[]): Map<string, Pokemon> {
  const map = new Map<string, Pokemon>();

  for (const pokemon of pokedex) {
    map.set(normalizePokemonName(pokemon.name), pokemon);
    map.set(pokemon.name.toLowerCase(), pokemon);
    map.set(String(pokemon.id), pokemon);
    map.set(formatPokemonId(pokemon.id), pokemon);
  }

  return map;
}

export function findPokemonByQuery(
  pokedex: Pokemon[],
  query: string | number,
): Pokemon | undefined {
  if (typeof query === "number") {
    return pokedex.find((pokemon) => pokemon.id === query);
  }

  const cleaned = query.trim();
  if (!cleaned) {
    return undefined;
  }

  const lookup = createPokemonLookup(pokedex);
  return (
    lookup.get(cleaned.toLowerCase()) ??
    lookup.get(normalizePokemonName(cleaned)) ??
    undefined
  );
}

export function formatPokemonStats(pokemon: Pokemon): string {
  return [
    `HP: ${pokemon.stats.hp}`,
    `ATK: ${pokemon.stats.attack}`,
    `DEF: ${pokemon.stats.defense}`,
    `SPA: ${pokemon.stats.spAttack}`,
    `SPD: ${pokemon.stats.spDefense}`,
    `SPE: ${pokemon.stats.speed}`,
  ].join(" | ");
}

export function getPokemonFlavorText(pokemon: Pokemon): string {
  const value = (pokemon.flavorText ?? "").trim();
  return value || "No flavor text available.";
}

function titleCaseFromSlug(value: string): string {
  return String(value)
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
  );
}

function formatEvolutionRequirement(
  requirement: PokemonEvolutionRequirement,
): string {
  const trigger = requirement.trigger.toLowerCase();
  const conditions: string[] = [];

  let base = titleCaseFromSlug(requirement.trigger);

  if (trigger === "level-up") {
    base =
      requirement.minLevel !== null
        ? `Level up at Lv ${requirement.minLevel}`
        : "Level up";
  } else if (trigger === "trade") {
    base = requirement.tradeSpecies
      ? `Trade for ${requirement.tradeSpecies}`
      : "Trade";
  } else if (trigger === "use-item") {
    base = requirement.item ? `Use ${requirement.item}` : "Use evolution item";
  }

  if (requirement.heldItem) {
    conditions.push(`holding ${requirement.heldItem}`);
  }

  if (requirement.location) {
    conditions.push(`at ${requirement.location}`);
  }

  if (requirement.timeOfDay) {
    conditions.push(`time: ${requirement.timeOfDay}`);
  }

  if (requirement.gender) {
    conditions.push(`gender: ${requirement.gender}`);
  }

  if (typeof requirement.minHappiness === "number") {
    conditions.push(`friendship >= ${requirement.minHappiness}`);
  }

  if (typeof requirement.relativePhysicalStats === "number") {
    if (requirement.relativePhysicalStats > 0) {
      conditions.push("Attack > Defense");
    } else if (requirement.relativePhysicalStats < 0) {
      conditions.push("Attack < Defense");
    } else {
      conditions.push("Attack = Defense");
    }
  }

  if (!conditions.length) {
    return base;
  }

  return `${base} (${conditions.join(", ")})`;
}

function formatEvolutionTransition(
  transition: PokemonEvolutionTransition,
): string {
  const methods = Array.isArray(transition.methods) ? transition.methods : [];
  if (!methods.length) {
    return `${transition.fromName} -> ${transition.toName}`;
  }

  const methodText = uniqueStrings(
    methods.map((method) => formatEvolutionRequirement(method)),
  ).join(" or ");

  return `${transition.fromName} -> ${transition.toName}: ${methodText}`;
}

export function formatPokemonEvolutionInfo(
  pokemon: Pokemon,
  maxEntries = 4,
): string {
  const output: string[] = [];

  if (pokemon.evolvesFrom) {
    output.push(`From: ${formatEvolutionTransition(pokemon.evolvesFrom)}`);
  } else {
    output.push("From: Base form");
  }

  if (Array.isArray(pokemon.evolvesTo) && pokemon.evolvesTo.length > 0) {
    const lines = pokemon.evolvesTo
      .slice(0, maxEntries)
      .map((transition) => `To: ${formatEvolutionTransition(transition)}`);
    output.push(...lines);

    if (pokemon.evolvesTo.length > maxEntries) {
      output.push(`To: +${pokemon.evolvesTo.length - maxEntries} more`);
    }
  } else {
    output.push("To: Final stage");
  }

  if (
    Array.isArray(pokemon.evolutionLines) &&
    pokemon.evolutionLines.length > 0
  ) {
    const lineText = pokemon.evolutionLines
      .slice(0, 2)
      .map((line) => line.map((id) => `#${formatPokemonId(id)}`).join(" -> "));

    if (lineText.length) {
      output.push(`Lines: ${lineText.join(" | ")}`);
    }
  }

  return output.join("\n");
}

export function formatPokemonEncounterInfo(
  pokemon: Pokemon,
  maxEntries = 5,
): string {
  const locations = Array.isArray(pokemon.frlgEncounterLocations)
    ? pokemon.frlgEncounterLocations
    : [];

  if (!locations.length) {
    return "No FireRed/LeafGreen wild encounter locations listed.";
  }

  const lines = locations.slice(0, maxEntries).map((entry) => {
    const area =
      entry.area && entry.area !== entry.location ? ` (${entry.area})` : "";
    const methodText = entry.methods.length
      ? entry.methods.join("/")
      : "Unknown method";

    let levelText = "";
    if (entry.minLevel !== null && entry.maxLevel !== null) {
      levelText =
        entry.minLevel === entry.maxLevel
          ? ` Lv ${entry.minLevel}`
          : ` Lv ${entry.minLevel}-${entry.maxLevel}`;
    }

    const versionText = entry.versions.length
      ? ` [${entry.versions.join("/")}]`
      : "";

    return `${entry.location}${area}: ${methodText}${levelText}${versionText}`;
  });

  if (locations.length > maxEntries) {
    lines.push(`+${locations.length - maxEntries} more locations`);
  }

  return lines.join("\n");
}

export function formatPokemonAcquisitionInfo(
  pokemon: Pokemon,
  maxEntries = 5,
): string {
  const acquisition = Array.isArray(pokemon.frlgAcquisition)
    ? pokemon.frlgAcquisition
    : [];

  if (!acquisition.length) {
    return "No FireRed/LeafGreen acquisition notes available.";
  }

  const lines = acquisition.slice(0, maxEntries).map((entry) => {
    const games = entry.games.length ? ` [${entry.games.join("/")}]` : "";
    return `${titleCaseFromSlug(entry.method)}: ${entry.summary}${games}`;
  });

  if (acquisition.length > maxEntries) {
    lines.push(`+${acquisition.length - maxEntries} more acquisition entries`);
  }

  return lines.join("\n");
}

export function getPokemonMoveEntries(pokemon: Pokemon): PokemonMoveEntry[] {
  if (Array.isArray(pokemon.moveLearnset) && pokemon.moveLearnset.length > 0) {
    return pokemon.moveLearnset;
  }

  if (!Array.isArray(pokemon.moves)) {
    return [];
  }

  return pokemon.moves.map((name) => ({
    name,
    slug: normalizePokemonName(name),
    type: "unknown",
    damageClass: "unknown",
    power: null,
    accuracy: null,
    pp: null,
    learnMethods: [],
  }));
}

function flattenLearnMethods(
  pokemon: Pokemon,
): Array<PokemonMoveLearnMethod & { moveName: string }> {
  const methods: Array<PokemonMoveLearnMethod & { moveName: string }> = [];

  for (const entry of getPokemonMoveEntries(pokemon)) {
    if (!Array.isArray(entry.learnMethods)) {
      continue;
    }

    for (const method of entry.learnMethods) {
      methods.push({
        ...method,
        moveName: entry.name,
      });
    }
  }

  return methods;
}

function formatMethodLabel(method: PokemonMoveLearnMethod): string {
  const methodName = method.method.toLowerCase();
  if (methodName === "level-up") {
    return method.level !== null ? `Lv ${method.level}` : "Level-up";
  }

  if (methodName === "machine") {
    if (method.machineCode) {
      return method.machineCode;
    }

    return "Machine";
  }

  return method.method;
}

function summarizeByMethod(
  methods: Array<PokemonMoveLearnMethod & { moveName: string }>,
  methodName: string,
  maxEntries: number,
): string[] {
  const filtered = methods
    .filter((method) => method.method.toLowerCase() === methodName)
    .sort((a, b) => {
      const levelA = a.level ?? 999;
      const levelB = b.level ?? 999;
      if (levelA !== levelB) {
        return levelA - levelB;
      }

      if (a.moveName !== b.moveName) {
        return a.moveName.localeCompare(b.moveName);
      }

      return a.versionGroup.localeCompare(b.versionGroup);
    });

  const unique = new Set<string>();
  const output: string[] = [];

  for (const method of filtered) {
    const key = [
      method.moveName,
      method.method,
      method.versionGroup,
      method.level ?? "",
      method.machineCode ?? "",
    ].join("|");

    if (unique.has(key)) {
      continue;
    }

    unique.add(key);
    output.push(
      `${method.moveName} (${formatMethodLabel(method)} - ${method.versionGroup})`,
    );

    if (output.length >= maxEntries) {
      break;
    }
  }

  return output;
}

export function formatPokemonMoveAcquisition(
  pokemon: Pokemon,
  maxEntriesPerGroup = 8,
): string {
  const methods = flattenLearnMethods(pokemon);
  if (!methods.length) {
    return "No move acquisition details available.";
  }

  const levelUp = summarizeByMethod(methods, "level-up", maxEntriesPerGroup);
  const machine = summarizeByMethod(methods, "machine", maxEntriesPerGroup);
  const others = methods
    .filter(
      (method) =>
        method.method.toLowerCase() !== "level-up" &&
        method.method.toLowerCase() !== "machine",
    )
    .map(
      (method) =>
        `${method.moveName} (${method.method} - ${method.versionGroup})`,
    )
    .slice(0, maxEntriesPerGroup);

  const sections: string[] = [];

  if (levelUp.length) {
    sections.push(`Level-up: ${levelUp.join(", ")}`);
  }

  if (machine.length) {
    sections.push(`TM/HM: ${machine.join(", ")}`);
  }

  if (others.length) {
    sections.push(`Other: ${others.join(", ")}`);
  }

  return sections.join("\n");
}

export function formatPokemonTMHMMoves(
  pokemon: Pokemon,
  maxEntries = 16,
): string {
  const methods = flattenLearnMethods(pokemon)
    .filter((method) => method.method.toLowerCase() === "machine")
    .sort((a, b) => {
      const codeA = a.machineCode ?? "zzzz";
      const codeB = b.machineCode ?? "zzzz";
      if (codeA !== codeB) {
        return codeA.localeCompare(codeB);
      }

      return a.moveName.localeCompare(b.moveName);
    });

  const unique = new Set<string>();
  const entries: string[] = [];

  for (const method of methods) {
    const code = method.machineCode ?? "Machine";
    const label = `${code} ${method.moveName}`;
    if (unique.has(label)) {
      continue;
    }

    unique.add(label);
    entries.push(label);
    if (entries.length >= maxEntries) {
      break;
    }
  }

  return entries.length ? entries.join(", ") : "No TM/HM data available.";
}

export function formatPokemonMoves(
  pokemon: Pokemon,
  maxMoves?: number,
): string {
  const moves = getPokemonMoveEntries(pokemon).map((entry) => entry.name);
  if (!moves.length) {
    return "No move data available.";
  }

  if (typeof maxMoves === "number" && Number.isFinite(maxMoves)) {
    const limit = Math.max(1, Math.floor(maxMoves));
    return moves.slice(0, limit).join(", ");
  }

  return moves.join(", ");
}
