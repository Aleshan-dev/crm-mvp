import type { TaskStatus, TaskPriority, TaskModule } from './types'

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function statusLabel(s: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pendente: 'Pendente', em_andamento: 'Em andamento',
    concluida: 'Concluída', cancelada: 'Cancelada', atrasada: 'Atrasada',
  }
  return map[s] ?? s
}

export function statusClass(s: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pendente: 'badge-muted', em_andamento: 'badge-info',
    concluida: 'badge-success', cancelada: 'badge-muted', atrasada: 'badge-critical',
  }
  return map[s] ?? 'badge-muted'
}

export function priorityLabel(p: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  }
  return map[p] ?? p
}

export function priorityClass(p: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    critica: 'critical', alta: 'warning', media: 'info', baixa: 'muted',
  }
  return map[p] ?? 'muted'
}

export function moduleLabel(m: TaskModule): string {
  const map: Record<TaskModule, string> = {
    mobilizacao: 'Mobilização', comunicacao: 'Comunicação',
    reunioes: 'Reuniões', metricas: 'Métricas',
    documentos: 'Documentos', estrategia: 'Estratégia', geral: 'Geral',
  }
  return map[m] ?? m
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const due = new Date(dateStr + 'T00:00:00')
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
