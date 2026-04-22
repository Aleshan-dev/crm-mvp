'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { Document } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📋', pptx: '📋', jpg: '🖼', jpeg: '🖼', png: '🖼',
  mp4: '🎬', mp3: '🎵', zip: '📦', default: '📁',
}

function fileIcon(url: string | null, type: string | null): string {
  if (type) {
    const ext = type.split('/').pop()?.split('.').pop()?.toLowerCase() || ''
    return FILE_ICONS[ext] || FILE_ICONS.default
  }
  if (url) {
    const ext = url.split('.').pop()?.toLowerCase() || ''
    return FILE_ICONS[ext] || FILE_ICONS.default
  }
  return FILE_ICONS.default
}

export default function DocumentosPage() {
  const { currentClientId, user } = useApp()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', currentClientId)
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  const filtered = docs.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!confirm('Excluir este documento?')) return
    await supabase.from('documents').delete().eq('id', id)
    load()
  }

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Documentos"
        subtitle="Repositório central de arquivos da campanha"
        action={canEdit ? <button className="btn-primary" onClick={() => setShowNew(true)}>+ Adicionar Documento</button> : undefined}
      />

      <div style={{ marginBottom: '20px' }}>
        <input
          className="input"
          placeholder="Buscar documento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>▤</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '8px' }}>
            {search ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
          </div>
          {canEdit && !search && <button className="btn-primary" onClick={() => setShowNew(true)}>+ Adicionar primeiro documento</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {filtered.map(doc => (
            <div key={doc.id} className="card card-hover" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '28px', flexShrink: 0 }}>{fileIcon(doc.file_url, doc.file_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                  {doc.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {doc.description}
                    </p>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(doc.created_at)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '6px', fontSize: '12px' }}>
                    Abrir
                  </a>
                )}
                {canEdit && (
                  <button onClick={() => handleDelete(doc.id)} className="btn-ghost" style={{ color: 'var(--red)', padding: '6px 10px', fontSize: '12px' }}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <DocModal onClose={() => setShowNew(false)} onSave={load} />}
    </div>
  )
}

function DocModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { currentClientId, user } = useApp()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', file_url: '', file_type: '' })

  async function handleSave() {
    if (!form.title) return
    setSaving(true)
    await supabase.from('documents').insert({
      client_id: currentClientId,
      title: form.title,
      description: form.description || null,
      file_url: form.file_url || null,
      file_type: form.file_type || null,
      uploaded_by: user?.id,
    })
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Adicionar Documento</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Título *</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do documento" /></div>
          <div><label className="label">Descrição</label><textarea className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ minHeight: '64px' }} placeholder="Sobre o que é este documento?" /></div>
          <div><label className="label">URL do Arquivo</label><input className="input" value={form.file_url} onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
          <div><label className="label">Tipo de Arquivo</label><input className="input" value={form.file_type} onChange={e => setForm(p => ({ ...p, file_type: e.target.value }))} placeholder="PDF, Planilha, Apresentação..." /></div>
          <div style={{ background: 'var(--yellow-dim)', border: '1px solid rgba(224,166,82,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--yellow)' }}>
            Dica: Faça upload no Google Drive e cole o link compartilhável aqui.
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.title}>{saving ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
