'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, Client } from '@/lib/types'

const MODULES = [
  { href: '/dashboard', label: 'Cronograma Geral', icon: '◈', desc: 'Execução' },
  { href: '/dashboard/estrategia', label: 'Direção da Campanha', icon: '◎', desc: 'Estratégia' },
  { href: '/dashboard/tarefas', label: 'Ações da Campanha', icon: '◻', desc: 'Tarefas' },
  { href: '/dashboard/mobilizacao', label: 'Mobilização', icon: '◉', desc: 'Grupos' },
  { href: '/dashboard/comunicacao', label: 'Comunicação', icon: '◈', desc: 'Conteúdo' },
  { href: '/dashboard/reunioes', label: 'Reuniões', icon: '▣', desc: 'Registro' },
  { href: '/dashboard/metricas', label: 'Métricas', icon: '▦', desc: 'Números' },
  { href: '/dashboard/documentos', label: 'Documentos', icon: '▤', desc: 'Arquivos' },
  { href: '/dashboard/alertas', label: 'Alertas', icon: '◆', desc: 'Urgências' },
]

interface SidebarProps {
  user: UserProfile
  clients: Client[]
  currentClientId: string | null
  onClientChange: (id: string) => void
  alertCount?: number
}

export default function Sidebar({ user, clients, currentClientId, onClientChange, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showClients, setShowClients] = useState(false)

  const currentClient = clients.find(c => c.id === currentClientId)
  const isPolisOrAdmin = ['administrador', 'polis'].includes(user.role)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel: Record<string, string> = {
    administrador: 'Admin',
    polis: 'Polis',
    cliente_admin: 'Cliente Admin',
    cliente_operacional: 'Operacional',
    cliente_visualizacao: 'Visualização',
  }

  return (
    <aside style={{
      width: '240px', flexShrink: 0, height: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '32px', height: '32px', background: 'var(--accent)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '16px', color: '#0a0b0f' }}>P</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', lineHeight: 1 }}>Polis OS</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>v1.0</div>
          </div>
        </div>

        {/* Client selector (only for polis/admin) */}
        {isPolisOrAdmin && clients.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowClients(!showClients)}
              style={{
                width: '100%', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '8px',
                padding: '8px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1px' }}>CLIENTE</div>
                <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentClient?.name || 'Selecionar...'}
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>▾</span>
            </button>
            {showClients && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: '8px', marginTop: '4px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onClientChange(c.id); setShowClients(false) }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left',
                      background: c.id === currentClientId ? 'var(--accent-glow)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      color: c.id === currentClientId ? 'var(--accent)' : 'var(--text-primary)',
                      fontSize: '13px', borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Client name display (for client users) */}
        {!isPolisOrAdmin && currentClient && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '8px 12px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1px' }}>CAMPANHA</div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{currentClient.name}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {MODULES.map(mod => {
          const isActive = pathname === mod.href || (mod.href !== '/dashboard' && pathname.startsWith(mod.href))
          return (
            <Link key={mod.href} href={mod.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ marginBottom: '2px', position: 'relative' }}>
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{mod.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mod.label}
                </div>
              </div>
              {mod.label === 'Alertas' && alertCount > 0 && (
                <span style={{
                  background: 'var(--red)', color: 'white',
                  fontSize: '10px', fontWeight: 700, fontFamily: 'Syne',
                  padding: '1px 6px', borderRadius: '10px', flexShrink: 0,
                }}>
                  {alertCount}
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin link */}
        {isPolisOrAdmin && (
          <>
            <div className="divider" style={{ margin: '12px 4px' }} />
            <Link href="/dashboard/admin" className={`nav-item ${pathname.startsWith('/dashboard/admin') ? 'active' : ''}`}>
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>⬡</span>
              <span>Administração</span>
            </Link>
          </>
        )}
      </nav>

      {/* User info */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '8px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--accent-glow)', border: '1px solid rgba(200,169,110,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
          }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{roleLabel[user.role]}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}>
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
