import type {
  GenerationResult,
  PreparedGeneration,
  TeamAssignment,
  TeamGroup,
} from '../types/team'

const createEmptyTeams = (teamCount: number): TeamAssignment[] =>
  Array.from({ length: teamCount }, (_, index) => ({
    id: index + 1,
    groups: [],
    members: [],
    totalScore: 0,
    memberCount: 0,
    explicitTierCount: 0,
  }))

const cloneTeams = (teams: TeamAssignment[]): TeamAssignment[] =>
  teams.map((team) => ({
    ...team,
    groups: [...team.groups],
    members: [...team.members],
  }))

const canPlaceGroup = (team: TeamAssignment, group: TeamGroup) =>
  team.groups.every((existingGroup) => !existingGroup.conflicts.has(group.id))

const evaluateCost = (
  teams: TeamAssignment[],
  averageScore: number,
  averageSize: number,
) => {
  const scores = teams.map((team) => team.totalScore)
  const sizes = teams.map((team) => team.memberCount)
  const scoreGap = Math.max(...scores) - Math.min(...scores)
  const sizeGap = Math.max(...sizes) - Math.min(...sizes)
  const totalDeviation = scores.reduce(
    (sum, score) => sum + Math.abs(score - averageScore),
    0,
  )
  const sizeDeviation = sizes.reduce(
    (sum, size) => sum + Math.abs(size - averageSize),
    0,
  )
  const emptyTeams = sizes.filter((size) => size === 0).length

  return (
    emptyTeams * 1_000_000 +
    sizeGap * 50_000 +
    Math.round(sizeDeviation * 2_000) +
    scoreGap * 250 +
    Math.round(totalDeviation * 120)
  )
}

const scoreCandidate = (
  teams: TeamAssignment[],
  teamIndex: number,
  group: TeamGroup,
  averageScore: number,
  averageSize: number,
) => {
  const projectedTeams = teams.map((team, index) =>
    index === teamIndex
      ? {
          ...team,
          totalScore: team.totalScore + group.totalScore,
          memberCount: team.memberCount + group.memberCount,
        }
      : team,
  )

  return (
    evaluateCost(projectedTeams, averageScore, averageSize) +
    Math.random() * 400
  )
}

const placeGroup = (team: TeamAssignment, group: TeamGroup) => {
  team.groups.push(group)
  team.members.push(...group.members)
  team.totalScore += group.totalScore
  team.memberCount += group.memberCount
  team.explicitTierCount += group.explicitTierCount
}

const generateGroupOrder = (groups: TeamGroup[]) =>
  groups
    .map((group) => ({ group, noise: Math.random() }))
    .sort((left, right) => {
      if (right.group.conflicts.size !== left.group.conflicts.size) {
        return right.group.conflicts.size - left.group.conflicts.size
      }

      if (right.group.memberCount !== left.group.memberCount) {
        return right.group.memberCount - left.group.memberCount
      }

      if (right.group.totalScore !== left.group.totalScore) {
        return right.group.totalScore - left.group.totalScore
      }

      return left.noise - right.noise
    })
    .map(({ group }) => group)

const runAttempt = (data: PreparedGeneration) => {
  const teams = createEmptyTeams(data.teamCount)
  const averageScore =
    data.groups.reduce((sum, group) => sum + group.totalScore, 0) / data.teamCount
  const averageSize =
    data.groups.reduce((sum, group) => sum + group.memberCount, 0) / data.teamCount

  for (const group of generateGroupOrder(data.groups)) {
    const candidates = teams
      .map((team, index) => ({ team, index }))
      .filter(({ team }) => canPlaceGroup(team, group))
      .map(({ index }) => ({
        index,
        score: scoreCandidate(teams, index, group, averageScore, averageSize),
      }))
      .sort((left, right) => left.score - right.score)

    if (candidates.length === 0) {
      return null
    }

    const pickFrom = candidates.slice(0, Math.min(3, candidates.length))
    const choice = pickFrom[Math.floor(Math.random() * pickFrom.length)]

    placeGroup(teams[choice.index], group)
  }

  return {
    teams,
    cost: evaluateCost(teams, averageScore, averageSize),
  }
}

export const generateTeams = (data: PreparedGeneration): GenerationResult => {
  const attemptCount = Math.max(250, data.groups.length * 80)
  let bestAttempt: { teams: TeamAssignment[]; cost: number } | null = null

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const result = runAttempt(data)

    if (!result) {
      continue
    }

    if (!bestAttempt || result.cost < bestAttempt.cost) {
      bestAttempt = {
        teams: cloneTeams(result.teams),
        cost: result.cost,
      }
    }
  }

  if (!bestAttempt) {
    throw new Error(
      '현재 조건으로는 팀을 나눌 수 없어요. 팀 개수나 조건을 다시 확인해 주세요.',
    )
  }

  const teams = bestAttempt.teams
    .map((team) => ({
      ...team,
      members: [...team.members].sort((left, right) =>
        left.nickname.localeCompare(right.nickname, 'ko'),
      ),
    }))
    .sort((left, right) => left.id - right.id)

  const scores = teams.map((team) => team.totalScore)
  const sizes = teams.map((team) => team.memberCount)
  const participantCount = data.participants.length
  const explicitTierCount = data.participants.filter(
    (participant) => participant.hasTier,
  ).length

  return {
    teams,
    warnings: data.warnings,
    summary: {
      participantCount,
      explicitTierCount,
      defaultTierCount: participantCount - explicitTierCount,
      scoreGap: Math.max(...scores) - Math.min(...scores),
      sizeGap: Math.max(...sizes) - Math.min(...sizes),
    },
  }
}
