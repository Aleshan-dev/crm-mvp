import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Polis OS — Sistema de Execução Política',
  description: 'Plataforma operacional para campanhas e mandatos políticos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
