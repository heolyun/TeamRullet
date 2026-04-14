import type {
  ConstraintPair,
  GameId,
  Participant,
  PreparedGeneration,
  TeamGroup,
} from '../types/team'
import { parseConstraintPairs, parseParticipants } from './parser'
import { getGameDefinition } from './tierNormalizer'

class DisjointSet {
  private parent = new Map<string, string>()

  makeSet(value: string) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value)
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value)

    if (!parent || parent === value) {
      return value
    }

    const root = this.find(parent)
    this.parent.set(value, root)
    return root
  }

  union(left: string, right: string) {
    const leftRoot = this.find(left)
    const rightRoot = this.find(right)

    if (leftRoot !== rightRoot) {
      this.parent.set(rightRoot, leftRoot)
    }
  }
}

const createGroups = (
  participants: Participant[],
  sameTeamPairs: ConstraintPair[],
  defaultScore: number,
) => {
  const set = new DisjointSet()

  for (const participant of participants) {
    set.makeSet(participant.id)
  }

  for (const pair of sameTeamPairs) {
    set.union(pair.left, pair.right)
  }

  const grouped = new Map<string, TeamGroup>()

  for (const participant of participants) {
    const root = set.find(participant.id)

    if (!grouped.has(root)) {
      grouped.set(root, {
        id: root,
        members: [],
        totalScore: 0,
        memberCount: 0,
        explicitTierCount: 0,
        conflicts: new Set<string>(),
      })
    }

    const group = grouped.get(root)!
    const score = participant.hasTier ? participant.score : defaultScore

    group.members.push({
      ...participant,
      score,
    })
    group.totalScore += score
    group.memberCount += 1
    group.explicitTierCount += participant.hasTier ? 1 : 0
  }

  return { grouped, set }
}

const applySeparateTeamConflicts = (
  groups: Map<string, TeamGroup>,
  separateTeamPairs: ConstraintPair[],
  set: DisjointSet,
) => {
  const errors: string[] = []

  for (const pair of separateTeamPairs) {
    const leftGroupId = set.find(pair.left)
    const rightGroupId = set.find(pair.right)

    if (leftGroupId === rightGroupId) {
      errors.push(
        `조건 충돌이 있어요. "${pair.sourceLine}"은 같은 팀으로 묶인 참가자를 다른 팀으로도 지정하고 있어요.`,
      )
      continue
    }

    groups.get(leftGroupId)?.conflicts.add(rightGroupId)
    groups.get(rightGroupId)?.conflicts.add(leftGroupId)
  }

  return errors
}

export const prepareGeneration = ({
  gameId,
  participantsText,
  sameTeamText,
  separateTeamText,
  teamCount,
}: {
  gameId: GameId
  participantsText: string
  sameTeamText: string
  separateTeamText: string
  teamCount: number
}): { data: PreparedGeneration | null; errors: string[] } => {
  const errors: string[] = []
  const game = getGameDefinition(gameId)

  if (!participantsText.trim()) {
    errors.push('참가자 목록을 먼저 입력해 주세요.')
  }

  if (!Number.isInteger(teamCount) || teamCount < 2) {
    errors.push('팀 개수는 2 이상의 정수여야 해요.')
  }

  const parsedParticipants = parseParticipants(gameId, participantsText)
  errors.push(...parsedParticipants.errors)

  const participants = parsedParticipants.participants

  if (participants.length && teamCount > participants.length) {
    errors.push('팀 개수가 참가자 수보다 많아요. 팀 개수를 줄여 주세요.')
  }

  const sameTeamParsed = parseConstraintPairs(
    sameTeamText,
    participants,
    '같은 팀 조건',
    'same',
  )
  const separateTeamParsed = parseConstraintPairs(
    separateTeamText,
    participants,
    '다른 팀 조건',
    'separate',
  )

  errors.push(...sameTeamParsed.errors, ...separateTeamParsed.errors)

  if (errors.length > 0) {
    return { data: null, errors }
  }

  const { grouped, set } = createGroups(
    participants,
    sameTeamParsed.pairs,
    game.defaultScore,
  )

  errors.push(
    ...applySeparateTeamConflicts(grouped, separateTeamParsed.pairs, set),
  )

  const groups = [...grouped.values()].sort((left, right) => {
    if (right.conflicts.size !== left.conflicts.size) {
      return right.conflicts.size - left.conflicts.size
    }

    if (right.memberCount !== left.memberCount) {
      return right.memberCount - left.memberCount
    }

    return right.totalScore - left.totalScore
  })

  if (groups.length < teamCount) {
    errors.push('같은 팀으로 묶인 그룹 수가 팀 개수보다 적어서 배정할 수 없어요.')
  }

  if (errors.length > 0) {
    return { data: null, errors }
  }

  const defaultTierCount = participants.filter((participant) => !participant.hasTier).length
  const warnings =
    defaultTierCount > 0
      ? [
          `${defaultTierCount}명의 참가자는 티어가 없어 ${game.defaultScore}점 기본값으로 계산했어요.`,
        ]
      : []

  return {
    data: {
      game,
      participants,
      sameTeamPairs: sameTeamParsed.pairs,
      separateTeamPairs: separateTeamParsed.pairs,
      groups,
      teamCount,
      warnings,
    },
    errors: [],
  }
}
