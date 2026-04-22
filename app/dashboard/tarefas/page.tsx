'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'
import type { Task, TaskStatus, TaskPriority, TaskModule } from '@/lib/types'

const MODULE_OPTIONS: { value: TaskModule | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os módulos' },
  { value: 'geral', label: 'Geral' },
  { value: 'mobilizacao', label: 'Mobilização' },
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'reunioes', label: 'Reuniões' },
  { value: 'metricas', label: 'Métricas' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'estrategia', label: 'Estratégia' },
]

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'atrasada', label: 'Atrasada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function TarefasPage() {
  const { currentClientId, user } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterModule, setFilterModule] = useState<TaskModule | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const canCreate = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const load = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('cronograma_geral')
      .select('*')
      .eq('client_id', currentClientId)
    setTasks(data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { load() }, [load])

  const filtered = tasks.filter(t => {
    if (filterModule !== 'all' && t.module !== filterModule) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.strategic_objective?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by status for kanban-ish summary
  const counts = {
    pendente: tasks.filter(t => t.status === 'pendente').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    atrasada: tasks.filter(t => t.is_overdue).length,
    concluida: tasks.filter(t => t.status === 'concluida').length,
  }

  if (!currentClientId) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Selecione um cliente.</div>

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Ações da Campanha"
        subtitle="Todas as ações estratégicas em execução"
        action={canCreate ? <button className="btn-primary" onClick={() => setShowNew(true)}>+ Nova Ação</button> : undefined}
      />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <SummaryPill label="Pendentes" count={counts.pendente} color="var(--text-muted)" />
        <SummaryPill label="Em andamento" count={counts.em_andamento} color="var(--blue)" />
        <SummaryPill label="Atrasadas" count={counts.atrasada} color="var(--red)" />
        <SummaryPill label="Concluídas" count={counts.concluida} color="var(--green)" />
        <SummaryPill label="Total" count={tasks.length} color="var(--accent)" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Buscar ação..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '260px' }}
        />
        <select className="select" value={filterModule} onChange={e => setFilterModule(e.target.value as TaskModule | 'all')} style={{ maxWidth: '200px' }}>
          {MODULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')} style={{ maxWidth: '200px' }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(search || filterModule !== 'all' || filterStatus !== 'all') && (
          <button className="btn-ghost" onClick={() => { setSearch(''); setFilterModule('all'); setFilterStatus('all') }}>
            Limpar filtros
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {filtered.length} ação{filtered.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState search={search} canCreate={canCreate} onCreate={() => setShowNew(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} showModule onClick={() => setSelectedTask(t)} />
          ))}
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onSave={load} />}
      {showNew && <TaskModal onClose={() => setShowNew(false)} onSave={load} />}
    </div>
  )
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '8px 14px',
    }}>
      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px', color }}>{count}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function EmptyState({ search, canCreate, onCreate }: { search: string; canCreate: boolean; onCreate: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>◻</div>
      <div style={{ fontFamily: 'Syne', fontSize: '15px', marginBottom: '6px' }}>
        {search ? 'Nenhuma ação encontrada' : 'Nenhuma ação criada ainda'}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
        {search ? 'Tente outros termos de busca.' : 'As ações da campanha aparecem aqui.'}
      </p>
      {canCreate && !search && <button className="btn-primary" onClick={onCreate}>+ Criar primeira ação</button>}
    </div>
  )
}
