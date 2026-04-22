import type { Task } from '@/lib/types'
import { formatDate, priorityLabel, statusLabel, moduleLabel, statusClass, priorityClass } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  showModule?: boolean
}

export default function TaskCard({ task, onClick, showModule = false }: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${task.is_overdue ? 'rgba(224,82,82,0.3)' : 'var(--border)'}`,
        borderRadius: '10px',
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = task.is_overdue ? 'rgba(224,82,82,0.3)' : 'var(--border)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div className={`priority-dot priority-${task.priority}`} style={{ marginTop: '5px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.3, marginBottom: '2px' }}>
            {task.title}
          </div>
          {task.strategic_objective && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {task.strategic_objective}
            </div>
          )}
        </div>
        <span className={`badge ${statusClass(task.status)}`} style={{ flexShrink: 0 }}>
          {statusLabel(task.status)}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {showModule && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '4px' }}>
            {moduleLabel(task.module)}
          </span>
        )}
        {task.responsible_name && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {task.responsible_name}
          </span>
        )}
        {task.due_date && (
          <span style={{ fontSize: '12px', color: task.is_overdue ? 'var(--red)' : 'var(--text-muted)' }}>
            {task.is_overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
          </span>
        )}
        <span className={`badge badge-${priorityClass(task.priority)}`} style={{ marginLeft: 'auto' }}>
          {priorityLabel(task.priority)}
        </span>
      </div>
    </div>
  )
}
