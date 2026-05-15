import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_ROOT = "https://pokeapi.co/api/v2";
const TARGET_VERSION_GROUPS = ["firered-leafgreen"];
const TARGET_FLAVOR_VERSIONS = ["firered", "leafgreen"];
const TARGET_ENCOUNTER_VERSIONS = new Map([
  ["firered", "FireRed"],
  ["leafgreen", "LeafGreen"],
]);

const GAME_ORDER = new Map([
  ["FireRed", 0],
  ["LeafGreen", 1],
]);

const VERSION_ORDER = new Map(
  TARGET_VERSION_GROUPS.map((name, index) => [name, index]),
);

const METHOD_ORDER = new Map([
  ["level-up", 0],
  ["machine", 1],
  ["tutor", 2],
  ["egg", 3],
]);

const MANUAL_FRLG_ACQUISITION_BY_ID = new Map([
  [
    1,
    [
      {
        method: "starter",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Choose Bulbasaur as a starter from Professor Oak in Pallet Town.",
      },
    ],
  ],
  [
    4,
    [
      {
        method: "starter",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Choose Charmander as a starter from Professor Oak in Pallet Town.",
      },
    ],
  ],
  [
    7,
    [
      {
        method: "starter",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Choose Squirtle as a starter from Professor Oak in Pallet Town.",
      },
    ],
  ],
  [
    83,
    [
      {
        method: "trade",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Farfetch'd via in-game trade in Vermilion City.",
      },
    ],
  ],
  [
    106,
    [
      {
        method: "gift",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Choose Hitmonlee as a reward at the Fighting Dojo in Saffron City.",
      },
    ],
  ],
  [
    107,
    [
      {
        method: "gift",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Choose Hitmonchan as a reward at the Fighting Dojo in Saffron City.",
      },
    ],
  ],
  [
    108,
    [
      {
        method: "trade",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Lickitung via in-game trade on Route 18.",
      },
    ],
  ],
  [
    122,
    [
      {
        method: "trade",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Mr. Mime via in-game trade on Route 2.",
      },
    ],
  ],
  [
    124,
    [
      {
        method: "trade",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Jynx via in-game trade in Cerulean City.",
      },
    ],
  ],
  [
    131,
    [
      {
        method: "gift",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Lapras as a gift in Silph Co. in Saffron City.",
      },
    ],
  ],
  [
    133,
    [
      {
        method: "gift",
        games: ["FireRed", "LeafGreen"],
        summary: "Receive Eevee as a gift at Celadon Mansion.",
      },
    ],
  ],
  [
    137,
    [
      {
        method: "prize",
        games: ["FireRed", "LeafGreen"],
        summary: "Redeem Porygon as a prize at the Celadon Game Corner.",
      },
    ],
  ],
  [
    138,
    [
      {
        method: "fossil",
        games: ["FireRed", "LeafGreen"],
        summary: "Revive the Helix Fossil at Cinnabar Lab to obtain Omanyte.",
      },
    ],
  ],
  [
    140,
    [
      {
        method: "fossil",
        games: ["FireRed", "LeafGreen"],
        summary: "Revive the Dome Fossil at Cinnabar Lab to obtain Kabuto.",
      },
    ],
  ],
  [
    142,
    [
      {
        method: "fossil",
        games: ["FireRed", "LeafGreen"],
        summary: "Revive the Old Amber at Cinnabar Lab to obtain Aerodactyl.",
      },
    ],
  ],
  [
    143,
    [
      {
        method: "static",
        games: ["FireRed", "LeafGreen"],
        summary: "Encounter Snorlax as a static battle on Routes 12 and 16.",
      },
    ],
  ],
  [
    144,
    [
      {
        method: "static",
        games: ["FireRed", "LeafGreen"],
        summary: "Encounter Articuno as a static battle in Seafoam Islands.",
      },
    ],
  ],
  [
    145,
    [
      {
        method: "static",
        games: ["FireRed", "LeafGreen"],
        summary: "Encounter Zapdos as a static battle in the Power Plant.",
      },
    ],
  ],
  [
    146,
    [
      {
        method: "static",
        games: ["FireRed", "LeafGreen"],
        summary: "Encounter Moltres as a static battle on Mt. Ember.",
      },
    ],
  ],
  [
    150,
    [
      {
        method: "static",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Encounter Mewtwo as a static battle in Cerulean Cave after postgame progress.",
      },
    ],
  ],
  [
    151,
    [
      {
        method: "event",
        games: ["FireRed", "LeafGreen"],
        summary:
          "Mew is event-only in FireRed/LeafGreen and not normally obtainable in-game.",
      },
    ],
  ],
]);

const jsonCache = new Map();
const moveInfoCache = new Map();
const evolutionChainCache = new Map();
const locationAreaCache = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const outputFile = path.join(workspaceRoot, "src", "data", "gen1.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortGames(games) {
  return Array.from(new Set(games)).sort((a, b) => {
    const orderA = GAME_ORDER.get(a) ?? 99;
    const orderB = GAME_ORDER.get(b) ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.localeCompare(b);
  });
}

function toNullableNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNameFromSlug(slug) {
  const normalized = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "nidoran-f") {
    return "Nidoran♀";
  }

  if (normalized === "nidoran-m") {
    return "Nidoran♂";
  }

  if (normalized === "mr-mime") {
    return "Mr. Mime";
  }

  if (normalized === "farfetchd") {
    return "Farfetch'd";
  }

  return titleCaseFromSlug(normalized);
}

async function fetchJson(url, retries = 3) {
  if (jsonCache.has(url)) {
    return jsonCache.get(url);
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "PokemonPokedex-VSCodeExtension/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      const data = await response.json();
      jsonCache.set(url, data);
      return data;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      await sleep(250 * attempt);
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

function getEnglishName(entity, fallback) {
  if (!entity || !Array.isArray(entity.names)) {
    return fallback;
  }

  const english = entity.names.find(
    (entry) => entry?.language?.name === "en" && typeof entry.name === "string",
  );

  return english?.name ?? fallback;
}

function titleCaseFromSlug(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseIdFromUrl(url) {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

function parseMachine(itemName) {
  const normalized = String(itemName).toUpperCase();
  if (/^TM\d{1,2}$/.test(normalized)) {
    const number = normalized.slice(2).padStart(2, "0");
    return {
      machineCode: `TM${number}`,
      machineType: "TM",
    };
  }

  if (/^HM\d{1,2}$/.test(normalized)) {
    const number = normalized.slice(2).padStart(2, "0");
    return {
      machineCode: `HM${number}`,
      machineType: "HM",
    };
  }

  return {
    machineCode: normalized,
    machineType: undefined,
  };
}

function normalizeEvolutionRequirement(detail) {
  const requirement = {
    trigger: String(detail?.trigger?.name ?? "unknown"),
    minLevel: toNullableNumber(detail?.min_level),
  };

  if (detail?.item?.name) {
    requirement.item = formatNameFromSlug(detail.item.name);
  }

  if (detail?.held_item?.name) {
    requirement.heldItem = formatNameFromSlug(detail.held_item.name);
  }

  if (detail?.trade_species?.name) {
    requirement.tradeSpecies = formatNameFromSlug(detail.trade_species.name);
  }

  if (detail?.known_move?.name) {
    requirement.knownMove = formatNameFromSlug(detail.known_move.name);
  }

  if (detail?.known_move_type?.name) {
    requirement.knownMoveType = formatNameFromSlug(detail.known_move_type.name);
  }

  if (detail?.location?.name) {
    requirement.location = formatNameFromSlug(detail.location.name);
  }

  const minHappiness = toNullableNumber(detail?.min_happiness);
  if (minHappiness !== null) {
    requirement.minHappiness = minHappiness;
  }

  const minBeauty = toNullableNumber(detail?.min_beauty);
  if (minBeauty !== null) {
    requirement.minBeauty = minBeauty;
  }

  const minAffection = toNullableNumber(detail?.min_affection);
  if (minAffection !== null) {
    requirement.minAffection = minAffection;
  }

  const relativePhysicalStats = toNullableNumber(
    detail?.relative_physical_stats,
  );
  if (relativePhysicalStats !== null) {
    requirement.relativePhysicalStats = relativePhysicalStats;
  }

  if (typeof detail?.time_of_day === "string" && detail.time_of_day.trim()) {
    requirement.timeOfDay = detail.time_of_day.trim();
  }

  if (detail?.party_species?.name) {
    requirement.partySpecies = formatNameFromSlug(detail.party_species.name);
  }

  if (detail?.party_type?.name) {
    requirement.partyType = formatNameFromSlug(detail.party_type.name);
  }

  if (detail?.needs_overworld_rain === true) {
    requirement.needsOverworldRain = true;
  }

  if (detail?.turn_upside_down === true) {
    requirement.turnUpsideDown = true;
  }

  if (detail?.gender === 1) {
    requirement.gender = "female";
  } else if (detail?.gender === 2) {
    requirement.gender = "male";
  }

  return requirement;
}

function normalizeEvolutionMethods(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return [
      {
        trigger: "unknown",
        minLevel: null,
      },
    ];
  }

  const seen = new Set();
  const methods = [];

  for (const detail of details) {
    const requirement = normalizeEvolutionRequirement(detail);
    const key = JSON.stringify(requirement);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    methods.push(requirement);
  }

  return methods;
}

function buildEvolutionChainData(chainRoot) {
  const nodes = new Set();
  const edges = [];
  const rootToLeafPaths = [];

  function visit(node, path) {
    const currentId = parseIdFromUrl(node?.species?.url);
    if (!Number.isFinite(currentId)) {
      return;
    }

    nodes.add(currentId);
    const nextPath = [...path, currentId];
    const children = Array.isArray(node?.evolves_to) ? node.evolves_to : [];

    if (children.length === 0) {
      rootToLeafPaths.push(nextPath);
      return;
    }

    for (const child of children) {
      const childId = parseIdFromUrl(child?.species?.url);

      if (Number.isFinite(childId)) {
        edges.push({
          fromId: currentId,
          fromName: formatNameFromSlug(
            node?.species?.name ?? String(currentId),
          ),
          toId: childId,
          toName: formatNameFromSlug(child?.species?.name ?? String(childId)),
          methods: normalizeEvolutionMethods(child?.evolution_details),
        });
      }

      visit(child, nextPath);
    }
  }

  visit(chainRoot, []);

  const descendantsById = new Map();
  const evolutionLinesById = new Map();

  for (const id of nodes) {
    const descendants = new Set();
    const lines = [];

    for (const path of rootToLeafPaths) {
      const index = path.indexOf(id);
      if (index === -1) {
        continue;
      }

      lines.push(path.slice());
      for (let cursor = index + 1; cursor < path.length; cursor += 1) {
        descendants.add(path[cursor]);
      }
    }

    const uniqueLines = Array.from(
      new Map(lines.map((line) => [line.join("|"), line])).values(),
    );

    descendantsById.set(
      id,
      Array.from(descendants).sort((a, b) => a - b),
    );
    evolutionLinesById.set(id, uniqueLines);
  }

  const evolvesFromById = new Map();
  const evolvesToById = new Map();

  for (const edge of edges) {
    const existingFrom = evolvesFromById.get(edge.toId);
    if (!existingFrom) {
      evolvesFromById.set(edge.toId, {
        ...edge,
        methods: edge.methods.slice(),
      });
    }

    const existingTo = evolvesToById.get(edge.fromId) ?? [];
    existingTo.push({
      ...edge,
      methods: edge.methods.slice(),
    });
    evolvesToById.set(edge.fromId, existingTo);
  }

  for (const [fromId, transitions] of evolvesToById.entries()) {
    transitions.sort((a, b) => a.toId - b.toId);
    evolvesToById.set(fromId, transitions);
  }

  return {
    descendantsById,
    evolutionLinesById,
    evolvesFromById,
    evolvesToById,
  };
}

async function getEvolutionMetadata(evolutionChainUrl) {
  let metadata = evolutionChainCache.get(evolutionChainUrl);

  if (!metadata) {
    const evolutionData = await fetchJson(evolutionChainUrl);
    metadata = buildEvolutionChainData(evolutionData.chain);
    evolutionChainCache.set(evolutionChainUrl, metadata);
  }

  return metadata;
}

async function getLocationAreaInfo(locationAreaUrl) {
  if (locationAreaCache.has(locationAreaUrl)) {
    return locationAreaCache.get(locationAreaUrl);
  }

  const locationAreaData = await fetchJson(locationAreaUrl);
  const locationData = locationAreaData?.location?.url
    ? await fetchJson(locationAreaData.location.url)
    : undefined;

  const area = getEnglishName(
    locationAreaData,
    titleCaseFromSlug(locationAreaData.name),
  );

  const location = titleCaseFromSlug(
    locationAreaData?.location?.name ?? locationAreaData.name,
  );

  const region = String(locationData?.region?.name ?? "")
    .trim()
    .toLowerCase();

  const info = {
    area,
    location,
    region,
  };

  locationAreaCache.set(locationAreaUrl, info);
  return info;
}

async function getMoveInfo(moveUrl) {
  if (moveInfoCache.has(moveUrl)) {
    return moveInfoCache.get(moveUrl);
  }

  const moveData = await fetchJson(moveUrl);
  const displayName = getEnglishName(
    moveData,
    titleCaseFromSlug(moveData.name),
  );

  const machineLookup = new Map();

  for (const machineEntry of moveData.machines ?? []) {
    const versionGroup = machineEntry?.version_group?.name;
    if (!TARGET_VERSION_GROUPS.includes(versionGroup)) {
      continue;
    }

    const machineData = await fetchJson(machineEntry.machine.url);
    const itemName = machineData?.item?.name;
    if (!itemName) {
      continue;
    }

    const parsed = parseMachine(itemName);
    const existing = machineLookup.get(versionGroup) ?? [];
    existing.push(parsed);
    machineLookup.set(versionGroup, existing);
  }

  const info = {
    name: displayName,
    slug: moveData.name,
    type: titleCaseFromSlug(moveData?.type?.name ?? "unknown"),
    damageClass: titleCaseFromSlug(moveData?.damage_class?.name ?? "unknown"),
    power: typeof moveData.power === "number" ? moveData.power : null,
    accuracy: typeof moveData.accuracy === "number" ? moveData.accuracy : null,
    pp: typeof moveData.pp === "number" ? moveData.pp : null,
    machinesByVersionGroup: machineLookup,
  };

  moveInfoCache.set(moveUrl, info);
  return info;
}

function sanitizeFlavorText(value) {
  return String(value ?? "")
    .replace(/[\n\f\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function selectFlavorText(speciesData) {
  const entries = Array.isArray(speciesData.flavor_text_entries)
    ? speciesData.flavor_text_entries
    : [];

  const englishEntries = entries.filter(
    (entry) =>
      entry?.language?.name === "en" && typeof entry.flavor_text === "string",
  );

  for (const versionName of TARGET_FLAVOR_VERSIONS) {
    const match = englishEntries.find(
      (entry) => entry?.version?.name === versionName,
    );

    if (match) {
      return sanitizeFlavorText(match.flavor_text);
    }
  }

  if (englishEntries.length > 0) {
    return sanitizeFlavorText(englishEntries[0].flavor_text);
  }

  return "No flavor text available.";
}

function compareMethods(a, b) {
  const methodA = METHOD_ORDER.get(a.method) ?? 99;
  const methodB = METHOD_ORDER.get(b.method) ?? 99;
  if (methodA !== methodB) {
    return methodA - methodB;
  }

  const versionA = VERSION_ORDER.get(a.versionGroup) ?? 99;
  const versionB = VERSION_ORDER.get(b.versionGroup) ?? 99;
  if (versionA !== versionB) {
    return versionA - versionB;
  }

  const levelA = a.level ?? 999;
  const levelB = b.level ?? 999;
  if (levelA !== levelB) {
    return levelA - levelB;
  }

  const machineA = a.machineCode ?? "";
  const machineB = b.machineCode ?? "";
  if (machineA !== machineB) {
    return machineA.localeCompare(machineB);
  }

  return 0;
}

function formatEncounterMethodName(methodSlug) {
  return titleCaseFromSlug(methodSlug).replace("Old Rod", "Old Rod");
}

async function getFRLGEncounterLocations(pokemonData) {
  if (typeof pokemonData?.location_area_encounters !== "string") {
    return [];
  }

  const encounterEntries = await fetchJson(
    pokemonData.location_area_encounters,
  );
  if (!Array.isArray(encounterEntries)) {
    return [];
  }

  const locationMap = new Map();

  for (const entry of encounterEntries) {
    if (!entry?.location_area?.url) {
      continue;
    }

    const areaInfo = await getLocationAreaInfo(entry.location_area.url);
    if (areaInfo.region && areaInfo.region !== "kanto") {
      continue;
    }

    const key = `${areaInfo.location}|${areaInfo.area}`;
    const aggregate = locationMap.get(key) ?? {
      location: areaInfo.location,
      area: areaInfo.area,
      methods: new Set(),
      versions: new Set(),
      minLevel: null,
      maxLevel: null,
    };

    for (const versionDetail of entry.version_details ?? []) {
      const gameName = TARGET_ENCOUNTER_VERSIONS.get(
        versionDetail?.version?.name,
      );
      if (!gameName) {
        continue;
      }

      aggregate.versions.add(gameName);

      for (const encounterDetail of versionDetail.encounter_details ?? []) {
        if (encounterDetail?.method?.name) {
          aggregate.methods.add(
            formatEncounterMethodName(encounterDetail.method.name),
          );
        }

        const minLevel = toNullableNumber(encounterDetail?.min_level);
        const maxLevel = toNullableNumber(encounterDetail?.max_level);

        if (minLevel !== null) {
          aggregate.minLevel =
            aggregate.minLevel === null
              ? minLevel
              : Math.min(aggregate.minLevel, minLevel);
        }

        if (maxLevel !== null) {
          aggregate.maxLevel =
            aggregate.maxLevel === null
              ? maxLevel
              : Math.max(aggregate.maxLevel, maxLevel);
        }
      }
    }

    if (aggregate.versions.size > 0) {
      locationMap.set(key, aggregate);
    }
  }

  return Array.from(locationMap.values())
    .map((entry) => ({
      location: entry.location,
      area: entry.area,
      methods: Array.from(entry.methods).sort((a, b) => a.localeCompare(b)),
      versions: sortGames(Array.from(entry.versions)),
      minLevel: entry.minLevel,
      maxLevel: entry.maxLevel,
    }))
    .sort((a, b) => {
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location);
      }

      return a.area.localeCompare(b.area);
    });
}

function describeEvolutionRequirement(requirement) {
  const trigger = String(requirement?.trigger ?? "unknown");
  const conditions = [];

  let base = trigger;
  if (trigger === "level-up") {
    base =
      requirement.minLevel !== null
        ? `level up at Lv ${requirement.minLevel}`
        : "level up";
  } else if (trigger === "trade") {
    base = requirement.tradeSpecies
      ? `trade for ${requirement.tradeSpecies}`
      : "trade";
  } else if (trigger === "use-item") {
    base = requirement.item ? `use ${requirement.item}` : "use evolution item";
  } else {
    base = titleCaseFromSlug(trigger);
  }

  if (requirement.heldItem) {
    conditions.push(`holding ${requirement.heldItem}`);
  }

  if (requirement.knownMove) {
    conditions.push(`knowing ${requirement.knownMove}`);
  }

  if (requirement.knownMoveType) {
    conditions.push(`knowing a ${requirement.knownMoveType}-type move`);
  }

  if (requirement.location) {
    conditions.push(`at ${requirement.location}`);
  }

  if (
    requirement.minHappiness !== null &&
    requirement.minHappiness !== undefined
  ) {
    conditions.push(`friendship >= ${requirement.minHappiness}`);
  }

  if (requirement.minBeauty !== null && requirement.minBeauty !== undefined) {
    conditions.push(`beauty >= ${requirement.minBeauty}`);
  }

  if (
    requirement.minAffection !== null &&
    requirement.minAffection !== undefined
  ) {
    conditions.push(`affection >= ${requirement.minAffection}`);
  }

  if (typeof requirement.timeOfDay === "string" && requirement.timeOfDay) {
    conditions.push(`time: ${requirement.timeOfDay}`);
  }

  if (requirement.gender) {
    conditions.push(`gender: ${requirement.gender}`);
  }

  if (typeof requirement.relativePhysicalStats === "number") {
    const statCondition =
      requirement.relativePhysicalStats > 0
        ? "Attack > Defense"
        : requirement.relativePhysicalStats < 0
          ? "Attack < Defense"
          : "Attack = Defense";
    conditions.push(statCondition);
  }

  if (requirement.partySpecies) {
    conditions.push(`with ${requirement.partySpecies} in party`);
  }

  if (requirement.partyType) {
    conditions.push(`with ${requirement.partyType}-type in party`);
  }

  if (requirement.needsOverworldRain) {
    conditions.push("while raining");
  }

  if (requirement.turnUpsideDown) {
    conditions.push("while upside-down");
  }

  if (conditions.length === 0) {
    return base;
  }

  return `${base} (${conditions.join(", ")})`;
}

function summarizeCatchAcquisition(encounters) {
  if (!Array.isArray(encounters) || encounters.length === 0) {
    return undefined;
  }

  const locationNames = Array.from(
    new Set(encounters.map((entry) => entry.location)),
  );
  const methods = Array.from(
    new Set(encounters.flatMap((entry) => entry.methods ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  const games = sortGames(
    Array.from(new Set(encounters.flatMap((entry) => entry.versions ?? []))),
  );

  const minLevelCandidates = encounters
    .map((entry) => entry.minLevel)
    .filter((value) => typeof value === "number");
  const maxLevelCandidates = encounters
    .map((entry) => entry.maxLevel)
    .filter((value) => typeof value === "number");

  const minLevel = minLevelCandidates.length
    ? Math.min(...minLevelCandidates)
    : null;
  const maxLevel = maxLevelCandidates.length
    ? Math.max(...maxLevelCandidates)
    : null;

  const locationText =
    locationNames.length > 4
      ? `${locationNames.slice(0, 4).join(", ")}, and more`
      : locationNames.join(", ");

  const methodText = methods.length ? ` via ${methods.join(", ")}` : "";
  let levelText = "";

  if (minLevel !== null && maxLevel !== null) {
    levelText =
      minLevel === maxLevel
        ? ` around Lv ${minLevel}`
        : ` around Lv ${minLevel}-${maxLevel}`;
  }

  return {
    method: "catch",
    games,
    summary: `Catch in ${locationText}${methodText}${levelText}.`,
  };
}

function hydrateEvolutionNames(pokedex) {
  const pokemonById = new Map(
    pokedex.map((pokemon) => [pokemon.id, pokemon.name]),
  );

  for (const pokemon of pokedex) {
    if (pokemon.evolvesFrom) {
      pokemon.evolvesFrom.fromName =
        pokemonById.get(pokemon.evolvesFrom.fromId) ??
        pokemon.evolvesFrom.fromName;
      pokemon.evolvesFrom.toName =
        pokemonById.get(pokemon.evolvesFrom.toId) ?? pokemon.evolvesFrom.toName;
    }

    if (Array.isArray(pokemon.evolvesTo)) {
      pokemon.evolvesTo = pokemon.evolvesTo.map((transition) => ({
        ...transition,
        fromName: pokemonById.get(transition.fromId) ?? transition.fromName,
        toName: pokemonById.get(transition.toId) ?? transition.toName,
      }));
    }
  }
}

function hydrateAcquisitionEntries(pokedex) {
  for (const pokemon of pokedex) {
    const entries = [];
    const catchEntry = summarizeCatchAcquisition(
      pokemon.frlgEncounterLocations,
    );
    if (catchEntry) {
      entries.push(catchEntry);
    }

    if (pokemon.evolvesFrom) {
      const methods = Array.isArray(pokemon.evolvesFrom.methods)
        ? pokemon.evolvesFrom.methods
        : [];

      const methodSummary = methods
        .map(describeEvolutionRequirement)
        .join(" or ");
      entries.push({
        method: "evolve",
        games: ["FireRed", "LeafGreen"],
        summary: `Evolve from ${pokemon.evolvesFrom.fromName} by ${methodSummary || "special condition"}.`,
      });
    }

    const manual = MANUAL_FRLG_ACQUISITION_BY_ID.get(pokemon.id) ?? [];
    entries.push(...manual);

    const deduped = Array.from(
      new Map(
        entries.map((entry) => {
          const games = sortGames(entry.games ?? []);
          const normalized = {
            method: String(entry.method ?? "unknown"),
            games,
            summary: String(entry.summary ?? ""),
          };

          return [
            `${normalized.method}|${normalized.games.join(",")}|${normalized.summary}`,
            normalized,
          ];
        }),
      ).values(),
    );

    if (deduped.length === 0) {
      deduped.push({
        method: "unknown",
        games: ["FireRed", "LeafGreen"],
        summary:
          "No explicit FireRed/LeafGreen acquisition details were found.",
      });
    }

    pokemon.frlgAcquisition = deduped;
    pokemon.locations = Array.from(
      new Set(
        (pokemon.frlgEncounterLocations ?? []).map((entry) => entry.location),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }
}

async function buildPokemonEntry(id) {
  const pokemonData = await fetchJson(`${API_ROOT}/pokemon/${id}`);
  const speciesData = await fetchJson(pokemonData.species.url);
  const speciesId = Number(speciesData.id);

  const evolutionMetadata = await getEvolutionMetadata(
    speciesData.evolution_chain.url,
  );
  const descendants = evolutionMetadata.descendantsById.get(speciesId) ?? [];
  const evolutionLines =
    evolutionMetadata.evolutionLinesById.get(speciesId) ?? [];
  const evolvesFrom = evolutionMetadata.evolvesFromById.get(speciesId) ?? null;
  const evolvesTo = evolutionMetadata.evolvesToById.get(speciesId) ?? [];

  const moveLearnset = [];

  for (const moveSlot of pokemonData.moves ?? []) {
    const versionDetails = (moveSlot.version_group_details ?? []).filter(
      (detail) => TARGET_VERSION_GROUPS.includes(detail?.version_group?.name),
    );

    if (versionDetails.length === 0) {
      continue;
    }

    const moveInfo = await getMoveInfo(moveSlot.move.url);
    const learnMethods = [];
    const seenMethods = new Set();

    for (const detail of versionDetails) {
      const versionGroup = detail.version_group.name;
      const method = detail.move_learn_method.name;

      if (method === "machine") {
        const machineEntries =
          moveInfo.machinesByVersionGroup.get(versionGroup) ?? [];

        if (machineEntries.length > 0) {
          for (const machine of machineEntries) {
            const key = [
              method,
              versionGroup,
              "",
              machine.machineCode ?? "",
            ].join("|");
            if (seenMethods.has(key)) {
              continue;
            }

            seenMethods.add(key);
            learnMethods.push({
              method,
              versionGroup,
              level: null,
              machineCode: machine.machineCode,
              machineType: machine.machineType,
            });
          }

          continue;
        }
      }

      const level =
        method === "level-up" ? Number(detail.level_learned_at ?? 0) : null;
      const normalizedLevel = Number.isFinite(level) ? level : null;
      const key = [method, versionGroup, normalizedLevel ?? "", ""].join("|");

      if (seenMethods.has(key)) {
        continue;
      }

      seenMethods.add(key);
      learnMethods.push({
        method,
        versionGroup,
        level: normalizedLevel,
      });
    }

    if (learnMethods.length === 0) {
      continue;
    }

    learnMethods.sort(compareMethods);

    moveLearnset.push({
      name: moveInfo.name,
      slug: moveInfo.slug,
      type: moveInfo.type,
      damageClass: moveInfo.damageClass,
      power: moveInfo.power,
      accuracy: moveInfo.accuracy,
      pp: moveInfo.pp,
      learnMethods,
    });
  }

  moveLearnset.sort((a, b) => a.name.localeCompare(b.name));

  const statsByName = new Map(
    (pokemonData.stats ?? []).map((entry) => [
      entry?.stat?.name,
      entry?.base_stat,
    ]),
  );

  const genera = Array.isArray(speciesData.genera) ? speciesData.genera : [];
  const englishGenus =
    genera.find(
      (entry) =>
        entry?.language?.name === "en" && typeof entry.genus === "string",
    )?.genus ?? "Unknown";

  const speciesDisplayName = getEnglishName(
    speciesData,
    formatNameFromSlug(speciesData.name),
  );

  const frlgEncounterLocations = await getFRLGEncounterLocations(pokemonData);
  const normalizedEvolutionLines = Array.from(
    new Map(
      evolutionLines
        .map((line) => line.filter((value) => value > 0 && value <= 151))
        .filter((line) => line.length > 0)
        .map((line) => [line.join("|"), line]),
    ).values(),
  );

  const filteredEvolutionLines =
    normalizedEvolutionLines.length > 1
      ? normalizedEvolutionLines.filter((line) => line.length > 1)
      : normalizedEvolutionLines;

  return {
    id: pokemonData.id,
    name: speciesDisplayName,
    types: (pokemonData.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => titleCaseFromSlug(entry?.type?.name ?? "unknown")),
    stats: {
      hp: Number(statsByName.get("hp") ?? 0),
      attack: Number(statsByName.get("attack") ?? 0),
      defense: Number(statsByName.get("defense") ?? 0),
      spAttack: Number(statsByName.get("special-attack") ?? 0),
      spDefense: Number(statsByName.get("special-defense") ?? 0),
      speed: Number(statsByName.get("speed") ?? 0),
    },
    evolutions: descendants.filter((value) => value > 0 && value <= 151),
    evolutionLines: filteredEvolutionLines,
    evolvesFrom:
      evolvesFrom &&
      evolvesFrom.fromId > 0 &&
      evolvesFrom.fromId <= 151 &&
      evolvesFrom.toId > 0 &&
      evolvesFrom.toId <= 151
        ? evolvesFrom
        : null,
    evolvesTo: evolvesTo.filter(
      (transition) =>
        transition.fromId > 0 &&
        transition.fromId <= 151 &&
        transition.toId > 0 &&
        transition.toId <= 151,
    ),
    classification: englishGenus,
    moves: moveLearnset.map((entry) => entry.name),
    moveLearnset,
    flavorText: selectFlavorText(speciesData),
    frlgEncounterLocations,
    frlgAcquisition: [],
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) {
        return;
      }

      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => runWorker());
  await Promise.all(workers);

  return results;
}

async function main() {
  const ids = Array.from({ length: 151 }, (_, index) => index + 1);

  console.log(
    "Building FireRed/LeafGreen Gen 1 dataset with evolution and acquisition metadata...",
  );
  const pokedex = await mapWithConcurrency(ids, 5, async (pokemonId) => {
    const entry = await buildPokemonEntry(pokemonId);
    console.log(
      `Processed #${String(pokemonId).padStart(3, "0")} ${entry.name}`,
    );
    return entry;
  });

  pokedex.sort((a, b) => a.id - b.id);

  hydrateEvolutionNames(pokedex);
  hydrateAcquisitionEntries(pokedex);

  await writeFile(outputFile, `${JSON.stringify(pokedex, null, 2)}\n`, "utf8");

  console.log(`Done. Wrote ${pokedex.length} entries to ${outputFile}`);
}

main().catch((error) => {
  console.error("Failed to generate FireRed/LeafGreen Gen 1 dataset.");
  console.error(error);
  process.exitCode = 1;
});
