import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Oura OAuth configuration
    const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID
    const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET
    const OURA_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/oura/callback`
      : 'http://localhost:3000/auth/oura/callback'

    if (!OURA_CLIENT_ID || !OURA_CLIENT_SECRET) {
      console.error('Oura OAuth credentials not configured')
      return NextResponse.json(
        { error: 'Oura integration not configured' },
        { status: 500 }
      )
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://cloud.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OURA_CLIENT_ID,
        client_secret: OURA_CLIENT_SECRET,
        code: code,
        redirect_uri: OURA_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Oura token exchange failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens' },
        { status: 400 }
      )
    }

    const tokens = await tokenResponse.json()

    // Return the tokens to the client
    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
    })

  } catch (error) {
    console.error('Oura token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
