import { memo, useCallback } from 'react';

interface OptimizedInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder: string;
  disabled: boolean;
  hasFiles: boolean;
}

// Completely isolated input component to prevent re-renders from file state
export const OptimizedInput = memo(function OptimizedInput({ 
  value, 
  onChange, 
  onKeyPress, 
  placeholder, 
  disabled,
  hasFiles 
}: OptimizedInputProps) {
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const start = performance.now()
    onChange(e.target.value)
    const end = performance.now()
    
    if (end - start > 10) {
      console.warn('🐌 SLOW ISOLATED INPUT:', end - start + 'ms', {
        hasFiles,
        inputLength: e.target.value.length
      })
    }
  }, [onChange, hasFiles])

  return (
    <textarea
      value={value}
      onChange={handleChange}
      onKeyPress={onKeyPress}
      placeholder={placeholder}
      className="w-full bg-card border border-line rounded-xl px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
      rows={1}
      style={{ minHeight: '44px', maxHeight: '120px' }}
      disabled={disabled}
    />
  )
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.value === nextProps.value &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.hasFiles === nextProps.hasFiles
  )
})