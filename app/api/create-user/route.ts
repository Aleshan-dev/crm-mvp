import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role, client_id } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'email, password e full_name são obrigatórios' }, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SERVICE_ROLE_KEY não configurada' }, { status: 500 })
    }

    // Create user via Supabase Admin API (requires service role key)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      }),
    })

    const createData = await createRes.json()

    if (!createRes.ok) {
      return NextResponse.json({ error: createData.message || createData.msg || 'Erro ao criar usuário' }, { status: 400 })
    }

    const userId = createData.id

    // Update profile with role and client
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    await adminSupabase.from('user_profiles').upsert({
      id: userId,
      email,
      full_name,
      role: role || 'cliente_visualizacao',
      client_id: client_id || null,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, id: userId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
