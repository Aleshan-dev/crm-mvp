interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: '28px', gap: '16px',
    }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
