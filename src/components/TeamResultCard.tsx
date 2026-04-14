import type { TeamAssignment } from '../types/team'

type TeamResultCardProps = {
  team: TeamAssignment
}

export function TeamResultCard({ team }: TeamResultCardProps) {
  return (
    <article className="team-card">
      <div className="team-card__header">
        <div>
          <p className="team-card__label">{team.id}팀</p>
          <strong>{team.memberCount}명 배정</strong>
        </div>
        <div className="team-card__score">
          <span>총점</span>
          <strong>{team.totalScore}</strong>
        </div>
      </div>

      <ul className="team-card__members">
        {team.members.map((member) => (
          <li key={member.id} className="member-row">
            <div>
              <strong>{member.nickname}</strong>
              <p>{member.hasTier ? member.tierLabel : '기본 점수 적용'}</p>
            </div>
            <span>{member.score}점</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
