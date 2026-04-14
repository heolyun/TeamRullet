import { GAME_MAP } from './gameData'
import type {
  GameDefinition,
  GameId,
  ResolvedTier,
  TierDefinition,
} from '../types/team'

const TOP_TIER_BASE_KEYS: Record<GameId, string[]> = {
  league: ['MASTER', 'GRANDMASTER', 'CHALLENGER'],
  valorant: ['IMMORTAL', 'RADIANT'],
  pubg: ['MASTER', 'SURVIVOR'],
}

const sanitizeTierInput = (value: string) =>
  value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s_\-()[\].]/g, '')

const stripDivisionSuffix = (value: string) =>
  value.replace(/(III|II|IV|V|I|\d+)$/u, '')

const getBaseTierDefinition = (
  game: GameDefinition,
  baseKey: string,
): TierDefinition | null => {
  const exactTier = game.tiers.find((tier) => tier.key === baseKey)

  if (exactTier) {
    return exactTier
  }

  const prefixedTiers = game.tiers
    .filter((tier) => tier.key.startsWith(`${baseKey}_`))
    .sort((left, right) => left.score - right.score)

  return prefixedTiers[0] ?? null
}

const getTopTierAliases = (game: GameDefinition, baseKey: string) => {
  const relatedTiers = game.tiers.filter(
    (tier) => tier.key === baseKey || tier.key.startsWith(`${baseKey}_`),
  )

  const aliases = new Set<string>()

  for (const tier of relatedTiers) {
    for (const alias of tier.aliases) {
      const normalizedAlias = sanitizeTierInput(alias)
      const strippedAlias = stripDivisionSuffix(normalizedAlias)

      if (strippedAlias) {
        aliases.add(strippedAlias)
      }
    }
  }

  return [...aliases].sort((left, right) => right.length - left.length)
}

const resolveTopTier = (
  game: GameDefinition,
  sanitized: string,
): ResolvedTier | null => {
  for (const baseKey of TOP_TIER_BASE_KEYS[game.id]) {
    const baseTier = getBaseTierDefinition(game, baseKey)

    if (!baseTier) {
      continue
    }

    for (const alias of getTopTierAliases(game, baseKey)) {
      if (sanitized === alias) {
        return {
          definition: baseTier,
          key: baseTier.key,
          label: baseTier.label,
          score: baseTier.score,
        }
      }

      if (!sanitized.startsWith(alias)) {
        continue
      }

      const suffix = sanitized.slice(alias.length)

      if (!suffix || !/^\d+$/u.test(suffix)) {
        continue
      }

      const bonus = Number(suffix)

      return {
        definition: baseTier,
        key: `${baseTier.key}_BONUS_${bonus}`,
        label: bonus > 0 ? `${baseTier.label} +${bonus}` : baseTier.label,
        score: baseTier.score + bonus,
      }
    }
  }

  return null
}

export const getGameDefinition = (gameId: GameId): GameDefinition =>
  GAME_MAP[gameId]

export const normalizeTier = (
  gameId: GameId,
  rawTier: string,
): ResolvedTier | null => {
  const game = getGameDefinition(gameId)
  const sanitized = sanitizeTierInput(rawTier)

  if (!sanitized) {
    return null
  }

  const topTier = resolveTopTier(game, sanitized)

  if (topTier) {
    return topTier
  }

  const definition = game.aliasMap[sanitized]

  if (!definition) {
    return null
  }

  return {
    definition,
    key: definition.key,
    label: definition.label,
    score: definition.score,
  }
}

export const isTierSupported = (gameId: GameId, rawTier: string) =>
  Boolean(normalizeTier(gameId, rawTier))
