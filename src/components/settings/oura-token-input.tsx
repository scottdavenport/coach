'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'

interface OuraTokenInputProps {
  onSuccess: (accessToken: string) => void
  onCancel: () => void
}

export function OuraTokenInput({ onSuccess, onCancel }: OuraTokenInputProps) {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Test the token by making a simple API call
      const response = await fetch('https://api.ouraring.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`
        }
      })

      if (!response.ok) {
        throw new Error('Invalid token or API access denied')
      }

      // Token is valid
      onSuccess(token.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-6 w-6"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Connect Oura Ring</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
          <h4 className="font-medium mb-2">Personal Access Token</h4>
          <p className="text-sm text-muted-foreground">
            This is the simpler and more reliable method to connect your Oura Ring data.
          </p>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
          <h4 className="font-medium mb-2">How to get your token:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Go to <a href="https://cloud.ouraring.com/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Oura Personal Access Tokens</a></li>
            <li>2. Click "Generate new token"</li>
            <li>3. Copy the generated token</li>
            <li>4. Paste it below</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="Paste your Oura Personal Access Token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit"
              disabled={!token.trim() || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {loading ? 'Validating...' : 'Connect Oura Ring'}
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
