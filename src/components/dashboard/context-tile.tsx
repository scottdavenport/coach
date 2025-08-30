'use client'

import { EditableField } from './editable-field'

interface ContextTileProps {
  label: string
  value: any
  onSave: (value: any) => Promise<void>
  fieldType?: 'text' | 'number'
  placeholder?: string
  source: string
  confidence: number
  className?: string
  size?: 'small' | 'medium' | 'large'
  span?: 1 | 2 | 3
}

export function ContextTile({
  label,
  value,
  onSave,
  fieldType = 'text',
  placeholder = 'Click to edit',
  source,
  confidence,
  className = '',
  size = 'medium',
  span = 1
}: ContextTileProps) {
  const sizeClasses = {
    small: 'min-h-[120px] p-4',
    medium: 'min-h-[140px] p-6',
    large: 'min-h-[160px] p-6'
  }

  const valueSizeClasses = {
    small: 'text-lg font-bold',
    medium: 'text-xl font-bold',
    large: 'text-2xl font-bold'
  }

  const textSizeClasses = {
    small: 'text-sm leading-relaxed',
    medium: 'text-base leading-relaxed',
    large: 'text-lg leading-relaxed'
  }

  const labelSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }

  const spanClasses = {
    1: '',
    2: 'md:col-span-2',
    3: 'md:col-span-2 xl:col-span-3'
  }

  const getSourceBadge = (source: string) => {
    const badges = {
      explicit: 'bg-blue-500/20 text-blue-400',
      inferred: 'bg-yellow-500/20 text-yellow-400',
      asked: 'bg-green-500/20 text-green-400'
    }
    return badges[source as keyof typeof badges] || 'bg-gray-500/20 text-gray-400'
  }

  const isNumber = fieldType === 'number'

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
      <div className="flex items-start justify-between mb-4 gap-3">
        <h4 className={`
          font-medium text-foreground capitalize leading-tight break-words flex-1
          ${labelSizeClasses[size]}
        `}>
          {label.replace(/_/g, ' ')}
        </h4>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${getSourceBadge(source)}`}>
            {source}
          </span>
          <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex items-start min-h-[2.5rem] w-full">
        <EditableField
          value={value}
          onSave={onSave}
          fieldType={fieldType}
          placeholder={placeholder}
          className={`
            ${isNumber ? valueSizeClasses[size] : textSizeClasses[size]} 
            text-foreground break-words w-full
          `}
        />
      </div>
    </div>
  )
}
