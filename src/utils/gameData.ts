import type { GameDefinition, GameId, TierDefinition } from '../types/team'

type RankTemplate = {
  key: string
  label: string
  aliases: string[]
  divisions?: string[]
}

type GameTemplate = {
  id: GameId
  label: string
  shortLabel: string
  description: string
  ranks: RankTemplate[]
  samples: string[]
}

const DIVISION_ALIAS_MAP: Record<string, string[]> = {
  '1': ['1', 'I'],
  '2': ['2', 'II'],
  '3': ['3', 'III'],
  '4': ['4', 'IV'],
  '5': ['5', 'V'],
}

const cleanAlias = (value: string) =>
  value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s_\-()[\].]/g, '')

const buildTierAliases = (
  rankAliases: string[],
  rankKey: string,
  division?: string,
) => {
  const aliases = new Set<string>()

  for (const alias of rankAliases) {
    aliases.add(cleanAlias(alias))

    if (division) {
      for (const divisionAlias of DIVISION_ALIAS_MAP[division] ?? [division]) {
        aliases.add(cleanAlias(`${alias}${divisionAlias}`))
      }
    }
  }

  aliases.add(cleanAlias(rankKey))

  if (division) {
    aliases.add(cleanAlias(`${rankKey}${division}`))
  }

  return [...aliases]
}

const buildGameDefinition = (template: GameTemplate): GameDefinition => {
  const tiers: TierDefinition[] = []

  for (const rank of template.ranks) {
    if (!rank.divisions?.length) {
      tiers.push({
        key: rank.key,
        label: rank.label,
        score: tiers.length + 1,
        aliases: buildTierAliases(rank.aliases, rank.key),
      })
      continue
    }

    for (const division of rank.divisions) {
      tiers.push({
        key: `${rank.key}_${division}`,
        label: `${rank.label} ${division}`,
        score: tiers.length + 1,
        aliases: buildTierAliases(rank.aliases, rank.key, division),
      })
    }
  }

  const aliasMap = Object.fromEntries(
    tiers.flatMap((tier) => tier.aliases.map((alias) => [alias, tier])),
  )

  const middleIndex = Math.floor((tiers.length - 1) / 2)

  return {
    id: template.id,
    label: template.label,
    shortLabel: template.shortLabel,
    description: template.description,
    defaultScore: tiers[middleIndex]?.score ?? 1,
    tiers,
    aliasMap,
    samples: template.samples,
  }
}

const GAME_TEMPLATES: GameTemplate[] = [
  {
    id: 'league',
    label: '리그 오브 레전드',
    shortLabel: 'LoL',
    description: '아이언부터 챌린저까지, 세부 디비전을 포함해 팀 밸런스를 계산합니다.',
    samples: ['당당-D1', '영광(플2)', '정화', '민수-그마'],
    ranks: [
      {
        key: 'IRON',
        label: '아이언',
        aliases: ['IRON', 'I', '아이언', '아'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'BRONZE',
        label: '브론즈',
        aliases: ['BRONZE', 'B', '브론즈', '브'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'SILVER',
        label: '실버',
        aliases: ['SILVER', 'S', '실버', '실'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'GOLD',
        label: '골드',
        aliases: ['GOLD', 'G', '골드', '골'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'PLATINUM',
        label: '플래티넘',
        aliases: ['PLATINUM', 'PLAT', 'P', '플래티넘', '플'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'EMERALD',
        label: '에메랄드',
        aliases: ['EMERALD', 'E', '에메랄드', '에'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'DIAMOND',
        label: '다이아몬드',
        aliases: ['DIAMOND', 'DIA', 'D', '다이아몬드', '다이아', '다'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'MASTER',
        label: '마스터',
        aliases: ['MASTER', 'M', '마스터', '마'],
      },
      {
        key: 'GRANDMASTER',
        label: '그랜드마스터',
        aliases: ['GRANDMASTER', 'GM', '그랜드마스터', '그마'],
      },
      {
        key: 'CHALLENGER',
        label: '챌린저',
        aliases: ['CHALLENGER', 'CH', 'C', '챌린저', '챌'],
      },
    ],
  },
  {
    id: 'valorant',
    label: '발로란트',
    shortLabel: 'VAL',
    description: '아이언부터 레디언트까지 현재 랭크 체계를 기준으로 점수를 환산합니다.',
    samples: ['스카이-D2', '제트(초3)', '브리치', '소바-불1'],
    ranks: [
      {
        key: 'IRON',
        label: '아이언',
        aliases: ['IRON', 'I', '아이언', '아'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'BRONZE',
        label: '브론즈',
        aliases: ['BRONZE', 'B', '브론즈', '브'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'SILVER',
        label: '실버',
        aliases: ['SILVER', 'S', '실버', '실'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'GOLD',
        label: '골드',
        aliases: ['GOLD', 'G', '골드', '골'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'PLATINUM',
        label: '플래티넘',
        aliases: ['PLATINUM', 'PLAT', 'P', '플래티넘', '플'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'DIAMOND',
        label: '다이아몬드',
        aliases: ['DIAMOND', 'DIA', 'D', '다이아몬드', '다이아', '다'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'ASCENDANT',
        label: '초월자',
        aliases: ['ASCENDANT', 'ASC', 'A', '초월자', '초월', '초'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'IMMORTAL',
        label: '불멸',
        aliases: ['IMMORTAL', 'IMM', 'IM', '불멸', '불'],
        divisions: ['1', '2', '3'],
      },
      {
        key: 'RADIANT',
        label: '레디언트',
        aliases: ['RADIANT', 'RAD', 'R', '레디언트', '레'],
      },
    ],
  },
  {
    id: 'pubg',
    label: '배틀그라운드',
    shortLabel: 'PUBG',
    description: '배틀그라운드 랭크를 기준으로 팀 점수 균형을 맞춥니다.',
    samples: ['당당-D2', '영광(골1)', '정화', '영재-크1'],
    ranks: [
      {
        key: 'BRONZE',
        label: '브론즈',
        aliases: ['BRONZE', 'B', '브론즈', '브'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'SILVER',
        label: '실버',
        aliases: ['SILVER', 'S', '실버', '실'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'GOLD',
        label: '골드',
        aliases: ['GOLD', 'G', '골드', '골'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'PLATINUM',
        label: '플래티넘',
        aliases: ['PLATINUM', 'PLAT', 'P', '플래티넘', '플'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'CRYSTAL',
        label: '크리스탈',
        aliases: ['CRYSTAL', 'CRY', 'C', '크리스탈', '크'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'DIAMOND',
        label: '다이아몬드',
        aliases: ['DIAMOND', 'DIA', 'D', '다이아몬드', '다이아', '다'],
        divisions: ['4', '3', '2', '1'],
      },
      {
        key: 'MASTER',
        label: '마스터',
        aliases: ['MASTER', 'M', '마스터', '마'],
      },
      { key: 'SURVIVOR', label: '서바이버', aliases: ['SURVIVOR', 'SUR', '서바이버', '탑500', 'TOP500'] },
    ],
  },
]

export const GAME_DEFINITIONS = GAME_TEMPLATES.map(buildGameDefinition)

export const GAME_MAP = Object.fromEntries(
  GAME_DEFINITIONS.map((game) => [game.id, game]),
) as Record<GameId, GameDefinition>
