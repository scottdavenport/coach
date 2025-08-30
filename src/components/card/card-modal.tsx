'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'

interface CardModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  headerContent?: React.ReactNode
}

export function CardModal({ isOpen, onClose, children, title, headerContent }: CardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity duration-320 ease-out"
        style={{
          animation: isOpen ? 'fadeIn 320ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full max-w-4xl h-full bg-card/95 backdrop-blur-md border-l border-line/40
          transform transition-transform duration-320 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          animation: isOpen ? 'slideIn 320ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line/40">
          <h2 className="text-xl font-semibold text-text">
            {title || 'Daily Card'}
          </h2>
          
          <div className="flex items-center gap-4">
            {headerContent}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body)
}
