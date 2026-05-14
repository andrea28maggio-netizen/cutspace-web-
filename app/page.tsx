export default function Home() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 42, fontWeight: 900, margin: '0 0 12px' }}>
        <span style={{ color: '#C9A85C' }}>Cut</span>
        <span style={{ color: '#fff' }}>Space</span>
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, margin: 0 }}>
        The marketplace for barbers and hairdressers.
      </p>
    </main>
  )
}
