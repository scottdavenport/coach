import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardCardProps {
  icon: string
  title: string
  children: ReactNode
  className?: string
  variant?: 'default' | 'warning'
}

export function DashboardCard({ 
  icon, 
  title, 
  children, 
  className = '',
  variant = 'default'
}: DashboardCardProps) {
  const variantClasses = {
    default: 'bg-card/40 backdrop-blur-sm border border-line/40',
    warning: 'bg-card/40 backdrop-blur-sm border border-yellow-500/30'
  }

  const titleClasses = {
    default: 'text-xl font-semibold',
    warning: 'text-xl font-semibold text-yellow-400'
  }

  return (
    <Card className={`${variantClasses[variant]} overflow-hidden ${className}`}>
      <CardHeader className="pb-6">
        <CardTitle className={`flex items-center gap-3 ${titleClasses[variant]}`}>
          <span className="text-2xl">{icon}</span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
