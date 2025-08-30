interface SectionHeaderProps {
  icon: string
  title: string
  className?: string
}

export function SectionHeader({ icon, title, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3 pb-4 border-b border-line/30 ${className}`}>
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <h3 className="text-lg font-semibold text-foreground capitalize">{title}</h3>
    </div>
  )
}
