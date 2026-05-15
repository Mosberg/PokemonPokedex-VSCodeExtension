export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface PokemonMoveLearnMethod {
  method: string;
  versionGroup: string;
  level: number | null;
  machineCode?: string;
  machineType?: "TM" | "HM";
}

export interface PokemonMoveEntry {
  name: string;
  slug: string;
  type: string;
  damageClass: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  learnMethods: PokemonMoveLearnMethod[];
}

export interface PokemonEvolutionRequirement {
  trigger: string;
  minLevel: number | null;
  item?: string;
  heldItem?: string;
  tradeSpecies?: string;
  knownMove?: string;
  knownMoveType?: string;
  location?: string;
  minHappiness?: number | null;
  minBeauty?: number | null;
  minAffection?: number | null;
  needsOverworldRain?: boolean;
  partySpecies?: string;
  partyType?: string;
  relativePhysicalStats?: number | null;
  timeOfDay?: string;
  gender?: "male" | "female";
  turnUpsideDown?: boolean;
}

export interface PokemonEvolutionTransition {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  methods: PokemonEvolutionRequirement[];
}

export interface PokemonEncounterLocation {
  location: string;
  area: string;
  methods: string[];
  versions: string[];
  minLevel: number | null;
  maxLevel: number | null;
}

export interface PokemonAcquisitionEntry {
  method: string;
  games: string[];
  summary: string;
}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: PokemonStats;
  evolutions: number[];
  evolutionLines?: number[][];
  evolvesFrom?: PokemonEvolutionTransition | null;
  evolvesTo?: PokemonEvolutionTransition[];
  moves?: string[];
  moveLearnset?: PokemonMoveEntry[];
  flavorText?: string;
  locations?: string[];
  frlgEncounterLocations?: PokemonEncounterLocation[];
  frlgAcquisition?: PokemonAcquisitionEntry[];
  classification?: string;
}

export type SpriteVariant = "normal" | "shiny";

export interface PokedexSettings {
  defaultSpriteVariant: SpriteVariant;
  maxMovesToDisplay: number;
  showFlavorTextInSidebar: boolean;
  showFlavorTextInHover: boolean;
  enableHoverProvider: boolean;
  enableCompletionProvider: boolean;
}

export interface WebviewPokemon extends Pokemon {
  indexLabel: string;
  spriteNormal: string;
  spriteShiny: string;
}
