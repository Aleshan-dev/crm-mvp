'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { CommunicationItem, CommObjective, CommStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const OBJECTIVE_LABELS: Record<CommObjective, string> = {
  engajamento: 'Engajamento', conversao: 'Conversão', mobilizacao: 'Mobilização',
}
const STATUS_LABELS: Record<CommStatus, string> = {
  rascunho: 'Rascunho', aprovado: 'Aprovado', publicado: 'Publicado', cancelado: 'Cancelado',
}
const STATUS_COLORS: Record<CommStatus, string> = {
  rascunho: 'badge-muted', aprovado: 'badge-info', publicado: 'badge-success', cancelado: 'badge-muted',
}

export default function ComunicacaoPage() {
  const { currentClientId, user } = useApp()
  const [items, setItems] = useState<CommunicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CommunicationItem | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterStatus, setFilterStatus] = useState<CommStatus | 'all'>('all')
  const supabase = createClient()

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('communication_items')
      .select('*')
      .eq('client_id', currentClientId)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  const filtered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus)

  const counts = {
    rascunho: items.filter(i => i.status === 'rascunho').length,
    aprovado: items.filter(i => i.status === 'aprovado').length,
    publicado: items.filter(i => i.status === 'publicado').length,
  }

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Comunicação"
        subtitle="Conteúdos estratégicos da campanha"
        action={canEdit ? <button className="btn-primary" onClick={() => setShowNew(true)}>+ Novo Conteúdo</button> : undefined}
      />

      {/* Status summary */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {(['all', 'rascunho', 'aprovado', 'publicado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s as CommStatus | 'all')}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              border: '1px solid var(--border)',
              background: filterStatus === s ? 'var(--accent-glow)' : 'var(--bg-card)',
              color: filterStatus === s ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {s === 'all' ? `Todos (${items.length})` :
             s === 'rascunho' ? `Rascunhos (${counts.rascunho})` :
             s === 'aprovado' ? `Aprovados (${counts.aprovado})` :
             `Publicados (${counts.publicado})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◈</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '8px' }}>Nenhum conteúdo encontrado</div>
          {canEdit && <button className="btn-primary" onClick={() => setShowNew(true)}>+ Criar conteúdo</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filtered.map(item => (
            <div
              key={item.id}
              className="card card-hover"
              onClick={() => setSelected(item)}
              style={{ padding: '18px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span className={`badge ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.platform}</span>
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '14px', marginBottom: '6px', lineHeight: 1.3 }}>{item.title}</div>
              {item.content && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.content}
                </p>
              )}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-accent">{OBJECTIVE_LABELS[item.objective]}</span>
                {item.scheduled_date && (
                  <span className="badge badge-muted">{formatDate(item.scheduled_date)}</span>
                )}
              </div>
              {item.cta && (
                <div style={{ marginTop: '10px', padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  CTA: {item.cta}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && <CommModal item={selected} onClose={() => setSelected(null)} onSave={load} canEdit={canEdit} />}
      {showNew && <CommModal onClose={() => setShowNew(false)} onSave={load} canEdit={canEdit} />}
    </div>
  )
}

function CommModal({ item, onClose, onSave, canEdit }: { item?: CommunicationItem | null; onClose: () => void; onSave: () => void; canEdit: boolean }) {
  const { currentClientId, user } = useApp()
  const supabase = createClient()
  const [mode, setMode] = useState<'view' | 'edit'>(item ? 'view' : 'edit')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: item?.title || '',
    content: item?.content || '',
    objective: item?.objective || 'engajamento',
    strategic_link: item?.strategic_link || '',
    cta: item?.cta || '',
    expected_result: item?.expected_result || '',
    platform: item?.platform || '',
    scheduled_date: item?.scheduled_date ? item.scheduled_date.split('T')[0] : '',
    status: item?.status || 'rascunho',
  })

  async function handleSave() {
    if (!form.title || !form.cta) { alert('Título e CTA são obrigatórios.'); return }
    setSaving(true)
    const payload = { ...form, objective: form.objective as CommObjective, status: form.status as CommStatus, scheduled_date: form.scheduled_date || null, created_by: user?.id }
    if (item) {
      await supabase.from('communication_items').update(payload).eq('id', item.id)
    } else {
      await supabase.from('communication_items').insert({ ...payload, client_id: currentClientId })
    }
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px' }}>{item ? (mode === 'view' ? 'Conteúdo' : 'Editar') : 'Novo Conteúdo'}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {item && mode === 'view' && canEdit && <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => setMode('edit')}>Editar</button>}
            <button className="btn-ghost" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'view' && item ? (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                <span className="badge badge-accent">{OBJECTIVE_LABELS[item.objective]}</span>
                {item.platform && <span className="badge badge-muted">{item.platform}</span>}
              </div>
              <div style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700 }}>{item.title}</div>
              {item.content && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>{item.content}</p>}
              {item.strategic_link && (
                <div><div className="label">Vínculo Estratégico</div><p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.strategic_link}</p></div>
              )}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div className="label" style={{ marginBottom: '4px' }}>Call to Action</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.cta}</div>
              </div>
              {item.expected_result && (
                <div><div className="label">Resultado Esperado</div><p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.expected_result}</p></div>
              )}
              {item.scheduled_date && (
                <div><div className="label">Data Programada</div><div style={{ fontSize: '14px' }}>{formatDate(item.scheduled_date)}</div></div>
              )}
            </>
          ) : (
            <>
              <div><label className="label">Título *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título do conteúdo" /></div>
              <div><label className="label">Conteúdo / Texto</label><textarea className="textarea" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Texto do post, roteiro, copy..." style={{ minHeight: '100px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Objetivo *</label>
                  <select className="select" value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value as CommObjective }))}>
                    <option value="engajamento">Engajamento</option>
                    <option value="conversao">Conversão</option>
                    <option value="mobilizacao">Mobilização</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as CommStatus }))}>
                    <option value="rascunho">Rascunho</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="publicado">Publicado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div><label className="label">Plataforma</label><input className="input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} placeholder="Instagram, WhatsApp..." /></div>
                <div><label className="label">Data Programada</label><input className="input" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} /></div>
              </div>
              <div><label className="label">Vínculo Estratégico</label><input className="input" value={form.strategic_link} onChange={e => setForm(p => ({ ...p, strategic_link: e.target.value }))} placeholder="Como conecta à estratégia da campanha?" /></div>
              <div><label className="label">Call to Action (CTA) *</label><input className="input" value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value }))} placeholder="Ex: Compartilhe, Inscreva-se, Vote..." /></div>
              <div><label className="label">Resultado Esperado</label><textarea className="textarea" value={form.expected_result} onChange={e => setForm(p => ({ ...p, expected_result: e.target.value }))} style={{ minHeight: '60px' }} placeholder="O que esse conteúdo deve gerar?" /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : item ? 'Salvar' : 'Criar conteúdo'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
