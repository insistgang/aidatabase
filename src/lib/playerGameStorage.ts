import type { GameState } from '../types/game';

export const LEGACY_GAME_STATE_STORAGE_KEY = 'kolm_game_state';

const CURRENT_PLAYER_STORAGE_KEY = 'kolm_current_player_name';
const PLAYER_GAME_STATE_STORAGE_PREFIX = 'kolm_game_state:player:';

type GameStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function normalizePlayerName(playerName: string) {
  return playerName.trim().replace(/\s+/g, ' ');
}

function playerStorageKey(playerName: string) {
  const normalizedName = normalizePlayerName(playerName);
  if (!normalizedName) return LEGACY_GAME_STATE_STORAGE_KEY;
  return `${PLAYER_GAME_STATE_STORAGE_PREFIX}${encodeURIComponent(normalizedName)}`;
}

function readJsonState(storage: GameStorage, key: string): Partial<GameState> | null {
  try {
    const saved = storage.getItem(key);
    if (!saved) return null;
    return JSON.parse(saved) as Partial<GameState>;
  } catch {
    return null;
  }
}

export function loadGameStateForPlayer(
  storage: GameStorage,
  playerName: string
): Partial<GameState> | null {
  const normalizedName = normalizePlayerName(playerName);
  if (!normalizedName) return null;

  const playerState = readJsonState(storage, playerStorageKey(normalizedName));
  if (playerState) return playerState;

  const legacyState = readJsonState(storage, LEGACY_GAME_STATE_STORAGE_KEY);
  if (
    legacyState?.playerName &&
    normalizePlayerName(legacyState.playerName) === normalizedName
  ) {
    return legacyState;
  }

  return null;
}

export function loadInitialGameState(storage: GameStorage): Partial<GameState> | null {
  const currentPlayerName = storage.getItem(CURRENT_PLAYER_STORAGE_KEY);
  if (currentPlayerName !== null) {
    if (!normalizePlayerName(currentPlayerName)) return { playerName: currentPlayerName };
    return loadGameStateForPlayer(storage, currentPlayerName) ?? { playerName: currentPlayerName };
  }

  return readJsonState(storage, LEGACY_GAME_STATE_STORAGE_KEY);
}

export function saveGameStateForPlayer(storage: GameStorage, state: GameState) {
  try {
    storage.setItem(CURRENT_PLAYER_STORAGE_KEY, state.playerName);

    if (!normalizePlayerName(state.playerName)) return;

    storage.setItem(playerStorageKey(state.playerName), JSON.stringify(state));
  } catch {
    // A storage failure should not interrupt the game flow.
  }
}
