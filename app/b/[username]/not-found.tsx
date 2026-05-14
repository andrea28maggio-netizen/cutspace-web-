export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✂️</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Barber not found</h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px' }}>
        This booking link doesn't exist on CutSpace.
      </p>
      <a
        href="https://cutspace.net.au"
        style={{
          padding: '12px 28px', borderRadius: 12,
          border: '1.5px solid #C9A85C', color: '#C9A85C',
          textDecoration: 'none', fontSize: 15, fontWeight: 600,
        }}
      >
        Explore CutSpace
      </a>
    </main>
  )
}
