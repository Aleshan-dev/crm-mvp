import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bvjykuhwfgcskwdnvmkf.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2anlrdWh3Zmdjc2t3ZG52bWtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcwNzA1NSwiZXhwIjoyMDkyMjgzMDU1fQ.Hx7wRenzhtJC-8vcJhIvYXU-AMyXfawg-u7uHGvj490'

export async function POST(request: NextRequest) {
  try {
    const { taskId, title, description, dueDate, priority, module, responsibleUserId } = await request.json()

    if (!dueDate) return NextResponse.json({ error: 'no_due_date', skipped: true }, { status: 200 })
    if (!responsibleUserId) return NextResponse.json({ error: 'no_responsible', skipped: true }, { status: 200 })

    // Use service role to fetch the responsible user's Google token
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: tokenRow, error: tokenErr } = await adminSupabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', responsibleUserId)
      .single()

    if (tokenErr || !tokenRow) {
      return NextResponse.json({
        error: 'no_google_token',
        message: 'O responsável ainda não conectou o Google Calendar. Peça que ele faça login com Google no Polis OS.',
        skipped: true,
      }, { status: 200 })
    }

    let accessToken = tokenRow.access_token

    // Refresh token if expired
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
      if (tokenRow.refresh_token) {
        try {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: tokenRow.refresh_token,
              grant_type: 'refresh_token',
            }),
          })
          const refreshData = await refreshRes.json()
          if (refreshData.access_token) {
            accessToken = refreshData.access_token
            // Update stored token
            await adminSupabase.from('user_google_tokens').update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
            }).eq('user_id', responsibleUserId)
          }
        } catch (e) {
          console.warn('Token refresh failed:', e)
        }
      }
    }

    // Build event
    const priorityEmoji: Record<string, string> = { critica: '🔴', alta: '🟡', media: '🔵', baixa: '⚪' }
    const colorId: Record<string, string> = { critica: '11', alta: '5', media: '9', baixa: '8' }

    const event = {
      summary: `${priorityEmoji[priority] || '📌'} [Polis OS] ${title}`,
      description: [
        description ? `${description}\n` : '',
        `Módulo: ${module?.toUpperCase() || 'GERAL'}`,
        `Prioridade: ${priority?.toUpperCase()}`,
        `\nVer no Polis OS: https://project-5s2kg.vercel.app/dashboard/tarefas`,
        `ID: ${taskId}`,
      ].filter(Boolean).join('\n'),
      start: { date: dueDate },
      end: { date: dueDate },
      colorId: colorId[priority] || '8',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    }

    // Create event in responsible user's Google Calendar
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!calRes.ok) {
      const calErr = await calRes.json()
      console.error('GCal error:', calErr)
      return NextResponse.json({ error: calErr.error?.message || 'Erro no Google Calendar' }, { status: 400 })
    }

    const calEvent = await calRes.json()
    return NextResponse.json({ success: true, eventId: calEvent.id, eventLink: calEvent.htmlLink })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('calendar-sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
