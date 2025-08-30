'use client'

import { useState, useRef, useEffect } from 'react'

interface EditableFieldProps {
  value: any
  onSave: (newValue: any) => Promise<void>
  fieldType?: 'text' | 'number' | 'textarea'
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function EditableField({ 
  value, 
  onSave, 
  fieldType = 'text', 
  placeholder = 'Click to edit',
  className = '',
  disabled = false
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleEdit = () => {
    if (disabled) return
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    try {
      const parsedValue = fieldType === 'number' ? parseFloat(editValue) || 0 : editValue
      await onSave(parsedValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
      setEditValue(value) // Reset on error
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleBlur = () => {
    handleSave()
  }

  const formatDisplayValue = (val: any) => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') return val.toString()
    if (typeof val === 'string') return val
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    return JSON.stringify(val)
  }

  if (isEditing) {
    const isNumberField = fieldType === 'number'
    
    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          type={fieldType === 'number' ? 'number' : 'text'}
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full bg-transparent border-none outline-none m-0 ${className}`}
          style={{
            width: isNumberField ? '120px' : '100%',
            minWidth: isNumberField ? '120px' : '100%',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid hsl(var(--primary) / 0.3)',
            backgroundColor: 'hsl(var(--card) / 0.8)',
            boxSizing: 'border-box',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            overflowWrap: 'break-word'
          }}
        />
      </div>
    )
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors break-words ${className}`}
      onClick={handleEdit}
      style={{ 
        display: 'inline-block', 
        width: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        overflowWrap: 'break-word'
      }}
    >
      {formatDisplayValue(value)}
    </span>
  )
}
