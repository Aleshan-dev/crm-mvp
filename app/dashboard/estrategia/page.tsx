'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import type { StrategicProfile } from '@/lib/types'

export default function EstrategiaPage() {
  const { currentClientId, user } = useApp()
  const [profile, setProfile] = useState<StrategicProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const canEdit = ['administrador', 'polis'].includes(user?.role || '')

  const [form, setForm] = useState({
    project_type: '', region: '', target_position: '',
    vote_goal: '', central_thesis: '', positioning: '',
    central_narrative: '', target_audiences: '',
    main_themes: '', opportunities: '', risks: '',
  })

  const loadProfile = useCallback(async () => {
    if (!currentClientId) return
    setLoading(true)
    const { data } = await supabase
      .from('strategic_profiles')
      .select('*')
      .eq('client_id', currentClientId)
      .eq('is_current', true)
      .single()
    if (data) {
      setProfile(data)
      setForm({
        project_type: data.project_type || '',
        region: data.region || '',
        target_position: data.target_position || '',
        vote_goal: data.vote_goal?.toString() || '',
        central_thesis: data.central_thesis || '',
        positioning: data.positioning || '',
        central_narrative: data.central_narrative || '',
        target_audiences: (data.target_audiences || []).join(', '),
        main_themes: (data.main_themes || []).join(', '),
        opportunities: data.opportunities || '',
        risks: data.risks || '',
      })
    }
    setLoading(false)
  }, [currentClientId])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function handleSave() {
    if (!currentClientId) return
    setSaving(true)

    const payload = {
      project_type: form.project_type || null,
      region: form.region || null,
      target_position: form.target_position || null,
      vote_goal: form.vote_goal ? parseInt(form.vote_goal) : null,
      central_thesis: form.central_thesis || null,
      positioning: form.positioning || null,
      central_narrative: form.central_narrative || null,
      target_audiences: form.target_audiences ? form.target_audiences.split(',').map(s => s.trim()).filter(Boolean) : [],
      main_themes: form.main_themes ? form.main_themes.split(',').map(s => s.trim()).filter(Boolean) : [],
      opportunities: form.opportunities || null,
      risks: form.risks || null,
      created_by: user?.id,
    }

    if (profile) {
      // Create new version
      await supabase.from('strategic_profiles').update({ is_current: false }).eq('id', profile.id)
      await supabase.from('strategic_profiles').insert({
        ...payload, client_id: currentClientId,
        version: (profile.version || 1) + 1, is_current: true,
      })
    } else {
      await supabase.from('strategic_profiles').insert({
        ...payload, client_id: currentClientId, version: 1, is_current: true,
      })
    }
    setSaving(false)
    setEditing(false)
    loadProfile()
  }

  if (!currentClientId) return <NoClient />

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <PageHeader
        title="Direção da Campanha"
        subtitle="Perfil estratégico — base de todas as decisões operacionais"
        action={canEdit && !editing ? (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            {profile ? 'Editar Perfil' : 'Criar Perfil Estratégico'}
          </button>
        ) : editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar nova versão'}</button>
          </div>
        ) : undefined}
      />

      {/* Completeness banner */}
      {profile && !profile.is_complete && (
        <div style={{
          background: 'var(--yellow-dim)', border: '1px solid rgba(224,166,82,0.25)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '18px' }}>⚠</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--yellow)', fontSize: '13px' }}>Perfil estratégico incompleto</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
              Preencha todos os campos obrigatórios para liberar as operações da campanha.
            </div>
          </div>
        </div>
      )}

      {profile?.is_complete && (
        <div style={{
          background: 'var(--green-dim)', border: '1px solid rgba(82,183,136,0.2)',
          borderRadius: '10px', padding: '12px 18px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ color: 'var(--green)' }}>✓</span>
          <span style={{ fontSize: '13px', color: 'var(--green)' }}>
            Perfil estratégico completo — versão {profile.version}
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Carregando...</div>
      ) : editing ? (
        <EditForm form={form} setForm={setForm} />
      ) : profile ? (
        <ViewProfile profile={profile} />
      ) : (
        <EmptyProfile canEdit={canEdit} onStart={() => setEditing(true)} />
      )}
    </div>
  )
}

function ViewProfile({ profile }: { profile: StrategicProfile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <ProfileField label="Tipo de Projeto" value={profile.project_type} />
        <ProfileField label="Região" value={profile.region} />
        <ProfileField label="Cargo Pretendido" value={profile.target_position} />
        <ProfileField label="Meta de Votos" value={profile.vote_goal?.toLocaleString('pt-BR')} accent />
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div className="label" style={{ marginBottom: '10px' }}>Tese Central</div>
        <p style={{ fontSize: '16px', fontFamily: 'Syne', fontWeight: 600, color: 'var(--accent)', lineHeight: 1.5 }}>
          {profile.central_thesis || '—'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div className="label" style={{ marginBottom: '8px' }}>Posicionamento</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.positioning || '—'}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div className="label" style={{ marginBottom: '8px' }}>Narrativa Central</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.central_narrative || '—'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <TagSection label="Públicos-alvo" tags={profile.target_audiences} />
        <TagSection label="Pautas Principais" tags={profile.main_themes} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--green)' }}>
          <div className="label" style={{ marginBottom: '8px', color: 'var(--green)' }}>Oportunidades</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.opportunities || '—'}</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--red)' }}>
          <div className="label" style={{ marginBottom: '8px', color: 'var(--red)' }}>Riscos</div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.risks || '—'}</p>
        </div>
      </div>
    </div>
  )
}

function EditForm({ form, setForm }: { form: { project_type: string; region: string; target_position: string; vote_goal: string; central_thesis: string; positioning: string; central_narrative: string; target_audiences: string; main_themes: string; opportunities: string; risks: string }; setForm: React.Dispatch<React.SetStateAction<{ project_type: string; region: string; target_position: string; vote_goal: string; central_thesis: string; positioning: string; central_narrative: string; target_audiences: string; main_themes: string; opportunities: string; risks: string }>> }) {
  const fObj = form as Record<string, string>
  const f = (key: string) => ({
    value: fObj[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle>Identificação</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
        <Field label="Tipo de Projeto *"><input className="input" placeholder="Ex: Vereador, Deputado..." {...f('project_type')} /></Field>
        <Field label="Região *"><input className="input" placeholder="Ex: Zona Sul — SP" {...f('region')} /></Field>
        <Field label="Cargo Pretendido *"><input className="input" placeholder="Ex: Vereador" {...f('target_position')} /></Field>
      </div>
      <Field label="Meta de Votos *">
        <input className="input" type="number" placeholder="Ex: 15000" {...f('vote_goal')} style={{ maxWidth: '200px' }} />
      </Field>

      <SectionTitle>Estratégia</SectionTitle>
      <Field label="Tese Central *">
        <textarea className="textarea" placeholder="A frase que resume toda a campanha..." {...f('central_thesis')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Posicionamento *">
          <textarea className="textarea" placeholder="Como o candidato se posiciona no campo político..." {...f('positioning')} />
        </Field>
        <Field label="Narrativa Central *">
          <textarea className="textarea" placeholder="A história que a campanha conta ao eleitor..." {...f('central_narrative')} />
        </Field>
      </div>

      <SectionTitle>Públicos e Pautas</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Públicos-alvo (separados por vírgula)">
          <input className="input" placeholder="Ex: Jovens 18-35, Mães, Trabalhadores..." {...f('target_audiences')} />
        </Field>
        <Field label="Pautas Principais (separadas por vírgula)">
          <input className="input" placeholder="Ex: Mobilidade, Habitação, Segurança..." {...f('main_themes')} />
        </Field>
      </div>

      <SectionTitle>Análise de Cenário</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Oportunidades">
          <textarea className="textarea" placeholder="Fatores favoráveis no ambiente político..." {...f('opportunities')} />
        </Field>
        <Field label="Riscos">
          <textarea className="textarea" placeholder="Ameaças e pontos de atenção..." {...f('risks')} />
        </Field>
      </div>
    </div>
  )
}

function ProfileField({ label, value, accent }: { label: string; value?: string | number | null; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="label" style={{ marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: accent ? '20px' : '15px', fontWeight: accent ? 700 : 500, color: accent ? 'var(--accent)' : 'var(--text-primary)', fontFamily: accent ? 'Syne' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  )
}

function TagSection({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div className="label" style={{ marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.length > 0 ? tags.map((t, i) => (
          <span key={i} className="tag">{t}</span>
        )) : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Não definido</span>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '13px', color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function NoClient() {
  return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Selecione um cliente para visualizar a estratégia.</div>
}

function EmptyProfile({ canEdit, onStart }: { canEdit: boolean; onStart: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>◎</div>
      <div style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Perfil estratégico não criado</div>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px' }}>
        O perfil estratégico é obrigatório e bloqueia o uso operacional do sistema. Defina a direção da campanha antes de criar ações.
      </p>
      {canEdit && <button className="btn-primary" onClick={onStart}>Criar Perfil Estratégico</button>}
    </div>
  )
}
