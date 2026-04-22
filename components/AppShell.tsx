'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, Client } from '@/lib/types'
import Sidebar from '@/components/Sidebar'

interface AppContext {
  user: UserProfile | null
  clients: Client[]
  currentClientId: string | null
  setCurrentClientId: (id: string) => void
  refreshData: () => void
}

const AppCtx = createContext<AppContext>({
  user: null, clients: [], currentClientId: null,
  setCurrentClientId: () => {}, refreshData: () => {},
})

export const useApp = () => useContext(AppCtx)

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [currentClientId, setCurrentClientId] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadData() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!profile) return
    setUser(profile)

    const isPolisOrAdmin = ['administrador', 'polis'].includes(profile.role)

    let clientsData: Client[] = []
    if (isPolisOrAdmin) {
      const { data } = await supabase.from('clients').select('*').eq('status', 'active').order('name')
      clientsData = data || []
    } else if (profile.client_id) {
      const { data } = await supabase.from('clients').select('*').eq('id', profile.client_id).single()
      if (data) clientsData = [data]
    }

    setClients(clientsData)

    const savedClientId = localStorage.getItem('polis_current_client')
    const firstClient = clientsData[0]?.id || null

    if (savedClientId && clientsData.find(c => c.id === savedClientId)) {
      setCurrentClientId(savedClientId)
    } else if (profile.client_id) {
      setCurrentClientId(profile.client_id)
    } else if (firstClient) {
      setCurrentClientId(firstClient)
    }

    setLoading(false)
  }

  async function loadAlerts() {
    if (!currentClientId) return
    const { count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', currentClientId)
      .eq('is_resolved', false)
    setAlertCount(count || 0)
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadAlerts() }, [currentClientId])

  function handleClientChange(id: string) {
    setCurrentClientId(id)
    localStorage.setItem('polis_current_client', id)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px', background: 'var(--accent)',
            borderRadius: '8px', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '16px', color: '#0a0b0f' }}>P</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AppCtx.Provider value={{ user, clients, currentClientId, setCurrentClientId: handleClientChange, refreshData: loadData }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          user={user}
          clients={clients}
          currentClientId={currentClientId}
          onClientChange={handleClientChange}
          alertCount={alertCount}
        />
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </AppCtx.Provider>
  )
}
