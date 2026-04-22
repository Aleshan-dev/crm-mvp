'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { MobilizationGroup, MobilizationEntry } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function MobilizacaoPage() {
  const { currentClientId, user } = useApp()
  const [groups, setGroups] = useState<MobilizationGroup[]>([])
  const [entries, setEntries] = useState<Record<string, MobilizationEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showNewEntry, setShowNewEntry] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const supabase = createClient()

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data: groupsData } = await supabase
      .from('mobilization_groups')
      .select('*')
      .eq('client_id', currentClientId)
      .order('created_at', { ascending: false })

    setGroups(groupsData || [])

    if (groupsData && groupsData.length > 0) {
      const entriesMap: Record<string, MobilizationEntry[]> = {}
      await Promise.all(groupsData.map(async g => {
        const { data } = await supabase
          .from('mobilization_entries')
          .select('*')
          .eq('group_id', g.id)
          .order('date', { ascending: false })
          .limit(10)
        entriesMap[g.id] = data || []
      }))
      setEntries(entriesMap)
    }
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0)

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Mobilização"
        subtitle="Grupos, contatos e crescimento da base"
        action={canEdit ? <button className="btn-primary" onClick={() => setShowNewGroup(true)}>+ Novo Grupo</button> : undefined}
      />

      {/* Total summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="label">Total de Mobilizados</div>
          <div style={{ fontSize: '36px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
            {totalMembers.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>em {groups.length} grupo{groups.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card">
          <div className="label">Grupos Ativos</div>
          <div style={{ fontSize: '36px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--blue)', marginBottom: '4px' }}>{groups.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>grupos cadastrados</div>
        </div>
        <div className="stat-card">
          <div className="label">Maior Grupo</div>
          <div style={{ fontSize: '22px', fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>
            {groups.length > 0 ? Math.max(...groups.map(g => g.member_count)).toLocaleString('pt-BR') : '0'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {groups.length > 0 ? groups.reduce((a, b) => a.member_count > b.member_count ? a : b, groups[0])?.name : '—'}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◉</div>
          <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '8px' }}>Nenhum grupo criado</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Crie grupos para organizar sua base de mobilização.</p>
          {canEdit && <button className="btn-primary" onClick={() => setShowNewGroup(true)}>+ Criar primeiro grupo</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              entries={entries[g.id] || []}
              isExpanded={selectedGroup === g.id}
              onToggle={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
              onAddEntry={() => setShowNewEntry(g.id)}
              canEdit={canEdit}
              onUpdate={load}
            />
          ))}
        </div>
      )}

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onSave={load} clientId={currentClientId} userId={user?.id} />}
      {showNewEntry && <NewEntryModal groupId={showNewEntry} clientId={currentClientId} userId={user?.id} onClose={() => setShowNewEntry(null)} onSave={load} />}
    </div>
  )
}

function GroupCard({ group, entries, isExpanded, onToggle, onAddEntry, canEdit, onUpdate }: {
  group: MobilizationGroup; entries: MobilizationEntry[]; isExpanded: boolean;
  onToggle: () => void; onAddEntry: () => void; canEdit: boolean; onUpdate: () => void
}) {
  const supabase = createClient()
  const lastEntry = entries[0]
  const prevEntry = entries[1]
  const growth = lastEntry && prevEntry ? lastEntry.member_count - prevEntry.member_count : null

  async function handleDelete() {
    if (!confirm(`Excluir o grupo "${group.name}"?`)) return
    await supabase.from('mobilization_groups').delete().eq('id', group.id)
    onUpdate()
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>{group.name}</div>
            {group.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{group.description}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '22px', color: 'var(--accent)' }}>
              {group.member_count.toLocaleString('pt-BR')}
            </div>
            {growth !== null && (
              <div style={{ fontSize: '11px', color: growth >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {growth >= 0 ? '+' : ''}{growth} vs anterior
              </div>
            )}
          </div>
        </div>

        {/* Mini progress */}
        {entries.length > 1 && (
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '28px', marginTop: '8px' }}>
            {entries.slice(0, 8).reverse().map((e, i) => {
              const max = Math.max(...entries.map(x => x.member_count))
              const h = max > 0 ? Math.max(4, (e.member_count / max) * 28) : 4
              return (
                <div key={i} style={{
                  flex: 1, borderRadius: '2px', height: `${h}px`,
                  background: i === entries.slice(0, 8).length - 1 ? 'var(--accent)' : 'var(--border-light)',
                  transition: 'height 0.3s',
                }} />
              )
            })}
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Histórico de crescimento</span>
            {canEdit && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={onAddEntry}>+ Registro</button>
                <button className="btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--red)' }} onClick={handleDelete}>Excluir</button>
              </div>
            )}
          </div>
          {entries.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Nenhum registro ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {entries.slice(0, 5).map(e => (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: '6px',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(e.date)}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {e.member_count.toLocaleString('pt-BR')} membros
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewGroupModal({ onClose, onSave, clientId, userId }: { onClose: () => void; onSave: () => void; clientId: string; userId?: string }) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberCount, setMemberCount] = useState('0')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name) return
    setSaving(true)
    await supabase.from('mobilization_groups').insert({
      client_id: clientId, name, description: description || null,
      member_count: parseInt(memberCount) || 0, created_by: userId,
    })
    setSaving(false)
    onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '420px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Novo Grupo de Mobilização</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Nome do Grupo *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Grupo WhatsApp Zona Sul" /></div>
          <div><label className="label">Descrição</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" /></div>
          <div><label className="label">Membros Iniciais</label><input className="input" type="number" value={memberCount} onChange={e => setMemberCount(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !name}>{saving ? 'Salvando...' : 'Criar grupo'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewEntryModal({ groupId, clientId, userId, onClose, onSave }: { groupId: string; clientId: string; userId?: string; onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [memberCount, setMemberCount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!memberCount) return
    setSaving(true)
    const count = parseInt(memberCount)
    await supabase.from('mobilization_entries').insert({
      group_id: groupId, client_id: clientId,
      member_count: count, date, notes: notes || null, created_by: userId,
    })
    await supabase.from('mobilization_groups').update({ member_count: count }).eq('id', groupId)
    setSaving(false)
    onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '380px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Registrar Crescimento</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Data *</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="label">Total de Membros *</label><input className="input" type="number" value={memberCount} onChange={e => setMemberCount(e.target.value)} placeholder="Ex: 156" /></div>
          <div><label className="label">Observações</label><textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre o crescimento..." style={{ minHeight: '60px' }} /></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !memberCount}>{saving ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
