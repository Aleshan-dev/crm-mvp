'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import type { Task, UserProfile } from '@/lib/types'
import { statusLabel, priorityLabel, moduleLabel, formatDate, statusClass, priorityClass } from '@/lib/utils'

interface TaskModalProps {
  task?: Task | null
  onClose: () => void
  onSave: () => void
}

export default function TaskModal({ task, onClose, onSave }: TaskModalProps) {
  const { currentClientId, user } = useApp()
  const supabase = createClient()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [calLoading, setCalLoading] = useState(false)
  const [calStatus, setCalStatus] = useState<{ type: 'success' | 'error' | 'warn'; msg: string } | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>(task ? 'view' : 'edit')

  const canEdit = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    module: task?.module || 'geral',
    responsible_user: task?.responsible_user || '',
    priority: task?.priority || 'media',
    status: task?.status || 'pendente',
    strategic_objective: task?.strategic_objective || '',
    target_audience: task?.target_audience || '',
    related_theme: task?.related_theme || '',
    expected_outcome: task?.expected_outcome || '',
    due_date: task?.due_date || '',
  })

  useEffect(() => {
    async function loadUsers() {
      if (!currentClientId) return
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`client_id.eq.${currentClientId},role.in.(administrador,polis)`)
      setUsers(data || [])
    }
    loadUsers()
  }, [currentClientId])

  async function handleSave() {
    if (!form.title || !form.responsible_user || !form.strategic_objective) {
      alert('Preencha: título, responsável e objetivo estratégico.')
      return
    }
    setLoading(true)
    let savedTask: Task | null = null
    if (task) {
      const { data } = await supabase.from('tasks').update({ ...form }).eq('id', task.id).select().single()
      savedTask = data
    } else {
      const { data } = await supabase.from('tasks').insert({
        ...form, client_id: currentClientId, created_by: user?.id,
      }).select().single()
      savedTask = data
    }
    setLoading(false)

    // Auto-sync to calendar if task has a due date
    if (savedTask?.due_date) {
      syncToCalendar(savedTask, true)
    }

    onSave()
    onClose()
  }

  async function syncToCalendar(t: Task, silent = false) {
    if (!t.due_date) {
      setCalStatus({ type: 'warn', msg: 'Defina um prazo para sincronizar com o calendário.' })
      return
    }
    if (!silent) setCalLoading(true)
    setCalStatus(null)

    try {
      const res = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: t.id,
          title: t.title,
          description: t.description,
          dueDate: t.due_date,
          priority: t.priority,
          module: t.module,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.needsGoogleLogin) {
          setCalStatus({ type: 'warn', msg: 'Faça login com Google para sincronizar o calendário.' })
        } else {
          setCalStatus({ type: 'error', msg: data.error || 'Erro ao sincronizar.' })
        }
      } else {
        setCalStatus({ type: 'success', msg: '✓ Evento criado no Google Calendar!' })
      }
    } catch {
      setCalStatus({ type: 'error', msg: 'Erro de conexão.' })
    } finally {
      if (!silent) setCalLoading(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!task) return
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'concluida') update.completed_at = new Date().toISOString()
    await supabase.from('tasks').update(update).eq('id', task.id)
    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
              {task ? (mode === 'view' ? 'Detalhes da Ação' : 'Editar Ação') : 'Nova Ação da Campanha'}
            </h3>
            {task && mode === 'view' && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Criada em {formatDate(task.created_at)}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {task && mode === 'view' && canEdit && (
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setMode('edit')}>Editar</button>
            )}
            <button className="btn-ghost" onClick={onClose} style={{ fontSize: '18px', padding: '4px 8px' }}>×</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {mode === 'view' && task ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Status quick-change */}
              {canEdit && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['pendente', 'em_andamento', 'concluida', 'cancelada'] as const).map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)} style={{
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: task.status === s ? 'var(--accent-glow)' : 'var(--bg-surface)',
                      color: task.status === s ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>{task.title}</div>
                {task.description && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{task.description}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoField label="Módulo" value={moduleLabel(task.module)} />
                <InfoField label="Prioridade" value={priorityLabel(task.priority)} />
                <InfoField label="Responsável" value={task.responsible_name || '—'} />
                <InfoField label="Prazo" value={formatDate(task.due_date)} highlight={task.is_overdue} />
                <InfoField label="Status" value={statusLabel(task.status)} />
                {task.target_audience && <InfoField label="Público-alvo" value={task.target_audience} />}
              </div>

              <div>
                <div className="label">Objetivo Estratégico</div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {task.strategic_objective}
                </div>
              </div>

              {task.expected_outcome && (
                <div>
                  <div className="label">Resultado Esperado</div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {task.expected_outcome}
                  </div>
                </div>
              )}

              {/* Google Calendar sync button */}
              {task.due_date && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => syncToCalendar(task)}
                      disabled={calLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: '8px',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        cursor: calLoading ? 'wait' : 'pointer', color: 'var(--text-primary)',
                        fontSize: '13px', transition: 'all 0.15s',
                        opacity: calLoading ? 0.7 : 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8 14h2v2H8v-2z" fill="#34A853"/>
                        <path d="M11 14h2v2h-2v-2z" fill="#FBBC05"/>
                        <path d="M14 14h2v2h-2v-2z" fill="#EA4335"/>
                      </svg>
                      {calLoading ? 'Sincronizando...' : 'Sincronizar com Google Calendar'}
                    </button>

                    {/* Quick add link (works without OAuth) */}
                    <a
                      href={buildGCalLink(task)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', color: 'var(--text-muted)',
                        textDecoration: 'none',
                      }}
                    >
                      ↗ Abrir no calendário
                    </a>
                  </div>

                  {calStatus && (
                    <div style={{
                      marginTop: '10px', padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                      background: calStatus.type === 'success' ? 'var(--green-dim)' : calStatus.type === 'warn' ? 'var(--yellow-dim)' : 'var(--red-dim)',
                      color: calStatus.type === 'success' ? 'var(--green)' : calStatus.type === 'warn' ? 'var(--yellow)' : 'var(--red)',
                      border: `1px solid ${calStatus.type === 'success' ? 'rgba(82,183,136,0.2)' : calStatus.type === 'warn' ? 'rgba(224,166,82,0.2)' : 'rgba(224,82,82,0.2)'}`,
                    }}>
                      {calStatus.msg}
                      {calStatus.type === 'warn' && calStatus.msg.includes('Google') && (
                        <span style={{ marginLeft: '8px' }}>
                          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Entrar com Google</a>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* EDIT MODE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Título da Ação *</label>
                <input className="input" placeholder="Ex: Criar material de mobilização para bairro X" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea className="textarea" placeholder="Descreva o que precisa ser feito..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label">Módulo *</label>
                  <select className="select" value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value as never }))}>
                    <option value="geral">Geral</option>
                    <option value="mobilizacao">Mobilização</option>
                    <option value="comunicacao">Comunicação</option>
                    <option value="reunioes">Reuniões</option>
                    <option value="metricas">Métricas</option>
                    <option value="documentos">Documentos</option>
                    <option value="estrategia">Estratégia</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridade *</label>
                  <select className="select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as never }))}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status *</label>
                  <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as never }))}>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="label">Responsável *</label>
                  <select className="select" value={form.responsible_user} onChange={e => setForm(p => ({ ...p, responsible_user: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Prazo</label>
                  <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Público-alvo</label>
                  <input className="input" placeholder="Ex: Jovens 18-25" value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Objetivo Estratégico *</label>
                <textarea className="textarea" placeholder="Como esta ação conecta à estratégia da campanha?" value={form.strategic_objective} onChange={e => setForm(p => ({ ...p, strategic_objective: e.target.value }))} />
              </div>
              <div>
                <label className="label">Resultado Esperado</label>
                <textarea className="textarea" placeholder="O que deve acontecer após a conclusão desta ação?" value={form.expected_outcome} onChange={e => setForm(p => ({ ...p, expected_outcome: e.target.value }))} style={{ minHeight: '64px' }} />
              </div>

              {form.due_date && (
                <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(82,130,224,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Ao salvar, esta ação será sincronizada automaticamente com seu Google Calendar (se conectado via Google).
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={loading}>
                  {loading ? 'Salvando...' : task ? 'Salvar alterações' : 'Criar ação'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Build Google Calendar quick-add URL (works without OAuth)
function buildGCalLink(task: Task): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(`[Polis OS] ${task.title}`)
  const details = encodeURIComponent(
    `Responsável: ${task.responsible_name || '—'}\nMódulo: ${moduleLabel(task.module)}\nPrioridade: ${priorityLabel(task.priority)}\nObjetivo: ${task.strategic_objective}\n\nVer no Polis OS: https://project-5s2kg.vercel.app/dashboard/tarefas`
  )
  const date = task.due_date?.replace(/-/g, '') || ''
  return `${base}&text=${title}&details=${details}&dates=${date}/${date}`
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontSize: '14px', color: highlight ? 'var(--red)' : 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
