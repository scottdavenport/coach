import { FileText, Image, Upload } from 'lucide-react'

interface FileUploadMenuProps {
  onFileSelect: (type: 'all' | 'images' | 'documents') => void
  disabled?: boolean
}

export function FileUploadMenu({ onFileSelect, disabled = false }: FileUploadMenuProps) {
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-card border border-line rounded-xl shadow-card2 p-2 min-w-[220px]">
      <div className="space-y-1">
        <div className="px-3 py-1 text-xs font-medium text-muted border-b border-line">
          Upload Files
        </div>
        
        <button
          onClick={() => onFileSelect('all')}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <Upload className="h-4 w-4 text-muted" />
            <div className="text-left">
              <div>All File Types</div>
              <div className="text-xs text-muted">Images & Documents</div>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => onFileSelect('images')}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <Image className="h-4 w-4 text-muted" />
            <div className="text-left">
              <div>Images Only</div>
              <div className="text-xs text-muted">JPG, PNG, GIF, WebP</div>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => onFileSelect('documents')}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-4 w-4 text-muted" />
            <div className="text-left">
              <div>Documents Only</div>
              <div className="text-xs text-muted">PDF, Word, Excel, CSV, Text</div>
            </div>
          </div>
        </button>

        <div className="px-3 py-1 text-xs text-muted border-t border-line mt-1">
          <div>Max 10 files • 10MB each</div>
        </div>
      </div>
    </div>
  )
}
