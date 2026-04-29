import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bvjykuhwfgcskwdnvmkf.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2anlrdWh3Zmdjc2t3ZG52bWtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcwNzA1NSwiZXhwIjoyMDkyMjgzMDU1fQ.Hx7wRenzhtJC-8vcJhIvYXU-AMyXfawg-u7uHGvj490'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role, client_id } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'email, password e full_name são obrigatórios' },
        { status: 400 }
      )
    }

    // Create admin client with service role
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create user via Admin API
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || 'cliente_visualizacao' },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const userId = newUser.user.id

    // Update user_profiles with correct role and client
    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        full_name,
        role: role || 'cliente_visualizacao',
        client_id: client_id || null,
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't fail - user was created, profile will be updated
    }

    return NextResponse.json({ success: true, id: userId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('create-user error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
