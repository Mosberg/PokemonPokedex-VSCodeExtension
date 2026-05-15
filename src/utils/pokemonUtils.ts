import { Pokemon } from "../types";

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

export function formatPokemonMoves(
  pokemon: Pokemon,
  maxMoves?: number,
): string {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];
  if (!moves.length) {
    return "No move data available.";
  }

  if (typeof maxMoves === "number" && Number.isFinite(maxMoves)) {
    const limit = Math.max(1, Math.floor(maxMoves));
    return moves.slice(0, limit).join(", ");
  }

  return moves.join(", ");
}
