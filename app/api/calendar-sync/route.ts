import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )

    // Get current session (includes Google access token if logged in with Google)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const providerToken = session.provider_token
    if (!providerToken) {
      return NextResponse.json({
        error: 'Token do Google não disponível. Faça login com Google para sincronizar o calendário.',
        needsGoogleLogin: true
      }, { status: 403 })
    }

    const { taskId, title, description, dueDate, priority, module } = await request.json()

    if (!dueDate) {
      return NextResponse.json({ error: 'Tarefa sem prazo definido' }, { status: 400 })
    }

    // Build Google Calendar event
    const priorityEmoji: Record<string, string> = { critica: '🔴', alta: '🟡', media: '🔵', baixa: '⚪' }
    const emoji = priorityEmoji[priority] || '📌'

    const startDate = new Date(dueDate + 'T09:00:00')
    const endDate = new Date(dueDate + 'T10:00:00')

    const event = {
      summary: `${emoji} [Polis OS] ${title}`,
      description: [
        description ? `📋 ${description}` : '',
        `🎯 ${module?.toUpperCase() || 'GERAL'}`,
        `\n🔗 Ver no Polis OS: https://project-5s2kg.vercel.app/dashboard/tarefas`,
        `\n🆔 Task ID: ${taskId}`,
      ].filter(Boolean).join('\n'),
      start: { date: dueDate },
      end: { date: dueDate },
      colorId: priority === 'critica' ? '11' : priority === 'alta' ? '5' : priority === 'media' ? '9' : '8',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 },       // 1 hour before
        ],
      },
    }

    // Create event via Google Calendar API
    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!calRes.ok) {
      const calErr = await calRes.json()
      console.error('Google Calendar error:', calErr)
      return NextResponse.json({
        error: calErr.error?.message || 'Erro ao criar evento no Google Calendar'
      }, { status: 400 })
    }

    const calEvent = await calRes.json()

    return NextResponse.json({
      success: true,
      eventId: calEvent.id,
      eventLink: calEvent.htmlLink,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('calendar-sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
