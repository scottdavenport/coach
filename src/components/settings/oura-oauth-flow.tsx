'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft
} from 'lucide-react'

interface OuraOAuthFlowProps {
  onSuccess: (accessToken: string, refreshToken: string) => void
  onCancel: () => void
}

export function OuraOAuthFlow({ onSuccess, onCancel }: OuraOAuthFlowProps) {
  const [step, setStep] = useState<'init' | 'authorizing' | 'success' | 'error'>('init')
  const [error, setError] = useState<string | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)

  // Oura OAuth configuration
  const OURA_CLIENT_ID = process.env.NEXT_PUBLIC_OURA_CLIENT_ID
  const OURA_REDIRECT_URI = 'http://localhost:3000/auth/oura/callback'

  useEffect(() => {
    // Generate OAuth URL
    if (OURA_CLIENT_ID) {
      const url = new URL('https://cloud.ouraring.com/oauth/authorize')
      url.searchParams.set('client_id', OURA_CLIENT_ID)
      url.searchParams.set('redirect_uri', OURA_REDIRECT_URI)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'personal')
      url.searchParams.set('state', generateState())
      
      console.log('Generated OAuth URL:', url.toString())
      setAuthUrl(url.toString())
    } else {
      setError('Oura client ID not configured')
    }
  }, [])

  const generateState = () => {
    // Generate a random state parameter for security
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleAuthorize = () => {
    if (authUrl) {
      setStep('authorizing')
      // Open Oura authorization in a popup window
      const popup = window.open(
        authUrl,
        'oura-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for the callback
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          // Check if we have the tokens in localStorage (set by callback page)
          const tokens = localStorage.getItem('oura_tokens')
          if (tokens) {
            try {
              const { access_token, refresh_token } = JSON.parse(tokens)
              localStorage.removeItem('oura_tokens') // Clean up
              setStep('success')
              setTimeout(() => {
                onSuccess(access_token, refresh_token)
              }, 1000)
            } catch {
              setError('Failed to parse Oura tokens')
              setStep('error')
            }
          } else {
            setError('Authorization was cancelled or failed')
            setStep('error')
          }
        }
      }, 1000)
    }
  }

  const handleRetry = () => {
    setStep('init')
    setError(null)
  }

  if (step === 'authorizing') {
    return (
      <div className="text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Connecting to Oura</h3>
        <p className="text-sm text-muted-foreground">
          Please complete the authorization in the popup window...
        </p>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="text-center p-8">
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Successfully Connected!</h3>
        <p className="text-sm text-muted-foreground">
          Your Oura Ring is now connected. Redirecting...
        </p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="text-center p-8">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error || 'Failed to connect to Oura Ring'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRetry} size="sm">
            Try Again
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    )
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
          <h4 className="font-medium mb-2">What we'll access:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Sleep data (duration, quality, stages)</li>
            <li>• Activity data (steps, calories, heart rate)</li>
            <li>• Readiness scores</li>
            <li>• Heart rate variability</li>
          </ul>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Click "Connect" to open Oura's authorization page</li>
            <li>2. Log in to your Oura account and grant permission</li>
            <li>3. We'll automatically sync your health data</li>
            <li>4. Your data will appear in your daily cards</li>
          </ol>
        </div>

        {!OURA_CLIENT_ID && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">
              Oura integration is not configured. Please add NEXT_PUBLIC_OURA_CLIENT_ID to your environment variables.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleAuthorize}
            disabled={!authUrl || !OURA_CLIENT_ID}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Connect Oura Ring
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
