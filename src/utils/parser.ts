import type { ConstraintPair, GameId, Participant } from '../types/team'
import { normalizeTier } from './tierNormalizer'

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

const splitParticipantEntries = (value: string) =>
  value
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

const splitConstraintMembers = (value: string) =>
  value
    .split(/\s*[-/,>]\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean)

const makeParticipantId = (nickname: string) =>
  nickname.trim().normalize('NFKC').toLowerCase()

const parseParticipantLine = (line: string) => {
  const parenthesisMatch = line.match(/^(.*?)\((.*?)\)\s*$/)

  if (parenthesisMatch) {
    return {
      nickname: parenthesisMatch[1].trim(),
      rawTier: parenthesisMatch[2].trim(),
    }
  }

  const dashIndex = line.lastIndexOf('-')

  if (dashIndex > 0) {
    return {
      nickname: line.slice(0, dashIndex).trim(),
      rawTier: line.slice(dashIndex + 1).trim(),
    }
  }

  return {
    nickname: line.trim(),
    rawTier: null,
  }
}

export const parseParticipants = (
  gameId: GameId,
  input: string,
): { participants: Participant[]; errors: string[] } => {
  const participants: Participant[] = []
  const errors: string[] = []
  const seenNicknames = new Map<string, number>()

  splitParticipantEntries(input).forEach((entry, index) => {
    const itemNumber = index + 1
    const parsed = parseParticipantLine(entry)
    const nickname = parsed.nickname.trim()

    if (!nickname) {
      errors.push(`${itemNumber}번째 참가자 항목에서 닉네임을 확인할 수 없어요.`)
      return
    }

    let tier = null

    if (parsed.rawTier) {
      tier = normalizeTier(gameId, parsed.rawTier)

      if (!tier) {
        errors.push(
          `${itemNumber}번째 참가자 "${nickname}"의 티어 "${parsed.rawTier}"는 선택한 게임에서 지원하지 않아요.`,
        )
        return
      }
    }

    const participantId = makeParticipantId(nickname)

    if (seenNicknames.has(participantId)) {
      const firstItem = seenNicknames.get(participantId)
      errors.push(
        `"${nickname}" 닉네임이 중복되었어요. ${firstItem}번째 항목과 ${itemNumber}번째 항목을 확인해 주세요.`,
      )
      return
    }

    seenNicknames.set(participantId, itemNumber)

    participants.push({
      id: participantId,
      nickname,
      sourceLine: entry,
      rawTier: parsed.rawTier,
      tierKey: tier?.key ?? null,
      tierLabel: tier?.label ?? null,
      score: tier?.score ?? 0,
      hasTier: Boolean(tier),
    })
  })

  return { participants, errors }
}

const buildPairsFromMembers = (
  members: string[],
  sourceLine: string,
) => {
  const pairs: ConstraintPair[] = []

  for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
      pairs.push({
        left: members[leftIndex],
        right: members[rightIndex],
        sourceLine,
      })
    }
  }

  return pairs
}

export const parseConstraintPairs = (
  input: string,
  knownParticipants: Participant[],
  label: string,
  _mode?: 'same' | 'separate',
): { pairs: ConstraintPair[]; errors: string[] } => {
  void _mode

  const participantMap = new Map(
    knownParticipants.map((participant) => [participant.id, participant.nickname]),
  )

  const pairs: ConstraintPair[] = []
  const errors: string[] = []

  splitLines(input).forEach((line, index) => {
    const lineNumber = index + 1
    const names = splitConstraintMembers(line)

    if (names.length < 2) {
      errors.push(
        `${label} ${lineNumber}번째 줄은 "닉네임-닉네임" 형식으로 최소 2명 이상 입력해 주세요.`,
      )
      return
    }

    const memberIds = names.map(makeParticipantId)
    const uniqueIds = new Set(memberIds)

    if (uniqueIds.size !== memberIds.length) {
      errors.push(`${label} ${lineNumber}번째 줄에는 같은 닉네임을 중복해서 넣을 수 없어요.`)
      return
    }

    const missing = memberIds.find((id) => !participantMap.has(id))

    if (missing) {
      errors.push(
        `${label} ${lineNumber}번째 줄은 참가자 목록에 없는 닉네임을 참조하고 있어요.`,
      )
      return
    }

    pairs.push(...buildPairsFromMembers(memberIds, line))
  })

  return { pairs, errors }
}

export const getParticipantPreview = (gameId: GameId, input: string) => {
  const { participants } = parseParticipants(gameId, input)

  return participants.map((participant) => ({
    nickname: participant.nickname,
    tierLabel: participant.tierLabel,
  }))
}
