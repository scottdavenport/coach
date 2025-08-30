import { ChevronRight, Upload, Camera, Monitor } from 'lucide-react'

interface FileUploadMenuProps {
  onClose: () => void
  onFileSelect: () => void
}

export function FileUploadMenu({ onClose, onFileSelect }: FileUploadMenuProps) {
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-card border border-line rounded-xl shadow-card2 p-2 min-w-[200px]">
      <div className="space-y-1">
        <button
          onClick={onFileSelect}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Upload className="h-4 w-4 text-muted" />
            <span>Upload File</span>
          </div>
        </button>
        
        <button
          onClick={onFileSelect}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Camera className="h-4 w-4 text-muted" />
            <span>Upload Photo</span>
          </div>
        </button>
        
        <button
          onClick={onFileSelect}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Monitor className="h-4 w-4 text-muted" />
            <span>Take Screenshot</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>
        
        <button
          onClick={onFileSelect}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-card2 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Camera className="h-4 w-4 text-muted" />
            <span>Take Photo</span>
          </div>
        </button>
      </div>
    </div>
  )
}
