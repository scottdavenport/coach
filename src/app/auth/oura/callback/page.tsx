'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function OuraCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('/api/oura/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to exchange code for tokens')
        }

        const tokens = await tokenResponse.json()

        // Store tokens in localStorage for the parent window to access
        localStorage.setItem('oura_tokens', JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        }))

        setStatus('success')

        // Close the popup after a short delay
        setTimeout(() => {
          window.close()
        }, 2000)

      } catch (err) {
        console.error('Oura callback error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setStatus('error')
      }
    }

    handleCallback()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-lg font-semibold mb-2">Connecting to Oura</h2>
          <p className="text-sm text-muted-foreground">
            Completing authorization...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Successfully Connected!</h2>
          <p className="text-sm text-muted-foreground">
            Your Oura Ring is now connected. This window will close automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Connection Failed</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error || 'Failed to connect to Oura Ring'}
        </p>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
        >
          Close Window
        </button>
      </div>
    </div>
  )
}
