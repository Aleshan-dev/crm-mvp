'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.4,
      }} />
      {/* Glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(200,169,110,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="fade-in" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '38px', height: '38px',
              background: 'var(--accent)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '18px', fontFamily: 'Syne', fontWeight: 800, color: '#0a0b0f' }}>P</span>
            </div>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Polis OS
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Sistema de Execução Política
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Entrar na plataforma</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
            Acesso restrito a membros da equipe Polis
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid rgba(224,82,82,0.2)',
                borderRadius: '8px', padding: '10px 14px',
                color: 'var(--red)', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '11px' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px' }}>
          Polis Assessoria Política © 2025
        </p>
      </div>
    </div>
  )
}
