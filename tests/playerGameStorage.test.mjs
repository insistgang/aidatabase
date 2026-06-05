import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYER_GAME_STORAGE_MODULE;
if (!modulePath) {
  throw new Error('PLAYER_GAME_STORAGE_MODULE is required');
}

const {
  LEGACY_GAME_STATE_STORAGE_KEY,
  loadGameStateForPlayer,
  loadInitialGameState,
  saveGameStateForPlayer,
} = await import(pathToFileURL(modulePath).href);

function createStorage(initial = {}) {
  const items = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
    removeItem(key) {
      items.delete(key);
    },
  };
}

function gameState(playerName, score) {
  return {
    playerName,
    currentLevel: 1,
    lives: 5,
    score,
    levelStatus: ['available', 'locked'],
    activeQuestionIds: [],
    levelStartLives: 5,
    levelStartScore: score,
    currentQuestionIndex: 0,
    gamePhase: 'map',
    quizResults: [],
    initialized: true,
  };
}

test('stores and loads a separate game state for each player name', () => {
  const storage = createStorage();

  saveGameStateForPlayer(storage, gameState('张鑫', 180));
  saveGameStateForPlayer(storage, gameState('李雷', 40));

  assert.equal(loadGameStateForPlayer(storage, '张鑫').score, 180);
  assert.equal(loadGameStateForPlayer(storage, '李雷').score, 40);
});

test('resumes the last saved player on page reload', () => {
  const storage = createStorage();

  saveGameStateForPlayer(storage, gameState('张鑫', 180));
  saveGameStateForPlayer(storage, gameState('李雷', 40));

  assert.equal(loadInitialGameState(storage).playerName, '李雷');
  assert.equal(loadInitialGameState(storage).score, 40);
});

test('normalizes surrounding whitespace when matching a player name', () => {
  const storage = createStorage();

  saveGameStateForPlayer(storage, gameState('  张鑫  ', 180));

  assert.equal(loadGameStateForPlayer(storage, '张鑫').score, 180);
});

test('can still load the legacy single-user save for matching names', () => {
  const storage = createStorage({
    [LEGACY_GAME_STATE_STORAGE_KEY]: JSON.stringify(gameState('旧用户', 88)),
  });

  assert.equal(loadInitialGameState(storage).score, 88);
  assert.equal(loadGameStateForPlayer(storage, '旧用户').score, 88);
  assert.equal(loadGameStateForPlayer(storage, '其他用户'), null);
});

test('does not fall back to a legacy save after the current player is cleared', () => {
  const storage = createStorage({
    [LEGACY_GAME_STATE_STORAGE_KEY]: JSON.stringify(gameState('旧用户', 88)),
  });

  saveGameStateForPlayer(storage, gameState('', 0));

  assert.deepEqual(loadInitialGameState(storage), { playerName: '' });
});
