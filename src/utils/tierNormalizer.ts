import { GAME_MAP } from './gameData'
import type { GameDefinition, GameId, TierDefinition } from '../types/team'

const sanitizeTierInput = (value: string) =>
  value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s_\-()[\].]/g, '')

export const getGameDefinition = (gameId: GameId): GameDefinition =>
  GAME_MAP[gameId]

export const normalizeTier = (
  gameId: GameId,
  rawTier: string,
): TierDefinition | null => {
  const game = getGameDefinition(gameId)
  const sanitized = sanitizeTierInput(rawTier)

  if (!sanitized) {
    return null
  }

  return game.aliasMap[sanitized] ?? null
}

export const isTierSupported = (gameId: GameId, rawTier: string) =>
  Boolean(normalizeTier(gameId, rawTier))
