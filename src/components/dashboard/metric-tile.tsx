'use client'

import { EditableField } from './editable-field'

interface MetricTileProps {
  label: string
  value: any
  onSave: (value: any) => Promise<void>
  fieldType?: 'text' | 'number'
  placeholder?: string
  icon?: string
  unit?: string
  className?: string
  size?: 'small' | 'medium' | 'large'
  span?: 1 | 2 | 3
}

export function MetricTile({
  label,
  value,
  onSave,
  fieldType = 'text',
  placeholder = 'Click to edit',
  icon,
  unit,
  className = '',
  size = 'medium',
  span = 1
}: MetricTileProps) {
  const sizeClasses = {
    small: 'min-h-[100px] p-4',
    medium: 'min-h-[120px] p-6',
    large: 'min-h-[140px] p-6'
  }

  const valueSizeClasses = {
    small: 'text-xl font-bold',
    medium: 'text-2xl font-bold',
    large: 'text-3xl font-bold'
  }

  const labelSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-sm'
  }

  const spanClasses = {
    1: '',
    2: 'md:col-span-2',
    3: 'md:col-span-2 xl:col-span-3'
  }

  return (
    <div 
      className={`
        bg-background/30 backdrop-blur-sm border border-line/30 rounded-xl 
        hover:bg-background/40 transition-colors flex flex-col
        ${sizeClasses[size]}
        ${spanClasses[span]}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`
          font-medium text-muted-foreground uppercase tracking-wide
          ${labelSizeClasses[size]}
        `}>
          {label}
        </span>
        {icon && (
          <span className="text-lg flex-shrink-0">{icon}</span>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mt-auto">
        <EditableField
          value={value}
          onSave={onSave}
          fieldType={fieldType}
          placeholder={placeholder}
          className={`${valueSizeClasses[size]} text-foreground`}
        />
        {unit && (
          <span className={`text-muted-foreground font-medium ${labelSizeClasses[size]}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
