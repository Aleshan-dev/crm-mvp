import { Suspense } from 'react'
import ConfirmClient from './ConfirmClient'

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando...</p>
      </div>
    }>
      <ConfirmClient />
    </Suspense>
  )
}
