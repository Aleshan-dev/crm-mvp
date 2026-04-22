'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Finalizando login...')

  useEffect(() => {
    const code = searchParams.get('code')

    if (!code) {
      router.replace('/login?error=no_code')
      return
    }

    const supabase = createClient()

    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) {
        console.error('Exchange error:', error.message)
        setStatus('Erro ao autenticar. Redirecionando...')
        setTimeout(() => router.replace('/login?error=exchange_failed'), 1500)
        return
      }
      if (data?.session) {
        setStatus('Login realizado! Entrando...')
        router.replace('/dashboard')
      } else {
        setTimeout(() => router.replace('/login?error=no_session'), 1500)
      }
    })
  }, [searchParams, router])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '38px', height: '38px', background: 'var(--accent)',
        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '16px', color: '#0a0b0f' }}>P</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{status}</p>
      <div style={{
        width: '24px', height: '24px', border: '2px solid var(--border)',
        borderTop: '2px solid var(--accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
