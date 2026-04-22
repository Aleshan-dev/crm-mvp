'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'
import type { Task, ExecutionScore, Alert } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function CronogramaPage() {
  const { currentClientId, user } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [score, setScore] = useState<ExecutionScore | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)

    const [tasksRes, scoreRes, alertsRes] = await Promise.all([
      supabase.from('cronograma_geral').select('*').eq('client_id', currentClientId),
      supabase.rpc('get_execution_score', { p_client_id: currentClientId }),
      supabase.from('alerts').select('*').eq('client_id', currentClientId).eq('is_resolved', false).order('created_at', { ascending: false }).limit(3),
    ])

    setTasks(tasksRes.data || [])
    setScore(scoreRes.data)
    setAlerts(alertsRes.data || [])
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { loadData() }, [loadData])

  const isPolisOrAdmin = ['administrador', 'polis'].includes(user?.role || '')
  const canCreate = ['administrador', 'polis', 'cliente_admin', 'cliente_operacional'].includes(user?.role || '')

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const filteredTasks = tasks.filter(t => {
    if (filter === 'overdue') return t.is_overdue
    if (filter === 'today') return t.due_date === today
    if (filter === 'week') return t.due_date && t.due_date <= weekEnd && !t.is_overdue
    return true
  })

  const overdueCount = tasks.filter(t => t.is_overdue).length
  const todayCount = tasks.filter(t => t.due_date === today && !t.is_overdue).length
  const inProgressCount = tasks.filter(t => t.status === 'em_andamento').length

  if (!currentClientId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Selecione um cliente para visualizar o cronograma.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Cronograma Geral"
        subtitle="O que está sendo executado agora"
        action={canCreate ? (
          <button className="btn-primary" onClick={() => setShowNewTask(true)}>
            + Nova Ação
          </button>
        ) : undefined}
      />

      {/* Alerts strip */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              background: a.type === 'critical' ? 'var(--red-dim)' : 'var(--yellow-dim)',
              border: `1px solid ${a.type === 'critical' ? 'rgba(224,82,82,0.2)' : 'rgba(224,166,82,0.2)'}`,
              borderRadius: '8px', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '14px' }}>{a.type === 'critical' ? '⚠' : '◈'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: a.type === 'critical' ? 'var(--red)' : 'var(--yellow)' }}>
                  {a.title}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>{a.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          label="Taxa de Execução"
          value={score ? `${score.execution_score}%` : '—'}
          sub={score ? `${score.completed_tasks} de ${score.total_tasks} ações` : 'Esta semana'}
          color={score && score.execution_score >= 70 ? 'var(--green)' : score && score.execution_score >= 40 ? 'var(--yellow)' : 'var(--red)'}
          progress={score?.execution_score}
        />
        <StatCard
          label="Ações Atrasadas"
          value={String(overdueCount)}
          sub="Precisam de atenção"
          color={overdueCount > 0 ? 'var(--red)' : 'var(--green)'}
          alert={overdueCount > 0}
        />
        <StatCard
          label="Para Hoje"
          value={String(todayCount)}
          sub="Vencem hoje"
          color="var(--yellow)"
        />
        <StatCard
          label="Em Andamento"
          value={String(inProgressCount)}
          sub="Ações ativas"
          color="var(--blue)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'overdue', 'today', 'week'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none',
              background: filter === f ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === f ? '#0a0b0f' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? `Todas (${tasks.length})` :
             f === 'overdue' ? `Atrasadas (${overdueCount})` :
             f === 'today' ? `Hoje (${todayCount})` :
             `Próximos 7 dias`}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando ações...</div>
      ) : filteredTasks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◈</div>
          <div style={{ fontSize: '15px', fontFamily: 'Syne', marginBottom: '6px' }}>Nenhuma ação encontrada</div>
          <div style={{ fontSize: '13px' }}>
            {filter === 'overdue' ? 'Não há ações atrasadas. Bom trabalho!' : 'Crie a primeira ação clicando em "+ Nova Ação"'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} showModule onClick={() => setSelectedTask(task)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onSave={loadData} />
      )}
      {showNewTask && (
        <TaskModal onClose={() => setShowNewTask(false)} onSave={loadData} />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color, progress, alert }: {
  label: string; value: string; sub: string; color: string; progress?: number; alert?: boolean
}) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontFamily: 'Syne', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: progress !== undefined ? '10px' : 0 }}>
        {sub}
      </div>
      {progress !== undefined && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
        </div>
      )}
    </div>
  )
}
