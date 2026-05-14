'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BG     = '#1E2432'
const CARD   = '#252D3D'
const GOLD   = '#C9A85C'
const MUTED  = 'rgba(255,255,255,0.45)'
const BORDER = 'rgba(255,255,255,0.08)'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price_aud: number
}

type Step = 'select-service' | 'select-slot' | 'details' | 'confirm' | 'done'

function generateSlots(): { date: string; label: string; slots: string[] }[] {
  const times = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
  ]
  const days: { date: string; label: string; slots: string[] }[] = []
  const now = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    days.push({ date: dateStr, label, slots: times })
  }
  return days
}

const DAYS = generateSlots()

export default function BookingFlow({
  barberId,
  services,
}: {
  barberId: string
  services: Service[]
}) {
  const [step,        setStep]        = useState<Step>('select-service')
  const [selService,  setSelService]  = useState<Service | null>(null)
  const [selDate,     setSelDate]     = useState('')
  const [selTime,     setSelTime]     = useState('')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  function selectService(svc: Service) {
    setSelService(svc); setStep('select-slot')
  }

  function selectSlot(date: string, time: string) {
    setSelDate(date); setSelTime(time); setStep('details')
  }

  async function submitBooking() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }
    setError(''); setSubmitting(true)

    const timeValue = selTime
      .replace(' AM', '').replace(' PM', '')
      .split(':')
      .map((p, i) => {
        if (i === 0) {
          let h = parseInt(p)
          if (selTime.includes('PM') && h !== 12) h += 12
          if (selTime.includes('AM') && h === 12) h = 0
          return String(h).padStart(2, '0')
        }
        return p
      })
      .join(':')

    const { error: dbError } = await supabase.from('client_bookings').insert({
      barber_id:   barberId,
      service_id:  selService!.id,
      client_name:  name.trim(),
      client_email: email.trim(),
      client_phone: phone.trim() || null,
      slot_date:   selDate,
      slot_time:   timeValue,
      notes:       notes.trim() || null,
    })

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }
    setStep('done')
  }

  if (step === 'done') {
    const day = DAYS.find(d => d.date === selDate)
    return (
      <div style={{ background: CARD, borderRadius: 16, padding: 32, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Booking Confirmed!</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 20px' }}>
          {selService?.name} · {day?.label} at {selTime}
        </p>
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
          A confirmation has been sent to {email}
        </p>
      </div>
    )
  }

  if (step === 'select-service') {
    if (services.length === 0) return null
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Select a Service</h2>
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {services.map((svc, idx) => (
            <button
              key={svc.id}
              onClick={() => selectService(svc)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '16px 20px', background: 'transparent',
                border: 'none', borderBottom: idx < services.length - 1 ? `1px solid ${BORDER}` : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{svc.name}</p>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{svc.duration_minutes} min</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>${Number(svc.price_aud).toFixed(2)}</span>
                <span style={{ color: MUTED, fontSize: 18 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'select-slot') {
    return (
      <div>
        <button onClick={() => setStep('select-service')} style={backBtnStyle}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Pick a Time</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 16px' }}>{selService?.name} · {selService?.duration_minutes} min</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {DAYS.map(day => (
            <div key={day.date}>
              <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
                {day.label}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {day.slots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => selectSlot(day.date, slot)}
                    style={{
                      padding: '8px 14px', borderRadius: 10,
                      border: `1px solid ${BORDER}`, background: CARD,
                      color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'details') {
    const day = DAYS.find(d => d.date === selDate)
    return (
      <div>
        <button onClick={() => setStep('select-slot')} style={backBtnStyle}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Your Details</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 20px' }}>
          {selService?.name} · {day?.label} at {selTime}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" />
          </div>
          <div>
            <label style={labelStyle}>Phone (optional)</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0400 000 000" type="tel" />
          </div>
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any requests?" />
          </div>
        </div>

        {error && <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          onClick={submitBooking}
          disabled={submitting}
          style={{
            width: '100%', height: 52, marginTop: 24,
            background: submitting ? MUTED : GOLD,
            border: 'none', borderRadius: 14, cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 16, fontWeight: 800, color: BG,
          }}
        >
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
      </div>
    )
  }

  return null
}

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: GOLD,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  padding: '0 0 16px', display: 'block',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'rgba(255,255,255,0.7)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: CARD,
  border: `1px solid ${BORDER}`, borderRadius: 12,
  color: '#fff', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}
