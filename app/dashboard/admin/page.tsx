'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { Client, UserProfile } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function AdminPage() {
  const { user } = useApp()
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tab, setTab] = useState<'clients' | 'users'>('clients')
  const [loading, setLoading] = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const supabase = createClient()

  const isAdmin = user?.role === 'administrador'

  if (!['administrador', 'polis'].includes(user?.role || '')) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Acesso negado.</div>
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [clientsRes, usersRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('user_profiles').select('*').order('full_name'),
    ])
    setClients(clientsRes.data || [])
    setUsers(usersRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const roleLabel: Record<string, string> = {
    administrador: 'Administrador', polis: 'Polis',
    cliente_admin: 'Cliente Admin', cliente_operacional: 'Operacional',
    cliente_visualizacao: 'Visualização',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader title="Administração" subtitle="Gestão de clientes, usuários e configurações do sistema" />

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['clients', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', border: 'none',
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? '#0a0b0f' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}>
            {t === 'clients' ? `Clientes (${clients.length})` : `Usuários (${users.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : tab === 'clients' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            {isAdmin && <button className="btn-primary" onClick={() => setShowNewClient(true)}>+ Novo Cliente</button>}
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {clients.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum cliente cadastrado.</div>
            ) : clients.map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                alignItems: 'center', gap: '16px', padding: '14px 18px',
                borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/{c.slug}</div>
                </div>
                <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                  {c.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</span>
                {isAdmin && (
                  <select className="select" style={{ width: 'auto', padding: '5px 10px', fontSize: '12px' }}
                    value={c.status}
                    onChange={async e => {
                      await supabase.from('clients').update({ status: e.target.value }).eq('id', c.id)
                      load()
                    }}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={() => setShowNewUser(true)}>+ Novo Usuário</button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {users.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário cadastrado.</div>
            ) : users.map((u, i) => {
              const clientName = clients.find(c => c.id === u.client_id)?.name
              return (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center', gap: '16px', padding: '14px 18px',
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{u.full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {u.email}{clientName ? ` · ${clientName}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${
                    u.role === 'administrador' ? 'badge-critical' :
                    u.role === 'polis' ? 'badge-accent' :
                    u.role === 'cliente_admin' ? 'badge-info' : 'badge-muted'
                  }`}>{roleLabel[u.role]}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</span>
                  <select className="select" style={{ width: 'auto', padding: '5px 10px', fontSize: '12px' }}
                    value={u.role}
                    onChange={async e => {
                      await supabase.from('user_profiles').update({ role: e.target.value }).eq('id', u.id)
                      load()
                    }}>
                    <option value="administrador">Administrador</option>
                    <option value="polis">Polis</option>
                    <option value="cliente_admin">Cliente Admin</option>
                    <option value="cliente_operacional">Operacional</option>
                    <option value="cliente_visualizacao">Visualização</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} onSave={load} />}
      {showNewUser && <NewUserModal onClose={() => setShowNewUser(false)} onSave={load} clients={clients} />}
    </div>
  )
}

function NewClientModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '' })

  async function handleSave() {
    if (!form.name || !form.slug) return
    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
    })
    if (error) { alert('Erro: ' + error.message); setSaving(false); return }
    setSaving(false); onSave(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Novo Cliente</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Nome da Campanha *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Campanha João Silva" />
          </div>
          <div><label className="label">Slug *</label>
            <input className="input" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="joao-silva" />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? 'Criando...' : 'Criar cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewUserModal({ onClose, onSave, clients }: { onClose: () => void; onSave: () => void; clients: Client[] }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'cliente_visualizacao', client_id: '',
  })

  async function handleSave() {
    if (!form.email || !form.full_name || !form.password) {
      setError('Preencha nome, e-mail e senha.')
      return
    }
    if (form.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Create user via Supabase Edge Function / RPC that runs as service role
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário')
      setSuccess(`Usuário criado! E-mail: ${form.email} | Senha: ${form.password}`)
      setTimeout(() => { onSave(); onClose() }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '460px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px' }}>Novo Usuário</h3>
          <button className="btn-ghost" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label className="label">Nome Completo *</label>
            <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nome do usuário" />
          </div>
          <div><label className="label">E-mail *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
          </div>
          <div><label className="label">Senha *</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Papel</label>
              <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="polis">Polis</option>
                <option value="cliente_admin">Cliente Admin</option>
                <option value="cliente_operacional">Operacional</option>
                <option value="cliente_visualizacao">Visualização</option>
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <select className="select" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">Sem cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: '8px', padding: '10px', color: 'var(--red)', fontSize: '13px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(82,183,136,0.2)', borderRadius: '8px', padding: '10px', color: 'var(--green)', fontSize: '13px' }}>
              ✓ {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
