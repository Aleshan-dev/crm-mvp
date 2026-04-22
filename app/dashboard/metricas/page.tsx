'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { Metric } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function MetricasPage() {
  const { currentClientId, user } = useApp()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const supabase = createClient()

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('metrics')
      .select('*')
      .eq('client_id', currentClientId)
      .order('date', { ascending: false })
    setMetrics(data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  // Group by metric name to show latest + trend
  const grouped: Record<string, Metric[]> = {}
  metrics.forEach(m => {
    if (!grouped[m.name]) grouped[m.name] = []
    grouped[m.name].push(m)
  })

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Métricas"
        subtitle="Indicadores de desempenho da campanha"
        action={canEdit ? <button className="btn-primary" onClick={() => setShowNew(true)}>+ Registrar Métrica</button> : undefined}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>▦</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '8px' }}>Nenhuma métrica registrada</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Acompanhe os números da campanha registrando métricas regulares.</p>
          {canEdit && <button className="btn-primary" onClick={() => setShowNew(true)}>+ Registrar primeira métrica</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {Object.entries(grouped).map(([name, entries]) => {
            const latest = entries[0]
            const prev = entries[1]
            const pct = latest.target ? Math.min((latest.value / latest.target) * 100, 100) : null
            const trend = prev ? latest.value - prev.value : null
            const trendPct = prev && prev.value > 0 ? ((latest.value - prev.value) / prev.value * 100).toFixed(1) : null

            return (
              <div key={name} className="stat-card">
                <div className="label" style={{ marginBottom: '8px' }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '32px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                    {latest.value.toLocaleString('pt-BR')}
                  </div>
                  {latest.unit && <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>{latest.unit}</span>}
                </div>

                {trend !== null && (
                  <div style={{ fontSize: '12px', color: trend >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: '8px' }}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toLocaleString('pt-BR')}
                    {trendPct && ` (${trend >= 0 ? '+' : ''}${trendPct}%)`} vs anterior
                  </div>
                )}

                {latest.target && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Meta: {latest.target.toLocaleString('pt-BR')} {latest.unit}</span>
                      <span>{pct?.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${pct}%`,
                        background: pct && pct >= 80 ? 'var(--green)' : pct && pct >= 50 ? 'var(--accent)' : 'var(--red)',
                      }} />
                    </div>
                  </>
                )}

                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Atualizado em {formatDate(latest.date)}
                </div>

                {/* Mini history */}
                {entries.length > 1 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '20px' }}>
                    {entries.slice(0, 10).reverse().map((e, i) => {
                      const max = Math.max(...entries.map(x => x.value))
                      const h = max > 0 ? Math.max(3, (e.value / max) * 20) : 3
                      return (
                        <div key={i} style={{
                          flex: 1, borderRadius: '1px', height: `${h}px`,
                          background: i === entries.slice(0, 10).length - 1 ? 'var(--accent)' : 'var(--border-light)',
                        }} />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* History table */}
      {metrics.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>Histórico Completo</h3>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Métrica', 'Valor', 'Meta', 'Data', 'Notas'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 20).map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{m.value.toLocaleString('pt-BR')} {m.unit}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{m.target ? `${m.target.toLocaleString('pt-BR')} ${m.unit}` : '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(m.date)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showNew && <MetricModal onClose={() => setShowNew(false)} onSave={load} />}
    </div>
  )
}

function MetricModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { currentClientId, user } = useApp()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', value: '', target: '', unit: '', date: new Date().toISOString().split('T')[0], notes: '' })

  async function handleSave() {
    if (!form.name || !form.value) return
    setSaving(true)
    await supabase.from('metrics').insert({
      client_id: currentClientId, name: form.name,
      value: parseFloat(form.value), target: form.target ? parseFloat(form.target) : null,
      unit: form.unit || null, date: form.date, notes: form.notes || null, created_by: user?.id,
    })
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Registrar Métrica</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Nome da Métrica *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Seguidores Instagram, Votos simulados..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="label">Valor Atual *</label><input className="input" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="Ex: 5420" /></div>
            <div><label className="label">Meta</label><input className="input" type="number" value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} placeholder="Ex: 15000" /></div>
            <div><label className="label">Unidade</label><input className="input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="votos, seguidores..." /></div>
            <div><label className="label">Data *</label><input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <div><label className="label">Observações</label><textarea className="textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: '60px' }} placeholder="Contexto ou notas sobre o dado..." /></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.value}>{saving ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
