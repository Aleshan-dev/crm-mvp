export type UserRole = 'administrador' | 'polis' | 'cliente_admin' | 'cliente_operacional' | 'cliente_visualizacao'
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'atrasada'
export type TaskPriority = 'critica' | 'alta' | 'media' | 'baixa'
export type TaskModule = 'mobilizacao' | 'comunicacao' | 'reunioes' | 'metricas' | 'documentos' | 'estrategia' | 'geral'
export type AlertType = 'critical' | 'warning' | 'info'
export type CommObjective = 'engajamento' | 'conversao' | 'mobilizacao'
export type CommStatus = 'rascunho' | 'aprovado' | 'publicado' | 'cancelado'

export interface Client {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  email: string
  role: UserRole
  client_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface StrategicProfile {
  id: string
  client_id: string
  version: number
  is_current: boolean
  project_type: string | null
  region: string | null
  target_position: string | null
  vote_goal: number | null
  central_thesis: string | null
  positioning: string | null
  central_narrative: string | null
  target_audiences: string[]
  main_themes: string[]
  opportunities: string | null
  risks: string | null
  is_complete: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  client_id: string
  module: TaskModule
  title: string
  description: string | null
  responsible_user: string
  priority: TaskPriority
  status: TaskStatus
  strategic_objective: string
  target_audience: string | null
  related_theme: string | null
  expected_outcome: string | null
  due_date: string | null
  completed_at: string | null
  is_overdue: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // joins
  responsible_name?: string
  responsible_email?: string
  client_name?: string
}

export interface Meeting {
  id: string
  client_id: string
  title: string
  meeting_date: string
  what_was_done: string | null
  what_worked: string | null
  what_failed: string | null
  next_steps: string | null
  participants: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CommunicationItem {
  id: string
  client_id: string
  title: string
  content: string | null
  objective: CommObjective
  strategic_link: string | null
  cta: string
  expected_result: string | null
  platform: string | null
  scheduled_date: string | null
  status: CommStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MobilizationGroup {
  id: string
  client_id: string
  name: string
  description: string | null
  custom_metrics: Record<string, unknown>
  member_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MobilizationEntry {
  id: string
  group_id: string
  client_id: string
  date: string
  member_count: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Document {
  id: string
  client_id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  related_task: string | null
  related_meeting: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  client_id: string
  name: string
  value: number
  target: number | null
  unit: string | null
  date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Alert {
  id: string
  client_id: string
  type: AlertType
  title: string
  message: string
  impact: string | null
  is_resolved: boolean
  resolved_at: string | null
  related_task: string | null
  created_at: string
}

export interface ExecutionScore {
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  execution_score: number
  week_start: string
}
