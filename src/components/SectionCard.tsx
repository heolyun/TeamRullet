import type { ReactNode } from 'react'

type SectionCardProps = {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card__head">
        <p className="section-card__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? (
          <p className="section-card__description">{description}</p>
        ) : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  )
}
