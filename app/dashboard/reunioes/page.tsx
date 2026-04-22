'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { Meeting } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export default function ReunioesPage() {
  const { currentClientId, user } = useApp()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Meeting | null>(null)
  const [showNew, setShowNew] = useState(false)
  const supabase = createClient()

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('client_id', currentClientId)
      .order('meeting_date', { ascending: false })
    setMeetings(data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <PageHeader
        title="Reuniões"
        subtitle="Registro de decisões, aprendizados e próximos passos"
        action={canEdit ? <button className="btn-primary" onClick={() => setShowNew(true)}>+ Registrar Reunião</button> : undefined}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : meetings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>▣</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '8px' }}>Nenhuma reunião registrada</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Registre reuniões para manter o histórico de decisões.</p>
          {canEdit && <button className="btn-primary" onClick={() => setShowNew(true)}>+ Registrar primeira reunião</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {meetings.map(m => (
            <div
              key={m.id}
              className="card card-hover"
              onClick={() => setSelected(m)}
              style={{ padding: '18px 20px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{m.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {formatDateTime(m.meeting_date)}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {m.what_was_done && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>O que foi feito: </span>
                        {m.what_was_done.substring(0, 80)}{m.what_was_done.length > 80 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginLeft: '16px', flexShrink: 0 }}>
                  {m.next_steps && <span className="badge badge-accent">Próximos passos</span>}
                  {m.what_worked && <span className="badge badge-success">O que funcionou</span>}
                  {m.what_failed && <span className="badge badge-critical">Pontos de atenção</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <MeetingModal meeting={selected} onClose={() => setSelected(null)} onSave={load} canEdit={canEdit} />}
      {showNew && <MeetingModal onClose={() => setShowNew(false)} onSave={load} canEdit={canEdit} />}
    </div>
  )
}

function MeetingModal({ meeting, onClose, onSave, canEdit }: { meeting?: Meeting | null; onClose: () => void; onSave: () => void; canEdit: boolean }) {
  const { currentClientId, user } = useApp()
  const supabase = createClient()
  const [mode, setMode] = useState<'view' | 'edit'>(meeting ? 'view' : 'edit')
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const localNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const [form, setForm] = useState({
    title: meeting?.title || '',
    meeting_date: meeting?.meeting_date ? meeting.meeting_date.slice(0, 16) : localNow,
    what_was_done: meeting?.what_was_done || '',
    what_worked: meeting?.what_worked || '',
    what_failed: meeting?.what_failed || '',
    next_steps: meeting?.next_steps || '',
  })

  async function handleSave() {
    if (!form.title) return
    setSaving(true)
    const payload = { ...form, meeting_date: new Date(form.meeting_date).toISOString(), created_by: user?.id }
    if (meeting) {
      await supabase.from('meetings').update(payload).eq('id', meeting.id)
    } else {
      await supabase.from('meetings').insert({ ...payload, client_id: currentClientId })
    }
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px' }}>{meeting ? 'Detalhes da Reunião' : 'Registrar Reunião'}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {meeting && mode === 'view' && canEdit && <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => setMode('edit')}>Editar</button>}
            <button className="btn-ghost" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'view' && meeting ? (
            <>
              <div style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700 }}>{meeting.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDateTime(meeting.meeting_date)}</div>
              {[
                { label: 'O que foi feito', value: meeting.what_was_done, color: 'var(--blue)' },
                { label: 'O que funcionou', value: meeting.what_worked, color: 'var(--green)' },
                { label: 'O que não funcionou', value: meeting.what_failed, color: 'var(--red)' },
                { label: 'Próximos passos', value: meeting.next_steps, color: 'var(--accent)' },
              ].filter(s => s.value).map(section => (
                <div key={section.label} style={{ borderLeft: `3px solid ${section.color}`, paddingLeft: '14px' }}>
                  <div className="label" style={{ marginBottom: '4px', color: section.color }}>{section.label}</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{section.value}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              <div><label className="label">Título da Reunião *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Alinhamento semanal de campanha" /></div>
              <div><label className="label">Data e Hora *</label><input className="input" type="datetime-local" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} /></div>
              <div><label className="label">O que foi feito</label><textarea className="textarea" value={form.what_was_done} onChange={e => setForm(p => ({ ...p, what_was_done: e.target.value }))} placeholder="Resumo das atividades realizadas..." /></div>
              <div><label className="label">O que funcionou</label><textarea className="textarea" value={form.what_worked} onChange={e => setForm(p => ({ ...p, what_worked: e.target.value }))} placeholder="Pontos positivos e aprendizados..." /></div>
              <div><label className="label">O que não funcionou</label><textarea className="textarea" value={form.what_failed} onChange={e => setForm(p => ({ ...p, what_failed: e.target.value }))} placeholder="Problemas e pontos de melhoria..." /></div>
              <div><label className="label">Próximos Passos</label><textarea className="textarea" value={form.next_steps} onChange={e => setForm(p => ({ ...p, next_steps: e.target.value }))} placeholder="Ações definidas, responsáveis, prazos..." /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : meeting ? 'Salvar' : 'Registrar reunião'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
