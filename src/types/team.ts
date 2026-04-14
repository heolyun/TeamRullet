export type GameId = 'league' | 'valorant' | 'pubg'

export type TierDefinition = {
  key: string
  label: string
  score: number
  aliases: string[]
}

export type ResolvedTier = {
  definition: TierDefinition
  key: string
  label: string
  score: number
}

export type GameDefinition = {
  id: GameId
  label: string
  shortLabel: string
  description: string
  defaultScore: number
  tiers: TierDefinition[]
  aliasMap: Record<string, TierDefinition>
  samples: string[]
}

export type Participant = {
  id: string
  nickname: string
  sourceLine: string
  rawTier: string | null
  tierKey: string | null
  tierLabel: string | null
  score: number
  hasTier: boolean
}

export type ConstraintPair = {
  left: string
  right: string
  sourceLine: string
}

export type TeamGroup = {
  id: string
  members: Participant[]
  totalScore: number
  memberCount: number
  explicitTierCount: number
  conflicts: Set<string>
}

export type TeamAssignment = {
  id: number
  groups: TeamGroup[]
  members: Participant[]
  totalScore: number
  memberCount: number
  explicitTierCount: number
}

export type PreparedGeneration = {
  game: GameDefinition
  participants: Participant[]
  sameTeamPairs: ConstraintPair[]
  separateTeamPairs: ConstraintPair[]
  groups: TeamGroup[]
  teamCount: number
  warnings: string[]
}

export type GenerationSummary = {
  participantCount: number
  explicitTierCount: number
  defaultTierCount: number
  scoreGap: number
  sizeGap: number
}

export type GenerationResult = {
  teams: TeamAssignment[]
  warnings: string[]
  summary: GenerationSummary
}
