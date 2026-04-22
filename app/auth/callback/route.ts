import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Redirect to a client-side page that handles the session exchange
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    // Pass code to client-side handler
    return NextResponse.redirect(`${origin}/auth/confirm?code=${code}`)
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
