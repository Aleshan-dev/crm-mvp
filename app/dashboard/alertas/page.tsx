'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { Alert } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export default function AlertasPage() {
  const { currentClientId, user } = useApp()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const supabase = createClient()

  const canResolve = ['administrador', 'polis', 'cliente_admin'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const query = supabase
      .from('alerts')
      .select('*')
      .eq('client_id', currentClientId)
      .order('created_at', { ascending: false })
    if (!showResolved) query.eq('is_resolved', false)
    const { data } = await query
    setAlerts(data || [])
    setLoading(false)
  }, [currentClientId, showResolved])

  useEffect(() => { load() }, [load])

  async function resolveAlert(id: string) {
    await supabase.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const critical = alerts.filter(a => a.type === 'critical' && !a.is_resolved)
  const warning = alerts.filter(a => a.type === 'warning' && !a.is_resolved)
  const resolved = alerts.filter(a => a.is_resolved)

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <PageHeader
        title="Alertas"
        subtitle="Urgências e pontos de atenção da campanha"
        action={
          <button
            className="btn-secondary"
            onClick={() => setShowResolved(!showResolved)}
            style={{ fontSize: '12px' }}
          >
            {showResolved ? 'Ocultar resolvidos' : 'Ver resolvidos'}
          </button>
        }
      />

      {/* Summary */}
      {!showResolved && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            flex: 1, background: critical.length > 0 ? 'var(--red-dim)' : 'var(--bg-card)',
            border: `1px solid ${critical.length > 0 ? 'rgba(224,82,82,0.3)' : 'var(--border)'}`,
            borderRadius: '10px', padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--red)' }}>{critical.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Críticos</div>
          </div>
          <div style={{
            flex: 1, background: warning.length > 0 ? 'var(--yellow-dim)' : 'var(--bg-card)',
            border: `1px solid ${warning.length > 0 ? 'rgba(224,166,82,0.25)' : 'var(--border)'}`,
            borderRadius: '10px', padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--yellow)' }}>{warning.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avisos</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)' }}>{resolved.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resolvidos</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◆</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '6px', color: 'var(--green)' }}>
            {showResolved ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {showResolved ? '' : 'A campanha está operando sem pendências críticas.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(a => (
            <AlertCard key={a.id} alert={a} onResolve={canResolve ? resolveAlert : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert, onResolve }: { alert: Alert; onResolve?: (id: string) => void }) {
  const colors = {
    critical: { bg: 'var(--red-dim)', border: 'rgba(224,82,82,0.25)', color: 'var(--red)', icon: '⚠' },
    warning: { bg: 'var(--yellow-dim)', border: 'rgba(224,166,82,0.2)', color: 'var(--yellow)', icon: '◈' },
    info: { bg: 'var(--blue-dim)', border: 'rgba(82,130,224,0.2)', color: 'var(--blue)', icon: 'ℹ' },
  }
  const c = colors[alert.type]

  return (
    <div style={{
      background: alert.is_resolved ? 'var(--bg-card)' : c.bg,
      border: `1px solid ${alert.is_resolved ? 'var(--border)' : c.border}`,
      borderRadius: '10px', padding: '16px 18px',
      opacity: alert.is_resolved ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '18px', color: alert.is_resolved ? 'var(--text-muted)' : c.color, flexShrink: 0 }}>
          {alert.is_resolved ? '✓' : c.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: alert.is_resolved ? 'var(--text-muted)' : c.color }}>
              {alert.title}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
              {formatDateTime(alert.created_at)}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: alert.impact ? '6px' : 0, lineHeight: 1.5 }}>
            {alert.message}
          </p>
          {alert.impact && !alert.is_resolved && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Impacto: {alert.impact}
            </p>
          )}
          {alert.is_resolved && alert.resolved_at && (
            <p style={{ fontSize: '11px', color: 'var(--green)' }}>
              Resolvido em {formatDateTime(alert.resolved_at)}
            </p>
          )}
        </div>
        {!alert.is_resolved && onResolve && (
          <button
            onClick={() => onResolve(alert.id)}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
          >
            Resolver
          </button>
        )}
      </div>
    </div>
  )
}
