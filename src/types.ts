export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: PokemonStats;
  evolutions: number[];
  moves?: string[];
  flavorText?: string;
  locations?: string[];
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
