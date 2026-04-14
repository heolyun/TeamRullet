import { useDeferredValue, useEffect, useState, useTransition } from 'react'
import { SectionCard } from './components/SectionCard'
import { TeamResultCard } from './components/TeamResultCard'
import type { GameId, GenerationResult } from './types/team'
import { GAME_DEFINITIONS } from './utils/gameData'
import { getParticipantPreview } from './utils/parser'
import { generateTeams } from './utils/teamGenerator'
import { prepareGeneration } from './utils/validator'
import './App.css'

type FormState = {
  gameId: GameId
  participantsText: string
  teamCount: string
  sameTeamText: string
  separateTeamText: string
}

const STORAGE_KEY = 'teamrullet-form-v1'

const DEFAULT_FORM: FormState = {
  gameId: 'league',
  participantsText: '',
  teamCount: '2',
  sameTeamText: '',
  separateTeamText: '',
}

const SAMPLE_FORMS: Record<GameId, Omit<FormState, 'gameId'>> = {
  league: {
    participantsText: '당당-D1, 영광-B1, 정화, 영재-E1, 민수-플2, 태오(골3)',
    teamCount: '2',
    sameTeamText: '당당-영광',
    separateTeamText: '당당-정화-영재',
  },
  valorant: {
    participantsText: '제트-D2, 레이나-불1, 소바, 세이지-플3, 브리치(초1), 바이퍼-골2',
    teamCount: '2',
    sameTeamText: '제트-소바',
    separateTeamText: '레이나-세이지-브리치',
  },
  pubg: {
    participantsText: '당당-D2, 영광-골1, 정화, 영재-크1, 민수-브2, 태오(마스터)',
    teamCount: '3',
    sameTeamText: '당당-영광',
    separateTeamText: '당당-정화-태오',
  },
}

const loadStoredForm = (): FormState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return DEFAULT_FORM
    }

    const parsed = JSON.parse(raw) as Partial<FormState>

    if (
      parsed.gameId === 'league' ||
      parsed.gameId === 'valorant' ||
      parsed.gameId === 'pubg'
    ) {
      return {
        gameId: parsed.gameId,
        participantsText: parsed.participantsText ?? '',
        teamCount: parsed.teamCount ?? '2',
        sameTeamText: parsed.sameTeamText ?? '',
        separateTeamText: parsed.separateTeamText ?? '',
      }
    }
  } catch {
    return DEFAULT_FORM
  }

  return DEFAULT_FORM
}

const formatResultForCopy = (result: GenerationResult) => {
  const lines: string[] = ['[팀 편성 결과]', '']

  for (const team of result.teams) {
    const names = team.members.map((member) => member.nickname).join(', ')
    lines.push(`${team.id}팀: ${names}`)
  }

  return lines.join('\n').trim()
}

function App() {
  const [form, setForm] = useState<FormState>(loadStoredForm)
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const deferredParticipants = useDeferredValue(form.participantsText)
  const participantPreview = getParticipantPreview(form.gameId, deferredParticipants)
  const previewNames = participantPreview.slice(0, 8)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleGenerate = () => {
    setCopied(false)

    startTransition(() => {
      const prepared = prepareGeneration({
        gameId: form.gameId,
        participantsText: form.participantsText,
        sameTeamText: form.sameTeamText,
        separateTeamText: form.separateTeamText,
        teamCount: Number(form.teamCount),
      })

      if (!prepared.data) {
        setErrors(prepared.errors)
        setResult(null)
        return
      }

      try {
        const nextResult = generateTeams(prepared.data)
        setErrors([])
        setResult(nextResult)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '팀 생성 중 문제가 발생했어요.'

        setErrors([message])
        setResult(null)
      }
    })
  }

  const handleLoadExample = () => {
    setCopied(false)
    setErrors([])
    setResult(null)
    setForm((current) => ({
      gameId: current.gameId,
      ...SAMPLE_FORMS[current.gameId],
    }))
  }

  const handleReset = () => {
    setCopied(false)
    setErrors([])
    setResult(null)
    setForm(DEFAULT_FORM)
  }

  const handleCopy = async () => {
    if (!result) {
      return
    }

    try {
      await navigator.clipboard.writeText(formatResultForCopy(result))
      setCopied(true)
    } catch {
      setErrors(['클립보드 복사에 실패했어요. 브라우저 권한을 확인해 주세요.'])
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <p className="page-header__eyebrow">TeamRullet</p>
        <h1>팀 뽑기 프로그램</h1>
      </header>

      <main className="main-layout">
        <SectionCard title="안내" className="section-card--guide">
          <div className="guide-stack">
            <article className="guide-block">
              <h3>참가자 입력</h3>
              <p>쉼표 또는 줄바꿈으로 입력할 수 있어요.</p>
              <div className="guide-code">당당, 밀도, 희건</div>
              <div className="guide-code">당당-M4, 밀도-GM7, 희건-아이언3</div>
            </article>

            <article className="guide-block">
              <h3>조건 입력</h3>
              <p>한 줄에 여러 명을 넣을 수 있어요.</p>
              <div className="guide-code">같은 팀: 당당-정화</div>
              <div className="guide-code">다른 팀: 당당-희건</div>
            </article>

            <article className="guide-block">
              <h3>현재 상태</h3>
              <p>
                {participantPreview.length > 0
                  ? `입력된 참가자 ${participantPreview.length}명`
                  : '아직 참가자가 입력되지 않았어요.'}
              </p>
              <div className="guide-game-list">
                {GAME_DEFINITIONS.map((game) => (
                  <span
                    key={game.id}
                    className={`guide-game-chip ${form.gameId === game.id ? 'guide-game-chip--active' : ''}`}
                  >
                    {game.label}
                  </span>
                ))}
              </div>
              {previewNames.length > 0 ? (
                <div className="guide-preview-list">
                  {previewNames.map((participant) => (
                    <span key={`${participant.nickname}-${participant.tierLabel ?? 'default'}`}>
                      {participant.nickname}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          </div>
        </SectionCard>

        <SectionCard title="입력" className="section-card--input">
          <div className="input-stack">
            <div className="game-grid">
              {GAME_DEFINITIONS.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className={`game-card ${form.gameId === game.id ? 'game-card--active' : ''}`}
                  onClick={() => updateField('gameId', game.id)}
                >
                  {game.label}
                </button>
              ))}
            </div>

            <div className="field-grid">
              <label className="field field--wide">
                <span>참가자 목록</span>
                <textarea
                  rows={5}
                  value={form.participantsText}
                  onChange={(event) => updateField('participantsText', event.target.value)}
                  placeholder="당당, 밀도, 희건"
                />
                <small>쉼표(,) 또는 줄바꿈 구분 가능</small>
              </label>

              <label className="field field--compact">
                <span>팀 개수</span>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={form.teamCount}
                  onChange={(event) => updateField('teamCount', event.target.value)}
                  placeholder="2"
                />
              </label>

              <label className="field field--wide">
                <span>같은 팀 조건</span>
                <textarea
                  rows={2}
                  value={form.sameTeamText}
                  onChange={(event) => updateField('sameTeamText', event.target.value)}
                  placeholder="당당-정화"
                />
              </label>

              <label className="field field--wide">
                <span>다른 팀 조건</span>
                <textarea
                  rows={2}
                  value={form.separateTeamText}
                  onChange={(event) => updateField('separateTeamText', event.target.value)}
                  placeholder="당당-희건"
                />
              </label>
            </div>

            <div className="panel-actions">
              <button className="button button--ghost" onClick={handleLoadExample}>
                예시 채우기
              </button>
              <button className="button button--secondary" onClick={handleReset}>
                초기화
              </button>
              <button className="button button--primary" onClick={handleGenerate}>
                {isPending ? '팀 생성 중...' : '팀 생성하기'}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="결과" className="section-card--result">
          {errors.length > 0 ? (
            <div className="message-box message-box--error">
              <strong>입력 확인이 필요해요.</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result ? (
            <>
              <div className="result-toolbar">
                <div className="result-summary">
                  <span className="summary-pill">참가자 {result.summary.participantCount}명</span>
                  <span className="summary-pill">점수 차 {result.summary.scoreGap}</span>
                  <span className="summary-pill">인원 차 {result.summary.sizeGap}</span>
                </div>

                <button className="button button--primary" onClick={handleCopy}>
                  {copied ? '복사 완료' : '결과 복사'}
                </button>
              </div>

              {result.warnings.length > 0 ? (
                <div className="message-box message-box--info">
                  <strong>참고</strong>
                  <ul>
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="team-grid">
                {result.teams.map((team) => (
                  <TeamResultCard key={team.id} team={team} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>아직 생성된 팀이 없어요.</strong>
              <p>입력에서 값을 채운 뒤 팀 생성하기를 눌러 주세요.</p>
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  )
}

export default App
